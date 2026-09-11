const express = require('express');
const http = require('http');
const os = require('os');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const COLORS = ['#ff4d4d', '#4da6ff', '#4dff88', '#ffd24d'];
const CHARACTERS = ['rabbit', 'gorilla', 'princess', 'ice'];

// pista 10x mas grande (todas las coordenadas base se escalan por esto)
const WORLD_SCALE = 10;
const TRACK_WIDTH = 170 * WORLD_SCALE; // igual en las 3 pistas para no re-tunear la fisica

// 3 pistas seleccionables desde el menu: la original (geometria propia) y dos
// ambientadas con modelos 3D reales descargados (bosque / base espacial)
const TRACKS_RAW = [
  {
    id: 'rainbow', name: 'RAINBOW DUNGEON', theme: 'rainbow',
    guardrailSegments: [0, 1, 2, 3, 8, 9],
    points: [
      { x: 260, y: 300 }, { x: 520, y: 230 }, { x: 900, y: 260 }, { x: 1180, y: 230 },
      { x: 1400, y: 340 }, { x: 1360, y: 520 }, { x: 1080, y: 560 }, { x: 900, y: 480 },
      { x: 700, y: 560 }, { x: 420, y: 600 }, { x: 230, y: 520 }, { x: 220, y: 400 },
    ],
  },
  {
    // ovalo suave (superelipse) en vez de un poligono a mano: garantiza que ningun
    // giro sea mas cerrado que en la pista original (probado con un script aparte)
    id: 'forest', name: 'BOSQUE ENCANTADO', theme: 'forest',
    guardrailSegments: [0, 1, 9, 10],
    points: [
      { x: 1360, y: 420 }, { x: 1251, y: 550 }, { x: 987, y: 669 }, { x: 751, y: 696 },
      { x: 470, y: 617 }, { x: 268, y: 477 }, { x: 268, y: 363 }, { x: 470, y: 223 },
      { x: 751, y: 144 }, { x: 987, y: 171 }, { x: 1251, y: 290 },
    ],
  },
  {
    id: 'space', name: 'BASE ESPACIAL', theme: 'space',
    guardrailSegments: [0, 1, 8, 9],
    points: [
      { x: 1420, y: 420 }, { x: 1296, y: 580 }, { x: 980, y: 686 }, { x: 620, y: 686 },
      { x: 304, y: 580 }, { x: 180, y: 420 }, { x: 304, y: 260 }, { x: 620, y: 154 },
      { x: 980, y: 154 }, { x: 1296, y: 260 },
    ],
  },
];
const TRACKS = TRACKS_RAW.map((t) => ({
  ...t,
  points: t.points.map((p) => ({ x: p.x * WORLD_SCALE, y: p.y * WORLD_SCALE })),
  guardrailSegments: new Set(t.guardrailSegments),
}));

let trackIndex = 0;
function activeTrack() { return TRACKS[trackIndex]; }

app.use(express.static(__dirname + '/public'));

const players = new Array(4).fill(null);

function freeSlot() {
  return players.findIndex((p) => p === null);
}

function segPoint(i) {
  const pts = activeTrack().points;
  return pts[i % pts.length];
}

function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby || 1;
  let t = ((px - ax) * abx + (py - ay) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + abx * t, cy = ay + aby * t;
  const dx = px - cx, dy = py - cy;
  return { dist: Math.sqrt(dx * dx + dy * dy), x: cx, y: cy };
}

function nearestTrackInfo(px, py) {
  const n = activeTrack().points.length;
  let best = null, bestIdx = -1;
  for (let i = 0; i < n; i++) {
    const a = segPoint(i), b = segPoint(i + 1);
    const r = closestPointOnSegment(px, py, a.x, a.y, b.x, b.y);
    if (!best || r.dist < best.dist) { best = r; bestIdx = i; }
  }
  return { dist: best.dist, idx: bestIdx, x: best.x, y: best.y };
}

const RACE_LAPS = 3;

function registerLapProgress(p, idx) {
  const n = activeTrack().points.length;
  if (idx <= 1 && p.lapIndex >= n - 2) {
    p.lap += 1;
    p.lapIndex = idx;
    if (p.lap >= RACE_LAPS && phase === 'racing') {
      phase = 'finished';
      raceWinnerId = p.id;
      finishedAt = Date.now();
    }
  } else {
    p.lapIndex = Math.max(p.lapIndex, idx);
  }
}

