import { THREE } from './core.js';
import { GLTFLoader } from '/vendor/GLTFLoader.js';

const texLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const TEX = {};
let maxAniso = 8;

export function setMaxAnisotropy(v) { maxAniso = v; }

export function loadTex(key, url, opts = {}) {
  return new Promise((resolve) => {
    texLoader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      if (opts.repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      TEX[key] = tex;
      resolve(tex);
    }, undefined, () => resolve(null));
  });
}

export function tex(key) { return TEX[key] || null; }

// imagenes crudas (para armar el atlas de particulas en un canvas)
const IMG = {};
export function loadImg(key, url) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => { IMG[key] = im; resolve(im); };
    im.onerror = () => resolve(null);
    im.src = url;
  });
}
export function img(key) { return IMG[key] || null; }

const SPRITES = ['bunny', 'gorilla', 'princess', 'ice'];
const ICONS = ['coin', 'star', 'crystal', 'torch', 'dust', 'trail', 'sparkle', 'peel', 'pw_gorilla_banana',
  'pw_carrot', 'pw_flower', 'pw_freeze'];

export async function loadCoreAssets() {
  const jobs = [];
  SPRITES.forEach((s) => {
    jobs.push(loadTex(s + '_left', '/assets/chars/' + s + '_left.png'));
    jobs.push(loadTex(s + '_right', '/assets/chars/' + s + '_right.png'));
  });
  ICONS.forEach((i) => {
    jobs.push(loadTex('icon_' + i, '/assets/ui/' + i + '.png'));
    jobs.push(loadImg(i, '/assets/ui/' + i + '.png'));
  });
  jobs.push(loadTex('crowd', '/assets/scenery/crowd.png'));
  jobs.push(loadTex('backdrop_rainbow', '/assets/scenery/backdrop_rainbow.jpg'));
  jobs.push(loadTex('backdrop_banana', '/assets/scenery/backdrop_banana.jpg'));
  await Promise.all(jobs);
}

// ---------- modelos GLTF (Kenney, CC0) ----------
const GLTF = {};
export function loadGltf(url) {
  if (GLTF[url]) return GLTF[url];
  GLTF[url] = new Promise((resolve) => {
    gltfLoader.load(url, (g) => {
      const obj = g.scene;
      // recentrado: algunos .glb de Kenney traen un offset heredado del archivo maestro
      const box = new THREE.Box3().setFromObject(obj);
      const c = box.getCenter(new THREE.Vector3());
      obj.position.set(-c.x, -box.min.y, -c.z);
      const wrap = new THREE.Group();
      wrap.add(obj);
      const size = box.getSize(new THREE.Vector3());
      obj.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => { m.metalness = Math.min(m.metalness ?? 0, 0.1); m.roughness = Math.max(m.roughness ?? 1, 0.55); });
        }
      });
      resolve({ object: wrap, size });
    }, undefined, () => resolve(null));
  });
  return GLTF[url];
}

// clona un GLTF ya cargado escalado para que su mayor dimension mida "size"
export function cloneGltf(entry, size) {
  const inst = entry.object.clone(true);
  const maxDim = Math.max(entry.size.x, entry.size.y, entry.size.z) || 1;
  inst.scale.setScalar(size / maxDim);
  inst.userData.footprint = Math.max(entry.size.x, entry.size.z) * (size / maxDim);
  return inst;
}
