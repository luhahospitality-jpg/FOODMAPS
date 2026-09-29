// Modelos: personajes hechos con primitivas y fusionados (pocos draw calls),
// pelota con textura de canvas, etiquetas y podio.
import * as THREE from '../../vendor/three.module.min.js';
import { material, esTV } from './render.js';

const { mergeGeometries, RoundedBoxGeometry } = THREE;
const SEG = esTV ? 1 : 2;
const SPH = esTV ? [10, 7] : [16, 12];

export const COLOR_EQUIPO = ['#f5c518', '#2563eb'];
export const NOMBRE_EQUIPO = ['AMARELO', 'AZUL'];
export const PERSONAJES = [
  { id: 'ronaldinho', nombre: 'RONALDINHO', apodo: 'EL MAGO', piel: '#7a4a2e', short: '#161616', short2: '#e6e6e6', pelo: '#15100c', zap: '#f2f2f2', zap2: '#1d1d1d', peinado: 'rodete' },
  { id: 'ronaldo', nombre: 'RONALDO', apodo: 'EL FENÓMENO', piel: '#b98663', short: '#1f3fa8', short2: '#ffffff', pelo: '#1b120b', zap: '#f2f2f2', zap2: '#1f3fa8', peinado: 'rapado' },
  { id: 'maradona', nombre: 'MARADONA', apodo: 'EL DIEZ', piel: '#c08a64', short: '#161616', short2: '#ffffff', pelo: '#15100c', zap: '#f2f2f2', zap2: '#111111', peinado: 'rodete' },
  { id: 'neymar', nombre: 'NEYMAR', apodo: 'EL CRACK', piel: '#b07445', short: '#1a1a1a', short2: '#3a3a3a', pelo: '#f1ecdc', zap: '#f2f2f2', zap2: '#111111', peinado: 'platinado' },
];

// ---------------------------------------------------------------------
//  Utilidades de geometría con color por vértice
// ---------------------------------------------------------------------
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

export function pintar(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.attributes.normal) g.computeVertexNormals();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv' && k !== 'color') g.deleteAttribute(k);
  return g;
}

// pieza(geo, color, [x,y,z], [rx,ry,rz], [sx,sy,sz])
export function pieza(geo, color, p, r, s) {
  _e.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0);
  _q.setFromEuler(_e);
  _m.compose(new THREE.Vector3(p ? p[0] : 0, p ? p[1] : 0, p ? p[2] : 0), _q, new THREE.Vector3(s ? s[0] : 1, s ? s[1] : 1, s ? s[2] : 1));
  geo.applyMatrix4(_m);
  return pintar(geo, color);
}

export function fusionar(lista) {
  const g = mergeGeometries(lista, false);
  for (const x of lista) x.dispose();
  return g;
}

const caja = (x, y, z, r) => new RoundedBoxGeometry(x, y, z, SEG, r !== undefined ? r : Math.min(x, y, z) * 0.3);
const esfera = (r, a, b) => new THREE.SphereGeometry(r, a || SPH[0], b || SPH[1]);
const cil = (rt, rb, h, s) => new THREE.CylinderGeometry(rt, rb, h, s || (esTV ? 8 : 12));

function oscurecer(hex, k) { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); }

// ---------------------------------------------------------------------
//  Texturas de canvas
// ---------------------------------------------------------------------
export function canvasTex(w, h, dibujar, opts) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  dibujar(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = esTV ? 1 : 4;
  if (opts && opts.repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (opts && opts.sinMip) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  return t;
}

// Sombra circular + aro del equipo en una sola textura
const texPiso = [];
export function texturaPiso(team) {
  if (texPiso[team]) return texPiso[team];
  texPiso[team] = canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 60);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)');
    gr.addColorStop(0.6, 'rgba(0,0,0,0.3)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = COLOR_EQUIPO[team];
    g.lineWidth = 9;
    g.beginPath(); g.arc(64, 64, 46, 0, Math.PI * 2); g.stroke();
    g.fillStyle = COLOR_EQUIPO[team];
    g.beginPath(); g.moveTo(64 + 58, 64); g.lineTo(64 + 44, 64 - 11); g.lineTo(64 + 44, 64 + 11); g.fill();
  }, { sinMip: true });
  return texPiso[team];
}

export function geoPistola() {
  const L = [];
  L.push(pieza(new THREE.BoxGeometry(0.26, 0.08, 0.05), '#222222', [0.1, 0, 0]));
  L.push(pieza(new THREE.BoxGeometry(0.07, 0.13, 0.05), '#e8b923', [0.0, -0.08, 0], [0, 0, -0.25]));
  L.push(pieza(cil(0.022, 0.022, 0.08, 6), '#f5c518', [0.25, 0.01, 0], [0, 0, Math.PI / 2]));
  return fusionar(L);
}

export function geoEstrellas() {
  const forma = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.045 : 0.1, a = (i / 10) * Math.PI * 2;
    if (i === 0) forma.moveTo(Math.cos(a) * r, Math.sin(a) * r); else forma.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const L = [];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    L.push(pieza(new THREE.ShapeGeometry(forma), '#ffe14a', [Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3]));
  }
  return fusionar(L);
}