function spawnFor(slot) {
  const pts = activeTrack().points;
  const a = pts[0], b = pts[1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const dirX = dx / len, dirY = dy / len;
  const perpX = -dirY, perpY = dirX;
  const lane = (slot - 1.5) * 45 * WORLD_SCALE;
  const along = slot * 15 * WORLD_SCALE;
  return {
    x: a.x + dirX * (40 * WORLD_SCALE + along) + perpX * lane,
    y: a.y + dirY * (40 * WORLD_SCALE + along) + perpY * lane,
    angle: Math.atan2(dirY, dirX),
  };
}

// --- estado global de la partida ---
let phase = 'select'; // 'select' | 'countdown' | 'racing' | 'finished'
let countdown = 0;
let countdownAcc = 0;
let firstConfirmAt = 0;
let raceWinnerId = null;
let finishedAt = 0;

// las cajas de item y las monedas se recalculan cada vez que cambia la pista activa
// (sus posiciones se derivan geometricamente de los puntos de esa pista)
let boostBoxes = [];
let coins = [];
const COIN_MAX = 10; // cada moneda suma +3% de velocidad maxima (hasta +30% con las 10)

function computeBoostBoxes(track) {
  const n = track.points.length;
  const idxs = [0, 1, 2, 3].map((i) => Math.floor((i * n) / 4));
  return idxs.map((i) => ({ x: track.points[i].x, y: track.points[i].y, active: true, respawnAt: 0 }));
}

// monedas repartidas por toda la pista (una por tramo, alternando de lado) que dan
// un empujoncito de velocidad maxima permanente por el resto de la carrera
function computeCoins(track) {
  const pts = track.points;
  const n = pts.length;
  return pts.map((a, i) => {
    const b = pts[(i + 1) % n];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const side = i % 2 === 0 ? 1 : -1;
    const offset = (TRACK_WIDTH / 2) * 0.4 * side;
    return {
      x: (a.x + b.x) / 2 + nx * offset,
      y: (a.y + b.y) / 2 + ny * offset,
      active: true, respawnAt: 0,
    };
  });
}

function regenerateTrackObjects() {
  const track = activeTrack();
  boostBoxes = computeBoostBoxes(track);
  coins = computeCoins(track);
}
regenerateTrackObjects();

// caja de item = ruleta al estilo Mario Kart:
// estrella = boost fuerte para vos (2s, inmune a choques), hongo = achica al
// resto, misil = proyectil que persigue y choca al rival mas cercano
function rollItem() {
  const r = Math.random() * 100;
  if (r < 40) return 'star';
  if (r < 75) return 'mushroom';
  return 'missile';
}
const STAR_SPEED = 3900; // mas fuerte que la velocidad maxima normal

let peels = [];
let flowers = [];
let missiles = [];
let iceUntil = 0;
let iceOwnerSlot = -1;
const MISSILE_SPEED = 3800;

function resetForRace() {
  regenerateTrackObjects();
  players.forEach((p, i) => {
    if (!p) return;
    const s = spawnFor(i);
    p.x = s.x; p.y = s.y; p.angle = s.angle; p.speed = 0;
    p.lives = 3;
    p.lap = 0;
    p.lapIndex = 0;
    p.item = null;
    p.starUntil = 0;
    p.shrunkUntil = 0;
    p.crashUntil = 0;
    p.slowUntil = 0;
    p.coins = 0;
    p.powerCooldownUntil = 0;
    p.fallUntil = 0;
  });
  peels = [];
  flowers = [];
  missiles = [];
  iceUntil = 0;
  iceOwnerSlot = -1;
  raceWinnerId = null;
}

io.on('connection', (socket) => {
  let slot = -1;

  socket.on('join', () => {
    slot = freeSlot();
    if (slot === -1) { socket.emit('full'); return; }
    const s = spawnFor(slot);
    players[slot] = {
      id: 'P' + (slot + 1),
      socketId: socket.id,
      color: COLORS[slot],
      character: CHARACTERS[slot],
      confirmed: false,
      x: s.x, y: s.y, angle: s.angle, speed: 0,
      lives: 3, lap: 0, lapIndex: 0,
      item: null, starUntil: 0, shrunkUntil: 0, crashUntil: 0, slowUntil: 0, coins: 0,
      powerCooldownUntil: 0, fallUntil: 0,
      input: { steer: 0, accel: false, brake: false },
      prevAccel: false,
      selectZone: 'neutral',
    };
    socket.emit('joined', { id: players[slot].id, color: players[slot].color });

    // si la carrera ya arranco, este jugador se suma directo corriendo
    if (phase === 'racing' || phase === 'countdown') {
      players[slot].confirmed = true;
    }
  });

  socket.on('input', (data) => {
    if (slot === -1 || !players[slot]) return;
    const p = players[slot];
    const steer = Math.max(-1, Math.min(1, Number(data.steer) || 0));
    const accel = !!data.accel;
    const brake = !!data.brake;

    if (phase === 'select' && !p.confirmed) {
      if (steer > 0.6 && p.selectZone !== 'right') {
        p.selectZone = 'right';
        moveSelection(slot, 1);
      } else if (steer < -0.6 && p.selectZone !== 'left') {
        p.selectZone = 'left';
        moveSelection(slot, -1);
      } else if (Math.abs(steer) < 0.3) {
        p.selectZone = 'neutral';
      }
      if (accel && !p.prevAccel) confirmSelection(slot);
    } else {
      p.input.steer = steer;
      p.input.accel = accel;
      p.input.brake = brake;
    }
    p.prevAccel = accel;
  });

  socket.on('boost', () => {
    const p = players[slot];
    if (!p || phase !== 'racing' || !p.item) return;
    const now = Date.now();
    const item = p.item;
    p.item = null;
    if (item === 'star') {
      p.starUntil = now + 2000;
      p.speed = Math.max(p.speed, STAR_SPEED * 0.85); // empujon instantaneo, no solo el tope
    } else if (item === 'mushroom') {
      players.forEach((o, i) => {
        if (!o || i === slot) return;
        o.shrunkUntil = now + 5000;
      });
    } else if (item === 'missile') {
      let targetSlot = -1, bestDist = Infinity;
      players.forEach((o, i) => {
        if (!o || i === slot) return;
        const dx = o.x - p.x, dy = o.y - p.y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; targetSlot = i; }
      });
      if (targetSlot !== -1) {
        missiles.push({
          x: p.x + Math.cos(p.angle) * 40 * WORLD_SCALE,
          y: p.y + Math.sin(p.angle) * 40 * WORLD_SCALE,
          ownerSlot: slot,
          targetSlot,
          expiresAt: now + 4000,
        });
      }
    }
  });

  socket.on('power', () => {
    const p = players[slot];
    if (!p || phase !== 'racing') return;
    const now = Date.now();
    if (now < p.powerCooldownUntil) return;
    p.powerCooldownUntil = now + 10000;
    usePower(slot);
  });

  socket.on('cycle_track', () => {
    if (slot === -1 || !players[slot] || phase !== 'select') return;
    trackIndex = (trackIndex + 1) % TRACKS.length;
    regenerateTrackObjects();
  });

  socket.on('reset_to_menu', () => {
    if (slot === -1 || !players[slot]) return;
    phase = 'select';
    countdown = 0;
    countdownAcc = 0;
    firstConfirmAt = 0;
    raceWinnerId = null;
    finishedAt = 0;
    players.forEach((p) => { if (p) p.confirmed = false; });
    peels = [];
    flowers = [];
    iceUntil = 0;
    iceOwnerSlot = -1;
  });

  socket.on('disconnect', () => {
    if (slot !== -1 && players[slot]) players[slot] = null;
  });
});

