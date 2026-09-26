import { THREE, PAL, RAINBOW, game, toWorld, canvasTexture, mulberry32, roundRect, shade } from './core.js';
import { scene, fitSunShadow, renderer } from './render.js';
import { RoundedBoxGeometry } from '/vendor/addons/geometries/RoundedBoxGeometry.js';

export const trackGroup = new THREE.Group();
scene.add(trackGroup);

export const TRACK = {
  theme: 'rainbow',
  pts: [],
  half: 850,
  gap: 560,
  tile: 380,
  tiles: null, // Map "ix,iz" -> top (null = vacio)
  grid: null,
  bounds: null,
  cum: [],
  total: 0,
  roadUniforms: { uTime: { value: 0 }, uFreeze: { value: 0 }, uGlow: { value: 0 } },
  animated: [],
};

const THEME = {
  rainbow: {
    fog: '#3b2466', fogNear: 4200, fogFar: 17000, sky: '#2a1f5c', hemiSky: '#e4dcff', hemiGround: '#7a4f9a',
    sun: '#fff0dc', sunI: 2.1, hemiI: 1.45,
    curb: [PAL.white, PAL.pink], wall: RAINBOW, edgeLight: PAL.pink, pillar: '#6b4fa8',
    terrain: ['#8f6ad8', '#a47be6', '#7d5cc9', '#c47be0', '#6cc0ff', '#55D66A', '#55D66A'],
    glow: 0.55,
  },
  banana: {
    fog: '#9fd9ff', fogNear: 5000, fogFar: 19000, sky: '#5cc4ff', hemiSky: '#ffffff', hemiGround: '#b8a060',
    sun: '#fff6e0', sunI: 2.6, hemiI: 1.35,
    curb: [PAL.red, PAL.white], wall: ['#F2C14E', '#E6AE35', '#F7D774'], edgeLight: PAL.orange, pillar: '#8a5a33',
    terrain: ['#F7D774', '#F2C94C', '#FFE08A', '#6CCB5F', '#55D66A', '#62c46a'],
    glow: 0,
  },
  space: {
    fog: '#07071a', fogNear: 5000, fogFar: 20000, sky: '#05050d', hemiSky: '#b8c6ff', hemiGround: '#23203a',
    sun: '#dfe8ff', sunI: 2.2, hemiI: 1.2,
    curb: ['#FFD93D', '#202030'], wall: ['#8a93a8', '#6f7890', '#9aa3b8'], edgeLight: PAL.turquoise, pillar: '#4a5068',
    terrain: ['#5b6078', '#4d5168', '#686d86', '#44485c'],
    glow: 0.5,
  },
};
export function themeCfg(theme) { return THEME[theme] || THEME.rainbow; }

// ---------- texturas pintadas en canvas (sin archivos) ----------
function noiseFill(ctx, w, h, alpha, seed) {
  const r = mulberry32(seed);
  for (let i = 0; i < w * h * 0.02; i++) {
    ctx.fillStyle = r() < 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3);
  }
}

function bevelBlock(ctx, x, y, w, h, color, bevel, grout) {
  ctx.fillStyle = grout;
  ctx.fillRect(x, y, w, h);
  const g = 3;
  ctx.fillStyle = color;
  roundRect(ctx, x + g, y + g, w - g * 2, h - g * 2, bevel * 0.8);
  ctx.fill();
  // brillo arriba-izquierda y sombra abajo-derecha: se lee como bloque con volumen
  const hl = ctx.createLinearGradient(x, y, x, y + h);
  hl.addColorStop(0, 'rgba(255,255,255,0.35)');
  hl.addColorStop(0.18, 'rgba(255,255,255,0.08)');
  hl.addColorStop(0.8, 'rgba(0,0,0,0.0)');
  hl.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = hl;
  roundRect(ctx, x + g, y + g, w - g * 2, h - g * 2, bevel * 0.8);
  ctx.fill();
}

