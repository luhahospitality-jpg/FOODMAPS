// Musica y efectos sintetizados con WebAudio (sin archivos de audio).
// Secuenciador con "lookahead": las notas se agendan un poco antes en el reloj de audio,
// asi el ritmo no se atrasa aunque la TV tarde en dibujar un cuadro.

let ctx = null, master = null, musicBus = null, sfxBus = null, echo = null, noiseBuf = null;

function ensureAudio() {
  if (ctx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  ctx = new Ctx();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4;
  master = ctx.createGain(); master.gain.value = 0.55;
  master.connect(comp); comp.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.34; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.85; sfxBus.connect(master);
  // eco corto (mucho mas barato que una reverb) para darle aire a la melodia
  echo = ctx.createDelay(0.5); echo.delayTime.value = 0.18;
  const fb = ctx.createGain(); fb.gain.value = 0.28;
  const wet = ctx.createGain(); wet.gain.value = 0.3;
  const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2600;
  echo.connect(damp); damp.connect(fb); fb.connect(echo); damp.connect(wet); wet.connect(musicBus);
  // un solo buffer de ruido reutilizado (antes se creaba uno por golpe de bateria)
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function nm(s) { const m = /^([A-G][#b]?)(\d)$/.exec(s); return m ? NOTE[m[1]] + (Number(m[2]) + 1) * 12 : null; }

// ---------- instrumentos ----------
function env(g, t, a, peak, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function osc(type, f, t, dur, peak, bus, a = 0.01, detune = 0) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune;
  env(g, t, a, peak, dur);
  o.connect(g); g.connect(bus || musicBus);
  o.start(t); o.stop(t + dur + 0.05);
  return { o, g };
}
function lead(m, t, dur, vol, kind) {
  const f = mtof(m);
  if (kind === 'steel') {
    // "steel drum": seno + armonico, ataque rapido
    osc('sine', f, t, dur * 1.4, vol, musicBus, 0.005);
    osc('sine', f * 2.01, t, dur * 0.7, vol * 0.35, musicBus, 0.005);
    osc('triangle', f * 3, t, dur * 0.3, vol * 0.12, musicBus, 0.005);
    return;
  }
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
  lp.frequency.setValueAtTime(kind === 'saw' ? 3200 : 2400, t);
  lp.frequency.exponentialRampToValueAtTime(900, t + dur);
  const g = ctx.createGain(); env(g, t, 0.012, vol, dur);
  [-7, 7].forEach((dt) => {
    const o = ctx.createOscillator(); o.type = kind === 'saw' ? 'sawtooth' : 'square';
    o.frequency.setValueAtTime(f, t); o.detune.value = dt;
    o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
  });
  lp.connect(g); g.connect(musicBus); g.connect(echo);
}
function bass(m, t, dur, vol, kind) {
  const f = mtof(m);
  if (kind === 'saw') {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1200, t); lp.frequency.exponentialRampToValueAtTime(220, t + dur);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const g = ctx.createGain(); env(g, t, 0.005, vol, dur);
    o.connect(lp); lp.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.05);
  } else {
    osc('triangle', f, t, dur, vol, musicBus, 0.005);
    osc('square', f, t, dur * 0.6, vol * 0.18, musicBus, 0.005);
  }
}
function pad(ms, t, dur, vol) {
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.15);
  g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  ms.forEach((m) => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = (Math.random() - 0.5) * 14;
    o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
  });
  lp.connect(g); g.connect(musicBus);
}
function noise(t, dur, vol, type, freq, bus, q) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus || musicBus);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  return f;
}
function kick(t, vol = 0.9) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.22);
}
function snare(t, vol = 0.45) {
  noise(t, 0.16, vol, 'bandpass', 1800, musicBus, 0.8);
  osc('triangle', 190, t, 0.08, vol * 0.5, musicBus, 0.002);
}
function hat(t, vol = 0.12, open) { noise(t, open ? 0.18 : 0.04, vol, 'highpass', 7000); }
function rim(t, vol = 0.2) { osc('square', 1700, t, 0.03, vol, musicBus, 0.001); }

