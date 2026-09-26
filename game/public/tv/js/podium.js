import { THREE, PAL, RAINBOW, CHAR_INFO, canvasTexture } from './core.js';
import { envTex } from './render.js';
import { tex } from './assets.js';
import { RoundedBoxGeometry } from '/vendor/addons/geometries/RoundedBoxGeometry.js';
import { glowTex } from './karts.js';
import { buildCharacterModel } from './models.js';

export const podiumScene = new THREE.Scene();
export const podiumCam = new THREE.PerspectiveCamera(42, 16 / 9, 10, 20000);
podiumScene.background = new THREE.Color('#1b0f3a');
podiumScene.fog = new THREE.Fog('#1b0f3a', 2600, 6000);

podiumScene.add(new THREE.HemisphereLight('#e8dcff', '#3a1f6b', 1.6));
const key = new THREE.DirectionalLight('#fff3dc', 2.4);
key.position.set(300, 1400, 1200);
podiumScene.add(key);

// fondo: cortina con degradado + halo de escenario
const backTex = canvasTexture(1024, 512, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#120a2e'); g.addColorStop(0.6, '#3b1f78'); g.addColorStop(1, '#5a2fa0');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    c.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`;
    c.beginPath(); c.arc(Math.random() * w, Math.random() * h * 0.6, Math.random() * 2.2, 0, Math.PI * 2); c.fill();
  }
});
const back = new THREE.Mesh(new THREE.PlaneGeometry(9000, 4500), new THREE.MeshBasicMaterial({ map: backTex, fog: false }));
back.position.set(0, 1500, -2200);
podiumScene.add(back);

const stage = new THREE.Mesh(new THREE.CylinderGeometry(1500, 1600, 120, 64), new THREE.MeshStandardMaterial({ color: '#2d1a5c', roughness: 0.35, metalness: 0.2, envMap: envTex, envMapIntensity: 0.5 }));
stage.position.y = -60;
podiumScene.add(stage);
const rim = new THREE.Mesh(new THREE.TorusGeometry(1540, 16, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.pink).multiplyScalar(2.2) }));
rim.rotation.x = Math.PI / 2;
podiumScene.add(rim);

function numberTex(n, color) {
  return canvasTexture(256, 256, (c, w, h) => {
    c.font = '200px "Lilita One", Impact, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = 26; c.strokeStyle = '#202030';
    c.strokeText(String(n), w / 2, h / 2 + 12);
    const g = c.createLinearGradient(0, 40, 0, 220);
    g.addColorStop(0, '#FFF8E7'); g.addColorStop(1, color);
    c.fillStyle = g; c.fillText(String(n), w / 2, h / 2 + 12);
  });
}

const blocks = [
  { place: 2, x: -520, h: 300, color: PAL.blue },
  { place: 1, x: 0, h: 440, color: PAL.orange },
  { place: 3, x: 520, h: 220, color: PAL.red },
];
blocks.forEach((b) => {
  const m = new THREE.Mesh(new RoundedBoxGeometry(480, b.h, 420, 4, 26), new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.3, metalness: 0.05, envMap: envTex, envMapIntensity: 0.6 }));
  m.position.set(b.x, b.h / 2, 0);
  podiumScene.add(m);
  const num = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshBasicMaterial({ map: numberTex(b.place, b.place === 1 ? PAL.yellow : '#dfe8ff'), transparent: true }));
  num.position.set(b.x, b.h * 0.5, 212);
  podiumScene.add(num);
  b.top = b.h;
});

// antorchas a los costados
const flames = [];
[-1100, 1100].forEach((x) => {
  const post = new THREE.Mesh(new RoundedBoxGeometry(120, 420, 120, 3, 16), new THREE.MeshStandardMaterial({ color: '#6b5a8e', roughness: 0.7 }));
  post.position.set(x, 210, -120);
  podiumScene.add(post);
  const bowl = new THREE.Mesh(new RoundedBoxGeometry(220, 70, 220, 3, 16), new THREE.MeshStandardMaterial({ color: '#3c2f55', roughness: 0.6 }));
  bowl.position.set(x, 440, -120);
  podiumScene.add(bowl);
  const torch = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('icon_torch'), transparent: true, color: new THREE.Color(1.35, 1.35, 1.35) }));
  torch.scale.set(190, 380, 1);
  torch.position.set(x, 640, -120);
  podiumScene.add(torch);
  const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(PAL.orange).multiplyScalar(1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  f.position.set(x, 720, -140);
  podiumScene.add(f);
  flames.push({ f, k: 0, x });
});

