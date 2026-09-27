const express = require('express');
const http = require('http');
const os = require('os');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
// colores de jugador tomados de la paleta del moodboard (rojo, azul, verde, amarillo)
const COLORS = ['#FF4B5C', '#4D7CFE', '#55D66A', '#FFD93D'];
const CHARACTERS = ['rabbit', 'gorilla', 'princess', 'ice'];

// pista 10x mas grande (todas las coordenadas base se escalan por esto)
const WORLD_SCALE = 10;
const TRACK_WIDTH = 170 * WORLD_SCALE; // igual en las 3 pistas para no re-tunear la fisica

// 3 pistas largas y con curvas cerradas (se generan suavizadas en tracks.js)
const { TRACK_DEFS } = require('./tracks');
// la linea de largada/meta esta a START_DIST del primer punto, sobre el primer tramo;
// la grilla arranca detras de la linea y la vuelta se cuenta al cruzarla
const START_DIST = 1000;
const TRACKS = TRACK_DEFS.map((t) => {
  const points = t.points;
  const seg0 = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  return { ...t, points, guardrailSegments: new Set(t.guardrailSegments), startT: START_DIST / seg0 };
});

// ---------- arena del modo batalla (autitos chocadores) ----------
const ARENA_W = 14000, ARENA_H = 9600;
const ARENA = {
  w: ARENA_W, h: ARENA_H,
  pillars: [
    { x: 3800, y: 2900, r: 600 }, { x: 10200, y: 2900, r: 600 },
    { x: 3800, y: 6700, r: 600 }, { x: 10200, y: 6700, r: 600 },
    { x: 7000, y: 4800, r: 950 },
  ],
};
TRACKS.push({
  id: 'arena', name: 'BATALLA', theme: 'battle', mode: 'battle', arena: ARENA,
  points: [{ x: 0, y: 0 }, { x: ARENA_W, y: 0 }, { x: ARENA_W, y: ARENA_H }, { x: 0, y: ARENA_H }],
  guardrailSegments: new Set(), startT: 0,
});
const BATTLE_LIVES = 10;
const BATTLE_TIME_MS = 4 * 60 * 1000; // tope: gana el que tenga mas vidas
const FOOT_SPEED = 900, FOOT_ACCEL = 3200, FOOT_TURN = 3.4;
const RUNOVER_SPEED = 450; // hay que venir en movimiento y de frente para pisar a alguien

let trackIndex = 0;
function activeTrack() { return TRACKS[trackIndex]; }
function isBattle() { return activeTrack().mode === 'battle'; }

// html/js/css siempre se revalidan: si no, la TV se quedaba mostrando la version vieja
app.use(express.static(__dirname + '/public', {
  setHeaders(res, filePath) {
    if (/\.(html|js|css)$/.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
  },
}));

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
  return { dist: Math.sqrt(dx * dx + dy * dy), x: cx, y: cy, t };
}

function nearestTrackInfo(px, py) {
  const n = activeTrack().points.length;
  let best = null, bestIdx = -1;
  for (let i = 0; i < n; i++) {
    const a = segPoint(i), b = segPoint(i + 1);
    const r = closestPointOnSegment(px, py, a.x, a.y, b.x, b.y);
    if (!best || r.dist < best.dist) { best = r; bestIdx = i; }
  }
  return { dist: best.dist, idx: bestIdx, x: best.x, y: best.y, t: best.t };
}

const RACE_LAPS = Number(process.env.RACE_LAPS) || 3;

// posicion medida desde la linea de largada, en tramos (0 = justo en la linea)
function relPos(info) {
  const tr = activeTrack();
  let e = info.idx + info.t - tr.startT;
  if (e < 0) e += tr.points.length;
  return e;
}

function registerLapProgress(p, e) {
  const n = activeTrack().points.length;
  const idx = Math.floor(e);
  if (idx <= 1 && p.lapIndex >= n - 2) {
    p.lap += 1;
    p.lapIndex = idx;
    if (p.lap >= RACE_LAPS && !p.finished && phase === 'racing') finishRacer(p);
  } else if (idx > p.lapIndex && idx <= p.lapIndex + 2) {
    // solo se avanza tramo a tramo: ir marcha atras cruzando la meta ya no suma una vuelta
    p.lapIndex = idx;
  }
}

// progreso continuo = vueltas completas * tramos + tramo actual + fraccion del tramo.
// Si todavia no paso la mitad de la vuelta pero esta en los ultimos tramos, es que
// esta detras de la linea de largada (no adelante)
function updateProgress(p, e) {
  const n = activeTrack().points.length;
  let raw = e;
  if (p.lapIndex < n / 2 && e > n / 2) raw -= n;
  p.progress = p.lap * n + raw;
}

// la carrera sigue hasta que llegan TODOS; el que llega sigue en piloto automatico
let finishOrder = [];
let firstFinishAt = 0;
let raceStartAt = 0;
const FINISH_GRACE_MS = 150000; // por si alguien deja el celular: tope despues del ganador

function finishRacer(p) {
  const now = Date.now();
  p.finished = true;
  finishOrder.push(p.id);
  p.finishPlace = finishOrder.length;
  p.finishTime = now - raceStartAt;
  if (p.finishPlace === 1) { raceWinnerId = p.id; firstFinishAt = now; }
  if (!p.ai) p.ai = newAi();
  p.input.accel = false; p.input.brake = false;
  if (players.every((q) => !racer(q) || q.finished)) endRace(now);
}

function endRace(now) {
  phase = 'finished';
  finishedAt = now;
  const rest = players.filter((q) => racer(q) && !q.finished)
    .sort((a, b) => (b.progress || 0) - (a.progress || 0)).map((q) => q.id);
  finalRanking = finishOrder.concat(rest);
}

