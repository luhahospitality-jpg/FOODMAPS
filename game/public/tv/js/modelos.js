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
  { id: 'craque', nombre: 'O CRAQUE', piel: '#b07445', short: '#161616', short2: '#e6e6e6', pelo: '#1b120b', zap: '#f2f2f2', zap2: '#1d1d1d', peinado: 'rodete' },
  { id: 'rapido', nombre: 'O RÁPIDO', piel: '#d9a57b', short: '#1f8b3b', short2: '#f5c518', pelo: '#f1ecdc', zap: '#f2f2f2', zap2: '#111111', peinado: 'platinado' },
  { id: 'forte', nombre: 'O FORTE', piel: '#6e432a', short: '#7c1622', short2: '#141414', pelo: '#120c08', zap: '#d32626', zap2: '#ffffff', peinado: 'rapado' },
  { id: 'malandro', nombre: 'O MALANDRO', piel: '#a56c43', short: '#6b2fb8', short2: '#e9d5ff', pelo: '#150f0a', zap: '#f2f2f2', zap2: '#6b2fb8', peinado: 'piluso' },
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

// Material compartido por todos los personajes (colores por vértice)
let matPersonaje = null;
function matPJ() {
  if (!matPersonaje) matPersonaje = material({ vertexColors: true, rough: 0.65 });
  return matPersonaje;
}

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
function texturaPiso(team) {
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

// ---------------------------------------------------------------------
//  Personaje
// ---------------------------------------------------------------------
function geoTronco(cfg) {
  const piel = cfg.piel, pielO = oscurecer(cfg.piel, 0.72);
  const L = [];
  L.push(pieza(caja(0.3, 0.2, 0.5), cfg.short, [0, 0.98, 0]));
  L.push(pieza(caja(0.31, 0.06, 0.51, 0.02), cfg.short2, [0, 1.09, 0]));
  L.push(pieza(caja(0.28, 0.48, 0.48, 0.1), piel, [0, 1.34, 0]));
  L.push(pieza(caja(0.05, 0.12, 0.16, 0.02), pielO, [0.13, 1.4, 0.1]));      // tatuaje en el pecho
  L.push(pieza(caja(0.04, 0.1, 0.1, 0.02), oscurecer(cfg.piel, 0.85), [0.14, 1.2, 0]));
  L.push(pieza(cil(0.075, 0.08, 0.14), piel, [0, 1.6, 0]));
  L.push(pieza(esfera(0.15), piel, [0.01, 1.76, 0], null, [1, 1.1, 0.95]));
  L.push(pieza(esfera(0.035, 6, 5), piel, [0.0, 1.76, 0.145]));                // orejas
  L.push(pieza(esfera(0.035, 6, 5), piel, [0.0, 1.76, -0.145]));
  L.push(pieza(new THREE.BoxGeometry(0.03, 0.035, 0.035), '#140c08', [0.15, 1.79, 0.055]));
  L.push(pieza(new THREE.BoxGeometry(0.03, 0.035, 0.035), '#140c08', [0.15, 1.79, -0.055]));
  L.push(pieza(new THREE.BoxGeometry(0.03, 0.015, 0.06), '#4a2618', [0.15, 1.69, 0]));
  L.push(pieza(new THREE.BoxGeometry(0.035, 0.012, 0.05), cfg.pelo, [0.155, 1.835, 0.055]));   // cejas
  L.push(pieza(new THREE.BoxGeometry(0.035, 0.012, 0.05), cfg.pelo, [0.155, 1.835, -0.055]));
  const pelo = cfg.pelo;
  const casco = (r, color, y) => pieza(new THREE.SphereGeometry(r, SPH[0], SPH[1] >> 1, 0, Math.PI * 2, 0, Math.PI / 2), color, [-0.01, y, 0], null, [1, 0.95, 1]);
  if (cfg.peinado === 'rodete') {
    L.push(casco(0.158, pelo, 1.8));
    L.push(pieza(esfera(0.075), pelo, [-0.13, 1.9, 0]));
    L.push(pieza(caja(0.08, 0.2, 0.08), pelo, [-0.17, 1.72, 0], [0, 0, -0.3]));
  } else if (cfg.peinado === 'platinado') {
    L.push(casco(0.158, pelo, 1.8));
    L.push(pieza(caja(0.2, 0.08, 0.12, 0.03), pelo, [0.02, 1.93, 0]));
  } else if (cfg.peinado === 'rapado') {
    L.push(casco(0.152, pelo, 1.79));
    L.push(pieza(new THREE.BoxGeometry(0.02, 0.05, 0.12), pelo, [0.155, 1.72, 0]));      // barba
  } else if (cfg.peinado === 'piluso') {
    L.push(pieza(cil(0.15, 0.165, 0.13), cfg.short, [0, 1.9, 0]));
    L.push(pieza(cil(0.25, 0.25, 0.025, esTV ? 10 : 16), oscurecer(cfg.short, 0.8), [0, 1.84, 0]));
    L.push(pieza(new THREE.TorusGeometry(0.08, 0.012, 4, 10), '#e8b923', [0.03, 1.56, 0], [Math.PI / 2, 0, 0], [1, 1.4, 1]));  // cadena
  }
  return fusionar(L);
}

function geoBrazo(cfg, derecho) {
  const piel = cfg.piel;
  const L = [];
  L.push(pieza(caja(0.12, 0.34, 0.12), piel, [0, -0.17, 0]));
  L.push(pieza(caja(0.105, 0.3, 0.105), piel, [0, -0.46, 0]));
  L.push(pieza(caja(0.11, 0.18, 0.11, 0.03), oscurecer(piel, 0.7), [0.003, derecho ? -0.44 : -0.2, 0]));   // tatuajes
  L.push(pieza(esfera(0.065, 8, 6), piel, [0, -0.66, 0]));
  return fusionar(L);
}

function geoPierna(cfg, derecha) {
  const lado = derecha ? -1 : 1;
  const L = [];
  L.push(pieza(caja(0.25, 0.44, 0.23), cfg.short, [0, -0.2, 0]));
  L.push(pieza(new THREE.BoxGeometry(0.2, 0.44, 0.02), cfg.short2, [0, -0.2, lado * 0.118]));
  L.push(pieza(caja(0.13, 0.34, 0.13), cfg.piel, [0, -0.58, 0]));
  L.push(pieza(caja(0.145, 0.14, 0.145, 0.03), '#f4f4f4', [0, -0.77, 0]));
  L.push(pieza(caja(0.32, 0.12, 0.16, 0.05), cfg.zap, [0.06, -0.885, 0]));
  L.push(pieza(new THREE.BoxGeometry(0.2, 0.04, 0.165), cfg.zap2, [0.05, -0.87, 0]));
  L.push(pieza(new THREE.BoxGeometry(0.33, 0.03, 0.165), '#ffffff', [0.06, -0.935, 0]));
  return fusionar(L);
}

function geoPistola() {
  const L = [];
  L.push(pieza(new THREE.BoxGeometry(0.26, 0.08, 0.05), '#222222', [0.1, 0, 0]));
  L.push(pieza(new THREE.BoxGeometry(0.07, 0.13, 0.05), '#e8b923', [0.0, -0.08, 0], [0, 0, -0.25]));
  L.push(pieza(cil(0.022, 0.022, 0.08, 6), '#f5c518', [0.25, 0.01, 0], [0, 0, Math.PI / 2]));
  return fusionar(L);
}

function geoEstrellas() {
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

// Cache de geometrías por personaje (se comparten entre jugadores)
const cacheGeo = {};
function geosDe(ch) {
  if (cacheGeo[ch]) return cacheGeo[ch];
  const cfg = PERSONAJES[ch];
  cacheGeo[ch] = {
    tronco: geoTronco(cfg), brazoI: geoBrazo(cfg, false), brazoD: geoBrazo(cfg, true),
    piernaI: geoPierna(cfg, false), piernaD: geoPierna(cfg, true),
  };
  return cacheGeo[ch];
}
let geoPist = null, geoEst = null, matEst = null;

// Etiqueta (J1 / CPU + pistola + barra de carga) como sprite
function crearEtiqueta() {
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
    if (ko > 0) txt = 'KO ' + ko;
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

export function crearJugador(ch, team) {
  const g = geosDe(ch);
  const mat = matPJ();
  const raiz = new THREE.Group();
  const giro = new THREE.Group();     // rotación por dirección
  const pose = new THREE.Group();     // inclinaciones (barrida, KO...)
  raiz.add(giro); giro.add(pose);
  const tronco = new THREE.Mesh(g.tronco, mat);
  pose.add(tronco);
  const mk = (geo, x, y, z) => {
    const piv = new THREE.Group(); piv.position.set(x, y, z);
    const m = new THREE.Mesh(geo, mat); piv.add(m); pose.add(piv);
    m.castShadow = !esTV;
    return piv;
  };
  const brazoI = mk(g.brazoI, 0, 1.5, 0.3);
  const brazoD = mk(g.brazoD, 0, 1.5, -0.3);
  const piernaI = mk(g.piernaI, 0, 0.95, 0.13);
  const piernaD = mk(g.piernaD, 0, 0.95, -0.13);
  tronco.castShadow = !esTV;
  if (!geoPist) geoPist = geoPistola();
  const pistola = new THREE.Mesh(geoPist, mat);
  pistola.position.set(0.02, -0.68, 0);
  pistola.rotation.z = Math.PI / 2;
  pistola.visible = false;
  brazoD.add(pistola);

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
  etiqueta.spr.position.y = 2.55;
  raiz.add(etiqueta.spr);

  return { raiz, giro, pose, tronco, brazoI, brazoD, piernaI, piernaD, pistola, piso, estrellas, etiqueta, fase: 0, ch, team };
}

// Animación procedimental. a = código de anim, t = tiempo en esa anim, vel = velocidad
export function animar(p, a, t, vel, dt, extra) {
  const { pose, brazoI, brazoD, piernaI, piernaD, estrellas } = p;
  let py = 0, pz = 0, px = 0, pyR = 0;
  let bI = 0.12, bD = 0.12, pI = 0, pD = 0, bIx = 0.12, bDx = -0.12, pIx = 0, pDx = 0;
  estrellas.visible = false;
  const corre = Math.min(1, vel / 7);
  p.fase += dt * (4 + vel * 1.5);
  const s = Math.sin(p.fase);
  switch (a) {
    case 1: { // patada
      const k = Math.min(1, t / 0.28);
      pD = k < 0.35 ? -0.9 * (k / 0.35) : -0.9 + 2.3 * ((k - 0.35) / 0.65);
      pI = -0.15; bI = 0.6; bD = -0.5; px = -0.05;
      pz = -0.12 * Math.sin(k * Math.PI);
      break;
    }
    case 2: { // barrida
      pz = 1.2; py = 0.28; pD = 1.3; pI = 0.5; bI = -1.2; bD = 1.5; bIx = 0.5; bDx = -0.5;
      break;
    }
    case 3: { // voadora (patada voladora)
      const k = Math.min(1, t / 0.65);
      pz = 0.35 + 0.5 * Math.sin(k * Math.PI);
      pD = 1.9 * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5);
      pI = -0.9; bI = 1.6; bD = 2.2; bIx = 0.6; bDx = -0.6;
      break;
    }
    case 4: { // mareado ("tuneado")
      pz = Math.sin(t * 7) * 0.18; px = Math.cos(t * 5) * 0.15;
      bI = 0.4 + Math.sin(t * 9) * 0.4; bD = 0.4 - Math.sin(t * 9) * 0.4; bIx = 0.5; bDx = -0.5;
      estrellas.visible = true; estrellas.rotation.y = t * 6;
      break;
    }
    case 5: { // KO (desmayado)
      const k = Math.min(1, t / 0.35);
      pz = 1.5 * k; py = 0.22 * k;
      bI = 2.6; bD = 2.4; pI = 0.25; pD = -0.1; bIx = 0.3; bDx = -0.3;
      estrellas.visible = true; estrellas.rotation.y = t * 4;
      break;
    }
    case 6: { // caída
      const k = Math.min(1, t / 0.2);
      const sube = t > 0.6 ? Math.min(1, (t - 0.6) / 0.3) : 0;
      pz = -1.35 * k * (1 - sube); py = 0.2 * k * (1 - sube);
      bI = 2.2 * (1 - sube); bD = 2.2 * (1 - sube); pI = 0.3; pD = -0.3;
      break;
    }
    case 7: { // firuletes
      const tipo = extra || 1;
      if (tipo === 1) { // elástico
        const k = Math.min(1, t / 0.5);
        pDx = Math.sin(k * Math.PI * 2) * 0.7; pD = 0.4; px = Math.sin(k * Math.PI * 2) * 0.2; bI = 0.9; bD = 0.6; bIx = 0.8; bDx = -0.8;
      } else if (tipo === 2) { // pisada
        const k = Math.min(1, t / 0.5);
        pD = k < 0.4 ? 0.9 : 0.9 - (k - 0.4) * 2; py = 0.05; bI = 0.5; bD = 0.3;
      } else if (tipo === 3) { // roleta
        const k = Math.min(1, t / 0.7);
        pyR = k * Math.PI * 2; pD = 0.5 * Math.sin(k * Math.PI * 2); pI = -0.3; bI = 0.9; bD = 0.9; bIx = 0.9; bDx = -0.9;
      } else { // lambreta: taco hacia arriba
        const k = Math.min(1, t / 0.4);
        pD = -2.2 * Math.sin(Math.min(1, k) * Math.PI); pI = 0.1; pz = -0.15; bI = 0.8; bD = 0.8; bIx = 0.6; bDx = -0.6;
      }
      break;
    }
    case 8: { // baile / provocación
      px = Math.sin(t * 12) * 0.2; pyR = Math.sin(t * 6) * 0.5;
      bI = 2.6 + Math.sin(t * 14) * 0.4; bD = 2.6 - Math.sin(t * 14) * 0.4; bIx = 0.3; bDx = -0.3;
      pI = Math.sin(t * 12) * 0.4; pD = -pI;
      break;
    }
    case 9: { // festejo de gol
      py = Math.abs(Math.sin(t * 7)) * 0.4;
      bI = 2.9; bD = 2.9; bIx = 0.4 + Math.sin(t * 14) * 0.3; bDx = -0.4 - Math.sin(t * 14) * 0.3;
      pI = Math.sin(t * 14) * 0.3; pD = -pI; pyR = t * 3;
      break;
    }
    case 10: { // disparo
      bD = 1.55; bDx = 0; bI = 0.3; px = -0.03;
      pI = s * 0.6 * corre; pD = -pI;
      break;
    }
    default: { // correr / quieto
      pI = s * 0.85 * corre; pD = -pI;
      bI = -s * 0.7 * corre + 0.1; bD = s * 0.7 * corre + 0.1;
      py = Math.abs(Math.cos(p.fase)) * 0.06 * corre + Math.sin(performance.now() * 0.003) * 0.01;
      pz = -0.12 * corre;
    }
  }
  pose.position.set(0, py, 0);
  pose.rotation.set(px, pyR, pz);
  brazoI.rotation.set(-bIx, 0, bI);
  brazoD.rotation.set(-bDx, 0, bD);
  piernaI.rotation.set(pIx, 0, pI);
  piernaD.rotation.set(pDx, 0, pD);
  if (a === 10 || p.pistola.visible) brazoD.rotation.z = Math.max(bD, a === 10 ? 1.55 : bD);
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
