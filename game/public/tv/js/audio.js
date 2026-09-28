// Audio 100% sintetizado con Web Audio: música (secuenciador con lookahead),
// efectos y voces grabadas opcionales (voices.json).
let ctx = null, master, comp, busMusica, busSfx, busVoz, ruido;
let temaActual = null, pasoActual = 0, proximo = 0, reloj = null, velMul = 1, compas = 0;
const voces = {};           // clave → AudioBuffer
let listaVoces = {};
let hablando = 0;

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function iniciarAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
  master = ctx.createGain(); master.gain.value = 0.9;
  master.connect(comp); comp.connect(ctx.destination);
  busMusica = ctx.createGain(); busMusica.gain.value = 0.5; busMusica.connect(master);
  busSfx = ctx.createGain(); busSfx.gain.value = 0.9; busSfx.connect(master);
  busVoz = ctx.createGain(); busVoz.gain.value = 1.0; busVoz.connect(master);
  // un solo buffer de ruido reutilizado
  ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = ruido.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  reloj = setInterval(programar, 25);
  cargarVoces();
  return true;
}

export function audioActivo() { return ctx && ctx.state === 'running'; }
export function desbloquear() { if (ctx && ctx.state !== 'running') ctx.resume(); }

// ---------------------------------------------------------------------
//  Instrumentos
// ---------------------------------------------------------------------
function env(g, t, a, dec, pico) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pico, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}
function osc(tipo, f0, f1, t, dur, vol, bus, a) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.9);
  env(g, t, a || 0.004, dur, vol);
  o.connect(g); g.connect(bus || busSfx);
  o.start(t); o.stop(t + dur + 0.05);
  return o;
}
function ruidoF(t, dur, vol, tipo, f, q, bus, f1) {
  const s = ctx.createBufferSource(); s.buffer = ruido;
  const fl = ctx.createBiquadFilter(); fl.type = tipo; fl.frequency.setValueAtTime(f, t); fl.Q.value = q || 1;
  if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); env(g, t, 0.003, dur, vol);
  s.connect(fl); fl.connect(g); g.connect(bus || busSfx);
  s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}

const I = {
  surdo: (t, v) => osc('sine', 95, 48, t, 0.5, 0.9 * v, busMusica),
  bombo: (t, v) => { osc('sine', 160, 42, t, 0.32, 1.0 * v, busMusica); ruidoF(t, 0.02, 0.3 * v, 'lowpass', 2000, 1, busMusica); },
  caixa: (t, v) => { ruidoF(t, 0.13, 0.45 * v, 'bandpass', 1900, 0.8, busMusica); osc('triangle', 210, 160, t, 0.07, 0.25 * v, busMusica); },
  tamborim: (t, v) => { osc('square', 880, 700, t, 0.035, 0.12 * v, busMusica); ruidoF(t, 0.03, 0.2 * v, 'highpass', 5000, 1, busMusica); },
  agogo: (t, v, alto) => { const f = alto ? 1320 : 990; osc('sine', f, f, t, 0.22, 0.18 * v, busMusica); osc('sine', f * 2.4, f * 2.4, t, 0.1, 0.06 * v, busMusica); },
  chimbal: (t, v) => ruidoF(t, 0.035, 0.22 * v, 'highpass', 7500, 1, busMusica),
  shaker: (t, v) => ruidoF(t, 0.06, 0.12 * v, 'bandpass', 6000, 2, busMusica),
  palmas: (t, v) => { for (let k = 0; k < 3; k++) ruidoF(t + k * 0.011, 0.05, 0.35 * v, 'bandpass', 1300, 1.5, busMusica); },
  cuica: (t, v, alto) => osc('sine', alto ? 620 : 480, alto ? 1050 : 820, t, 0.16, 0.18 * v, busMusica, 0.02),
  bajo: (t, m, dur, v) => {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(mtof(m), t);
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + dur); f.Q.value = 6;
    env(g, t, 0.006, dur, 0.38 * (v || 1));
    o.connect(f); f.connect(g); g.connect(busMusica); o.start(t); o.stop(t + dur + 0.05);
  },
  sub808: (t, m, dur, v) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(mtof(m + 12), t); o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.06);
    env(g, t, 0.005, dur, 0.6 * (v || 1));
    o.connect(g); g.connect(busMusica); o.start(t); o.stop(t + dur + 0.05);
  },
  lead: (t, m, dur, v, tipo) => {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = tipo || 'square'; o.frequency.setValueAtTime(mtof(m), t);
    f.type = 'lowpass'; f.frequency.value = 2600;
    env(g, t, 0.01, dur, 0.1 * (v || 1));
    o.connect(f); f.connect(g); g.connect(busMusica); o.start(t); o.stop(t + dur + 0.05);
  },
  pluck: (t, ms, dur, v) => { for (const m of ms) I.lead(t, m, dur, 0.55 * (v || 1), 'triangle'); },
  pad: (t, ms, dur, v) => { for (const m of ms) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = mtof(m); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05 * (v || 1), t + 0.15); g.gain.linearRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(busMusica); o.start(t); o.stop(t + dur + 0.05); } },
};