function roadTexture(theme) {
  if (theme === 'banana') {
    return canvasTexture(1024, 1024, (ctx, w, h) => {
      const r = mulberry32(7);
      const cols = ['#FFE08A', '#F7D774', '#F2C94C', '#FFE9A6', '#F5CF5C'];
      const rows = 8, per = 6;
      for (let y = 0; y < rows; y++) {
        const off = (y % 2) * (w / per / 2);
        for (let x = -1; x <= per; x++) {
          bevelBlock(ctx, x * (w / per) + off, y * (h / rows), w / per, h / rows, cols[Math.floor(r() * cols.length)], 14, '#b8862a');
        }
      }
      noiseFill(ctx, w, h, 0.05, 3);
      // bordes mas oscuros (cordon de arena)
      const eg = ctx.createLinearGradient(0, 0, w, 0);
      eg.addColorStop(0, 'rgba(120,70,10,0.35)'); eg.addColorStop(0.06, 'rgba(0,0,0,0)');
      eg.addColorStop(0.94, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(120,70,10,0.35)');
      ctx.fillStyle = eg; ctx.fillRect(0, 0, w, h);
    }, { repeat: true });
  }
  if (theme === 'space') {
    return canvasTexture(1024, 1024, (ctx, w, h) => {
      const per = 4, rows = 4;
      for (let y = 0; y < rows; y++) for (let x = 0; x < per; x++) {
        bevelBlock(ctx, x * w / per, y * h / rows, w / per, h / rows, (x + y) % 2 ? '#3a4058' : '#343a50', 10, '#1a1d2b');
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        [[18, 18], [w / per - 26, 18], [18, h / rows - 26], [w / per - 26, h / rows - 26]].forEach(([dx, dy]) => {
          ctx.beginPath(); ctx.arc(x * w / per + dx + 4, y * h / rows + dy + 4, 5, 0, Math.PI * 2); ctx.fill();
        });
      }
      noiseFill(ctx, w, h, 0.04, 9);
    }, { repeat: true });
  }
  // rainbow: bandas de bloques de colores a lo largo, como el camino del moodboard
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    const bands = RAINBOW.length;
    const bw = w / bands;
    const rows = 6;
    for (let b = 0; b < bands; b++) {
      for (let y = 0; y < rows; y++) {
        const off = (y % 2) * (h / rows / 2);
        for (let k = -1; k <= rows; k++) {
          const base = RAINBOW[b];
          const tone = k % 3 === 0 ? shade(base, 0.05) : k % 3 === 1 ? base : shade(base, -0.04);
          bevelBlock(ctx, b * bw, k * (h / rows) + off, bw, h / rows, tone, 16, shade(base, -0.32));
        }
      }
    }
    noiseFill(ctx, w, h, 0.04, 5);
  }, { repeat: true });
}

// mascara de emision (que partes de la ruta "se prenden" con las luces que recorren la pista)
function roadEmissive(theme) {
  if (theme === 'space') {
    return canvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#3BD9D0';
      [0.25, 0.5, 0.75].forEach((f) => { for (let y = 0; y < h; y += 64) ctx.fillRect(f * w - 3, y + 8, 6, 36); });
      ctx.fillRect(0, 0, 6, h); ctx.fillRect(w - 6, 0, 6, h);
    }, { repeat: true });
  }
  return null;
}

function curbTexture(colors) {
  return canvasTexture(256, 128, (ctx, w, h) => {
    bevelBlock(ctx, 0, 0, w / 2, h, colors[0], 12, shade(colors[0], -0.35));
    bevelBlock(ctx, w / 2, 0, w / 2, h, colors[1], 12, shade(colors[1], -0.35));
  }, { repeat: true });
}

