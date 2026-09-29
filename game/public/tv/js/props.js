// Props brasileños alrededor de la cancha: passistas de samba en un escenario,
// paredão de som, vira-latas caramelo, barraca de pastel, banderas de Brasil,
// banderines de fiesta, sillas de plástico y conservadoras. Pocos draw calls:
// cada figura animada es UNA malla con huesos; lo estático va fusionado.
import * as THREE from '../../vendor/three.module.min.js';
import { material, esTV } from './render.js';
import { pieza, fusionar, canvasTex } from './modelos.js';

const { mergeGeometries, RoundedBoxGeometry } = THREE;
const RS = esTV ? 8 : 12;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

// pieza con color por vértice y un hueso asignado (para mallas con esqueleto)
function parteH(geo, color, hueso, p, r, s) {
  _e.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0); _q.setFromEuler(_e);
  _m.compose(_v.set(p[0], p[1], p[2]), _q, _s.set(s ? s[0] : 1, s ? s[1] : 1, s ? s[2] : 1));
  geo.applyMatrix4(_m);
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.attributes.position.count, c = new THREE.Color(color);
  const col = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; si[i * 4] = hueso; sw[i * 4] = 1; }
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', g.attributes.position);
  o.setAttribute('normal', g.attributes.normal);
  o.setAttribute('color', new THREE.BufferAttribute(col, 3));
  o.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  o.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  return o;
}
function mallaConHuesos(partes, huesosDef, mat) {
  const geo = mergeGeometries(partes, false);
  for (const p of partes) p.dispose();
  const huesos = huesosDef.map((h) => { const b = new THREE.Bone(); b.position.set(h[2][0], h[2][1], h[2][2]); return b; });
  huesosDef.forEach((h, i) => { if (h[1] >= 0) huesos[h[1]].add(huesos[i]); });
  // las posiciones de arriba son absolutas: pasar a relativas al padre
  for (let i = huesosDef.length - 1; i >= 0; i--) {
    const pa = huesosDef[i][1];
    if (pa >= 0) huesos[i].position.sub(new THREE.Vector3(...huesosDef[pa][2]));
  }
  const m = new THREE.SkinnedMesh(geo, mat);
  m.add(huesos[0]); m.updateMatrixWorld(true);
  m.bind(new THREE.Skeleton(huesos));
  m.frustumCulled = false;
  return { m, huesos };
}
const esf = (r, a, b) => new THREE.SphereGeometry(r, a || RS, b || (RS * 0.7) | 0);
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 3, RS);
const cil = (a, b, h, s) => new THREE.CylinderGeometry(a, b, h, s || RS);

