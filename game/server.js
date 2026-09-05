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

const TRACK_WIDTH = 170;
const TRACK_POINTS = [
  { x: 260, y: 300 },
  { x: 520, y: 230 },
  { x: 900, y: 260 },
  { x: 1180, y: 230 },
  { x: 1400, y: 340 },
  { x: 1360, y: 520 },
  { x: 1080, y: 560 },
  { x: 900, y: 480 },
  { x: 700, y: 560 },
  { x: 420, y: 600 },
  { x: 230, y: 520 },
  { x: 220, y: 400 },
];
const N_SEG = TRACK_POINTS.length;
// tramos con baranda (rebote + chispas); el resto son precipicio (te caes)
const GUARDRAIL_SEGMENTS = new Set([0, 1, 2, 3, 8, 9]);

app.use(express.static(__dirname + '/public'));

const players = new Array(4).fill(null);

function freeSlot() {
  return players.findIndex((p) => p === null);
}

function segPoint(i) {
  return TRACK_POINTS[i % N_SEG];
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
  let best = null, bestIdx = -1;
  for (let i = 0; i < N_SEG; i++) {
    const a = segPoint(i), b = segPoint(i + 1);
    const r = closestPointOnSegment(px, py, a.x, a.y, b.x, b.y);
    if (!best || r.dist < best.dist) { best = r; bestIdx = i; }
  }
  return { dist: best.dist, idx: bestIdx, x: best.x, y: best.y, guardrail: GUARDRAIL_SEGMENTS.has(bestIdx) };
}

function registerLapProgress(p, idx) {
  if (idx <= 1 && p.lapIndex >= N_SEG - 2) {
    p.lap += 1;
    p.lapIndex = idx;
  } else {
    p.lapIndex = Math.max(p.lapIndex, idx);
  }
}

function spawnFor(slot) {
  const a = TRACK_POINTS[0], b = TRACK_POINTS[1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const dirX = dx / len, dirY = dy / len;
  const perpX = -dirY, perpY = dirX;
  const lane = (slot - 1.5) * 45;
  const along = slot * 15;
  return {
    x: a.x + dirX * (40 + along) + perpX * lane,
    y: a.y + dirY * (40 + along) + perpY * lane,
    angle: Math.atan2(dirY, dirX),
  };
}

// --- estado global de la partida ---
let phase = 'select'; // 'select' | 'countdown' | 'racing'
let countdown = 0;
let countdownAcc = 0;
let firstConfirmAt = 0;

const boostBoxes = [
  { x: 900, y: 260, active: true, respawnAt: 0 },
  { x: 1360, y: 520, active: true, respawnAt: 0 },
  { x: 700, y: 560, active: true, respawnAt: 0 },
  { x: 230, y: 520, active: true, respawnAt: 0 },
];
let peels = [];
let flowers = [];
let iceUntil = 0;
let iceOwnerSlot = -1;

function resetForRace() {
  players.forEach((p, i) => {
    if (!p) return;
    const s = spawnFor(i);
    p.x = s.x; p.y = s.y; p.angle = s.angle; p.speed = 0;
    p.lives = 3;
    p.lap = 0;
    p.lapIndex = 0;
    p.hasBoost = false;
    p.boostUntil = 0;
    p.slowUntil = 0;
    p.powerCooldownUntil = 0;
    p.fallUntil = 0;
    p.sparkUntil = 0;
    p.lastOnTrack = { x: s.x, y: s.y, angle: s.angle };
  });
  peels = [];
  flowers = [];
  iceUntil = 0;
  iceOwnerSlot = -1;
  boostBoxes.forEach((b) => { b.active = true; b.respawnAt = 0; });
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
      hasBoost: false, boostUntil: 0, slowUntil: 0,
      powerCooldownUntil: 0, fallUntil: 0, sparkUntil: 0,
      lastOnTrack: { x: s.x, y: s.y, angle: s.angle },
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
    if (!p || phase !== 'racing' || !p.hasBoost) return;
    p.hasBoost = false;
    p.boostUntil = Date.now() + 900;
  });

  socket.on('power', () => {
    const p = players[slot];
    if (!p || phase !== 'racing') return;
    const now = Date.now();
    if (now < p.powerCooldownUntil) return;
    p.powerCooldownUntil = now + 10000;
    usePower(slot);
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
    p.speed = Math.min(p.speed + 160, 650);
    players.forEach((o, i) => {
      if (!o || i === slot) return;
      const dx = o.x - p.x, dy = o.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 95) return;
      const facing = Math.cos(p.angle) * dx + Math.sin(p.angle) * dy;
      if (facing > 0) o.slowUntil = now + 1200;
    });
  } else if (p.character === 'gorilla') {
    peels.push({
      x: p.x - Math.cos(p.angle) * 32,
      y: p.y - Math.sin(p.angle) * 32,
      ownerSlot: slot,
      expiresAt: now + 10000,
    });
  } else if (p.character === 'princess') {
    flowers.push({
      x: p.x + Math.cos(p.angle) * 26,
      y: p.y + Math.sin(p.angle) * 26,
      vx: Math.cos(p.angle) * 340,
      vy: Math.sin(p.angle) * 340,
      ownerSlot: slot,
      expiresAt: now + 1200,
    });
  } else if (p.character === 'ice') {
    iceUntil = now + 4000;
    iceOwnerSlot = slot;
  }
}