// ---------- canciones ----------
const CH = {
  C: [60, 64, 67], Dm: [62, 65, 69], Em: [64, 67, 71], F: [65, 69, 72], G: [67, 71, 74], Am: [69, 72, 76],
  Bb: [70, 74, 77], Gm: [67, 70, 74], Eb: [63, 67, 70],
};
// melodia en corcheas: 8 notas por compas ('-' = sostener, '.' = silencio)
const SONGS = {
  menu: {
    bpm: 128, drums: 'pop', bassKind: 'tri', leadKind: 'square', arp: true,
    chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'],
    mel: 'E5 G5 C6 - B5 C6 G5 - | A5 - G5 E5 - C5 E5 - | F5 A5 C6 - A5 G5 F5 - | G5 - D5 G5 B5 - A5 G5 | E5 G5 C6 - D6 C6 G5 - | A5 C6 E6 - D6 C6 A5 - | F5 - A5 C6 F6 - E6 D6 | D6 - B5 - G5 - . .',
  },
  race_rainbow: {
    bpm: 150, drums: 'four', bassKind: 'tri', leadKind: 'square', arp: true,
    chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C'],
    mel: 'C5 F5 A5 C6 - A5 F5 A5 | D5 F5 A5 D6 - C6 A5 F5 | D5 F5 Bb5 D6 - C6 Bb5 A5 | G5 - E5 - C5 E5 G5 Bb5 | A5 C6 F6 - E6 C6 A5 C6 | D6 - C6 A5 F5 A5 D6 - | F6 - D6 Bb5 D6 - C6 Bb5 | C6 - G5 - E5 - C5 .',
  },
  race_banana: {
    bpm: 138, drums: 'island', bassKind: 'tri', leadKind: 'steel', arp: false, skank: true,
    chords: ['C', 'F', 'C', 'G', 'C', 'F', 'C', 'G'],
    mel: 'G5 . E5 G5 . C6 . G5 | A5 . F5 A5 . C6 . A5 | G5 E5 C5 E5 G5 . E5 . | D5 . G5 B5 . D6 . B5 | C6 . B5 C6 . G5 . E5 | F5 A5 C6 . A5 . F5 . | E5 G5 C6 . E6 . C6 . | D6 . B5 . G5 . . .',
  },
  race_space: {
    bpm: 156, drums: 'four', bassKind: 'saw', leadKind: 'saw', arp: true,
    chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'],
    mel: 'A4 . E5 A5 . G5 E5 . | F5 . C5 F5 . E5 C5 . | E5 . G5 C6 . B5 G5 . | D5 . G5 B5 . A5 G5 D5 | A5 - C6 - E6 - D6 C6 | C6 - A5 - F5 - A5 C6 | G5 - C6 - E6 - D6 C6 | B5 - G5 - D6 - . .',
  },
  battle: {
    bpm: 164, drums: 'four', bassKind: 'saw', leadKind: 'saw', arp: true,
    chords: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'F', 'Em'],
    mel: 'A5 . A5 C6 . A5 E6 . | D6 C6 A5 . G5 . A5 . | F5 . A5 C6 . F6 . E6 | D6 . B5 . G5 . D6 . | A5 . A5 C6 . A5 E6 . | G6 E6 D6 . C6 . A5 . | F5 A5 C6 F6 . E6 C6 A5 | B5 - - . G5 . E5 .',
  },
  victory: {
    bpm: 120, drums: 'pop', bassKind: 'tri', leadKind: 'square', arp: true,
    chords: ['C', 'F', 'G', 'C', 'Am', 'F', 'G', 'C'],
    mel: 'C5 E5 G5 C6 - - G5 C6 | A5 - C6 - F6 - - . | G5 B5 D6 G6 - F6 D6 B5 | C6 - - - G5 - C6 - | A5 C6 E6 - D6 C6 A5 - | F5 A5 C6 - F6 - E6 D6 | D6 - B5 - G5 B5 D6 - | C6 - - - - - . .',
  },
};
Object.values(SONGS).forEach((s) => {
  s.melody = s.mel.split('|').map((bar) => bar.trim().split(/\s+/));
});

