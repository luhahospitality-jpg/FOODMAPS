import { THREE, PAL, RAINBOW, canvasTexture, shade } from './core.js';
import { scene, camera, envTex, quality } from './render.js';
import { tex, loadGltf, cloneGltf } from './assets.js';
import { fx } from './fx.js';
import { TRACK, trackGroup, Instancer, unitRoundedBox, unitBox, blockMaterial, groundTop, distPts, pointOnCenter } from './track.js';

// ---------- ubicador sin superposiciones ----------
class Placer {
  constructor() { this.items = []; this.cell = 600; this.grid = new Map(); }
  free(x, z, r) {
    const c = this.cell, ix = Math.floor(x / c), iz = Math.floor(z / c);
    const span = Math.ceil((r + 900) / c);
    for (let a = ix - span; a <= ix + span; a++) for (let b = iz - span; b <= iz + span; b++) {
      const list = this.grid.get(a + ',' + b);
      if (!list) continue;
      for (const it of list) if (Math.hypot(it.x - x, it.z - z) < it.r + r) return false;
    }
    return true;
  }
  add(x, z, r) {
    const k = Math.floor(x / this.cell) + ',' + Math.floor(z / this.cell);
    if (!this.grid.has(k)) this.grid.set(k, []);
    this.grid.get(k).push({ x, z, r });
  }
  tryPlace(x, z, r) { if (!this.free(x, z, r)) return false; this.add(x, z, r); return true; }
}

// punto sobre el terreno a "off" del borde del vacio, del lado "side" de la pista
function landSpot(ctx, s, side, off) {
  const c = pointOnCenter(ctx.pts, ctx.E, s);
  const d = ctx.half + TRACK.gap + off;
  const x = c.x + c.nx * side * d, z = c.z + c.nz * side * d;
  if (distPts(x, z, ctx.pts) < ctx.half + TRACK.gap + Math.min(off, 250)) return null;
  const top = groundTop(x, z);
  if (top === null) return null;
  // mirando hacia la pista
  const face = Math.atan2(c.x - x, c.z - z);
  return { x, z, y: top, face, c };
}

// ---------- cielo, telon del moodboard, nubes ----------
function buildSky(ctx) {
  const cfg = ctx.cfg;
  const top = ctx.theme === 'banana' ? '#3aa8ff' : ctx.theme === 'space' ? '#03030a' : '#241a5c';
  const bottom = ctx.theme === 'banana' ? '#bfe9ff' : ctx.theme === 'space' ? '#141433' : '#7a4fc9';
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bottom: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y*1.6+0.15,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, h),1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 32, 16), skyMat);
  sky.renderOrder = -10;
  trackGroup.add(sky);
  scene.background = new THREE.Color(cfg.sky);
  scene.fog = new THREE.Fog(cfg.fog, cfg.fogNear, cfg.fogFar);

  const bd = tex('backdrop_' + ctx.theme);
  if (bd) {
    const t = bd.clone();
    t.needsUpdate = true;
    t.wrapS = THREE.MirroredRepeatWrapping;
    // el telon rodea toda la pista (las pistas nuevas son mucho mas grandes)
    const R = Math.max(8700, ctx.span + 4200), hk = R / 8700;
    t.repeat.set(Math.max(8, Math.round(8 * hk)), 1);
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(R, R, 3700 * hk, 64, 1, true),
      new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false })
    );
    cyl.position.y = 1450 * hk;
    trackGroup.add(cyl);
  }

  if (ctx.theme === 'space') {
    const n = 1400, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = ctx.rand() * Math.PI * 2, ph = Math.acos(ctx.rand() * 0.95), r = 20000;
      p[i * 3] = Math.cos(th) * Math.sin(ph) * r; p[i * 3 + 1] = Math.cos(ph) * r * 0.8 + 800; p[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * r;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    trackGroup.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 3, sizeAttenuation: false, fog: false })));
    // planeta con anillo en el cielo
    const planetTex = canvasTexture(512, 256, (c, w, h) => {
      const g2 = c.createLinearGradient(0, 0, 0, h);
      g2.addColorStop(0, '#ff9fd8'); g2.addColorStop(0.5, '#9B5DE5'); g2.addColorStop(1, '#4D7CFE');
      c.fillStyle = g2; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 12; i++) { c.fillStyle = `rgba(255,255,255,${0.05 + (i % 3) * 0.04})`; c.fillRect(0, i * 22 + 4, w, 9); }
    });
    const planet = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 24), new THREE.MeshBasicMaterial({ map: planetTex, fog: false }));
    planet.position.set(-9000 * ctx.k, 6500 * ctx.k, -14000 * ctx.k);
    trackGroup.add(planet);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3400, 5200, 96), new THREE.MeshBasicMaterial({ color: '#ffd6f0', transparent: true, opacity: 0.55, side: THREE.DoubleSide, fog: false }));
    ring.position.copy(planet.position); ring.rotation.set(1.2, 0.3, 0.2);
    trackGroup.add(ring);
  }
}