function computePlaces() {
  if (isBattle()) {
    const list = battleRanking();
    const pl = {};
    list.forEach((id, i) => { pl[id] = i + 1; });
    return pl;
  }
  const racing = players.filter(racer).sort((a, b) =>
    (a.finished ? a.finishPlace : 99) - (b.finished ? b.finishPlace : 99) || (b.progress || 0) - (a.progress || 0));
  const places = {};
  racing.forEach((p, i) => { places[p.id] = i + 1; });
  return places;
}

// grilla de largada 2x2 detras de la linea (fila de adelante: P1 y P2)
function spawnFor(slot) {
  if (isBattle()) {
    const x = slot % 2 === 0 ? 1600 : ARENA_W - 1600;
    const y = slot < 2 ? 1600 : ARENA_H - 1600;
    return { x, y, angle: Math.atan2(ARENA_H / 2 - y, ARENA_W / 2 - x) };
  }
  const pts = activeTrack().points;
  const a = pts[0], b = pts[1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const dirX = dx / len, dirY = dy / len;
  const perpX = -dirY, perpY = dirX;
  const row = slot < 2 ? 0 : 1;
  const along = START_DIST - (row === 0 ? 300 : 650);
  const lane = (slot % 2 === 0 ? -1 : 1) * 420;
  return {
    x: a.x + dirX * along + perpX * lane,
    y: a.y + dirY * along + perpY * lane,
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
let finalRanking = [];

// las cajas de item y las monedas se recalculan cada vez que cambia la pista activa
// (sus posiciones se derivan geometricamente de los puntos de esa pista)
let boostBoxes = [];
let coins = [];
const COIN_MAX = 10; // cada moneda suma +3% de velocidad maxima (hasta +30% con las 10)

function lateral(track, i, frac, off) {
  const pts = track.points, n = pts.length;
  const a = pts[i % n], b = pts[(i + 1) % n];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: Math.round(a.x + dx * frac - (dy / len) * off), y: Math.round(a.y + dy * frac + (dx / len) * off) };
}

// filas de 3 cajas cruzando la pista, repartidas por la vuelta (lejos de la largada)
function computeBoostBoxes(track) {
  const n = track.points.length;
  const out = [];
  [0.14, 0.33, 0.52, 0.7, 0.88].forEach((f) => {
    const i = Math.floor(f * n);
    [-520, 0, 520].forEach((off) => out.push({ ...lateral(track, i, 0.5, off), active: true, respawnAt: 0 }));
  });
  return out;
}

// monedas en tiras de 3 (cada 3 tramos, alternando de lado) que dan un empujoncito
// de velocidad maxima permanente por el resto de la carrera
function computeCoins(track) {
  const n = track.points.length;
  const out = [];
  for (let i = 4; i < n - 1; i += 3) {
    const side = (i / 3) % 2 < 1 ? 1 : -1;
    const off = (TRACK_WIDTH / 2) * 0.45 * side;
    [0.2, 0.5, 0.8].forEach((f) => out.push({ ...lateral(track, i, f, off), active: true, respawnAt: 0 }));
  }
  return out;
}

function regenerateTrackObjects() {
  const track = activeTrack();
  if (track.mode === 'battle') {
    boostBoxes = [[7000, 1300], [7000, 8300], [1300, 4800], [12700, 4800], [5300, 2900], [8700, 6700], [5300, 6700], [8700, 2900]]
      .map(([x, y]) => ({ x, y, active: true, respawnAt: 0 }));
    coins = [];
    return;
  }
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
    p.lives = isBattle() ? BATTLE_LIVES : 3;
    p.onFoot = false;
    p.eliminated = false;
    p.invulnUntil = 0;
    p.punchAt = 0;
    p.hitSeq = 0;
    p.hitCause = '';
    p.carX = p.x; p.carY = p.y; p.carAngle = p.angle;
    p.lap = 0;
    p.lapIndex = 0;
    p.item = null;
    p.starUntil = 0;
    p.shrunkUntil = 0;
    p.crashUntil = 0;
    p.slowUntil = 0;
    p.coins = 0;
    p.powerCooldownUntil = 0;
    p.powerUses = isBattle() ? 99 : POWER_USES; // en batalla los poderes no se agotan
    p.boostUntil = 0;
    p.fallUntil = 0;
    p.progress = 0;
    p.finished = false;
    p.finishPlace = 0;
    p.finishTime = 0;
    if (!p.bot) p.ai = null;
  });
  finalRanking = [];
  hearts = [];
  nextHeartAt = Date.now() + 8000;
  elimOrder = [];
  finishOrder = [];
  firstFinishAt = 0;
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
    // lleno por la maquina: el humano ocupa el lugar de un CPU
    if (slot === -1) slot = players.findIndex((p) => p && p.bot);
    if (slot === -1) { socket.emit('full'); return; }
    players[slot] = makePlayer(slot, socket.id, CHARACTERS[slot]);
    socket.emit('joined', { id: players[slot].id, color: players[slot].color });
    // si la carrera ya arranco, espera a la proxima: asi todos arrancan juntos de la grilla
    if (phase !== 'select') players[slot].spectating = true;
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
    } else if (!p.finished) {
      p.input.steer = steer;
      p.input.accel = accel;
      p.input.brake = brake;
    }
    p.prevAccel = accel;
  });

  socket.on('boost', () => useItem(slot));

  socket.on('power', () => tryPower(slot));

  socket.on('exit', () => toggleFoot(slot));

  socket.on('cycle_track', () => {
    if (slot === -1 || !players[slot] || phase !== 'select') return;
    trackIndex = (trackIndex + 1) % TRACKS.length;
    regenerateTrackObjects();
  });

  socket.on('reset_to_menu', () => {
    if (slot === -1 || !players[slot]) return;
    // el que esta mirando no puede cortar la carrera de los demas
    if (players[slot].spectating && phase !== 'finished') return;
    backToMenu();
  });

  socket.on('disconnect', () => {
    if (slot !== -1 && players[slot] && players[slot].socketId === socket.id) players[slot] = null;
    // sin humanos no tiene sentido que la maquina siga corriendo sola
    if (phase !== 'select' && !players.some((p) => p && !p.bot)) backToMenu();
  });
});

