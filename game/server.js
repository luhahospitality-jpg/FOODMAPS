'use strict';
// =====================================================================
//  FABELA FOOTBALL — servidor autoritativo
//  Toda la lógica (física, pelota, goles, poderes, bots, fases) corre acá
//  a 20 ticks por segundo. La TV solo dibuja y los celulares solo mandan
//  inputs.
// =====================================================================
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const QRCode = require('qrcode');

const VERSION = 3;
const PORT = process.env.PORT || 3000;
const TICK = 20;
const DT = 1 / TICK;

// ---------------------------------------------------------------------
//  Constantes de la cancha y del partido
// ---------------------------------------------------------------------
const L = 36, W = 20;             // largo (x) y ancho (z) de la cancha
const HX = L / 2, HZ = W / 2;
const GOAL_HW = 2.0;              // medio ancho del arco
const GOAL_H = 2.0;               // alto del arco
const GOAL_D = 1.4;               // profundidad de la red
const BALL_R = 0.22;
const GRAV = 20;
const GOLES_PARA_GANAR = 5;
const TIEMPO_PARTIDO = 240;       // tope de tiempo (segundos)
const TIEMPO_KO = 15;             // desmayado por la pistola
const TIEMPO_PODIO = 12;
const BALAS_PISTOLA = 1;

const PERSONAJES = [
  { id: 'craque',   nombre: 'O CRAQUE',   vel: 7.3, tiro: 1.0,  drible: 1.0,  fin: 0.9,  trucoCd: 1.0 },
  { id: 'rapido',   nombre: 'O RÁPIDO',   vel: 8.4, tiro: 0.92, drible: 0.8,  fin: 0.8,  trucoCd: 1.1 },
  { id: 'forte',    nombre: 'O FORTE',    vel: 6.7, tiro: 1.22, drible: 0.65, fin: 1.0,  trucoCd: 1.3 },
  { id: 'malandro', nombre: 'O MALANDRO', vel: 7.5, tiro: 0.9,  drible: 1.0,  fin: 0.65, trucoCd: 0.7 },
];

const NIVELES = [
  { id: 'laje',    nombre: 'LAJE',    vel: 1.0,  fric: 1.1, rebote: 0.55 },
  { id: 'praca',   nombre: 'PRAÇA',   vel: 1.0,  fric: 1.25, rebote: 0.55 },
  { id: 'praia',   nombre: 'PRAIA',   vel: 0.9,  fric: 2.3, rebote: 0.35 },
  { id: 'noturno', nombre: 'NOTURNO', vel: 1.0,  fric: 0.8, rebote: 0.6 },
];

const TRUCOS = [null,
  { nombre: 'ELÁSTICO', dur: 0.55 },
  { nombre: 'PISADA',   dur: 0.5 },
  { nombre: 'ROLETA',   dur: 0.7 },
  { nombre: 'LAMBRETA', dur: 0.6 },
];

// Códigos de animación que viajan a la TV
const ANIM = { normal: 0, kick: 1, slide: 2, head: 3, stun: 4, ko: 5, fall: 6, trick: 7, baile: 8, gol: 9, gun: 10 };

// ---------------------------------------------------------------------
//  Servidor HTTP
// ---------------------------------------------------------------------
const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 5000, pingTimeout: 8000 });

// Sin caché para html/js/css: la TV si no se queda con la versión vieja
app.use((req, res, next) => {
  if (/\.(html|js|css|json)$/.test(req.path) || req.path === '/' || req.path === '/c') {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

function urlControl(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0];
  return proto + '://' + req.headers.host + '/c';
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/tv/index.html')));
app.get('/tv', (req, res) => res.sendFile(path.join(__dirname, 'public/tv/index.html')));
app.get('/c', (req, res) => res.sendFile(path.join(__dirname, 'public/controller/index.html')));
app.get('/control', (req, res) => res.redirect('/c'));
app.get('/qr.svg', async (req, res) => {
  try {
    const svg = await QRCode.toString(urlControl(req), { type: 'svg', margin: 1, color: { dark: '#000000', light: '#ffffff' } });
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'no-cache');
    res.send(svg);
  } catch (e) { res.status(500).send(String(e)); }
});
app.get('/info', (req, res) => res.json({ version: VERSION, url: urlControl(req) }));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  setHeaders(res, p) { if (/\.(html|js|css|json)$/.test(p)) res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); },
}));