function buildClouds(ctx, count, color) {
  for (let i = 0; i < count; i++) {
    const a = ctx.rand() * Math.PI * 2, r = (3000 + ctx.rand() * 4800) * ctx.k;
    const sz = 900 + ctx.rand() * 1300;
    fx.addStatic('dust', Math.cos(a) * r, 2300 + ctx.rand() * 1600, Math.sin(a) * r, sz, color, 1, false, 1.1);
  }
}

// ---------- castillo de bloques ----------
function castle(inst, roofs, x, y, z, rot, S, colors, roofColor, rand) {
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const P = (lx, lz) => ({ x: x + lx * cos + lz * sin, z: z - lx * sin + lz * cos });
  const wall = colors[0], dark = colors[1], trim = colors[2] || colors[0];
  const W = 1100 * S, H = 520 * S, D = 240 * S;
  // muro con almenas
  const brick = 110 * S;
  for (let lx = -W / 2 + brick / 2; lx < W / 2; lx += brick) {
    for (let ly = 0; ly < H; ly += brick) {
      const p = P(lx, 0);
      inst.add(p.x, y + ly + brick / 2, p.z, brick * 0.98, brick * 0.98, D, -rot, (Math.floor(lx / brick) + Math.floor(ly / brick)) % 3 === 0 ? shade(wall, 0.05) : wall);
    }
  }
  for (let lx = -W / 2 + brick / 2; lx < W / 2; lx += brick * 2) {
    const p = P(lx, 0);
    inst.add(p.x, y + H + brick * 0.45, p.z, brick * 0.95, brick * 0.9, D * 1.05, -rot, trim);
  }
  // puerta en arco (bloque oscuro)
  const g = P(0, D * 0.52);
  inst.add(g.x, y + 150 * S, g.z, 240 * S, 300 * S, 20, -rot, '#1b1230');
  // torres
  [-1, 1].forEach((sgn) => {
    const tw = 300 * S, th = (820 + rand() * 360) * S;
    const tp = P(sgn * (W / 2 + tw * 0.3), 0);
    for (let ly = 0; ly < th; ly += brick) {
      inst.add(tp.x, y + ly + brick / 2, tp.z, tw, brick * 0.98, tw, -rot, (ly / brick) % 2 ? wall : shade(wall, -0.04));
    }
    for (let k = 0; k < 4; k++) {
      const a = rot + k * Math.PI / 2;
      inst.add(tp.x + Math.sin(a) * tw * 0.36, y + th + brick * 0.45, tp.z + Math.cos(a) * tw * 0.36, tw * 0.3, brick * 0.9, tw * 0.3, -a, trim);
    }
    const win = P(sgn * (W / 2 + tw * 0.3), tw * 0.51);
    inst.add(win.x, y + th * 0.72, win.z, 70 * S, 110 * S, 14, -rot, dark);
    if (roofColor && rand() < 0.75) roofs.push({ x: tp.x, y: y + th + brick, z: tp.z, r: tw * 0.62, h: tw * 1.1, color: roofColor });
  });
  return { W, H, D };
}

function buildRoofs(list) {
  if (!list.length) return;
  const geo = new THREE.ConeGeometry(1, 1, 8);
  geo.translate(0, 0.5, 0);
  const inst = new Instancer(geo, new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.05, flatShading: true }), list.length);
  list.forEach((r) => inst.add(r.x, r.y, r.z, r.r, r.h, r.r, 0, r.color));
  inst.build(trackGroup, true);
}

