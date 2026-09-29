// Personajes con esqueleto: cada jugador es UNA sola malla con huesos (SkinnedMesh),
// armada con primitivas suaves (lathe, cápsulas, esferas) y una textura de piel con
// músculos y tatuajes dibujada en canvas. 1 draw call por personaje.
import * as THREE from '../../vendor/three.module.min.js';
import { material, esTV } from './render.js';
import { PERSONAJES, texturaPiso, geoPistola, geoEstrellas, crearEtiqueta } from './modelos.js';

const { mergeGeometries, RoundedBoxGeometry } = THREE;
const RS = esTV ? 12 : 20;           // segmentos alrededor
const CS = esTV ? 3 : 5;             // segmentos de las tapas de cápsulas
const SP = esTV ? [12, 9] : [20, 14];

// Huesos: índice → [nombre, padre, posición relativa al padre]
const HUESOS = [
  ['base', -1, [0, 0, 0]],
  ['cadera', 0, [0, 0.98, 0]],
  ['torso', 1, [0, 0.02, 0]],
  ['cabeza', 2, [0, 0.62, 0]],
  ['hombroI', 2, [0, 0.47, 0.215]],
  ['codoI', 4, [0, -0.29, 0.005]],
  ['hombroD', 2, [0, 0.47, -0.215]],
  ['codoD', 6, [0, -0.29, -0.005]],
  ['piernaI', 1, [0, -0.02, 0.1]],
  ['rodillaI', 8, [0, -0.45, 0]],
  ['piernaD', 1, [0, -0.02, -0.1]],
  ['rodillaD', 10, [0, -0.45, 0]],
];
const B = {}; HUESOS.forEach((h, i) => { B[h[0]] = i; });

// UV: la textura (atlas) tiene 3 zonas: torso [0..0.5], brazo tatuado [0.5..0.75], blanco [0.75..1]
const UV_BLANCO = [0.9, 0.5];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

function parte(geo, color, hueso, p, r, s, zonaUV) {
  _e.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0);
  _q.setFromEuler(_e);
  _m.compose(_v.set(p ? p[0] : 0, p ? p[1] : 0, p ? p[2] : 0), _q, _s.set(s ? s[0] : 1, s ? s[1] : 1, s ? s[2] : 1));
  geo.applyMatrix4(_m);
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  const n = g.attributes.position.count;
  const c = new THREE.Color(color);
  const col = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; si[i * 4] = hueso; sw[i * 4] = 1; }
  let uv = g.attributes.uv ? g.attributes.uv.array.slice() : new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    if (zonaUV === 'torso') { uv[i * 2] = uv[i * 2] * 0.5; }
    else if (zonaUV === 'brazo') { uv[i * 2] = 0.5 + uv[i * 2] * 0.25; }
    else { uv[i * 2] = UV_BLANCO[0]; uv[i * 2 + 1] = UV_BLANCO[1]; }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', g.attributes.position);
  out.setAttribute('normal', g.attributes.normal);
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  out.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  return out;
}

const esf = (r, a, b) => new THREE.SphereGeometry(r, a || SP[0], b || SP[1]);
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, CS, RS);
const cil = (a, b, h, s) => new THREE.CylinderGeometry(a, b, h, s || RS, 1, true);
const cilC = (a, b, h, s) => new THREE.CylinderGeometry(a, b, h, s || RS);
const caja = (x, y, z, r) => new RoundedBoxGeometry(x, y, z, esTV ? 1 : 2, r);
function torno(perfil) { return new THREE.LatheGeometry(perfil.map((p) => new THREE.Vector2(p[0], p[1])), RS); }
function oscuro(hex, k) { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); }

