import { THREE, CHAR_INFO, canvasTexture, roundRect, toWorld, game } from './core.js';
import { scene } from './render.js';
import { tex } from './assets.js';
import { buildCharacterModel, MODEL_H, bananaGeometry, lathe } from './models.js';

export const KART_H = 370;
const _sipQ = new THREE.Quaternion(), _sipAxis = new THREE.Vector3(0, 0, 1);
// color de las piernas cuando el personaje se baja del auto (modo batalla)
const LEG_COLOR = { rabbit: '#f4f1ea', gorilla: '#5a3a26', princess: '#f06fb5', ice: '#8fd6ff' };
const FALL_DURATION = 0.75;
const POP_DURATION = 0.3;

let _shadowTex = null;
function shadowTex() {
  if (_shadowTex) return _shadowTex;
  _shadowTex = canvasTexture(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(10,6,24,0.62)'); g.addColorStop(0.55, 'rgba(10,6,24,0.35)'); g.addColorStop(1, 'rgba(10,6,24,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  return _shadowTex;
}
let _glowTex = null;
export function glowTex() {
  if (_glowTex) return _glowTex;
  _glowTex = canvasTexture(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  return _glowTex;
}

function tagTexture(id, color) {
  return canvasTexture(192, 96, (c, w, h) => {
    c.fillStyle = '#202030';
    roundRect(c, 6, 10, w - 12, h - 20, 30); c.fill();
    c.fillStyle = color;
    roundRect(c, 12, 16, w - 24, h - 32, 24); c.fill();
    c.font = '54px "Lilita One", Impact, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 10; c.strokeStyle = '#202030'; c.lineJoin = 'round';
    c.strokeText(id, w / 2, h / 2 + 3);
    c.fillStyle = '#FFF8E7';
    c.fillText(id, w / 2, h / 2 + 3);
  });
}

// bate zanahoria del CONEJO MALO (solo en batalla)
function buildCarrotBat() {
  const pivot = new THREE.Group();
  const bat = new THREE.Group();
  const body = new THREE.Mesh(lathe([[0, 0], [9, 2], [10, 40], [14, 80], [22, 130], [30, 180], [33, 210], [28, 226], [0, 232]], 12),
    new THREE.MeshStandardMaterial({ color: '#FF8A1C', roughness: 0.55 }));
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 50, 10), new THREE.MeshStandardMaterial({ color: '#3a2a33', roughness: 0.8 }));
  grip.position.y = 28;
  const leafMat = new THREE.MeshStandardMaterial({ color: '#36B24E', roughness: 0.6 });
  [-0.5, 0, 0.5].forEach((a) => {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(12, 80, 6), leafMat);
    leaf.position.set(Math.sin(a) * 18, 262, Math.cos(a) * 4); leaf.rotation.z = -a;
    bat.add(leaf);
  });
  [70, 120, 170].forEach((y) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(13 + y * 0.1, 2.2, 5, 16), new THREE.MeshStandardMaterial({ color: '#E86E12', roughness: 0.6 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = y; bat.add(ring);
  });
  bat.add(body, grip);
  bat.position.y = -20;
  pivot.add(bat);
  pivot.position.set(40, 200, -52);
  pivot.scale.setScalar(1.6);
  return pivot;
}

// jaula de bananas (atrapado) y bloque de hielo (congelado)
let _banGeo = null;
function buildCage() {
  if (!_banGeo) { _banGeo = bananaGeometry(); _banGeo.center(); }
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#FFD93D', roughness: 0.45, emissive: '#6b5200', emissiveIntensity: 0.3 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const b = new THREE.Mesh(_banGeo, mat);
    b.scale.setScalar(0.62);
    b.position.set(Math.cos(a) * 230, 190, Math.sin(a) * 230);
    b.rotation.set(0, -a, Math.PI / 2);
    g.add(b);
  }
  return g;
}
function buildIceBlock() {
  const m = new THREE.Mesh(new THREE.BoxGeometry(460, 440, 460),
    new THREE.MeshStandardMaterial({ color: '#A9F3FF', transparent: true, opacity: 0.5, roughness: 0.1, emissive: '#3aa8ff', emissiveIntensity: 0.35, depthWrite: false }));
  m.position.y = 210;
  const g = new THREE.Group(); g.add(m);
  return g;
}