// ---------- fuego de antorchas (se anima) ----------
function buildTorches(spots) {
  if (!spots.length) return;
  const stoneInst = new Instancer(unitRoundedBox(), blockMaterial({ roughness: 0.8 }), spots.length * 3);
  spots.forEach((s) => {
    stoneInst.add(s.x, s.y + 130, s.z, 80, 260, 80, 0, '#6b5a8e');
    stoneInst.add(s.x, s.y + 280, s.z, 150, 50, 150, 0, '#3c2f55');
  });
  stoneInst.build(trackGroup, true);
  const flameGeo = new THREE.ConeGeometry(1, 1, 7);
  flameGeo.translate(0, 0.5, 0);
  const outer = new THREE.InstancedMesh(flameGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.orange).multiplyScalar(2.6) }), spots.length);
  const inner = new THREE.InstancedMesh(flameGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.yellow).multiplyScalar(3.2) }), spots.length);
  trackGroup.add(outer, inner);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  TRACK.animated.push((t) => {
    spots.forEach((sp, i) => {
      const f = 1 + Math.sin(t * 13 + i * 1.7) * 0.12 + Math.sin(t * 23 + i) * 0.08;
      p.set(sp.x, sp.y + 300, sp.z); s.set(62, 170 * f, 62); q.identity();
      m4.compose(p, q, s); outer.setMatrixAt(i, m4);
      p.set(sp.x, sp.y + 302, sp.z); s.set(34, 105 * (2 - f), 34);
      m4.compose(p, q, s); inner.setMatrixAt(i, m4);
    });
    outer.instanceMatrix.needsUpdate = true; inner.instanceMatrix.needsUpdate = true;
  });
}

// ---------- cristales facetados que brillan ----------
function crystalGeometry() {
  const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(0.42, 0.18), new THREE.Vector2(0.42, 0.72), new THREE.Vector2(0, 1)];
  const g = new THREE.LatheGeometry(pts, 6);
  return g.toNonIndexed();
}
function buildCrystals(list) {
  if (!list.length) return;
  const geo = crystalGeometry();
  geo.computeVertexNormals();
  const byColor = {};
  list.forEach((c) => { (byColor[c.color] = byColor[c.color] || []).push(c); });
  Object.entries(byColor).forEach(([color, items]) => {
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.12, metalness: 0.2, flatShading: true, transparent: !quality.lite, opacity: quality.lite ? 1 : 0.92, envMap: envTex, envMapIntensity: 0.8 });
    const inst = new Instancer(geo, mat, items.length);
    items.forEach((c) => inst.add(c.x, c.y, c.z, c.s * 0.8, c.s * 2.2, c.s * 0.8, c.rot, '#ffffff'));
    inst.build(trackGroup, false);
  });
}

