import { THREE, canvasTexture, roundRect } from './core.js';
import { RoundedBoxGeometry } from '/vendor/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from '/vendor/BufferGeometryUtils.js';

// Personajes 3D del moodboard armados pieza por pieza. Todas las piezas de un mismo
// "material" se fusionan en UNA malla con colores por vertice: cada kart son ~4 draw
// calls (auto, piloto, cara, ruedas), clave para que la TV no sufra.
// Ejes del modelo: +X = hacia adelante, +Y = arriba, Z = costados.

export const MODEL_H = 370;

const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

class Parts {
  constructor() { this.list = []; }
  add(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute('uv');
    if (g.getAttribute('uv1')) g.deleteAttribute('uv1');
    _e.set(rx, ry, rz); _q.setFromEuler(_e);
    _m.compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(sx, sy, sz));
    g.applyMatrix4(_m);
    _c.set(color);
    const n = g.getAttribute('position').count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.list.push(g);
    return this;
  }
  box(w, h, d, color, x, y, z, rx, ry, rz, round = 0.18) {
    const r = Math.min(w, h, d) * round;
    return this.add(new RoundedBoxGeometry(d, h, w, 2, r), color, x, y, z, rx, ry, rz);
  }
  sharpBox(w, h, d, color, x, y, z, rx, ry, rz) {
    return this.add(new THREE.BoxGeometry(d, h, w), color, x, y, z, rx, ry, rz);
  }
  ball(rx, ry, rz, color, x, y, z, ax = 0, ay = 0, az = 0, seg = 16) {
    return this.add(new THREE.SphereGeometry(1, seg, Math.max(8, seg * 0.7 | 0)), color, x, y, z, ax, ay, az, rx, ry, rz);
  }
  cyl(rt, rb, h, color, x, y, z, rx = 0, ry = 0, rz = 0, seg = 16) {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y, z, rx, ry, rz);
  }
  cone(r, h, color, x, y, z, rx = 0, ry = 0, rz = 0, seg = 8) {
    return this.add(new THREE.ConeGeometry(r, h, seg), color, x, y, z, rx, ry, rz);
  }
  merged() { return this.list.length ? mergeGeometries(this.list) : null; }
}

// ---------- caras pintadas (como en el arte) ----------
function faceTexture(draw) {
  const t = canvasTexture(256, 256, (c, w, h) => { c.clearRect(0, 0, w, h); draw(c, w, h); });
  t.anisotropy = 4;
  return t;
}
function eye(c, x, y, rx, ry) {
  c.fillStyle = '#16121f';
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ffffff';
  c.beginPath(); c.ellipse(x - rx * 0.32, y - ry * 0.38, rx * 0.36, ry * 0.3, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x + rx * 0.3, y + ry * 0.35, rx * 0.14, 0, Math.PI * 2); c.fill();
}
function blush(c, x, y, r) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(255,120,150,0.75)'); g.addColorStop(1, 'rgba(255,120,150,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}

