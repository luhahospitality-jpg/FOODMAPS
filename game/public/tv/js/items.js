import { THREE, PAL, game, toWorld, canvasTexture, roundRect } from './core.js';
import { scene, envTex } from './render.js';
import { tex } from './assets.js';
import { RoundedBoxGeometry } from '/vendor/addons/geometries/RoundedBoxGeometry.js';
import { glowTex } from './karts.js';
import { fx } from './fx.js';
import { heartGeometry } from './models.js';

const group = new THREE.Group();
scene.add(group);

// ---------- BLOQUE "?" (caja de item) ----------
const boxTex = canvasTexture(256, 256, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#b98af5'); g.addColorStop(0.5, '#9B5DE5'); g.addColorStop(1, '#7a3fd0');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 10;
  roundRect(c, 14, 14, w - 28, h - 28, 26); c.stroke();
  c.font = '170px "Lilita One", Impact, sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = 22; c.strokeStyle = '#3a1a70'; c.lineJoin = 'round';
  c.strokeText('?', w / 2, h / 2 + 10);
  c.fillStyle = '#FFF8E7'; c.fillText('?', w / 2, h / 2 + 10);
});
const boxEmit = canvasTexture(256, 256, (c, w, h) => {
  c.fillStyle = '#1a0a33'; c.fillRect(0, 0, w, h);
  c.font = '170px "Lilita One", Impact, sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#ffffff'; c.fillText('?', w / 2, h / 2 + 10);
});
const boxGeo = new RoundedBoxGeometry(130, 130, 130, 2, 20);
const boxMat = new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.22, metalness: 0.08, emissive: '#ffffff', emissiveMap: boxEmit, emissiveIntensity: 1.2, envMap: envTex, envMapIntensity: 0.9 });

// ---------- MONEDA ----------
const coinGeo = new THREE.CylinderGeometry(64, 64, 16, 18);
coinGeo.rotateZ(Math.PI / 2);
const coinSide = new THREE.MeshStandardMaterial({ color: '#f5b400', metalness: 0.75, roughness: 0.28, emissive: '#7a4a00', emissiveIntensity: 0.15, envMap: envTex, envMapIntensity: 0.55 });
let coinCap = null;
function coinMats() {
  if (!coinCap) {
    coinCap = new THREE.MeshStandardMaterial({ map: tex('icon_coin'), transparent: true, alphaTest: 0.3, metalness: 0.55, roughness: 0.3, emissive: '#ffcc33', emissiveMap: tex('icon_coin'), emissiveIntensity: 0.1, envMap: envTex, envMapIntensity: 0.45 });
  }
  return [coinSide, coinCap, coinCap];
}

class Pool {
  constructor(make) { this.make = make; this.items = []; }
  sync(n) {
    while (this.items.length < n) { const o = this.make(); group.add(o); this.items.push(o); }
    this.items.forEach((o, i) => { o.visible = i < n; });
  }
}

// cajas y monedas instanciadas: todas las monedas se dibujan en 3 llamadas (canto + 2 caras)
const MAX_BOXES = 16, MAX_COINS = 120;
let boxInst = null, coinInst = null;
function ensureInst() {
  if (boxInst) return;
  boxInst = new THREE.InstancedMesh(boxGeo, boxMat, MAX_BOXES);
  boxInst.frustumCulled = false;
  boxInst.count = 0;
  coinInst = new THREE.InstancedMesh(coinGeo, coinMats(), MAX_COINS);
  coinInst.frustumCulled = false;
  coinInst.count = 0;
  group.add(boxInst, coinInst);
}
const haloPool = new Pool(() => {
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(PAL.violet).multiplyScalar(1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(420, 420, 1);
  return halo;
});
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
const peelPool = new Pool(() => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('icon_peel'), transparent: true }));
  s.scale.set(190, 250, 1);
  return s;
});
// corazones del modo batalla (solo se agarran a pie): +1 vida
let _heartGeo = null;
const heartPool = new Pool(() => {
  if (!_heartGeo) _heartGeo = heartGeometry(120);
  const m = new THREE.Mesh(_heartGeo, new THREE.MeshStandardMaterial({ color: PAL.red, emissive: PAL.pink, emissiveIntensity: 0.45, roughness: 0.3 }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(PAL.pink).multiplyScalar(1.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(520, 520, 1);
  const g = new THREE.Group();
  g.add(m, halo);
  g.userData.heart = m;
  return g;
});
const flowerPool = new Pool(() => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('icon_pw_flower'), transparent: true, color: new THREE.Color(1.15, 1.15, 1.15) }));
  s.scale.set(260, 250, 1);
  return s;
});

