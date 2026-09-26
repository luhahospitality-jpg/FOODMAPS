import { THREE, PAL, RAINBOW, canvasTexture, roundRect } from './core.js';
import { scene } from './render.js';
import { img } from './assets.js';

// ---------- atlas de particulas: los componentes del moodboard (polvo, estela, brillo...) ----------
const CELLS = { dust: 0, sparkle: 1, star: 2, trail: 3, glow: 4, ring: 5, square: 6, freeze: 7, flower: 8, smoke: 9, streak: 10, coin: 11, peel: 12, heart: 13, crystal: 14, fire: 15 };
let atlas = null;
function buildAtlas() {
  const S = 256, N = 4;
  const c = document.createElement('canvas');
  c.width = c.height = S * N;
  const ctx = c.getContext('2d');
  const put = (cell, im) => {
    if (!im) return;
    const x = (cell % N) * S, y = Math.floor(cell / N) * S;
    const k = Math.min((S - 12) / im.width, (S - 12) / im.height);
    const w = im.width * k, h = im.height * k;
    ctx.drawImage(im, x + (S - w) / 2, y + (S - h) / 2, w, h);
  };
  const cell = (id, draw) => {
    const x = (id % N) * S, y = Math.floor(id / N) * S;
    ctx.save(); ctx.translate(x, y); draw(ctx, S); ctx.restore();
  };
  put(CELLS.dust, img('dust'));
  put(CELLS.sparkle, img('sparkle'));
  put(CELLS.star, img('star'));
  put(CELLS.trail, img('trail'));
  put(CELLS.freeze, img('pw_freeze'));
  put(CELLS.flower, img('pw_flower'));
  put(CELLS.coin, img('coin'));
  put(CELLS.peel, img('peel'));
  put(CELLS.crystal, img('crystal'));
  cell(CELLS.glow, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.5)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, s, s);
  });
  cell(CELLS.ring, (g, s) => {
    g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 18;
    g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 20, 0, Math.PI * 2); g.stroke();
  });
  cell(CELLS.square, (g, s) => { g.fillStyle = '#fff'; roundRect(g, s * 0.3, s * 0.18, s * 0.4, s * 0.64, 18); g.fill(); });
  cell(CELLS.smoke, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(0.6, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); g.fill();
  });
  cell(CELLS.streak, (g, s) => {
    const r = g.createLinearGradient(0, 0, s, 0);
    r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.5, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, s / 2 - 10, s, 20);
  });
  cell(CELLS.heart, (g, s) => {
    g.fillStyle = '#fff'; g.beginPath();
    g.moveTo(s / 2, s * 0.8); g.bezierCurveTo(s * 0.05, s * 0.5, s * 0.2, s * 0.1, s / 2, s * 0.32);
    g.bezierCurveTo(s * 0.8, s * 0.1, s * 0.95, s * 0.5, s / 2, s * 0.8); g.fill();
  });
  cell(CELLS.fire, (g, s) => {
    const r = g.createRadialGradient(s / 2, s * 0.6, 0, s / 2, s * 0.6, s * 0.45);
    r.addColorStop(0, 'rgba(255,255,220,1)'); r.addColorStop(0.35, 'rgba(255,200,60,0.9)'); r.addColorStop(0.7, 'rgba(255,90,20,0.5)'); r.addColorStop(1, 'rgba(255,40,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, s, s);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

class ParticleSystem {
  constructor(max, additive) {
    this.max = max;
    this.n = 0;
    this.p = [];
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.getAttribute('position'));
    g.setAttribute('uv', base.getAttribute('uv'));
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.aData = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); // size, rot, cell, stretch
    this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
    [this.aPos, this.aData, this.aCol].forEach((a) => a.setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iPos', this.aPos);
    g.setAttribute('iData', this.aData);
    g.setAttribute('iCol', this.aCol);
    g.instanceCount = 0;
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { map: { value: atlas } },
      vertexShader: `
        attribute vec3 iPos; attribute vec4 iData; attribute vec4 iCol;
        varying vec2 vUv; varying vec4 vCol;
        void main(){
          float cell = iData.z;
          vec2 cellXY = vec2(mod(cell, 4.0), floor(cell / 4.0));
          vUv = (cellXY + vec2(uv.x, 1.0 - uv.y)) / 4.0;
          vUv.y = 1.0 - vUv.y;
          vCol = iCol;
          vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
          vec2 c = position.xy * vec2(iData.x * iData.w, iData.x);
          float s = sin(iData.y), co = cos(iData.y);
          mv.xy += vec2(c.x * co - c.y * s, c.x * s + c.y * co);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map; varying vec2 vUv; varying vec4 vCol;
        void main(){
          vec4 t = texture2D(map, vUv);
          vec4 c = t * vCol;
          if (c.a < 0.01) discard;
          gl_FragColor = c;
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 6 : 5;
    scene.add(this.mesh);
  }
  emit(o) {
    // lleno: se descarta la nueva (antes se borraba la mas vieja, que eran las nubes fijas)
    if (this.p.length >= this.max) return;
    // en modo TV se emite solo una parte de las particulas efimeras
    if (o.life < 1e8 && fx.rate < 1 && Math.random() > fx.rate) return;
    this.p.push(Object.assign({ vx: 0, vy: 0, vz: 0, g: 0, drag: 0, life: 1, age: 0, s0: 100, s1: 100, rot: 0, vr: 0, a0: 1, a1: 0, r: 1, gc: 1, b: 1, stretch: 1, cell: 0 }, o));
  }
  update(dt) {
    const P = this.p;
    let j = 0;
    const pos = this.aPos.array, dat = this.aData.array, col = this.aCol.array;
    for (let i = 0; i < P.length; i++) {
      const q = P[i];
      q.age += dt;
      if (q.age >= q.life) continue;
      q.vy -= q.g * dt;
      const dr = Math.max(0, 1 - q.drag * dt);
      q.vx *= dr; q.vy *= dr; q.vz *= dr;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      q.rot += q.vr * dt;
      const k = q.age / q.life;
      P[j++] = q;
      const idx = j - 1;
      if (idx >= this.max) continue;
      pos[idx * 3] = q.x; pos[idx * 3 + 1] = q.y; pos[idx * 3 + 2] = q.z;
      dat[idx * 4] = q.s0 + (q.s1 - q.s0) * k; dat[idx * 4 + 1] = q.rot; dat[idx * 4 + 2] = q.cell; dat[idx * 4 + 3] = q.stretch;
      const a = q.a0 + (q.a1 - q.a0) * k;
      col[idx * 4] = q.r; col[idx * 4 + 1] = q.gc; col[idx * 4 + 2] = q.b; col[idx * 4 + 3] = a;
    }
    P.length = j;
    this.geo.instanceCount = Math.min(j, this.max);
    this.aPos.needsUpdate = true; this.aData.needsUpdate = true; this.aCol.needsUpdate = true;
  }
  clear() { this.p.length = 0; this.geo.instanceCount = 0; }
}

let normal = null, add = null;
const tmp = new THREE.Color();
function rgb(hex, mul = 1) { tmp.set(hex); return { r: tmp.r * mul, gc: tmp.g * mul, b: tmp.b * mul }; }
const R = (a, b) => a + Math.random() * (b - a);

// ondas (ONDA) planas sobre el piso
const rings = [];
const ringGeo = new THREE.RingGeometry(0.82, 1, 48);

// textos flotantes (WHACK!, HIT!, BOOST!)
const texts = [];
const textTexCache = {};
function textTex(word, color) {
  const k = word + color;
  if (textTexCache[k]) return textTexCache[k];
  textTexCache[k] = canvasTexture(512, 192, (c, w, h) => {
    c.font = '130px "Lilita One", Impact, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = 30; c.strokeStyle = '#202030'; c.strokeText(word, w / 2, h / 2 + 6);
    const g = c.createLinearGradient(0, h * 0.2, 0, h * 0.85);
    g.addColorStop(0, '#FFF8E7'); g.addColorStop(0.45, color); g.addColorStop(1, color);
    c.fillStyle = g; c.fillText(word, w / 2, h / 2 + 6);
  });
  return textTexCache[k];
}

export const fx = {
  rate: 1,
  init() {
    atlas = buildAtlas();
    normal = new ParticleSystem(1600, false);
    add = new ParticleSystem(1600, true);
  },
  clear() {
    if (normal) normal.clear();
    if (add) add.clear();
    rings.forEach((r) => scene.remove(r.m)); rings.length = 0;
    texts.forEach((t) => scene.remove(t.s)); texts.length = 0;
  },
  // POLVO: nubecitas que salen de las ruedas
  dust(x, z, color = '#ffffff', n = 1, big = 1) {
    for (let i = 0; i < n; i++) {
      normal.emit(Object.assign({ x: x + R(-40, 40), y: R(10, 40), z: z + R(-40, 40), vx: R(-60, 60), vy: R(60, 160), vz: R(-60, 60), drag: 1.5, life: R(0.5, 0.9), s0: 70 * big, s1: 190 * big, a0: 0.85, a1: 0, rot: R(0, 6), vr: R(-1, 1), cell: CELLS.dust }, rgb(color)));
    }
  },
  // ESTELA: rayas celestes de turbo detras del kart
  trail(x, z, angle, color = PAL.turquoise) {
    const bx = x - Math.cos(angle) * 120, bz = z - Math.sin(angle) * 120;
    add.emit(Object.assign({ x: bx + R(-60, 60), y: R(40, 220), z: bz + R(-60, 60), vx: -Math.cos(angle) * 300, vz: -Math.sin(angle) * 300, life: R(0.25, 0.45), s0: 190, s1: 60, a0: 1, a1: 0, rot: 0, stretch: 1.6, cell: CELLS.trail }, rgb(color, 1.8)));
  },
  // BRILLO / PARTICULA: chispitas
  sparkles(x, y, z, n = 10, colors = RAINBOW, spread = 300, big = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = R(0.3, 1) * spread;
      add.emit(Object.assign({ x, y, z, vx: Math.cos(a) * sp * 2, vy: R(200, 700), vz: Math.sin(a) * sp * 2, g: 900, drag: 1.2, life: R(0.5, 1.0), s0: R(60, 110) * big, s1: 10, a0: 1, a1: 0.2, rot: R(0, 6), vr: R(-6, 6), cell: i % 3 === 0 ? CELLS.star : CELLS.sparkle }, rgb(colors[i % colors.length], 1.6)));
    }
  },
  // GOLPE: estrella grande + onda + chispas
  hit(x, z) {
    add.emit(Object.assign({ x, y: 180, z, life: 0.45, s0: 200, s1: 520, a0: 1, a1: 0, rot: R(0, 6), vr: 4, cell: CELLS.star }, rgb(PAL.yellow, 2)));
    add.emit(Object.assign({ x, y: 160, z, life: 0.35, s0: 300, s1: 700, a0: 0.9, a1: 0, cell: CELLS.glow }, rgb(PAL.orange, 1.6)));
    this.sparkles(x, 160, z, 16, [PAL.yellow, PAL.orange, PAL.white], 420);
    this.ring(x, z, PAL.yellow, 700);
  },
  explosion(x, z) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, sp = R(200, 700);
      add.emit(Object.assign({ x, y: R(60, 200), z, vx: Math.cos(a) * sp, vy: R(100, 600), vz: Math.sin(a) * sp, g: 300, drag: 2.2, life: R(0.4, 0.8), s0: R(160, 280), s1: 40, a0: 1, a1: 0, rot: R(0, 6), cell: CELLS.fire }, rgb('#ffffff', 1.4)));
    }
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      normal.emit(Object.assign({ x, y: R(80, 200), z, vx: Math.cos(a) * 250, vy: R(150, 400), vz: Math.sin(a) * 250, drag: 1.8, life: R(0.8, 1.4), s0: 160, s1: 420, a0: 0.7, a1: 0, rot: R(0, 6), cell: CELLS.smoke }, rgb('#8a7fa0')));
    }
    this.ring(x, z, PAL.orange, 900);
    this.hit(x, z);
  },
  // ONDA: anillo expansivo sobre el piso
  ring(x, z, color, size = 800, life = 0.6, glow = 1.8) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(glow), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 12, z);
    scene.add(m);
    rings.push({ m, age: 0, life, size });
  },
  confetti(x, y, z, n = 40, spread = 600) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = R(0.2, 1) * spread;
      normal.emit(Object.assign({ x, y, z, vx: Math.cos(a) * sp, vy: R(400, 1100), vz: Math.sin(a) * sp, g: 700, drag: 1.4, life: R(1.6, 2.6), s0: 45, s1: 40, a0: 1, a1: 0.8, rot: R(0, 6), vr: R(-8, 8), cell: CELLS.square }, rgb(RAINBOW[i % RAINBOW.length])));
    }
  },
  // lluvia de confeti ambiente (se llama cada frame con un area)
  ambientConfetti(cx, cz, radius, rate, dt) {
    const n = rate * dt;
    for (let i = 0; i < n + (Math.random() < n % 1 ? 1 : 0); i++) {
      const cols = [PAL.red, PAL.orange, PAL.yellow, PAL.green, PAL.blue, PAL.violet, PAL.pink, PAL.turquoise];
      normal.emit(Object.assign({ x: cx + R(-radius, radius), y: R(1400, 2200), z: cz + R(-radius, radius), vx: R(-40, 40), vy: R(-260, -160), vz: R(-40, 40), life: 7, s0: 60, s1: 60, a0: 1, a1: 1, rot: R(0, 6), vr: R(-4, 4), cell: CELLS.square }, rgb(cols[Math.floor(Math.random() * cols.length)])));
    }
  },
  snow(cx, cz, radius, rate, dt) {
    const n = rate * dt;
    for (let i = 0; i < Math.floor(n) + (Math.random() < n % 1 ? 1 : 0); i++) {
      add.emit(Object.assign({ x: cx + R(-radius, radius), y: R(500, 1100), z: cz + R(-radius, radius), vx: R(-50, 50), vy: -220, vz: R(-50, 50), life: 3.5, s0: 70, s1: 50, a0: 0.9, a1: 0, rot: R(0, 6), vr: R(-1, 1), cell: CELLS.freeze }, rgb('#ffffff', 1.1)));
    }
  },
  splash(x, z) {
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, sp = R(100, 400);
      normal.emit(Object.assign({ x, y: -150, z, vx: Math.cos(a) * sp, vy: R(700, 1300), vz: Math.sin(a) * sp, g: 2200, life: R(0.6, 1.0), s0: 90, s1: 40, a0: 0.9, a1: 0, cell: CELLS.smoke }, rgb('#dff8ff')));
    }
    this.ring(x, z, PAL.white, 600, 0.8);
  },
  poof(x, y, z, color = '#ffffff') {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      normal.emit(Object.assign({ x, y, z, vx: Math.cos(a) * 380, vy: R(0, 300), vz: Math.sin(a) * 380, drag: 3, life: R(0.5, 0.8), s0: 90, s1: 200, a0: 0.6, a1: 0, rot: R(0, 6), cell: CELLS.dust }, rgb(color)));
    }
  },
  coinPop(x, z) {
    add.emit(Object.assign({ x, y: 120, z, vy: 600, g: 900, life: 0.7, s0: 150, s1: 90, a0: 1, a1: 0, cell: CELLS.coin }, rgb('#ffffff', 1.3)));
    this.sparkles(x, 120, z, 6, [PAL.yellow, PAL.white], 200, 0.7);
  },
  smoke(x, y, z) {
    normal.emit(Object.assign({ x, y, z, vx: R(-30, 30), vy: R(20, 80), vz: R(-30, 30), drag: 1, life: 0.9, s0: 60, s1: 180, a0: 0.55, a1: 0, rot: R(0, 6), cell: CELLS.smoke }, rgb('#d8d0e8')));
  },
  poison(x, z) {
    add.emit(Object.assign({ x: x + R(-60, 60), y: R(40, 160), z: z + R(-60, 60), vy: R(60, 160), life: 0.9, s0: 70, s1: 20, a0: 0.9, a1: 0, rot: R(0, 6), cell: CELLS.sparkle }, rgb(PAL.violet, 1.6)));
  },
  // billboard permanente dentro del sistema de particulas (0 draw calls extra)
  addStatic(cellName, x, y, z, size, color = '#ffffff', mul = 1, additive = false, aspect = 1) {
    (additive ? add : normal).emit(Object.assign({ x, y, z, life: 1e9, s0: size, s1: size, a0: 1, a1: 1, stretch: aspect, cell: CELLS[cellName] }, rgb(color, mul)));
  },
  text(word, x, z, color = PAL.yellow, y = 520) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTex(word, color), transparent: true, depthWrite: false, depthTest: false }));
    s.position.set(x, y, z);
    s.scale.set(10, 4, 1);
    s.renderOrder = 20;
    scene.add(s);
    texts.push({ s, age: 0, life: 1.1, y });
  },
  update(dt) {
    if (!normal) return;
    normal.update(dt);
    add.update(dt);
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.age += dt;
      const k = r.age / r.life;
      if (k >= 1) { scene.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); continue; }
      const s = r.size * (0.15 + 0.85 * Math.pow(k, 0.6));
      r.m.scale.set(s, s, s);
      r.m.material.opacity = 1 - k;
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.age += dt;
      const k = t.age / t.life;
      if (k >= 1) { scene.remove(t.s); t.s.material.dispose(); texts.splice(i, 1); continue; }
      const pop = k < 0.15 ? k / 0.15 * 1.25 : 1.25 - Math.min(0.25, (k - 0.15) * 2);
      t.s.scale.set(520 * pop, 195 * pop, 1);
      t.s.position.y = t.y + k * 160;
      t.s.material.opacity = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
    }
  },
};