const FACES = {
  // CONEJO MALO: ojos de loco (uno mas grande), venitas rojas, ojeras, parpados caidos
  // en V, cejas de enojado, sonrisa torcida con dientes filosos y una cicatriz
  rabbit: () => faceTexture((c) => {
    const FUR = '#EAE4DF';
    [[76, 136, 1], [180, 134, -1]].forEach(([x, y]) => {
      const g = c.createRadialGradient(x, y + 16, 8, x, y + 16, 58);
      g.addColorStop(0, 'rgba(90,40,110,0.75)'); g.addColorStop(1, 'rgba(90,40,110,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y + 16, 58, 54, 0, 0, Math.PI * 2); c.fill();
    });
    const badEye = (x, y, rx, ry, iris, side) => {
      c.save();
      c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.clip();
      c.fillStyle = '#FFF4CF'; c.fillRect(x - rx, y - ry, rx * 2, ry * 2);
      c.strokeStyle = '#D8323C'; c.lineWidth = 2.4;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + 0.3, r0 = rx * 1.05, r1 = rx * (0.45 + (i % 3) * 0.1);
        c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * (ry / rx));
        c.quadraticCurveTo(x + Math.cos(a + 0.2) * (r0 + r1) / 2, y + Math.sin(a + 0.25) * (r0 + r1) / 2 * (ry / rx), x + Math.cos(a) * r1, y + Math.sin(a) * r1 * (ry / rx));
        c.stroke();
      }
      c.fillStyle = '#C8102E'; c.beginPath(); c.arc(x + side * rx * 0.12, y + ry * 0.1, rx * iris, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#10080c'; c.beginPath(); c.arc(x + side * rx * 0.12, y + ry * 0.1, rx * iris * 0.28, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x + side * rx * 0.12 - rx * 0.12, y - ry * 0.05, rx * 0.07, 0, Math.PI * 2); c.fill();
      // parpado de arriba caido, mas bajo del lado de adentro (mirada de malo)
      c.fillStyle = FUR;
      c.beginPath();
      const inner = side > 0 ? x + rx : x - rx, outer = side > 0 ? x - rx : x + rx;
      c.moveTo(outer, y - ry * 0.3); c.lineTo(inner, y + ry * 0.12); c.lineTo(inner, y - ry - 2); c.lineTo(outer, y - ry - 2); c.closePath(); c.fill();
      c.restore();
      c.strokeStyle = '#2a1a22'; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(outer, y - ry * 0.3); c.lineTo(inner, y + ry * 0.12); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.stroke();
    };
    badEye(76, 132, 40, 42, 0.36, 1);
    badEye(182, 130, 30, 33, 0.3, -1);
    // cejas gruesas en V
    c.strokeStyle = '#2a1a22'; c.lineWidth = 13; c.lineCap = 'round';
    c.beginPath(); c.moveTo(34, 74); c.lineTo(112, 100); c.stroke();
    c.beginPath(); c.moveTo(222, 78); c.lineTo(150, 98); c.stroke();
    // nariz
    c.fillStyle = '#E86A8E';
    c.beginPath(); c.moveTo(116, 170); c.lineTo(140, 170); c.lineTo(128, 184); c.closePath(); c.fill();
    // sonrisa torcida con dientes filosos
    c.fillStyle = '#2B0F18';
    c.beginPath(); c.moveTo(70, 196); c.quadraticCurveTo(120, 214, 194, 188); c.quadraticCurveTo(150, 246, 96, 226); c.closePath(); c.fill();
    c.fillStyle = '#FFFBEA';
    for (let i = 0; i < 7; i++) {
      const t0 = i / 7, t1 = (i + 1) / 7;
      const px = (t) => 70 + (194 - 70) * t, py = (t) => 196 + (188 - 196) * t + Math.sin(t * Math.PI) * 10;
      c.beginPath(); c.moveTo(px(t0), py(t0)); c.lineTo(px(t1), py(t1)); c.lineTo((px(t0) + px(t1)) / 2, py(t0) + 16); c.closePath(); c.fill();
    }
    c.fillStyle = '#FFD93D'; // diente de oro
    c.beginPath(); c.moveTo(141, 202); c.lineTo(158, 199); c.lineTo(150, 215); c.closePath(); c.fill();
    // cicatriz con puntos
    c.strokeStyle = '#C0506A'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(200, 164); c.lineTo(240, 212); c.stroke();
    c.lineWidth = 3;
    for (let i = 0; i < 4; i++) { const t = 0.15 + i * 0.23, x = 200 + 40 * t, y = 164 + 48 * t; c.beginPath(); c.moveTo(x - 9, y + 7); c.lineTo(x + 9, y - 7); c.stroke(); }
  }),
  gorilla: () => faceTexture((c) => {
    // hocico: fosas nasales + sonrisa canchera
    c.fillStyle = '#3a2216';
    c.beginPath(); c.ellipse(104, 92, 12, 9, -0.3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(152, 92, 12, 9, 0.3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#3a2216'; c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(70, 150); c.quadraticCurveTo(140, 196, 196, 140); c.stroke();
  }),
  gorillaGlasses: () => faceTexture((c) => {
    // brillo de los anteojos
    c.fillStyle = 'rgba(255,255,255,0.85)';
    [[70, 110], [186, 110]].forEach(([x, y]) => {
      c.beginPath(); c.moveTo(x - 30, y - 10); c.lineTo(x - 8, y - 30); c.lineTo(x + 2, y - 22); c.lineTo(x - 20, y - 2); c.closePath(); c.fill();
    });
  }),
  princess: () => faceTexture((c) => {
    eye(c, 84, 122, 21, 27);
    eye(c, 172, 122, 21, 27);
    c.strokeStyle = '#8a3a1a'; c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(62, 84); c.lineTo(104, 80); c.stroke();
    c.beginPath(); c.moveTo(152, 80); c.lineTo(194, 84); c.stroke();
    blush(c, 58, 160, 22); blush(c, 198, 160, 22);
    c.fillStyle = 'rgba(200,120,90,0.55)';
    c.beginPath(); c.ellipse(128, 150, 14, 10, 0, 0, Math.PI * 2); c.fill();
  }),
  ice: () => faceTexture((c) => {
    // visor oscuro con dos ojos grandes tipo gafas
    [[78, 128], [178, 128]].forEach(([x, y]) => {
      c.fillStyle = '#0b1640';
      c.beginPath(); c.arc(x, y, 40, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#4D7CFE'; c.lineWidth = 8;
      c.beginPath(); c.arc(x, y, 40, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#ffffff';
      c.beginPath(); c.ellipse(x - 12, y - 14, 12, 10, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x + 14, y + 14, 5, 0, Math.PI * 2); c.fill();
    });
    c.fillStyle = '#6fb6ff';
    roundRect(c, 104, 190, 48, 12, 6); c.fill();
  }),
};

// ---------- Coca-Cola: logo pintado (letra cursiva + cinta) y botella de vidrio ----------
function cokeLogo() {
  return canvasTexture(512, 144, (c, w, h) => {
    c.fillStyle = '#E4002B'; roundRect(c, 0, 0, w, h, 26); c.fill();
    c.strokeStyle = '#ffffff'; c.lineWidth = 6; roundRect(c, 8, 8, w - 16, h - 16, 20); c.stroke();
    c.fillStyle = '#ffffff';
    c.font = '92px "Lobster", "Brush Script MT", cursive';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Coca-Cola', w / 2, h / 2 - 8);
    // cinta blanca ondulada abajo
    c.beginPath(); c.moveTo(60, h - 30);
    c.bezierCurveTo(180, h - 60, 300, h - 4, 452, h - 36);
    c.lineTo(452, h - 26); c.bezierCurveTo(300, h + 6, 180, h - 48, 60, h - 22); c.closePath(); c.fill();
  });
}
function cokeLabel() {
  const t = canvasTexture(512, 96, (c, w, h) => {
    c.fillStyle = '#E4002B'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    c.font = '60px "Lobster", "Brush Script MT", cursive';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Coca-Cola', w * 0.25, h / 2);
    c.fillText('Coca-Cola', w * 0.75, h / 2);
  });
  return t;
}
function cokeBottle(riderGroup) {
  // botella contorneada: el pico en la boca del robot y el fondo levantado hacia
  // adelante y al costado (se la esta tomando). El grupo gira sobre la boca para los tragos.
  const mouth = new THREE.Vector3(54, 286, 4), base = new THREE.Vector3(114, 390, 30);
  const g = new THREE.Group();
  const glass = new THREE.Mesh(lathe([[0, 0], [23, 0], [26, 6], [26, 24], [21, 38], [25, 54], [26, 66], [19, 84], [11, 100], [9, 116], [11, 120], [0, 121]], 14),
    new THREE.MeshStandardMaterial({ color: '#4a1410', roughness: 0.12, metalness: 0.15, emissive: '#200404' }));
  glass.castShadow = true;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(27.5, 27.5, 24, 14, 1, true), new THREE.MeshStandardMaterial({ map: cokeLabel(), roughness: 0.4 }));
  label.position.y = 58;
  const inner = new THREE.Group();
  inner.add(glass, label);
  inner.position.y = -121;
  g.add(inner);
  g.position.copy(mouth);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), mouth.clone().sub(base).normalize());
  g.scale.setScalar(1.3);
  g.userData.baseQ = g.quaternion.clone();
  riderGroup.add(g);
  return { bottle: g };
}

// ---------- ruedas: 4 cilindros en UNA malla; el giro es la textura de la llanta rotando ----------
function wheelTexture(tire, hub, rim) {
  return canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = tire; c.fillRect(0, 0, w, h);
    c.fillStyle = shadeHex(tire, 18);
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.47, 0, Math.PI * 2); c.fill();
    c.fillStyle = rim;
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = hub;
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.24, 0, Math.PI * 2); c.fill();
    c.fillStyle = tire;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      c.beginPath(); c.arc(w / 2 + Math.cos(a) * w * 0.14, h / 2 + Math.sin(a) * h * 0.14, w * 0.035, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = shadeHex(hub, -30);
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.07, 0, Math.PI * 2); c.fill();
  });
}
function shadeHex(hex, amt) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt / 255)));
  return '#' + c.getHexString();
}
function buildWheels(spots, r, wdt, tire, hub, rim) {
  const geos = spots.map(([x, z]) => {
    const g = new THREE.CylinderGeometry(r, r, wdt, 20, 1, false).toNonIndexed();
    // el costado (banda de rodamiento) toma el color liso de la esquina de la textura
    const uv = g.getAttribute('uv');
    const pos = g.getAttribute('position');
    for (let i = 0; i < uv.count; i++) {
      if (Math.abs(Math.abs(pos.getY(i)) - wdt / 2) > 0.01 || isSide(g, i, wdt)) uv.setXY(i, 0.01, 0.01);
    }
    g.rotateX(Math.PI / 2);
    g.translate(x, r, z);
    return g;
  });
  const tex = wheelTexture(tire, hub, rim);
  tex.center.set(0.5, 0.5);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
  mesh.userData.wheelTex = tex;
  mesh.castShadow = true;
  return mesh;
}
// en el cilindro no indexado, los triangulos de las tapas tienen los 3 vertices a la misma altura
function isSide(g, i, wdt) {
  const pos = g.getAttribute('position');
  const t = Math.floor(i / 3) * 3;
  const y0 = pos.getY(t), y1 = pos.getY(t + 1), y2 = pos.getY(t + 2);
  return !(Math.abs(y0 - y1) < 0.01 && Math.abs(y1 - y2) < 0.01);
}