// ---------------------------------------------------------------------
//  Geometría de un personaje (en pose de reposo, coordenadas del modelo)
//  Mira hacia +x; z es el costado.
// ---------------------------------------------------------------------
function geometria(cfg) {
  const L = [];
  const piel = cfg.piel, pielO = oscuro(piel, 0.8);
  // torso con forma (cintura → pecho → hombros → cuello)
  const perfil = [[0.148, 0], [0.152, 0.06], [0.16, 0.14], [0.174, 0.22], [0.19, 0.3], [0.2, 0.38], [0.202, 0.44], [0.19, 0.5], [0.16, 0.55], [0.11, 0.585], [0.07, 0.6], [0.06, 0.62]];
  L.push(parte(torno(perfil), piel, B.torso, [0, 1.0, 0], null, [0.68, 1, 1], 'torso'));
  // pectorales y trapecios
  for (const z of [-0.075, 0.075]) L.push(parte(esf(0.1), piel, B.torso, [0.085, 1.39, z], [0, 0, 0.25], [0.3, 0.5, 0.8]));
  for (const z of [-0.12, 0.12]) L.push(parte(esf(0.1), piel, B.torso, [-0.01, 1.54, z], [z > 0 ? 0.5 : -0.5, 0, 0], [0.55, 0.35, 1.0]));
  L.push(parte(cilC(0.056, 0.062, 0.14), piel, B.torso, [0.005, 1.63, 0]));
  if (cfg.cadena) L.push(parte(new THREE.TorusGeometry(0.075, 0.009, 5, 18), '#e8b923', [0.03, 1.575, 0], [0, 0, Math.PI / 2 - 0.35], [1, 1.25, 1.15]));

  // cabeza
  L.push(parte(esf(0.112), piel, B.cabeza, [0.0, 1.755, 0], null, [1.07, 1.12, 0.93]));
  L.push(parte(esf(0.085), piel, B.cabeza, [0.035, 1.685, 0], null, [1.0, 0.8, 1.05]));
  L.push(parte(new THREE.ConeGeometry(0.019, 0.05, 6), pielO, B.cabeza, [0.122, 1.728, 0], [0, 0, -Math.PI / 2]));
  for (const z of [-1, 1]) {
    L.push(parte(esf(0.03, 8, 6), piel, B.cabeza, [-0.005, 1.745, z * 0.104], null, [0.55, 1, 0.35]));
    L.push(parte(esf(0.019, 8, 6), '#f4efe8', B.cabeza, [0.104, 1.765, z * 0.04], null, [0.6, 0.72, 1]));
    L.push(parte(esf(0.0105, 6, 5), '#24160c', B.cabeza, [0.1155, 1.765, z * 0.04], null, [0.5, 1, 1]));
    L.push(parte(new THREE.BoxGeometry(0.014, 0.012, 0.048), cfg.pelo === '#f1ecdc' ? '#8a7a60' : '#16100b', B.cabeza, [0.113, 1.793, z * 0.042], [z * 0.15, 0, 0]));
  }
  L.push(parte(new THREE.BoxGeometry(0.012, 0.014, 0.05), oscuro(piel, 0.55), B.cabeza, [0.117, 1.678, 0]));
  const pelo = cfg.pelo;
  const casco = (r, y, esc) => parte(new THREE.SphereGeometry(r, SP[0], SP[1] >> 1, 0, Math.PI * 2, 0, Math.PI * 0.5), pelo, B.cabeza, [-0.012, y, 0], [0, 0, 0.38], esc || [1.1, 1.0, 0.98]);
  if (cfg.peinado === 'rodete') {
    L.push(casco(0.118, 1.752));
    L.push(parte(esf(0.058), pelo, B.cabeza, [-0.095, 1.86, 0]));
    L.push(parte(cap(0.03, 0.16), pelo, B.cabeza, [-0.13, 1.74, 0], [0, 0, -0.35]));
  } else if (cfg.peinado === 'platinado') {
    L.push(casco(0.116, 1.752));
    L.push(parte(caja(0.17, 0.06, 0.13, 0.03), pelo, B.cabeza, [0.01, 1.855, 0]));
  } else if (cfg.peinado === 'rapado') {
    L.push(casco(0.114, 1.752, [1.09, 0.98, 0.96]));
    L.push(parte(esf(0.088), pelo, B.cabeza, [0.033, 1.672, 0], null, [1.02, 0.72, 1.07]));       // barba
    L.push(parte(new THREE.BoxGeometry(0.012, 0.012, 0.06), pelo, B.cabeza, [0.116, 1.698, 0]));  // bigote
  } else if (cfg.peinado === 'piluso') {
    L.push(casco(0.114, 1.752));
    L.push(parte(cilC(0.122, 0.132, 0.1), cfg.gorro, B.cabeza, [0, 1.85, 0]));
    L.push(parte(cilC(0.2, 0.2, 0.014, RS + 4), oscuro(cfg.gorro, 0.8), B.cabeza, [0.01, 1.8, 0], [0, 0, -0.08]));
  }

  // cadera / short (con elástico blanco)
  L.push(parte(torno([[0.172, 0], [0.178, 0.1], [0.172, 0.2], [0.16, 0.24]]), cfg.short, B.cadera, [0, 0.83, 0], null, [0.74, 1, 1]));
  L.push(parte(cilC(0.157, 0.162, 0.055), cfg.elastico, B.cadera, [0, 1.07, 0], null, [0.72, 1, 1]));

  // brazos
  for (const lado of [1, -1]) {
    const hb = lado > 0 ? B.hombroI : B.hombroD, cb = lado > 0 ? B.codoI : B.codoD;
    const z = lado * 0.215;
    L.push(parte(esf(0.078), piel, hb, [0, 1.46, z * 1.02], null, [0.95, 0.9, 0.85]));          // deltoides
    L.push(parte(cap(0.053, 0.2), piel, hb, [0, 1.31, z], null, [1.05, 1, 0.95], 'brazo'));
    L.push(parte(cap(0.045, 0.2), piel, cb, [0, 1.05, z + lado * 0.005], null, null, 'brazo'));
    L.push(parte(esf(0.05), piel, cb, [0.005, 0.9, z + lado * 0.005], null, [0.62, 1.15, 0.9]));
    L.push(parte(esf(0.02, 6, 5), piel, cb, [0.035, 0.93, z - lado * 0.01], null, [1, 1.6, 1]));  // pulgar
  }
  // piernas
  for (const lado of [1, -1]) {
    const pb = lado > 0 ? B.piernaI : B.piernaD, rb = lado > 0 ? B.rodillaI : B.rodillaD;
    const z = lado * 0.1;
    L.push(parte(cil(0.118, 0.13, 0.42), cfg.short, pb, [0, 0.76, z]));
    L.push(parte(new THREE.CircleGeometry(0.128, RS), oscuro(cfg.short, 0.5), pb, [0, 0.55, z], [Math.PI / 2, 0, 0]));
    L.push(parte(new THREE.BoxGeometry(0.2, 0.4, 0.012), cfg.short2, pb, [0, 0.77, z + lado * 0.121]));
    L.push(parte(esf(0.062), piel, rb, [0.01, 0.51, z]));                                      // rodilla
    L.push(parte(cap(0.055, 0.28), piel, rb, [0, 0.33, z]));
    L.push(parte(esf(0.06), piel, rb, [-0.03, 0.38, z], null, [1, 1.9, 0.95]));                   // gemelo
    L.push(parte(cilC(0.06, 0.058, 0.15), cfg.media, rb, [0, 0.12, z]));
    // zapatilla
    L.push(parte(caja(0.29, 0.1, 0.125, 0.045), cfg.zap, rb, [0.055, 0.06, z]));
    L.push(parte(caja(0.305, 0.035, 0.135, 0.015), '#f4f4f4', rb, [0.055, 0.017, z]));
    L.push(parte(new THREE.BoxGeometry(0.16, 0.035, 0.132), cfg.zap2, rb, [0.03, 0.065, z]));
    L.push(parte(new THREE.BoxGeometry(0.1, 0.012, 0.06), '#e8e8e8', rb, [0.11, 0.112, z]));    // cordones
  }
  const g = mergeGeometries(L, false);
  for (const x of L) x.dispose();
  g.computeBoundingSphere();
  return g;
}

