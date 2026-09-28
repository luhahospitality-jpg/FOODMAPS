// Audio 100% sintetizado con Web Audio: música de FUNK BRASILERO (tamborzão, 808,
// "tuin", apito, vocal chops) con secuenciador lookahead, efectos pesados tipo
// juego de pelea (impactos con distorsión y reverb) y voces grabadas (voices.json).
let ctx = null, master, comp, busMusica, busSfx, busVoz, ruido, reverb, envioRev, saturador, saturadorSfx;
let temaActual = null, pasoActual = 0, proximo = 0, velMul = 1, compas = 0;
const voces = {};
let hablando = 0, analizador = null;
const VOL_MUSICA = 0.55;

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function curvaDist(k) {
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
  return c;
}

export function iniciarAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.18;
  master = ctx.createGain(); master.gain.value = 0.95;
  master.connect(comp); comp.connect(ctx.destination);
  analizador = ctx.createAnalyser(); analizador.fftSize = 2048; comp.connect(analizador);
  busMusica = ctx.createGain(); busMusica.gain.value = VOL_MUSICA; busMusica.connect(master);
  busSfx = ctx.createGain(); busSfx.gain.value = 1.0; busSfx.connect(master);
  busVoz = ctx.createGain(); busVoz.gain.value = 1.25; busVoz.connect(master);
  // un solo buffer de ruido reutilizado
  ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = ruido.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // reverb (respuesta al impulso generada: ruido que decae)
  const largo = Math.floor(ctx.sampleRate * 2.2);
  const ir = ctx.createBuffer(2, largo, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const x = ir.getChannelData(ch); for (let i = 0; i < largo; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 3); }
  reverb = ctx.createConvolver(); reverb.buffer = ir;
  envioRev = ctx.createGain(); envioRev.gain.value = 0.6;
  envioRev.connect(reverb); reverb.connect(master);
  // saturación para el 808 y los golpes
  saturador = ctx.createWaveShaper(); saturador.curve = curvaDist(6); saturador.oversample = '2x';
  const gs = ctx.createGain(); gs.gain.value = 0.55; saturador.connect(gs); gs.connect(busMusica);
  saturadorSfx = ctx.createWaveShaper(); saturadorSfx.curve = curvaDist(14);
  const gs2 = ctx.createGain(); gs2.gain.value = 0.5; saturadorSfx.connect(gs2); gs2.connect(busSfx);
  prepararCanciones();
  pedida = 'intro';
  setInterval(programar, 25);
  cargarVoces();
  return true;
}

// para las pruebas: nivel del master (rms y pico) y estado
export function medir() {
  if (!analizador) return null;
  const d = new Float32Array(analizador.fftSize); analizador.getFloatTimeDomainData(d);
  let s = 0, p = 0; for (const x of d) { s += x * x; p = Math.max(p, Math.abs(x)); }
  return { estado: ctx.state, rms: Math.sqrt(s / d.length), pico: p, tema: temaActual, voces: Object.keys(voces).length, cancion: { sonando: cancionSonando(), estado: estadoCancion, cual: actual ? actual.nombre : null, inicio: actual ? actual.usandoIni : null } };
}

export function contextoBloqueado() { return !!ctx && ctx.state !== 'running'; }
export function audioActivo() { return ctx && ctx.state === 'running' && cancionSonando(); }
export function desbloquear() { if (ctx && ctx.state !== 'running') ctx.resume(); revisar(); }

// ---------------------------------------------------------------------
//  Bloques de síntesis
// ---------------------------------------------------------------------
function env(g, t, a, dec, pico) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pico, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}
function conectar(nodo, destino, rev) {
  nodo.connect(destino || busSfx);
  if (rev) { const r = ctx.createGain(); r.gain.value = rev; nodo.connect(r); r.connect(envioRev); }
}
function osc(tipo, f0, f1, t, dur, vol, destino, a, rev) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.85);
  env(g, t, a || 0.003, dur, vol);
  o.connect(g); conectar(g, destino, rev);
  o.start(t); o.stop(t + dur + 0.05);
  return o;
}
function ruidoF(t, dur, vol, tipo, f, q, destino, f1, rev, a) {
  const s = ctx.createBufferSource(); s.buffer = ruido;
  const fl = ctx.createBiquadFilter(); fl.type = tipo; fl.frequency.setValueAtTime(f, t); fl.Q.value = q || 1;
  if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); env(g, t, a || 0.002, dur, vol);
  s.connect(fl); fl.connect(g); conectar(g, destino, rev);
  s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}

