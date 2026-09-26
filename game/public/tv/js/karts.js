import { THREE, CHAR_INFO, canvasTexture, roundRect } from './core.js';
import { scene } from './render.js';
import { tex } from './assets.js';

export const KART_H = 340;
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

class Kart {
  constructor(slot, character, id, color) {
    this.slot = slot; this.character = character; this.id = id;
    this.sprite = CHAR_INFO[character].sprite;
    this.group = new THREE.Group();
    this.yaw = new THREE.Group();
    this.lean = new THREE.Group();
    this.group.add(this.yaw);
    this.yaw.add(this.lean);

    const tL = tex(this.sprite + '_left');
    const aspect = tL && tL.image ? tL.image.width / tL.image.height : 0.6;
    const w = KART_H * aspect;
    const geo = new THREE.PlaneGeometry(w, KART_H);
    geo.translate(0, KART_H / 2 - 8, 0);
    this.mat = new THREE.MeshBasicMaterial({ map: tL, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide, fog: false });
    this.card = new THREE.Mesh(geo, this.mat);
    this.card.renderOrder = 2;
    this.lean.add(this.card);

    this.aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.aura.scale.set(620, 620, 1);
    this.aura.position.y = KART_H * 0.45;
    this.aura.visible = false;
    this.lean.add(this.aura);

    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 3;
    this.shadow.scale.set(w * 1.25, w * 0.8, 1);
    this.shadow.renderOrder = 1;
    this.group.add(this.shadow);

    // tamaño fijo en pantalla (no crece cuando el rival esta pegado a la camara)
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTexture(id, color), transparent: true, depthWrite: false, sizeAttenuation: false }));
    this.tag.scale.set(0.075, 0.0375, 1);
    this.tag.position.y = KART_H + 90;
    this.lean.add(this.tag);

    // estrellitas de mareo (cuando te pega un misil)
    this.dizzy = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('icon_star'), transparent: true, depthWrite: false }));
      s.scale.set(90, 90, 1);
      s.visible = false;
      this.lean.add(s);
      this.dizzy.push(s);
    }

    this.dirByView = {};
    this.fall = null;
    this.visual = { x: 0, z: 0, angle: 0 };
    this.speed = 0;
    this.prev = null;
    this.squash = 0;
    scene.add(this.group);
  }

  dispose() {
    scene.remove(this.group);
    this.group.traverse((o) => { if (o.geometry && o !== this.aura && !o.isSprite) o.geometry.dispose(); });
    this.mat.dispose();
  }

  // pose en el mundo (una vez por frame)
  update(p, w, t, dt, phase) {
    const baseScale = (phase === 'select' ? 0 : 1) * (p.shrunk ? 0.55 : 1);
    if (this.prev) {
      const d = Math.hypot(w.x - this.prev.x, w.z - this.prev.z) / Math.max(dt, 0.001);
      this.speed += (Math.min(d, 5000) - this.speed) * 0.15;
    }
    this.prev = { x: w.x, z: w.z };
    this.steer = p.steer || 0;
    this.angle = w.angle;

    let fall = this.fall;
    if (p.falling) {
      if (!fall || fall.state !== 'falling') fall = this.fall = { state: 'falling', t0: t, x: this.group.position.x, z: this.group.position.z };
      const k = Math.min(1, (t - fall.t0) / FALL_DURATION);
      const hop = 150 * Math.sin(Math.min(k * 1.8, 1) * Math.PI);
      const drop = 1100 * Math.pow(k, 2.2);
      this.group.position.set(fall.x, hop - drop, fall.z);
      this.lean.rotation.z = k * Math.PI * 1.8;
      this.group.scale.setScalar(baseScale * (1 - 0.6 * k));
      this.shadow.visible = false;
    } else if (fall && fall.state === 'falling') {
      this.fall = { state: 'popping', t0: t };
    } else if (fall && fall.state === 'popping') {
      const k = Math.min(1, (t - fall.t0) / POP_DURATION);
      this.group.position.set(w.x, 0, w.z);
      this.lean.rotation.z = 0;
      const e = 1 + Math.sin(k * Math.PI) * 0.25;
      this.group.scale.setScalar(baseScale * (0.2 + 0.8 * k) * e);
      this.shadow.visible = true;
      if (k >= 1) this.fall = null;
    } else {
      this.group.position.set(w.x, 0, w.z);
      this.shadow.visible = true;
      // inclinacion hacia el lado de la curva + rebote segun velocidad
      const targetLean = -this.steer * 0.13;
      this.lean.rotation.z += (targetLean - this.lean.rotation.z) * 0.2;
      const sp = Math.min(this.speed / 2000, 1.5);
      this.lean.position.y = Math.abs(Math.sin(t * 17 + this.slot)) * 7 * sp;
      this.squash *= 0.86;
      const sq = this.squash;
      this.group.scale.set(baseScale * (1 + sq * 0.18), baseScale * (1 - sq * 0.22), baseScale * (1 + sq * 0.18));
    }

    // golpeado por misil: da vueltas y ve estrellitas
    if (p.crashed) {
      this.lean.rotation.y = t * 18;
      this.dizzy.forEach((s, i) => {
        s.visible = true;
        const a = t * 6 + i * (Math.PI * 2 / 3);
        s.position.set(Math.cos(a) * 110, KART_H + 30 + Math.sin(a * 2) * 10, Math.sin(a) * 110);
      });
    } else {
      this.lean.rotation.y = 0;
      this.dizzy.forEach((s) => { s.visible = false; });
    }

    // estrella: brilla (HDR -> bloom) con un tinte arcoiris
    if (p.starActive && phase !== 'select') {
      const c = new THREE.Color().setHSL((t * 1.6) % 1, 1, 0.6);
      this.mat.color.setRGB(1.25 + c.r * 0.5, 1.25 + c.g * 0.5, 1.25 + c.b * 0.5);
      this.aura.visible = true;
      this.aura.material.color.setHSL((t * 1.6) % 1, 1, 0.55);
      this.aura.material.opacity = 0.7 + Math.sin(t * 20) * 0.2;
    } else if (p.slowed) {
      this.mat.color.setRGB(0.85, 0.7, 1.0);
      this.aura.visible = false;
    } else {
      this.mat.color.setRGB(1, 1, 1);
      this.aura.visible = false;
    }
  }

  // orientacion distinta en cada camara (pantalla dividida)
  faceCamera(cam, viewKey, ownSlot) {
    const gx = this.group.position.x, gz = this.group.position.z;
    this.yaw.rotation.y = Math.atan2(cam.position.x - gx, cam.position.z - gz);
    const e = cam.matrixWorld.elements;
    const rx = e[0], rz = e[2];
    const hx = Math.cos(this.angle || 0), hz = Math.sin(this.angle || 0);
    // hacia donde se mueve en ESTA pantalla (+ un poco del volante) -> imagen izquierda o derecha
    const side = hx * rx + hz * rz + this.steer * 0.45;
    let dir = this.dirByView[viewKey] || 'right';
    if (side > 0.14) dir = 'right';
    else if (side < -0.14) dir = 'left';
    this.dirByView[viewKey] = dir;
    const t = tex(this.sprite + '_' + dir);
    if (t && this.mat.map !== t) this.mat.map = t;
    this.tag.visible = this.slot !== ownSlot;
  }
}

export const karts = [null, null, null, null];

export function ensureKart(i, p) {
  const k = karts[i];
  if (k && k.character === p.character) return k;
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