// ---------- banderas que flamean (1 draw call, onda en el vertex shader) ----------
function buildFlags(list) {
  if (!list.length) return;
  const geo = new THREE.PlaneGeometry(1, 0.66, 10, 2);
  geo.translate(0.5, 0, 0);
  // tela sin iluminacion: colores planos y vivos como en el moodboard (con luz de espaldas quedaban marrones)
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const uTime = { value: 0 };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = instanceMatrix[3].x * 0.004 + instanceMatrix[3].z * 0.003;
        transformed.z += sin(position.x * 7.0 - uTime * 7.0 + ph) * position.x * 0.22;
        transformed.y += sin(position.x * 5.0 - uTime * 5.0 + ph) * position.x * 0.05;`);
  };
  mat.customProgramCacheKey = () => 'flag-wave';
  const poleInst = new Instancer(new THREE.CylinderGeometry(1, 1, 1, 8), new THREE.MeshStandardMaterial({ color: '#f4ead0', roughness: 0.5 }), list.length);
  const flagInst = new Instancer(geo, mat, list.length);
  list.forEach((f) => {
    const h = f.h || 420;
    poleInst.add(f.x, (f.y || 0) + h / 2, f.z, 12, h, 12, 0, '#ffffff');
    flagInst.add(f.x, (f.y || 0) + h - 50, f.z, 150, 150, 150, f.rot || 0, f.color);
  });
  poleInst.build(trackGroup, true);
  flagInst.build(trackGroup, false);
  TRACK.animated.push((t) => { uTime.value = t; });
}

// ---------- tribunas con el publico del moodboard (GO! WOW! BOOST! BLOCK!) ----------
export const crowdBoards = [];
function buildCrowds(ctx, spots) {
  const t = tex('crowd');
  if (!t) return;
  const aspect = 703 / 1024;
  const stand = new Instancer(unitRoundedBox(), blockMaterial({ roughness: 0.7 }), spots.length * 3);
  spots.forEach((s, i) => {
    const W = 1500;
    // gradas escalonadas detras del publico
    for (let k = 0; k < 3; k++) {
      const back = 120 + k * 150;
      stand.add(s.x - Math.sin(s.face) * back, s.y + 40 + k * 70, s.z - Math.cos(s.face) * back, W * 1.05, 80 + k * 140, 160, -s.face + Math.PI, k % 2 ? PAL.blue : PAL.violet);
    }
    const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, W * aspect), mat);
    m.position.set(s.x, s.y + W * aspect / 2 + 20, s.z);
    m.rotation.y = s.face;
    m.userData.baseY = m.position.y;
    m.userData.phase = i * 1.3;
    trackGroup.add(m);
    crowdBoards.push(m);
  });
  stand.build(trackGroup, true);
  TRACK.animated.push((time) => {
    crowdBoards.forEach((m) => { m.position.y = m.userData.baseY + Math.abs(Math.sin(time * 5 + m.userData.phase)) * 38; });
  });
}

// ---------- arco iris 3D sobre la pista ----------
function buildRainbowArch(ctx, s, radius) {
  const c = pointOnCenter(ctx.pts, ctx.E, s);
  const g = new THREE.Group();
  RAINBOW.forEach((col, i) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(radius + i * 80, 40, quality.lite ? 6 : 10, quality.lite ? 32 : 64, Math.PI),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.55, roughness: 0.35 })
    );
    g.add(m);
  });
  g.position.set(c.x, -120, c.z);
  g.rotation.y = Math.atan2(c.nx, c.nz) + Math.PI / 2;
  trackGroup.add(g);
}

// ---------- bloques magicos flotando ----------
function buildFloatingBlocks(ctx, n) {
  const cols = [PAL.pink, PAL.blue, PAL.violet, PAL.yellow, PAL.turquoise];
  const im = new THREE.InstancedMesh(unitRoundedBox(), blockMaterial({ roughness: 0.3, metalness: 0.05 }), n);
  const data = [];
  const color = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const a = ctx.rand() * Math.PI * 2, r = (1500 + ctx.rand() * 6000) * ctx.k;
    data.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: 900 + ctx.rand() * 1900, s: 120 + ctx.rand() * 200, ph: ctx.rand() * 6.28, sp: 0.3 + ctx.rand() * 0.6 });
    im.setColorAt(i, color.set(cols[i % cols.length]));
  }
  im.instanceColor.needsUpdate = true;
  trackGroup.add(im);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  TRACK.animated.push((t) => {
    data.forEach((d, i) => {
      e.set(t * d.sp * 0.7 + d.ph, t * d.sp + d.ph, 0); q.setFromEuler(e);
      p.set(d.x, d.y + Math.sin(t * d.sp * 2 + d.ph) * 90, d.z); sc.setScalar(d.s);
      m4.compose(p, q, sc); im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
  });
}

// estrellas del moodboard titilando en el cielo / sobre pedestales
function buildStarSprites(ctx, n, minY, maxY) {
  for (let i = 0; i < n; i++) {
    const a = ctx.rand() * Math.PI * 2, r = (2500 + ctx.rand() * 5500) * ctx.k;
    fx.addStatic('star', Math.cos(a) * r, minY + ctx.rand() * (maxY - minY), Math.sin(a) * r, 120 + ctx.rand() * 160, '#ffffff', 1.5);
  }
}

function buildWaterfall(x, y, z, rot, w, h) {
  const t = canvasTexture(128, 256, (c, W, H) => {
    c.fillStyle = '#5fd4ff'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${0.2 + (i % 4) * 0.12})`; c.fillRect((i * 37) % W, (i * 71) % H, 6 + (i % 3) * 4, 40 + (i % 5) * 16); }
  }, { repeat: true });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.25, 1.25, 1.35) }));
  m.position.set(x, y + h / 2, z);
  m.rotation.y = rot;
  trackGroup.add(m);
  TRACK.animated.push((time) => { t.offset.y = time * 1.4; });
}

// banana del moodboard sobre un bloque de pasto (billboard)
function buildBananaBoards(spots) {
  const pedestal = new Instancer(unitRoundedBox(), blockMaterial({ roughness: 0.7 }), spots.length);
  spots.forEach((s) => {
    pedestal.add(s.x, s.y + 110, s.z, 300, 220, 300, s.face, PAL.green);
    fx.addStatic('peel', s.x, s.y + 420, s.z, 390, '#ffffff', 1, false, 0.92);
  });
  pedestal.build(trackGroup, true);
}