// bloque generico casi blanco (se tiñe por instancia): bisel + juntas de ladrillo
let _blockTex = null;
export function blockTexture() {
  if (_blockTex) return _blockTex;
  _blockTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d9d9d9'; ctx.fillRect(0, 0, w, h);
    bevelBlock(ctx, 0, 0, w, h, '#ffffff', 26, '#a8a8a8');
    ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(18, h / 2); ctx.lineTo(w - 18, h / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w / 2, 18); ctx.lineTo(w / 2, h / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w / 4, h / 2); ctx.lineTo(w / 4, h - 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 3 / 4, h / 2); ctx.lineTo(w * 3 / 4, h - 18); ctx.stroke();
    noiseFill(ctx, w, h, 0.05, 11);
  });
  return _blockTex;
}

function sideTexture(color) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const rows = 4, per = 2;
    for (let y = 0; y < rows; y++) {
      const off = (y % 2) * (w / per / 2);
      for (let x = -1; x <= per; x++) bevelBlock(ctx, x * w / per + off, y * h / rows, w / per, h / rows, y % 2 ? color : shade(color, -0.05), 8, shade(color, -0.3));
    }
  }, { repeat: true });
}

// ---------- geometria: bordes exactos de la zona manejable ----------
// El servidor considera "en pista" todo lo que esta a menos de half del eje (poligono).
// Eso da esquinas exteriores REDONDEADAS (arco) e interiores en inglete: lo replicamos
// para que lo que se ve coincida exacto con donde podes manejar / donde te caes.
function buildEdges(pts, half) {
  const n = pts.length;
  const dirs = pts.map((p, i) => {
    const b = pts[(i + 1) % n];
    const dx = b.x - p.x, dz = b.z - p.z, l = Math.hypot(dx, dz) || 1;
    return { x: dx / l, z: dz / l, len: l };
  });
  const nrm = dirs.map((d) => ({ x: -d.z, z: d.x }));
  const cum = [0];
  for (let i = 0; i < n; i++) cum.push(cum[i] + dirs[i].len);
  // filas por vertice: lista de pares [izq, der]
  const rows = [];
  for (let i = 0; i < n; i++) {
    const V = pts[i];
    const n0 = nrm[(i - 1 + n) % n], n1 = nrm[i];
    const d1 = dirs[i];
    const side = (s) => {
      const inner = (s * n0.x * d1.x + s * n0.z * d1.z) > 1e-6;
      if (inner) {
        const k = half / (1 + n0.x * n1.x + n0.z * n1.z);
        return { pts: [{ x: V.x + s * (n0.x + n1.x) * k, z: V.z + s * (n0.z + n1.z) * k }], arc: false };
      }
      let a0 = Math.atan2(s * n0.z, s * n0.x), a1 = Math.atan2(s * n1.z, s * n1.x);
      let da = a1 - a0;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const steps = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 24)));
      const out = [];
      for (let k = 0; k <= steps; k++) {
        const a = a0 + da * (k / steps);
        out.push({ x: V.x + Math.cos(a) * half, z: V.z + Math.sin(a) * half });
      }
      return { pts: out, arc: true };
    };
    const L = side(1), R = side(-1);
    const cnt = Math.max(L.pts.length, R.pts.length);
    for (let k = 0; k < cnt; k++) {
      rows.push({
        l: L.pts[Math.min(k, L.pts.length - 1)],
        r: R.pts[Math.min(k, R.pts.length - 1)],
        v: cum[i], vert: i, arcL: L.arc, arcR: R.arc, V,
      });
    }
  }
  return { rows, dirs, nrm, cum, total: cum[n] };
}

