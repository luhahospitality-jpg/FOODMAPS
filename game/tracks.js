// Pistas: se dibujan con puntos de control (unidades base) y se suavizan con una
// Catmull-Rom cerrada; despues se remuestrean en tramos cortos y parejos. Asi las
// curvas cerradas quedan redondas (sin esquinas que deformen los bordes) y la
// pista puede ser larga y con muchas curvas sin tener que escribir cada punto.
const WORLD_SCALE = 10;
const SEG_LEN = 700; // largo de cada tramo en unidades de mundo

// guard: tramos de puntos de control [desde, hasta] con baranda (el resto es precipicio)
const TRACKS_RAW = [
  {
    id: 'rainbow', name: 'RAINBOW DUNGEON', theme: 'rainbow',
    ctrl: [
      [300, 300], [700, 300], [1100, 300], [1500, 300], [1780, 330], [1900, 470], [1830, 610],
      [1650, 640], [1480, 590], [1320, 610], [1220, 780], [1340, 960], [1580, 1000], [1840, 930],
      [2080, 980], [2200, 1150], [2130, 1340], [1900, 1410], [1600, 1370], [1330, 1430], [1050, 1410],
      [830, 1270], [770, 1080], [600, 960], [400, 1030], [270, 1090], [170, 1060], [115, 940], [120, 760],
      [190, 480],
    ],
    guard: [[0, 4], [14, 17], [22, 24]],
  },
  {
    id: 'banana', name: 'BANANA CASTLE', theme: 'banana',
    ctrl: [
      [400, 250], [800, 250], [1200, 250], [1600, 250], [1900, 300], [2080, 460], [2060, 660],
      [1880, 760], [1680, 720], [1520, 800], [1500, 980], [1660, 1110], [1900, 1140], [2080, 1260],
      [2050, 1450], [1820, 1540], [1500, 1500], [1250, 1380], [1050, 1460], [800, 1540], [540, 1480],
      [440, 1300], [560, 1150], [720, 1020], [700, 850], [480, 780], [260, 700], [180, 500], [240, 330],
    ],
    guard: [[0, 4], [12, 15], [25, 28]],
  },
  {
    id: 'space', name: 'BASE ESPACIAL', theme: 'space',
    ctrl: [
      [300, 1500], [300, 1100], [300, 700], [340, 420], [520, 260], [800, 250], [1010, 360],
      [1030, 580], [880, 760], [930, 1000], [1150, 1080], [1380, 980], [1440, 740], [1400, 480],
      [1560, 290], [1820, 250], [2080, 320], [2230, 520], [2200, 760], [1990, 880], [1970, 1090],
      [2160, 1280], [2130, 1540], [1900, 1680], [1600, 1640], [1300, 1520], [1000, 1640], [700, 1760],
      [450, 1720],
    ],
    guard: [[0, 3], [16, 19], [26, 28]],
  },
];

function catmull(p0, p1, p2, p3, t) {
  // centripeta: evita lazos y picos cuando los puntos no estan parejos
  const d = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6, 0.5);
  const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
  const tt = t1 + (t2 - t1) * t;
  const lerp = (a, b, ta, tb) => [
    ((tb - tt) * a[0] + (tt - ta) * b[0]) / (tb - ta),
    ((tb - tt) * a[1] + (tt - ta) * b[1]) / (tb - ta),
  ];
  const a1 = lerp(p0, p1, t0, t1), a2 = lerp(p1, p2, t1, t2), a3 = lerp(p2, p3, t2, t3);
  const b1 = lerp(a1, a2, t0, t2), b2 = lerp(a2, a3, t1, t3);
  return lerp(b1, b2, t1, t2);
}

function buildTrackDef(raw) {
  const C = raw.ctrl.map(([x, y]) => [x * WORLD_SCALE, y * WORLD_SCALE]);
  const n = C.length;
  // muestreo denso de la curva, recordando de que tramo de control sale cada muestra
  const dense = [];
  for (let i = 0; i < n; i++) {
    const p0 = C[(i - 1 + n) % n], p1 = C[i], p2 = C[(i + 1) % n], p3 = C[(i + 2) % n];
    for (let k = 0; k < 40; k++) {
      const q = catmull(p0, p1, p2, p3, k / 40);
      dense.push({ x: q[0], y: q[1], ctrl: i });
    }
  }
  const cum = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1], b = dense[i % dense.length];
    cum.push(cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = cum[dense.length];
  const count = Math.max(12, Math.round(total / SEG_LEN));
  const points = [], ctrlOf = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const s = (k / count) * total;
    while (cum[j + 1] < s) j++;
    const a = dense[j], b = dense[(j + 1) % dense.length];
    const f = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    points.push({ x: Math.round(a.x + (b.x - a.x) * f), y: Math.round(a.y + (b.y - a.y) * f) });
    ctrlOf.push(a.ctrl);
  }
  const guardrailSegments = [];
  ctrlOf.forEach((c, i) => {
    if (raw.guard.some(([a, b]) => c >= a && c < b)) guardrailSegments.push(i);
  });
  return { id: raw.id, name: raw.name, theme: raw.theme, points, guardrailSegments, length: total };
}

const TRACK_DEFS = TRACKS_RAW.map(buildTrackDef);

module.exports = { TRACK_DEFS, WORLD_SCALE, SEG_LEN };