function buildStarPosts(spots) {
  const post = new Instancer(unitRoundedBox(), blockMaterial({ roughness: 0.7 }), spots.length);
  spots.forEach((s) => {
    post.add(s.x, s.y + 170, s.z, 60, 340, 60, 0, '#8a5a33');
    fx.addStatic('star', s.x, s.y + 440, s.z, 260, '#ffffff', 1.3);
  });
  post.build(trackGroup, true);
}

// props GLTF instanciados (1 draw call por pieza del modelo, no por arbol). Cada instancia
// tiene su propia opacidad para desvanecerse si tapa la camara de manejo
export const fadeProps = [];
const gltfSets = [];
function fadeMaterial(src) {
  const m = src.clone();
  m.transparent = true;
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float instOpacity; varying float vInstOpacity;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInstOpacity = instOpacity;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vInstOpacity;')
      .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\ndiffuseColor.a *= vInstOpacity;');
  };
  m.customProgramCacheKey = () => 'inst-fade';
  return m;
}
async function placeGltf(list, url, size) {
  if (!list.length) return;
  const entry = await loadGltf(url);
  if (!entry) return;
  entry.object.updateMatrixWorld(true);
  const maxDim = Math.max(entry.size.x, entry.size.y, entry.size.z) || 1;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const placements = list.map((s) => {
    e.set(0, Math.random() * Math.PI * 2, 0); q.setFromEuler(e);
    const k = (size * (0.8 + Math.random() * 0.45)) / maxDim;
    return { x: s.x, z: s.z, m: new THREE.Matrix4().compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(k, k, k)) };
  });
  const parts = [];
  entry.object.traverse((o) => { if (o.isMesh) parts.push(o); });
  parts.forEach((part) => {
    const geo = part.geometry.clone();
    const op = new THREE.InstancedBufferAttribute(new Float32Array(placements.length).fill(1), 1);
    op.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('instOpacity', op);
    const mat = Array.isArray(part.material) ? part.material.map(fadeMaterial) : fadeMaterial(part.material);
    const im = new THREE.InstancedMesh(geo, mat, placements.length);
    placements.forEach((pl, i) => { m4.multiplyMatrices(pl.m, part.matrixWorld); im.setMatrixAt(i, m4); });
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true;
    im.computeBoundingSphere();
    trackGroup.add(im);
    gltfSets.push({ im, op, placements, dirty: false });
  });
}

function fence(inst, s, len) {
  const c = s.c;
  const tx = c.dx, tz = c.dz;
  for (let k = -len / 2; k <= len / 2; k += 220) {
    inst.add(s.x + tx * k, s.y + 80, s.z + tz * k, 40, 160, 40, 0, '#8a5a33');
  }
  inst.add(s.x, s.y + 130, s.z, 40, 26, len, Math.atan2(tx, tz), '#a8723f');
}