// ---------- materiales de la ruta con luces que recorren la pista + efecto congelado ----------
function makeRoadMaterial(theme) {
  const cfg = themeCfg(theme);
  const map = roadTexture(theme);
  const emap = roadEmissive(theme);
  const mat = new THREE.MeshStandardMaterial({
    map, roughness: theme === 'space' ? 0.35 : 0.62, metalness: theme === 'space' ? 0.35 : 0.0,
    emissive: emap ? new THREE.Color('#ffffff') : new THREE.Color('#000000'), emissiveMap: emap || null,
    emissiveIntensity: emap ? 1.6 : 1,
  });
  TRACK.roadUniforms.uGlow.value = cfg.glow;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, TRACK.roadUniforms);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uFreeze; uniform float uGlow;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.70, 0.95, 1.0), uFreeze * 0.62);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        #ifdef USE_MAP
          float wave = pow(0.5 + 0.5 * sin(vMapUv.y * 6.2831 * 0.35 - uTime * 2.2), 26.0);
          float sweep = pow(0.5 + 0.5 * sin(vMapUv.x * 6.2831 * 1.0 + uTime * 1.3), 2.0);
          totalEmissiveRadiance += diffuseColor.rgb * wave * (0.55 + 0.45 * sweep) * uGlow;
          totalEmissiveRadiance += vec3(0.55, 0.9, 1.0) * uFreeze * 0.25 * pow(0.5 + 0.5 * sin((vMapUv.x * 9.0 + vMapUv.y * 13.0) * 6.2831), 18.0);
        #endif`);
  };
  mat.customProgramCacheKey = () => 'road-' + theme;
  return mat;
}

