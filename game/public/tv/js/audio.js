// musica y efectos sintetizados con WebAudio (sin archivos de audio)
// ---------- musica: tema alegre tipo carrera arcade (sintetizado, sin archivos) ----------
const NOTE_FREQ = {
  C3: 130.81, F3: 174.61, G3: 196.00,
  C4: 261.63, D4: 293.66, E4: 329.63,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
  C6: 1046.50, E6: 1318.51, G6: 1567.98,
};
const TEMPO = 152;
const STEP_SEC = 60 / TEMPO / 2;
// bajo tipo "oom-pah" saltarin (I - I - IV - V) y melodia en arpegio ascendente/descendente: alegre y energico
const BASS_PATTERN = ['C3', null, 'G3', null, 'C3', null, 'G3', null, 'F3', null, 'C3', null, 'G3', null, 'G3', null];
const MELODY_PATTERN = ['C5', 'E5', 'G5', 'E5', 'F5', 'A5', 'G5', 'E5', 'D5', 'F5', 'A5', 'F5', 'G5', 'E5', 'C5', null];

let audioCtx = null, masterGain = null, musicStarted = false, musicTimer = null, stepIndex = 0;

function ensureAudio() {
  if (audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.22;
  masterGain.connect(audioCtx.destination);
}

function playTone(freq, time, dur, type, peak) {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(peak, time + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(g); g.connect(masterGain);
  osc.start(time); osc.stop(time + dur + 0.05);
}

function playSweep(fromFreq, toFreq, time, dur, type, peak) {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(fromFreq, time);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), time + dur);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(peak, time + Math.min(0.02, dur * 0.25));
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(g); g.connect(masterGain);
  osc.start(time); osc.stop(time + dur + 0.05);
}

function playNoise(time, dur, peak, highpass) {
  const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const filt = audioCtx.createBiquadFilter();
  filt.type = highpass ? 'highpass' : 'lowpass';
  filt.frequency.value = highpass ? 4500 : 900;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(peak, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  src.connect(filt); filt.connect(g); g.connect(masterGain);
  src.start(time);
}
function playHat(time, dur, peak) { playNoise(time, dur, peak, true); }

function playKick(time) {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
  g.gain.setValueAtTime(0.5, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
  osc.connect(g); g.connect(masterGain);
  osc.start(time); osc.stop(time + 0.16);
}

function scheduleMusicStep() {
  const time = audioCtx.currentTime + 0.05;
  const bassNote = BASS_PATTERN[stepIndex % BASS_PATTERN.length];
  if (bassNote) playTone(NOTE_FREQ[bassNote], time, STEP_SEC * 1.8, 'triangle', 0.55);
  const melNote = MELODY_PATTERN[stepIndex % MELODY_PATTERN.length];
  if (melNote) playTone(NOTE_FREQ[melNote], time, STEP_SEC * 0.95, 'square', 0.17);
  if (stepIndex % 8 === 0) playKick(time);
  if (stepIndex % 2 === 1) playHat(time, 0.04, 0.07);
  stepIndex++;
}

function unlockAudio() {
  ensureAudio();
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!musicStarted) {
    musicStarted = true;
    scheduleMusicStep();
    musicTimer = setInterval(scheduleMusicStep, STEP_SEC * 1000);
  }
}
// el TV no recibe touches directos: intentamos arrancar de una, y si el navegador
// bloquea el audio sin gesto, cualquier tecla/click/touch del control remoto lo desbloquea
export { unlockAudio };
unlockAudio();
['pointerdown', 'touchstart', 'keydown', 'click'].forEach((ev) => window.addEventListener(ev, unlockAudio));

// ---------- efectos de sonido de juego (cuenta regresiva, items, boost, caidas, vueltas, victoria) ----------
function sfxCountdownBeep(n) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + 0.02;
  if (n > 0) playTone(523.25, t, 0.12, 'square', 0.3);
  else playTone(783.99, t, 0.35, 'square', 0.35);
}
function sfxItemPickup() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + 0.02;
  ['C6', 'E6', 'G6'].forEach((n, i) => playTone(NOTE_FREQ[n], t + i * 0.06, 0.14, 'triangle', 0.22));
}
function sfxPower() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + 0.01;
  playSweep(600, 1400, t, 0.22, 'square', 0.24);
  playNoise(t, 0.2, 0.15, true);
}
function sfxFall() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + 0.01;
  playSweep(700, 90, t, 0.5, 'sawtooth', 0.26);
}
function sfxRespawnPop() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + 0.01;
  playSweep(220, 520, t, 0.15, 'triangle', 0.22);
  playNoise(t, 0.05, 0.12, true);
}
function sfxLap() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + 0.01;
  playTone(NOTE_FREQ.E5, t, 0.1, 'square', 0.2);
  playTone(NOTE_FREQ.G5, t + 0.08, 0.16, 'square', 0.22);
}
function sfxWin() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + 0.02;
  ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => playTone(NOTE_FREQ[n], t + i * 0.13, i === 3 ? 0.5 : 0.15, 'square', 0.3));
}
function sfxCoin() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + 0.01;
  playTone(NOTE_FREQ.G6 || 1567.98, t, 0.08, 'square', 0.16);
  playTone(NOTE_FREQ.C6, t + 0.05, 0.1, 'square', 0.18);
}
function sfxStar() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + 0.01;
  playSweep(280, 1300, t, 0.35, 'sawtooth', 0.26);
  ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'C6'].forEach((n, i) => playTone(NOTE_FREQ[n] || 1046.5, t + 0.05 + i * 0.045, 0.12, 'triangle', 0.2));
}
function sfxShrink() {
  if (!audioCtx) return;
  playSweep(700, 150, audioCtx.currentTime + 0.01, 0.4, 'square', 0.22);
}
function sfxMissileLaunch() {
  if (!audioCtx) return;
  playSweep(200, 950, audioCtx.currentTime + 0.01, 0.3, 'sawtooth', 0.22);
}
function sfxCrash() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + 0.01;
  playNoise(t, 0.3, 0.35, false);
  playSweep(120, 40, t, 0.3, 'sawtooth', 0.28);
}


export const sfx = {
  countdown: (n) => sfxCountdownBeep(n), item: () => sfxItemPickup(), power: () => sfxPower(), fall: () => sfxFall(),
  respawn: () => sfxRespawnPop(), lap: () => sfxLap(), win: () => sfxWin(), coin: () => sfxCoin(), star: () => sfxStar(),
  shrink: () => sfxShrink(), missile: () => sfxMissileLaunch(), crash: () => sfxCrash(),
};
export function audioReady() { return !!audioCtx; }