let song = null, songName = null, step = 0, nextT = 0, tempoMul = 1, timer = null;

function scheduleStep(st, t) {
  const s = song;
  const sd = 60 / (s.bpm * tempoMul) / 4;
  const bars = s.chords.length;
  const bar = Math.floor(st / 16) % bars, pos = st % 16;
  const chord = CH[s.chords[bar]];
  // bateria
  if (s.drums === 'four') {
    if (pos % 4 === 0) kick(t);
    if (pos === 4 || pos === 12) snare(t);
    if (pos % 2 === 1) hat(t, 0.1, pos === 15);
  } else if (s.drums === 'pop') {
    if (pos === 0 || pos === 6 || pos === 8) kick(t, 0.8);
    if (pos === 4 || pos === 12) snare(t, 0.4);
    if (pos % 2 === 0) hat(t, 0.08);
  } else if (s.drums === 'island') {
    if (pos === 0 || pos === 10) kick(t, 0.75);
    if (pos === 4 || pos === 12) rim(t, 0.22);
    if (pos % 2 === 1) hat(t, 0.07);
  }
  if (pos === 14 && bar === bars - 1) snare(t, 0.3); // redoble de fin de frase
  // bajo
  if (pos % 2 === 0) {
    const r = chord[0] - 24;
    const pat = [r, r, r + 12, r, r + 7, r, r + 12, r + 7];
    bass(pat[pos / 2], t, sd * 1.8, 0.42, s.bassKind);
  }
  // colchon de acordes / "skank" de isla en los contratiempos
  if (s.skank) { if (pos % 4 === 2) chord.forEach((m) => osc('triangle', mtof(m), t, sd * 1.2, 0.05, musicBus, 0.004)); }
  else if (pos === 0) pad(chord.map((m) => m - 12), t, sd * 16, 0.035);
  // arpegio suave en semicorcheas
  if (s.arp) {
    const seq = [0, 1, 2, 1];
    osc('square', mtof(chord[seq[pos % 4]] + 12), t, sd * 0.8, 0.028, musicBus, 0.003);
  }
  // melodia
  if (pos % 2 === 0) {
    const toks = s.melody[bar % s.melody.length];
    const k = pos / 2, tok = toks[k];
    if (tok && tok !== '-' && tok !== '.') {
      let len = 1; while (toks[k + len] === '-') len++;
      const m = nm(tok);
      if (m) lead(m, t, sd * 2 * len * 0.95, s.leadKind === 'steel' ? 0.2 : 0.12, s.leadKind);
    }
  }
}

function tick() {
  if (!ctx || !song) return;
  // si la pestaña estuvo congelada, no intentes ponerte al dia con cientos de notas
  if (nextT < ctx.currentTime - 0.2) nextT = ctx.currentTime + 0.05;
  while (nextT < ctx.currentTime + 0.14) {
    scheduleStep(step, nextT);
    nextT += 60 / (song.bpm * tempoMul) / 4;
    step++;
  }
}

function fadeMusic(to, sec) {
  if (!ctx) return;
  const g = musicBus.gain, t = ctx.currentTime;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to, t + sec);
}

export const music = {
  // la cancion que corresponde a la fase actual; solo cambia si es distinta
  want(name) {
    if (name === songName) return;
    songName = name;
    tempoMul = 1;
    if (!ctx) return;
    if (!name) { fadeMusic(0.0001, 0.4); song = null; return; }
    song = SONGS[name] || null;
    step = 0; nextT = ctx.currentTime + 0.08;
    fadeMusic(0.34, 0.3);
  },
  faster() { tempoMul = 1.12; },
};

