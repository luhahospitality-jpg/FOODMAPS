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

// ---------- calidad adaptativa (la TV Xiaomi no es una PC gamer) ----------
const LEVELS = [
  { name: 'low', pr: 0.7, bloom: false, shadows: false, samples: 0 },
  { name: 'med', pr: 1.0, bloom: true, shadows: true, samples: 0 },
  { name: 'high', pr: Math.min(window.devicePixelRatio || 1, 1.5), bloom: true, shadows: true, samples: 4 },
];
const params = new URLSearchParams(location.search);
const forced = { low: 0, med: 1, high: 2 }[params.get('q')];
const isTvLike = /Android|SmartTV|Smart-TV|MiTV|AFT|BRAVIA|Tizen|WebOS|HbbTV|CrKey/i.test(navigator.userAgent);
const webgl2 = renderer.capabilities.isWebGL2;
// sin WebGL2 (TVs viejas) el post-proceso con render targets HDR no funciona: calidad baja directa
export const quality = { level: !webgl2 ? 0 : forced !== undefined ? forced : (isTvLike ? 1 : 2), forced: forced !== undefined || !webgl2 };

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

function applyQuality() {
  const L = LEVELS[quality.level];
  renderer.setPixelRatio(L.pr);
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
    composer.setPixelRatio(L.pr);
    composer.setSize(window.innerWidth, window.innerHeight);
  } else if (composer) {
    composer.renderTarget1.dispose(); composer.renderTarget2.dispose();
    composer = null; mvPass = null; bloomPass = null; composerSamples = -1;
  }
  document.body.dataset.quality = L.name;
}

export function setQuality(level) {
  quality.level = Math.max(0, Math.min(LEVELS.length - 1, level));
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

// si la TV no llega a ~40 fps, baja la calidad sola (sin volver a subir para no oscilar)
let fpsAcc = 0, fpsFrames = 0, fpsWarmup = 5;
export function trackFps(dt, active) {
  if (!active || quality.forced) { fpsAcc = 0; fpsFrames = 0; return; }
  fpsAcc += dt; fpsFrames++;
  if (fpsAcc < 3) return;
  const fps = fpsFrames / fpsAcc;
  fpsAcc = 0; fpsFrames = 0;
  if (fpsWarmup > 0) { fpsWarmup -= 3; return; }
  if (fps < 40 && quality.level > 0) {
    setQuality(quality.level - 1);
    fpsWarmup = 3;
  } else if (fps < 26 && quality.level === 0 && renderer.getPixelRatio() > 0.55) {
    renderer.setPixelRatio(0.55);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }
}
