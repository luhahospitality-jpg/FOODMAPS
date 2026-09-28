// Render: renderer, niveles de calidad, resolución dinámica y postproceso.
import * as THREE from '../../vendor/three.module.min.js';

const params = new URLSearchParams(location.search);

function detectarCalidad() {
  const ua = navigator.userAgent || '';
  if (/Android|AFT|BRAVIA|SmartTV|SMART-TV|Tizen|Web0S|WebOS|CrKey|HbbTV|Mobile|MiTV|Xiaomi/i.test(ua)) return 'tv';
  const nucleos = navigator.hardwareConcurrency || 4;
  return nucleos <= 4 ? 'med' : 'high';
}

export const calidad = (function () {
  const q = params.get('q');
  return q === 'tv' || q === 'med' || q === 'high' ? q : detectarCalidad();
})();
export const esTV = calidad === 'tv';
export const debug = params.get('debug') === '1';

// Material según la calidad: Lambert en TV, PBR en PC
export function material(opts) {
  opts = opts || {};
  const o = {};
  for (const k in opts) if (k !== 'rough' && k !== 'metal') o[k] = opts[k];
  if (esTV) return new THREE.MeshLambertMaterial(o);
  o.roughness = opts.rough !== undefined ? opts.rough : 0.8;
  o.metalness = opts.metal !== undefined ? opts.metal : 0.0;
  return new THREE.MeshStandardMaterial(o);
}

export function crearRender(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !esTV,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.info.autoReset = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = esTV ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  if (!esTV) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const prParam = parseFloat(params.get('pr'));
  const escalaBase = prParam > 0 ? prParam : (esTV ? 0.6 : calidad === 'med' ? 0.85 : 1);
  let escala = escalaBase;
  let mitad = false;            // modo 30 fps (dibuja 1 de cada 2 cuadros)

  const camara = new THREE.PerspectiveCamera(38, 16 / 9, 0.5, 400);
  let composer = null, bloom = null;

  function aplicarTam() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(dpr * escala);
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    if (composer) {
      composer.setPixelRatio(dpr * escala);
      composer.setSize(w, h);
    }
  }

  async function prepararPost(escena) {
    if (esTV || params.get('bloom') === '0') return;
    const { EffectComposer, RenderPass, UnrealBloomPass, OutputPass } = THREE;
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(escena, camara));
    bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), calidad === 'high' ? 0.45 : 0.35, 0.5, 0.82);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    aplicarTam();
  }

  window.addEventListener('resize', aplicarTam);
  aplicarTam();

  // ---- medición de fps y resolución dinámica ----
  let cuadros = 0, t0 = performance.now(), fps = 60, bueno = 0;
  let cuadroPar = false;
  function medir(ahora) {
    cuadros++;
    const dt = ahora - t0;
    if (dt < 2000) return;
    fps = (cuadros * 1000) / dt;
    cuadros = 0; t0 = ahora;
    if (params.get('pr') || mitad) return;  // resolución forzada o ya en 30 fps parejos
    if (fps < 48) {
      if (escala > 0.42) { escala = Math.max(0.4, escala * 0.85); aplicarTam(); }
      else mitad = true;                     // ni con la resolución mínima llega: 30 fps parejos
      bueno = 0;
    } else if (fps > 58 && escala < escalaBase) {
      bueno++;
      if (bueno > 3) { escala = Math.min(escalaBase, escala * 1.1); aplicarTam(); bueno = 0; }
    }
  }

  function dibujar(escena, ahora) {
    medir(ahora);
    if (mitad) { cuadroPar = !cuadroPar; if (cuadroPar) return false; }
    renderer.info.reset();
    if (composer) composer.render();
    else renderer.render(escena, camara);
    return true;
  }

  function info() {
    return {
      fps: Math.round(mitad ? fps / 2 : fps), calidad, escala: escala.toFixed(2), mitad,
      calls: renderer.info.render.calls, tris: renderer.info.render.triangles,
    };
  }

  return { renderer, camara, dibujar, info, prepararPost, aplicarTam };
}