// ---------------------------------------------------------------------
//  Passista de samba (bailarina de carnaval)
// ---------------------------------------------------------------------
const HB = [   // [nombre, padre, posición absoluta]
  ['base', -1, [0, 0, 0]], ['cadera', 0, [0, 0.93, 0]], ['torso', 1, [0, 1.0, 0]], ['cabeza', 2, [0, 1.5, 0]],
  ['hombroI', 2, [0, 1.4, 0.17]], ['codoI', 4, [0, 1.16, 0.19]], ['hombroD', 2, [0, 1.4, -0.17]], ['codoD', 6, [0, 1.16, -0.19]],
  ['piernaI', 1, [0, 0.9, 0.09]], ['rodillaI', 8, [0, 0.5, 0.09]], ['piernaD', 1, [0, 0.9, -0.09]], ['rodillaD', 10, [0, 0.5, -0.09]],
];
function passista(piel, traje, plumas) {
  const L = [];
  const oro = '#e8b923';
  // piernas con sandalias de taco
  for (const [lado, hp, hr] of [[1, 8, 9], [-1, 10, 11]]) {
    const z = lado * 0.09;
    L.push(parteH(cap(0.078, 0.3), piel, hp, [0, 0.72, z]));
    L.push(parteH(cap(0.055, 0.3), piel, hr, [0, 0.32, z]));
    L.push(parteH(new THREE.BoxGeometry(0.18, 0.04, 0.08), oro, hr, [0.04, 0.05, z], [0, 0, 0.35]));
    L.push(parteH(cil(0.012, 0.012, 0.09, 5), oro, hr, [-0.05, 0.04, z]));
  }
  // cadera: pelvis, glúteos grandes y la tanga de lentejuelas
  L.push(parteH(esf(0.19), piel, 1, [0, 0.93, 0], null, [0.75, 0.7, 1.05]));
  for (const z of [-0.08, 0.08]) L.push(parteH(esf(0.15), piel, 1, [-0.085, 0.89, z], null, [1.1, 1, 0.95]));
  L.push(parteH(esf(0.2), traje, 1, [0.005, 0.95, 0], null, [0.78, 0.36, 1.07]));
  // plumas de la cintura (atrás)
  for (let k = 0; k < 7; k++) {
    const a = (k / 6 - 0.5) * 2.2;
    L.push(parteH(new THREE.ConeGeometry(0.045, 0.45, 5), plumas[k % plumas.length], 1, [-0.2 - Math.cos(a) * 0.02, 0.98, Math.sin(a) * 0.15], [a * 0.6, 0, -1.9 + Math.abs(a) * 0.2]));
  }
  // torso: cintura finita, pecho y top brillante
  L.push(parteH(new THREE.LatheGeometry([[0.11, 0], [0.105, 0.1], [0.13, 0.25], [0.14, 0.36], [0.11, 0.44], [0.06, 0.5]].map((p) => new THREE.Vector2(p[0], p[1])), RS), piel, 2, [0, 1.0, 0], null, [0.7, 1, 1]));
  for (const z of [-0.06, 0.06]) {
    L.push(parteH(esf(0.075), piel, 2, [0.075, 1.3, z]));
    L.push(parteH(esf(0.08), traje, 2, [0.08, 1.3, z], null, [0.7, 0.9, 0.9]));
  }
  L.push(parteH(new THREE.TorusGeometry(0.07, 0.012, 4, 10), oro, 2, [0.03, 1.42, 0], [0, 0, Math.PI / 2 - 0.3]));   // collar
  // espaldar de plumas (el "costeiro") detrás de los hombros
  for (let k = 0; k < 11; k++) {
    const a = (k / 10 - 0.5) * 2.8;
    L.push(parteH(new THREE.ConeGeometry(0.06, 0.95, 5), plumas[k % plumas.length], 2, [-0.16, 1.45 + Math.cos(a) * 0.35, Math.sin(a) * 0.42], [a * 0.9, 0, 0.25]));
  }
  // cabeza: cara, rodete y el tocado de plumas con corona
  L.push(parteH(cil(0.04, 0.045, 0.09), piel, 3, [0, 1.52, 0]));
  L.push(parteH(esf(0.095), piel, 3, [0.005, 1.63, 0], null, [1.05, 1.15, 0.92]));
  for (const z of [-0.035, 0.035]) L.push(parteH(esf(0.013, 6, 4), '#140c08', 3, [0.093, 1.645, z]));
  L.push(parteH(new THREE.BoxGeometry(0.012, 0.018, 0.05), '#c2185b', 3, [0.097, 1.585, 0]));   // labios
  L.push(parteH(esf(0.1), '#120c08', 3, [-0.02, 1.68, 0], null, [1.05, 0.8, 1]));               // pelo
  L.push(parteH(cil(0.11, 0.1, 0.05), oro, 3, [0, 1.73, 0], [0, 0, 0.15]));                       // corona
  for (let k = 0; k < 9; k++) {
    const a = (k / 8 - 0.5) * 2.2;
    L.push(parteH(new THREE.ConeGeometry(0.03, 0.6, 5), plumas[(k + 1) % plumas.length], 3, [-0.03, 1.98 + Math.cos(a) * 0.05, Math.sin(a) * 0.2], [a * 0.55, 0, 0.35]));
  }
  // brazos con pulseras
  for (const [lado, hb, hc] of [[1, 4, 5], [-1, 6, 7]]) {
    const z = lado * 0.19;
    L.push(parteH(cap(0.042, 0.2), piel, hb, [0, 1.29, z]));
    L.push(parteH(cap(0.036, 0.19), piel, hc, [0, 1.05, z]));
    L.push(parteH(new THREE.TorusGeometry(0.04, 0.01, 4, 8), oro, hc, [0, 0.97, z], [Math.PI / 2, 0, 0]));
    L.push(parteH(esf(0.04, 6, 5), piel, hc, [0, 0.92, z]));
  }
  return mallaConHuesos(L, HB, material({ vertexColors: true, rough: 0.35, metal: 0.25 }));
}