// ---------------------------------------------------------------------
//  Instrumentos de funk
// ---------------------------------------------------------------------
const I = {
  bumbo: (t, v) => { osc('sine', 170, 42, t, 0.42, 1.0 * v, saturador); ruidoF(t, 0.015, 0.4 * v, 'lowpass', 3500, 1, busMusica); },
  caixa: (t, v) => { ruidoF(t, 0.16, 0.55 * v, 'bandpass', 2100, 0.9, busMusica, 0, 0.12); osc('triangle', 200, 150, t, 0.08, 0.35 * v, busMusica); },
  palma: (t, v) => { for (let k = 0; k < 3; k++) ruidoF(t + k * 0.01, 0.04, 0.4 * v, 'bandpass', 1300, 1.4, busMusica); ruidoF(t + 0.03, 0.18, 0.25 * v, 'bandpass', 1200, 1, busMusica, 0, 0.2); },
  atabaque: (t, v, alto) => { osc('sine', alto ? 230 : 160, alto ? 130 : 90, t, 0.2, 0.55 * v, busMusica); ruidoF(t, 0.02, 0.15 * v, 'bandpass', 900, 2, busMusica); },
  chimbal: (t, v) => ruidoF(t, 0.03, 0.2 * v, 'highpass', 8000, 1, busMusica),
  aberto: (t, v) => ruidoF(t, 0.2, 0.14 * v, 'highpass', 7000, 1, busMusica),
  tuin: (t, v) => { const o = osc('sawtooth', 2200, 280, t, 0.32, 0.07 * v, busMusica, 0.005, 0.25); return o; },
  hey: (t, v, alto) => {                        // vocal chop sintetizado ("hey!")
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(alto ? 240 : 180, t); o.frequency.linearRampToValueAtTime(alto ? 200 : 150, t + 0.18);
    const g = ctx.createGain(); env(g, t, 0.01, 0.2, 0.35 * v);
    for (const f of [650, 1150, 2600]) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 7; o.connect(b); b.connect(g); }
    conectar(g, busMusica, 0.2); o.start(t); o.stop(t + 0.3);
  },
  apito: (t, v) => {                            // apito de baile
    const o = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
    o.frequency.value = 2650; l.frequency.value = 32; lg.gain.value = 220; l.connect(lg); lg.connect(o.frequency);
    env(g, t, 0.01, 0.28, 0.12 * v); o.connect(g); conectar(g, busMusica, 0.15); o.start(t); l.start(t); o.stop(t + 0.35); l.stop(t + 0.35);
  },
  agogo: (t, v, alto) => { const f = alto ? 1320 : 990; osc('sine', f, f, t, 0.2, 0.15 * v, busMusica); osc('sine', f * 2.4, f * 2.4, t, 0.08, 0.05 * v, busMusica); },
  cuica: (t, v, alto) => osc('sine', alto ? 620 : 470, alto ? 1100 : 820, t, 0.17, 0.16 * v, busMusica, 0.02),
  sub: (t, m, dur, v) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(mtof(m + 12), t); o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.05);
    env(g, t, 0.004, dur, 0.75 * (v || 1)); o.connect(g); g.connect(saturador); o.start(t); o.stop(t + dur + 0.05);
  },
  metal: (t, ms, dur, v) => {                    // stab de bronces
    for (const m of ms) for (const det of [-7, 0, 7]) {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(700, t + dur);
      env(g, t, 0.01, dur, 0.035 * (v || 1)); o.connect(f); f.connect(g); conectar(g, busMusica, 0.15); o.start(t); o.stop(t + dur + 0.05);
    }
  },
  lead: (t, m, dur, v, tipo) => {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
    o.type = tipo || 'square'; o.frequency.value = mtof(m);
    l.frequency.value = 6; lg.gain.value = 6; l.connect(lg); lg.connect(o.detune);
    f.type = 'lowpass'; f.frequency.value = 2400;
    env(g, t, 0.01, dur, 0.09 * (v || 1)); o.connect(f); f.connect(g); conectar(g, busMusica, 0.2);
    o.start(t); l.start(t); o.stop(t + dur + 0.05); l.stop(t + dur + 0.05);
  },
  campana: (t, m, dur, v) => {                  // campana siniestra (bruxaria)
    osc('sine', mtof(m), mtof(m), t, dur, 0.13 * (v || 1), busMusica, 0.005, 0.5);
    osc('sine', mtof(m) * 2.76, mtof(m) * 2.76, t, dur * 0.4, 0.05 * (v || 1), busMusica, 0.005, 0.5);
  },
  subida: (t, dur, v) => ruidoF(t, dur, 0.18 * (v || 1), 'bandpass', 300, 3, busMusica, 5000, 0.3, dur * 0.9),
};

