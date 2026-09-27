import * as THREE from '/vendor/three.module.min.js';

export { THREE };

// paleta exacta del moodboard
export const PAL = {
  red: '#FF4B5C', orange: '#FF9F1C', yellow: '#FFD93D', green: '#55D66A', turquoise: '#3BD9D0',
  blue: '#4D7CFE', violet: '#9B5DE5', pink: '#FF6FB5', white: '#FFF8E7', black: '#202030', ice: '#A9F3FF',
};
export const RAINBOW = [PAL.red, PAL.orange, PAL.yellow, PAL.green, PAL.blue, PAL.violet];

export const CHAR_ORDER = ['rabbit', 'gorilla', 'princess', 'ice'];
export const CHAR_INFO = {
  rabbit: { name: 'CONEJO MALO', full: 'CONEJO MALO', power: 'GIANT CARROT', bpower: 'BATE ZANAHORIA', powerIcon: 'pw_carrot', card: ['#FFB23E', '#FF7A1A'], sprite: 'bunny' },
  gorilla: { name: 'CHADRILLA', full: 'CHADRILLA', power: 'BANANA PEEL', bpower: 'BANANAS TRAMPA', powerIcon: 'pw_gorilla_banana', card: ['#FFE45C', '#FFC21A'], sprite: 'gorilla' },
  princess: { name: 'PRINCESS TAGLIANI', full: 'PRINCESS TAGLIANI', power: 'POISON FLOWERS', bpower: 'FLORES BOMBA', powerIcon: 'pw_flower', card: ['#FF8FD0', '#F04FA8'], sprite: 'princess' },
  ice: { name: 'ICE RACER', full: 'ICE RACER', power: 'FREEZE TRACK', bpower: 'ESTALLIDO DE HIELO', powerIcon: 'pw_freeze', card: ['#6FC2FF', '#2F7BFF'], sprite: 'ice' },
};

export const game = {
  state: {
    phase: 'select', countdown: 0, winnerId: null, ranking: [], laps: 3, trackIndex: 0, trackCount: 1, trackList: [],
    trackId: null, trackName: '', trackTheme: 'rainbow', track: [], trackWidth: 1700, guardrailSegments: [],
    players: [], boxes: [], coins: [], peels: [], flowers: [], missiles: [], ice: { active: false },
  },
  prev: null,
  t: 0,
  dt: 0,
  offset: { x: 0, z: 0 },
};

export function toWorld(sx, sy) {
  return { x: sx - game.offset.x, z: sy - game.offset.z };
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lerp(a, b, t) { return a + (b - a) * t; }
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// distancia de un punto (mundo xz) a la polilinea cerrada de la pista (mundo xz)
export function distToPolyline(x, z, pts) {
  let best = Infinity;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const abx = b.x - a.x, abz = b.z - a.z;
    const len2 = abx * abx + abz * abz || 1;
    let t = ((x - a.x) * abx + (z - a.z) * abz) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - (a.x + abx * t), dz = z - (a.z + abz * t);
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

export function canvasTexture(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opts.repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
  tex.anisotropy = opts.anisotropy || window.__aniso || 8;
  return tex;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function shade(hex, amt) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, clamp(hsl.l + amt, 0, 1));
  return '#' + c.getHexString();
}
