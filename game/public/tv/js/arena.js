import { THREE, PAL, RAINBOW, game, canvasTexture, mulberry32, roundRect, shade } from './core.js';
import { fitSunShadow, renderer, quality } from './render.js';
import { TRACK, trackGroup, Instancer, unitRoundedBox, blockMaterial, themeCfg } from './track.js';

// Arena del modo batalla: piso de bloques a cuadros, paredes-paragolpes de colores,
// pilares para esconderse y tribunas alrededor (autitos chocadores).

function tile(c, x, y, w, h, color, grout) {
  c.fillStyle = grout; c.fillRect(x, y, w, h);
  c.fillStyle = color; roundRect(c, x + 5, y + 5, w - 10, h - 10, 14); c.fill();
  const g = c.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.32)'); g.addColorStop(0.2, 'rgba(255,255,255,0.06)');
  g.addColorStop(0.8, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
  c.fillStyle = g; roundRect(c, x + 5, y + 5, w - 10, h - 10, 14); c.fill();
}

function floorTexture() {
  return canvasTexture(1024, 1024, (c, w) => {
    const n = 4, s = w / n;
    const r = mulberry32(5);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let col = (x + y) % 2 ? '#7a5ad6' : '#6246c0';
      if (r() < 0.18) col = RAINBOW[Math.floor(r() * RAINBOW.length)];
      tile(c, x * s, y * s, s, s, col, '#2a1c5a');
    }
  }, { repeat: true });
}

function freezeMaterial(mat, key) {
  // el hielo pinta el piso de celeste igual que en las pistas
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uFreeze = TRACK.roadUniforms.uFreeze;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFreeze;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.70, 0.95, 1.0), uFreeze * 0.62);');
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

export function buildArena(state) {
  const A = state.arena;
  const W = A.w, H = A.h;
  TRACK.theme = 'battle';
  TRACK.animated = [];
  TRACK.tiles = null;
  game.offset = { x: W / 2, z: H / 2 };
  const hw = W / 2, hh = H / 2;
  TRACK.pts = [{ x: -hw, z: -hh }, { x: hw, z: -hh }, { x: hw, z: hh }, { x: -hw, z: hh }];
  TRACK.half = 0;
  TRACK.bounds = { minX: -hw, maxX: hw, minZ: -hh, maxZ: hh };

  // piso
  const ft = floorTexture();
  ft.repeat.set(W / 2400, H / 2400);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), freezeMaterial(new THREE.MeshStandardMaterial({ map: ft, roughness: 0.55 }), 'arena-floor'));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  trackGroup.add(floor);
  // suelo de afuera (donde estan las tribunas)
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(W + 16000, H + 16000), new THREE.MeshStandardMaterial({ color: '#4a3490', roughness: 0.9 }));
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -4;
  trackGroup.add(outer);

  // paredes de bloques arcoiris + paragolpes amarillo/negro por dentro
  const wall = new Instancer(unitRoundedBox(), blockMaterial({ roughness: 0.5 }), 400);
  const bump = new Instancer(unitRoundedBox(), blockMaterial({ roughness: 0.4 }), 400);
  const B = 420; // largo de cada bloque
  let k = 0;
  const side = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / B);
    const ang = Math.atan2(z1 - z0, x1 - x0);
    const nx = -(z1 - z0) / len, nz = (x1 - x0) / len; // hacia adentro (los lados van en sentido horario)
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n;
      const x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f;
      wall.add(x - nx * 180, 170, z - nz * 180, B * 0.98, 340, 300, -ang, RAINBOW[k++ % RAINBOW.length]);
      bump.add(x + nx * 20, 70, z + nz * 20, B * 0.98, 110, 70, -ang, i % 2 ? '#202030' : PAL.yellow);
    }
  };
  side(-hw, -hh, hw, -hh);
  side(hw, -hh, hw, hh);
  side(hw, hh, -hw, hh);
  side(-hw, hh, -hw, -hh);
  // torres en las esquinas
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], i) => {
    for (let j = 0; j < 4; j++) wall.add(sx * (hw + 180), 150 + j * 300, sz * (hh + 180), 520 - j * 40, 290, 520 - j * 40, 0, j % 2 ? '#ffffff' : RAINBOW[(i * 2 + j) % RAINBOW.length]);
  });
  wall.build(trackGroup, true);
  bump.build(trackGroup, false);

  // pilares: bandas de colores apiladas + anillo de goma en la base
  const seg = quality.lite ? 10 : 20;
  const unitCyl = new THREE.CylinderGeometry(1, 1, 1, seg);
  const pil = new Instancer(unitCyl, blockMaterial({ roughness: 0.45 }), 60);
  const rings = new Instancer(unitCyl, new THREE.MeshStandardMaterial({ color: '#202030', roughness: 0.8 }), 10);
  A.pillars.forEach((c, i) => {
    const x = c.x - W / 2, z = c.y - H / 2;
    const bands = c.r > 800 ? 6 : 4;
    for (let j = 0; j < bands; j++) pil.add(x, 110 + j * 200, z, c.r * (1 - j * 0.04), 196, c.r * (1 - j * 0.04), 0, RAINBOW[(i + j) % RAINBOW.length]);
    rings.add(x, 50, z, c.r + 40, 100, c.r + 40, 0, '#ffffff');
  });
  pil.build(trackGroup, true);
  rings.build(trackGroup, false);

  // estrella gigante girando sobre el pilar del medio
  const mid = A.pillars.reduce((a, b) => (b.r > a.r ? b : a), A.pillars[0]);
  if (mid) {
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 150 : 340;
      if (i === 0) starShape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else starShape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const star = new THREE.Mesh(
      new THREE.ExtrudeGeometry(starShape, { depth: 90, bevelEnabled: false }),
      new THREE.MeshStandardMaterial({ color: PAL.yellow, emissive: PAL.yellow, emissiveIntensity: 0.5, roughness: 0.3 })
    );
    star.geometry.center();
    const sy = 110 + 6 * 200 + 420;
    star.position.set(mid.x - W / 2, sy, mid.y - H / 2);
    trackGroup.add(star);
    TRACK.animated.push((t) => { star.rotation.y = t * 1.2; star.position.y = sy + Math.sin(t * 2) * 40; });
  }

  // marcas de largada en las esquinas (colores de jugador)
  const pads = new Instancer(unitRoundedBox(), blockMaterial({ roughness: 0.4 }), 4);
  ['#FF4B5C', '#4D7CFE', '#55D66A', '#FFD93D'].forEach((col, i) => {
    const x = (i % 2 === 0 ? 1600 : W - 1600) - W / 2, z = (i < 2 ? 1600 : H - 1600) - H / 2;
    pads.add(x, 4, z, 700, 8, 700, 0, shade(col, -0.05));
  });
  pads.build(trackGroup, false);

  fitSunShadow(-hw - 600, hw + 600, -hh - 600, hh + 600);
  renderer.shadowMap.needsUpdate = true;
  return { theme: 'rainbow', cfg: themeCfg('rainbow'), pts: TRACK.pts, rand: mulberry32(4321), W, H, arena: A };
}