// ---------------------------------------------------------------------
//  Temas (16 pasos por compás). 'x' fuerte, 'o' suave, '.' nada
//  Todos son funk: mandelão, tamborzão, funk melody, funk de praia, bruxaria.
// ---------------------------------------------------------------------
const A = 45, D = 50, E = 52, F = 41, G = 43, C = 48;
const TEMAS = {
  menu: { bpm: 130, perc: {                       // mandelão: seco y pesado
    bumbo: 'x..x..x.x..x..x.', palma: '....x.......x...', chimbal: 'x.x.x.x.x.x.x.x.', atabaque: '..o..o.....o..o.' },
    sub: [[A, 0, 0, A, 0, 0, A, 0, C, 0, 0, A, 0, 0, G, 0], [F, 0, 0, F, 0, 0, F, 0, G, 0, 0, F, 0, 0, E, 0]],
    extra: (t, i, b, p) => { if (i === 14 && b % 2 === 1) I.tuin(t, 1); if (i === 12 && b % 4 === 3) I.hey(t, 1); if (i === 4 && b % 8 === 0) I.hey(t, 1, true); } },
  laje: { bpm: 130, perc: {                       // tamborzão clásico
    bumbo: 'x..x..x...x..x..', caixa: '....x.......x...', atabaque: '..x..x..x..x..x.', chimbal: '..x...x...x...x.', palma: '............x...' },
    sub: [[A, 0, 0, A, 0, 0, C, 0, 0, 0, A, 0, 0, G, 0, 0], [D, 0, 0, D, 0, 0, F, 0, 0, 0, D, 0, 0, E, 0, 0]],
    metal: [[69, 72, 76], [74, 77, 81]], metalPat: 'x..x..x.........',
    extra: (t, i, b) => { if (i === 0 && b % 4 === 2) I.apito(t, 1); if (i === 8 && b % 4 === 3) I.tuin(t, 1); if (i === 12 && b % 2 === 1) I.hey(t, 0.8); } },
  praca: { bpm: 128, perc: {                      // funk melody
    bumbo: 'x..x..x...x..x..', palma: '....x.......x...', chimbal: 'x.xxx.xxx.xxx.xx', aberto: '......x.......x.' },
    sub: [[D, 0, 0, D, 0, 0, D, 0, 0, 0, F, 0, 0, F, 0, 0], [G, 0, 0, G, 0, 0, G, 0, 0, 0, A, 0, 0, A, 0, 0]],
    mel: [[74, 0, 77, 0, 81, 0, 79, 77, 0, 74, 0, 0, 72, 0, 74, 0], [79, 0, 77, 0, 76, 0, 74, 0, 72, 0, 0, 74, 0, 0, 0, 0]], melTipo: 'square', melVol: 0.9,
    extra: (t, i, b) => { if (i === 14 && b % 4 === 3) I.tuin(t, 1); if (i === 4 && b % 2 === 0) I.hey(t, 0.6, true); } },
  praia: { bpm: 130, perc: {                      // funk con percusión de samba
    bumbo: 'x..x..x...x..x..', caixa: '....x.......x...', agogo: 'x.x..x.x.x.x..x.', cuica: '..x.......x.....', chimbal: 'xoxoxoxoxoxoxoxo', atabaque: '.....x........x.' },
    sub: [[F, 0, 0, F, 0, 0, C, 0, 0, 0, F, 0, 0, G, 0, 0], [C, 0, 0, C, 0, 0, G, 0, 0, 0, C, 0, 0, E, 0, 0]],
    mel: [[77, 0, 81, 0, 84, 0, 81, 0, 79, 0, 77, 0, 0, 0, 0, 0], [76, 0, 79, 0, 84, 0, 79, 0, 77, 0, 76, 0, 0, 0, 0, 0]], melTipo: 'triangle', melVol: 1.3,
    extra: (t, i, b) => { if (i === 0 && b % 2 === 1) I.apito(t, 1); if (i === 8 && b % 4 === 1) I.apito(t, 0.8); } },
  noturno: { bpm: 128, perc: {                    // funk bruxaria: oscuro
    bumbo: 'x..x..x.x..x..x.', caixa: '....x.......x...', chimbal: '..x...x...x...x.', atabaque: 'o.....o.....o...' },
    sub: [[40, 0, 0, 40, 0, 0, 40, 0, 43, 0, 0, 40, 0, 0, 39, 0], [36, 0, 0, 36, 0, 0, 36, 0, 38, 0, 0, 36, 0, 0, 35, 0]],
    campana: [[76, 0, 0, 0, 0, 0, 75, 0, 0, 0, 72, 0, 0, 0, 0, 0], [71, 0, 0, 0, 0, 0, 70, 0, 0, 0, 67, 0, 0, 0, 0, 0]],
    extra: (t, i, b, p) => { if (i === 0 && b % 4 === 3) I.subida(t, p * 16, 1); if (i === 10 && b % 2 === 0) I.tuin(t, 0.8); } },
  podio: { bpm: 132, perc: {                      // festejo
    bumbo: 'x..x..x...x..x..', palma: '....x.......x...', atabaque: '..x..x..x..x..x.', chimbal: 'x.x.x.x.x.x.x.x.', agogo: 'x...x...x...x...' },
    sub: [[C, 0, 0, C, 0, 0, E, 0, 0, 0, G, 0, 0, E, 0, 0], [F, 0, 0, F, 0, 0, A, 0, 0, 0, C, 0, 0, G, 0, 0]],
    metal: [[72, 76, 79], [77, 81, 84]], metalPat: 'x..x..x...x..x..',
    extra: (t, i, b) => { if (i === 0) I.apito(t, 0.8); if (i === 12) I.hey(t, 1); if (i === 14 && b % 2) I.tuin(t, 1); } },
};