// ---------------------------------------------------------------------
//  Temas (16 pasos por compás). 'x' fuerte, 'o' suave, '.' nada
// ---------------------------------------------------------------------
const TEMAS = {
  menu: { bpm: 104, perc: {
    surdo: 'o.......x.......', tamborim: 'x.xx.x.xx.x.x.xx', caixa: 'oooxoooxoooxooox', agogo: 'x.x...x.x.x...x.', chimbal: '..x...x...x...x.' },
    bajo: [[50, 0, 0, 57, 0, 0, 50, 0, 57, 0, 0, 50, 0, 0, 57, 0], [55, 0, 0, 59, 0, 0, 55, 0, 62, 0, 0, 55, 0, 0, 59, 0], [52, 0, 0, 57, 0, 0, 52, 0, 57, 0, 0, 52, 0, 0, 57, 0], [57, 0, 0, 61, 0, 0, 57, 0, 64, 0, 0, 57, 0, 0, 61, 0]].map((b) => b.map((n) => n && n - 12)),
    mel: [[74, 0, 76, 0, 78, 0, 76, 74, 0, 71, 0, 0, 74, 0, 0, 0], [79, 0, 78, 0, 76, 0, 74, 0, 76, 0, 0, 78, 0, 0, 0, 0], [76, 0, 74, 0, 73, 0, 74, 76, 0, 78, 0, 0, 76, 0, 0, 0], [73, 0, 74, 0, 76, 0, 78, 0, 81, 0, 0, 0, 0, 0, 0, 0]], melTipo: 'square', melVol: 0.7 },
  laje: { bpm: 130, perc: {
    bombo: 'x..x..x.x..x..x.', caixa: '....x.......x...', palmas: '....x..x....x...', chimbal: 'x.x.x.x.x.x.x.x.', cuica: '..........x...x.' },
    sub: [[45, 0, 0, 45, 0, 0, 48, 0, 45, 0, 0, 43, 0, 0, 45, 0], [41, 0, 0, 41, 0, 0, 43, 0, 41, 0, 0, 40, 0, 0, 43, 0]],
    mel: [[69, 0, 72, 0, 0, 76, 0, 0, 74, 0, 72, 0, 69, 0, 0, 0], [65, 0, 69, 0, 0, 72, 0, 0, 71, 0, 67, 0, 64, 0, 0, 0]], melTipo: 'sawtooth', melVol: 0.55 },
  praca: { bpm: 112, perc: {
    bombo: 'x.....x.x.......', caixa: '....x.......x..o', agogo: 'x..x..x...x..x..', shaker: 'xoxoxoxoxoxoxoxo', tamborim: '..x...x...x...xx' },
    bajo: [[43, 0, 0, 47, 0, 0, 50, 0, 43, 0, 50, 0, 47, 0, 45, 0], [48, 0, 0, 52, 0, 0, 55, 0, 48, 0, 55, 0, 52, 0, 50, 0], [45, 0, 0, 48, 0, 0, 52, 0, 45, 0, 52, 0, 50, 0, 47, 0], [50, 0, 0, 54, 0, 0, 57, 0, 50, 0, 57, 0, 54, 0, 52, 0]],
    acordes: [[55, 59, 62, 66], [60, 64, 67, 71], [57, 60, 64, 67], [62, 66, 69, 72]], acordPat: '..x..x....x..x..',
    mel: [[79, 0, 0, 78, 0, 76, 0, 74, 0, 0, 76, 0, 0, 0, 0, 0], [72, 0, 0, 74, 0, 76, 0, 79, 0, 0, 76, 0, 0, 0, 0, 0], [76, 0, 0, 74, 0, 72, 0, 69, 0, 0, 72, 0, 0, 0, 0, 0], [74, 0, 76, 0, 78, 0, 81, 0, 0, 0, 78, 0, 0, 0, 0, 0]], melTipo: 'triangle', melVol: 1.2 },
  praia: { bpm: 118, perc: {
    surdo: 'x.......o.......', bombo: 'x...x...x...x...', shaker: 'xoxxxoxxxoxxxoxx', agogo: '......x.......x.', tamborim: 'x..x..x...x..x..' },
    bajo: [[41, 0, 0, 41, 0, 0, 48, 0, 0, 0, 41, 0, 48, 0, 0, 0], [46, 0, 0, 46, 0, 0, 53, 0, 0, 0, 46, 0, 53, 0, 0, 0], [43, 0, 0, 43, 0, 0, 50, 0, 0, 0, 43, 0, 50, 0, 0, 0], [48, 0, 0, 48, 0, 0, 55, 0, 0, 0, 48, 0, 52, 0, 0, 0]],
    acordes: [[65, 69, 72, 76], [70, 74, 77, 81], [67, 70, 74, 77], [72, 76, 79, 82]], acordPad: true,
    mel: [[81, 0, 79, 0, 77, 0, 0, 76, 0, 77, 0, 0, 0, 0, 0, 0], [82, 0, 81, 0, 79, 0, 0, 77, 0, 74, 0, 0, 0, 0, 0, 0], [79, 0, 77, 0, 76, 0, 0, 74, 0, 77, 0, 0, 0, 0, 0, 0], [76, 0, 77, 0, 79, 0, 81, 0, 84, 0, 0, 0, 0, 0, 0, 0]], melTipo: 'triangle', melVol: 1.3 },
  noturno: { bpm: 125, perc: {
    bombo: 'x..x..x.x..x..x.', caixa: '....x.......x...', chimbal: '..x...x...x...x.', cuica: 'x.......x.......', palmas: '............x...' },
    sub: [[40, 0, 0, 40, 0, 0, 43, 0, 40, 0, 0, 38, 0, 0, 40, 0], [36, 0, 0, 36, 0, 0, 38, 0, 36, 0, 0, 35, 0, 0, 38, 0]],
    mel: [[64, 0, 0, 67, 0, 0, 71, 0, 70, 0, 0, 67, 0, 0, 0, 0], [60, 0, 0, 64, 0, 0, 67, 0, 66, 0, 0, 63, 0, 0, 0, 0]], melTipo: 'sawtooth', melVol: 0.45 },
  podio: { bpm: 124, perc: {
    surdo: 'x.......x.......', tamborim: 'x.xx.x.xx.x.x.xx', caixa: 'xoxoxoxoxoxoxoxo', agogo: 'x.x..x.x.x.x..x.', palmas: '....x.......x...' },
    bajo: [[48, 0, 0, 55, 0, 0, 48, 0, 55, 0, 0, 48, 0, 0, 55, 0], [53, 0, 0, 57, 0, 0, 53, 0, 60, 0, 0, 53, 0, 0, 57, 0], [55, 0, 0, 59, 0, 0, 55, 0, 62, 0, 0, 55, 0, 0, 59, 0], [48, 0, 0, 55, 0, 0, 52, 0, 48, 0, 0, 0, 0, 0, 0, 0]],
    mel: [[72, 0, 76, 0, 79, 0, 84, 0, 0, 0, 79, 0, 84, 0, 0, 0], [81, 0, 79, 0, 77, 0, 76, 0, 77, 0, 0, 81, 0, 0, 0, 0], [79, 0, 77, 0, 76, 0, 74, 0, 76, 0, 0, 79, 0, 0, 0, 0], [84, 0, 83, 0, 84, 0, 88, 0, 84, 0, 0, 0, 0, 0, 0, 0]], melTipo: 'square', melVol: 0.8 },
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
  const sw = i % 2 === 1 ? paso * 0.12 : 0;    // un poquito de swing
  t += sw;
  for (const inst in tema.perc) {
    const c = tema.perc[inst][i];
    if (c === 'x' || c === 'o') I[inst](t, c === 'x' ? 1 : 0.5, i % 4 === 2);
  }
  const b = compas;
  if (tema.bajo) { const n = tema.bajo[b % tema.bajo.length][i]; if (n) I.bajo(t, n, paso * 2.2); }
  if (tema.sub) { const n = tema.sub[b % tema.sub.length][i]; if (n) I.sub808(t, n, paso * 3); }
  if (tema.acordes) {
    const ac = tema.acordes[b % tema.acordes.length];
    if (tema.acordPad) { if (i === 0) I.pad(t, ac, paso * 16); }
    else if (tema.acordPat[i] === 'x') I.pluck(t, ac, paso * 1.5, 0.6);
  }
  if (tema.mel && (b % 8) >= 4) {        // la melodía entra y sale para no cansar
    const n = tema.mel[b % tema.mel.length][i]; if (n) I.lead(t, n, paso * 1.8, tema.melVol, tema.melTipo);
  }
}