function lathe(profile, seg = 20) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}

// banana: tubo curvo con los extremos afinados
function bananaGeometry() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-180, 176, 0), new THREE.Vector3(-134, 98, 0), new THREE.Vector3(-36, 66, 0),
    new THREE.Vector3(64, 74, 0), new THREE.Vector3(146, 120, 0), new THREE.Vector3(182, 190, 0),
  ]);
  const TS = 48, RS = 14;
  const g = new THREE.TubeGeometry(curve, TS, 1, RS, false);
  const pos = g.getAttribute('position');
  const v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i <= TS; i++) {
    const u = i / TS;
    curve.getPointAt(u, c);
    const r = 9 + 56 * Math.pow(Math.sin(Math.PI * u), 0.65);
    for (let j = 0; j <= RS; j++) {
      const k = i * (RS + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c);
      // un poco mas ancho que alto: parece mas "casco" de kart
      v.multiplyScalar(r);
      v.z *= 1.18;
      pos.setXYZ(k, c.x + v.x, c.y + v.y, c.z + v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

export function heartGeometry(s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -0.9 * s);
  sh.bezierCurveTo(-0.2 * s, -0.7 * s, -1.0 * s, -0.25 * s, -1.0 * s, 0.25 * s);
  sh.bezierCurveTo(-1.0 * s, 0.75 * s, -0.35 * s, 0.95 * s, 0, 0.45 * s);
  sh.bezierCurveTo(0.35 * s, 0.95 * s, 1.0 * s, 0.75 * s, 1.0 * s, 0.25 * s);
  sh.bezierCurveTo(1.0 * s, -0.25 * s, 0.2 * s, -0.7 * s, 0, -0.9 * s);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 12, bevelEnabled: true, bevelThickness: 6, bevelSize: 5, bevelSegments: 3, curveSegments: 12 });
  g.center();
  return g;
}