function ribbonFromRows(rows, y, uvScale) {
  const pos = [], uv = [], idx = [];
  rows.forEach((r) => {
    pos.push(r.l.x, y, r.l.z, r.r.x, y, r.r.z);
    uv.push(0, r.v / uvScale, 1, r.v / uvScale);
  });
  const m = rows.length;
  for (let i = 0; i < m; i++) {
    const a = i * 2, b = ((i + 1) % m) * 2;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// polilinea de un borde (izq o der) con su largo acumulado y a que vertice/tramo pertenece
function edgeLine(rows, key) {
  const out = [];
  let acc = 0;
  rows.forEach((r, i) => {
    const p = r[key];
    if (i > 0) {
      const q = out[out.length - 1];
      acc += Math.hypot(p.x - q.x, p.z - q.z);
    }
    out.push({ x: p.x, z: p.z, s: acc, vert: r.vert, arc: key === 'l' ? r.arcL : r.arcR, V: r.V });
  });
  const f = out[0], l = out[out.length - 1];
  out.total = acc + Math.hypot(f.x - l.x, f.z - l.z);
  return out;
}

function sideWalls(edge, depth, mat, uvScale) {
  const pos = [], uv = [], idx = [];
  const m = edge.length;
  edge.forEach((p) => {
    pos.push(p.x, 0, p.z, p.x, -depth, p.z);
    uv.push(p.s / uvScale, 0, p.s / uvScale, depth / uvScale);
  });
  for (let i = 0; i < m; i++) {
    const a = i * 2, b = ((i + 1) % m) * 2;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat);
  mesh.material.side = THREE.DoubleSide;
  return mesh;
}

function curbStrip(edge, center, width, mat) {
  const pos = [], uv = [], idx = [];
  const m = edge.length;
  edge.forEach((p) => {
    const dx = p.V.x - p.x, dz = p.V.z - p.z, l = Math.hypot(dx, dz) || 1;
    const ix = p.x + (dx / l) * width, iz = p.z + (dz / l) * width;
    pos.push(p.x, 5, p.z, ix, 5, iz);
    uv.push(p.s / 320, 0, p.s / 320, 1);
  });
  for (let i = 0; i < m; i++) {
    const a = i * 2, b = ((i + 1) % m) * 2;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat);
  mesh.material.side = THREE.DoubleSide;
  mesh.receiveShadow = true;
  return mesh;
}

// ---------- instanciado: muchos bloques en 1 draw call ----------
export class Instancer {
  constructor(geo, mat, cap) {
    this.geo = geo; this.mat = mat; this.items = []; this.cap = cap;
  }
  add(x, y, z, sx, sy, sz, rotY, color) {
    this.items.push({ x, y, z, sx, sy, sz, rotY: rotY || 0, color });
  }
  build(parent, shadows = true) {
    if (!this.items.length) return null;
    const im = new THREE.InstancedMesh(this.geo, this.mat, this.items.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const c = new THREE.Color();
    this.items.forEach((it, i) => {
      e.set(0, it.rotY, 0); q.setFromEuler(e);
      p.set(it.x, it.y, it.z); s.set(it.sx, it.sy, it.sz);
      m4.compose(p, q, s);
      im.setMatrixAt(i, m4);
      im.setColorAt(i, c.set(it.color || '#ffffff'));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = shadows; im.receiveShadow = true;
    im.computeBoundingSphere();
    parent.add(im);
    return im;
  }
}

let _unitRounded = null;
export function unitRoundedBox() {
  // 1 segmento de redondeo (108 triangulos): con 3 eran ~590 por bloque y la TV no daba abasto
  if (!_unitRounded) _unitRounded = new RoundedBoxGeometry(1, 1, 1, 1, 0.1);
  return _unitRounded;
}
let _unitBox = null;
export function unitBox() {
  if (!_unitBox) _unitBox = new THREE.BoxGeometry(1, 1, 1);
  return _unitBox;
}
export function blockMaterial(opts = {}) {
  return new THREE.MeshStandardMaterial(Object.assign({ map: blockTexture(), roughness: 0.7, metalness: 0.0 }, opts));
}

// ---------- terreno de bloques alrededor (con el vacio entre la ruta y el terreno) ----------
function key(ix, iz) { return ix + ',' + iz; }

export function groundTop(x, z) {
  if (!TRACK.tiles) return null;
  const T = TRACK.tile;
  const ix = Math.round(x / T), iz = Math.round(z / T);
  const v = TRACK.tiles.get(key(ix, iz));
  return v === undefined ? null : v;
}

function buildTerrain(theme, cfg, pts, half, rand) {
  const T = TRACK.tile;
  const R = 8100;
  const edgeD = half + TRACK.gap;
  TRACK.tiles = new Map();
  const inst = new Instancer(new THREE.BoxGeometry(1, 1, 1), blockMaterial({ roughness: theme === 'space' ? 0.85 : 0.75 }), 4000);
  const n = Math.ceil(R / T);
  for (let ix = -n; ix <= n; ix++) {
    for (let iz = -n; iz <= n; iz++) {
      const x = ix * T, z = iz * T;
      if (x * x + z * z > R * R) continue;
      const d = distPts(x, z, pts);
      if (d < edgeD + T * 0.35) continue;
      const far = d - edgeD;
      let top = 0;
      if (far > 900) {
        const steps = Math.min(5, Math.floor((far - 900) / 650) + (rand() < 0.35 ? 1 : 0));
        top = steps * 110;
      } else if (rand() < 0.12) {
        top = 55;
      }
      TRACK.tiles.set(key(ix, iz), top);
      const col = cfg.terrain[Math.floor(rand() * cfg.terrain.length)];
      const h = top + 1900;
      inst.add(x, top - h / 2, z, T, h, T, 0, col);
    }
  }
  const mesh = inst.build(trackGroup, false);
  if (mesh) mesh.receiveShadow = true;
}

function distPts(x, z, pts) {
  let best = Infinity;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const abx = b.x - a.x, abz = b.z - a.z;
    const len2 = abx * abx + abz * abz || 1;
    let t = ((x - a.x) * abx + (z - a.z) * abz) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - (a.x + abx * t), dz = z - (a.z + abz * t);
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
export { distPts };

// agua animada (Banana Castle) / abismo (Rainbow)
function buildVoid(theme) {
  if (theme === 'banana') {
    const waterTex = canvasTexture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#2fc6d6'; ctx.fillRect(0, 0, w, h);
      const r = mulberry32(21);
      for (let i = 0; i < 90; i++) {
        ctx.strokeStyle = `rgba(255,255,255,${0.25 + r() * 0.35})`;
        ctx.lineWidth = 3 + r() * 4;
        const x = r() * w, y = r() * h, l = 30 + r() * 60;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + l / 2, y - 8, x + l, y); ctx.stroke();
      }
    }, { repeat: true });
    waterTex.repeat.set(40, 40);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(40000, 40000),
      new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.18, metalness: 0.1, emissive: '#1aa6c0', emissiveIntensity: 0.25 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -170;
    water.receiveShadow = true;
    trackGroup.add(water);
    TRACK.animated.push((t) => { waterTex.offset.set(t * 0.01, t * 0.006); });
  } else if (theme === 'rainbow') {
    const abyss = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshBasicMaterial({ color: '#1a0f33' }));
    abyss.rotation.x = -Math.PI / 2;
    abyss.position.y = -3200;
    trackGroup.add(abyss);
  }
}

// ---------- construccion completa de la pista ----------
export function buildTrack(state) {
  const theme = state.trackTheme || 'rainbow';
  const cfg = themeCfg(theme);
  TRACK.theme = theme;
  TRACK.animated = [];
  const rand = mulberry32(1234 + (state.trackId || '').length * 77);

  let cx = 0, cz = 0;
  state.track.forEach((p) => { cx += p.x; cz += p.y; });
  game.offset = { x: cx / state.track.length, z: cz / state.track.length };
  const pts = state.track.map((p) => toWorld(p.x, p.y));
  const half = state.trackWidth / 2;
  TRACK.pts = pts; TRACK.half = half;
  const guarded = new Set(state.guardrailSegments || []);
  const n = pts.length;

  const E = buildEdges(pts, half);
  TRACK.cum = E.cum; TRACK.total = E.total; TRACK.dirs = E.dirs;

  // ruta
  const roadMat = makeRoadMaterial(theme);
  const road = new THREE.Mesh(ribbonFromRows(E.rows, 0, state.trackWidth * 1.1), roadMat);
  road.receiveShadow = true;
  trackGroup.add(road);
  TRACK.roadMat = roadMat;

  const L = edgeLine(E.rows, 'l'), Rr = edgeLine(E.rows, 'r');
  const sideMat = new THREE.MeshStandardMaterial({ map: sideTexture(theme === 'banana' ? '#d9a441' : theme === 'space' ? '#4a5068' : '#7b5bc4'), roughness: 0.8 });
  trackGroup.add(sideWalls(L, 260, sideMat, 260));
  trackGroup.add(sideWalls(Rr, 260, sideMat.clone(), 260));

  const curbMat = new THREE.MeshStandardMaterial({ map: curbTexture(cfg.curb), roughness: 0.5 });
  trackGroup.add(curbStrip(L, null, 95, curbMat));
  trackGroup.add(curbStrip(Rr, null, 95, curbMat.clone()));

  // paredes de bloques en tramos con baranda + luces de peligro donde hay precipicio
  const wallInst = new Instancer(unitRoundedBox(), blockMaterial({ roughness: 0.55 }), 3000);
  const lightGeo = new THREE.SphereGeometry(1, 10, 8);
  const lightMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: cfg.edgeLight, emissiveIntensity: 3.2 });
  const lightInst = new Instancer(lightGeo, lightMat, 2000);
  const postInst = new Instancer(unitRoundedBox(), blockMaterial({ roughness: 0.6 }), 800);
  const flags = [];
  let wallCount = 0;
  [L, Rr].forEach((edge, sideIdx) => {
    const sgn = sideIdx === 0 ? 1 : -1;
    const step = 175;
    let lastLight = -9999, lastPost = -9999;
    for (let s = 0; s < edge.total; s += step) {
      const p = pointOnEdge(edge, s);
      // a que tramo pertenece este punto del borde
      const seg = p.arc ? p.vert : p.segIdx;
      const isGuard = p.arc ? (guarded.has((p.vert - 1 + n) % n) && guarded.has(p.vert)) : guarded.has(seg);
      const dx = p.V.x - p.x, dz = p.V.z - p.z, l = Math.hypot(dx, dz) || 1;
      const ox = -dx / l, oz = -dz / l; // hacia afuera de la pista
      const ang = Math.atan2(p.tz, p.tx);
      if (isGuard) {
        const col = cfg.wall[wallCount++ % cfg.wall.length];
        wallInst.add(p.x + ox * 60, 62, p.z + oz * 60, step * 0.98, 124, 120, -ang, col);
        if (s - lastPost > 1100) {
          lastPost = s;
          postInst.add(p.x + ox * 60, 190, p.z + oz * 60, 34, 260, 34, 0, '#f4ead0');
          flags.push({ x: p.x + ox * 60, z: p.z + oz * 60, color: RAINBOW[flags.length % RAINBOW.length] });
        }
      } else if (s - lastLight > 330) {
        lastLight = s;
        lightInst.add(p.x + ox * 16, 16, p.z + oz * 16, 18, 18, 18, 0, '#ffffff');
      }
    }
    void sgn;
  });
  wallInst.build(trackGroup, true);
  postInst.build(trackGroup, true);
  lightInst.build(trackGroup, false);
  TRACK.flags = flags;

  // pilares debajo de la ruta (se ve que es un puente flotando sobre el vacio)
  const pilInst = new Instancer(unitRoundedBox(), blockMaterial({ roughness: 0.8 }), 600);
  for (let s = 400; s < E.total; s += 1300) {
    const c = pointOnCenter(pts, E, s);
    [1, -1].forEach((sg) => {
      const x = c.x + c.nx * sg * (half - 170), z = c.z + c.nz * sg * (half - 170);
      pilInst.add(x, -1500, z, 240, 2600, 240, Math.atan2(c.dz, c.dx), shade(cfg.pillar, (sg > 0 ? 0.03 : -0.03)));
    });
  }
  pilInst.build(trackGroup, false);

  buildVoid(theme);
  buildTerrain(theme, cfg, pts, half, rand);
  buildStartLine(state, pts, half);

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  pts.forEach((p) => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); });
  TRACK.bounds = { minX, maxX, minZ, maxZ };
  fitSunShadow(minX - half, maxX + half, minZ - half, maxZ + half);
  renderer.shadowMap.needsUpdate = true;
  return { theme, cfg, pts, half, E, L, R: Rr, rand };
}