class Kart {
  constructor(slot, character, id, color) {
    this.slot = slot; this.character = character; this.id = id;
    this.group = new THREE.Group();
    this.yaw = new THREE.Group();
    this.group.add(this.yaw);

    // personaje + kart en 3D real (ver models.js)
    this.model = buildCharacterModel(character);
    this.yaw.add(this.model.root);
    this.meshes = [];
    this.model.root.traverse((o) => { if (o.isMesh) this.meshes.push(o); });

    this.aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.aura.scale.set(640, 640, 1);
    this.aura.position.y = KART_H * 0.45;
    this.aura.visible = false;
    this.group.add(this.aura);

    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 3;
    this.shadow.scale.set(360, 360, 1);
    this.shadow.renderOrder = 1;
    this.group.add(this.shadow);

    // tamaño fijo en pantalla (no crece cuando el rival esta pegado a la camara)
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTexture(id, color), transparent: true, depthWrite: false, sizeAttenuation: false }));
    this.tag.scale.set(0.075, 0.0375, 1);
    this.tag.position.y = KART_H + 80;
    this.group.add(this.tag);

    // estrellitas de mareo (cuando te pega un misil)
    this.dizzy = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('icon_star'), transparent: true, depthWrite: false }));
      s.scale.set(90, 90, 1);
      s.visible = false;
      this.group.add(s);
      this.dizzy.push(s);
    }

    // bate zanahoria del conejo (se muestra solo en la arena de batalla)
    if (character === 'rabbit') {
      this.bat = buildCarrotBat();
      this.model.riderGroup.add(this.bat);
      this.bat.visible = false;
    }
    this.swingAt = -10;

    this.fall = null;
    this.speed = 0;
    this.prev = null;
    this.squash = 0;
    this.lean = 0;
    this.glow = 'none';
    scene.add(this.group);
  }

  // personaje a pie: se saca el piloto del auto y se le ponen piernas
  ensureWalker() {
    if (this.walker) return this.walker;
    const g = new THREE.Group(), yaw = new THREE.Group(), inner = new THREE.Group();
    g.add(yaw); yaw.add(inner);
    inner.scale.setScalar(this.model.scale);
    const legMat = new THREE.MeshStandardMaterial({ color: LEG_COLOR[this.character] || '#303048', roughness: 0.6 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#202030', roughness: 0.6 });
    const legGeo = new THREE.BoxGeometry(48, 150, 48); legGeo.translate(0, -75, 0);
    const shoeGeo = new THREE.BoxGeometry(84, 34, 58);
    const legs = [1, -1].map((sd) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(-18, 160, sd * 44);
      leg.castShadow = true;
      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(16, -150, 0);
      leg.add(shoe);
      inner.add(leg);
      return leg;
    });
    const shadow = new THREE.Mesh(this.shadow.geometry, this.shadow.material);
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 3; shadow.scale.set(240, 240, 1); shadow.renderOrder = 1;
    const tag = new THREE.Sprite(this.tag.material);
    tag.scale.copy(this.tag.scale); tag.position.y = KART_H + 60;
    g.add(shadow, tag);
    this.walker = { g, yaw, inner, legs, tag };
    return this.walker;
  }

  setOnFoot(on) {
    const rg = this.model.riderGroup;
    if (on) {
      const W = this.ensureWalker();
      if (rg.parent !== W.inner) W.inner.add(rg);
      if (!W.g.parent) scene.add(W.g);
    } else if (this.walker && this.walker.g.parent) {
      this.model.roll.add(rg);
      rg.rotation.set(0, 0, 0);
      scene.remove(this.walker.g);
    }
    this.onFoot = on;
  }

  // animacion de GOLPE: batazo con la zanahoria o trompada/estocada hacia adelante
  animateSwing(t) {
    const k = (t - this.swingAt) / 0.38;
    const on = k >= 0 && k <= 1;
    const e = on ? Math.sin(k * Math.PI) : 0;
    if (this.bat) {
      this.bat.visible = game.state.mode === 'battle';
      this.bat.rotation.set(-0.35 + e * 0.35, 0, 0.85 - e * 2.7);
    }
    const rg = this.model.riderGroup;
    rg.position.x = e * 40;
    return e;
  }

  // jaula de bananas / bloque de hielo alrededor de quien este atrapado o congelado
  updateHolds(p, x, z, t, scale) {
    if (p.trapped && !this.cage) { this.cage = buildCage(); scene.add(this.cage); }
    if (this.cage) {
      this.cage.visible = !!p.trapped;
      this.cage.position.set(x, 0, z);
      this.cage.rotation.y = t * 1.6;
      this.cage.scale.setScalar(scale);
    }
    if (p.frozen && !this.iceBlock) { this.iceBlock = buildIceBlock(); scene.add(this.iceBlock); }
    if (this.iceBlock) {
      this.iceBlock.visible = !!p.frozen;
      this.iceBlock.position.set(x, 0, z);
      this.iceBlock.scale.setScalar(scale);
    }
  }

  dispose() {
    if (this.cage) scene.remove(this.cage);
    if (this.iceBlock) scene.remove(this.iceBlock);
    if (this.walker) scene.remove(this.walker.g);
    scene.remove(this.group);
    this.shadow.geometry.dispose();
    this.meshes.forEach((m) => { if (m.material && m.material.map && m.material.map.isCanvasTexture && m.userData.ownTex) m.material.map.dispose(); });
  }

  // brillo de estrella (arcoiris) / tinte violeta al resbalar: via emisivo de los materiales activos
  setGlow(kind, t) {
    if (kind === 'none' && this.glow === 'none') return;
    this.meshes.forEach((m) => {
      const mat = m.material;
      if (!mat || !mat.emissive) return;
      if (!m.userData.baseEmissive) m.userData.baseEmissive = { c: mat.emissive.clone(), i: mat.emissiveIntensity };
      const b = m.userData.baseEmissive;
      if (kind === 'star') { mat.emissive.setHSL((t * 1.6) % 1, 1, 0.55); mat.emissiveIntensity = 0.75; }
      else if (kind === 'slow') { mat.emissive.set('#7a3fd0'); mat.emissiveIntensity = 0.4; }
      else { mat.emissive.copy(b.c); mat.emissiveIntensity = b.i; }
    });
    this.glow = kind;
  }

  update(p, w, t, dt, phase) {
    const baseScale = (phase === 'select' ? 0 : 1) * (p.shrunk ? 0.55 : 1);
    if (this.prev) {
      const d = Math.hypot(w.x - this.prev.x, w.z - this.prev.z) / Math.max(dt, 0.001);
      this.speed += (Math.min(d, 5000) - this.speed) * 0.15;
    }
    this.prev = { x: w.x, z: w.z };
    this.steer = p.steer || 0;
    this.angle = w.angle;
    const { root, roll, riderGroup, wheels } = this.model;
    // el de hielo siempre esta tomando: la botella sube y baja (tragos)
    if (this.model.bottle) {
      const b = this.model.bottle;
      b.quaternion.copy(b.userData.baseQ).multiply(_sipQ.setFromAxisAngle(_sipAxis, Math.max(0, Math.sin(t * 2.6 + this.slot)) * 0.22));
    }
    // parpadeo mientras es invulnerable (recien golpeado en batalla)
    const blink = p.invuln && Math.floor(t * 12) % 2 === 0;
    this.group.visible = !blink;
    if (p.onFoot !== !!this.onFoot) this.setOnFoot(!!p.onFoot);
    if (p.onFoot) {
      // auto estacionado donde lo dejo, personaje caminando
      const cw = toWorld(p.carX, p.carY);
      this.group.position.set(cw.x, 0, cw.z);
      this.group.scale.setScalar(baseScale);
      this.yaw.rotation.y = -p.carAngle;
      root.rotation.set(0, 0, 0);
      roll.rotation.x = 0;
      this.shadow.visible = true;
      this.dizzy.forEach((s) => { s.visible = false; });
      const W = this.walker;
      W.g.visible = !blink;
      W.g.position.set(w.x, 0, w.z);
      W.g.scale.setScalar(baseScale);
      W.yaw.rotation.y = -w.angle;
      const sp = Math.min(this.speed / 900, 1.3);
      const ph = t * 15 + this.slot;
      W.legs[0].rotation.z = Math.sin(ph) * 0.7 * sp;
      W.legs[1].rotation.z = -Math.sin(ph) * 0.7 * sp;
      riderGroup.position.y = Math.abs(Math.sin(ph)) * 14 * sp;
      riderGroup.rotation.x = Math.sin(ph) * 0.06 * sp;
      this.animateSwing(t);
      this.updateHolds(p, w.x, w.z, t, 0.62);
      this.setGlow(p.starActive ? 'star' : p.slowed ? 'slow' : 'none', t);
      this.aura.visible = false;
      return;
    }

    // rumbo real: el modelo mira hacia +X
    this.yaw.rotation.y = -w.angle;
    let fall = this.fall;
    if (p.falling) {
      if (!fall || fall.state !== 'falling') fall = this.fall = { state: 'falling', t0: t, x: this.group.position.x, z: this.group.position.z };
      const k = Math.min(1, (t - fall.t0) / FALL_DURATION);
      const hop = 150 * Math.sin(Math.min(k * 1.8, 1) * Math.PI);
      const drop = 1100 * Math.pow(k, 2.2);
      this.group.position.set(fall.x, hop - drop, fall.z);
      root.rotation.set(k * Math.PI * 1.4, 0, k * Math.PI * 1.1);
      this.group.scale.setScalar(baseScale * (1 - 0.5 * k));
      this.shadow.visible = false;
    } else if (fall && fall.state === 'falling') {
      this.fall = { state: 'popping', t0: t };
    } else if (fall && fall.state === 'popping') {
      const k = Math.min(1, (t - fall.t0) / POP_DURATION);
      this.group.position.set(w.x, 0, w.z);
      root.rotation.set(0, 0, 0);
      const e = 1 + Math.sin(k * Math.PI) * 0.25;
      this.group.scale.setScalar(baseScale * (0.2 + 0.8 * k) * e);
      this.shadow.visible = true;
      if (k >= 1) this.fall = null;
    } else {
      this.group.position.set(w.x, 0, w.z);
      this.shadow.visible = true;
      root.rotation.set(0, 0, 0);
      // inclinacion hacia la curva + el piloto rebota con la velocidad
      this.lean += (this.steer * 0.14 - this.lean) * 0.18;
      roll.rotation.x = this.lean;
      const sp = Math.min(this.speed / 2000, 1.5);
      roll.position.y = roll.userData.baseY + Math.abs(Math.sin(t * 17 + this.slot)) * 5 * sp;
      riderGroup.position.y = Math.abs(Math.sin(t * 9 + this.slot)) * 6 * sp;
      riderGroup.rotation.x = this.lean * 0.8;
      this.squash *= 0.86;
      const sq = this.squash;
      this.group.scale.set(baseScale * (1 + sq * 0.18), baseScale * (1 - sq * 0.22), baseScale * (1 + sq * 0.18));
    }
    this.animateSwing(t);
    this.updateHolds(p, this.group.position.x, this.group.position.z, t, 1);
    // ruedas girando (se rota la textura de la llanta)
    const wt = wheels.material.map;
    if (wt) wt.rotation -= (this.speed * dt) / 34;

    if (p.crashed) {
      this.yaw.rotation.y += t * 18;
      this.dizzy.forEach((s, i) => {
        s.visible = true;
        const a = t * 6 + i * (Math.PI * 2 / 3);
        s.position.set(Math.cos(a) * 120, KART_H + 20 + Math.sin(a * 2) * 10, Math.sin(a) * 120);
      });
    } else {
      this.dizzy.forEach((s) => { s.visible = false; });
    }

    if (p.starActive && phase !== 'select') {
      this.setGlow('star', t);
      this.aura.visible = true;
      this.aura.material.color.setHSL((t * 1.6) % 1, 1, 0.55);
      this.aura.material.opacity = 0.55 + Math.sin(t * 20) * 0.2;
    } else {
      this.setGlow(p.slowed ? 'slow' : 'none', t);
      this.aura.visible = false;
    }
  }

  faceCamera(cam, viewKey, ownSlot) {
    this.tag.visible = this.slot !== ownSlot && !this.onFoot;
    if (this.walker) this.walker.tag.visible = this.slot !== ownSlot;
  }
}

export const karts = [null, null, null, null];

export function ensureKart(i, p) {
  const k = karts[i];
  if (k && k.character === p.character && k.id === p.id) return k;
  if (k) k.dispose();
  karts[i] = new Kart(i, p.character, p.id, p.color);
  return karts[i];
}

export function removeKart(i) {
  if (karts[i]) { karts[i].dispose(); karts[i] = null; }
}

export function faceAllKarts(cam, viewKey, ownSlot) {
  karts.forEach((k) => { if (k) k.faceCamera(cam, viewKey, ownSlot); });
}
