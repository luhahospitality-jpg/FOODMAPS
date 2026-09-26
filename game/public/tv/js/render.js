import { THREE } from './core.js';
import { setMaxAnisotropy } from './assets.js';
import { EffectComposer } from '/vendor/addons/postprocessing/EffectComposer.js';
import { Pass } from '/vendor/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from '/vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '/vendor/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from '/vendor/addons/environments/RoomEnvironment.js';

export const canvas = document.getElementById('gl');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
// sin curva de tono: el arte del moodboard tiene que verse con sus colores exactos.
// El "glow" sale del bloom, que solo toma lo que brilla por encima de 1.0 (emisivos)
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// las sombras son de props estaticos: se calculan una sola vez por pista
renderer.shadowMap.autoUpdate = false;
setMaxAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(60, 16 / 9, 20, 40000);

const pmrem = new THREE.PMREMGenerator(renderer);
// el entorno solo se aplica a materiales brillantes (monedas, cajas, cristales): aplicado
// a toda la escena sumaba demasiada luz y lavaba los colores
export const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

export const hemi = new THREE.HemisphereLight('#dfe6ff', '#7a5a8a', 1.4);
export const sun = new THREE.DirectionalLight('#fff1d8', 2.3);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 3;
scene.add(hemi, sun, sun.target);

// sombra estatica que cubre toda la pista (se "hornea" al construirla)
export function fitSunShadow(minX, maxX, minZ, maxZ) {
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const r = Math.max(maxX - minX, maxZ - minZ) / 2 + 2500;
  sun.position.set(cx + 3200, 7000, cz + 2600);
  sun.target.position.set(cx, 0, cz);
  sun.target.updateMatrixWorld();
  const cam = sun.shadow.camera;
  cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
  cam.near = 100; cam.far = 26000;
  cam.updateProjectionMatrix();
  renderer.shadowMap.needsUpdate = true;
}

// ---------- varias camaras (pantalla dividida) dentro de un mismo render target ----------
function renderViewsInto(target, views) {
  renderer.setRenderTarget(target);
  renderer.setScissorTest(false);
  renderer.setClearColor(0x05050c, 1);
  renderer.clear(true, true, false);
  const W = target ? target.width : window.innerWidth;
  const H = target ? target.height : window.innerHeight;
  for (const v of views) {
    const [fx, fy, fw, fh] = v.rect;
    const x = Math.round(fx * W), y = Math.round(fy * H), w = Math.round(fw * W), h = Math.round(fh * H);
    v.camera.aspect = w / h;
    v.camera.updateProjectionMatrix();
    if (v.before) v.before(v.camera, v);
    if (target) {
      target.viewport.set(x, y, w, h);
      target.scissor.set(x, y, w, h);
      target.scissorTest = true;
      renderer.setRenderTarget(target);
    } else {
      renderer.setViewport(x, y, w, h);
      renderer.setScissor(x, y, w, h);
      renderer.setScissorTest(true);
    }
    renderer.render(v.scene, v.camera);
  }
  if (target) {
    target.viewport.set(0, 0, target.width, target.height);
    target.scissor.set(0, 0, target.width, target.height);
    target.scissorTest = false;
    renderer.setRenderTarget(target);
  } else {
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  }
}

class MultiViewPass extends Pass {
  constructor() {
    super();
    this.views = [];
    this.needsSwap = false;
  }
  render(r, writeBuffer, readBuffer) {
    renderViewsInto(this.renderToScreen ? null : readBuffer, this.views);
  }
}

// ---------- calidad adaptativa ----------
// "tv": sin bloom ni sombras, materiales Lambert (mucho mas baratos que los PBR) y
// resolucion interna dinamica. Es el perfil por defecto en TVs / Android.
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
const LEVELS = [
  { name: 'tv', prMin: 0.42, prMax: 1.0, prStart: 0.7, bloom: false, shadows: false, samples: 0, lite: true },
  { name: 'med', prMin: 0.7, prMax: 1.0, prStart: 1.0, bloom: true, shadows: true, samples: 0, lite: false },
  { name: 'high', prMin: 0.8, prMax: DPR, prStart: DPR, bloom: true, shadows: true, samples: 4, lite: false },
];
const params = new URLSearchParams(location.search);
const forced = { low: 0, tv: 0, med: 1, high: 2 }[params.get('q')];
const isTvLike = /Android|SmartTV|Smart-TV|MiTV|Mi TV|AFT|BRAVIA|Tizen|WebOS|HbbTV|CrKey|TV/i.test(navigator.userAgent);
const webgl2 = renderer.capabilities.isWebGL2;
const startLevel = !webgl2 ? 0 : forced !== undefined ? forced : (isTvLike ? 0 : 2);
export const quality = { level: startLevel, forced: forced !== undefined || !webgl2, pr: LEVELS[startLevel].prStart, lite: LEVELS[startLevel].lite };
// ?pr=0.6 fija la resolucion interna (desactiva la resolucion dinamica); ?lite=0 fuerza materiales PBR
const forcedPr = parseFloat(params.get('pr'));
if (forcedPr > 0) quality.pr = forcedPr;
const forcedLite = params.get('lite');