// --- Fisica arcade (velocidades bajas, arcade suave) ---
const ACCEL = 190;
const BRAKE = 320;
const FRICTION = 150;
const MAX_SPEED = 200;
const BOOST_SPEED = 340;
const MAX_REVERSE = -80;
const TURN_RATE = 2.4;
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
  } else if (phase === 'racing') {
    boostBoxes.forEach((b) => {
      if (!b.active && now >= b.respawnAt) b.active = true;
    });

    players.forEach((p, slotIdx) => {
      if (!p) return;
      if (now < p.fallUntil) return;

      const onIce = iceOwnerSlot !== -1 && now < iceUntil && slotIdx !== iceOwnerSlot;
      const slowed = now < p.slowUntil;
      const boosting = now < p.boostUntil;

      const friction = onIce ? 40 : FRICTION;
      const turnRate = onIce ? TURN_RATE * 0.4 : TURN_RATE;
      const maxSpeed = slowed ? 90 : boosting ? BOOST_SPEED : MAX_SPEED;

      const { input } = p;
      if (slowed) {
        p.speed = Math.max(0, p.speed - 400 * dt);
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
        p.angle += input.steer * turnRate * dt * dir;
      }

      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;
    });

    // choques entre autos: se empujan y pueden mandarse al vacio entre si
    for (let i = 0; i < players.length; i++) {
      const a = players[i];
      if (!a || now < a.fallUntil) continue;
      for (let j = i + 1; j < players.length; j++) {
        const b = players[j];
        if (!b || now < b.fallUntil) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = 32;
        if (dist >= minDist) continue;
        if (dist < 0.001) dist = 0.001;
        const nx = dx / dist, ny = dy / dist;
        const overlap = minDist - dist;
        a.x -= (nx * overlap) / 2; a.y -= (ny * overlap) / 2;
        b.x += (nx * overlap) / 2; b.y += (ny * overlap) / 2;

        if (Math.abs(a.speed) >= Math.abs(b.speed)) {
          const knock = Math.min(Math.abs(a.speed), 260) * 0.6 * dt;
          b.x += nx * knock; b.y += ny * knock;
          b.speed *= 0.5;
          a.speed *= 0.8;
        } else {
          const knock = Math.min(Math.abs(b.speed), 260) * 0.6 * dt;
          a.x -= nx * knock; a.y -= ny * knock;
          a.speed *= 0.5;
          b.speed *= 0.8;
        }
      }
    }

    // items y limites de pista (guardarail = rebote con chispas, precipicio = caida)
    players.forEach((p) => {
      if (!p) return;
      if (now < p.fallUntil) return;

      for (const peel of peels) {
        if (peel.ownerSlot === players.indexOf(p) || peel.expiresAt === 0) continue;
        const dx = p.x - peel.x, dy = p.y - peel.y;
        if (Math.sqrt(dx * dx + dy * dy) < 24) {
          p.slowUntil = now + 1000;
          peel.expiresAt = 0;
        }
      }

      for (const fl of flowers) {
        if (fl.ownerSlot === players.indexOf(p) || fl.expiresAt === 0) continue;
        const dx = p.x - fl.x, dy = p.y - fl.y;
        if (Math.sqrt(dx * dx + dy * dy) < 26) {
          p.slowUntil = now + 1500;
          fl.expiresAt = 0;
        }
      }

      boostBoxes.forEach((b) => {
        if (!b.active || p.hasBoost) return;
        const dx = p.x - b.x, dy = p.y - b.y;
        if (Math.sqrt(dx * dx + dy * dy) < 34) {
          p.hasBoost = true;
          b.active = false;
          b.respawnAt = now + 8000;
        }
      });

      const info = nearestTrackInfo(p.x, p.y);
      if (info.dist <= TRACK_WIDTH / 2) {
        p.lastOnTrack = { x: p.x, y: p.y, angle: p.angle };
        registerLapProgress(p, info.idx);
      } else if (info.guardrail) {
        // baranda: rebota contra el borde y pierde velocidad, no cae
        const dx = p.x - info.x, dy = p.y - info.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / len, ny = dy / len;
        p.x = info.x + nx * (TRACK_WIDTH / 2 - 2);
        p.y = info.y + ny * (TRACK_WIDTH / 2 - 2);
        p.speed *= 0.4;
        p.sparkUntil = now + 300;
        p.lastOnTrack = { x: p.x, y: p.y, angle: p.angle };
        registerLapProgress(p, info.idx);
      } else {
        // precipicio: cae y respawnea
        p.lives = Math.max(0, p.lives - 1);
        p.x = p.lastOnTrack.x;
        p.y = p.lastOnTrack.y;
        p.angle = p.lastOnTrack.angle;
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
      lives: p.lives,
      lap: p.lap,
      hasBoost: p.hasBoost,
      boosting: now < p.boostUntil,
      slowed: now < p.slowUntil,
      sparked: now < p.sparkUntil,
      powerReady: now >= p.powerCooldownUntil,
    };
  });

  io.emit('state', {
    phase,
    countdown,
    track: TRACK_POINTS,
    trackWidth: TRACK_WIDTH,
    guardrailSegments: Array.from(GUARDRAIL_SEGMENTS),
    players: statePlayers,
    boxes: boostBoxes.filter((b) => b.active).map((b) => ({ x: b.x, y: b.y })),
    peels: peels.map((pe) => ({ x: pe.x, y: pe.y })),
    flowers: flowers.map((fl) => ({ x: fl.x, y: fl.y })),
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
      hasBoost: p.hasBoost,
      powerReady: cooldownMs <= 0,
      cooldownSec: Math.ceil(cooldownMs / 1000),
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