function programar() {
  if (!ctx || ctx.state !== 'running' || !temaActual) return;
  const tema = TEMAS[temaActual];
  const paso = 60 / (tema.bpm * velMul) / 4;
  if (proximo < ctx.currentTime - 0.2) proximo = ctx.currentTime + 0.05;
  while (proximo < ctx.currentTime + 0.15) {
    tocarPaso(tema, pasoActual, proximo, paso);
    proximo += paso;
    pasoActual = (pasoActual + 1) % 16;
    if (pasoActual === 0) compas++;
  }
}

function tocarPaso(tema, i, t, paso) {
  const b = compas;
  const intro = b < 2;                                  // los primeros compases entran de a poco
  for (const inst in tema.perc) {
    if (intro && inst !== 'bumbo' && inst !== 'chimbal') continue;
    const c = tema.perc[inst][i];
    if (c === 'x' || c === 'o') I[inst](t, c === 'x' ? 1 : 0.5, i % 4 === 2);
  }
  if (tema.sub) { const n = tema.sub[b % tema.sub.length][i]; if (n) I.sub(t, n, paso * 2.6); }
  if (intro) return;
  if (tema.metal && tema.metalPat[i] === 'x' && b % 2 === 0) I.metal(t, tema.metal[(b >> 1) % tema.metal.length], paso * 1.4, 1);
  if (tema.mel && b % 8 >= 4) { const n = tema.mel[b % tema.mel.length][i]; if (n) I.lead(t, n, paso * 1.8, tema.melVol, tema.melTipo); }
  if (tema.campana) { const n = tema.campana[b % tema.campana.length][i]; if (n) I.campana(t, n, paso * 8, 1); }
  if (tema.extra) tema.extra(t, i, b, paso);
}