// ---------- los 4 personajes ----------
const BUILDERS = {
  rabbit() {
    const car = new Parts(), rider = new Parts();
    const OR = '#FF8A1C', ORD = '#E86E12', CREAM = '#FFE3B5', GR = '#55D66A', GRD = '#36B24E';
    // zanahoria gorda acostada (eje hacia adelante), con anillos y punta clarita
    const prof = [[0, 0], [52, 5], [76, 20], [89, 44], [93, 78], [90, 112], [91, 128], [84, 160], [73, 192], [62, 218], [51, 240], [42, 256]];
    car.add(lathe(prof, 24), OR, -150, 104, 0, 0, 0, -Math.PI / 2);
    car.add(lathe([[42, 256], [34, 272], [22, 286], [0, 296]], 24), CREAM, -150, 104, 0, 0, 0, -Math.PI / 2);
    [[-104, 90], [-36, 91], [34, 80], [90, 62]].forEach(([x, r]) => car.add(new THREE.TorusGeometry(r, 4, 6, 32), ORD, x, 104, 0, 0, Math.PI / 2, 0));
    [[-60, 0.55], [18, 0.5]].forEach(([x, k]) => [1, -1].forEach((s) => car.ball(6, 10, 6, '#b65a10', x, 104 + 20, s * 86 * k + s * 40)));
    // hojas grandes atras, en abanico
    [[-0.95, 0.35], [-0.6, 0.12], [-0.35, -0.12], [-0.7, -0.38], [-1.15, -0.1]].forEach(([a, tilt], i) => {
      car.ball(22, 88, 44, i % 2 ? GR : GRD, -178 + Math.sin(a) * 40, 196 + Math.cos(a) * 30, tilt * 58, tilt, 0, a);
    });
    // conejo: cabeza cubica grande apoyada sobre la zanahoria, patitas adelante
    const W = '#EAE4DF', PK = '#E77FA0';
    rider.box(110, 70, 90, W, -20, 196, 0);
    rider.ball(24, 18, 24, W, 44, 196, 44);
    rider.ball(24, 18, 24, W, 44, 196, -44);
    rider.box(176, 156, 152, W, -14, 288, 0, 0, 0, 0, 0.3);
    rider.ball(26, 26, 26, W, -104, 236, 0);
    // una oreja parada y la otra doblada para adelante (mordida en la punta)
    rider.box(50, 150, 32, W, -26, 420, 46, 0.24, 0, -0.1, 0.5);
    rider.box(28, 104, 6, PK, -9, 414, 46, 0.24, 0, -0.1, 0.5);
    rider.box(50, 84, 32, W, -26, 392, -46, -0.24, 0, -0.1, 0.5);
    rider.box(28, 60, 6, PK, -9, 390, -46, -0.24, 0, -0.1, 0.5);
    rider.box(44, 76, 30, W, 4, 424, -56, -0.24, 0, -1.9, 0.5);
    rider.box(26, 52, 6, PK, 6, 414, -56, -0.24, 0, -1.9, 0.5);
    return {
      car, rider, face: { tex: FACES.rabbit(), w: 150, h: 140, x: 62, y: 282, z: 0 },
      wheels: { spots: [[104, 90], [104, -90], [-104, 90], [-104, -90]], r: 44, w: 32, tire: '#24222c', hub: '#F4E3C8', rim: '#3a3642' },
    };
  },

  gorilla() {
    const car = new Parts(), rider = new Parts();
    const Y = '#FFD93D';
    car.add(bananaGeometry(), Y);
    car.cyl(11, 15, 40, '#7a4a22', 186, 196, 0, 0, 0, -0.5);
    car.ball(14, 14, 14, '#5a3a1a', -182, 176, 0);
    const BR = '#5C3A26', BR2 = '#6E4630', TAN = '#C9976B', TAN2 = '#E0AE80', DK = '#3E2618';
    // cuerpo robusto sentado detras de la curva de la banana
    rider.box(170, 136, 110, BR, -40, 186, 0, 0, 0, 0, 0.35);
    rider.ball(46, 34, 10, '#7a5238', 16, 196, 0);
    // brazos enormes apoyados sobre la banana, una mano en el tallo
    [1, -1].forEach((s) => {
      rider.box(56, 56, 128, BR2, 26, 178, s * 84, 0, s * 0.2, -0.45, 0.45);
      rider.box(54, 40, 54, TAN, 86, 142, s * 78, 0, 0, 0, 0.45);
    });
    // cabeza grande
    rider.box(156, 136, 124, BR2, -24, 296, 0, 0, 0, 0, 0.36);
    rider.box(128, 88, 22, TAN, 36, 284, 0, 0, 0, 0, 0.45);
    rider.box(110, 60, 50, TAN2, 52, 258, 0, 0, 0, 0, 0.5);
    [1, -1].forEach((s) => rider.ball(20, 26, 14, '#B07B55', -28, 292, s * 80));
    // CHADRILLA: pelo verde parado y desordenado
    const HG = '#3BE36B', HG2 = '#1FB04A';
    rider.box(150, 34, 116, HG2, -26, 372, 0, 0, 0, 0, 0.4);
    let hk = 0;
    [-66, -36, -6, 24].forEach((hx, ix) => [-54, -18, 18, 54].forEach((hz) => {
      const tiltX = hz / 54 * 0.45, tiltZ = 0.25 + ix * 0.12;
      rider.cone(20 + (hk % 3) * 3, 62 + ((hk * 7) % 5) * 9, hk % 2 ? HG : HG2, hx, 404, hz, tiltX, 0, tiltZ);
      hk++;
    }));
    void DK;
    // anteojos azules grandes
    [1, -1].forEach((s) => {
      rider.box(64, 44, 14, '#2F6BFF', 52, 308, s * 34, 0, 0, 0, 0.3);
      rider.box(54, 34, 8, '#10131c', 59, 308, s * 34, 0, 0, 0, 0.3);
      rider.box(12, 10, 52, '#2F6BFF', 18, 312, s * 74);
    });
    rider.box(18, 10, 10, '#2F6BFF', 54, 312, 0);
    return {
      car, rider,
      face: { tex: FACES.gorilla(), w: 108, h: 58, x: 77, y: 256, z: 0 },
      face2: { tex: FACES.gorillaGlasses(), w: 128, h: 50, x: 63, y: 308, z: 0 },
      wheels: { spots: [[100, 72], [100, -72], [-104, 72], [-104, -72]], r: 38, w: 30, tire: '#2a2a35', hub: '#8a5a33', rim: '#3b3b48' },
    };
  },

  princess() {
    const car = new Parts(), rider = new Parts();
    const PK = '#FF6FB5', PK2 = '#FF94CC', PK3 = '#FF4FA3', LIGHT = '#FFC4E1', PURP = '#9B5DE5';
    car.box(184, 88, 252, PK, 0, 84, 0, 0, 0, 0, 0.35);
    car.box(190, 20, 256, PK2, 0, 132, 0, 0, 0, 0, 0.5);
    // medallon redondo con corazon adelante
    car.cyl(84, 84, 30, PK3, 130, 138, 0, 0, 0, Math.PI / 2, 10);
    car.cyl(68, 68, 12, PK2, 146, 138, 0, 0, 0, Math.PI / 2, 10);
    car.add(heartGeometry(40), LIGHT, 156, 140, 0, 0, Math.PI / 2, 0);
    car.box(140, 112, 30, PURP, -118, 156, 0, 0, 0, 0, 0.35);
    // princesa (con barba, como en el moodboard)
    const SKIN = '#F6C7A2', HAIR = '#D2582E', BEARD = '#B84E26', GOLD = '#FFD93D';
    rider.box(112, 96, 92, PK, -34, 188, 0, 0, 0, 0, 0.35);
    [1, -1].forEach((s) => {
      rider.ball(40, 34, 40, PK2, -30, 222, s * 64);
      rider.box(28, 70, 28, SKIN, 6, 176, s * 70, 0, 0, -0.6, 0.45);
      rider.ball(16, 14, 16, SKIN, 34, 150, s * 70);
    });
    rider.box(132, 132, 122, SKIN, -22, 300, 0, 0, 0, 0, 0.3);
    rider.box(148, 48, 132, HAIR, -28, 370, 0, 0, 0, 0, 0.42);
    rider.box(122, 28, 22, HAIR, 34, 352, 0, 0, 0, 0, 0.5);
    rider.box(148, 176, 58, HAIR, -86, 292, 0, 0, 0, 0, 0.35);
    [1, -1].forEach((s) => rider.box(22, 132, 70, HAIR, -40, 292, s * 72, 0, 0, 0, 0.45));
    rider.box(112, 72, 32, BEARD, 44, 258, 0, 0, 0, 0, 0.45);
    rider.box(76, 46, 30, BEARD, 44, 222, 0, 0, 0, 0, 0.5);
    rider.box(80, 20, 18, '#A8441F', 58, 278, 0, 0, 0, 0, 0.5);
    rider.ball(10, 8, 8, '#E0A080', 60, 290, 0);
    // corona dorada con gema rosa
    rider.box(104, 26, 104, GOLD, -26, 400, 0, 0, 0, 0, 0.25);
    [[0, 48], [48, 0], [0, -48], [-48, 0], [34, 34], [34, -34]].forEach(([dx, dz]) => rider.cone(13, 28, GOLD, -26 + dx, 424, dz));
    rider.ball(11, 11, 7, PK3, 28, 400, 0);
    return {
      car, rider, face: { tex: FACES.princess(), w: 118, h: 104, x: 40, y: 316, z: 0 },
      wheels: { spots: [[90, 96], [90, -96], [-90, 96], [-90, -96]], r: 40, w: 30, tire: '#3a3140', hub: '#FF9F1C', rim: '#4a4052' },
    };
  },

  ice() {
    const rider = new Parts(), ice = new Parts();
    const I1 = '#8FE3FF', I2 = '#6FC7FF', I3 = '#B8F4FF', I4 = '#4FA8F0';
    // kart de cristal: bloques facetados + una gema gigante adelante
    ice.sharpBox(176, 58, 250, I2, 0, 74, 0);
    ice.sharpBox(156, 26, 226, I3, 0, 114, 0);
    ice.add(new THREE.IcosahedronGeometry(96, 0), I1, 96, 158, 0, 0.3, 0.2, 0, 1.0, 0.95, 1.0);
    ice.add(new THREE.OctahedronGeometry(34, 0), I3, -30, 146, 82, 0, 0.5, 0.3, 0.8, 1.4, 0.8);
    ice.add(new THREE.OctahedronGeometry(34, 0), I3, -30, 146, -82, 0, -0.5, -0.3, 0.8, 1.4, 0.8);
    ice.sharpBox(126, 92, 30, I4, -118, 150, 0);
    // robot de cristal
    ice.sharpBox(120, 92, 92, I1, -40, 196, 0);
    ice.sharpBox(40, 40, 96, I2, 6, 186, -72, 0, 0, -0.4);
    ice.sharpBox(42, 38, 42, I3, 50, 162, -68);
    // el otro brazo levantado: siempre con la botella de Coca-Cola en la boca
    ice.sharpBox(40, 40, 164, I2, 45, 298, 67, 0, 0.34, 0.81);
    ice.sharpBox(44, 44, 44, I3, 100, 356, 48);
    ice.add(new RoundedBoxGeometry(134, 124, 140, 2, 22), I3, -24, 300, 0);
    [1, -1].forEach((s) => ice.cyl(16, 16, 16, I4, -24, 302, s * 74, Math.PI / 2, 0, 0, 10));
    // visor oscuro ancho
    rider.box(132, 70, 20, '#1F3FB0', 38, 304, 0, 0, 0, 0, 0.45);
    return {
      car: null, rider, ice, face: { tex: FACES.ice(), w: 128, h: 72, x: 48, y: 304, z: 0 },
      decals: [
        { tex: cokeLogo(), w: 200, h: 54, x: 0, y: 74, z: 89.5, ry: 0 },
        { tex: cokeLogo(), w: 200, h: 54, x: 0, y: 74, z: -89.5, ry: Math.PI },
        { tex: cokeLogo(), w: 150, h: 42, x: 126, y: 70, z: 0, ry: Math.PI / 2 },
      ],
      extra: cokeBottle,
      wheels: { spots: [[92, 90], [92, -90], [-92, 90], [-92, -90]], r: 42, w: 30, tire: '#2F5FE0', hub: '#CFF4FF', rim: '#3a6ff0' },
    };
  },
};