// ---------------------------------------------------------------------
//  Utilidades
// ---------------------------------------------------------------------
const rnd = Math.random;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const r100 = (v) => Math.round(v * 100);
const hypot = Math.hypot;
function normAng(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

// ---------------------------------------------------------------------
//  Estado global
// ---------------------------------------------------------------------
function slotVacio(i) {
  return { i, humano: null, pid: null, nombre: 'CPU', ch: i % PERSONAJES.length, listo: false };
}

const juego = {
  fase: 'select',        // select → countdown → playing → finished → select
  faseT: 0,
  sub: '',               // dentro de 'playing': '', 'goal', 'kickoff'
  subT: 0,
  nivel: 0,
  slots: [0, 1, 2, 3].map(slotVacio),
  mirando: new Set(),    // sockets que miran (entraron con la partida empezada o sin lugar)
  jug: [],               // jugadores del partido (uno por slot)
  pelota: null,
  balas: [],
  marcador: [0, 0],
  tiempo: TIEMPO_PARTIDO,
  oro: false,            // gol de oro
  matchPoint: false,
  ev: [],
  evId: 0,
  reloj: 0,
  ultimoGoleador: -1,
  podio: null,
  ganador: -1,
};

function evento(k, datos) {
  const e = Object.assign({ i: ++juego.evId, k, ts: juego.reloj }, datos || {});
  juego.ev.push(e);
  return e;
}

function hayHumanos() { return juego.slots.some((s) => s.humano); }
function slotHost() { const s = juego.slots.find((x) => x.humano); return s ? s.i : -1; }
function socketDeSlot(i) { const s = juego.slots[i]; return s.humano ? io.sockets.sockets.get(s.humano) : null; }
function slotDeSocket(id) { return juego.slots.findIndex((s) => s.humano === id); }

// Los bots eligen personajes que no use nadie (si se puede)
function repartirPersonajesBots() {
  const usados = new Set(juego.slots.filter((s) => s.humano || s.pid).map((s) => s.ch));
  for (const s of juego.slots) {
    if (s.humano || s.pid) continue;
    let ch = PERSONAJES.findIndex((p, k) => !usados.has(k));
    if (ch < 0) ch = (s.i * 3 + 1) % PERSONAJES.length;
    s.ch = ch; usados.add(ch);
    s.nombre = 'CPU'; s.listo = true;
  }
}

// ---------------------------------------------------------------------
//  Creación del partido
// ---------------------------------------------------------------------
function crearJugador(i) {
  const s = juego.slots[i];
  const pj = PERSONAJES[s.ch];
  return {
    slot: i, team: i % 2, ch: s.ch, pj,
    bot: !s.humano,
    x: 0, z: 0, y: 0, vx: 0, vz: 0, face: 0,
    estado: 'normal', estT: 0, anim: 0, animSeq: 0,
    cd: { grab: 0, robo: 0, truco: 0, barrida: 0, voadora: 0, pistola: 0, pase: 0 },
    inp: { mx: 0, mz: 0, hold: false, holdT: 0 },
    taps: [], tapResolver: 0,
    golpeados: null,
    trucoN: 0, humillado: 0, inv: 0, koT: 0, estirado: 0,
    balas: 0, racha: 0, goles: 0, trucos: 0, knocks: 0,
    ia: { t: rnd() * 0.3, mx: 0, mz: 0, pide: 0 },
  };
}

function nuevaPelota() {
  return { x: 0, y: BALL_R, z: 0, vx: 0, vy: 0, vz: 0, owner: -1, ultimo: -1, spin: 0, spinT: 0, fx: 0, noPick: 0, enRed: false };
}

function posicionesSaque(equipoConPelota) {
  for (const j of juego.jug) {
    if (j.estado === 'ko') continue;
    const lado = j.team === 0 ? -1 : 1;           // team 0 defiende la izquierda
    const adelante = j.slot < 2;                   // el primero de cada equipo va adelante
    let x = lado * (adelante ? 4 : 10);
    let z = adelante ? 0 : (j.team === 0 ? -3 : 3);
    if (j.team === equipoConPelota && adelante) x = lado * 1.2;
    j.x = x; j.z = z; j.vx = j.vz = 0; j.y = 0;
    j.face = j.team === 0 ? 0 : Math.PI;
    setEstado(j, 'normal', 0);
    j.inp.hold = false;
  }
  juego.pelota = nuevaPelota();
  juego.balas = [];
}

function iniciarCuenta() {
  repartirPersonajesBots();
  juego.jug = juego.slots.map((s, i) => crearJugador(i));
  juego.marcador = [0, 0];
  juego.tiempo = TIEMPO_PARTIDO;
  juego.oro = false;
  juego.matchPoint = false;
  juego.ultimoGoleador = -1;
  juego.podio = null;
  juego.ganador = -1;
  posicionesSaque(Math.random() < 0.5 ? 0 : 1);
  juego.fase = 'countdown';
  juego.faseT = 4.6;
  juego.sub = '';
  evento('preparados');
}

function volverAlMenu() {
  juego.fase = 'select';
  juego.sub = '';
  juego.jug = [];
  juego.balas = [];
  juego.pelota = null;
  for (const s of juego.slots) {
    if (!s.humano) { s.pid = null; }
    s.listo = false;
  }
  // los que miraban entran a los lugares libres
  for (const id of Array.from(juego.mirando)) {
    const sock = io.sockets.sockets.get(id);
    if (!sock) { juego.mirando.delete(id); continue; }
    const libre = juego.slots.find((s) => !s.humano && !s.pid);
    if (!libre) break;
    ocuparSlot(libre, sock);
    juego.mirando.delete(id);
  }
  repartirPersonajesBots();
  evento('menu');
}

function terminar() {
  const g = juego.marcador[0] > juego.marcador[1] ? 0 : 1;
  juego.ganador = g;
  const orden = juego.jug.slice().sort((a, b) =>
    (b.team === g) - (a.team === g) || b.goles - a.goles || b.trucos - a.trucos || a.slot - b.slot);
  juego.podio = orden.map((j) => j.slot);
  juego.fase = 'finished';
  juego.faseT = TIEMPO_PODIO;
  juego.sub = '';
  evento('fin', { t: g });
}

// ---------------------------------------------------------------------
//  Estados y acciones de los jugadores
// ---------------------------------------------------------------------
function setEstado(j, e, t) {
  j.estado = e; j.estT = t;
  j.anim = ANIM[e] !== undefined ? ANIM[e] : 0;
  j.animSeq = (j.animSeq + 1) % 1000;
}

function activo(j) { return j.estado !== 'ko' && j.estado !== 'stun' && j.estado !== 'fall'; }
function libreParaActuar(j) {
  return juego.fase === 'playing' && juego.sub === '' && (j.estado === 'normal' || j.estado === 'kick' || j.estado === 'baile');
}
function tienePelota(j) { return juego.pelota && juego.pelota.owner === j.slot; }
function companero(j) { return juego.jug[(j.slot + 2) % 4]; }
function rivales(j) { return juego.jug.filter((o) => o.team !== j.team); }
function dirFace(j) { return { x: Math.cos(j.face), z: Math.sin(j.face) }; }
function dirInputOFace(j) {
  const m = hypot(j.inp.mx, j.inp.mz);
  if (m > 0.25) return { x: j.inp.mx / m, z: j.inp.mz / m };
  return dirFace(j);
}

function soltarPelota(j, vx, vy, vz) {
  const b = juego.pelota;
  if (!b || b.owner !== j.slot) return;
  b.owner = -1;
  b.vx = vx; b.vy = vy; b.vz = vz;
  b.spin = 0; b.spinT = 0;
  j.cd.grab = 0.6;
}

// Patear al arco. power 0..1, curve -1..1, lift 0..1
function patear(j, power, curve, lift, esVolea) {
  const b = juego.pelota;
  const pj = j.pj;
  const lado = j.team === 0 ? 1 : -1;
  const gx = lado * (HX + 0.6);
  let aim = j.inp.mz * 1.7;
  let error = (1.3 - pj.fin) * (0.6 + power) * 1.9;
  if (j.bot) error *= 1.5;           // la máquina define peor
  aim += (rnd() - 0.5) * 2 * error;
  aim = clamp(aim, -GOAL_HW - 1.2, GOAL_HW + 1.2);
  const dx = gx - b.x, dz = aim - b.z;
  const d = Math.max(2, hypot(dx, dz));
  const superChute = power >= 0.85;
  let speed = (15 + 21 * power) * pj.tiro * (superChute ? 1.12 : 1);
  const T = d / speed;
  const theta = clamp(curve, -1, 1) * 0.55;
  const ang = Math.atan2(dz, dx) - theta;
  let targetH = 0.35 + lift * 1.2 + rnd() * (1.15 - pj.fin) * power * 1.8;
  targetH = clamp(targetH, 0.25, 3.2);
  let vy = (targetH - BALL_R + 0.5 * GRAV * T * T) / T;
  vy = clamp(vy, 1, 11);
  b.owner = -1;
  if (esVolea) { b.y = Math.max(b.y, 0.6); }
  else { b.x = j.x + Math.cos(j.face) * 0.5; b.z = j.z + Math.sin(j.face) * 0.5; b.y = BALL_R; }
  b.vx = Math.cos(ang) * speed; b.vz = Math.sin(ang) * speed; b.vy = vy;
  b.spin = Math.abs(theta) > 0.01 ? (2 * theta) / T : 0;
  b.spinT = T * 1.15;
  b.fx = superChute ? 2 : (Math.abs(curve) > 0.15 ? 1 : 0);
  b.ultimo = j.slot;
  j.face = Math.atan2(dz, dx);
  j.cd.grab = 0.4;
  if (j.estado !== 'head') setEstado(j, 'kick', 0.3);
  evento('patada', { s: j.slot, p: Math.round(power * 100), c: Math.round(curve * 100), x: r100(b.x), z: r100(b.z), sup: superChute ? 1 : 0, vol: esVolea ? 1 : 0 });
}

function accionTap(j) {
  if (!libreParaActuar(j)) return;
  if (tienePelota(j)) { j.taps = []; j.tapResolver = 0; patear(j, 0.38, 0, 0.1); return; }
  const now = juego.reloj;
  j.taps = j.taps.filter((t) => now - t < 0.5);
  j.taps.push(now);
  if (j.taps.length >= 3) { j.taps = []; j.tapResolver = 0; accionVoadora(j); }
  else if (j.taps.length === 2) { j.tapResolver = now + 0.24; }
}

function accionSoltar(j, d) {
  j.inp.hold = false;
  if (!d) return;
  if (d.kind === 'tap') return accionTap(j);
  if (!libreParaActuar(j) || !tienePelota(j)) return;
  if (d.kind === 'hold') {
    const dur = clamp(Number(d.dur) || 0, 0, 3);
    const power = clamp(0.45 + ((dur - 0.25) / 1.0) * 0.55, 0.45, 1);
    patear(j, power, 0, 0.15);
  } else if (d.kind === 'swipe') {
    const power = clamp(Number(d.power) || 0.5, 0.35, 1);
    const curve = clamp(Number(d.curve) || 0, -1, 1);
    const lift = clamp(Number(d.lift) || 0, 0, 1);
    patear(j, power, curve, lift);
  }
}

function accionPase(j) {
  if (!libreParaActuar(j)) return;
  const tm = companero(j);
  if (!tienePelota(j)) {
    if (j.cd.pase > 0) return;
    j.cd.pase = 1;
    evento('pide', { s: j.slot });
    if (tm) tm.ia.pide = 1.5;
    return;
  }
  const b = juego.pelota;
  let tx, tz;
  const lado = j.team === 0 ? 1 : -1;
  if (tm && activo(tm)) { tx = tm.x + tm.vx * 0.4; tz = tm.z + tm.vz * 0.4; }
  else { tx = j.x + lado * 9; tz = j.z * 0.5; }
  tx = clamp(tx, -HX + 1, HX - 1); tz = clamp(tz, -HZ + 1, HZ - 1);
  const dx = tx - b.x, dz = tz - b.z;
  const d = Math.max(1, hypot(dx, dz));
  const sp = clamp(7 + d * 0.75, 9, 17);
  j.face = Math.atan2(dz, dx);
  soltarPelota(j, (dx / d) * sp, 1.5 + d * 0.06, (dz / d) * sp);
  j.cd.grab = 0.35;
  b.ultimo = j.slot; b.fx = 0;
  setEstado(j, 'kick', 0.25);
  evento('pase', { s: j.slot });
}

function accionTruco(j) {
  if (!libreParaActuar(j)) return;
  if (!tienePelota(j)) {
    if (j.cd.truco > 0) return;
    j.cd.truco = 1.2;
    setEstado(j, 'baile', 0.9);
    evento('baile', { s: j.slot });
    return;
  }
  if (j.cd.truco > 0) return;
  j.trucoN = (j.trucoN % 4) + 1;
  const t = TRUCOS[j.trucoN];
  setEstado(j, 'trick', t.dur + (j.pj.id === 'malandro' ? 0.1 : 0));
  j.cd.truco = j.pj.trucoCd + t.dur;
  j.trucos++;
  const f = dirFace(j);
  const d = dirInputOFace(j);
  if (j.trucoN === 1) {            // elástico: salida lateral
    let lado = f.x * d.z - f.z * d.x;
    lado = Math.abs(lado) < 0.1 ? (rnd() < 0.5 ? -1 : 1) : Math.sign(lado);
    j.vx = f.x * 4 + -f.z * lado * 7.5; j.vz = f.z * 4 + f.x * lado * 7.5;
  } else if (j.trucoN === 2) {     // pisada: frena y sale
    j.vx = 0; j.vz = 0; j.trucoDir = d;
  } else if (j.trucoN === 3) {     // roleta: giro
    j.vx = d.x * 6; j.vz = d.z * 6; j.face = Math.atan2(d.z, d.x);
  } else {                         // lambreta: la pelota por arriba de la cabeza
    j.face = Math.atan2(d.z, d.x);
    const b = juego.pelota;
    soltarPelota(j, d.x * 7.2, 8.2, d.z * 7.2);
    b.y = 0.5; b.x = j.x - d.x * 0.2; b.z = j.z - d.z * 0.2;
    b.ultimo = j.slot; b.fx = 0;
    j.cd.grab = 0.45;
    j.vx = d.x * 7; j.vz = d.z * 7;
  }
  // los rivales cerca quedan "humillados": ¡OLÉ!
  const radio = j.pj.id === 'malandro' ? 3.0 : 2.4;
  for (const o of rivales(j)) {
    if (activo(o) && hypot(o.x - j.x, o.z - j.z) < radio) {
      o.humillado = 1.0;
      evento('ole', { s: o.slot, by: j.slot });
    }
  }
  evento('truco', { s: j.slot, t: j.trucoN });
}

function accionBarrida(j) {
  if (!libreParaActuar(j) || tienePelota(j) || j.cd.barrida > 0) return;
  const d = dirInputOFace(j);
  j.face = Math.atan2(d.z, d.x);
  j.vx = d.x * 13; j.vz = d.z * 13;
  j.cd.barrida = 1.3;
  j.golpeados = new Set();
  setEstado(j, 'slide', 0.55);
  evento('barrida', { s: j.slot });
}

function accionVoadora(j) {
  if (!libreParaActuar(j) || tienePelota(j) || j.cd.voadora > 0) return;
  const d = dirInputOFace(j);
  j.face = Math.atan2(d.z, d.x);
  j.vx = d.x * 8; j.vz = d.z * 8;
  j.cd.voadora = 1.8;
  j.golpeados = new Set();
  setEstado(j, 'head', 0.65);
  evento('voadora', { s: j.slot });
}

function accionPistola(j) {
  if (juego.fase !== 'playing' || juego.sub !== '' || !activo(j) || j.balas <= 0 || j.cd.pistola > 0) return;
  let mejor = null, md = 1e9;
  for (const o of rivales(j)) {
    if (o.estado === 'ko' || o.inv > 0) continue;
    const d = hypot(o.x - j.x, o.z - j.z);
    if (d < md) { md = d; mejor = o; }
  }
  let dx, dz;
  if (mejor) { dx = mejor.x + mejor.vx * 0.05 - j.x; dz = mejor.z + mejor.vz * 0.05 - j.z; }
  else { const f = dirFace(j); dx = f.x; dz = f.z; }
  const d = Math.max(0.01, hypot(dx, dz));
  dx /= d; dz /= d;
  if (j.bot) {   // los bots no tienen puntería perfecta
    const a = Math.atan2(dz, dx) + (rnd() - 0.5) * 0.3;
    dx = Math.cos(a); dz = Math.sin(a);
  }
  j.face = Math.atan2(dz, dx);
  j.balas--;
  j.cd.pistola = 1.0;
  juego.balas.push({ x: j.x + dx * 0.6, z: j.z + dz * 0.6, vx: dx * 30, vz: dz * 30, t: 1.0, owner: j.slot });
  if (j.estado === 'normal' || j.estado === 'kick') setEstado(j, 'gun', 0.35);
  evento('disparo', { s: j.slot, x: r100(j.x), z: r100(j.z), a: Math.round(j.face * 100) });
}

// ---------------------------------------------------------------------
//  Inteligencia de los bots (no juegan perfecto a propósito)
// ---------------------------------------------------------------------
function factorBot(j) {
  const dif = juego.marcador[j.team] - juego.marcador[1 - j.team];
  return clamp(0.8 - dif * 0.05, 0.68, 0.9);   // más lentos que un humano, con "goma"
}

function pensarBot(j) {
  const ia = j.ia;
  ia.t -= DT;
  if (ia.pide > 0) ia.pide -= DT;
  if (ia.t > 0) { j.inp.mx = ia.mx; j.inp.mz = ia.mz; return; }
  ia.t = 0.26 + rnd() * 0.2;       // reaccionan más lento que antes
  if (!activo(j) || juego.sub !== '') { ia.mx = ia.mz = 0; j.inp.mx = j.inp.mz = 0; return; }

  const b = juego.pelota;
  const lado = j.team === 0 ? 1 : -1;
  const gx = lado * HX;
  const propio = -lado * HX;
  const tm = companero(j);
  const tmOk = tm && activo(tm);
  let tx = j.x, tz = j.z;

  // disparar con la pistola si tiene
  if (j.balas > 0 && j.cd.pistola <= 0 && rnd() < 0.08) {
    const cerca = rivales(j).some((o) => o.estado !== 'ko' && o.inv <= 0 && hypot(o.x - j.x, o.z - j.z) < 12);
    if (cerca) accionPistola(j);
  }

  const rivalCerca = (x, z) => {
    let md = 1e9, mo = null;
    for (const o of rivales(j)) { if (!activo(o)) continue; const d = hypot(o.x - x, o.z - z); if (d < md) { md = d; mo = o; } }
    return { d: md, o: mo };
  };

  if (b.owner === j.slot) {
    const dGoal = hypot(gx - j.x, j.z);
    const rc = rivalCerca(j.x, j.z);
    // ¿hay un rival tapando la línea al arco?
    let tapado = false;
    for (const o of rivales(j)) {
      if (!activo(o)) continue;
      const ux = gx - j.x, uz = -j.z, lu = hypot(ux, uz) || 1;
      const t = ((o.x - j.x) * ux + (o.z - j.z) * uz) / lu;
      if (t > 0 && t < lu && Math.abs(((o.x - j.x) * uz - (o.z - j.z) * ux) / lu) < 1.1) tapado = true;
    }
    const ganas = (dGoal < 7 ? 0.6 : 0.2) * (tapado ? 0.35 : 1);
    if (dGoal < 13 && rnd() < ganas) {
      j.inp.mz = (rnd() - 0.5) * 2;
      const r = rnd() + (tapado ? 0.3 : 0);
      if (r < 0.55) patear(j, 0.35 + rnd() * 0.3, 0, 0.1);
      else if (r < 0.82) patear(j, 0.5 + rnd() * 0.3, (rnd() < 0.5 ? -1 : 1) * (0.3 + rnd() * 0.5), 0.2);
      else patear(j, 0.8 + rnd() * 0.2, 0, 0.2);
      ia.mx = ia.mz = 0; return;
    }
    if (rc.d < 2.2 && j.cd.truco <= 0 && rnd() < 0.3) { accionTruco(j); }
    else if (tmOk && (ia.pide > 0 || (rc.d < 2.4 && rnd() < 0.3))) {
      const rct = rivalCerca(tm.x, tm.z);
      if (ia.pide > 0 || rct.d > rc.d + 1) { accionPase(j); ia.pide = 0; ia.mx = ia.mz = 0; return; }
    }
    tx = gx - lado * 3;
    tz = j.z * 0.6;
    if (rc.o && rc.d < 4) tz += (j.z >= rc.o.z ? 1 : -1) * 3;
  } else if (b.owner >= 0 && juego.jug[b.owner].team === j.team) {
    // apoyo: me adelanto al lado contrario
    tx = clamp(b.x + lado * 6, -HX + 3, HX - 3);
    tz = b.z > 0 ? -4 : 4;
  } else {
    // defensa o pelota libre: el más cercano va a buscar
    const px = b.x + b.vx * 0.25, pz = b.z + b.vz * 0.25;
    const miD = hypot(px - j.x, pz - j.z);
    const tmD = tmOk ? hypot(px - tm.x, pz - tm.z) : 1e9;
    const voy = miD <= tmD + 0.5 || !tmOk;
    if (voy) {
      tx = px - (b.owner >= 0 ? lado * 0.5 : 0); tz = pz;
      if (b.owner >= 0) {
        if (miD < 2.4 && rnd() < 0.09) accionBarrida(j);
        else if (miD < 1.6 && rnd() < 0.03) accionVoadora(j);
      }
    } else if (b.owner >= 0 || lado * b.x < 4) {
      // el que no presiona cuida el arco (de arquero)
      tx = propio + lado * 1.4;
      tz = clamp(b.z * 0.45, -GOAL_HW + 0.5, GOAL_HW - 0.5);
    } else {
      tx = (b.x + propio) / 2; tz = b.z * 0.4;
    }
  }
  const dx = tx - j.x, dz = tz - j.z;
  const d = hypot(dx, dz);
  if (d < 0.35) { ia.mx = ia.mz = 0; }
  else { const k = Math.min(1, d / 1.5); ia.mx = (dx / d) * k; ia.mz = (dz / d) * k; }
  j.inp.mx = ia.mx; j.inp.mz = ia.mz;
}

// ---------------------------------------------------------------------
//  Física de jugadores
// ---------------------------------------------------------------------
function actualizarJugador(j) {
  for (const k in j.cd) if (j.cd[k] > 0) j.cd[k] -= DT;
  if (j.humillado > 0) j.humillado -= DT;
  if (j.inv > 0) j.inv -= DT;
  if (j.inp.hold) j.inp.holdT += DT;
  // analógico estirado al máximo y sostenido = corre más rápido
  if (!j.bot && hypot(j.inp.mx, j.inp.mz) > 0.9) j.estirado += DT; else j.estirado = 0;
  const nivel = NIVELES[juego.nivel];

  // resolver el doble toque (barrida) si no llegó el tercero
  if (j.tapResolver && juego.reloj >= j.tapResolver) {
    j.tapResolver = 0; j.taps = [];
    accionBarrida(j);
  }

  switch (j.estado) {
    case 'ko':
      j.koT -= DT; j.vx *= 0.8; j.vz *= 0.8;
      if (j.koT <= 0) {
        const lado = j.team === 0 ? -1 : 1;
        j.x = lado * (HX - 2); j.z = 0; j.vx = j.vz = 0;
        j.face = j.team === 0 ? 0 : Math.PI;
        j.inv = 2;
        setEstado(j, 'normal', 0);
        evento('respawn', { s: j.slot });
      }
      break;
    case 'stun': case 'fall':
      j.estT -= DT; j.vx *= 0.85; j.vz *= 0.85;
      if (j.estT <= 0) setEstado(j, 'normal', 0);
      break;
    case 'slide': {
      j.estT -= DT; j.vx *= 0.9; j.vz *= 0.9;
      golpesBarrida(j);
      if (j.estT <= 0) setEstado(j, 'normal', 0);
      break;
    }
    case 'head': {
      j.estT -= DT;
      const prog = 1 - j.estT / 0.65;
      j.y = Math.sin(Math.PI * clamp(prog, 0, 1)) * 1.1;
      j.vx *= 0.97; j.vz *= 0.97;
      if (prog > 0.15 && prog < 0.85) golpesVoadora(j);
      if (j.estT <= 0) { j.y = 0; setEstado(j, 'normal', 0); }
      break;
    }
    case 'trick': {
      j.estT -= DT;
      if (j.trucoN === 2) {
        const dur = TRUCOS[2].dur;
        if (j.estT < dur - 0.2 && j.trucoDir) { j.vx = j.trucoDir.x * 9.5; j.vz = j.trucoDir.z * 9.5; j.face = Math.atan2(j.vz, j.vx); j.trucoDir = null; }
      } else if (j.trucoN === 3) {
        j.face += DT * 11;
      } else {
        j.vx *= 0.95; j.vz *= 0.95;
      }
      if (j.estT <= 0) {
        if (j.trucoN === 3) j.face = Math.atan2(j.vz, j.vx);
        setEstado(j, 'normal', 0);
      }
      break;
    }
    default: {
      if (j.estado !== 'normal') { j.estT -= DT; if (j.estT <= 0) setEstado(j, 'normal', 0); }
      const congelado = juego.fase !== 'playing' || juego.sub !== '';
      let mx = congelado ? 0 : j.inp.mx, mz = congelado ? 0 : j.inp.mz;
      const m = hypot(mx, mz);
      if (m > 1) { mx /= m; mz /= m; }
      let vmax = j.pj.vel * nivel.vel;
      const conPelota = tienePelota(j);
      if (conPelota) vmax *= j.inp.hold ? 0.7 : 0.9;
      else if (j.inp.hold) vmax *= 1.18;            // sin pelota, mantener el pad = sprint
      if (j.estirado > 0.35) vmax *= conPelota ? 1.12 : 1.25;
      if (j.humillado > 0) vmax *= 0.55;
      if (j.estado === 'baile') vmax *= 0.3;
      if (j.bot) vmax *= factorBot(j);
      const k = Math.min(1, DT * 9);
      j.vx += (mx * vmax - j.vx) * k;
      j.vz += (mz * vmax - j.vz) * k;
      if (m > 0.15) {
        const objetivo = Math.atan2(mz, mx);
        j.face += normAng(objetivo - j.face) * Math.min(1, DT * 14);
      }
    }
  }
  j.x += j.vx * DT; j.z += j.vz * DT;
  j.x = clamp(j.x, -HX + 0.4, HX - 0.4);
  j.z = clamp(j.z, -HZ + 0.4, HZ - 0.4);
  if (j.estado !== 'head') j.y = 0;
}

function golpesBarrida(j) {
  const b = juego.pelota;
  const f = dirFace(j);
  if (b.y < 0.8 && hypot(b.x - j.x, b.z - j.z) < 1.1) {
    if (b.owner >= 0 && juego.jug[b.owner].team !== j.team) {
      const v = juego.jug[b.owner];
      soltarPelota(v, f.x * 8 + v.vx * 0.2, 2, f.z * 8 + v.vz * 0.2);
      setEstado(v, 'fall', 1.0);
      b.ultimo = j.slot; b.fx = 0;
      j.cd.grab = 0.15;
      j.golpeados.add(v.slot);
      evento('entrada', { s: v.slot, by: j.slot, x: r100(v.x), z: r100(v.z) });
    } else if (b.owner < 0 && !j.golpeados.has('pelota')) {
      b.vx = f.x * 9; b.vz = f.z * 9; b.vy = 1.5; b.ultimo = j.slot; b.fx = 0; b.spinT = 0;
      j.golpeados.add('pelota');
    }
  }
  for (const o of rivales(j)) {
    if (j.golpeados.has(o.slot) || !activo(o) || o.inv > 0 || o.estado === 'head') continue;
    if (hypot(o.x - j.x, o.z - j.z) < 0.95) {
      j.golpeados.add(o.slot);
      if (tienePelota(o)) soltarPelota(o, f.x * 6, 1.5, f.z * 6);
      setEstado(o, 'fall', 0.8);
      evento('entrada', { s: o.slot, by: j.slot, x: r100(o.x), z: r100(o.z) });
    }
  }
}

function golpesVoadora(j) {
  const f = dirFace(j);
  const b = juego.pelota;
  for (const o of rivales(j)) {
    if (j.golpeados.has(o.slot) || !activo(o) || o.inv > 0) continue;
    const dx = o.x - j.x, dz = o.z - j.z;
    const d = hypot(dx, dz);
    if (d < 1.5 && (dx * f.x + dz * f.z) / Math.max(d, 0.01) > 0.2) {
      j.golpeados.add(o.slot);
      if (tienePelota(o)) { soltarPelota(o, f.x * 4, 6, f.z * 4); b.ultimo = j.slot; }
      setEstado(o, 'stun', 2.5);
      o.vx = f.x * 5; o.vz = f.z * 5;
      j.knocks++;
      evento('tuneado', { s: o.slot, by: j.slot, x: r100(o.x), z: r100(o.z) });
    }
  }
  // volea: si la pelota está en el aire cerca, ¡al arco!
  if (b.owner < 0 && !j.golpeados.has('pelota') && b.y > 0.45 && b.y < 2.6 && hypot(b.x - j.x, b.z - j.z) < 1.4) {
    j.golpeados.add('pelota');
    patear(j, 0.85, 0, 0.25, true);
  }
}

function separarJugadores() {
  const js = juego.jug;
  for (let a = 0; a < js.length; a++) {
    for (let c = a + 1; c < js.length; c++) {
      const p = js[a], q = js[c];
      if (p.estado === 'ko' || q.estado === 'ko') continue;
      const dx = q.x - p.x, dz = q.z - p.z;
      const d = hypot(dx, dz);
      if (d < 0.8 && d > 0.0001) {
        const e = (0.8 - d) / 2;
        p.x -= (dx / d) * e; p.z -= (dz / d) * e;
        q.x += (dx / d) * e; q.z += (dz / d) * e;
      }
    }
  }
}

// ---------------------------------------------------------------------
//  Física de la pelota
// ---------------------------------------------------------------------
function actualizarPelota() {
  const b = juego.pelota;
  const nivel = NIVELES[juego.nivel];
  if (b.noPick > 0) b.noPick -= DT;

  if (b.owner >= 0) {
    const o = juego.jug[b.owner];
    if (!o || !activo(o) || o.estado === 'slide' || o.estado === 'head') {
      if (o) soltarPelota(o, o.vx * 0.6, 1, o.vz * 0.6); else b.owner = -1;
    } else {
      const f = dirFace(o);
      const dist = o.estado === 'trick' && o.trucoN === 3 ? 0.45 : 0.62;
      b.x = o.x + f.x * dist; b.z = o.z + f.z * dist; b.y = BALL_R;
      b.vx = o.vx; b.vz = o.vz; b.vy = 0; b.fx = 0;
      b.ultimo = o.slot;
      robos(o);
      return;
    }
  }

  // efecto (curva)
  if (b.spinT > 0) {
    b.spinT -= DT;
    const a = b.spin * DT;
    const c = Math.cos(a), s = Math.sin(a);
    const vx = b.vx * c - b.vz * s;
    b.vz = b.vx * s + b.vz * c; b.vx = vx;
  }
  b.vy -= GRAV * DT;
  b.x += b.vx * DT; b.y += b.vy * DT; b.z += b.vz * DT;

  // suelo
  if (b.y < BALL_R) {
    b.y = BALL_R;
    if (b.vy < -2.5) {
      if (b.vy < -6) evento('pique', { x: r100(b.x), z: r100(b.z), f: Math.round(-b.vy) });
      b.vy = -b.vy * nivel.rebote;
    } else b.vy = 0;
  }
  const enSuelo = b.y <= BALL_R + 0.02;
  const fr = enSuelo ? nivel.fric : 0.12;
  const kf = Math.max(0, 1 - fr * DT);
  b.vx *= kf; b.vz *= kf;
  if (enSuelo && b.spinT <= 0 && hypot(b.vx, b.vz) < 3) b.fx = 0;

  // paredes laterales
  if (b.z > HZ - BALL_R) { b.z = HZ - BALL_R; b.vz = -Math.abs(b.vz) * 0.65; b.spinT = 0; paredEv(b); }
  if (b.z < -HZ + BALL_R) { b.z = -HZ + BALL_R; b.vz = Math.abs(b.vz) * 0.65; b.spinT = 0; paredEv(b); }

  // fondos y arcos
  for (const lado of [1, -1]) {
    const linea = HX - BALL_R;
    if (lado * b.x > linea) {
      const enBoca = Math.abs(b.z) < GOAL_HW - BALL_R * 0.5 && b.y < GOAL_H;
      if (b.enRed || enBoca) {
        // adentro del arco: red lateral, techo y fondo
        if (Math.abs(b.z) > GOAL_HW - BALL_R) { b.z = Math.sign(b.z) * (GOAL_HW - BALL_R); b.vz *= -0.3; }
        if (b.y > GOAL_H - BALL_R) { b.y = GOAL_H - BALL_R; b.vy = -Math.abs(b.vy) * 0.3; }
        if (lado * b.x > HX + GOAL_D - BALL_R) { b.x = lado * (HX + GOAL_D - BALL_R); b.vx *= -0.2; b.vz *= 0.5; }
        if (!b.enRed && lado * b.x > HX + 0.25) {
          b.enRed = true;
          if (juego.fase === 'playing' && juego.sub === '') gol(lado === 1 ? 0 : 1);
        }
      } else {
        const travesano = Math.abs(b.z) < GOAL_HW + 0.2 && b.y < GOAL_H + 0.35;
        b.x = lado * linea; b.vx = -lado * Math.abs(b.vx) * 0.65; b.spinT = 0;
        if (travesano && hypot(b.vx, b.vz) > 6) evento('poste', { x: r100(b.x), z: r100(b.z) });
        else paredEv(b);
      }
    }
  }
  if (b.enRed) { b.vx *= 0.9; b.vz *= 0.9; return; }

  // tomar la pelota
  if (b.y < 1.1 && b.noPick <= 0 && juego.fase === 'playing') {
    let mejor = null, md = 1e9;
    for (const j of juego.jug) {
      if (!(j.estado === 'normal' || j.estado === 'kick' || j.estado === 'baile' || (j.estado === 'trick' && j.trucoN === 4)) || j.cd.grab > 0) continue;
      const d = hypot(b.x - j.x, b.z - j.z);
      const alcance = enArea(j) && b.ultimo >= 0 && juego.jug[b.ultimo].team !== j.team ? 1.35 : 0.95;   // atajada
      if (d < alcance && d < md) { md = d; mejor = j; }
    }
    if (mejor) {
      const v = hypot(b.vx, b.vz);
      const rechazo = enArea(mejor) ? 0.45 : 0.55;
      if (v > 19 && mejor.slot !== b.ultimo && rnd() < rechazo) {
        // rebote en el cuerpo
        b.vx = -b.vx * 0.35 + (rnd() - 0.5) * 4; b.vz = -b.vz * 0.35 + (rnd() - 0.5) * 4; b.vy = 3;
        b.spinT = 0; b.noPick = 0.2;
        evento('rebote', { s: mejor.slot, x: r100(b.x), z: r100(b.z) });
      } else {
        const rival = b.ultimo >= 0 && juego.jug[b.ultimo].team !== mejor.team;
        b.owner = mejor.slot; b.spinT = 0; b.fx = 0; b.ultimo = mejor.slot;
        if (v > 14 && rival && enArea(mejor)) evento('atajada', { s: mejor.slot, x: r100(b.x), z: r100(b.z) });
        else if (v > 8) evento('control', { s: mejor.slot });
      }
    }
  }
}

// ¿está cerca de su propio arco?
function enArea(j) {
  const propio = j.team === 0 ? -HX : HX;
  return Math.abs(j.x - propio) < 4.5 && Math.abs(j.z) < GOAL_HW + 2.5;
}

let ultimoParedEv = 0;
function paredEv(b) {
  const v = hypot(b.vx, b.vz);
  if (v > 7 && juego.reloj - ultimoParedEv > 0.2) {
    ultimoParedEv = juego.reloj;
    evento('pared', { x: r100(b.x), z: r100(b.z), f: Math.round(v) });
  }
}

function robos(o) {
  if (o.estado === 'trick' || o.inv > 0 || juego.sub !== '') return;
  const b = juego.pelota;
  for (const r of rivales(o)) {
    if (r.estado !== 'normal' || r.cd.robo > 0 || r.humillado > 0) continue;
    if (hypot(r.x - b.x, r.z - b.z) < 1.0) {
      let chance = 0.09 * (1.35 - o.pj.drible * 0.5);
      if (r.bot) chance *= 0.4;
      if (rnd() < chance) {
        b.owner = r.slot; b.ultimo = r.slot;
        o.cd.grab = 0.7; r.cd.robo = 0.5;
        evento('robo', { s: o.slot, by: r.slot });
        return;
      }
      r.cd.robo = 0.12;
    }
  }
}

function actualizarBalas() {
  const vivas = [];
  for (const bl of juego.balas) {
    let pega = false;
    for (let k = 0; k < 4 && !pega; k++) {
      bl.x += bl.vx * DT / 4; bl.z += bl.vz * DT / 4;
      const tirador = juego.jug[bl.owner];
      for (const o of juego.jug) {
        if (o.team === tirador.team || o.estado === 'ko' || o.inv > 0) continue;
        if (hypot(o.x - bl.x, o.z - bl.z) < 0.8) {
          pega = true;
          if (tienePelota(o)) soltarPelota(o, bl.vx * 0.15, 3, bl.vz * 0.15);
          o.koT = TIEMPO_KO;
          o.y = 0;
          setEstado(o, 'ko', TIEMPO_KO);
          o.vx = bl.vx * 0.12; o.vz = bl.vz * 0.12;
          tirador.knocks++;
          evento('ko', { s: o.slot, by: bl.owner, x: r100(o.x), z: r100(o.z) });
          break;
        }
      }
    }
    bl.t -= DT;
    if (!pega && bl.t > 0 && Math.abs(bl.x) < HX + 3 && Math.abs(bl.z) < HZ + 3) vivas.push(bl);
  }
  juego.balas = vivas;
}

// ---------------------------------------------------------------------
//  Goles
// ---------------------------------------------------------------------
function gol(team) {
  const b = juego.pelota;
  juego.marcador[team]++;
  juego.sub = 'goal';
  juego.subT = 4.6;
  const autor = b.ultimo >= 0 ? juego.jug[b.ultimo] : null;
  let enContra = false, poder = false;
  if (autor && autor.team === team) {
    autor.goles++;
    if (juego.ultimoGoleador === autor.slot) autor.racha++;
    else { for (const j of juego.jug) j.racha = 0; autor.racha = 1; }
    juego.ultimoGoleador = autor.slot;
    if (autor.racha >= 2) {
      autor.racha = 0;
      autor.balas = BALAS_PISTOLA;
      poder = true;
    }
    setEstado(autor, 'gol', 4.4);
    autor.vx = autor.vz = 0;
    autor.face = Math.PI / 2;          // mira a la cámara para el baile
  } else {
    enContra = true;
    for (const j of juego.jug) j.racha = 0;
    juego.ultimoGoleador = -1;
  }
  evento('gol', { t: team, s: autor ? autor.slot : -1, own: enContra ? 1 : 0, sup: b.fx === 2 ? 1 : 0 });
  if (poder) evento('poder', { s: autor.slot });
  if (!juego.matchPoint && juego.marcador[team] === GOLES_PARA_GANAR - 1) {
    juego.matchPoint = true;
    evento('matchpoint', { t: team });
  }
}

// ---------------------------------------------------------------------
//  Bucle principal
// ---------------------------------------------------------------------
function tick() {
  juego.reloj += DT;
  if (juego.fase === 'countdown') {
    juego.faseT -= DT;
    for (const j of juego.jug) { j.inp.mx = j.inp.mz = 0; }
    if (juego.faseT <= 0) {
      juego.fase = 'playing';
      juego.sub = '';
      evento('go');
    }
  } else if (juego.fase === 'playing') {
    actualizarPartido();
  } else if (juego.fase === 'finished') {
    juego.faseT -= DT;
    if (juego.faseT <= 0) volverAlMenu();
  }
  // limpiar eventos viejos
  const lim = juego.reloj - 2;
  while (juego.ev.length && juego.ev[0].ts < lim) juego.ev.shift();
  emitir();
}

function actualizarPartido() {
  if (juego.sub === 'goal') {
    juego.subT -= DT;
    for (const j of juego.jug) { if (j.bot) { j.inp.mx = j.inp.mz = 0; } actualizarJugador(j); }
    actualizarPelota();
    actualizarBalas();
    if (juego.subT <= 0) {
      const m = juego.marcador;
      if (m[0] >= GOLES_PARA_GANAR || m[1] >= GOLES_PARA_GANAR || juego.oro) { terminar(); return; }
      const ultimo = juego.ev.slice().reverse().find((e) => e.k === 'gol');
      posicionesSaque(ultimo ? 1 - ultimo.t : 0);
      juego.sub = 'kickoff';
      juego.subT = 1.4;
    }
    return;
  }
  if (juego.sub === 'kickoff') {
    juego.subT -= DT;
    for (const j of juego.jug) { if (j.estado === 'ko') actualizarJugador(j); }
    if (juego.subT <= 0) { juego.sub = ''; evento('silbato'); }
    return;
  }
  if (!juego.oro) {
    juego.tiempo -= DT;
    if (juego.tiempo <= 30 && juego.tiempo + DT > 30) evento('ultimos');
    if (juego.tiempo <= 0) {
      juego.tiempo = 0;
      if (juego.marcador[0] !== juego.marcador[1]) { terminar(); return; }
      juego.oro = true;
      evento('oro');
    }
  }
  for (const j of juego.jug) if (j.bot) pensarBot(j);
  for (const j of juego.jug) actualizarJugador(j);
  separarJugadores();
  actualizarPelota();
  actualizarBalas();
}

// ---------------------------------------------------------------------
//  Emisión de estado
// ---------------------------------------------------------------------
function numeroCuenta() {
  if (juego.fase !== 'countdown') return 0;
  return juego.faseT > 3 ? 4 : Math.ceil(juego.faseT);   // 4 = "¡PREPARADOS!"
}

function estadoPublico() {
  const b = juego.pelota;
  const st = {
    v: VERSION,
    f: juego.fase,
    sub: juego.sub,
    t: Math.ceil(juego.tiempo),
    sc: juego.marcador,
    oro: juego.oro ? 1 : 0,
    mp: juego.matchPoint ? 1 : 0,
    cd: numeroCuenta(),
    ft: Math.ceil(juego.faseT),
    n: juego.nivel,
    ev: juego.ev.map((e) => { const o = Object.assign({}, e); delete o.ts; return o; }),
  };
  if (b) st.b = [r100(b.x), r100(b.y), r100(b.z), b.owner, b.fx];
  if (juego.jug.length) {
    st.p = juego.jug.map((j) => [
      j.slot, r100(j.x), r100(j.z), r100(j.y), Math.round(j.face * 100),
      j.anim, j.animSeq, j.ch, j.team,
      (j.inv > 0 ? 1 : 0) | (j.inp.hold && tienePelota(j) ? 2 : 0) | (j.humillado > 0 ? 4 : 0) | (j.bot ? 8 : 0) | (j.estirado > 0.35 ? 16 : 0),
      j.trucoN, Math.ceil(j.koT), j.balas, j.goles,
      j.inp.hold && tienePelota(j) ? Math.round(clamp((j.inp.holdT - 0.25) / 1.0, 0, 1) * 100) : 0,
      r100(j.vx), r100(j.vz),
    ]);
  }
  if (juego.balas.length) st.bl = juego.balas.map((x) => [r100(x.x), r100(x.z), Math.round(Math.atan2(x.vz, x.vx) * 100)]);
  st.sl = juego.slots.map((s) => [s.humano ? 1 : (s.pid ? 2 : 0), s.ch, s.listo ? 1 : 0, s.nombre]);
  if (juego.podio) { st.pod = juego.podio; st.g = juego.ganador; }
  st.mir = juego.mirando.size;
  return st;
}

function estadoPersonal(i) {
  const s = juego.slots[i];
  const j = juego.jug[i];
  const o = {
    f: juego.fase, sub: juego.sub, slot: i, team: i % 2, ch: s.ch, listo: s.listo ? 1 : 0,
    host: slotHost() === i ? 1 : 0, n: juego.nivel, sc: juego.marcador, t: Math.ceil(juego.tiempo),
    cd: numeroCuenta(), oro: juego.oro ? 1 : 0, mp: juego.matchPoint ? 1 : 0,
    sl: juego.slots.map((x) => [x.humano ? 1 : 0, x.ch, x.listo ? 1 : 0]),
    v: VERSION,
  };
  if (j && juego.fase !== 'select') {
    o.bal = tienePelota(j) ? 1 : 0;
    o.balas = j.balas; o.cdP = j.cd.pistola > 0 ? 1 : 0;
    o.est = j.estado; o.ko = Math.ceil(j.koT); o.estT = Math.ceil(j.estT); o.corre = j.estirado > 0.35 ? 1 : 0;
    o.goles = j.goles; o.racha = j.racha;
    o.cdT = j.cd.truco > 0 ? 1 : 0; o.cdB = j.cd.barrida > 0 ? 1 : 0; o.cdV = j.cd.voadora > 0 ? 1 : 0;
  }
  if (juego.fase === 'finished') { o.g = juego.ganador; o.pos = juego.podio.indexOf(i) + 1; }
  return o;
}

let ultimoNivelEmit = 0;
function emitir() {
  io.to('tv').emit('state', estadoPublico());
  for (const s of juego.slots) {
    const sock = s.humano ? io.sockets.sockets.get(s.humano) : null;
    if (sock) sock.emit('status', estadoPersonal(s.i));
  }
  for (const id of juego.mirando) {
    const sock = io.sockets.sockets.get(id);
    if (sock) sock.emit('status', { f: juego.fase, mirando: 1, sc: juego.marcador, t: Math.ceil(juego.tiempo), v: VERSION });
  }
  if (juego.reloj - ultimoNivelEmit >= 1) { ultimoNivelEmit = juego.reloj; emitirNivel(); }
}

function datosNivel() {
  return { n: juego.nivel, id: NIVELES[juego.nivel].id, nombre: NIVELES[juego.nivel].nombre, L, W, gw: GOAL_HW, gh: GOAL_H, gd: GOAL_D, meta: GOLES_PARA_GANAR, v: VERSION };
}
function emitirNivel() { io.to('tv').emit('nivel', datosNivel()); }

// ---------------------------------------------------------------------
//  Conexiones
// ---------------------------------------------------------------------
function ocuparSlot(s, sock) {
  s.humano = sock.id;
  s.pid = sock.data.pid || sock.id;
  s.nombre = 'J' + (s.i + 1);
  s.listo = false;
  const j = juego.jug[s.i];
  if (j && juego.fase !== 'select') {
    // entra a mitad de partido: se queda con el jugador que manejaba la máquina
    j.bot = false; j.inp.mx = j.inp.mz = 0; j.inp.hold = false;
    s.ch = j.ch;
  } else {
    // si el personaje lo tiene otro humano, busco uno libre
    const usados = new Set(juego.slots.filter((x) => x !== s && x.humano).map((x) => x.ch));
    if (usados.has(s.ch)) { const libre = PERSONAJES.findIndex((p, k) => !usados.has(k)); if (libre >= 0) s.ch = libre; }
  }
  sock.emit('bienvenida', { slot: s.i, v: VERSION, personajes: PERSONAJES.map((p) => ({ id: p.id, nombre: p.nombre })), niveles: NIVELES.map((n) => ({ id: n.id, nombre: n.nombre })) });
  if (juego.fase === 'select') repartirPersonajesBots();
}

function hola(sock, datos) {
  sock.data.pid = datos && typeof datos.pid === 'string' ? datos.pid.slice(0, 40) : sock.id;
  if (slotDeSocket(sock.id) >= 0) return;
  // ¿vuelve alguien que se había desconectado?
  const previo = juego.slots.find((s) => !s.humano && s.pid === sock.data.pid);
  if (previo) { ocuparSlot(previo, sock); juego.mirando.delete(sock.id); evento('entra', { s: previo.i }); return; }
  // entra en cualquier momento: si la partida está en juego, reemplaza a un bot
  const libre = juego.slots.find((s) => !s.humano && !s.pid) || juego.slots.find((s) => !s.humano);
  if (libre) { ocuparSlot(libre, sock); juego.mirando.delete(sock.id); evento('entra', { s: libre.i }); return; }
  juego.mirando.add(sock.id);
  sock.emit('bienvenida', { slot: -1, v: VERSION, personajes: PERSONAJES.map((p) => ({ id: p.id, nombre: p.nombre })), niveles: NIVELES.map((n) => ({ id: n.id, nombre: n.nombre })) });
}

function seleccion(i, d) {
  if (juego.fase !== 'select' || !d) return;
  const s = juego.slots[i];
  if (d.a === 'ch' && !s.listo) {
    const paso = d.d > 0 ? 1 : -1;
    s.ch = (s.ch + paso + PERSONAJES.length) % PERSONAJES.length;
    repartirPersonajesBots();
    evento('elige', { s: i, ch: s.ch });
  } else if (d.a === 'nivel' && slotHost() === i) {
    const paso = d.d > 0 ? 1 : -1;
    juego.nivel = (juego.nivel + paso + NIVELES.length) % NIVELES.length;
    evento('cancha', { n: juego.nivel });
    emitirNivel();
  } else if (d.a === 'equipo' && !s.listo) {
    // me paso a un lugar libre del otro equipo
    const destino = juego.slots.find((x) => x.i % 2 !== i % 2 && !x.humano && !x.pid);
    if (destino) {
      const ch = s.ch;
      const sock = io.sockets.sockets.get(s.humano);
      s.humano = null; s.pid = null; s.listo = false; s.nombre = 'CPU';
      if (sock) { destino.ch = ch; ocuparSlot(destino, sock); }
      evento('equipo', { s: destino.i });
    }
  } else if (d.a === 'listo') {
    s.listo = !s.listo;
    evento('listo', { s: i, l: s.listo ? 1 : 0 });
    revisarInicio();
  } else if (d.a === 'start' && slotHost() === i) {
    for (const x of juego.slots) if (x.humano) x.listo = true;
    revisarInicio();
  }
}
function revisarInicio() {
  const humanos = juego.slots.filter((s) => s.humano);
  if (humanos.length && humanos.every((s) => s.listo) && juego.fase === 'select') iniciarCuenta();
}

io.on('connection', (sock) => {
  const rol = sock.handshake.query && sock.handshake.query.rol;
  if (rol === 'tv') {
    sock.join('tv');
    sock.emit('nivel', datosNivel());
    return;
  }
  sock.on('hola', (d) => hola(sock, d));
  sock.on('input', (d) => {
    const i = slotDeSocket(sock.id); if (i < 0 || !d) return;
    const j = juego.jug[i]; if (!j) return;
    j.inp.mx = clamp(Number(d.x) || 0, -1, 1);
    j.inp.mz = clamp(Number(d.y) || 0, -1, 1);
  });
  sock.on('pad', (d) => {
    const i = slotDeSocket(sock.id); if (i < 0 || !d) return;
    const j = juego.jug[i]; if (!j) return;
    if (d.t === 'down') { j.inp.hold = true; j.inp.holdT = 0; }
    else if (d.t === 'up') accionSoltar(j, d);
  });
  sock.on('btn', (d) => {
    const i = slotDeSocket(sock.id); if (i < 0 || !d) return;
    const j = juego.jug[i];
    if (d.b === 'menu') {
      if (slotHost() === i && juego.fase !== 'select') volverAlMenu();
      return;
    }
    if (!j) return;
    if (d.b === 'pase') accionPase(j);
    else if (d.b === 'truco') accionTruco(j);
    else if (d.b === 'pistola') accionPistola(j);
  });
  sock.on('sel', (d) => {
    const i = slotDeSocket(sock.id); if (i < 0) return;
    seleccion(i, d);
  });
  sock.on('disconnect', () => {
    juego.mirando.delete(sock.id);
    const i = slotDeSocket(sock.id);
    if (i < 0) return;
    const s = juego.slots[i];
    s.humano = null;
    s.listo = false;
    s.nombre = 'CPU';
    if (juego.fase === 'select') s.pid = null;
    if (juego.jug[i]) { juego.jug[i].bot = true; juego.jug[i].inp.hold = false; }
    evento('sale', { s: i });
    if (!hayHumanos()) { if (juego.fase !== 'select') volverAlMenu(); }
    else if (juego.fase === 'select') { repartirPersonajesBots(); revisarInicio(); }
  });
});

// SIM_RAPIDO=N acelera el tiempo N veces (solo para las pruebas automáticas)
const RAPIDO = Math.max(1, Number(process.env.SIM_RAPIDO) || 1);
setInterval(() => { for (let k = 0; k < RAPIDO; k++) tick(); }, 1000 / TICK);
repartirPersonajesBots();

if (require.main === module) {
  server.listen(PORT, () => console.log('FABELA FOOTBALL v' + VERSION + ' escuchando en el puerto ' + PORT));
}

module.exports = { server, juego, PERSONAJES, NIVELES, GOLES_PARA_GANAR };