// ---------------------------------------------------------------------
//  Vira-lata caramelo (el perro callejero más famoso de Brasil)
// ---------------------------------------------------------------------
const HP = [
  ['base', -1, [0, 0, 0]], ['cuerpo', 0, [0, 0.42, 0]], ['cabeza', 1, [0.3, 0.52, 0]], ['cola', 1, [-0.3, 0.5, 0]],
  ['patDI', 1, [0.22, 0.36, 0.09]], ['patDD', 1, [0.22, 0.36, -0.09]], ['patTI', 1, [-0.22, 0.36, 0.09]], ['patTD', 1, [-0.22, 0.36, -0.09]],
];
function perro(color) {
  const c2 = '#f1d9b0', L = [];
  L.push(parteH(cap(0.12, 0.4), color, 1, [0, 0.43, 0], [0, 0, Math.PI / 2]));
  L.push(parteH(esf(0.11), c2, 1, [0.05, 0.37, 0], null, [2.2, 0.6, 0.9]));
  L.push(parteH(esf(0.1), color, 2, [0.38, 0.6, 0], null, [1.1, 1, 0.95]));
  L.push(parteH(new RoundedBoxGeometry(0.14, 0.08, 0.09, 1, 0.03), c2, 2, [0.49, 0.57, 0]));
  L.push(parteH(esf(0.022, 6, 4), '#111', 2, [0.56, 0.59, 0]));
  for (const z of [-0.06, 0.06]) {
    L.push(parteH(new THREE.ConeGeometry(0.04, 0.1, 4), '#8a5424', 2, [0.35, 0.7, z], [z > 0 ? 0.35 : -0.35, 0, -0.3]));
    L.push(parteH(esf(0.014, 5, 4), '#111', 2, [0.46, 0.63, z * 0.7]));
  }
  L.push(parteH(cap(0.025, 0.22), color, 3, [-0.4, 0.58, 0], [0, 0, 0.9]));
  for (const [k, x, z] of [[4, 0.22, 0.09], [5, 0.22, -0.09], [6, -0.22, 0.09], [7, -0.22, -0.09]]) {
    L.push(parteH(cap(0.035, 0.26), color, k, [x, 0.2, z]));
    L.push(parteH(esf(0.035, 6, 4), c2, k, [x + 0.02, 0.03, z]));
  }
  return mallaConHuesos(L, HP, material({ vertexColors: true, rough: 0.9 }));
}