// haces de luz desde arriba
const beamMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { col: { value: new THREE.Color('#ffe9b8') } },
  vertexShader: 'varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 col; varying float vY; void main(){ gl_FragColor = vec4(col * 0.35 * vY, 1.0); }',
});
const beams = [];
[-520, 0, 520].forEach((x, i) => {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(60, 380, 2600, 24, 1, true), beamMat);
  b.position.set(x, 1500, 0);
  b.rotation.z = (i - 1) * -0.12;
  podiumScene.add(b);
  beams.push(b);
});

// confeti del podio (instanciado)
const CONF = 260;
const confMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(28, 44), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONF);
const confData = [];
const col = new THREE.Color();
for (let i = 0; i < CONF; i++) {
  confData.push({ x: (Math.random() - 0.5) * 3600, y: Math.random() * 2600, z: (Math.random() - 0.5) * 1800, sp: 140 + Math.random() * 180, rx: Math.random() * 6, ry: Math.random() * 6, vr: (Math.random() - 0.5) * 8 });
  confMesh.setColorAt(i, col.set([PAL.red, PAL.orange, PAL.yellow, PAL.green, PAL.blue, PAL.violet, PAL.pink, PAL.turquoise][i % 8]));
}
confMesh.instanceColor.needsUpdate = true;
confMesh.frustumCulled = false;
podiumScene.add(confMesh);

// personajes arriba del podio
const racers = [];
function clearRacers() {
  racers.forEach((r) => { podiumScene.remove(r.m); });
  racers.length = 0;
}

export function setupPodium(ranking, players) {
  clearRacers();
  const byId = {};
  players.forEach((p) => { if (p) byId[p.id] = p; });
  ranking.forEach((id, i) => {
    const p = byId[id];
    if (!p) return;
    const spot = i < 3 ? blocks.find((b) => b.place === i + 1) : { x: 1150, top: 0 };
    const model = buildCharacterModel(p.character);
    const m = new THREE.Group();
    m.add(model.root);
    // de frente a la camara, un poco en diagonal hacia el centro
    model.root.rotation.y = -Math.PI / 2 + (spot.x < 0 ? 0.55 : spot.x > 0 ? -0.55 : 0);
    const sc = i === 0 ? 1.2 : i < 3 ? 1.0 : 0.85;
    m.scale.setScalar(sc);
    m.position.set(spot.x, spot.top, i < 3 ? 20 : 260);
    podiumScene.add(m);
    racers.push({ m, i, base: spot.top, model });
  });
}

export function updatePodium(t) {
  podiumCam.position.set(Math.sin(t * 0.25) * 240, 700 + Math.sin(t * 0.4) * 30, 2250);
  podiumCam.lookAt(0, 690, 0);
  flames.forEach((fl, i) => {
    const s = 420 * (1 + Math.sin(t * 14 + i) * 0.1);
    fl.f.scale.set(s, s, 1);
  });
  beams.forEach((b, i) => { b.rotation.z = (i - 1) * -0.12 + Math.sin(t * 0.8 + i) * 0.08; });
  racers.forEach((r) => {
    // el ganador salta de alegria
    const hop = r.i === 0 ? Math.abs(Math.sin(t * 4.5)) * 60 : Math.abs(Math.sin(t * 3 + r.i)) * 14;
    r.m.position.y = r.base + hop;
    if (r.i === 0) r.model.riderGroup.rotation.z = Math.sin(t * 4.5) * 0.08;
  });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  confData.forEach((d, i) => {
    d.y -= d.sp * 0.016;
    if (d.y < 0) d.y = 2600;
    d.rx += d.vr * 0.016;
    e.set(d.rx, d.ry + d.rx * 0.5, 0); q.setFromEuler(e);
    p.set(d.x + Math.sin(t + i) * 40, d.y, d.z);
    m4.compose(p, q, s); confMesh.setMatrixAt(i, m4);
  });
  confMesh.instanceMatrix.needsUpdate = true;
}
void RAINBOW;