// ---------------------------------------------------------------------
//  Canciones (por Web Audio: es lo que la TV deja sonar sin tocar nada)
//   - "Favela Futebol": intro y menú. Arranca con un pedazo corto (12 s) que
//     carga al instante, y cuando está la canción entera la continúa sin corte.
//   - "Rundo de Capoeira": durante el partido, en loop.
// ---------------------------------------------------------------------
const CANCIONES = {
  intro: { ini: '/assets/music/favela_futebol_ini.mp3', full: '/assets/music/favela_futebol_mono.mp3' },
  partido: { full: '/assets/music/capoeira_mono.mp3' },
};
const can = {};              // nombre → { ini, full, loopA, loopB }
let actual = null;           // { nombre, fuente, gain, inicio, usandoIni }
let pedida = null;           // canción que se quiere escuchar ahora
let estadoCancion = 'cargando';

function bajar(url, listo) {
  fetch(url).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
    .then((ab) => ctx.decodeAudioData(ab, listo, () => { estadoCancion = 'error decodificando ' + url; }))
    .catch((e) => { estadoCancion = 'error bajando ' + url + ' ' + e.message; });
}
// busca dónde empieza y termina el sonido de verdad (el MP3 trae relleno): loop sin clic
function bordes(buf) {
  const d = buf.getChannelData(0), u = 0.0008;
  let a = 0, b = d.length - 1;
  while (a < b && Math.abs(d[a]) < u) a++;
  while (b > a && Math.abs(d[b]) < u) b--;
  return [a / buf.sampleRate, (b + 1) / buf.sampleRate];
}

function prepararCanciones() {
  for (const n in CANCIONES) can[n] = { ini: null, full: null };
  // primero el pedacito de la intro (suena enseguida), después las enteras
  if (CANCIONES.intro.ini) bajar(CANCIONES.intro.ini, (b) => { can.intro.ini = b; revisar(); });
  bajar(CANCIONES.intro.full, (b) => {
    can.intro.full = b; [can.intro.a, can.intro.b] = bordes(b); revisar();
    bajar(CANCIONES.partido.full, (b2) => { can.partido.full = b2; [can.partido.a, can.partido.b] = bordes(b2); revisar(); });
  });
  setInterval(() => { if (ctx.state !== 'running') ctx.resume(); revisar(); }, 500);
}

function fuente(buf, loop, a, b, offset, gain) {
  const s = ctx.createBufferSource();
  s.buffer = buf;
  if (loop) { s.loop = true; s.loopStart = a || 0; s.loopEnd = b || buf.duration; }
  s.connect(gain);
  s.start(ctx.currentTime + 0.02, offset || 0);
  return s;
}

function apagar(x, seg) {
  if (!x) return;
  const t = ctx.currentTime;
  x.gain.gain.cancelScheduledValues(t);
  x.gain.gain.setValueAtTime(x.gain.gain.value, t);
  x.gain.gain.linearRampToValueAtTime(0, t + seg);
  try { x.fuente.stop(t + seg + 0.05); } catch (e) { /* ya parada */ }
}