function pointOnEdge(edge, s) {
  const m = edge.length;
  s = ((s % edge.total) + edge.total) % edge.total;
  let i = 0;
  while (i < m - 1 && edge[i + 1].s <= s) i++;
  const a = edge[i], b = edge[(i + 1) % m];
  const segLen = (i + 1 < m ? b.s : edge.total) - a.s || 1;
  const t = (s - a.s) / segLen;
  const tx = b.x - a.x, tz = b.z - a.z, tl = Math.hypot(tx, tz) || 1;
  // entre dos filas de vertices distintos = tramo recto (a.vert); dentro de un arco = esquina
  const straight = a.vert !== b.vert || (i + 1 >= m);
  return {
    x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
    tx: tx / tl, tz: tz / tl,
    V: straight ? { x: a.V.x + (b.V.x - a.V.x) * t, z: a.V.z + (b.V.z - a.V.z) * t } : a.V,
    arc: !straight && a.arc, vert: a.vert, segIdx: a.vert,
  };
}

export function pointOnCenter(pts, E, s) {
  const n = pts.length;
  s = ((s % E.total) + E.total) % E.total;
  let i = 0;
  while (i < n - 1 && E.cum[i + 1] <= s) i++;
  const d = E.dirs[i];
  const t = s - E.cum[i];
  return { x: pts[i].x + d.x * t, z: pts[i].z + d.z * t, dx: d.x, dz: d.z, nx: -d.z, nz: d.x, seg: i };
}