// ---------------------------------------------------------------------
//  Textura de piel: músculos + tatuajes (se multiplica por el color de piel)
// ---------------------------------------------------------------------
function texturaPiel(cfg, semilla) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  let s = semilla * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 512);
  // --- torso (x 0..256: vuelta completa; pecho en x=64, espalda en x=192; y=0 cuello, y=512 cintura)
  const sombra = 'rgba(120,70,40,0.28)';
  g.strokeStyle = sombra; g.lineWidth = 5; g.lineCap = 'round';
  // pectorales
  g.beginPath(); g.arc(46, 150, 38, 0.2, 2.3); g.stroke();
  g.beginPath(); g.arc(82, 150, 38, 0.84, 2.94); g.stroke();
  // abdominales
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(64, 200); g.lineTo(64, 470); g.stroke();
  for (const y of [255, 310, 365]) { g.beginPath(); g.moveTo(42, y); g.quadraticCurveTo(64, y + 8, 86, y); g.stroke(); }
  g.beginPath(); g.moveTo(28, 230); g.quadraticCurveTo(22, 360, 40, 470); g.stroke();
  g.beginPath(); g.moveTo(100, 230); g.quadraticCurveTo(106, 360, 88, 470); g.stroke();
  // espalda
  g.beginPath(); g.moveTo(192, 60); g.lineTo(192, 470); g.stroke();
  g.beginPath(); g.arc(170, 150, 30, 0.5, 2.5); g.stroke();
  g.beginPath(); g.arc(214, 150, 30, 0.64, 2.64); g.stroke();
  // tatuajes
  const tinta = 'rgba(30,34,48,0.78)';
  g.fillStyle = tinta; g.strokeStyle = tinta;
  const corona = (x, y, e) => { g.beginPath(); g.moveTo(x - 20 * e, y + 10 * e); g.lineTo(x - 24 * e, y - 12 * e); g.lineTo(x - 10 * e, y); g.lineTo(x, y - 18 * e); g.lineTo(x + 10 * e, y); g.lineTo(x + 24 * e, y - 12 * e); g.lineTo(x + 20 * e, y + 10 * e); g.closePath(); g.fill(); };
  const rosa = (x, y, r) => { g.lineWidth = 3; for (let k = 3; k > 0; k--) { g.beginPath(); g.arc(x, y, (r * k) / 3, rnd() * 6, rnd() * 6 + 4.5); g.stroke(); } g.beginPath(); g.moveTo(x - r, y + r * 0.6); g.quadraticCurveTo(x - r * 2, y + r * 1.4, x - r * 0.6, y + r * 2); g.stroke(); };
  const estrella = (x, y, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  const escrito = (txt, x, y, tam, ang) => { g.save(); g.translate(x, y); g.rotate(ang || 0); g.font = 'bold ' + tam + 'px Marker, cursive, serif'; g.textAlign = 'center'; g.fillText(txt, 0, 0); g.restore(); };
  const t = cfg.tatuajes;
  if (t === 'craque') { corona(64, 105, 1.4); escrito('Fabela', 64, 420, 34, 0); rosa(30, 170, 14); estrella(102, 120, 9); escrito('FÉ', 192, 140, 40); }
  if (t === 'rapido') { rosa(40, 140, 18); rosa(92, 150, 16); escrito('RJ', 64, 330, 44); estrella(64, 90, 10); corona(192, 120, 1.6); }
  if (t === 'forte') {
    g.lineWidth = 7;
    for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(20 + k * 10, 100); g.quadraticCurveTo(64, 170 + k * 6, 108 - k * 10, 100); g.stroke(); }
    escrito('FÉ', 64, 440, 48); corona(192, 110, 1.8);
  }
  if (t === 'malandro') { escrito('Malandragem', 64, 455, 22, -0.05); estrella(38, 110, 11); estrella(90, 110, 11); rosa(64, 260, 12); escrito('10', 192, 150, 60); }
  // --- manga del brazo (x 256..384, toda la vuelta)
  const densidad = { craque: 14, rapido: 16, forte: 9, malandro: 12 }[t] || 10;
  for (let k = 0; k < densidad; k++) {
    const x = 262 + rnd() * 116, y = 30 + rnd() * 450, tipo = rnd();
    if (tipo < 0.35) rosa(x, y, 8 + rnd() * 8);
    else if (tipo < 0.6) estrella(x, y, 6 + rnd() * 6);
    else if (tipo < 0.8) { g.lineWidth = 3; g.beginPath(); g.arc(x, y, 10 + rnd() * 6, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y - 6); g.stroke(); }
    else escrito(['RJ', 'FÉ', 'amor', '021', '♛'][(rnd() * 5) | 0], x, y, 18, (rnd() - 0.5));
  }
  g.fillStyle = '#ffffff'; g.fillRect(384, 0, 128, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = esTV ? 1 : 4;
  return tex;
}

