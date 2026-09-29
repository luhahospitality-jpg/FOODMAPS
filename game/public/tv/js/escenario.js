// Escenarios: cancha, jaula, arcos, favela de fondo (InstancedMesh por zonas),
// cielo y detalles de cada nivel. Todo armado en código.
import * as THREE from '../../vendor/three.module.min.js';
import { material, esTV } from './render.js';
import { pieza, fusionar, canvasTex } from './modelos.js';
import { crearProps } from './props.js';

// Números pseudoaleatorios con semilla (el fondo sale igual siempre)
function semilla(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

const TEMAS = {
  laje: {
    cielo: ['#20163f', '#7a2f5c', '#e0643a', '#ffc27a'], niebla: '#d98a5f', nieblaCerca: 60, nieblaLejos: 190,
    hemi: ['#ffc59a', '#3a2a24', 1.25], sol: ['#ffd29a', 2.3, [-40, 26, -60]], piso: 'concreto', pared: 'grafiti', jaula: 3.2,
    favela: 'elevada', solVisible: true, cristo: true, noche: false,
  },
  praca: {
    cielo: ['#2e6fc4', '#5b9be0', '#a8d2f5', '#e4f1fb'], niebla: '#c4dcf0', nieblaCerca: 80, nieblaLejos: 230,
    hemi: ['#dcecff', '#5a4a3a', 1.35], sol: ['#fff3dd', 2.6, [30, 45, 20]], piso: 'pintado', pared: 'grafiti', jaula: 2.6,
    favela: 'alrededor', arboles: true, noche: false,
  },
  praia: {
    cielo: ['#2a74c9', '#6aaee8', '#bfe2f7', '#fbeed7'], niebla: '#d5e8f3', nieblaCerca: 90, nieblaLejos: 260,
    hemi: ['#eaf4ff', '#b89a6a', 1.35], sol: ['#fff0d0', 2.7, [-20, 40, -40]], piso: 'arena', pared: 'madera', jaula: 0,
    favela: 'lejana', mar: true, palmeras: true, noche: false,
  },
  noturno: {
    cielo: ['#03040b', '#0a1030', '#1b2250', '#3a2d4f'], niebla: '#0c1024', nieblaCerca: 45, nieblaLejos: 160,
    hemi: ['#6f80d8', '#1a1a2a', 1.3], sol: ['#ffe2b0', 2.8, [8, 40, 18]], piso: 'asfalto', pared: 'grafiti', jaula: 3.2,
    favela: 'alrededor', noche: true, reflectores: true, cristo: true,
  },
};

export function crearEscenario(id, dims) {
  const tema = TEMAS[id] || TEMAS.laje;
  const rnd = semilla(id.length * 977 + id.charCodeAt(0) * 31);
  const L = dims.L, W = dims.W, HX = L / 2, HZ = W / 2;
  const grupo = new THREE.Group();
  const animables = [];

  // ---------------- luces ----------------
  const hemi = new THREE.HemisphereLight(tema.hemi[0], tema.hemi[1], tema.hemi[2]);
  grupo.add(hemi);
  const sol = new THREE.DirectionalLight(tema.sol[0], tema.sol[1]);
  const sp = tema.sol[2];
  sol.position.set(sp[0], sp[1], sp[2]);
  sol.target.position.set(0, 0, 0);
  grupo.add(sol); grupo.add(sol.target);
  if (!esTV) {
    // la sombra viene desde arriba (en el atardecer el sol real está muy bajo)
    sol.position.set(sp[0] * 0.4, 40, sp[2] * 0.4 + 10);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    const c = sol.shadow.camera;
    c.left = -26; c.right = 26; c.top = 18; c.bottom = -18; c.near = 5; c.far = 90;
    sol.shadow.bias = -0.0008;
    sol.shadow.normalBias = 0.03;
  }

  // ---------------- cielo ----------------
  const texCielo = canvasTex(4, 256, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 256);
    const c = tema.cielo;
    gr.addColorStop(0, c[0]); gr.addColorStop(0.35, c[1]); gr.addColorStop(0.62, c[2]); gr.addColorStop(0.72, c[3]); gr.addColorStop(1, c[3]);
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  }, { sinMip: true });
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(300, 16, 12), new THREE.MeshBasicMaterial({ map: texCielo, side: THREE.BackSide, fog: false, depthWrite: false }));
  cielo.renderOrder = -10;
  grupo.add(cielo);

  if (tema.solVisible || tema.noche) {
    const texSol = canvasTex(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      if (tema.noche) { gr.addColorStop(0, 'rgba(240,240,255,1)'); gr.addColorStop(0.22, 'rgba(220,225,255,0.9)'); gr.addColorStop(0.3, 'rgba(160,170,255,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); }
      else { gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.25, 'rgba(255,210,120,0.95)'); gr.addColorStop(0.5, 'rgba(255,140,60,0.35)'); gr.addColorStop(1, 'rgba(255,100,40,0)'); }
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    }, { sinMip: true });
    const astro = new THREE.Sprite(new THREE.SpriteMaterial({ map: texSol, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    astro.position.set(tema.noche ? 60 : -40, tema.noche ? 90 : 24, -260);
    astro.scale.setScalar(tema.noche ? 40 : 90);
    grupo.add(astro);
  }
  if (tema.noche) {
    const n = esTV ? 250 : 600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, e = 0.15 + rnd() * 1.2;
      pos[i * 3] = Math.cos(a) * Math.cos(e) * 280; pos[i * 3 + 1] = Math.sin(e) * 280; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 280;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    grupo.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false, fog: false })));
  }

  // ---------------- piso de la cancha ----------------
  const MARGEN = 3;
  const PL = L + MARGEN * 2, PW = W + MARGEN * 2;
  const ppu = esTV ? 20 : 32;       // píxeles por unidad
  const texPiso = canvasTex(Math.round(PL * ppu), Math.round(PW * ppu), (g, w, h) => {
    const u = ppu;
    const base = { concreto: '#77716a', pintado: '#2f6d5b', arena: '#dcc38f', asfalto: '#3a3e47' }[tema.piso];
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // ruido y manchas
    for (let i = 0; i < w * h / 180; i++) {
      const v = rnd();
      g.fillStyle = tema.piso === 'arena' ? (v < 0.5 ? 'rgba(160,130,80,0.18)' : 'rgba(255,245,215,0.2)') : (v < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.06)');
      g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3);
    }
    for (let i = 0; i < 26; i++) {
      g.fillStyle = tema.piso === 'asfalto' ? 'rgba(120,140,200,0.10)' : 'rgba(0,0,0,0.10)';
      g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 20 + rnd() * 80, 10 + rnd() * 40, rnd() * 3, 0, 7); g.fill();
    }
    if (tema.piso === 'pintado') { g.fillStyle = '#3a4f8f'; g.fillRect(MARGEN * u, MARGEN * u, L * u, W * u); g.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < 400; i++) g.fillRect(rnd() * w, rnd() * h, 6, 2); }
    if (tema.piso !== 'arena') {
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5;
      for (let i = 0; i < 18; i++) { g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
    }
    // líneas
    const X = (x) => (x + PL / 2) * u, Y = (z) => (z + PW / 2) * u;
    g.strokeStyle = tema.piso === 'arena' ? '#1f5fbf' : 'rgba(245,245,240,0.85)';
    g.lineWidth = 0.14 * u;
    g.strokeRect(X(-HX), Y(-HZ), L * u, W * u);
    g.beginPath(); g.moveTo(X(0), Y(-HZ)); g.lineTo(X(0), Y(HZ)); g.stroke();
    g.beginPath(); g.arc(X(0), Y(0), 3 * u, 0, Math.PI * 2); g.stroke();
    for (const s of [-1, 1]) {
      g.beginPath(); g.arc(X(s * HX), Y(0), 4.5 * u, s > 0 ? Math.PI / 2 : -Math.PI / 2, s > 0 ? Math.PI * 1.5 : Math.PI / 2); g.stroke();
      g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(X(s * (HX - 6)), Y(0), 0.15 * u, 0, 7); g.fill();
    }
    // corona en el centro (como el moodboard)
    g.fillStyle = tema.piso === 'arena' ? 'rgba(31,95,191,0.5)' : 'rgba(245,197,24,0.8)';
    const cx = X(0), cy = Y(0), s = u * 1.3;
    g.beginPath(); g.moveTo(cx - s, cy + s * 0.6); g.lineTo(cx - s * 1.1, cy - s * 0.7); g.lineTo(cx - s * 0.5, cy - 0.05 * s); g.lineTo(cx, cy - s * 0.95); g.lineTo(cx + s * 0.5, cy - 0.05 * s); g.lineTo(cx + s * 1.1, cy - s * 0.7); g.lineTo(cx + s, cy + s * 0.6); g.closePath(); g.fill();
  });
  texPiso.anisotropy = esTV ? 1 : 8;
  const matPiso = material({ map: texPiso, rough: tema.piso === 'asfalto' ? 0.35 : 0.95, metal: tema.piso === 'asfalto' ? 0.15 : 0 });
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(PL, PW), matPiso);
  piso.rotation.x = -Math.PI / 2;
  piso.receiveShadow = !esTV;
  grupo.add(piso);

  // ---------------- paredes con grafitis ----------------
  const texGraf = canvasTex(1024, 128, (g, w, h) => {
    const base = tema.pared === 'madera' ? '#8a5a32' : '#5d5a57';
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    if (tema.pared === 'madera') {
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#7a4d2a' : '#936239'; g.fillRect(0, i * 32, w, 30); }
      g.fillStyle = '#f5c518'; g.font = '56px Bangers, Impact'; g.fillText('FABELA FOOTBALL', 40, 88); g.fillText('PRAIA', 700, 88);
      return;
    }
    for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(0,0,0,' + rnd() * 0.15 + ')'; g.fillRect(rnd() * w, rnd() * h, 4 + rnd() * 20, 2 + rnd() * 8); }
    const cols = ['#f5c518', '#16a34a', '#2563eb', '#e11d48', '#9333ea', '#f97316', '#06b6d4', '#ffffff'];
    const palabras = ['FABELA', 'GOL!', 'RUA', 'CRAQUE', 'FUTEBOL', 'MORRO', 'VAI!', 'OLÉ', 'BRABO', 'LAJE', '10'];
    for (let i = 0; i < 14; i++) {
      g.fillStyle = cols[(rnd() * cols.length) | 0];
      g.globalAlpha = 0.9;
      g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 30 + rnd() * 60, 20 + rnd() * 30, rnd() * 3, 0, 7); g.fill();
    }
    for (let i = 0; i < 9; i++) {
      const x = (i / 9) * w + rnd() * 30, y = 50 + rnd() * 60;
      g.save(); g.translate(x, y); g.rotate((rnd() - 0.5) * 0.3);
      g.font = (34 + rnd() * 30 | 0) + 'px Marker, Bangers, Impact';
      g.lineWidth = 6; g.strokeStyle = '#111'; g.fillStyle = cols[(rnd() * cols.length) | 0];
      const p = palabras[(rnd() * palabras.length) | 0];
      g.strokeText(p, 0, 0); g.fillText(p, 0, 0);
      g.fillRect(10, 6, 3, 10 + rnd() * 20);            // chorreado
      g.restore();
    }
    g.globalAlpha = 1;
  }, { repetir: true });
  const altoPared = tema.pared === 'madera' ? 0.55 : 1.1;
  const paredes = [];
  const ladoLargo = (z) => {
    const geo = new THREE.BoxGeometry(L + 0.6, altoPared, 0.3);
    escalarUV(geo, (L + 0.6) / 8, 1);
    paredes.push(pieza(geo, '#ffffff', [0, altoPared / 2, z]));
  };
  ladoLargo(-HZ - 0.15); ladoLargo(HZ + 0.15);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const largo = HZ - dims.gw;
    const geo = new THREE.BoxGeometry(0.3, altoPared, largo);
    escalarUV(geo, largo / 8, 1);
    paredes.push(pieza(geo, '#ffffff', [sx * (HX + 0.15), altoPared / 2, sz * (dims.gw + largo / 2)]));
  }
  const mParedes = new THREE.Mesh(fusionar(paredes), material({ map: texGraf, vertexColors: true, rough: 0.9 }));
  mParedes.receiveShadow = !esTV; mParedes.castShadow = !esTV;
  grupo.add(mParedes);

  // ---------------- jaula (alambrado) ----------------
  if (tema.jaula > 0) {
    const texAlambre = canvasTex(64, 64, (g) => {
      g.clearRect(0, 0, 64, 64);
      g.strokeStyle = 'rgba(200,205,210,0.9)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, 32); g.lineTo(32, 0); g.lineTo(64, 32); g.lineTo(32, 64); g.closePath(); g.stroke();
    }, { repetir: true });
    const h0 = altoPared, h1 = tema.jaula;
    const alto = h1 - h0;
    const planos = [];
    const plano = (w, h, x, y, z, ry) => { const g = new THREE.PlaneGeometry(w, h); escalarUV(g, w / 0.9, h / 0.9); planos.push(pieza(g, '#ffffff', [x, y, z], [0, ry, 0])); };
    plano(L + 0.6, alto, 0, h0 + alto / 2, -HZ - 0.15, 0);
    for (const sx of [-1, 1]) {
      plano(W + 0.3, h1 - dims.gh - 0.1, sx * (HX + 0.15), dims.gh + 0.1 + (h1 - dims.gh - 0.1) / 2, 0, Math.PI / 2);
      for (const sz of [-1, 1]) { const largo = HZ - dims.gw; plano(largo, dims.gh + 0.1 - h0, sx * (HX + 0.15), h0 + (dims.gh + 0.1 - h0) / 2, sz * (dims.gw + largo / 2), Math.PI / 2); }
    }
    const matAl = esTV ? new THREE.MeshBasicMaterial({ map: texAlambre, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, vertexColors: true, color: 0x8a8f96 })
      : material({ map: texAlambre, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, vertexColors: true, metal: 0.6, rough: 0.4 });
    const malla = new THREE.Mesh(fusionar(planos), matAl);
    grupo.add(malla);
    const postes = [];
    for (let x = -HX; x <= HX + 0.01; x += 6) for (const sz of [-1]) postes.push(pieza(new THREE.CylinderGeometry(0.06, 0.06, h1, 6), '#3b3f45', [x, h1 / 2, sz * (HZ + 0.2)]));
    for (const sx of [-1, 1]) for (const z of [-HZ, -dims.gw - 0.1, dims.gw + 0.1]) postes.push(pieza(new THREE.CylinderGeometry(0.06, 0.06, h1, 6), '#3b3f45', [sx * (HX + 0.2), h1 / 2, z]));
    postes.push(pieza(new THREE.CylinderGeometry(0.045, 0.045, L + 0.6, 6), '#3b3f45', [0, h1, -HZ - 0.2], [0, 0, Math.PI / 2]));
    grupo.add(new THREE.Mesh(fusionar(postes), material({ vertexColors: true, metal: 0.5, rough: 0.5 })));
  }

  // ---------------- arcos ----------------
  const marcos = [], redes = [];
  const texRed = canvasTex(32, 32, (g) => { g.clearRect(0, 0, 32, 32); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2; g.strokeRect(0, 0, 32, 32); }, { repetir: true });
  for (const s of [-1, 1]) {
    const x = s * HX, gw = dims.gw, gh = dims.gh, gd = dims.gd;
    const R = 0.075;
    for (const z of [-gw, gw]) marcos.push(pieza(new THREE.CylinderGeometry(R, R, gh, 8), '#f4f4f4', [x, gh / 2, z]));
    marcos.push(pieza(new THREE.CylinderGeometry(R, R, gw * 2 + R * 2, 8), '#f4f4f4', [x, gh, 0], [Math.PI / 2, 0, 0]));
    for (const z of [-gw, gw]) marcos.push(pieza(new THREE.CylinderGeometry(0.03, 0.03, gd, 6), '#bbbbbb', [x + s * gd / 2, gh, z], [0, 0, Math.PI / 2]));
    const red = (w, h, px, py, pz, rx, ry) => { const g = new THREE.PlaneGeometry(w, h); escalarUV(g, w / 0.25, h / 0.25); redes.push(pieza(g, '#ffffff', [px, py, pz], [rx, ry, 0])); };
    red(gw * 2, gh, x + s * gd, gh / 2, 0, 0, Math.PI / 2);
    red(gd, gh, x + s * gd / 2, gh / 2, -gw, 0, 0);
    red(gd, gh, x + s * gd / 2, gh / 2, gw, 0, 0);
    red(gd, gw * 2, x + s * gd / 2, gh, 0, -Math.PI / 2, 0);
  }
  const mMarcos = new THREE.Mesh(fusionar(marcos), material({ vertexColors: true, rough: 0.4 }));
  mMarcos.castShadow = !esTV;
  grupo.add(mMarcos);
  grupo.add(new THREE.Mesh(fusionar(redes), new THREE.MeshBasicMaterial({ map: texRed, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, vertexColors: true })));

  // ---------------- base elevada (laje) ----------------
  let baseY = 0;
  if (tema.favela === 'elevada') {
    baseY = -9;
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), material({ color: 0x5a3f33, rough: 1 }));
    suelo.rotation.x = -Math.PI / 2; suelo.position.y = -14;
    grupo.add(suelo);
    const edificio = new THREE.Mesh(new THREE.BoxGeometry(PL + 1, 9, PW + 1), material({ color: 0x9c6b4e, rough: 0.9 }));
    edificio.position.y = -4.52;
    grupo.add(edificio);
  }

  // ---------------- favela (casas por pisos, instanciadas por zona) ----------------
  // Cada casa se arma con "pisos" de 2.8 m: así las ventanas no se estiran.
  // Dos tipos: ladrillo a la vista (el clásico de la favela) y revocadas pintadas.
  const PISO_H = 2.8;
  const fachada = (ladrillo, luz) => canvasTex(128, 128, (g) => {
    if (luz) { g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128); }
    else if (ladrillo) {
      g.fillStyle = '#b9b2a8'; g.fillRect(0, 0, 128, 128);                 // mezcla
      for (let y = 0; y < 116; y += 8) for (let x = -((y / 8) % 2) * 8; x < 128; x += 16) {
        const v = 200 + rnd() * 55;
        g.fillStyle = 'rgb(' + (v | 0) + ',' + (v * 0.78 | 0) + ',' + (v * 0.62 | 0) + ')';
        g.fillRect(x + 1, y + 1, 14, 6);
      }
    } else {
      g.fillStyle = '#ece6dc'; g.fillRect(0, 0, 128, 128);
      for (let k = 0; k < 90; k++) { g.fillStyle = 'rgba(80,60,40,' + rnd() * 0.12 + ')'; g.fillRect(rnd() * 128, rnd() * 128, 2 + rnd() * 10, 2 + rnd() * 10); }
      for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(70,55,40,0.12)'; g.fillRect(rnd() * 128, 0, 3 + rnd() * 4, 60 + rnd() * 60); }   // chorreado
    }
    // losa de hormigón (la "laje") abajo
    if (!luz) { g.fillStyle = '#8f8a84'; g.fillRect(0, 116, 128, 12); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 116, 128, 2); }
    // ventanas
    const ventanas = [[18, 30, 34, 44], [76, 30, 34, 44]];
    for (const [x, y, w, h] of ventanas) {
      if (luz) { g.fillStyle = rnd() < 0.7 ? ['#ffb347', '#ffd27a', '#ffe9b0'][(rnd() * 3) | 0] : '#000'; g.fillRect(x + 3, y + 3, w - 6, h - 6); continue; }
      g.fillStyle = '#e9e4da'; g.fillRect(x - 3, y - 3, w + 6, h + 6);          // marco
      g.fillStyle = tema.noche ? '#14141c' : '#27313d'; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(160,190,220,0.25)'; g.fillRect(x + 2, y + 2, w * 0.4, h - 4);
      g.strokeStyle = '#555'; g.lineWidth = 2;                                  // reja
      for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + (w * k) / 4, y); g.lineTo(x + (w * k) / 4, y + h); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 4, y + h + 3, w + 8, 4);   // sombra del alféizar
    }
  });
  const texLadrillo = fachada(true, false), texRevoque = fachada(false, false);
  const texLuz = tema.noche ? fachada(false, true) : null;
  const coloresCasa = tema.noche
    ? ['#6a5a8a', '#5a6a9a', '#8a5a6a', '#5a7a7a', '#7a7a5a', '#6a4a4a']
    : ['#e85d75', '#f2c14e', '#4ea8de', '#7bc96f', '#f08a4b', '#b07cc6', '#e9e2d4', '#58c4b0', '#f4a3b5', '#9ad0f5'];
  const coloresLadrillo = tema.noche ? ['#8a6a5a', '#7a5a4a'] : ['#ffffff', '#f3e0d0', '#ffe8d6'];
  const casas = [];
  // cada casa llega hasta el piso (así no flotan): favela apilada
  const pisoFavela = tema.favela === 'elevada' ? -14 : -0.1;
  const agregarCasa = (x, y, z, w, h, d) => {
    const techo = y + h;
    const ladrillo = rnd() < 0.45;
    casas.push({ x, y: pisoFavela, z, w, h: techo - pisoFavela, d, ladrillo, rot: (rnd() - 0.5) * 0.3,
      c: ladrillo ? coloresLadrillo[(rnd() * coloresLadrillo.length) | 0] : coloresCasa[(rnd() * coloresCasa.length) | 0] });
  };
  if (tema.favela === 'elevada') {
    // la cancha está en una terraza: casas abajo y el morro atrás
    for (let i = 0; i < 520; i++) {
      const a = rnd() * Math.PI * 2, r = 24 + rnd() * 75;
      const x = Math.cos(a) * r * 1.3, z = Math.sin(a) * r;
      if (z > 30 && Math.abs(x) < 40) continue;
      const cerro = z < 0 ? (-z - 20) * 0.45 : -2;
      agregarCasa(x, baseY - 4 + Math.max(0, cerro) + rnd() * 2, z, 3 + rnd() * 3, 3 + rnd() * 5, 3 + rnd() * 3);
    }
  } else if (tema.favela === 'alrededor') {
    for (let i = 0; i < 480; i++) {
      const a = rnd() * Math.PI * 2, r = 30 + rnd() * 70;
      const x = Math.cos(a) * r * 1.2, z = Math.sin(a) * r;
      if (z > 22 && Math.abs(x) < 35) continue;
      const cerro = z < -24 ? (-z - 24) * 0.5 : 0;
      agregarCasa(x, cerro + rnd() * 1.5 - 1, z, 3 + rnd() * 3.5, 3 + rnd() * 5 + (r < 40 ? 2 : 0), 3 + rnd() * 3);
    }
  } else {
    for (let i = 0; i < 260; i++) {
      const x = -140 + rnd() * 110, z = -60 - rnd() * 90;
      const cerro = (x + 150) * 0.12 + (-z - 60) * 0.35;
      agregarCasa(x, cerro, z, 3 + rnd() * 3, 3 + rnd() * 4, 3 + rnd() * 3);
    }
  }
  // un "piso" por instancia
  const pisosL = [], pisosR = [], losas = [];
  for (const c of casas) {
    const n = Math.max(1, Math.round(c.h / PISO_H));
    const alto = c.h / n;
    for (let k = 0; k < n; k++) (c.ladrillo ? pisosL : pisosR).push({ x: c.x, y: c.y + k * alto, z: c.z, w: c.w, h: alto, d: c.d, rot: c.rot, c: c.c });
    losas.push({ x: c.x, y: c.y + c.h, z: c.z, w: c.w + 0.3, d: c.d + 0.3, rot: c.rot, c: tema.noche ? '#3a3a44' : '#9a948c' });
  }
  const componerPiso = (c, m) => m.compose(new THREE.Vector3(c.x, c.y + c.h / 2, c.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.rot), new THREE.Vector3(c.w, c.h, c.d));
  const opLuz = texLuz ? { emissiveMap: texLuz, emissive: 0xffffff, emissiveIntensity: 1.5 } : {};
  const geoPiso = new THREE.BoxGeometry(1, 1, 1);
  // sin tapas arriba/abajo (se ven las losas): saco las caras ±y del índice
  geoPiso.clearGroups();
  const idx = Array.from(geoPiso.index.array);
  geoPiso.setIndex(idx.slice(0, 12).concat(idx.slice(24)));
  instanciarPorZona(grupo, pisosL, geoPiso, material(Object.assign({ map: texLadrillo, rough: 0.95 }, opLuz)), componerPiso);
  instanciarPorZona(grupo, pisosR, geoPiso, material(Object.assign({ map: texRevoque, rough: 0.9 }, opLuz)), componerPiso);
  instanciarPorZona(grupo, losas, new THREE.BoxGeometry(1, 0.25, 1), material({ color: 0xffffff, rough: 1 }), (c, m) => {
    m.compose(new THREE.Vector3(c.x, c.y + 0.12, c.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.rot), new THREE.Vector3(c.w, 1, c.d));
  });

  // cables de luz colgando (el enredo típico) y ropa tendida
  {
    const pts = [];
    const cerca = casas.filter((c) => Math.abs(c.x) < 60 && c.z < -12 && c.z > -60);
    for (let k = 0; k < (esTV ? 30 : 60) && cerca.length > 1; k++) {
      const a = cerca[(rnd() * cerca.length) | 0], b = cerca[(rnd() * cerca.length) | 0];
      if (a === b || Math.abs(a.x - b.x) > 25) continue;
      const ya = a.y + a.h - 0.4, yb = b.y + b.h - 0.4;
      const tramos = 8, caida = 0.8 + rnd() * 1.5;
      for (let i = 0; i < tramos; i++) {
        const t0 = i / tramos, t1 = (i + 1) / tramos;
        const p = (t) => [a.x + (b.x - a.x) * t, ya + (yb - ya) * t - Math.sin(t * Math.PI) * caida, a.z + (b.z - a.z) * t];
        pts.push(...p(t0), ...p(t1));
      }
    }
    const gc = new THREE.BufferGeometry(); gc.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    grupo.add(new THREE.LineSegments(gc, new THREE.LineBasicMaterial({ color: 0x111111 })));
    if (!tema.noche) {
      const ropa = [];
      const cols = ['#e11d48', '#f5c518', '#2563eb', '#ffffff', '#16a34a', '#f97316', '#9333ea'];
      for (let k = 0; k < (esTV ? 30 : 70); k++) {
        const c = cerca[(rnd() * cerca.length) | 0]; if (!c) break;
        ropa.push(pieza(new THREE.PlaneGeometry(0.6 + rnd() * 0.4, 0.7 + rnd() * 0.5), cols[(rnd() * cols.length) | 0], [c.x + (rnd() - 0.5) * c.w, c.y + c.h - 1.2 - rnd() * 3, c.z + c.d / 2 + 0.15], [0, 0, (rnd() - 0.5) * 0.2]));
      }
      if (ropa.length) grupo.add(new THREE.Mesh(fusionar(ropa), material({ vertexColors: true, side: THREE.DoubleSide, rough: 1 })));
    }
  }
  // cajas de agua azules en los techos
  const tanques = casas.filter(() => rnd() < 0.18).map((c) => ({ x: c.x + (rnd() - 0.5) * c.w * 0.5, y: c.y + c.h + 0.25, z: c.z, c: '#2f6fd6' }));
  instanciarPorZona(grupo, tanques, new THREE.CylinderGeometry(0.7, 0.6, 1, 8), material({ color: 0xffffff, rough: 0.6 }), (c, m) => {
    m.compose(new THREE.Vector3(c.x, c.y + 0.5, c.z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
  });

  // ---------------- cerros y Cristo ----------------
  const cerros = [];
  const cerro = (x, z, r, h, color) => cerros.push(pieza(new THREE.ConeGeometry(r, h, esTV ? 9 : 14, 1), color, [x, h / 2 - 2, z], null, [1, 1, 0.7]));
  const cCerro = tema.noche ? '#0f1426' : (id === 'laje' ? '#3a2c3c' : '#3f6b45');
  cerro(-90, -200, 60, 70, cCerro); cerro(20, -230, 80, 95, cCerro); cerro(120, -190, 55, 60, cCerro);
  if (tema.mar || id === 'laje') {
    // Pan de Azúcar
    const lathe = (x, z, esc, color) => {
      const pts = [];
      for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(Math.sin((1 - t) * Math.PI * 0.5) * 12 * (1 - t * 0.3), t * 30)); }
      cerros.push(pieza(new THREE.LatheGeometry(pts, esTV ? 8 : 14), color, [x, -2, z], null, [esc, esc, esc]));
    };
    const cPan = id === 'laje' ? '#2e2233' : '#4a6a50';
    lathe(70, -170, 1.3, cPan); lathe(40, -150, 0.7, cPan);
  }
  if (tema.cristo) {
    const cx = 20, cz = -230, cy = 93;
    const col = tema.noche ? '#dfe6ff' : '#e9dccb';
    cerros.push(pieza(new THREE.BoxGeometry(1.6, 7, 1.6), col, [cx, cy + 3.5, cz]));
    cerros.push(pieza(new THREE.BoxGeometry(9, 1.1, 1.1), col, [cx, cy + 6, cz]));
    cerros.push(pieza(new THREE.SphereGeometry(0.8, 6, 5), col, [cx, cy + 7.8, cz]));
    cerros.push(pieza(new THREE.BoxGeometry(2.4, 2, 2.4), '#6a5a4a', [cx, cy - 1, cz]));
  }
  grupo.add(new THREE.Mesh(fusionar(cerros), tema.noche && tema.cristo ? new THREE.MeshBasicMaterial({ vertexColors: true }) : material({ vertexColors: true, rough: 1 })));

  // ---------------- mar ----------------
  if (tema.mar) {
    const texMar = canvasTex(256, 256, (g) => {
      g.fillStyle = '#1f78b4'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(255,255,255,' + rnd() * 0.35 + ')'; g.fillRect(rnd() * 256, rnd() * 256, 8 + rnd() * 20, 2); }
    }, { repetir: true });
    texMar.repeat.set(20, 12);
    const mar = new THREE.Mesh(new THREE.PlaneGeometry(600, 300), material({ map: texMar, rough: 0.25, metal: 0.1 }));
    mar.rotation.x = -Math.PI / 2; mar.position.set(0, -0.6, -190);
    grupo.add(mar);
    animables.push((t) => { texMar.offset.x = t * 0.004; texMar.offset.y = t * 0.01; });
    const arena = new THREE.Mesh(new THREE.PlaneGeometry(600, 60), material({ color: 0xe0c792, rough: 1 }));
    arena.rotation.x = -Math.PI / 2; arena.position.set(0, -0.05, -15);
    grupo.add(arena);
    const espuma = new THREE.Mesh(new THREE.PlaneGeometry(600, 2.5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    espuma.rotation.x = -Math.PI / 2; espuma.position.set(0, -0.3, -45);
    grupo.add(espuma);
    animables.push((t) => { espuma.position.z = -45 + Math.sin(t * 0.8) * 1.5; });
    const arenaFrente = new THREE.Mesh(new THREE.PlaneGeometry(600, 120), material({ color: 0xd8bd88, rough: 1 }));
    arenaFrente.rotation.x = -Math.PI / 2; arenaFrente.position.set(0, -0.06, 70);
    grupo.add(arenaFrente);
  } else if (tema.favela !== 'elevada') {
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), material({ color: tema.noche ? 0x1a1a22 : 0x6a655e, rough: 1 }));
    suelo.rotation.x = -Math.PI / 2; suelo.position.y = -0.08;
    grupo.add(suelo);
  }

  // ---------------- árboles y palmeras ----------------
  if (tema.arboles) {
    const arboles = [];
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2, r = 17 + rnd() * 14;
      const x = Math.cos(a) * r * 1.3, z = Math.sin(a) * r * 0.9;
      if (Math.abs(x) < HX + 3 && Math.abs(z) < HZ + 3) continue;
      if (z > 12 && Math.abs(x) < 26) continue;
      arboles.push({ x, z, s: 0.8 + rnd() * 0.6 });
    }
    const L2 = [pieza(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), '#5a3d25', [0, 1.5, 0]), pieza(new THREE.IcosahedronGeometry(2.2, esTV ? 0 : 1), '#3f8f3a', [0, 4.2, 0]), pieza(new THREE.IcosahedronGeometry(1.6, esTV ? 0 : 1), '#4fa845', [0.8, 5.2, 0.4])];
    instanciarPorZona(grupo, arboles, fusionar(L2), material({ vertexColors: true, rough: 1 }), (c, m) => {
      m.compose(new THREE.Vector3(c.x, 0, c.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.x), new THREE.Vector3(c.s, c.s, c.s));
    });
  }
  if (tema.palmeras || id === 'laje') {
    const palmas = [];
    const nP = id === 'laje' ? 14 : 24;
    for (let i = 0; i < nP; i++) {
      const x = -60 + rnd() * 120, z = id === 'laje' ? -30 - rnd() * 40 : -18 - rnd() * 14;
      if (Math.abs(x) < 22 && z > -20) continue;
      palmas.push({ x, z, y: id === 'laje' ? baseY + (-z - 20) * 0.45 + 1 : 0, s: 0.9 + rnd() * 0.5 });
    }
    const hojas = [pieza(new THREE.CylinderGeometry(0.18, 0.3, 8, 6), '#7a5a3a', [0, 4, 0], [0, 0, 0.12])];
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      hojas.push(pieza(new THREE.ConeGeometry(0.5, 3.6, 4), '#2f7d32', [Math.cos(a) * 1.4 + 0.5, 7.8, Math.sin(a) * 1.4], [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2 - 0.0]));
    }
    instanciarPorZona(grupo, palmas, fusionar(hojas), material({ vertexColors: true, rough: 1 }), (c, m) => {
      m.compose(new THREE.Vector3(c.x, c.y, c.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.x * 3), new THREE.Vector3(c.s, c.s, c.s));
    });
  }

  // ---------------- público ----------------
  const gente = [];
  for (let i = 0; i < (esTV ? 26 : 44); i++) {
    const lado = rnd() < 0.7 ? -1 : 1;
    const x = -HX - 2 + rnd() * (L + 4);
    const z = lado * (HZ + 1.2 + rnd() * 2.5);
    if (lado > 0 && Math.abs(x) < 12) continue;      // no tapar la cámara
    if (lado < 0 && ((x > -12 && x < -1.5) || (x > 5 && x < 12.5))) continue;   // ahí están el escenario y la barraca
    gente.push({ x, z, s: 0.85 + rnd() * 0.3, c: ['#e11d48', '#f5c518', '#16a34a', '#2563eb', '#f4f4f4', '#9333ea', '#111'][(rnd() * 7) | 0], f: rnd() * 6 });
  }
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) gente.push({ x: sx * (HX + 1.5 + rnd() * 2.5), z: -HZ + rnd() * W, s: 0.9, c: ['#e11d48', '#f5c518', '#16a34a', '#2563eb'][(rnd() * 4) | 0], f: rnd() * 6 });
  const geoPersona = fusionar([
    pieza(RoundedBoxGeometryLite(0.45, 0.7, 0.3), '#ffffff', [0, 1.15, 0]),
    pieza(new THREE.BoxGeometry(0.4, 0.8, 0.28), '#2a2a30', [0, 0.4, 0]),
    pieza(new THREE.SphereGeometry(0.17, 7, 5), '#9a6440', [0, 1.72, 0]),
  ]);
  const matGente = material({ vertexColors: true, rough: 1 });
  const publico = new THREE.InstancedMesh(geoPersona, matGente, gente.length);
  const mm = new THREE.Matrix4();
  gente.forEach((p, i) => {
    mm.compose(new THREE.Vector3(p.x, 0, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-p.x, -p.z) + Math.PI), new THREE.Vector3(p.s, p.s, p.s));
    publico.setMatrixAt(i, mm);
    publico.setColorAt(i, new THREE.Color(p.c));
  });
  publico.computeBoundingSphere();
  grupo.add(publico);
  let euforia = 0;
  animables.push((t, dt) => {
    // el público salta (se mueve todo junto: barato)
    euforia = Math.max(0, euforia - dt * 0.35);
    publico.position.y = Math.abs(Math.sin(t * 9)) * 0.35 * euforia + Math.abs(Math.sin(t * 2.3)) * 0.04;
  });

  // ---------------- barriletes (pipas) ----------------
  if (!tema.noche) {
    const pipas = [];
    const kc = ['#e11d48', '#f5c518', '#16a34a', '#2563eb', '#9333ea'];
    for (let i = 0; i < 6; i++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 1, 0, -0.7, 0, 0, 0, -1.2, 0, 0, 1, 0, 0, -1.2, 0, 0.7, 0, 0]), 3));
      g.computeVertexNormals();
      pipas.push(pieza(g, kc[i % 5], [-50 + i * 20 + rnd() * 8, 25 + rnd() * 12, -60 - rnd() * 30], [0, 0, (rnd() - 0.5) * 0.6], [2, 2, 2]));
    }
    const mPipas = new THREE.Mesh(fusionar(pipas), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    grupo.add(mPipas);
    animables.push((t) => { mPipas.position.y = Math.sin(t * 0.7) * 1.2; mPipas.position.x = Math.sin(t * 0.3) * 2; });
  }

  // ---------------- reflectores (noche) ----------------
  if (tema.reflectores) {
    const torres = [];
    const pos = [[-HX - 2, -HZ - 2], [HX + 2, -HZ - 2], [-HX - 2, HZ + 2], [HX + 2, HZ + 2]];
    for (const p of pos) {
      torres.push(pieza(new THREE.CylinderGeometry(0.12, 0.16, 9, 6), '#2b2f36', [p[0], 4.5, p[1]]));
      torres.push(pieza(new THREE.BoxGeometry(1.6, 0.6, 0.5), '#2b2f36', [p[0], 9, p[1]]));
    }
    grupo.add(new THREE.Mesh(fusionar(torres), material({ vertexColors: true, metal: 0.5, rough: 0.5 })));
    const texBrillo = canvasTex(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 1, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(0.2, 'rgba(255,235,190,0.8)'); gr.addColorStop(1, 'rgba(255,220,160,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    }, { sinMip: true });
    const matBr = new THREE.SpriteMaterial({ map: texBrillo, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    for (const p of pos) { const s = new THREE.Sprite(matBr); s.position.set(p[0], 9, p[1] + (p[1] < 0 ? 0.3 : -0.3)); s.scale.setScalar(6); grupo.add(s); }
    // faroles de la calle con brillo
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(matBr);
      s.position.set(-50 + i * 11 + rnd() * 4, 4 + rnd() * 18, -30 - rnd() * 40);
      s.scale.setScalar(2.5); grupo.add(s);
    }
  }

  // ---------------- props brasileños (bailarinas, perros, barraca, banderas) ----------------
  const props = crearProps(tema, dims);
  grupo.add(props.grupo);
  animables.push((t, dt) => props.actualizar(t, dt));

  grupo.traverse((o) => { if (o.isMesh && o !== cielo) o.matrixAutoUpdate = true; });

  return {
    grupo, tema, cielo,
    niebla: new THREE.Fog(tema.niebla, tema.nieblaCerca, tema.nieblaLejos),
    fondo: new THREE.Color(tema.cielo[2]),
    actualizar(t, dt) { for (const f of animables) f(t, dt); },
    festejar() { euforia = 1; },
  };
}

// Caja redondeada chica sin depender de segmentos (para el público)
function RoundedBoxGeometryLite(w, h, d) { return new THREE.RoundedBoxGeometry(w, h, d, 1, 0.08); }

function escalarUV(geo, su, sv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
}

// Reparte objetos repetidos en InstancedMesh por zonas (para que la cámara descarte lo que no ve)
function instanciarPorZona(grupo, lista, geo, mat, componer) {
  if (!lista.length) return;
  const zonas = {};
  for (const o of lista) {
    const k = Math.floor(o.x / 45) + ':' + Math.floor(o.z / 45);
    (zonas[k] = zonas[k] || []).push(o);
  }
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  for (const k in zonas) {
    const arr = zonas[k];
    const im = new THREE.InstancedMesh(geo, mat, arr.length);
    arr.forEach((o, i) => {
      componer(o, m);
      im.setMatrixAt(i, m);
      if (o.c) { col.set(o.c); im.setColorAt(i, col); }
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    im.receiveShadow = false;
    grupo.add(im);
  }
}