// ---------------------------------------------------------------------
//  Texturas
// ---------------------------------------------------------------------
function texBandera() {
  return canvasTex(256, 180, (g, w, h) => {
    g.fillStyle = '#009c3b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffdf00';
    g.beginPath(); g.moveTo(w * 0.08, h / 2); g.lineTo(w / 2, h * 0.1); g.lineTo(w * 0.92, h / 2); g.lineTo(w / 2, h * 0.9); g.closePath(); g.fill();
    g.fillStyle = '#002776'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.24, 0, 7); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 7;
    g.beginPath(); g.arc(w / 2 - 12, h / 2 + 60, 78, -1.95, -1.05); g.stroke();
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(w / 2 - 30 + ((i * 37) % 60), h / 2 + 8 + ((i * 23) % 30), 1.6, 0, 7); g.fill(); }
    g.fillStyle = '#009c3b'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center';
  });
}
function texCartel() {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#f5c518'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#16a34a'; g.fillRect(0, h - 22, w, 22); g.fillRect(0, 0, w, 10);
    g.fillStyle = '#c1121f'; g.font = '64px Bangers, Impact'; g.textAlign = 'center';
    g.fillText('PASTEL · ESPETINHO', w / 2, 76);
    g.fillStyle = '#111'; g.font = '40px Marker, Bangers, Impact';
    g.fillText('caldo de cana gelado', w / 2, 124);
  });
}
function texParlante() {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#141416'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#2b2b30'; g.lineWidth = 4; g.strokeRect(4, 4, 120, 120);
    const gr = g.createRadialGradient(64, 70, 4, 64, 70, 46);
    gr.addColorStop(0, '#444'); gr.addColorStop(0.35, '#0c0c0c'); gr.addColorStop(0.8, '#1d1d20'); gr.addColorStop(1, '#555');
    g.fillStyle = gr; g.beginPath(); g.arc(64, 70, 46, 0, 7); g.fill();
    g.fillStyle = '#3a3a40'; g.beginPath(); g.arc(64, 18, 9, 0, 7); g.fill();
  });
}
function texToldo() {
  return canvasTex(256, 32, (g) => {
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#16a34a'; g.fillRect(i * 16, 0, 16, 32); }
  }, { repetir: true });
}