// Datos visuales extra por personaje
const EXTRA = {   // solo para el muñeco de respaldo (si no cargan los modelos fotográficos)
  ronaldinho: { elastico: '#f4f4f4', media: '#f4f4f4', cadena: true, tatuajes: 'craque' },
  ronaldo: { elastico: '#f4f4f4', media: '#f4f4f4', cadena: false, tatuajes: 'forte' },
  maradona: { elastico: '#f4f4f4', media: '#f4f4f4', cadena: false, tatuajes: 'malandro' },
  neymar: { elastico: '#f5c518', media: '#f4f4f4', cadena: true, tatuajes: 'rapido' },
};

// ---------------------------------------------------------------------
//  Modelos fotográficos: reconstruidos en 3D a partir de las fotos de cada
//  jugador (frente, lado, espalda) con su textura real y pesos de esqueleto.
//  Formato propio: .json (meta + huesos) + .bin (atributos) + .jpg (textura).
// ---------------------------------------------------------------------
const MODELOS = {};
function cargarUno(id) {
  const base = '/assets/pj/' + id;
  return Promise.all([
    fetch(base + '.json').then((r) => { if (!r.ok) throw new Error(id + ' json ' + r.status); return r.json(); }),
    fetch(base + '.bin').then((r) => { if (!r.ok) throw new Error(id + ' bin ' + r.status); return r.arrayBuffer(); }),
    new Promise((ok, mal) => new THREE.TextureLoader().load(base + (esTV ? '_tv.jpg' : '.jpg'), ok, undefined, mal)),
    // normal map con los pliegues de ropa y pelo (si falta, se juega sin él)
    new Promise((ok) => new THREE.TextureLoader().load(base + (esTV ? '_n_tv.jpg' : '_n.jpg'), ok, undefined, () => ok(null))),
  ]).then(([meta, buf, tex, nrm]) => {
    const v = meta.v, o = meta.ofs;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, o[0], v * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(buf, o[1], v * 3), 3, true));
    g.setAttribute('uv', new THREE.BufferAttribute(new Uint16Array(buf, o[2], v * 2), 2, true));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint8Array(buf, o[3], v * 4), 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(new Uint8Array(buf, o[4], v * 4), 4, true));
    g.setIndex(new THREE.BufferAttribute(meta.i32 ? new Uint32Array(buf, o[5], meta.i) : new Uint16Array(buf, o[5], meta.i), 1));
    g.computeBoundingSphere();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = esTV ? 1 : 4;
    // la textura viene des-iluminada: poca "luz propia" y que la luz de la escena + el normal map den el volumen
    const e = esTV ? 0.24 : 0.14;
    const op = { map: tex, rough: 0.78, emissiveMap: tex, emissive: new THREE.Color(e, e, e) };
    if (nrm) { nrm.anisotropy = tex.anisotropy; op.normalMap = nrm; op.normalScale = new THREE.Vector2(0.9, 0.9); }
    const mat = material(op);
    MODELOS[id] = { geo: g, mat, huesos: meta.huesos, altura: meta.altura };
  });
}
// Carga los 4 jugadores. Si algo falla, se usan los muñecos armados con primitivas.
export function cargarModelos() {
  return Promise.all(PERSONAJES.map((p) => cargarUno(p.id).catch((e) => { console.warn('modelo', p.id, e.message); })));
}