// ---------- efectos ----------
function sfxT() { return ctx ? ctx.currentTime + 0.01 : 0; }
function tone(f, t, dur, type, vol, a) { osc(type, f, t, dur, vol, sfxBus, a || 0.005); }
function sweep(f0, f1, t, dur, type, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, Math.min(0.02, dur * 0.25), vol, dur);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
}
function whoosh(t, dur, vol, f0, f1) {
  const f = noise(t, dur, vol, 'bandpass', f0, sfxBus, 1.2);
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
}
const chordArp = (ms, t, gap, dur, type, vol) => ms.forEach((m, i) => tone(mtof(m), t + i * gap, dur, type, vol));

function crashLike(t) { noise(t, 0.45, 0.5, 'lowpass', 1400, sfxBus); osc('sine', 80, t, 0.3, 0.8, sfxBus, 0.002); sweep(400, 60, t, 0.35, 'square', 0.12); }

let introPlayed = false;
function playIntro() {
  // jingle de arranque: redoble, arpegio que sube y acorde final brillante
  const t = sfxT() + 0.05;
  for (let i = 0; i < 8; i++) noise(t + i * 0.055, 0.05, 0.12 + i * 0.03, 'bandpass', 1800, sfxBus, 0.8);
  chordArp([60, 64, 67, 72, 76, 79], t + 0.45, 0.07, 0.25, 'square', 0.13);
  [72, 76, 79, 84].forEach((m) => { tone(mtof(m), t + 0.95, 1.4, 'sawtooth', 0.05, 0.02); tone(mtof(m), t + 0.95, 1.4, 'square', 0.04, 0.02); });
  osc('sine', 60, t + 0.95, 0.5, 0.6, sfxBus, 0.002);
  noise(t + 0.95, 1.2, 0.18, 'highpass', 5000, sfxBus);
}