// ---------- armado por tema ----------
export async function buildDecor(ctx) {
  const b = TRACK.bounds;
  ctx.span = Math.max(Math.abs(b.minX), Math.abs(b.maxX), Math.abs(b.minZ), Math.abs(b.maxZ));
  ctx.k = Math.max(1, ctx.span / 6000);
  crowdBoards.length = 0;
  fadeProps.length = 0;
  gltfSets.length = 0;
  buildSky(ctx);
  const P = new Placer();
  const total = ctx.E.total;
  const rand = ctx.rand;
  // reservar la zona de largada
  const s0 = pointOnCenter(ctx.pts, ctx.E, 700);
  P.add(s0.x, s0.z, ctx.half + 500);

  const theme = ctx.theme;
  const flags = [];
  (TRACK.flags || []).forEach((f) => flags.push({ x: f.x, z: f.z, y: 0, color: f.color, h: 420, rot: rand() * 6.28 }));

  // tribunas con publico cerca del borde
  const crowdSpots = [];
  for (let i = 0; i < 9; i++) {
    const sp = landSpot(ctx, (i + 0.5) / 9 * total, i % 2 ? 1 : -1, 520);
    if (sp && P.tryPlace(sp.x, sp.z, 900)) crowdSpots.push(sp);
  }
  buildCrowds(ctx, crowdSpots);

  // castillos y pilas: cubos simples (el bisel lo da la textura) para no cargar la TV de triangulos
  const blocks = new Instancer(unitBox(), blockMaterial({ roughness: 0.62 }), 20000);
  const roofs = [];
  const crystals = [];

  if (theme === 'rainbow' || theme === 'banana') {
    const castleCols = theme === 'rainbow'
      ? [['#8b63d6', '#1b1230', '#b18cf0'], ['#a46be0', '#22143b', '#d08bf0'], ['#6f59c9', '#1b1230', '#9a86f2']]
      : [['#F7D774', '#6b3d12', '#FFE59A'], ['#F2C94C', '#6b3d12', '#6CCB5F']];
    const nCastles = theme === 'rainbow' ? 9 : 6;
    for (let i = 0; i < nCastles; i++) {
      for (let tries = 0; tries < 6; tries++) {
        const side = rand() < 0.5 ? 1 : -1;
        const sp = landSpot(ctx, rand() * total, side, 1500 + rand() * 1800);
        if (!sp) continue;
        const S = 0.9 + rand() * 0.7;
        if (!P.tryPlace(sp.x, sp.z, 900 * S)) continue;
        const cols = castleCols[i % castleCols.length];
        const roofColor = theme === 'banana' ? (i % 2 ? PAL.pink : '#e25bd0') : (i % 3 === 0 ? PAL.pink : null);
        castle(blocks, roofs, sp.x, sp.y, sp.z, sp.face, S, cols, roofColor, rand);
        flags.push({ x: sp.x, y: sp.y + 540 * S, z: sp.z, color: RAINBOW[i % RAINBOW.length], h: 520, rot: sp.face + Math.PI / 2 });
        if (theme === 'rainbow' && i % 3 === 1) {
          buildWaterfall(sp.x + Math.sin(sp.face) * 140 * S, sp.y, sp.z + Math.cos(sp.face) * 140 * S, sp.face, 200 * S, 480 * S);
        }
        break;
      }
    }
  }

  if (theme === 'rainbow') {
    // antorchas a lo largo del borde del vacio
    const torches = [];
    for (let s = 600, k = 0; s < total; s += 1250, k++) {
      const sp = landSpot(ctx, s, k % 2 ? 1 : -1, 180);
      if (sp && P.tryPlace(sp.x, sp.z, 160)) torches.push(sp);
    }
    buildTorches(torches);
    // cristales en racimos
    const cc = [PAL.pink, PAL.blue, PAL.violet, PAL.turquoise];
    for (let i = 0; i < 26; i++) {
      const sp = landSpot(ctx, rand() * total, rand() < 0.5 ? 1 : -1, 250 + rand() * 2400);
      if (!sp || !P.tryPlace(sp.x, sp.z, 260)) continue;
      const col = cc[i % cc.length];
      for (let k = 0; k < 4; k++) {
        crystals.push({ x: sp.x + (rand() - 0.5) * 220, y: sp.y, z: sp.z + (rand() - 0.5) * 220, s: 90 + rand() * 120 + (k === 0 ? 90 : 0), rot: rand() * 6.28, color: col });
      }
    }
    // pilas de bloques rosas/azules como en el moodboard
    for (let i = 0; i < 34; i++) {
      const sp = landSpot(ctx, rand() * total, rand() < 0.5 ? 1 : -1, 200 + rand() * 1500);
      if (!sp || !P.tryPlace(sp.x, sp.z, 200)) continue;
      const col = [PAL.pink, '#ff8fd0', PAL.blue, '#6cc0ff', PAL.violet][i % 5];
      const hgt = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < hgt; k++) blocks.add(sp.x, sp.y + 90 + k * 180, sp.z, 180, 178, 180, sp.face, k % 2 ? shade(col, 0.06) : col);
    }
    buildRainbowArch(ctx, total * 0.42, ctx.half + 420);
    buildFloatingBlocks(ctx, 34);
    buildStarSprites(ctx, 26, 2200, 3600);
    for (let i = 0; i < 10; i++) {
      const sp = landSpot(ctx, rand() * total, rand() < 0.5 ? 1 : -1, 120 + rand() * 600);
      if (sp && P.tryPlace(sp.x, sp.z, 120)) flags.push({ x: sp.x, y: sp.y, z: sp.z, color: RAINBOW[i % RAINBOW.length], h: 480, rot: sp.face + Math.PI / 2 });
    }
  }

  if (theme === 'banana') {
    const palms = [], bushes = [], flowers = [], rocks = [];
    for (let i = 0; i < 60; i++) {
      const sp = landSpot(ctx, rand() * total, rand() < 0.5 ? 1 : -1, 250 + rand() * 2600);
      if (sp && P.tryPlace(sp.x, sp.z, 260)) palms.push(sp);
    }
    for (let i = 0; i < 40; i++) {
      const sp = landSpot(ctx, rand() * total, rand() < 0.5 ? 1 : -1, 120 + rand() * 1800);
      if (sp && P.tryPlace(sp.x, sp.z, 150)) (i % 3 === 0 ? rocks : i % 3 === 1 ? flowers : bushes).push(sp);
    }
    await Promise.all([
      placeGltf(palms, '/assets/models/nature/tree_palmTall.glb', 1050),
      placeGltf(bushes, '/assets/models/nature/plant_bushLarge.glb', 330),
      placeGltf(flowers, '/assets/models/nature/flower_yellowC.glb', 200),
      placeGltf(rocks, '/assets/models/nature/rock_largeA.glb', 300),
    ]);
    const bananas = [];
    for (let i = 0; i < 8; i++) {
      const sp = landSpot(ctx, (i + 0.25) / 8 * total, i % 2 ? -1 : 1, 300 + rand() * 500);
      if (sp && P.tryPlace(sp.x, sp.z, 220)) bananas.push(sp);
    }
    buildBananaBoards(bananas);
    const stars = [];
    for (let i = 0; i < 8; i++) {
      const sp = landSpot(ctx, rand() * total, rand() < 0.5 ? 1 : -1, 150 + rand() * 500);
      if (sp && P.tryPlace(sp.x, sp.z, 120)) stars.push(sp);
    }
    buildStarPosts(stars);
    // cercas de madera sobre el borde del agua
    const fenceInst = new Instancer(unitRoundedBox(), blockMaterial({ roughness: 0.85 }), 900);
    for (let s = 900, k = 0; s < total; s += 2100, k++) {
      const sp = landSpot(ctx, s, k % 2 ? 1 : -1, 110);
      if (sp && P.free(sp.x, sp.z, 150)) fence(fenceInst, sp, 900);
    }
    fenceInst.build(trackGroup, true);
    buildClouds(ctx, 16, '#ffffff');
    for (let i = 0; i < 8; i++) {
      const sp = landSpot(ctx, rand() * total, rand() < 0.5 ? 1 : -1, 150 + rand() * 500);
      if (sp && P.tryPlace(sp.x, sp.z, 120)) flags.push({ x: sp.x, y: sp.y, z: sp.z, color: [PAL.red, PAL.blue, PAL.pink][i % 3], h: 480, rot: sp.face + Math.PI / 2 });
    }
  }

  if (theme === 'space') {
    const pool = [
      ['meteor.glb', 500], ['meteor_detailed.glb', 620], ['hangar_smallA.glb', 1100], ['hangar_roundA.glb', 1000],
      ['satelliteDish.glb', 750], ['machine_generator.glb', 520], ['barrels.glb', 300], ['rocks_smallA.glb', 360],
      ['astronautA.glb', 380], ['astronautB.glb', 380], ['alien.glb', 380], ['craft_racer.glb', 520], ['crater.glb', 600],
    ];
    const lists = pool.map(() => []);
    for (let i = 0; i < 75; i++) {
      const k = i % pool.length;
      const sp = landSpot(ctx, rand() * total, rand() < 0.5 ? 1 : -1, 200 + rand() * 2800);
      if (sp && P.tryPlace(sp.x, sp.z, pool[k][1] * 0.5)) lists[k].push(sp);
    }
    await Promise.all(pool.map(([f, size], k) => placeGltf(lists[k], '/assets/models/space/' + f, size)));
    const cc = [PAL.turquoise, PAL.violet, PAL.pink];
    for (let i = 0; i < 22; i++) {
      const sp = landSpot(ctx, rand() * total, rand() < 0.5 ? 1 : -1, 250 + rand() * 2400);
      if (!sp || !P.tryPlace(sp.x, sp.z, 240)) continue;
      for (let k = 0; k < 4; k++) crystals.push({ x: sp.x + (rand() - 0.5) * 220, y: sp.y, z: sp.z + (rand() - 0.5) * 220, s: 90 + rand() * 130, rot: rand() * 6.28, color: cc[i % 3] });
    }
    // torres de neon
    for (let i = 0; i < 10; i++) {
      const sp = landSpot(ctx, rand() * total, rand() < 0.5 ? 1 : -1, 1600 + rand() * 1800);
      if (!sp || !P.tryPlace(sp.x, sp.z, 320)) continue;
      const h = 1200 + rand() * 1400;
      blocks.add(sp.x, sp.y + h / 2, sp.z, 260, h, 260, sp.face, '#3a4058');
      crystals.push({ x: sp.x, y: sp.y + h, z: sp.z, s: 120, rot: 0, color: cc[i % 3] });
    }
    buildFloatingBlocks(ctx, 18);
  }

  blocks.build(trackGroup, true);
  buildRoofs(roofs);
  buildCrystals(crystals);
  buildFlags(flags);
}