const cache = {};
function recursos(ch) {
  if (cache[ch]) return cache[ch];
  const cfg = Object.assign({}, PERSONAJES[ch], EXTRA[PERSONAJES[ch].id]);
  cache[ch] = {
    geo: geometria(cfg),
    mat: material({ vertexColors: true, map: texturaPiel(cfg, ch + 3), rough: 0.55 }),
  };
  return cache[ch];
}
let geoPist = null, geoEst = null, matEst = null, matPist = null;

export function crearJugador(ch, team) {
  const foto = MODELOS[PERSONAJES[ch].id];
  const r = foto || recursos(ch);
  const raiz = new THREE.Group();
  const giro = new THREE.Group();
  raiz.add(giro);
  // esqueleto (en los modelos fotográficos, las posiciones vienen de las articulaciones detectadas en las fotos)
  const huesos = HUESOS.map((h) => {
    const b = new THREE.Bone(); b.name = h[0];
    if (foto) {
      const a = foto.huesos[h[0]], pa = h[1] >= 0 ? foto.huesos[HUESOS[h[1]][0]] : [0, 0, 0];
      b.position.set(a[0] - pa[0], a[1] - pa[1], a[2] - pa[2]);
    } else b.position.set(h[2][0], h[2][1], h[2][2]);
    return b;
  });
  HUESOS.forEach((h, i) => { if (h[1] >= 0) huesos[h[1]].add(huesos[i]); });
  const malla = new THREE.SkinnedMesh(r.geo, r.mat);
  malla.add(huesos[0]);
  malla.updateMatrixWorld(true);
  malla.bind(new THREE.Skeleton(huesos));
  malla.frustumCulled = false;
  malla.castShadow = !esTV;
  giro.add(malla);
  const hb = {}; HUESOS.forEach((h, i) => { hb[h[0]] = huesos[i]; });
  const reposo = huesos.map((b) => b.position.clone());

  if (!geoPist) { geoPist = geoPistola(); matPist = material({ vertexColors: true, rough: 0.3, metal: 0.6 }); }
  const pistola = new THREE.Mesh(geoPist, matPist);
  pistola.position.set(0.03, -0.3, 0);
  pistola.rotation.z = Math.PI / 2;
  pistola.visible = false;
  hb.codoD.add(pistola);

  const piso = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: texturaPiso(team), transparent: true, depthWrite: false }));
  piso.rotation.x = -Math.PI / 2;
  piso.position.y = 0.03;
  piso.renderOrder = 1;
  giro.add(piso);

  if (!geoEst) { geoEst = geoEstrellas(); matEst = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }); }
  const estrellas = new THREE.Mesh(geoEst, matEst);
  estrellas.position.y = 2.05;
  estrellas.visible = false;
  raiz.add(estrellas);

  const etiqueta = crearEtiqueta();
  etiqueta.spr.position.y = 2.5;
  raiz.add(etiqueta.spr);

  return { raiz, giro, malla, h: hb, reposo, huesos, pistola, piso, estrellas, etiqueta, fase: 0, ch, team, foto: !!foto };
}

