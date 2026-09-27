import { THREE, game, toWorld, CHAR_INFO, PAL, clamp } from './core.js';
import { loadCoreAssets } from './assets.js';
import { scene, camera, renderFrame, trackFps, quality, hemi, sun, setBloom, renderer, liteify } from './render.js';
import * as hud from './hud.js';

const params = new URLSearchParams(location.search);

// ---------- carga: fuentes primero (los carteles se pintan en canvas con la fuente del logo) ----------
// (sin "await" suelto en el modulo: los navegadores de TV mas viejos no lo soportan)
let buildTrack, teardownTrack, updateTrack, themeCfg, TRACK, buildDecor, updateDecorFade, faceCrowds, buildArena, buildArenaDecor;
let karts, ensureKart, removeKart, faceAllKarts, updateItems, resetItems, fx, podiumScene, podiumCam, setupPodium, updatePodium, sfx, music;
async function boot() {
  hud.setLoading(0.1, false);
  if (document.fonts && document.fonts.load) {
    await Promise.race([
      Promise.all([document.fonts.load('100px "Lilita One"'), document.fonts.load('600 40px "Fredoka"'), document.fonts.load('60px "Lobster"')]).catch(() => null),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
  }
  hud.setLoading(0.3, false);
  await loadCoreAssets();
  hud.setLoading(0.7, false);
  const mods = await Promise.all([
    import('./track.js'), import('./decor.js'), import('./karts.js'), import('./items.js'), import('./fx.js'), import('./podium.js'), import('./audio.js'), import('./arena.js'),
  ]);
  ({ buildTrack, teardownTrack, updateTrack, themeCfg, TRACK } = mods[0]);
  ({ buildDecor, updateDecorFade, faceCrowds, buildArenaDecor } = mods[1]);
  ({ buildArena } = mods[7]);
  ({ karts, ensureKart, removeKart, faceAllKarts } = mods[2]);
  ({ updateItems, resetItems } = mods[3]);
  ({ fx } = mods[4]);
  ({ podiumScene, podiumCam, setupPodium, updatePodium } = mods[5]);
  ({ sfx, music } = mods[6]);
  fx.init();
  hud.initSelect();
  hud.setLoading(1, true);
  connect();
  animate();
}

// ---------- red + interpolacion (el server manda 20 estados/seg; se dibuja a 60fps) ----------
const snaps = [];
const INTERP_DELAY = 110;
function connect() {
  const socket = io();
  socket.on('state', (s) => {
    const prev = game.state;
    // la forma de la pista llega 1 vez por segundo: mientras tanto se usa la ultima
    if (!s.track && prev && prev.trackId === s.trackId) { s.track = prev.track; s.guardrailSegments = prev.guardrailSegments; s.arena = prev.arena; }
    if (!s.trackList && prev) s.trackList = prev.trackList;
    game.prev = prev;
    game.state = s;
    snaps.push({ t: performance.now(), s });
    while (snaps.length > 14) snaps.shift();
    handleEvents(prev, s);
  });
}

function lerpAngle(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}
function interpolate() {
  if (!snaps.length) return { players: [], missiles: [] };
  const rt = performance.now() - INTERP_DELAY;
  let a = snaps[0], b = snaps[0];
  for (let i = snaps.length - 1; i > 0; i--) {
    if (snaps[i - 1].t <= rt) { a = snaps[i - 1]; b = snaps[i]; break; }
  }
  const k = clamp((rt - a.t) / ((b.t - a.t) || 1), 0, 1);
  const players = b.s.players.map((pb, i) => {
    if (!pb || pb.spectating || pb.eliminated) return null;
    const pa = a.s.players[i];
    if (!pa || Math.hypot(pb.x - pa.x, pb.y - pa.y) > 2500) return { p: pb, x: pb.x, y: pb.y, angle: pb.angle };
    return { p: pb, x: pa.x + (pb.x - pa.x) * k, y: pa.y + (pb.y - pa.y) * k, angle: lerpAngle(pa.angle, pb.angle, k) };
  });
  const ma = a.s.missiles || [], mb = b.s.missiles || [];
  const missiles = mb.map((m, i) => (ma[i] ? { x: ma[i].x + (m.x - ma[i].x) * k, y: ma[i].y + (m.y - ma[i].y) * k } : m));
  return { players, missiles };
}

// ---------- construccion de pista ----------
let builtTrackId = null, building = false;
async function rebuildTrack() {
  const s = game.state;
  building = true;
  const id = s.trackId;
  teardownTrack();
  fx.clear();
  resetItems();
  const battle = s.mode === 'battle' && s.arena;
  const ctx = battle ? buildArena(s) : buildTrack(s);
  const cfg = themeCfg(ctx.theme);
  hemi.color.set(cfg.hemiSky); hemi.groundColor.set(cfg.hemiGround); hemi.intensity = cfg.hemiI;
  sun.color.set(cfg.sun); sun.intensity = cfg.sunI;
  setBloom(ctx.theme === 'banana' ? 0.45 : ctx.theme === 'space' ? 0.95 : 0.8, 0.5, 1.0);
  await (battle ? buildArenaDecor(ctx) : buildDecor(ctx));
  liteify(scene);
  // compilar los shaders ahora (en la carga) y no a mitad de carrera: evita tirones
  try { renderer.compile(scene, camera); } catch (e) { /* no critico */ }
  builtTrackId = id;
  building = false;
}

// ---------- camaras ----------
const camStates = [0, 1, 2, 3].map(() => ({ init: false, x: 0, z: 0, h: 0, shake: 0, fov: 60 }));
function chaseCam(cam, cs, target, dt, boost, intro, foot) {
  if (!cs.init) { cs.x = target.x; cs.z = target.z; cs.h = target.angle; cs.init = true; }
  const kp = 1 - Math.exp(-dt * 16), kh = 1 - Math.exp(-dt * 4.2);
  cs.x += (target.x - cs.x) * kp;
  cs.z += (target.z - cs.z) * kp;
  cs.h = lerpAngle(cs.h, target.angle, kh);
  cs.fov += ((boost ? 72 : 60) - cs.fov) * (1 - Math.exp(-dt * 5));
  cs.shake *= Math.exp(-dt * 6);
  // a pie la camara se acerca y baja
  cs.near = (cs.near || 0) + ((foot ? 1 : 0) - (cs.near || 0)) * (1 - Math.exp(-dt * 4));
  const dist = 780 - 260 * cs.near, height = 400 - 110 * cs.near, ahead = 700 - 300 * cs.near;
  const sx = (Math.random() - 0.5) * 60 * cs.shake, sy = (Math.random() - 0.5) * 50 * cs.shake;
  cam.position.set(cs.x - Math.cos(cs.h) * dist + sx, height + sy, cs.z - Math.sin(cs.h) * dist);
  let lx = cs.x + Math.cos(cs.h) * ahead, ly = 170, lz = cs.z + Math.sin(cs.h) * ahead;
  // 3-2-1: la camara arranca adelante y arriba mirando al kart en la grilla, y baja hasta
  // quedar detras justo en el GO
  if (intro !== undefined && intro < 1) {
    const e = intro * intro * (3 - 2 * intro);
    const side = Math.sin(cs.h), cside = -Math.cos(cs.h);
    const ix = cs.x + Math.cos(cs.h) * 1500 + side * 700, iy = 1100, iz = cs.z + Math.sin(cs.h) * 1500 + cside * 700;
    cam.position.set(ix + (cam.position.x - ix) * e, iy + (cam.position.y - iy) * e, iz + (cam.position.z - iz) * e);
    lx = cs.x + (lx - cs.x) * e; ly = 150 + (ly - 150) * e; lz = cs.z + (lz - cs.z) * e;
  }
  cam.lookAt(lx, ly, lz);
  if (Math.abs(cam.fov - cs.fov) > 0.05) { cam.fov = cs.fov; cam.updateProjectionMatrix(); }
}
function orbitCam(cam, t) {
  const b = TRACK.bounds || { minX: -5000, maxX: 5000, minZ: -2000, maxZ: 2000 };
  const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
  const r = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) * 0.62 + 1800;
  const a = t * 0.06;
  cam.fov = 55; cam.updateProjectionMatrix();
  cam.position.set(cx + Math.cos(a) * r, 3300, cz + Math.sin(a) * r * 0.7);
  cam.lookAt(cx, 0, cz);
}

const SPLIT = {
  1: [[0, 0, 1, 1]],
  2: [[0, 0.5, 1, 0.5], [0, 0, 1, 0.5]],
  3: [[0, 0.5, 1, 0.5], [0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5]],
  4: [[0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5], [0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5]],
};

// ---------- eventos -> sonido / efectos / banners ----------
let finishedAt = 0, goUntil = 0, countdownAt = 0;
function kartPos(slot) {
  const k = karts[slot];
  if (!k) return null;
  const g = k.onFoot && k.walker ? k.walker.g : k.group;
  return { x: g.position.x, z: g.position.z };
}
function handleEvents(prev, next) {
  if (!prev) return;
  if (next.phase === 'countdown' && prev.phase !== 'countdown') { countdownAt = performance.now(); sfx.ready(); }
  if (next.phase === 'countdown' && next.countdown !== prev.countdown) sfx.countdown(next.countdown);
  if (next.phase === 'racing' && prev.phase === 'countdown') { goUntil = performance.now() + 900; sfx.countdown(0); }
  if (next.phase === 'finished' && prev.phase !== 'finished') finishedAt = performance.now();
  // ultima vuelta del que va adelante: aviso y la musica acelera
  if (next.phase === 'racing') {
    const L = next.laps || 3;
    const lead = (next.players || []).some((p, i) => p && !p.finished && p.lap === L - 1 && (!prev.players[i] || prev.players[i].lap < L - 1));
    const first = !(prev.players || []).some((p) => p && p.lap >= L - 1);
    if (lead && first && L > 1) { sfx.finalLap(); music.faster(); }
  }
  (next.players || []).forEach((p, i) => {
    const op = (prev.players || [])[i];
    if (!p || !op || p.spectating || next.phase !== 'racing') return;
    const pos = kartPos(i) || toWorld(p.x, p.y);
    if (p.item && !op.item) { sfx.item(); hud.startItemRoll(i); }
    if (!p.item && op.item === 'missile') { sfx.missile(); fx.text('MISSILE!', pos.x, pos.z, PAL.red); }
    if (!p.item && op.item === 'mushroom') {
      sfx.shrink();
      next.players.forEach((o, j) => { if (o && !o.spectating && j !== i) { const q = kartPos(j) || toWorld(o.x, o.y); fx.poof(q.x, 150, q.z, PAL.pink); fx.text('MINI!', q.x, q.z, PAL.pink, 420); } });
    }
    if ((p.hitSeq || 0) > (op.hitSeq || 0)) {
      const HIT_TXT = { runover: '¡PISADO!', side: '¡PUM!', punch: '¡PIÑA!', missile: '¡BOOM!', carrot: '¡ZANAHORIAZO!', bat: '¡BATAZO!', slam: '¡CONGELADO!', bomb: '¡BOOM FLOR!', dash: '¡EMBESTIDA!' };
      if (p.hitCause === 'bomb') fx.explosion(pos.x, pos.z);
      if (p.hitCause === 'bat' || p.hitCause === 'dash') sfx.bonk();
      fx.text(HIT_TXT[p.hitCause] || '¡AY!', pos.x, pos.z, PAL.orange, 760);
      if (p.hitCause === 'runover') { sfx.squish(); fx.poof(pos.x, 80, pos.z, PAL.white); }
      if (p.hitCause === 'punch') sfx.punch();
      hud.hitFlash(i); camStates[i].shake = 1.2;
    }
    if (p.eliminated && !op.eliminated) {
      sfx.ko(); fx.explosion(pos.x, pos.z); fx.text('K.O.!', pos.x, pos.z, PAL.red, 900);
    }
    if ((p.heartSeq || 0) > (op.heartSeq || 0)) { sfx.heart(); fx.sparkles(pos.x, 220, pos.z, 16, [PAL.pink, PAL.red, PAL.white], 360); fx.text('+1 ♥', pos.x, pos.z, PAL.pink, 600); }
    if ((p.swingSeq || 0) > (op.swingSeq || 0)) {
      // GOLPE: el kart/personaje hace la animacion; a pie suena el golpe, en el auto la embestida
      if (karts[i]) karts[i].swingAt = performance.now() / 1000;
      if (p.onFoot || p.character === 'rabbit') sfx.swing(); else { sfx.star(); fx.ring(pos.x, pos.z, PAL.white, 700, 0.5, 0.4); }
    }
    if ((p.trapSeq || 0) > (op.trapSeq || 0)) { sfx.trap(); fx.text('¡ATRAPADO!', pos.x, pos.z, PAL.yellow, 700); fx.poof(pos.x, 120, pos.z, PAL.yellow); }
    if (!!p.onFoot !== !!op.onFoot) { sfx.door(); if (karts[i]) karts[i].squash = 1; }
    if (p.finished && !op.finished) {
      sfx.finish(p.finishPlace === 1);
      fx.confetti(pos.x, 300, pos.z, 60, 700);
    }
    if (p.turbo && !op.turbo && p.character === 'ice') hud.banner(i, 'TURBO HIELO!', 1400, 'var(--turq)');
    if (p.starActive && !op.starActive) { sfx.star(); hud.banner(i, 'BOOST!', 1200, 'var(--turq)'); fx.ring(pos.x, pos.z, PAL.turquoise, 900); }
    if (p.crashed && !op.crashed) {
      sfx.crash(); fx.explosion(pos.x, pos.z); fx.text('HIT!', pos.x, pos.z, PAL.red);
      hud.hitFlash(i); camStates[i].shake = 1.4;
      if (karts[i]) karts[i].squash = 1;
    }
    if (p.slowed && !op.slowed && !p.crashed) { sfx.slip(); fx.text('OOPS!', pos.x, pos.z, PAL.violet, 460); fx.sparkles(pos.x, 160, pos.z, 10, [PAL.violet, PAL.yellow], 260); camStates[i].shake = 0.6; }
    if ((p.coins || 0) > (op.coins || 0) && !p.bot) sfx.coin();
    if (p.falling && !op.falling) {
      sfx.fall();
      if (TRACK.theme === 'banana') setTimeout(() => fx.splash(pos.x, pos.z), 350);
      hud.banner(i, 'OUCH!', 900, 'var(--red)');
    }
    if (!p.falling && op.falling) {
      sfx.respawn();
      const w = toWorld(p.x, p.y);
      setTimeout(() => fx.sparkles(w.x, 120, w.z, 14, [PAL.white, PAL.yellow, PAL.pink], 300), 30);
      if (karts[i]) karts[i].squash = 1;
    }
    if (p.lap > op.lap && p.lap < (next.laps || 3)) {
      sfx.lap();
      const final = p.lap === (next.laps || 3) - 1;
      hud.banner(i, final ? 'FINAL LAP!' : 'LAP ' + (p.lap + 1) + '/' + (next.laps || 3), 1700, final ? 'var(--red)' : 'var(--yellow)');
      fx.confetti(pos.x, 300, pos.z, 30, 500);
    }
    if ((p.powerSeq || 0) > (op.powerSeq || 0) && next.mode === 'battle') {
      // poderes de batalla
      const c = p.character;
      sfx.power(c);
      if (c === 'rabbit') { sfx.bonk(); fx.text('¡BATAZO!', pos.x, pos.z, PAL.orange, 700); fx.ring(pos.x, pos.z, PAL.orange, 1300, 0.7, 0.45); fx.sparkles(pos.x, 200, pos.z, 12, [PAL.orange, PAL.green, PAL.yellow], 520); camStates[i].shake = 0.8; }
      if (c === 'gorilla') { fx.text('¡BANANAS TRAMPA!', pos.x, pos.z, PAL.yellow, 700); fx.poof(pos.x, 100, pos.z, PAL.yellow); }
      if (c === 'princess') { fx.text('¡FLORES BOMBA!', pos.x, pos.z, PAL.pink, 700); fx.sparkles(pos.x, 200, pos.z, 18, [PAL.violet, PAL.pink], 420); }
      if (c === 'ice') { sfx.slam(); fx.text('¡ESTALLIDO!', pos.x, pos.z, PAL.ice, 700); fx.ring(pos.x, pos.z, PAL.ice, 2300, 1.0, 0.8); fx.ring(pos.x, pos.z, PAL.white, 1500, 0.7, 0.6); fx.sparkles(pos.x, 220, pos.z, 30, [PAL.ice, PAL.white, PAL.blue], 900); fx.explosion(pos.x, pos.z); camStates[i].shake = 1.4; }
    } else if ((p.powerSeq || 0) > (op.powerSeq || 0)) {
      sfx.power(p.character);
      const c = p.character;
      if (c === 'rabbit') { fx.text('WHACK!', pos.x, pos.z, PAL.orange); fx.ring(pos.x, pos.z, PAL.orange, 1100); fx.sparkles(pos.x, 200, pos.z, 14, [PAL.orange, PAL.green, PAL.yellow], 420); camStates[i].shake = 0.5; }
      if (c === 'gorilla') { fx.text('BANANA!', pos.x, pos.z, PAL.yellow); fx.poof(pos.x, 100, pos.z, PAL.yellow); }
      if (c === 'princess') { fx.text('POISON!', pos.x, pos.z, PAL.violet); fx.sparkles(pos.x, 200, pos.z, 18, [PAL.violet, PAL.pink], 420); }
      if (c === 'ice') { fx.text('FREEZE!', pos.x, pos.z, PAL.ice); fx.ring(pos.x, pos.z, PAL.ice, 2400, 1.0, 0.8); fx.sparkles(pos.x, 220, pos.z, 20, [PAL.ice, PAL.white, PAL.blue], 600); }
    }
  });
}

// ---------- loop ----------
const clock = new THREE.Clock();
const DUST = { rainbow: '#fff4fc', banana: '#fff6e2', space: '#dfe6ff' };
let podiumReady = false;
let liteTick = 0;

const stats = { js: 0, frames: 0 };
let skipFrame = false;
function animate() {
  requestAnimationFrame(animate);
  // TV lenta: se dibuja 1 de cada 2 cuadros (30 fps parejos)
  if (quality.half) { skipFrame = !skipFrame; if (skipFrame) return; }
  fx.rate = quality.lite ? 0.5 : 1;
  const tStart = performance.now();
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.1);
  // la camara usa el tiempo real (hasta 0.4s): en una TV lenta, con dt recortado se quedaba atras del kart
  const camDt = Math.min(rawDt, 0.4);
  const t = clock.elapsedTime;
  game.t = t; game.dt = dt;
  const s = game.state;

  if (s.track && s.track.length && s.trackId !== builtTrackId && !building) rebuildTrack();

  const phase = s.phase;
  const now = performance.now();
  const showFinishFlash = phase === 'finished' && now - finishedAt < 2300;
  const showPodium = phase === 'finished' && !showFinishFlash;

  hud.setSelectVisible(phase === 'select');
  music.want(phase === 'select' ? 'menu' : phase === 'racing' ? (TRACK.theme === 'battle' ? 'battle' : 'race_' + TRACK.theme) : phase === 'finished' ? 'victory' : null);
  document.getElementById('url').style.display = phase === 'select' ? 'block' : 'none';
  hud.updateCountdown(phase === 'countdown' || now < goUntil);
  hud.setFinishFlash(showFinishFlash);

  const ip = interpolate();
  // karts
  s.players.forEach((p, i) => { if (!p || p.spectating || p.eliminated) removeKart(i); });
  ip.players.forEach((q, i) => {
    if (!q) return;
    const k = ensureKart(i, q.p);
    const w = toWorld(q.x, q.y);
    w.angle = q.angle;
    k.update(q.p, w, t, dt, phase);
    if (phase === 'racing' && !q.p.falling) {
      if (k.speed > 700 && Math.random() < 0.35 + (Math.abs(q.p.steer) > 0.6 ? 0.4 : 0)) {
        const rx = w.x - Math.cos(q.angle) * 90, rz = w.z - Math.sin(q.angle) * 90;
        fx.dust(rx, rz, DUST[TRACK.theme] || '#fff', 1, 0.8 + Math.min(k.speed / 3000, 0.6));
      }
      if (q.p.dashing) fx.trail(w.x, w.z, q.angle, [PAL.white, PAL.yellow, PAL.orange][Math.floor(t * 20) % 3]);
      if (q.p.turbo && !q.p.starActive) fx.trail(w.x, w.z, q.angle, q.p.character === 'ice' ? [PAL.ice, PAL.white, PAL.turquoise][Math.floor(t * 20) % 3] : [PAL.orange, PAL.yellow, PAL.green][Math.floor(t * 20) % 3]);
      if (q.p.starActive) {
        fx.trail(w.x, w.z, q.angle, [PAL.turquoise, PAL.pink, PAL.yellow][Math.floor(t * 20) % 3]);
        if (Math.random() < 0.5) fx.sparkles(w.x, 180, w.z, 1, [PAL.yellow, PAL.white, PAL.pink], 200, 0.7);
      }
      if (s.ice && s.ice.active && s.ice.ownerId !== q.p.id && !q.p.starActive && !q.p.finished) fx.snow(w.x, w.z, 1400, 22, dt);
    }
  });

  updateItems(t, dt, ip);
  updateTrack(t, s.ice && s.ice.active);
  if (TRACK.theme === 'rainbow') {
    const racers = ip.players.filter(Boolean);
    if (phase === 'racing' || phase === 'countdown') racers.forEach((q) => { const w = toWorld(q.x, q.y); fx.ambientConfetti(w.x, w.z, 2600, quality.lite ? 6 : 14, dt); });
  }
  fx.update(dt);

  // ---------- vistas ----------
  let views;
  if (showPodium) {
    if (!podiumReady) {
      setupPodium(s.ranking && s.ranking.length ? s.ranking : [s.winnerId], s.players);
      podiumReady = true;
    }
    updatePodium(t);
    const w = s.players.find((p) => p && p.id === s.winnerId);
    const left = Math.max(0, Math.ceil((12000 - (now - finishedAt)) / 1000));
    hud.setPodium(true, w ? w.id + ' · ' + CHAR_INFO[w.character].full : '', 'Toca START en tu celular · menú en ' + left + 's');
    views = [{ rect: [0, 0, 1, 1], scene: podiumScene, camera: podiumCam }];
    hud.showHud(false);
  } else {
    podiumReady = phase === 'finished' ? podiumReady : false;
    hud.setPodium(false);
    // una vista por humano; los CPU corren pero no tienen pantalla propia
    const racers = (phase === 'racing' || phase === 'countdown' || phase === 'finished')
      ? s.players.map((p, i) => (p && !p.bot && !p.spectating ? i : -1)).filter((i) => i >= 0) : [];
    if (racers.length) {
      const layout = SPLIT[racers.length];
      views = racers.map((slot, idx) => ({
        slot, rect: layout[idx], scene, camera,
        before: (cam) => {
          let k = karts[slot];
          let q = ip.players[slot];
          // eliminado en batalla: la camara sigue a alguien que siga en juego
          if (!k || !q) { const j = karts.findIndex((kk, jj) => kk && ip.players[jj]); if (j >= 0) { k = karts[j]; q = ip.players[j]; } }
          const foot = !!(q && q.p.onFoot && k && k.walker);
          const tp = foot ? k.walker.g.position : k && k.group.position;
          if (k && q) chaseCam(cam, camStates[slot], { x: tp.x, z: tp.z, angle: q.angle }, camDt, q.p.starActive,
            phase === 'countdown' ? clamp((now - countdownAt) / 2700, 0, 1) : undefined, foot);
          // la ruta congelada la ven los demas; el que tiro el hielo la ve normal
          TRACK.roadUniforms.uFreeze.value = s.ice && s.ice.active && q && s.ice.ownerId === q.p.id ? 0 : (TRACK.freezeLevel || 0);
          faceAllKarts(cam, 'v' + slot, slot);
          faceCrowds(cam);
          updateDecorFade(cam.position);
        },
      }));
      hud.layoutHud(views);
      hud.showHud(phase === 'racing' || phase === 'countdown');
      hud.updateHud();
    } else {
      camStates.forEach((c) => { c.init = false; });
      views = [{ rect: [0, 0, 1, 1], scene, camera, before: (cam) => { orbitCam(cam, t); faceAllKarts(cam, 'orbit', -1); faceCrowds(cam); } }];
      hud.showHud(false);
    }
  }
  if (phase === 'select') hud.updateSelect();

  const tJs = performance.now();
  if (builtTrackId || showPodium) renderFrame(views);
  stats.js += (tJs - tStart); stats.render = (stats.render || 0) + (performance.now() - tJs); stats.frames++;
  trackFps(rawDt, phase === 'racing' || phase === 'countdown' || phase === 'select');
  // karts/items nuevos tambien pasan a materiales livianos en modo TV
  if (quality.lite && (++liteTick % 45) === 0) { liteify(scene); liteify(podiumScene); }
  if (params.get('debug')) hud.setQualityBadge(['tv', 'med', 'high'][quality.level] + ' · x' + quality.pr.toFixed(2) + ' · ' + Math.round(1 / Math.max(rawDt, 0.001)) + 'fps' + (quality.half ? ' · 30' : ''));
}
window.__br = { game, quality, fx, renderer, stats, sceneRef: scene };
boot().catch((e) => { if (window.__showBootError) window.__showBootError(e); else throw e; });