function makePlayer(slot, socketId, character) {
  const s = spawnFor(slot);
  return {
    id: 'P' + (slot + 1),
    socketId,
    color: COLORS[slot],
    character,
    confirmed: false,
    x: s.x, y: s.y, angle: s.angle, speed: 0,
    lives: 3, lap: 0, lapIndex: 0, progress: 0,
    item: null, starUntil: 0, shrunkUntil: 0, crashUntil: 0, slowUntil: 0, coins: 0,
    powerCooldownUntil: 0, powerUses: POWER_USES, boostUntil: 0, fallUntil: 0,
    finished: false, finishPlace: 0, finishTime: 0,
    input: { steer: 0, accel: false, brake: false },
    prevAccel: false,
    selectZone: 'neutral',
    spectating: false,
  };
}

// corredores de verdad en esta carrera (los que llegaron tarde miran hasta la proxima)
function racer(p) { return p && !p.spectating; }

function backToMenu() {
  phase = 'select';
  countdown = 0;
  countdownAcc = 0;
  firstConfirmAt = 0;
  raceWinnerId = null;
  finishedAt = 0;
  removeBots();
  players.forEach((p) => { if (p) { p.confirmed = false; p.spectating = false; } });
  peels = [];
  flowers = [];
  missiles = [];
  iceUntil = 0;
  iceOwnerSlot = -1;
}

// --- CPU: siempre compiten al menos 3; si no hay suficientes humanos, completa la maquina ---
const MIN_RACERS = 3;

function removeBots() {
  players.forEach((p, i) => { if (p && p.bot) players[i] = null; });
}

function addBots() {
  removeBots();
  const humans = players.filter((p) => racer(p) && !p.bot).length;
  const need = Math.max(0, MIN_RACERS - humans);
  let k = 0;
  for (let slot = 0; slot < players.length && k < need; slot++) {
    if (players[slot]) continue;
    const used = new Set(players.filter(Boolean).map((p) => p.character));
    const character = CHARACTERS.find((c) => !used.has(c)) || CHARACTERS[slot];
    const b = makePlayer(slot, null, character);
    b.bot = true;
    b.id = 'CPU' + (k + 1);
    b.confirmed = true;
    b.ai = newAi();
    players[slot] = b;
    k++;
  }
}

// CPU de nivel bajo: mas lentos que el tope y usan items/poderes sin apuro
function newAi() {
  return { pace: 0.86, basePace: 0.84 + Math.random() * 0.06, lane: (Math.random() - 0.5) * 700, itemAt: 0, stuckSince: 0, reverseUntil: 0, powerAt: 0 };
}

// punto de la linea central a `dist` unidades por delante de `info` (sobre la pista)
function pointAhead(info, dist) {
  const n = activeTrack().points.length;
  let idx = info.idx;
  let a = segPoint(idx), b = segPoint(idx + 1);
  let segLen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let left = dist + info.t * segLen;
  for (let guard = 0; guard < n * 2 && left > segLen; guard++) {
    left -= segLen;
    idx = (idx + 1) % n;
    a = segPoint(idx); b = segPoint(idx + 1);
    segLen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  }
  const t = left / segLen;
  const dx = (b.x - a.x) / segLen, dy = (b.y - a.y) / segLen;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, nx: -dy, ny: dx };
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function botsThink(now) {
  if (isBattle()) { botsThinkBattle(now); return; }
  const humans = players.filter((p) => racer(p) && !p.bot && !p.finished);
  const bestHuman = humans.reduce((m, p) => Math.max(m, p.progress || 0), -Infinity);
  players.forEach((p, slot) => {
    // los CPU y los que ya llegaron (piloto automatico) manejan solos
    if (!racer(p) || (!p.bot && !p.finished)) return;
    const ai = p.ai;
    const inp = p.input;
    if (now < p.fallUntil || now < p.crashUntil) { inp.accel = false; inp.brake = false; inp.steer = 0; return; }

    // ritmo con "goma" (en tramos de 700): ni se escapan ni quedan tirados lejos de los humanos
    let pace = ai.basePace;
    if (p.finished) pace = 0.7;
    else if (humans.length) {
      const gap = (p.progress || 0) - bestHuman;
      if (gap > 6) pace *= 0.85;
      else if (gap > 2) pace *= 0.93;
      else if (gap < -14) pace *= 1.08;
    } else {
      pace = 0.95; // ya llegaron todos los humanos: que terminen rapido
    }
    ai.pace = pace;

    const info = nearestTrackInfo(p.x, p.y);
    const look = 1400 + Math.max(0, p.speed) * 0.35;
    const tgt = pointAhead(info, look);
    const maxLane = TRACK_WIDTH / 2 - 320;
    // cambia de carril de a poco para que no vayan todos en fila
    if (Math.random() < 0.004) ai.lane = (Math.random() - 0.5) * 2 * maxLane;
    const lane = Math.max(-maxLane, Math.min(maxLane, ai.lane));
    const tx = tgt.x + tgt.nx * lane, ty = tgt.y + tgt.ny * lane;
    const diff = wrapAngle(Math.atan2(ty - p.y, tx - p.x) - p.angle);

    // atascado contra una baranda u otro auto: marcha atras un momento
    if (now < ai.reverseUntil) {
      inp.accel = false; inp.brake = true; inp.steer = -Math.sign(diff) || 1;
      return;
    }
    if (p.speed < 150 && phase === 'racing') {
      if (!ai.stuckSince) ai.stuckSince = now;
      else if (now - ai.stuckSince > 1500) { ai.reverseUntil = now + 700; ai.stuckSince = 0; }
    } else {
      ai.stuckSince = 0;
    }

    inp.steer = Math.max(-1, Math.min(1, diff * 2.4));
    const sharp = Math.abs(diff);
    inp.brake = sharp > 1.3 && p.speed > 1200;
    inp.accel = !inp.brake && !(sharp > 0.8 && p.speed > 1500);

    if (p.finished) return;
    // items: los usa un rato despues de agarrarlos
    if (p.item) {
      if (!ai.itemAt) ai.itemAt = now + 1500 + Math.random() * 4000;
      else if (now >= ai.itemAt) { ai.itemAt = 0; useItem(slot); }
    } else {
      ai.itemAt = 0;
    }
    // poder especial: de vez en cuando, cuando esta listo
    if (now >= p.powerCooldownUntil) {
      if (!ai.powerAt) ai.powerAt = now + 6000 + Math.random() * 12000;
      else if (now >= ai.powerAt) { ai.powerAt = 0; tryPower(slot); }
    }
  });
}