function moveSelection(slot, dir) {
  const p = players[slot];
  let idx = CHARACTERS.indexOf(p.character);
  idx = (idx + dir + CHARACTERS.length) % CHARACTERS.length;
  p.character = CHARACTERS[idx];
}

function confirmSelection(slot) {
  const p = players[slot];
  const taken = players.some((o, i) => o && i !== slot && o.confirmed && o.character === p.character);
  if (taken) { moveSelection(slot, 1); return; }
  p.confirmed = true;
  if (!firstConfirmAt) firstConfirmAt = Date.now();
}

function usePower(slot) {
  const p = players[slot];
  const now = Date.now();
  if (p.character === 'rabbit') {
    p.speed = Math.min(p.speed + 400, 3000);
    players.forEach((o, i) => {
      if (!o || i === slot) return;
      const dx = o.x - p.x, dy = o.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 95 * WORLD_SCALE) return;
      const facing = Math.cos(p.angle) * dx + Math.sin(p.angle) * dy;
      if (facing > 0) o.slowUntil = now + 1200;
    });
  } else if (p.character === 'gorilla') {
    peels.push({
      x: p.x - Math.cos(p.angle) * 32 * WORLD_SCALE,
      y: p.y - Math.sin(p.angle) * 32 * WORLD_SCALE,
      ownerSlot: slot,
      expiresAt: now + 10000,
    });
  } else if (p.character === 'princess') {
    flowers.push({
      x: p.x + Math.cos(p.angle) * 26 * WORLD_SCALE,
      y: p.y + Math.sin(p.angle) * 26 * WORLD_SCALE,
      vx: Math.cos(p.angle) * 340 * WORLD_SCALE,
      vy: Math.sin(p.angle) * 340 * WORLD_SCALE,
      ownerSlot: slot,
      expiresAt: now + 1200,
    });
  } else if (p.character === 'ice') {
    iceUntil = now + 4000;
    iceOwnerSlot = slot;
  }
}