// ---------- MISIL ----------
function buildMissile() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(26, 90, 6, 12), new THREE.MeshStandardMaterial({ color: '#f4f1ff', roughness: 0.3, metalness: 0.2, envMap: envTex }));
  body.rotation.z = Math.PI / 2;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(27, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: PAL.red, roughness: 0.3, metalness: 0.1 }));
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 58;
  g.add(nose);
  const finMat = new THREE.MeshStandardMaterial({ color: PAL.red, roughness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(40, 4, 34), finMat);
    fin.position.x = -46;
    fin.rotation.x = i * Math.PI / 2;
    fin.position.y = Math.sin(i * Math.PI / 2) * 26;
    fin.position.z = Math.cos(i * Math.PI / 2) * 26;
    g.add(fin);
  }
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(PAL.orange).multiplyScalar(2.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  flame.position.x = -85;
  flame.scale.set(120, 120, 1);
  g.add(flame);
  g.userData.flame = flame;
  return g;
}
const missilePool = new Pool(buildMissile);

let prevBoxes = [];
let prevCoins = [];

// interpolacion de misiles (el server manda 20 veces por segundo)
const missileVis = [];

export function updateItems(t, dt, interp) {
  const s = game.state;
  const boxes = s.boxes || [];
  ensureInst();
  haloPool.sync(Math.min(boxes.length, MAX_BOXES));
  boxInst.count = Math.min(boxes.length, MAX_BOXES);
  boxes.forEach((b, i) => {
    if (i >= MAX_BOXES) return;
    const w = toWorld(b.x, b.y);
    const y = 150 + Math.sin(t * 2.2 + i) * 22;
    _e.set(t * 0.7 + i, t * 1.1 + i, 0); _q.setFromEuler(_e); _p.set(w.x, y, w.z);
    boxInst.setMatrixAt(i, _m4.compose(_p, _q, _one));
    haloPool.items[i].position.set(w.x, y, w.z);
  });
  boxInst.instanceMatrix.needsUpdate = true;
  // caja agarrada -> chispas moradas
  if (s.phase === 'racing') prevBoxes.forEach((pb) => {
    if (!boxes.some((b) => b.x === pb.x && b.y === pb.y)) {
      const w = toWorld(pb.x, pb.y);
      fx.sparkles(w.x, 160, w.z, 18, [PAL.violet, PAL.pink, PAL.white, PAL.yellow], 380);
      fx.ring(w.x, w.z, PAL.violet, 700);
    }
  });
  prevBoxes = boxes.slice();

  const coins = s.coins || [];
  coinInst.count = Math.min(coins.length, MAX_COINS);
  coins.forEach((c, i) => {
    if (i >= MAX_COINS) return;
    const w = toWorld(c.x, c.y);
    _e.set(0, t * 3 + i, 0); _q.setFromEuler(_e); _p.set(w.x, 110 + Math.sin(t * 3 + i * 1.3) * 16, w.z);
    coinInst.setMatrixAt(i, _m4.compose(_p, _q, _one));
  });
  coinInst.instanceMatrix.needsUpdate = true;
  if (s.phase === 'racing') prevCoins.forEach((pc) => {
    if (!coins.some((c) => c.x === pc.x && c.y === pc.y)) { const w = toWorld(pc.x, pc.y); fx.coinPop(w.x, w.z); }
  });
  prevCoins = coins.slice();

  const peels = s.peels || [];
  peelPool.sync(peels.length);
  peels.forEach((p, i) => { const w = toWorld(p.x, p.y); peelPool.items[i].position.set(w.x, 115, w.z); });

  const hearts = s.hearts || [];
  heartPool.sync(hearts.length);
  hearts.forEach((h, i) => {
    const w = toWorld(h.x, h.y), g = heartPool.items[i];
    g.position.set(w.x, 170 + Math.sin(t * 3 + i) * 30, w.z);
    g.userData.heart.rotation.y = t * 2.4 + i;
  });

  const flowers = s.flowers || [];
  flowerPool.sync(flowers.length);
  flowers.forEach((f, i) => {
    const w = toWorld(f.x, f.y);
    const o = flowerPool.items[i];
    o.position.set(w.x, 140 + Math.sin(t * 10 + i) * 20, w.z);
    o.material.rotation = Math.sin(t * 8 + i) * 0.3;
    if (Math.random() < 0.5) fx.poison(w.x, w.z);
  });

  const ms = interp.missiles || [];
  missilePool.sync(ms.length);
  ms.forEach((m, i) => {
    const w = toWorld(m.x, m.y);
    const o = missilePool.items[i];
    const prev = missileVis[i];
    if (prev) {
      const dx = w.x - prev.x, dz = w.z - prev.z;
      if (dx * dx + dz * dz > 1) o.rotation.y = Math.atan2(-dz, dx);
    }
    missileVis[i] = { x: w.x, z: w.z };
    o.position.set(w.x, 110, w.z);
    o.userData.flame.scale.setScalar(100 + Math.sin(t * 40 + i) * 25);
    if (Math.random() < 0.8) fx.smoke(w.x - Math.cos(-o.rotation.y) * 90, 110, w.z - Math.sin(-o.rotation.y) * 90);
  });
  missileVis.length = ms.length;
}

export function resetItems() {
  prevBoxes = []; prevCoins = [];
}