// ---------------------------------------------------------------------
//  Todo junto
// ---------------------------------------------------------------------
export function crearProps(tema, dims) {
  const grupo = new THREE.Group();
  const anim = [];
  const HX = dims.L / 2, HZ = dims.W / 2;
  const zFondo = -HZ - 2.1;             // detrás de la pared del fondo (se ve desde la cámara)
  const noche = !!tema.noche;

  // --- escenario de las passistas + paredão de som (fondo, a la izquierda) ---
  const xE = -7.5;
  const est = [];
  est.push(pieza(new THREE.BoxGeometry(6.4, 0.9, 1.9), '#3b2a1f', [xE, 0.45, zFondo]));
  est.push(pieza(new THREE.BoxGeometry(6.5, 0.08, 2.0), '#f5c518', [xE, 0.92, zFondo]));
  for (let i = 0; i < 9; i++) est.push(pieza(new THREE.BoxGeometry(0.7, 0.9, 0.02), i % 2 ? '#16a34a' : '#f5c518', [xE - 2.9 + i * 0.72, 0.45, zFondo + 0.96]));
  // paredão: pila de parlantes
  const texP = texParlante();
  const parl = [];
  for (let c = 0; c < 3; c++) for (let f = 0; f < 3; f++) parl.push(pieza(new THREE.BoxGeometry(0.7, 0.7, 0.55), '#ffffff', [xE + 3.9 + c * 0.72, 0.36 + f * 0.72, zFondo - 0.2], [0, -0.25, 0]));
  const mPar = new THREE.Mesh(fusionar(parl), material({ map: texP, vertexColors: true, rough: 0.7 }));
  grupo.add(mPar);
  const led = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.06), new THREE.MeshBasicMaterial({ color: 0xff2bd6 }));
  led.position.set(xE + 4.62, 2.22, zFondo + 0.1); led.rotation.y = -0.25;
  grupo.add(led);
  anim.push((t) => {
    const golpe = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 2.17)), 6);   // ~130 bpm
    mPar.scale.set(1, 1, 1 + golpe * 0.05);
    led.material.color.setHSL((t * 0.15) % 1, 1, 0.55 + golpe * 0.2);
  });
  grupo.add(new THREE.Mesh(fusionar(est), material({ vertexColors: true, rough: 0.8 })));

  // passistas bailando samba arriba del escenario
  const trajes = [['#f5c518', ['#f5c518', '#16a34a', '#ffffff', '#ff9f1c']], ['#ff2bd6', ['#ff2bd6', '#ffffff', '#a855f7', '#f5c518']], ['#1d9bf0', ['#1d9bf0', '#f5c518', '#ffffff', '#16a34a']]];
  const pieles = ['#7a4528', '#8a5030', '#6a3a20'];
  const cant = esTV ? 2 : 3;
  for (let i = 0; i < cant; i++) {
    const d = passista(pieles[i % 3], trajes[i % 3][0], trajes[i % 3][1]);
    const gr = new THREE.Group();
    gr.position.set(xE - 1.8 + i * (cant === 2 ? 3.6 : 1.8), 0.96, zFondo + 0.1);
    gr.rotation.y = -Math.PI / 2;            // miran a la cancha
    gr.add(d.m); grupo.add(gr);
    const h = {}; HB.forEach((b, k) => { h[b[0]] = d.huesos[k]; });
    const fase = i * 1.3;
    anim.push((t) => {
      const f = t * 11 + fase, a = Math.sin(f), b = Math.sin(f * 0.5);
      h.cadera.rotation.set(b * 0.22, b * 0.5, a * 0.08);          // la cadera va y viene (samba no pé)
      h.torso.rotation.set(-b * 0.15, -b * 0.35, 0);
      h.piernaI.rotation.z = a * 0.35; h.rodillaI.rotation.z = -0.3 - Math.max(0, a) * 0.4;
      h.piernaD.rotation.z = -a * 0.35; h.rodillaD.rotation.z = -0.3 - Math.max(0, -a) * 0.4;
      h.hombroI.rotation.set(-0.5 - b * 0.2, 0, 2.3 + a * 0.25); h.codoI.rotation.z = 0.6 + b * 0.4;
      h.hombroD.rotation.set(0.5 + b * 0.2, 0, 2.3 - a * 0.25); h.codoD.rotation.z = 0.6 - b * 0.4;
      h.cabeza.rotation.set(b * 0.12, b * 0.25, 0);
      d.huesos[0].position.y = Math.abs(a) * 0.03;
    });
  }

  // --- barraca de pastel (fondo, a la derecha) ---
  const xB = 8.5;
  const bar = [];
  bar.push(pieza(new THREE.BoxGeometry(2.4, 1.0, 0.8), '#8a5a32', [xB, 0.5, zFondo]));
  bar.push(pieza(new THREE.BoxGeometry(2.5, 0.06, 0.9), '#d9c7a3', [xB, 1.03, zFondo]));
  for (const x of [-1.15, 1.15]) bar.push(pieza(cil(0.04, 0.04, 2.3, 6), '#555', [xB + x, 1.15, zFondo - 0.3]));
  for (let i = 0; i < 6; i++) bar.push(pieza(new RoundedBoxGeometry(0.22, 0.05, 0.14, 1, 0.02), '#e9b44c', [xB - 0.8 + i * 0.3, 1.09, zFondo + 0.15]));   // pasteles
  bar.push(pieza(new THREE.BoxGeometry(0.7, 0.35, 0.45), '#2b2b2b', [xB + 1.8, 0.8, zFondo]));                                                          // parrilla
  for (let i = 0; i < 4; i++) bar.push(pieza(cil(0.012, 0.012, 0.5, 4), '#bbb', [xB + 1.62 + i * 0.12, 1.01, zFondo], [Math.PI / 2, 0, 0]));           // espetinhos
  // conservadoras de telgopor
  for (const [x, z] of [[xB - 2.2, zFondo + 0.2], [xB - 2.9, zFondo - 0.1]]) bar.push(pieza(new RoundedBoxGeometry(0.6, 0.4, 0.4, 1, 0.04), '#f4f4f4', [x, 0.2, z]));
  grupo.add(new THREE.Mesh(fusionar(bar), material({ vertexColors: true, rough: 0.8 })));
  const cartel = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75), material({ map: texCartel(), rough: 0.9, emissive: noche ? 0xffffff : 0x000000, emissiveIntensity: noche ? 0.5 : 0 }));
  cartel.position.set(xB, 2.35, zFondo - 0.28);
  cartel.material.emissiveMap = noche ? cartel.material.map : null;
  grupo.add(cartel);
  const toldo = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.6, 16, 1, true), material({ map: texToldo(), side: THREE.DoubleSide, rough: 0.9 }));
  toldo.position.set(xB, 2.95, zFondo - 0.1);
  grupo.add(toldo);
  // humo de la parrilla
  const nh = esTV ? 14 : 30;
  const humoPos = new Float32Array(nh * 3), humoV = [];
  for (let i = 0; i < nh; i++) humoV.push({ t: Math.random() * 3 });
  const gh = new THREE.BufferGeometry(); gh.setAttribute('position', new THREE.BufferAttribute(humoPos, 3));
  const humo = new THREE.Points(gh, new THREE.PointsMaterial({ color: 0xd8d8d8, size: 0.35, transparent: true, opacity: 0.35, depthWrite: false }));
  humo.frustumCulled = false; grupo.add(humo);
  anim.push((t, dt) => {
    for (let i = 0; i < nh; i++) {
      const q = humoV[i]; q.t += dt; if (q.t > 3) q.t -= 3;
      humoPos[i * 3] = xB + 1.8 + Math.sin(q.t * 2 + i) * 0.15 * q.t; humoPos[i * 3 + 1] = 1.05 + q.t * 0.7; humoPos[i * 3 + 2] = zFondo + Math.cos(i) * 0.1;
    }
    gh.attributes.position.needsUpdate = true;
  });

  // --- sillas de plástico (instanciadas) ---
  const silla = fusionar([
    pieza(new THREE.BoxGeometry(0.42, 0.04, 0.42), '#ffffff', [0, 0.45, 0]),
    pieza(new THREE.BoxGeometry(0.04, 0.45, 0.42), '#ffffff', [-0.2, 0.68, 0]),
    ...[[-0.18, -0.18], [-0.18, 0.18], [0.18, -0.18], [0.18, 0.18]].map(([x, z]) => pieza(cil(0.015, 0.02, 0.45, 5), '#ffffff', [x, 0.22, z])),
  ]);
  const sillas = [[xB - 1.3, zFondo + 1.0, 0.4], [xB - 0.6, zFondo + 1.1, -0.2], [xB + 2.9, zFondo + 0.7, 0.9], [-HX - 2.2, -3, 0], [-HX - 2.3, -1.9, 0.3], [HX + 2.2, 2.6, Math.PI]];
  const im = new THREE.InstancedMesh(silla, material({ vertexColors: true, rough: 0.6 }), sillas.length);
  sillas.forEach(([x, z, r], i) => { _m.compose(_v.set(x, 0, z), _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r), _s.set(1, 1, 1)); im.setMatrixAt(i, _m); im.setColorAt(i, new THREE.Color(i % 3 ? '#d62828' : '#f4f4f4')); });
  im.computeBoundingSphere(); grupo.add(im);

  // --- banderas de Brasil flameando ---
  const texB = texBandera();
  const banderas = [];
  for (const [x, z, alto] of [[-HX - 1.5, zFondo, 5.2], [HX + 1.5, zFondo, 5.2]]) {
    grupo.add(pieza2(new THREE.Mesh(cil(0.05, 0.06, alto, 6), material({ color: 0xcccccc, metal: 0.6, rough: 0.4 })), x, alto / 2, z));
    const geo = new THREE.PlaneGeometry(2.2, 1.55, 14, 6);
    const flag = new THREE.Mesh(geo, material({ map: texB, side: THREE.DoubleSide, rough: 0.8 }));
    flag.position.set(x + (x < 0 ? 1.12 : -1.12), alto - 0.85, z);
    grupo.add(flag);
    banderas.push({ geo, base: geo.attributes.position.array.slice(), lado: x < 0 ? 1 : -1 });
  }
  anim.push((t) => {
    for (const b of banderas) {
      const p = b.geo.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) {
        const x0 = b.base[i], y0 = b.base[i + 1];
        const d = (x0 * b.lado + 1.1) / 2.2;                 // 0 en el mástil, 1 en la punta
        p[i + 2] = Math.sin(t * 5 + d * 5 + y0) * 0.16 * d;
        p[i + 1] = y0 - d * d * 0.08;
      }
      b.geo.attributes.position.needsUpdate = true;
      b.geo.computeVertexNormals();
    }
  });

  // --- banderines de fiesta cruzando por arriba (una sola malla) ---
  const tri = [];
  const cols = ['#16a34a', '#f5c518', '#2563eb', '#ffffff', '#e11d48', '#ff9f1c'];
  const hilera = (x0, z0, x1, z1, y, n) => {
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, yy = y - Math.sin(t * Math.PI) * 0.9;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.2, 0, 0, 0.2, 0, 0, 0, -0.38, 0]), 3));
      g.computeVertexNormals();
      tri.push(pieza(g, cols[i % cols.length], [x, yy, z], [0, Math.atan2(-(z1 - z0), x1 - x0), 0]));
    }
  };
  hilera(-HX, zFondo + 0.8, HX, zFondo + 0.8, 4.6, 46);
  hilera(-HX - 1.4, -HZ, -HX - 1.4, HZ - 2, 4.2, 26);
  hilera(HX + 1.4, -HZ, HX + 1.4, HZ - 2, 4.2, 26);
  grupo.add(new THREE.Mesh(fusionar(tri), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));

  // --- perros caramelo: uno trota por el fondo, otro duerme la siesta al lado de la barraca ---
  const perros = [{ p: perro('#c8843f'), trota: true }, { p: perro('#b8742f'), trota: false }];
  perros.forEach((d, i) => {
    const gr = new THREE.Group(); gr.add(d.p.m); grupo.add(gr); d.gr = gr;
    const h = {}; HP.forEach((b, k) => { h[b[0]] = d.p.huesos[k]; }); d.h = h;
    if (!d.trota) { gr.position.set(xB - 1.6, 0, zFondo + 1.3); gr.rotation.y = 0.6; }
  });
  let px = -12, dir = 1;
  anim.push((t, dt) => {
    // perro 1: va y viene por el fondo, moviendo patas y cola
    const a = perros[0];
    px += dir * dt * 1.6;
    if (px > 13) dir = -1; if (px < -14) dir = 1;
    a.gr.position.set(px, 0, zFondo + 1.25);
    a.gr.rotation.y = dir > 0 ? 0 : Math.PI;
    const f = t * 9;
    a.h.patDI.rotation.z = Math.sin(f) * 0.5; a.h.patTD.rotation.z = Math.sin(f) * 0.5;
    a.h.patDD.rotation.z = -Math.sin(f) * 0.5; a.h.patTI.rotation.z = -Math.sin(f) * 0.5;
    a.h.cola.rotation.x = Math.sin(t * 14) * 0.6;
    a.h.cabeza.rotation.z = Math.sin(f * 0.5) * 0.08;
    a.p.huesos[0].position.y = Math.abs(Math.sin(f)) * 0.03;
    // perro 2: echado, respira y mueve la cola de vez en cuando
    const b = perros[1];
    b.h.cuerpo.position.y = -0.2; b.h.cuerpo.scale.y = 1 + Math.sin(t * 2) * 0.03;
    for (const k of ['patDI', 'patDD']) b.h[k].rotation.z = 1.3;
    for (const k of ['patTI', 'patTD']) b.h[k].rotation.z = -1.3;
    b.h.cola.rotation.x = Math.sin(t * 3) > 0.7 ? Math.sin(t * 16) * 0.5 : 0;
    b.h.cabeza.rotation.z = -0.35;
  });

  return {
    grupo,
    actualizar(t, dt) { for (const f of anim) f(t, dt); },
  };
}

function pieza2(m, x, y, z) { m.position.set(x, y, z); return m; }