// Arranca/cambia lo que tiene que sonar según 'pedida'
function revisar() {
  if (!ctx || !pedida) return;
  if (ctx.state !== 'running') ctx.resume();
  const c = can[pedida];
  if (!c) return;
  // ¿el pedacito inicial terminó o ya está la entera? pasar a la entera sin corte
  if (actual && actual.nombre === pedida && actual.usandoIni && c.full) {
    const pos = ctx.currentTime - actual.inicio;
    const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
    const f = fuente(c.full, true, c.a, c.b, Math.min(pos, c.full.duration - 1), g);
    g.gain.setValueAtTime(0, ctx.currentTime + 0.02);
    g.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.12);
    apagar(actual, 0.1);
    actual = { nombre: pedida, fuente: f, gain: g, inicio: actual.inicio, usandoIni: false };
    estadoCancion = pedida + ' sonando';
    return;
  }
  if (actual && actual.nombre === pedida) return;
  const buf = c.full || c.ini;
  if (!buf) { estadoCancion = pedida + ' cargando'; return; }
  const viejo = actual;
  const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
  const f = fuente(buf, !!c.full, c.a, c.b, 0, g);
  g.gain.setValueAtTime(0, ctx.currentTime + 0.02);
  g.gain.linearRampToValueAtTime(0.85, ctx.currentTime + (viejo ? 0.8 : 0.05));
  actual = { nombre: pedida, fuente: f, gain: g, inicio: ctx.currentTime + 0.02, usandoIni: !c.full };
  if (actual.usandoIni) f.onended = () => { if (actual && actual.fuente === f) { actual = null; revisar(); } };
  apagar(viejo, 0.8);
  estadoCancion = pedida + (actual.usandoIni ? ' sonando (inicio)' : ' sonando');
}

// 'intro' fuera del partido, 'partido' durante el partido (siempre desde el principio)
export function musica(nombre) {
  if (pedida === nombre) return;
  pedida = nombre;
  revisar();
}
export function cancion() { revisar(); return true; }
export function cancionSonando() { return !!actual && ctx.state === 'running'; }
export function estadoAudio() { return 'ctx ' + (ctx ? ctx.state : 'no') + ' · ' + estadoCancion; }

export function tema(nombre) {
  nombre = null;                           // solo suena "Favela Futebol"
  if (!ctx || temaActual === nombre) return;
  temaActual = nombre;
  pasoActual = 0; compas = 0; velMul = 1;
  proximo = ctx.currentTime + 0.08;
}
export function acelerar(on) { velMul = on ? 1.12 : 1; }

// ---------------------------------------------------------------------
//  Efectos de sonido: pesados, con cuerpo y reverb (estilo juego de pelea)
// ---------------------------------------------------------------------
const T = () => ctx.currentTime + 0.005;
function impacto(t, f) {       // golpe con cuerpo: grave saturado + chasquido + reverb
  osc('sine', 110 * (0.9 + 0.2 * Math.random()), 32, t, 0.45 * f, 1.0, saturadorSfx, 0.002, 0.25);
  ruidoF(t, 0.07, 0.9 * Math.min(1.2, f), 'lowpass', 2500, 0.8, busSfx, 400, 0.3);
  ruidoF(t, 0.02, 0.5, 'highpass', 3000, 1, busSfx);
}
function soplido(t, dur, vol, f0, f1) { ruidoF(t, dur, vol, 'bandpass', f0, 1.8, busSfx, f1, 0.15, dur * 0.6); }
function bocina(t, dur, vol) {   // bocina de baile funk
  for (const [m, det] of [[70, 0], [70, 12], [74, -8], [77, 5]]) {
    const o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = mtof(m - 12); o.detune.value = det;
    l.frequency.value = 7; lg.gain.value = 18; l.connect(lg); lg.connect(o.detune);
    f.type = 'lowpass'; f.frequency.value = 2600;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.setValueAtTime(vol, t + dur - 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); conectar(g, busSfx, 0.2); o.start(t); l.start(t); o.stop(t + dur + 0.05); l.stop(t + dur + 0.05);
  }
}
function tambor(t, vol) {        // tambor grande (cuenta regresiva)
  osc('sine', 95, 38, t, 0.7, vol, saturadorSfx, 0.002, 0.4);
  ruidoF(t, 0.12, 0.5 * vol, 'lowpass', 900, 1, busSfx, 200, 0.3);
}