// ---------- decorado de la arena de batalla ----------
export async function buildArenaDecor(ctx) {
  const b = TRACK.bounds;
  ctx.span = Math.max(Math.abs(b.minX), Math.abs(b.maxX), Math.abs(b.minZ), Math.abs(b.maxZ));
  ctx.k = Math.max(1, ctx.span / 6000);
  crowdBoards.length = 0;
  fadeProps.length = 0;
  gltfSets.length = 0;
  buildSky(ctx);
  const hw = ctx.W / 2, hh = ctx.H / 2, rand = ctx.rand;
  // tribunas con publico mirando hacia la arena
  const spots = [];
  [-0.62, 0, 0.62].forEach((f) => { spots.push({ x: f * hw, z: -hh - 900 }); spots.push({ x: f * hw, z: hh + 900 }); });
  [-0.5, 0.5].forEach((f) => { spots.push({ x: -hw - 900, z: f * hh }); spots.push({ x: hw + 900, z: f * hh }); });
  spots.forEach((sp) => { sp.y = 0; sp.face = Math.atan2(-sp.x, -sp.z); });
  buildCrowds(ctx, spots);
  // castillos mas atras
  const blocks = new Instancer(unitBox(), blockMaterial({ roughness: 0.62 }), 4000);
  const roofs = [];
  const cols = [['#8b63d6', '#1b1230', '#b18cf0'], ['#a46be0', '#22143b', '#d08bf0'], ['#6f59c9', '#1b1230', '#9a86f2']];
  const castles = [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1.25], [0, 1.25]];
  castles.forEach(([sx, sz], i) => {
    const x = sx * (hw + 3000), z = sz * (hh + 3000);
    castle(blocks, roofs, x, 0, z, Math.atan2(-x, -z), 1.3 + rand() * 0.4, cols[i % cols.length], i % 3 === 0 ? PAL.pink : null, rand);
  });
  blocks.build(trackGroup, true);
  buildRoofs(roofs);
  // antorchas sobre las torres de las esquinas y banderas en las paredes
  buildTorches([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => ({ x: sx * (hw + 180), y: 1050, z: sz * (hh + 180) })));
  const flags = [];
  for (let i = 0; i < 6; i++) {
    const f = -0.75 + i * 0.3;
    flags.push({ x: f * hw, y: 340, z: -hh - 200, color: RAINBOW[i % RAINBOW.length], h: 420, rot: 0 });
    flags.push({ x: f * hw, y: 340, z: hh + 200, color: RAINBOW[(i + 3) % RAINBOW.length], h: 420, rot: Math.PI });
  }
  buildFlags(flags);
  buildFloatingBlocks(ctx, quality.lite ? 14 : 26);
  buildStarSprites(ctx, quality.lite ? 12 : 22, 2200, 3600);
}