const CACHE = {};
function buildTemplate(character) {
  const def = BUILDERS[character]();
  const out = { car: def.car ? def.car.merged() : null, rider: def.rider.merged(), ice: def.ice ? def.ice.merged() : null, def };
  return out;
}

const bodyMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.48, metalness: 0.02 });

// devuelve { root, roll, riderGroup, wheels, mats } listo para animar
export function buildCharacterModel(character) {
  if (!CACHE[character]) CACHE[character] = buildTemplate(character);
  const T = CACHE[character];
  const d = T.def;
  const root = new THREE.Group();
  const roll = new THREE.Group();
  root.add(roll);
  const mats = [];
  if (T.car) {
    const carMat = bodyMat(); mats.push(carMat);
    const car = new THREE.Mesh(T.car, carMat);
    car.castShadow = true;
    roll.add(car);
  }
  const riderGroup = new THREE.Group();
  roll.add(riderGroup);
  if (T.rider) {
    const riderMat = bodyMat(); mats.push(riderMat);
    const rider = new THREE.Mesh(T.rider, riderMat);
    rider.castShadow = true;
    riderGroup.add(rider);
  }
  if (T.ice) {
    const iceMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.12, metalness: 0.1, emissive: '#2aa8ff', emissiveIntensity: 0.32 });
    mats.push(iceMat);
    const im = new THREE.Mesh(T.ice, iceMat);
    im.castShadow = true;
    // el robot (parte alta) se mueve con el piloto; es una sola malla asi que va en el grupo del piloto
    riderGroup.add(im);
  }
  [d.face, d.face2].forEach((f) => {
    if (!f) return;
    const fm = new THREE.MeshStandardMaterial({ map: f.tex, transparent: true, alphaTest: 0.3, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -4 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(f.w, f.h), fm);
    plane.position.set(f.x + 1.5, f.y, f.z);
    plane.rotation.y = Math.PI / 2;
    riderGroup.add(plane);
  });
  (d.decals || []).forEach((f) => {
    const dm = new THREE.MeshStandardMaterial({ map: f.tex, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -4 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(f.w, f.h), dm);
    plane.position.set(f.x, f.y, f.z);
    plane.rotation.y = f.ry || 0;
    roll.add(plane);
  });
  const wd = d.wheels;
  const wheels = buildWheels(wd.spots, wd.r, wd.w, wd.tire, wd.hub, wd.rim);
  roll.add(wheels);
  mats.push(wheels.material);
  // normalizar altura
  const box = new THREE.Box3().setFromObject(roll);
  const k = MODEL_H / (box.max.y - box.min.y);
  roll.scale.setScalar(k);
  roll.position.y = -box.min.y * k;
  roll.userData.baseY = roll.position.y;
  // extras (la botella) despues de normalizar: no cambian el tamaño del kart
  const extra = d.extra ? d.extra(riderGroup) : {};
  return { root, roll, riderGroup, wheels, mats, scale: k, bottle: extra.bottle || null };
}