// --- Fisica arcade (escalada a la pista 10x mas grande: el auto casi no se movia) ---
const ACCEL = 1900;
const BRAKE = 3200;
const FRICTION = 1500;
const MAX_SPEED = 2000;
const MAX_REVERSE = -800;
const TURN_RATE = 1.6;
const STEER_CURVE = 1.4; // >1 suaviza el giro cerca del centro del analogico (menos sensible)
const TICK_MS = 50;

setInterval(() => {
  const now = Date.now();
  const dt = TICK_MS / 1000;

  if (phase === 'select') {
    const connected = players.filter(Boolean);
    const confirmedCount = connected.filter((p) => p.confirmed).length;
    if (connected.length > 0 && confirmedCount > 0 &&
        (confirmedCount === connected.length || now - firstConfirmAt > 8000)) {
      players.forEach((p) => { if (p && !p.confirmed) p.confirmed = true; });
      phase = 'countdown';
      countdown = 3;
      countdownAcc = 0;
    }
  } else if (phase === 'countdown') {
    countdownAcc += TICK_MS;
    if (countdownAcc >= 1000) {
      countdownAcc = 0;
      countdown -= 1;
      if (countdown <= 0) {
        phase = 'racing';
        resetForRace();
      }
    }
  } else if (phase === 'finished') {
    if (now - finishedAt > 12000) {
      phase = 'select';
      countdown = 0;
      countdownAcc = 0;
      firstConfirmAt = 0;
      raceWinnerId = null;
      players.forEach((p) => { if (p) p.confirmed = false; });
    }
  } else if (phase === 'racing') {
    boostBoxes.forEach((b) => {
      if (!b.active && now >= b.respawnAt) b.active = true;
    });
    coins.forEach((c) => {
      if (!c.active && now >= c.respawnAt) c.active = true;
    });

    players.forEach((p, slotIdx) => {
      if (!p) return;
      if (now < p.fallUntil) return;
      if (now < p.crashUntil) { p.speed = 0; return; }

      const starActive = now < p.starUntil;
      const onIce = iceOwnerSlot !== -1 && now < iceUntil && slotIdx !== iceOwnerSlot && !starActive;
      const slowed = now < p.slowUntil && !starActive;
      const shrunk = now < p.shrunkUntil && !starActive;

      const friction = onIce ? 400 : FRICTION;
      const turnRate = onIce ? TURN_RATE * 0.4 : TURN_RATE;
      const coinBonus = (p.coins || 0) * (MAX_SPEED * 0.03);
      let maxSpeed = slowed ? 900 : starActive ? STAR_SPEED : MAX_SPEED;
      if (shrunk) maxSpeed = Math.min(maxSpeed, 750);
      maxSpeed += coinBonus;

      const { input } = p;
      if (slowed) {
        p.speed = Math.max(0, p.speed - 4000 * dt);
      } else if (input.accel) {
        p.speed += ACCEL * dt;
      } else if (input.brake) {
        p.speed -= BRAKE * dt;
      } else if (p.speed > 0) {
        p.speed = Math.max(0, p.speed - friction * dt);
      } else if (p.speed < 0) {
        p.speed = Math.min(0, p.speed + friction * dt);
      }
      p.speed = Math.max(MAX_REVERSE, Math.min(maxSpeed, p.speed));

      if (Math.abs(p.speed) > 5) {
        const dir = p.speed >= 0 ? 1 : -1;
        const steerEased = Math.sign(input.steer) * Math.pow(Math.abs(input.steer), STEER_CURVE);
        p.angle += steerEased * turnRate * dt * dir;
      }

      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;
    });

    // choques entre autos: se empujan y pueden mandarse al vacio entre si
    for (let i = 0; i < players.length; i++) {
      const a = players[i];
      if (!a || now < a.fallUntil || now < a.crashUntil) continue;
      for (let j = i + 1; j < players.length; j++) {
        const b = players[j];
        if (!b || now < b.fallUntil || now < b.crashUntil) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = 32 * WORLD_SCALE;
        if (dist >= minDist) continue;
        if (dist < 0.001) dist = 0.001;
        const nx = dx / dist, ny = dy / dist;
        const overlap = minDist - dist;
        a.x -= (nx * overlap) / 2; a.y -= (ny * overlap) / 2;
        b.x += (nx * overlap) / 2; b.y += (ny * overlap) / 2;

        const aStar = now < a.starUntil, bStar = now < b.starUntil;
        if (aStar && !bStar) {
          // a tiene estrella: arrolla a b sin frenar
          const knock = 1500 * dt;
          b.x += nx * knock; b.y += ny * knock;
          b.speed *= 0.3;
        } else if (bStar && !aStar) {
          const knock = 1500 * dt;
          a.x -= nx * knock; a.y -= ny * knock;
          a.speed *= 0.3;
        } else if (Math.abs(a.speed) >= Math.abs(b.speed)) {
          const knock = Math.min(Math.abs(a.speed), 2600) * 0.6 * dt;
          b.x += nx * knock; b.y += ny * knock;
          b.speed *= 0.5;
          a.speed *= 0.8;
        } else {
          const knock = Math.min(Math.abs(b.speed), 2600) * 0.6 * dt;
          a.x -= nx * knock; a.y -= ny * knock;
          a.speed *= 0.5;
          b.speed *= 0.8;
        }
      }
    }

    // items y limites de pista (fuera de la pista = te caes al vacio y respawneas)
    players.forEach((p) => {
      if (!p) return;
      if (now < p.fallUntil || now < p.crashUntil) return;

      const starActive = now < p.starUntil;
      for (const peel of peels) {
        if (peel.ownerSlot === players.indexOf(p) || peel.expiresAt === 0 || starActive) continue;
        const dx = p.x - peel.x, dy = p.y - peel.y;
        if (Math.sqrt(dx * dx + dy * dy) < 24 * WORLD_SCALE) {
          p.slowUntil = now + 1000;
          peel.expiresAt = 0;
        }
      }

      for (const fl of flowers) {
        if (fl.ownerSlot === players.indexOf(p) || fl.expiresAt === 0 || starActive) continue;
        const dx = p.x - fl.x, dy = p.y - fl.y;
        if (Math.sqrt(dx * dx + dy * dy) < 26 * WORLD_SCALE) {
          p.slowUntil = now + 1500;
          fl.expiresAt = 0;
        }
      }

      boostBoxes.forEach((b) => {
        if (!b.active || p.item) return;
        const dx = p.x - b.x, dy = p.y - b.y;
        if (Math.sqrt(dx * dx + dy * dy) < 60 * WORLD_SCALE) {
          p.item = rollItem();
          b.active = false;
          b.respawnAt = now + 8000;
        }
      });

      coins.forEach((c) => {
        if (!c.active) return;
        const dx = p.x - c.x, dy = p.y - c.y;
        if (Math.sqrt(dx * dx + dy * dy) < 46 * WORLD_SCALE) {
          c.active = false;
          c.respawnAt = now + 6000;
          p.coins = Math.min(COIN_MAX, (p.coins || 0) + 1);
        }
      });

      const info = nearestTrackInfo(p.x, p.y);
      if (info.dist <= TRACK_WIDTH / 2) {
        registerLapProgress(p, info.idx);
      } else if (activeTrack().guardrailSegments.has(info.idx)) {
        // baranda de ruedas: pared solida que protege el vacio. No te caes ni
        // frenas aca, simplemente no podes pasar del borde (te desliza por la pared)
        const dx = p.x - info.x, dy = p.y - info.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / len, ny = dy / len;
        p.x = info.x + nx * (TRACK_WIDTH / 2);
        p.y = info.y + ny * (TRACK_WIDTH / 2);
        registerLapProgress(p, info.idx);
      } else {
        // aca no hay baranda: es precipicio de verdad. Te caes al vacio, pierdes
        // una vida y respawneas siempre en el CENTRO de la pista (no en el borde)
        // para que no se pueda quedar re-cayendo en bucle si el borde estaba justo ahi
        p.lives = Math.max(0, p.lives - 1);
        const segA = segPoint(info.idx), segB = segPoint(info.idx + 1);
        p.x = info.x;
        p.y = info.y;
        p.angle = Math.atan2(segB.y - segA.y, segB.x - segA.x);
        p.speed = 0;
        p.fallUntil = now + 700;
      }
    });

    peels = peels.filter((pe) => pe.expiresAt > now);
    flowers = flowers.filter((fl) => {
      fl.x += fl.vx * dt;
      fl.y += fl.vy * dt;
      return fl.expiresAt > now;
    });

    // misiles: persiguen al objetivo (re-apuntan cada tick) hasta chocarlo o vencer
    missiles.forEach((m) => {
      const target = players[m.targetSlot];
      if (!target || now >= m.expiresAt) return;
      const dx = target.x - m.x, dy = target.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < 45 * WORLD_SCALE) {
        target.crashUntil = now + 900;
        target.speed = 0;
        m.expiresAt = 0;
        return;
      }
      m.x += (dx / dist) * MISSILE_SPEED * dt;
      m.y += (dy / dist) * MISSILE_SPEED * dt;
    });
    missiles = missiles.filter((m) => m.expiresAt > now);
  }

  broadcast(now);
}, TICK_MS);