let composer = null, mvPass = null, bloomPass = null, composerSamples = -1;

function buildComposer(samples) {
  if (composer) { composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); }
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples });
  composer = new EffectComposer(renderer, rt);
  mvPass = new MultiViewPass();
  composer.addPass(mvPass);
  bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.6, 0.45, 1.0);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  composerSamples = samples;
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(window.innerWidth, window.innerHeight);
}

export function setBloom(strength, radius, threshold) {
  if (!bloomPass) return;
  bloomPass.strength = strength;
  if (radius !== undefined) bloomPass.radius = radius;
  if (threshold !== undefined) bloomPass.threshold = threshold;
}

// materiales PBR -> Lambert (misma textura/color/emisivo, mucho menos trabajo por pixel)
const LITE = new WeakMap();
function toLambert(m) {
  if (!m || !m.isMeshStandardMaterial) return m;
  let l = LITE.get(m);
  if (l) return l;
  l = new THREE.MeshLambertMaterial({
    color: m.color, map: m.map, emissive: m.emissive, emissiveMap: m.emissiveMap, emissiveIntensity: m.emissiveIntensity,
    transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side, vertexColors: m.vertexColors,
    flatShading: m.flatShading, depthWrite: m.depthWrite, fog: m.fog,
    polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits,
  });
  if (m.onBeforeCompile && m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) {
    l.onBeforeCompile = m.onBeforeCompile;
    const key = m.customProgramCacheKey.bind(m);
    l.customProgramCacheKey = () => 'lite-' + key();
  }
  l.userData = m.userData;
  LITE.set(m, l);
  return l;
}
export function liteify(root) {
  if (!quality.lite) return;
  root.traverse((o) => {
    if (!o.material) return;
    o.material = Array.isArray(o.material) ? o.material.map(toLambert) : toLambert(o.material);
  });
}

function capPr(pr) {
  // nunca mas de ~1920 px de ancho de render (en TVs 4K el navegador puede reportar mas)
  const maxW = quality.lite ? 1600 : 2560;
  return Math.min(pr, maxW / Math.max(1, window.innerWidth));
}

function applyQuality() {
  const L = LEVELS[quality.level];
  quality.lite = forcedLite === '0' ? false : forcedLite === '1' ? true : L.lite;
  quality.pr = forcedPr > 0 ? forcedPr : Math.max(L.prMin, Math.min(L.prMax, quality.pr));
  renderer.setPixelRatio(capPr(quality.pr));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if (renderer.shadowMap.enabled !== L.shadows) {
    renderer.shadowMap.enabled = L.shadows;
    renderer.shadowMap.needsUpdate = true;
    scene.traverse((o) => {
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; });
    });
  }
  if (L.bloom) {
    if (!composer || composerSamples !== L.samples) {
      try { buildComposer(L.samples); } catch (e) { console.warn('sin post-proceso', e); quality.level = 0; composer = null; return applyQuality(); }
    }
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(window.innerWidth, window.innerHeight);
  } else if (composer) {
    composer.renderTarget1.dispose(); composer.renderTarget2.dispose();
    composer = null; mvPass = null; bloomPass = null; composerSamples = -1;
  }
  liteify(scene);
  document.body.dataset.quality = L.name;
}

export function setQuality(level) {
  quality.level = Math.max(0, Math.min(LEVELS.length - 1, level));
  quality.pr = LEVELS[quality.level].prStart;
  applyQuality();
}

window.addEventListener('resize', applyQuality);
applyQuality();

export function renderFrame(views) {
  if (composer) {
    mvPass.views = views;
    composer.render();
  } else {
    renderViewsInto(null, views);
  }
}

// resolucion dinamica: cada segundo mira los fps; si no llega, baja la resolucion interna
// (y si ya esta al minimo, baja de nivel). Si sobra, la vuelve a subir de a poco.
let fpsAcc = 0, fpsFrames = 0, good = 0, warm = 2;
export function trackFps(dt, active) {
  if (!active || forcedPr > 0) { fpsAcc = 0; fpsFrames = 0; return; }
  fpsAcc += dt; fpsFrames++;
  if (fpsAcc < 1) return;
  const fps = fpsFrames / fpsAcc;
  fpsAcc = 0; fpsFrames = 0;
  if (warm > 0) { warm--; return; }
  const L = LEVELS[quality.level];
  if (fps < 48) {
    good = 0;
    if (quality.pr > L.prMin + 0.01) {
      quality.pr = Math.max(L.prMin, quality.pr * (fps < 30 ? 0.8 : 0.9));
      applyQuality();
    } else if (quality.level > 0 && !quality.forced) {
      setQuality(quality.level - 1);
    }
    warm = 1;
  } else if (fps > 57) {
    if (++good >= 3 && quality.pr < L.prMax - 0.01) {
      quality.pr = Math.min(L.prMax, quality.pr + 0.05);
      applyQuality();
      good = 0;
      warm = 1;
    }
  } else {
    good = 0;
  }
}