// ---------------------------------------------------------------------
//  Animación procedimental sobre los huesos
//  a = código de anim, t = tiempo en esa anim, vel = velocidad, extra = truco o personaje
// ---------------------------------------------------------------------
export function animar(p, a, t, vel, dt, extra) {
  const h = p.h;
  // reposo
  for (let i = 0; i < p.huesos.length; i++) { p.huesos[i].rotation.set(0, 0, 0); p.huesos[i].position.copy(p.reposo[i]); }
  p.estrellas.visible = false;
  const corre = Math.min(1, vel / 7);
  p.fase += dt * (4 + vel * 1.45);
  const s = Math.sin(p.fase), c = Math.cos(p.fase);
  // atajos
  const kb = p.foto ? 0.75 : 1;
  const brazo = (lado, adelante, abre, codo) => {
    const hb = lado > 0 ? h.hombroI : h.hombroD, cb = lado > 0 ? h.codoI : h.codoD;
    hb.rotation.z = Math.min(adelante * kb, 2.3); hb.rotation.x = -lado * abre * kb; cb.rotation.z = codo;
  };
  const pierna = (lado, adelante, rodilla, abre) => {
    const pb = lado > 0 ? h.piernaI : h.piernaD, rb = lado > 0 ? h.rodillaI : h.rodillaD;
    pb.rotation.z = adelante; pb.rotation.x = -lado * (abre || 0); rb.rotation.z = -rodilla;
  };
  const base = h.base, cad = h.cadera, tor = h.torso, cab = h.cabeza;

  switch (a) {
    case 1: { // patada
      const k = Math.min(1, t / 0.28);
      const sw = k < 0.35 ? -0.9 * (k / 0.35) : -0.9 + 2.4 * ((k - 0.35) / 0.65);
      pierna(-1, sw, k < 0.35 ? 1.2 : Math.max(0, 1.2 - (k - 0.35) * 3), 0);
      pierna(1, -0.1, 0.3); tor.rotation.z = 0.15 * Math.sin(k * Math.PI);
      brazo(1, 0.7, 0.5, 0.4); brazo(-1, -0.6, 0.3, 0.4);
      break;
    }
    case 2: { // barrida
      base.rotation.z = 1.15; base.position.y = 0.3;
      pierna(-1, 1.3, 0.1); pierna(1, 0.6, 1.4);
      brazo(1, -1.2, 0.6, 0.3); brazo(-1, 1.4, 0.4, 0.2);
      cab.rotation.z = -0.6;
      break;
    }
    case 3: { // voadora
      const k = Math.min(1, t / 0.65);
      base.rotation.z = 0.35 + 0.5 * Math.sin(k * Math.PI);
      pierna(-1, 1.9 * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5), 0.05);
      pierna(1, -0.6, 1.6);
      brazo(1, 1.4, 0.8, 0.6); brazo(-1, 2.0, 0.8, 0.6);
      cab.rotation.z = -0.4;
      break;
    }
    case 4: { // mareado / tuneado
      tor.rotation.z = Math.sin(t * 7) * 0.2; tor.rotation.x = Math.cos(t * 5) * 0.18;
      cab.rotation.x = Math.sin(t * 9) * 0.35;
      brazo(1, 0.3, 0.7 + Math.sin(t * 9) * 0.4, 0.6); brazo(-1, 0.3, 0.7 - Math.sin(t * 9) * 0.4, 0.6);
      pierna(1, 0.1, 0.4 + Math.sin(t * 6) * 0.2, 0.1); pierna(-1, -0.1, 0.4 - Math.sin(t * 6) * 0.2, 0.1);
      p.estrellas.visible = true; p.estrellas.rotation.y = t * 6;
      break;
    }
    case 5: { // KO: tirado boca arriba
      const k = Math.min(1, t / 0.35);
      base.rotation.z = 1.5 * k; base.position.y = 0.18 * k;
      brazo(1, 2.6, 0.5, 0.3); brazo(-1, 2.3, 0.3, 0.6); pierna(1, 0.3, 0.6); pierna(-1, -0.05, 0.1);
      cab.rotation.x = 0.5;
      p.estrellas.visible = true; p.estrellas.rotation.y = t * 4;
      break;
    }
    case 6: { // caída de cara y se levanta
      const k = Math.min(1, t / 0.2), sube = t > 0.6 ? Math.min(1, (t - 0.6) / 0.3) : 0;
      base.rotation.z = -1.35 * k * (1 - sube); base.position.y = 0.2 * k * (1 - sube);
      brazo(1, 2.2 * (1 - sube), 0.4, 0.8); brazo(-1, 2.2 * (1 - sube), 0.4, 0.8);
      pierna(1, 0.2, 0.5); pierna(-1, -0.3, 0.3);
      break;
    }
    case 7: { // firuletes
      const tipo = extra || 1;
      brazo(1, 0.4, 0.9, 0.9); brazo(-1, 0.4, 0.9, 0.9);
      if (tipo === 1) { const k = Math.min(1, t / 0.5); pierna(-1, 0.4, 0.5, Math.sin(k * Math.PI * 2) * 0.7); pierna(1, -0.1, 0.5); cad.rotation.x = Math.sin(k * Math.PI * 2) * 0.25; tor.rotation.y = Math.sin(k * Math.PI * 2) * 0.4; }
      else if (tipo === 2) { const k = Math.min(1, t / 0.5); pierna(-1, k < 0.4 ? 0.9 : 0.9 - (k - 0.4) * 2, 0.9, 0); pierna(1, -0.1, 0.4); }
      else if (tipo === 3) { const k = Math.min(1, t / 0.7); base.rotation.y = k * Math.PI * 2; pierna(-1, 0.5 * Math.sin(k * Math.PI * 2), 0.6); pierna(1, -0.3, 0.5); }
      else { const k = Math.min(1, t / 0.4); pierna(-1, -0.4 * Math.sin(k * Math.PI), 2.0 * Math.sin(k * Math.PI)); pierna(1, 0.2, 0.3); tor.rotation.z = -0.25 * Math.sin(k * Math.PI); }
      base.position.y -= 0.04;
      break;
    }
    case 8: { // provocación / samba corta
      bailar(p, 0, t);
      break;
    }
    case 9: { // festejo de gol: cada personaje su baile
      bailar(p, BAILE_DE[extra] !== undefined ? BAILE_DE[extra] : 0, t);
      break;
    }
    case 10: { // disparo
      brazo(-1, 1.55, 0.05, 0); brazo(1, 0.3, 0.3, 0.5);
      pierna(1, s * 0.6 * corre, Math.max(0, -s) * corre); pierna(-1, -s * 0.6 * corre, Math.max(0, s) * corre);
      tor.rotation.y = -0.2;
      break;
    }
    default: { // correr / quieto
      if (corre > 0.05) {
        pierna(1, s * 0.85 * corre, (0.25 + Math.max(0, -s) * 1.3) * corre);
        pierna(-1, -s * 0.85 * corre, (0.25 + Math.max(0, s) * 1.3) * corre);
        brazo(1, -s * 0.8 * corre, 0.12, 1.1 * corre + 0.2);
        brazo(-1, s * 0.8 * corre, 0.12, 1.1 * corre + 0.2);
        tor.rotation.z = -0.18 * corre; tor.rotation.y = s * 0.15 * corre;
        base.position.y = Math.abs(c) * 0.07 * corre - 0.03 * corre;
        cab.rotation.z = 0.1 * corre;
      } else {
        const r = Math.sin(performance.now() * 0.0025 + p.ch);
        brazo(1, 0.05, 0.14, 0.15 + r * 0.03); brazo(-1, 0.05, 0.14, 0.15 - r * 0.03);
        pierna(1, 0.02, 0.06, 0.05); pierna(-1, -0.02, 0.06, 0.05);
        tor.rotation.x = r * 0.02; base.position.y = r * 0.006;
      }
    }
  }
  if (p.pistola.visible && a !== 10) { h.hombroD.rotation.z = Math.max(h.hombroD.rotation.z, 0.5); h.codoD.rotation.z = Math.max(h.codoD.rotation.z, 0.9); }
}