function broadcast(now) {
  const statePlayers = players.map((p) => {
    if (!p) return null;
    return {
      id: p.id,
      color: p.color,
      character: p.character,
      confirmed: p.confirmed,
      x: p.x, y: p.y, angle: p.angle,
      steer: p.input.steer,
      lives: p.lives,
      lap: p.lap,
      item: p.item,
      coins: p.coins || 0,
      starActive: now < p.starUntil,
      shrunk: now < p.shrunkUntil,
      crashed: now < p.crashUntil,
      slowed: now < p.slowUntil,
      falling: now < p.fallUntil,
      powerReady: now >= p.powerCooldownUntil,
    };
  });

  io.emit('state', {
    phase,
    countdown,
    winnerId: raceWinnerId,
    trackId: activeTrack().id,
    trackName: activeTrack().name,
    trackTheme: activeTrack().theme,
    track: activeTrack().points,
    trackWidth: TRACK_WIDTH,
    guardrailSegments: Array.from(activeTrack().guardrailSegments),
    players: statePlayers,
    boxes: boostBoxes.filter((b) => b.active).map((b) => ({ x: b.x, y: b.y })),
    coins: coins.filter((c) => c.active).map((c) => ({ x: c.x, y: c.y })),
    peels: peels.map((pe) => ({ x: pe.x, y: pe.y })),
    flowers: flowers.map((fl) => ({ x: fl.x, y: fl.y })),
    missiles: missiles.map((m) => ({ x: m.x, y: m.y })),
    ice: {
      active: iceOwnerSlot !== -1 && now < iceUntil,
      ownerId: iceOwnerSlot >= 0 && players[iceOwnerSlot] ? players[iceOwnerSlot].id : null,
    },
  });

  players.forEach((p) => {
    if (!p) return;
    const cooldownMs = Math.max(0, p.powerCooldownUntil - now);
    io.to(p.socketId).emit('status', {
      phase,
      character: p.character,
      confirmed: p.confirmed,
      lives: p.lives,
      lap: p.lap,
      item: p.item,
      coins: p.coins || 0,
      powerReady: cooldownMs <= 0,
      cooldownSec: Math.ceil(cooldownMs / 1000),
      winnerId: raceWinnerId,
      won: phase === 'finished' && raceWinnerId === p.id,
    });
  });
}

function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

server.listen(PORT, () => {
  const ip = getLocalIp();
  console.log('');
  console.log('BLOCK RACERS corriendo');
  console.log('TV:         http://' + ip + ':' + PORT + '/tv');
  console.log('Controller: http://' + ip + ':' + PORT + '/controller');
  console.log('');
});