export const sfx = {
  patada(p) {
    if (!ctx) return; const t = T();
    osc('sine', 150, 48, t, 0.16, 0.9, saturadorSfx);
    ruidoF(t, 0.05, 0.7, 'bandpass', 1600, 1, busSfx);
    if (p > 0.8) { impacto(t, 1.3); soplido(t + 0.02, 0.6, 0.6, 300, 3000); }
  },
  curva() { if (!ctx) return; soplido(T(), 0.5, 0.35, 600, 3200); },
  pase() { if (!ctx) return; const t = T(); osc('sine', 130, 60, t, 0.12, 0.6, saturadorSfx); ruidoF(t, 0.03, 0.3, 'bandpass', 1400, 1); },
  pique(f) { if (!ctx) return; osc('sine', 120, 60, T(), 0.09, Math.min(0.55, f * 0.05)); },
  pared() { if (!ctx) return; const t = T(); osc('sine', 85, 45, t, 0.2, 0.7, saturadorSfx); ruidoF(t, 0.1, 0.5, 'lowpass', 900, 1, busSfx, 0, 0.15); },
  poste() { if (!ctx) return; const t = T(); for (const f of [520, 780, 1240, 1960]) osc('sine', f, f * 0.98, t, 1.2, 0.12, busSfx, 0.002, 0.5); impacto(t, 0.6); },
  silbato(largo) {
    if (!ctx) return; const t = T();
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 2900; lfo.frequency.value = 28; lg.gain.value = 180;
    lfo.connect(lg); lg.connect(o.frequency);
    const d = largo ? 0.9 : 0.35;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.02); g.gain.setValueAtTime(0.22, t + d - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); conectar(g, busSfx, 0.2); o.start(t); lfo.start(t); o.stop(t + d + 0.05); lfo.stop(t + d + 0.05);
  },
  gol() {
    if (!ctx) return; const t = T();
    impacto(t, 1.6);
    ruidoF(t, 3.5, 0.55, 'bandpass', 700, 0.5, busSfx, 1300, 0.4, 0.4);   // hinchada
    ruidoF(t + 0.1, 3.0, 0.3, 'bandpass', 1600, 0.8, busSfx, 0, 0.3, 0.3);
    bocina(t + 0.15, 0.35, 0.09); bocina(t + 0.6, 0.25, 0.09); bocina(t + 0.95, 0.9, 0.1);
  },
  pistola() {
    if (!ctx) return; const t = T();
    ruidoF(t, 0.4, 1.2, 'lowpass', 5000, 0.7, saturadorSfx, 250, 0.7);
    osc('sine', 180, 30, t, 0.7, 1.0, saturadorSfx, 0.001, 0.5);
    ruidoF(t, 0.015, 0.9, 'highpass', 2500, 1);
  },
  ko() {
    if (!ctx) return; const t = T();
    impacto(t, 2);
    osc('sine', 55, 50, t + 0.05, 2.2, 0.5, busSfx, 0.01, 0.6);
    osc('sine', 82, 78, t + 0.05, 1.6, 0.25, busSfx, 0.01, 0.6);
  },
  tuneado() {
    if (!ctx) return; const t = T();
    impacto(t, 1.2);
    for (let k = 0; k < 3; k++) ruidoF(t + 0.03 + k * 0.02, 0.012, 0.5, 'highpass', 4000, 2);   // crack de hueso
  },
  barrida() { if (!ctx) return; const t = T(); ruidoF(t, 0.45, 0.5, 'bandpass', 900, 0.8, busSfx, 250); },
  entrada() { if (!ctx) return; impacto(T(), 0.9); },
  voadora() { if (!ctx) return; soplido(T(), 0.35, 0.5, 350, 2400); },
  truco() { if (!ctx) return; const t = T(); soplido(t, 0.25, 0.4, 800, 4000); ruidoF(t + 0.2, 0.02, 0.4, 'highpass', 3000, 1); },
  ole() { if (!ctx) return; const t = T(); ruidoF(t, 0.5, 0.35, 'bandpass', 900, 1.5, busSfx, 0, 0.3, 0.1); ruidoF(t + 0.45, 0.8, 0.4, 'bandpass', 650, 1.5, busSfx, 0, 0.3, 0.1); },
  robo() { if (!ctx) return; const t = T(); soplido(t, 0.15, 0.4, 2000, 600); osc('sine', 140, 60, t, 0.1, 0.5, saturadorSfx); },
  poder() {
    if (!ctx) return; const t = T();
    ruidoF(t, 0.9, 0.35, 'bandpass', 200, 4, busSfx, 3000, 0.4, 0.8);
    osc('sawtooth', 55, 110, t, 0.9, 0.12, saturadorSfx, 0.6);
    // "cha-chunk" de la pistola
    ruidoF(t + 0.95, 0.03, 0.7, 'bandpass', 2500, 2); ruidoF(t + 1.1, 0.05, 0.8, 'bandpass', 1500, 2);
    impacto(t + 1.1, 0.8);
  },
  respawn() { if (!ctx) return; ruidoF(T(), 0.5, 0.3, 'bandpass', 400, 3, busSfx, 4000, 0.3, 0.45); },
  beep(alto) {
    if (!ctx) return; const t = T();
    if (!alto) { tambor(t, 0.9); return; }
    impacto(t, 1.8); tambor(t, 1); bocina(t + 0.05, 0.5, 0.09);
  },
  preparados() { if (!ctx) return; const t = T(); ruidoF(t, 1.4, 0.3, 'bandpass', 200, 3, busSfx, 3500, 0.3, 1.3); osc('sawtooth', 55, 110, t, 1.4, 0.08, saturadorSfx, 1.2); },
  alarma() {
    if (!ctx) return; const t = T();
    for (let k = 0; k < 2; k++) { osc('sawtooth', 500, 1200, t + k * 0.5, 0.25, 0.08, busSfx, 0.01, 0.2); osc('sawtooth', 1200, 500, t + k * 0.5 + 0.25, 0.25, 0.08, busSfx, 0.01, 0.2); }
  },
  click() { if (!ctx) return; const t = T(); osc('sine', 180, 70, t, 0.08, 0.6, saturadorSfx); },
  listo() { if (!ctx) return; const t = T(); impacto(t, 0.7); I.hey(t + 0.02, 1); },
  victoria() {
    if (!ctx) return; const t = T();
    bocina(t, 0.3, 0.1); bocina(t + 0.4, 0.3, 0.1); bocina(t + 0.8, 1.2, 0.11);
    [[0, [72, 76, 79]], [0.4, [74, 77, 81]], [0.8, [76, 79, 84]]].forEach(([k, ms]) => I.metal(t + k, ms, 0.35, 1.6));
    impacto(t + 0.8, 1.5);
  },
  jingle() {
    if (!ctx) return; const t = T();
    I.tuin(t, 1.3); I.tuin(t + 0.3, 1.3);
    I.bumbo(t + 0.6, 1); I.bumbo(t + 0.83, 1); I.bumbo(t + 1.06, 1);
    impacto(t + 1.3, 1.6); bocina(t + 1.3, 0.8, 0.1); I.hey(t + 1.3, 1);
  },
};