export const sfx = {
  intro: () => { if (ctx) playIntro(); },
  // "preparados": subida de tension durante la cuenta
  ready: () => { if (!ctx) return; const t = sfxT(); whoosh(t, 2.8, 0.12, 300, 5000); sweep(110, 440, t, 2.8, 'sawtooth', 0.04); },
  countdown: (n) => {
    if (!ctx) return;
    const t = sfxT();
    if (n > 0) { tone(mtof(69), t, 0.22, 'square', 0.22); tone(mtof(81), t, 0.22, 'triangle', 0.1); }
    else {
      [72, 76, 79, 84].forEach((m) => tone(mtof(m), t, 0.6, 'square', 0.1));
      whoosh(t, 0.7, 0.3, 600, 6000);
      osc('sine', 55, t, 0.4, 0.7, sfxBus, 0.002);
    }
  },
  item: () => { if (!ctx) return; const t = sfxT(); for (let i = 0; i < 6; i++) tone(mtof(84 + (i % 3) * 4), t + i * 0.05, 0.05, 'square', 0.08); chordArp([84, 88, 91, 96], t + 0.32, 0.05, 0.14, 'triangle', 0.2); },
  power: (c) => {
    if (!ctx) return;
    const t = sfxT();
    if (c === 'ice') { for (let i = 0; i < 10; i++) tone(mtof(88 + ((i * 5) % 12)), t + i * 0.035, 0.3, 'sine', 0.09); whoosh(t, 0.8, 0.2, 2000, 9000); }
    else if (c === 'gorilla') { sweep(300, 900, t, 0.15, 'square', 0.18); sweep(900, 200, t + 0.15, 0.25, 'triangle', 0.2); }
    else if (c === 'princess') { chordArp([79, 83, 86, 91, 95], t, 0.04, 0.25, 'sine', 0.14); whoosh(t, 0.4, 0.15, 800, 3000); }
    else { sweep(200, 1200, t, 0.25, 'sawtooth', 0.16); osc('sine', 70, t, 0.3, 0.6, sfxBus, 0.002); whoosh(t, 0.5, 0.25, 400, 4000); }
  },
  fall: () => { if (!ctx) return; const t = sfxT(); sweep(1200, 120, t, 0.7, 'sine', 0.22); noise(t + 0.55, 0.4, 0.2, 'lowpass', 700, sfxBus); },
  respawn: () => { if (!ctx) return; const t = sfxT(); chordArp([72, 79, 84], t, 0.05, 0.12, 'triangle', 0.18); },
  lap: () => { if (!ctx) return; const t = sfxT(); chordArp([76, 79, 84], t, 0.08, 0.2, 'square', 0.16); },
  finalLap: () => { if (!ctx) return; const t = sfxT(); [0, 0.18, 0.36].forEach((d, i) => chordArp([72 + i * 2, 76 + i * 2, 79 + i * 2], t + d, 0, 0.16, 'square', 0.1)); chordArp([84, 88, 91], t + 0.6, 0, 0.6, 'sawtooth', 0.08); },
  finish: (win) => {
    if (!ctx) return;
    const t = sfxT();
    if (win) { chordArp([72, 76, 79, 84], t, 0.12, 0.2, 'square', 0.16); [84, 88, 91].forEach((m) => tone(mtof(m), t + 0.5, 1.0, 'sawtooth', 0.07)); }
    else chordArp([67, 72, 76, 79], t, 0.1, 0.25, 'triangle', 0.2);
  },
  win: () => { if (ctx) sfx.finish(true); },
  coin: () => { if (!ctx) return; const t = sfxT(); tone(mtof(83), t, 0.07, 'square', 0.12); tone(mtof(88), t + 0.06, 0.18, 'square', 0.14); },
  star: () => { if (!ctx) return; const t = sfxT(); whoosh(t, 0.6, 0.3, 300, 5000); chordArp([72, 74, 76, 77, 79, 81, 84], t + 0.05, 0.045, 0.12, 'triangle', 0.18); },
  shrink: () => { if (!ctx) return; const t = sfxT(); [0, 0.12, 0.24].forEach((d, i) => sweep(900 - i * 200, 500 - i * 150, t + d, 0.12, 'square', 0.14)); },
  missile: () => { if (!ctx) return; const t = sfxT(); whoosh(t, 0.5, 0.35, 300, 2500); sweep(180, 700, t, 0.4, 'sawtooth', 0.1); },
  crash: () => { if (!ctx) return; const t = sfxT(); noise(t, 0.45, 0.5, 'lowpass', 1400, sfxBus); osc('sine', 80, t, 0.3, 0.8, sfxBus, 0.002); sweep(400, 60, t, 0.35, 'square', 0.12); },
  squish: () => { if (!ctx) return; const t = sfxT(); sweep(900, 80, t, 0.35, 'square', 0.18); noise(t, 0.3, 0.4, 'lowpass', 600, sfxBus); osc('sine', 60, t, 0.25, 0.7, sfxBus, 0.002); },
  punch: () => { if (!ctx) return; const t = sfxT(); noise(t, 0.12, 0.5, 'bandpass', 900, sfxBus, 1.5); osc('sine', 120, t, 0.15, 0.7, sfxBus, 0.002); },
  ko: () => { if (!ctx) return; const t = sfxT(); crashLike(t); chordArp([67, 63, 60, 55], t + 0.2, 0.14, 0.3, 'square', 0.14); },
  heart: () => { if (!ctx) return; const t = sfxT(); chordArp([76, 81, 84, 88], t, 0.06, 0.18, 'triangle', 0.2); },
  door: () => { if (!ctx) return; const t = sfxT(); noise(t, 0.08, 0.3, 'bandpass', 2400, sfxBus, 2); tone(mtof(64), t + 0.05, 0.08, 'square', 0.1); },
  swing: () => { if (!ctx) return; const t = sfxT(); whoosh(t, 0.22, 0.35, 500, 3000); },
  bonk: () => { if (!ctx) return; const t = sfxT(); osc('sine', 180, t, 0.18, 0.8, sfxBus, 0.002); sweep(700, 220, t, 0.16, 'square', 0.16); noise(t, 0.1, 0.35, 'bandpass', 1500, sfxBus, 1.2); },
  slam: () => { if (!ctx) return; const t = sfxT(); osc('sine', 50, t, 0.6, 0.9, sfxBus, 0.002); noise(t, 0.7, 0.45, 'lowpass', 900, sfxBus); for (let i = 0; i < 8; i++) tone(mtof(90 + ((i * 7) % 12)), t + 0.1 + i * 0.03, 0.3, 'sine', 0.08); },
  trap: () => { if (!ctx) return; const t = sfxT(); sweep(300, 900, t, 0.12, 'square', 0.14); sweep(900, 200, t + 0.12, 0.3, 'triangle', 0.18); chordArp([60, 63, 66], t + 0.35, 0.08, 0.15, 'square', 0.1); },
  slip: () => { if (!ctx) return; const t = sfxT(); sweep(700, 250, t, 0.18, 'sine', 0.22); sweep(250, 600, t + 0.18, 0.2, 'sine', 0.18); },
};