// ---------- largada: linea a cuadros + arco con cartel ----------
function buildStartLine(state, pts, half) {
  const a = pts[0], b = pts[1];
  const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
  const ux = dx / l, uz = dz / l;
  const sd = state.startDist || 1000;
  const px = a.x + ux * sd, pz = a.z + uz * sd;
  const ang = Math.atan2(dz, dx);
  const check = canvasTexture(256, 64, (ctx, w, h) => {
    const s = 32;
    for (let y = 0; y < h / s; y++) for (let x = 0; x < w / s; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#202030' : '#FFF8E7';
      ctx.fillRect(x * s, y * s, s, s);
    }
  });
  const line = new THREE.Mesh(new THREE.PlaneGeometry(state.trackWidth, 170), new THREE.MeshStandardMaterial({ map: check, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = -ang + Math.PI / 2;
  line.position.set(px, 2, pz);
  line.receiveShadow = true;
  trackGroup.add(line);

  // arco de largada: dos torres de bloques + cartel
  const nx = -uz, nz = ux;
  const towerMat = blockMaterial({ roughness: 0.55 });
  const inst = new Instancer(unitRoundedBox(), towerMat, 60);
  [1, -1].forEach((sg) => {
    const tx = px + nx * sg * (half + 170), tz = pz + nz * sg * (half + 170);
    for (let k = 0; k < 8; k++) inst.add(tx, 90 + k * 170, tz, 230, 168, 230, -ang, RAINBOW[(k + (sg > 0 ? 0 : 3)) % RAINBOW.length]);
    inst.add(tx, 90 + 8 * 170 + 40, tz, 290, 80, 290, -ang, PAL.yellow);
  });
  inst.build(trackGroup, true);
  const bannerTex = canvasTexture(2048, 320, (ctx, w, h) => {
    const s = 40;
    for (let y = 0; y < h / s; y++) for (let x = 0; x < w / s; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#202030' : '#FFF8E7';
      ctx.fillRect(x * s, y * s, s, s);
    }
    ctx.fillStyle = '#4D7CFE';
    roundRect(ctx, 60, 36, w - 120, h - 72, 40); ctx.fill();
    ctx.font = '170px "Lilita One", Impact, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 22; ctx.strokeStyle = '#202030'; ctx.lineJoin = 'round';
    ctx.strokeText('BLOCK RACERS', w / 2, h / 2 + 8);
    const g = ctx.createLinearGradient(0, h * 0.25, 0, h * 0.8);
    g.addColorStop(0, '#FFE45C'); g.addColorStop(1, '#FF9F1C');
    ctx.fillStyle = g;
    ctx.fillText('BLOCK RACERS', w / 2, h / 2 + 8);
  });
  const span = half * 2 + 340;
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(span, span * 320 / 2048), new THREE.MeshStandardMaterial({ map: bannerTex, side: THREE.DoubleSide, roughness: 0.6, emissive: '#ffffff', emissiveMap: bannerTex, emissiveIntensity: 0.25 }));
  banner.position.set(px, 1380, pz);
  banner.rotation.y = -ang + Math.PI / 2;
  banner.castShadow = true;
  trackGroup.add(banner);
}

export function teardownTrack() {
  while (trackGroup.children.length) {
    const c = trackGroup.children.pop();
    c.traverse((o) => {
      if (o.geometry && o.geometry !== _unitRounded && o.geometry !== _unitBox && !o.userData.sharedGeometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          if (m.map && m.map !== _blockTex && !m.userData.keepMap) m.map.dispose();
          m.dispose();
        });
      }
    });
  }
  TRACK.tiles = null;
  TRACK.animated = [];
}

export function updateTrack(t, freeze) {
  TRACK.roadUniforms.uTime.value = t;
  const f = TRACK.roadUniforms.uFreeze;
  f.value += ((freeze ? 1 : 0) - f.value) * 0.08;
  TRACK.animated.forEach((fn) => fn(t));
}