// ---------------------------------------------------------------------
//  Voces grabadas: voices.json { clave: archivo }
// ---------------------------------------------------------------------
function cargarVoces() {
  fetch('/assets/voices/voices.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {})).then((lista) => {
    for (const k in lista || {}) {
      fetch('/assets/voices/' + lista[k]).then((r) => (r.ok ? r.arrayBuffer() : null)).then((ab) => {
        if (!ab) return;
        ctx.decodeAudioData(ab, (buf) => { voces[k] = buf; }, () => {});
      }).catch(() => {});
    }
  }).catch(() => {});
}

// voz('gol') o voz(['craque_gol', 'gol']): la primera que exista
export function voz(claves, retraso) {
  if (!ctx || ctx.state !== 'running') return false;
  const lista = Array.isArray(claves) ? claves : [claves];
  const k = lista.find((x) => voces[x]);
  if (!k) return false;
  const s = ctx.createBufferSource(); s.buffer = voces[k];
  s.connect(busVoz);
  const r = ctx.createGain(); r.gain.value = 0.25; s.connect(r); r.connect(envioRev);
  const t = ctx.currentTime + (retraso || 0);
  // la música baja mientras hablan
  busMusica.gain.cancelScheduledValues(t);
  busMusica.gain.setTargetAtTime(0.18, t, 0.04);
  hablando++;
  s.onended = () => { hablando--; if (hablando <= 0) { hablando = 0; busMusica.gain.setTargetAtTime(VOL_MUSICA, ctx.currentTime, 0.25); } };
  s.start(t);
  return true;
}