// el publico gira (solo en horizontal) hacia cada camara: los carteles GO!/WOW! siempre se leen al derecho
export function faceCrowds(cam) {
  for (const m of crowdBoards) m.rotation.y = Math.atan2(cam.position.x - m.position.x, cam.position.z - m.position.z);
}

// los props GLTF y el publico que quedan pegados a la camara se vuelven transparentes
const NEAR = 420, FAR = 900;
function fadeFor(d) { return d < NEAR ? 0.12 : d < FAR ? 0.12 + (d - NEAR) / (FAR - NEAR) * 0.88 : 1; }
export function updateDecorFade(camPos) {
  for (const set of gltfSets) {
    const a = set.op.array;
    let changed = false;
    for (let i = 0; i < set.placements.length; i++) {
      const pl = set.placements[i];
      const v = fadeFor(Math.hypot(pl.x - camPos.x, pl.z - camPos.z));
      if (a[i] !== v) { a[i] = v; changed = true; }
    }
    if (changed) set.op.needsUpdate = true;
  }
  for (const inst of crowdBoards) {
    const d = Math.hypot(inst.position.x - camPos.x, inst.position.z - camPos.z);
    const next = fadeFor(d);
    inst.material.opacity = next;
    inst.material.depthWrite = next > 0.9;
  }
}
void camera;