export function tema(nombre) {
  if (!ctx || temaActual === nombre) return;
  temaActual = nombre;
  pasoActual = 0; compas = 0; velMul = 1;
  proximo = ctx.currentTime + 0.08;
}
export function acelerar(on) { velMul = on ? 1.12 : 1; }

// ---------------------------------------------------------------------
//  Efectos de sonido
// ---------------------------------------------------------------------
const T = () => ctx.currentTime + 0.005;
export const sfx = {
  patada(p) {
    if (!ctx) return; const t = T();
    osc('sine', 150, 50, t, 0.14, 0.9); ruidoF(t, 0.03, 0.5, 'lowpass', 3000);
    if (p > 0.8) { osc('sine', 90, 30, t, 0.5, 1); ruidoF(t, 0.6, 0.5, 'bandpass', 400, 1, busSfx, 3000); }
  },
  curva() { if (!ctx) return; const t = T(); ruidoF(t, 0.5, 0.25, 'bandpass', 800, 3, busSfx, 2600); },
  pase() { if (!ctx) return; const t = T(); osc('sine', 130, 70, t, 0.1, 0.5); },
  pique(f) { if (!ctx) return; const t = T(); osc('sine', 110, 70, t, 0.08, Math.min(0.5, f * 0.05)); },
  pared() { if (!ctx) return; const t = T(); osc('triangle', 90, 60, t, 0.15, 0.5); ruidoF(t, 0.12, 0.35, 'lowpass', 900); },
  poste() { if (!ctx) return; const t = T(); for (const f of [880, 1330, 2090, 2760]) osc('sine', f, f * 0.99, t, 0.9, 0.12); },
  silbato(largo) {
    if (!ctx) return; const t = T();
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 2900; lfo.frequency.value = 28; lg.gain.value = 180;
    lfo.connect(lg); lg.connect(o.frequency);
    const d = largo ? 0.9 : 0.35;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.setValueAtTime(0.25, t + d - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(busSfx); o.start(t); lfo.start(t); o.stop(t + d + 0.05); lfo.stop(t + d + 0.05);
  },
  gol() {
    if (!ctx) return; const t = T();
    ruidoF(t, 3.2, 0.5, 'bandpass', 700, 0.6, busSfx, 1400);
    ruidoF(t + 0.1, 2.8, 0.35, 'bandpass', 1500, 0.8);
    for (const [k, m] of [[0, 60], [0.18, 64], [0.36, 67], [0.54, 72]]) { osc('sawtooth', mtof(m), mtof(m), t + k, 0.5, 0.12); }
    osc('sawtooth', mtof(72), mtof(72), t + 0.72, 1.2, 0.14); osc('sawtooth', mtof(76), mtof(76), t + 0.72, 1.2, 0.1);
  },
  pistola() {
    if (!ctx) return; const t = T();
    ruidoF(t, 0.35, 1.0, 'lowpass', 4000, 0.7, busSfx, 300); osc('sine', 200, 35, t, 0.4, 1); osc('square', 1400, 200, t, 0.05, 0.2);
  },
  ko() {
    if (!ctx) return; const t = T();
    osc('sine', 1300, 180, t + 0.05, 0.8, 0.3); osc('triangle', 300, 120, t, 0.2, 0.5);
    for (let k = 0; k < 3; k++) osc('sine', 1800 + k * 300, 1800 + k * 300, t + 0.4 + k * 0.12, 0.12, 0.08);
  },
  tuneado() {
    if (!ctx) return; const t = T();
    osc('square', 320, 110, t, 0.2, 0.3); ruidoF(t, 0.1, 0.6, 'lowpass', 1500);
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
    o.frequency.value = 420; lfo.frequency.value = 14; lg.gain.value = 120; lfo.connect(lg); lg.connect(o.frequency);
    env(g, t + 0.05, 0.01, 0.6, 0.18); o.connect(g); g.connect(busSfx); o.start(t); lfo.start(t); o.stop(t + 0.8); lfo.stop(t + 0.8);
  },
  barrida() { if (!ctx) return; const t = T(); ruidoF(t, 0.45, 0.4, 'lowpass', 1800, 1, busSfx, 400); },
  entrada() { if (!ctx) return; const t = T(); osc('sine', 120, 45, t, 0.25, 0.9); ruidoF(t, 0.15, 0.5, 'lowpass', 1200); },
  voadora() { if (!ctx) return; const t = T(); ruidoF(t, 0.35, 0.35, 'bandpass', 500, 2, busSfx, 2500); },
  truco() { if (!ctx) return; const t = T(); ruidoF(t, 0.3, 0.3, 'bandpass', 600, 4, busSfx, 3500); osc('sine', 1320, 1320, t + 0.15, 0.15, 0.08); },
  ole() { if (!ctx) return; const t = T(); ruidoF(t, 0.5, 0.35, 'bandpass', 900, 1.5); ruidoF(t + 0.45, 0.7, 0.4, 'bandpass', 650, 1.5); },
  robo() { if (!ctx) return; const t = T(); ruidoF(t, 0.12, 0.3, 'highpass', 2500, 1); osc('triangle', 500, 300, t, 0.08, 0.2); },
  poder() {
    if (!ctx) return; const t = T();
    [60, 64, 67, 72, 76, 79, 84].forEach((m, k) => osc('square', mtof(m), mtof(m), t + k * 0.06, 0.18, 0.12));
    ruidoF(t + 0.4, 0.8, 0.2, 'highpass', 6000);
  },
  respawn() { if (!ctx) return; const t = T(); [72, 76, 79].forEach((m, k) => osc('triangle', mtof(m), mtof(m), t + k * 0.07, 0.2, 0.12)); },
  beep(alto) { if (!ctx) return; const t = T(); osc('square', alto ? 1047 : 660, alto ? 1047 : 660, t, alto ? 0.6 : 0.2, 0.2); if (alto) osc('square', 1319, 1319, t, 0.6, 0.12); },
  preparados() { if (!ctx) return; const t = T(); ruidoF(t, 1.4, 0.3, 'bandpass', 300, 2, busSfx, 3000); [55, 60, 64].forEach((m) => osc('sawtooth', mtof(m), mtof(m + 12), t, 1.4, 0.05, busSfx, 0.6)); },
  alarma() { if (!ctx) return; const t = T(); for (let k = 0; k < 4; k++) osc('square', k % 2 ? 740 : 988, k % 2 ? 740 : 988, t + k * 0.16, 0.14, 0.12); },
  click() { if (!ctx) return; const t = T(); osc('square', 1200, 900, t, 0.04, 0.1); },
  listo() { if (!ctx) return; const t = T(); osc('square', 880, 880, t, 0.08, 0.12); osc('square', 1320, 1320, t + 0.08, 0.14, 0.12); },
  victoria() {
    if (!ctx) return; const t = T();
    [[0, 72], [0.15, 72], [0.3, 72], [0.45, 76], [0.75, 79], [1.05, 84]].forEach(([k, m]) => { osc('square', mtof(m), mtof(m), t + k, 0.28, 0.14); osc('sawtooth', mtof(m - 12), mtof(m - 12), t + k, 0.28, 0.06); });
  },
  jingle() {
    if (!ctx) return; const t = T();
    I.agogo(t, 1, false); I.agogo(t + 0.12, 1, true); I.agogo(t + 0.24, 1, false);
    [62, 66, 69, 74, 78, 81].forEach((m, k) => osc('square', mtof(m), mtof(m), t + 0.36 + k * 0.08, 0.22, 0.1));
    osc('sine', 110, 40, t + 0.9, 0.6, 0.9); ruidoF(t + 0.9, 0.5, 0.4, 'lowpass', 2000);
    [74, 78, 81, 86].forEach((m) => osc('sawtooth', mtof(m), mtof(m), t + 0.9, 1.0, 0.05));
  },
};

// ---------------------------------------------------------------------
//  Voces grabadas (opcionales). voices.json: { "craque_elige": "craque_elige.mp3", ... }
// ---------------------------------------------------------------------
function cargarVoces() {
  fetch('/assets/voices/voices.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {})).then((j) => {
    listaVoces = j || {};
    for (const k in listaVoces) {
      fetch('/assets/voices/' + listaVoces[k]).then((r) => (r.ok ? r.arrayBuffer() : null)).then((ab) => {
        if (!ab) return;
        ctx.decodeAudioData(ab, (buf) => { voces[k] = buf; }, () => {});
      }).catch(() => {});
    }
  }).catch(() => {});
}

export function voz(clave) {
  if (!ctx || !voces[clave] || ctx.state !== 'running') return false;
  const s = ctx.createBufferSource(); s.buffer = voces[clave];
  s.connect(busVoz);
  const t = ctx.currentTime;
  // la música baja mientras hablan
  busMusica.gain.cancelScheduledValues(t);
  busMusica.gain.setTargetAtTime(0.15, t, 0.05);
  hablando++;
  s.onended = () => { hablando--; if (hablando <= 0) { hablando = 0; busMusica.gain.setTargetAtTime(0.5, ctx.currentTime, 0.2); } };
  s.start(t);
  return true;
}