function unlockAudio() {
  ensureAudio();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (!timer) timer = setInterval(tick, 30);
  if (!introPlayed && ctx.state === 'running') {
    introPlayed = true;
    playIntro();
    // la musica del menu entra despues del jingle
    if (songName) { const n = songName; songName = null; song = null; setTimeout(() => { if (!songName) music.want(n); }, 1700); }
  } else if (songName && !song) { const n = songName; songName = null; music.want(n); }
}
// la TV no siempre recibe toques: se intenta arrancar de una y, si el navegador bloquea
// el audio sin gesto, cualquier tecla/click del control remoto lo desbloquea
export { unlockAudio };
unlockAudio();
['pointerdown', 'touchstart', 'keydown', 'click'].forEach((ev) => window.addEventListener(ev, unlockAudio));
if (ctx) ctx.onstatechange = () => { if (ctx.state === 'running') unlockAudio(); };
export function audioReady() { return !!ctx; }

// ---------- voces grabadas de los personajes ----------
// /assets/voices/voices.json lista los clips que existen, p.ej.
// { "princess_name": "princess_name.mp3", "princess_power": "princess_power.mp3" }
// claves: <personaje>_name (al elegirlo), <personaje>_power (al tirar el poder) y,
// opcional, <personaje>_power_battle (poder en la arena; si no esta usa _power)
const voiceBufs = {};
let voiceBusyUntil = 0;
const voiceLast = {};
function decode(buf) {
  // los navegadores de TV viejos solo aceptan la version con callbacks
  return new Promise((res, rej) => {
    const p = ctx.decodeAudioData(buf, res, rej);
    if (p && p.then) p.then(res, rej);
  });
}
export async function loadVoices() {
  ensureAudio();
  if (!ctx) return;
  let list = null;
  try { const r = await fetch('/assets/voices/voices.json', { cache: 'no-cache' }); if (r.ok) list = await r.json(); } catch (e) { list = null; }
  if (!list) return;
  await Promise.all(Object.keys(list).map(async (key) => {
    try {
      const r = await fetch('/assets/voices/' + list[key]);
      if (r.ok) voiceBufs[key] = await decode(await r.arrayBuffer());
    } catch (e) { /* sin esa voz */ }
  }));
}
export const voice = {
  has(key) { return !!voiceBufs[key]; },
  // queue=true: se pone en fila (nombres al elegir); si no, suena ya (poderes)
  play(key, queue) {
    const b = voiceBufs[key];
    if (!ctx || !b || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (voiceLast[key] && now - voiceLast[key] < 0.4) return; // no repetir el mismo clip encimado
    voiceLast[key] = now;
    const t = queue ? Math.max(now + 0.02, voiceBusyUntil) : now + 0.02;
    const src = ctx.createBufferSource();
    src.buffer = b;
    const g = ctx.createGain(); g.gain.value = 1.0;
    src.connect(g); g.connect(master);
    src.start(t);
    const end = t + b.duration;
    voiceBusyUntil = Math.max(voiceBusyUntil, end + 0.1);
    // la musica baja mientras habla el personaje
    if (song) {
      const mg = musicBus.gain;
      mg.cancelScheduledValues(t);
      mg.setValueAtTime(mg.value, now);
      mg.linearRampToValueAtTime(0.1, t + 0.08);
      mg.setValueAtTime(0.1, end);
      mg.linearRampToValueAtTime(0.34, end + 0.4);
    }
  },
};