// Etiqueta (J1 / CPU + pistola + barra de carga) como sprite
export function crearEtiqueta() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(2.1, 0.79, 1);
  spr.renderOrder = 10;
  let clave = '';
  function actualizar(nombre, team, balas, carga, ko) {
    const k = nombre + '|' + team + '|' + balas + '|' + carga + '|' + ko;
    if (k === clave) return;
    clave = k;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 96);
    g.font = '44px Bangers, Impact, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let txt = nombre;
    if (ko > 0) txt = '¡PUM! ' + ko;
    const w = Math.max(70, g.measureText(txt).width + 26 + (balas > 0 ? 44 : 0));
    g.fillStyle = ko > 0 ? '#e11d48' : COLOR_EQUIPO[team];
    g.beginPath();
    const x0 = 128 - w / 2;
    g.rect(x0, 8, w, 48);
    g.fill();
    g.fillStyle = team === 0 && !(ko > 0) ? '#111' : '#fff';
    g.fillText(txt, 128 - (balas > 0 ? 20 : 0), 34);
    if (balas > 0) {
      g.fillStyle = '#111'; g.fillRect(128 + w / 2 - 50, 12, 44, 40);
      // pistolita dibujada (sin emoji: la TV puede no tener esa fuente)
      const gx = 128 + w / 2 - 47;
      g.fillStyle = '#f5c518';
      g.fillRect(gx, 20, 22, 8); g.fillRect(gx + 2, 28, 7, 12);
      g.font = '28px Bangers, Impact, sans-serif';
      g.fillText('x' + balas, gx + 32, 34);
    }
    if (carga > 0) {
      g.fillStyle = '#111'; g.fillRect(48, 66, 160, 22);
      g.fillStyle = carga > 80 ? '#ff5a1f' : '#f5c518';
      g.fillRect(52, 70, (152 * carga) / 100, 14);
    }
    tex.needsUpdate = true;
  }
  return { spr, actualizar };
}

// ---------------------------------------------------------------------
//  Pelota
// ---------------------------------------------------------------------
export function crearPelota() {
  const tex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#e9e4d6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {           // mugre de la calle
      g.fillStyle = 'rgba(' + (60 + Math.random() * 60 | 0) + ',' + (50 + Math.random() * 40 | 0) + ',30,' + (Math.random() * 0.18) + ')';
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, Math.random() * 6, 0, 7); g.fill();
    }
    g.fillStyle = '#18181b';
    const hex = (cx, cy, r) => { g.beginPath(); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.fill(); };
    for (let k = 0; k < 6; k++) { hex(k * 90 + 20, 60, 26); hex(k * 90 + 65, 180, 26); }
    g.strokeStyle = 'rgba(40,40,40,0.5)'; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); g.lineTo(Math.random() * w, Math.random() * h); g.stroke(); }
    // corona amarilla
    g.fillStyle = '#f5c518';
    g.beginPath(); g.moveTo(230, 150); g.lineTo(236, 104); g.lineTo(252, 128); g.lineTo(266, 96); g.lineTo(280, 128); g.lineTo(296, 104); g.lineTo(302, 150); g.closePath(); g.fill();
  });
  const geo = new THREE.SphereGeometry(0.22, esTV ? 16 : 24, esTV ? 12 : 16);
  const m = new THREE.Mesh(geo, material({ map: tex, rough: 0.6 }));
  m.castShadow = !esTV;
  const grupo = new THREE.Group();
  grupo.add(m);
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: texturaSombra(), transparent: true, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2;
  sombra.renderOrder = 1;
  return { grupo, bola: m, sombra };
}

let texSombra = null;
function texturaSombra() {
  if (texSombra) return texSombra;
  texSombra = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  }, { sinMip: true });
  return texSombra;
}

// Bala (trazo brillante)
export function crearBala() {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
  m.visible = false;
  return m;
}

// ---------------------------------------------------------------------
//  Podio
// ---------------------------------------------------------------------
export function crearPodio() {
  const grupo = new THREE.Group();
  const L = [];
  const alturas = [1.2, 0.8, 0.5, 0.3];
  const xs = [0, -1.7, 1.7, 3.3];
  const colores = ['#f5c518', '#c0c0c8', '#cd7f32', '#6b6b73'];
  for (let i = 0; i < 4; i++) {
    L.push(pieza(caja(1.5, alturas[i], 1.5, 0.08), '#1b1a1f', [xs[i], alturas[i] / 2, 0]));
    L.push(pieza(new THREE.BoxGeometry(1.52, 0.08, 1.52), colores[i], [xs[i], alturas[i] - 0.03, 0]));
  }
  grupo.add(new THREE.Mesh(fusionar(L), material({ vertexColors: true, rough: 0.5 })));
  for (let i = 0; i < 3; i++) {
    const t = canvasTex(128, 128, (g) => {
      g.fillStyle = colores[i]; g.font = '110px Bangers, Impact'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(i + 1), 64, 70);
    });
    const n = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
    n.position.set(xs[i], alturas[i] / 2, 0.76);
    grupo.add(n);
  }
  grupo.userData.lugares = xs.map((x, i) => new THREE.Vector3(x, alturas[i], 0));
  grupo.visible = false;
  return grupo;
}