// Ronaldinho: samba · Ronaldo: sarrada · Maradona: shimmy tipo Paquetá · Neymar: passinho
const BAILE_DE = [0, 3, 2, 1];
// Bailes de festejo: 0 samba (craque), 1 passinho de funk (rápido), 2 baile de Paquetá (forte), 3 sarrada / rebolado (malandro)
function bailar(p, estilo, t) {
  const h = p.h, base = h.base, cad = h.cadera, tor = h.torso, cab = h.cabeza;
  const kb = p.foto ? 0.75 : 1;
  const brazo = (lado, adelante, abre, codo) => { const hb = lado > 0 ? h.hombroI : h.hombroD, cb = lado > 0 ? h.codoI : h.codoD; hb.rotation.z = Math.min(adelante * kb, 2.3); hb.rotation.x = -lado * abre * kb; cb.rotation.z = codo; };
  const pierna = (lado, adelante, rodilla, abre) => { const pb = lado > 0 ? h.piernaI : h.piernaD, rb = lado > 0 ? h.rodillaI : h.rodillaD; pb.rotation.z = adelante; pb.rotation.x = -lado * (abre || 0); rb.rotation.z = -rodilla; };
  if (estilo === 0) {
    // SAMBA NO PÉ: pies rápidos, cadera que va y viene, brazos sueltos
    const f = t * 11, a = Math.sin(f), b = Math.sin(f * 0.5);
    pierna(1, a * 0.45, 0.35 + Math.max(0, a) * 0.5, 0.05);
    pierna(-1, -a * 0.45, 0.35 + Math.max(0, -a) * 0.5, 0.05);
    cad.rotation.x = b * 0.18; cad.rotation.y = b * 0.35; tor.rotation.y = -b * 0.45; tor.rotation.x = -b * 0.1;
    base.position.y = -0.05 + Math.abs(a) * 0.05;
    brazo(1, 0.5 + b * 0.6, 0.5, 1.4 + a * 0.3); brazo(-1, 0.5 - b * 0.6, 0.5, 1.4 - a * 0.3);
    cab.rotation.y = b * 0.3; cab.rotation.x = a * 0.08;
  } else if (estilo === 1) {
    // PASSINHO: piernas que se cruzan rapidísimo, rodillas flexionadas, brazos marcando
    const f = t * 14, a = Math.sin(f), q = Math.sin(f * 0.5) > 0 ? 1 : -1;
    pierna(1, 0.15 * a, 0.7, q * 0.3 + a * 0.15);
    pierna(-1, -0.15 * a, 0.7, -q * 0.3 - a * 0.15);
    base.position.y = -0.12 + Math.abs(a) * 0.04;
    tor.rotation.z = -0.25; tor.rotation.y = q * 0.25;
    brazo(1, 0.6 + a * 0.5, 0.3, 1.9); brazo(-1, 0.6 - a * 0.5, 0.3, 1.9);
    cab.rotation.x = a * 0.12; cab.rotation.z = 0.15;
  } else if (estilo === 2) {
    // PAQUETÁ: paso al costado con los hombros, manos que "ruedan" y dedo al cielo
    const f = t * 8, a = Math.sin(f), paso = Math.sin(t * 4);
    const cielo = (t % 2.4) > 1.8;
    base.position.z = paso * 0.12;
    pierna(1, 0.05, 0.35 + Math.max(0, paso) * 0.3, 0.12 + paso * 0.1);
    pierna(-1, 0.05, 0.35 + Math.max(0, -paso) * 0.3, 0.12 - paso * 0.1);
    tor.rotation.y = a * 0.3; tor.rotation.x = a * 0.08;
    if (cielo) { brazo(1, 3.0, 0.1, 0.1); brazo(-1, 0.3, 0.4, 0.6); cab.rotation.z = 0.35; }
    else { brazo(1, 1.0 + a * 0.25, 0.25, 1.6 + a * 0.5); brazo(-1, 1.0 - a * 0.25, 0.25, 1.6 - a * 0.5); cab.rotation.y = -a * 0.2; }
    base.position.y = -0.06 + Math.abs(a) * 0.03;
  } else {
    // SARRADA / REBOLADO: bien abajo, cadera que rota, brazos abiertos
    const f = t * 9, a = Math.sin(f), b = Math.cos(f);
    base.position.y = -0.2;
    pierna(1, 0.35, 1.0, 0.3); pierna(-1, 0.35, 1.0, 0.3);
    cad.rotation.x = a * 0.25; cad.rotation.z = b * 0.2;
    tor.rotation.z = -0.35 - b * 0.15; tor.rotation.x = -a * 0.2;
    brazo(1, 0.4, 1.3 + a * 0.2, 0.4); brazo(-1, 0.4, 1.3 - a * 0.2, 0.4);
    cab.rotation.x = a * 0.15; cab.rotation.z = 0.2 + b * 0.1;
  }
}