function useItem(slot) {
  const p = players[slot];
  if (!racer(p) || p.finished || p.eliminated || phase !== 'racing' || !p.item) return;
  {
    const now = Date.now();
    const item = p.item;
    p.item = null;
    if (item === 'star') {
      p.starUntil = now + 2000;
      p.speed = Math.max(p.speed, STAR_SPEED * 0.85); // empujon instantaneo, no solo el tope
    } else if (item === 'mushroom') {
      players.forEach((o, i) => {
        if (!racer(o) || o.finished || i === slot) return;
        o.shrunkUntil = now + 5000;
      });
    } else if (item === 'missile') {
      let targetSlot = -1, bestDist = Infinity;
      players.forEach((o, i) => {
        if (!racer(o) || o.finished || o.eliminated || i === slot) return;
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
  }
}

// cada poder se puede usar 2 veces por carrera (con un respiro entre uso y uso)
const POWER_USES = 2;
const POWER_COOLDOWN = 6000;
function tryPower(slot) {
  const p = players[slot];
  if (!racer(p) || p.finished || p.eliminated || phase !== 'racing') return;
  const now = Date.now();
  if (now < p.powerCooldownUntil || p.powerUses <= 0) return;
  if (!isBattle()) p.powerUses -= 1;
  p.powerCooldownUntil = now + (isBattle() ? 8000 : POWER_COOLDOWN);
  usePower(slot);
}

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

function hittable(o, i, slot, now) {
  return racer(o) && i !== slot && !o.finished && !o.eliminated && now >= o.starUntil && now >= o.fallUntil;
}

function usePower(slot) {
  const p = players[slot];
  const now = Date.now();
  const fx = Math.cos(p.angle), fy = Math.sin(p.angle);
  if (p.character === 'rabbit') {
    // zanahoria gigante: turbo propio y golpe a los que tiene cerca por delante
    p.boostUntil = now + 2200;
    p.speed = Math.max(p.speed, MAX_SPEED * 1.2);
    players.forEach((o, i) => {
      if (!hittable(o, i, slot, now)) return;
      const dx = o.x - p.x, dy = o.y - p.y;
      if (Math.hypot(dx, dy) > 1800 || fx * dx + fy * dy < -200) return;
      if (isBattle()) { damage(o, now, 'carrot'); return; }
      o.crashUntil = now + 1000;
      o.speed = 0;
    });
  } else if (p.character === 'gorilla') {
    // 3 cascaras en abanico detras
    [-1, 0, 1].forEach((k) => peels.push({
      x: p.x - fx * 380 - fy * k * 430,
      y: p.y - fy * 380 + fx * k * 430,
      ownerSlot: slot,
      expiresAt: now + 20000,
    }));
  } else if (p.character === 'princess') {
    // 3 flores venenosas en abanico hacia adelante
    [-0.22, 0, 0.22].forEach((da) => {
      const a = p.angle + da, v = 4200 + Math.max(0, p.speed);
      flowers.push({
        x: p.x + Math.cos(a) * 300, y: p.y + Math.sin(a) * 300,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        ownerSlot: slot,
        expiresAt: now + 1600,
      });
    });
  } else if (p.character === 'ice') {
    // congela a TODOS los demas (van lentos y resbalan) y el que lo usa va con turbo
    iceUntil = now + 5000;
    iceOwnerSlot = slot;
    p.speed = Math.max(p.speed, MAX_SPEED);
    players.forEach((o, i) => { if (hittable(o, i, slot, now)) o.speed *= 0.4; });
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

// ======================= MODO BATALLA =======================
// Autitos chocadores: 10 vidas, gana el ultimo que queda. Se pierde una vida si te pegan
// de costado con el auto, si te pisan estando a pie, con misiles o la zanahoria, o si un
// peaton te pega en el costado del auto. Bajarse sirve para juntar corazones (solo a pie)
// y para pegar de costado, pero a pie te pisan si te agarran de frente y en movimiento.
let hearts = [];
let nextHeartAt = 0;
let elimOrder = [];

function alive(p) { return racer(p) && !p.eliminated; }

function battleRanking() {
  const live = players.filter(alive).sort((a, b) => b.lives - a.lives);
  return live.map((p) => p.id).concat(elimOrder.slice().reverse());
}

function endBattle(now) {
  phase = 'finished';
  finishedAt = now;
  finalRanking = battleRanking();
  raceWinnerId = finalRanking[0] || null;
}

function damage(p, now, cause) {
  if (!alive(p) || now < p.invulnUntil || now < p.starUntil) return false;
  p.lives -= 1;
  p.invulnUntil = now + 1600;
  p.hitSeq = (p.hitSeq || 0) + 1;
  p.hitCause = cause;
  if (p.onFoot) {
    // murio a pie: reaparece sentado en su auto
    p.onFoot = false;
    p.x = p.carX; p.y = p.carY; p.angle = p.carAngle;
  }
  p.speed = 0;
  p.crashUntil = now + 900;
  if (p.lives <= 0) {
    p.lives = 0;
    p.eliminated = true;
    p.onFoot = false;
    elimOrder.push(p.id);
  }
  return true;
}

function toggleFoot(slot) {
  const p = players[slot];
  const now = Date.now();
  if (!alive(p) || !isBattle() || phase !== 'racing' || now < p.crashUntil) return;
  if (!p.onFoot) {
    p.onFoot = true;
    p.carX = p.x; p.carY = p.y; p.carAngle = p.angle;
    // se baja por el costado
    p.x += -Math.sin(p.angle) * 400; p.y += Math.cos(p.angle) * 400;
    p.speed = 0;
    confine(p, activeTrack().arena, now);
  } else if (Math.hypot(p.x - p.carX, p.y - p.carY) < 700) {
    p.onFoot = false;
    p.x = p.carX; p.y = p.carY; p.angle = p.carAngle; p.speed = 0;
  }
}

function stepFoot(p, slotIdx, now, dt) {
  const star = now < p.starUntil;
  const iceOn = iceOwnerSlot !== -1 && now < iceUntil;
  const onIce = iceOn && slotIdx !== iceOwnerSlot && !star;
  const turbo = (iceOn && slotIdx === iceOwnerSlot) || now < p.boostUntil || star;
  let max = FOOT_SPEED;
  if (onIce) max *= 0.55;
  if (now < p.slowUntil && !star) max *= 0.5;
  if (now < p.shrunkUntil && !star) max *= 0.7;
  if (turbo) max *= 1.3;
  const inp = p.input;
  if (inp.accel) p.speed = Math.min(max, p.speed + FOOT_ACCEL * dt);
  else if (inp.brake) p.speed = Math.max(-max * 0.6, p.speed - FOOT_ACCEL * dt);
  else p.speed *= Math.max(0, 1 - 10 * dt);
  p.speed = Math.max(-max * 0.6, Math.min(max, p.speed));
  // a pie gira en el lugar
  p.angle += inp.steer * FOOT_TURN * (onIce ? 0.6 : 1) * dt;
  p.x += Math.cos(p.angle) * p.speed * dt;
  p.y += Math.sin(p.angle) * p.speed * dt;
}

// paredes de la arena y pilares
function confine(p, A, now) {
  const R = p.onFoot ? 130 : 230;
  let hit = false;
  if (p.x < R) { p.x = R; hit = true; }
  if (p.x > A.w - R) { p.x = A.w - R; hit = true; }
  if (p.y < R) { p.y = R; hit = true; }
  if (p.y > A.h - R) { p.y = A.h - R; hit = true; }
  for (const c of A.pillars) {
    const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) || 1;
    if (d < c.r + R) { p.x = c.x + dx / d * (c.r + R); p.y = c.y + dy / d * (c.r + R); hit = true; }
  }
  if (hit && !p.onFoot) p.speed *= 0.4;
}

function push(a, b, minDist, share) {
  const dx = b.x - a.x, dy = b.y - a.y;
  let d = Math.hypot(dx, dy);
  if (d >= minDist) return null;
  if (d < 0.001) d = 0.001;
  const nx = dx / d, ny = dy / d, ov = minDist - d;
  a.x -= nx * ov * share; a.y -= ny * ov * share;
  b.x += nx * ov * (1 - share); b.y += ny * ov * (1 - share);
  return { nx, ny };
}

function collidePair(a, b, now, dt) {
  const ha = { x: Math.cos(a.angle), y: Math.sin(a.angle) }, hb = { x: Math.cos(b.angle), y: Math.sin(b.angle) };
  if (!a.onFoot && !b.onFoot) {
    const n = push(a, b, 32 * WORLD_SCALE, 0.5);
    if (!n) return;
    const closing = (ha.x * a.speed - hb.x * b.speed) * n.nx + (ha.y * a.speed - hb.y * b.speed) * n.ny;
    const aFront = ha.x * n.nx + ha.y * n.ny, bFront = -(hb.x * n.nx + hb.y * n.ny);
    const bSide = Math.abs(hb.x * n.nx + hb.y * n.ny) < 0.72, aSide = Math.abs(ha.x * n.nx + ha.y * n.ny) < 0.72;
    // choque de costado ("T"): pierde una vida el que recibe el golpe
    if (closing > 700) {
      if (a.speed > 600 && aFront > 0.6 && bSide) damage(b, now, 'side');
      else if (b.speed > 600 && bFront > 0.6 && aSide) damage(a, now, 'side');
    }
    // rebote de autitos chocadores
    const knock = Math.min(Math.abs(closing), 2600) * 0.5 * dt;
    a.x -= n.nx * knock; a.y -= n.ny * knock;
    b.x += n.nx * knock; b.y += n.ny * knock;
    a.speed *= 0.6; b.speed *= 0.6;
    return;
  }
  if (a.onFoot && b.onFoot) { push(a, b, 260, 0.5); return; }
  const car = a.onFoot ? b : a, ped = a.onFoot ? a : b;
  const hc = car === a ? ha : hb, hp = car === a ? hb : ha;
  const n = push(car, ped, 290, 0.1); // n: del auto hacia el peaton
  if (!n) return;
  const front = hc.x * n.nx + hc.y * n.ny;
  if (car.speed > RUNOVER_SPEED && front > 0.5) {
    // atropellado: viene de frente y en movimiento
    if (damage(ped, now, 'runover')) car.speed *= 0.7;
    return;
  }
  // el peaton le pega al auto en el costado
  const toward = -(hp.x * n.nx + hp.y * n.ny);
  const side = Math.abs(front) < 0.75;
  if (ped.speed > 250 && toward > 0.6 && side && now >= ped.punchAt) {
    ped.punchAt = now + 900;
    if (damage(car, now, 'punch')) ped.speed = -400;
  }
}

function battleTick(now, dt) {
  const A = activeTrack().arena;
  if (now - raceStartAt > BATTLE_TIME_MS) { endBattle(now); return; }
  boostBoxes.forEach((b) => { if (!b.active && now >= b.respawnAt) b.active = true; });
  // corazones: aparecen cada tanto y solo se agarran a pie
  if (now >= nextHeartAt) {
    nextHeartAt = now + 9000;
    if (hearts.length < 3) {
      for (let k = 0; k < 20; k++) {
        const h = { x: 900 + Math.random() * (A.w - 1800), y: 900 + Math.random() * (A.h - 1800) };
        if (A.pillars.every((c) => Math.hypot(h.x - c.x, h.y - c.y) > c.r + 500)) { hearts.push(h); break; }
      }
    }
  }

  botsThink(now);

  players.forEach((p, i) => {
    if (!alive(p)) return;
    if (now < p.crashUntil) { p.speed = 0; return; }
    if (p.onFoot) stepFoot(p, i, now, dt); else stepCar(p, i, now, dt);
  });

  const act = players.filter(alive);
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) collidePair(act[i], act[j], now, dt);
  // los autos estacionados (de los que se bajaron) son obstaculos
  act.forEach((o) => {
    if (!o.onFoot) return;
    const parked = { x: o.carX, y: o.carY };
    act.forEach((p) => {
      const n = push(parked, p, p.onFoot ? 300 : 400, 0);
      if (n && !p.onFoot) p.speed *= 0.5;
    });
  });
  act.forEach((p) => confine(p, A, now));

  act.forEach((p, k) => {
    const idx = players.indexOf(p);
    const star = now < p.starUntil;
    for (const peel of peels) {
      if (peel.ownerSlot === idx || peel.expiresAt === 0 || star) continue;
      if (Math.hypot(p.x - peel.x, p.y - peel.y) < 30 * WORLD_SCALE) { p.slowUntil = now + 1200; peel.expiresAt = 0; }
    }
    for (const fl of flowers) {
      if (fl.ownerSlot === idx || fl.expiresAt === 0 || star) continue;
      if (Math.hypot(p.x - fl.x, p.y - fl.y) < 38 * WORLD_SCALE) { p.slowUntil = now + 1800; fl.expiresAt = 0; }
    }
    boostBoxes.forEach((b) => {
      if (!b.active || p.item) return;
      if (Math.hypot(p.x - b.x, p.y - b.y) < 60 * WORLD_SCALE) { p.item = rollItem(); b.active = false; b.respawnAt = now + 7000; }
    });
    if (p.onFoot) {
      hearts = hearts.filter((h) => {
        if (Math.hypot(p.x - h.x, p.y - h.y) > 380) return true;
        p.lives = Math.min(BATTLE_LIVES, p.lives + 1);
        p.heartSeq = (p.heartSeq || 0) + 1;
        return false;
      });
    }
    void k;
  });

  peels = peels.filter((pe) => pe.expiresAt > now);
  flowers = flowers.filter((fl) => {
    fl.x += fl.vx * dt; fl.y += fl.vy * dt;
    return fl.expiresAt > now && fl.x > 0 && fl.x < A.w && fl.y > 0 && fl.y < A.h;
  });
  missiles.forEach((m) => {
    const target = players[m.targetSlot];
    if (!alive(target) || now >= m.expiresAt) { m.expiresAt = 0; return; }
    const dx = target.x - m.x, dy = target.y - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    if (dist < 45 * WORLD_SCALE) { damage(target, now, 'missile'); m.expiresAt = 0; return; }
    m.x += (dx / dist) * MISSILE_SPEED * dt;
    m.y += (dy / dist) * MISSILE_SPEED * dt;
  });
  missiles = missiles.filter((m) => m.expiresAt > now);

  if (players.filter(alive).length <= 1) endBattle(now);
}

// CPU de batalla: persiguen al rival mas cercano (a pie son presa facil) sin puntería perfecta
function botsThinkBattle(now) {
  const A = activeTrack().arena;
  players.forEach((p, slot) => {
    if (!alive(p) || !p.bot) return;
    const ai = p.ai, inp = p.input;
    ai.pace = ai.basePace;
    if (now < p.crashUntil) { inp.accel = false; inp.brake = false; inp.steer = 0; return; }
    let best = null, bd = Infinity;
    players.forEach((o, i) => {
      if (!alive(o) || i === slot) return;
      const d = Math.hypot(o.x - p.x, o.y - p.y) * (o.onFoot ? 0.6 : 1);
      if (d < bd) { bd = d; best = o; }
    });
    if (!ai.wanderAt || now > ai.wanderAt) {
      ai.wanderAt = now + 2500 + Math.random() * 2500;
      ai.wx = (Math.random() - 0.5) * 2600; ai.wy = (Math.random() - 0.5) * 2600;
    }
    let tx = A.w / 2 + ai.wx, ty = A.h / 2 + ai.wy;
    if (best) {
      tx = best.x + Math.cos(best.angle) * best.speed * 0.35 + ai.wx * 0.35;
      ty = best.y + Math.sin(best.angle) * best.speed * 0.35 + ai.wy * 0.35;
    }
    const diff = wrapAngle(Math.atan2(ty - p.y, tx - p.x) - p.angle);
    if (now < ai.reverseUntil) { inp.accel = false; inp.brake = true; inp.steer = -Math.sign(diff) || 1; return; }
    if (p.speed < 150) {
      if (!ai.stuckSince) ai.stuckSince = now;
      else if (now - ai.stuckSince > 1200) { ai.reverseUntil = now + 800; ai.stuckSince = 0; }
    } else ai.stuckSince = 0;
    inp.steer = Math.max(-1, Math.min(1, diff * 2.2));
    inp.brake = Math.abs(diff) > 2.3 && p.speed > 600;
    inp.accel = !inp.brake;
    if (p.item) {
      if (!ai.itemAt) ai.itemAt = now + 1500 + Math.random() * 3500;
      else if (now >= ai.itemAt) { ai.itemAt = 0; useItem(slot); }
    } else ai.itemAt = 0;
    if (now >= p.powerCooldownUntil) {
      if (!ai.powerAt) ai.powerAt = now + 5000 + Math.random() * 10000;
      else if (now >= ai.powerAt) { ai.powerAt = 0; tryPower(slot); }
    }
  });
}

// fisica arcade del auto (la usan la carrera y la arena de batalla)
function stepCar(p, slotIdx, now, dt) {
  const starActive = now < p.starUntil;
  const iceOn = iceOwnerSlot !== -1 && now < iceUntil;
  const onIce = iceOn && slotIdx !== iceOwnerSlot && !starActive && !p.finished;
  const turbo = (iceOn && slotIdx === iceOwnerSlot) || now < p.boostUntil;
  const slowed = now < p.slowUntil && !starActive;
  const shrunk = now < p.shrunkUntil && !starActive;

  const friction = onIce ? 400 : FRICTION;
  const turnRate = onIce ? TURN_RATE * 0.6 : TURN_RATE;
  const coinBonus = (p.coins || 0) * (MAX_SPEED * 0.03);
  let maxSpeed = slowed ? 900 : starActive ? STAR_SPEED : MAX_SPEED;
  if (shrunk) maxSpeed = Math.min(maxSpeed, 750);
  maxSpeed += coinBonus;
  if (onIce) maxSpeed *= 0.55; // congelado: va lento
  if (turbo && !slowed) maxSpeed *= 1.3; // turbo del hielo / zanahoria
  if (p.ai && (p.bot || p.finished)) maxSpeed *= p.ai.pace;

  const { input } = p;
  if (slowed) {
    p.speed = Math.max(0, p.speed - 4000 * dt);
  } else if (input.accel) {
    p.speed += ACCEL * (turbo ? 1.6 : 1) * dt;
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
}

setInterval(() => {
  const now = Date.now();
  const dt = TICK_MS / 1000;

  if (phase === 'select') {
    const connected = players.filter((p) => p && !p.bot);
    const confirmedCount = connected.filter((p) => p.confirmed).length;
    if (connected.length > 0 && confirmedCount > 0 &&
        (confirmedCount === connected.length || now - firstConfirmAt > 8000)) {
      players.forEach((p) => { if (p && !p.confirmed) p.confirmed = true; });
      phase = 'countdown';
      countdown = 3;
      countdownAcc = 0;
      addBots();
      resetForRace();
    }
  } else if (phase === 'countdown') {
    countdownAcc += TICK_MS;
    if (countdownAcc >= 1000) {
      countdownAcc = 0;
      countdown -= 1;
      if (countdown <= 0) { phase = 'racing'; raceStartAt = now; }
    }
  } else if (phase === 'finished') {
    if (now - finishedAt > 12000) backToMenu();
  } else if (phase === 'racing') {
    if (isBattle()) {
      battleTick(now, dt);
    } else {
      if (firstFinishAt && now - firstFinishAt > FINISH_GRACE_MS) endRace(now);
      boostBoxes.forEach((b) => {
        if (!b.active && now >= b.respawnAt) b.active = true;
      });
      coins.forEach((c) => {
        if (!c.active && now >= c.respawnAt) c.active = true;
      });

      botsThink(now);

      players.forEach((p, slotIdx) => {
        if (!racer(p)) return;
        if (now < p.fallUntil) return;
        if (now < p.crashUntil) { p.speed = 0; return; }
        stepCar(p, slotIdx, now, dt);
      });

      // choques entre autos: se empujan y pueden mandarse al vacio entre si
      for (let i = 0; i < players.length; i++) {
        const a = players[i];
        if (!racer(a) || a.finished || now < a.fallUntil || now < a.crashUntil) continue;
        for (let j = i + 1; j < players.length; j++) {
          const b = players[j];
          if (!racer(b) || b.finished || now < b.fallUntil || now < b.crashUntil) continue;
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
        if (!racer(p)) return;
        if (now < p.fallUntil || now < p.crashUntil) return;

        const starActive = now < p.starUntil || p.finished;
        for (const peel of peels) {
          if (peel.ownerSlot === players.indexOf(p) || peel.expiresAt === 0 || starActive) continue;
          const dx = p.x - peel.x, dy = p.y - peel.y;
          if (Math.sqrt(dx * dx + dy * dy) < 30 * WORLD_SCALE) {
            p.slowUntil = now + 1200;
            peel.expiresAt = 0;
          }
        }

        for (const fl of flowers) {
          if (fl.ownerSlot === players.indexOf(p) || fl.expiresAt === 0 || starActive) continue;
          const dx = p.x - fl.x, dy = p.y - fl.y;
          if (Math.sqrt(dx * dx + dy * dy) < 38 * WORLD_SCALE) {
            p.slowUntil = now + 1800;
            fl.expiresAt = 0;
          }
        }

        boostBoxes.forEach((b) => {
          if (!b.active || p.item || p.finished) return;
          const dx = p.x - b.x, dy = p.y - b.y;
          if (Math.sqrt(dx * dx + dy * dy) < 60 * WORLD_SCALE) {
            p.item = rollItem();
            b.active = false;
            b.respawnAt = now + 8000;
          }
        });

        coins.forEach((c) => {
          if (!c.active || p.finished) return;
          const dx = p.x - c.x, dy = p.y - c.y;
          if (Math.sqrt(dx * dx + dy * dy) < 46 * WORLD_SCALE) {
            c.active = false;
            c.respawnAt = now + 6000;
            p.coins = Math.min(COIN_MAX, (p.coins || 0) + 1);
          }
        });

        const info = nearestTrackInfo(p.x, p.y);
        const e = relPos(info);
        updateProgress(p, e);
        if (info.dist <= TRACK_WIDTH / 2) {
          registerLapProgress(p, e);
        } else if (activeTrack().guardrailSegments.has(info.idx)) {
          // baranda de ruedas: pared solida que protege el vacio. No te caes ni
          // frenas aca, simplemente no podes pasar del borde (te desliza por la pared)
          const dx = p.x - info.x, dy = p.y - info.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = dx / len, ny = dy / len;
          p.x = info.x + nx * (TRACK_WIDTH / 2);
          p.y = info.y + ny * (TRACK_WIDTH / 2);
          registerLapProgress(p, e);
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
        if (!target || target.finished || now >= m.expiresAt) { m.expiresAt = 0; return; }
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
  }

  broadcast(now);
}, TICK_MS);

// la forma de la pista (100 puntos) solo viaja 1 vez por segundo o cuando cambia
let broadcastTick = 0, lastTrackSent = -1;
function broadcast(now) {
  const places = computePlaces();
  const sendTrack = trackIndex !== lastTrackSent || broadcastTick++ % 20 === 0;
  lastTrackSent = trackIndex;
  const statePlayers = players.map((p) => {
    if (!p) return null;
    return {
      id: p.id,
      color: p.color,
      character: p.character,
      confirmed: p.confirmed,
      bot: !!p.bot,
      spectating: !!p.spectating,
      x: Math.round(p.x), y: Math.round(p.y), angle: Math.round(p.angle * 1000) / 1000,
      steer: p.input.steer,
      lives: p.lives,
      lap: p.lap,
      place: places[p.id] || 1,
      item: p.item,
      coins: p.coins || 0,
      powerCooldown: Math.max(0, Math.ceil((p.powerCooldownUntil - now) / 1000)),
      powerUses: p.powerUses,
      finished: !!p.finished,
      finishPlace: p.finishPlace || 0,
      finishTime: p.finishTime || 0,
      turbo: now < p.boostUntil || (iceOwnerSlot === players.indexOf(p) && now < iceUntil),
      onFoot: !!p.onFoot,
      carX: p.onFoot ? Math.round(p.carX) : undefined,
      carY: p.onFoot ? Math.round(p.carY) : undefined,
      carAngle: p.onFoot ? Math.round(p.carAngle * 1000) / 1000 : undefined,
      eliminated: !!p.eliminated,
      invuln: now < (p.invulnUntil || 0),
      hitSeq: p.hitSeq || 0,
      hitCause: p.hitCause || '',
      heartSeq: p.heartSeq || 0,
      starActive: now < p.starUntil,
      shrunk: now < p.shrunkUntil,
      crashed: now < p.crashUntil,
      slowed: now < p.slowUntil,
      falling: now < p.fallUntil,
      powerReady: now >= p.powerCooldownUntil && p.powerUses > 0,
    };
  });

  const state = {
    phase,
    countdown,
    winnerId: raceWinnerId,
    ranking: finalRanking,
    laps: RACE_LAPS,
    trackIndex,
    trackCount: TRACKS.length,
    trackId: activeTrack().id,
    trackName: activeTrack().name,
    trackTheme: activeTrack().theme,
    trackWidth: TRACK_WIDTH,
    startDist: START_DIST,
    mode: activeTrack().mode || 'race',
    hearts: isBattle() ? hearts.map((h) => ({ x: Math.round(h.x), y: Math.round(h.y) })) : [],
    battleLeft: !isBattle() ? 0 : phase === 'racing' ? Math.max(0, Math.ceil((BATTLE_TIME_MS - (now - raceStartAt)) / 1000)) : BATTLE_TIME_MS / 1000,
    players: statePlayers,
    boxes: boostBoxes.filter((b) => b.active).map((b) => ({ x: b.x, y: b.y })),
    coins: coins.filter((c) => c.active).map((c) => ({ x: c.x, y: c.y })),
    peels: peels.map((pe) => ({ x: Math.round(pe.x), y: Math.round(pe.y) })),
    flowers: flowers.map((fl) => ({ x: Math.round(fl.x), y: Math.round(fl.y) })),
    missiles: missiles.map((m) => ({ x: Math.round(m.x), y: Math.round(m.y) })),
    ice: {
      active: iceOwnerSlot !== -1 && now < iceUntil,
      ownerId: iceOwnerSlot >= 0 && players[iceOwnerSlot] ? players[iceOwnerSlot].id : null,
    },
  };
  if (sendTrack) {
    state.track = activeTrack().points;
    state.guardrailSegments = Array.from(activeTrack().guardrailSegments);
    if (activeTrack().arena) state.arena = activeTrack().arena;
    state.trackList = TRACKS.map((t) => ({ id: t.id, name: t.name, theme: t.theme }));
  }
  io.emit('state', state);

  players.forEach((p) => {
    if (!p || p.bot) return;
    const cooldownMs = Math.max(0, p.powerCooldownUntil - now);
    io.to(p.socketId).emit('status', {
      phase,
      character: p.character,
      confirmed: p.confirmed,
      lives: p.lives,
      lap: p.lap,
      laps: RACE_LAPS,
      place: places[p.id] || 1,
      item: p.item,
      coins: p.coins || 0,
      powerReady: cooldownMs <= 0 && p.powerUses > 0,
      powerUses: p.powerUses,
      finished: !!p.finished,
      finishPlace: p.finishPlace || 0,
      racersLeft: players.filter((q) => racer(q) && !q.finished).length,
      mode: activeTrack().mode || 'race',
      onFoot: !!p.onFoot,
      canEnter: !!p.onFoot && Math.hypot(p.x - p.carX, p.y - p.carY) < 700,
      eliminated: !!p.eliminated,
      alive: players.filter(alive).length,
      cooldownSec: Math.ceil(cooldownMs / 1000),
      winnerId: raceWinnerId,
      won: phase === 'finished' && raceWinnerId === p.id,
      spectating: !!p.spectating,
      trackName: activeTrack().name,
      starActive: now < p.starUntil,
      crashed: now < p.crashUntil,
      falling: now < p.fallUntil,
      slowed: now < p.slowUntil,
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
