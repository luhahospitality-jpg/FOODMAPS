// Red: recibe snapshots del server (20/s) e interpola con ~110 ms de retraso
// para que se vea fluido a 60 fps. Los eventos se disparan sincronizados con lo que se ve.
const RETRASO = 110;

export function crearRed(alNivel) {
  /* global io */
  const socket = io({ query: { rol: 'tv' }, transports: ['websocket', 'polling'] });
  const snaps = [];
  const pendientes = [];
  let ultimoEv = 0;
  let conectado = false;

  socket.on('connect', () => { conectado = true; });
  socket.on('disconnect', () => { conectado = false; });
  socket.on('nivel', (n) => alNivel(n));
  socket.on('state', (s) => {
    const t = performance.now();
    snaps.push({ t, s });
    if (snaps.length > 40) snaps.shift();
    let max = 0;
    for (const e of s.ev) max = Math.max(max, e.i);
    if (max && max < ultimoEv - 50) ultimoEv = 0;        // el server se reinició
    for (const e of s.ev) if (e.i > ultimoEv) { pendientes.push({ t, e }); }
    if (max > ultimoEv) ultimoEv = max;
  });

  const lerp = (a, b, k) => a + (b - a) * k;
  function lerpAng(a, b, k) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * k;
  }

  // Devuelve el estado interpolado para el instante actual
  function muestra(ahora) {
    if (!snaps.length) return null;
    const rt = ahora - RETRASO;
    let a = snaps[0], b = snaps[snaps.length - 1];
    for (let i = snaps.length - 1; i > 0; i--) {
      if (snaps[i - 1].t <= rt) { a = snaps[i - 1]; b = snaps[i]; break; }
    }
    // limpiar lo viejo
    while (snaps.length > 3 && snaps[1].t < rt - 200) snaps.shift();
    const span = b.t - a.t;
    const k = span > 0 ? Math.max(0, Math.min(1, (rt - a.t) / span)) : 1;
    const sa = a.s, sb = b.s;
    const out = { s: k < 0.5 ? sa : sb, ult: snaps[snaps.length - 1].s, p: null, b: null };
    if (sa.p && sb.p && sa.p.length === sb.p.length) {
      out.p = sb.p.map((pb, i) => {
        const pa = sa.p[i];
        const salto = Math.abs(pb[1] - pa[1]) + Math.abs(pb[2] - pa[2]) > 400;   // teletransporte (respawn, saque)
        const kk = salto ? 1 : k;
        return {
          slot: pb[0], x: lerp(pa[1], pb[1], kk) / 100, z: lerp(pa[2], pb[2], kk) / 100, y: lerp(pa[3], pb[3], kk) / 100,
          face: lerpAng(pa[4] / 100, pb[4] / 100, kk), anim: (k < 0.5 ? pa : pb)[5], animSeq: (k < 0.5 ? pa : pb)[6],
          ch: pb[7], team: pb[8], flags: pb[9], truco: pb[10], ko: pb[11], balas: pb[12], goles: pb[13], carga: pb[14],
          vel: Math.hypot(pb[15], pb[16]) / 100,
        };
      });
    } else if (sb.p) {
      out.p = sb.p.map((pb) => ({ slot: pb[0], x: pb[1] / 100, z: pb[2] / 100, y: pb[3] / 100, face: pb[4] / 100, anim: pb[5], animSeq: pb[6], ch: pb[7], team: pb[8], flags: pb[9], truco: pb[10], ko: pb[11], balas: pb[12], goles: pb[13], carga: pb[14], vel: 0 }));
    }
    if (sa.b && sb.b) {
      const ba = sa.b, bb = sb.b;
      const salto = Math.abs(bb[0] - ba[0]) + Math.abs(bb[2] - ba[2]) > 500;
      const kk = salto ? 1 : k;
      out.b = { x: lerp(ba[0], bb[0], kk) / 100, y: lerp(ba[1], bb[1], kk) / 100, z: lerp(ba[2], bb[2], kk) / 100, owner: bb[3], fx: bb[4] };
    }
    out.bl = sb.bl || null;
    return out;
  }

  function eventosListos(ahora) {
    const listos = [];
    while (pendientes.length && pendientes[0].t <= ahora - RETRASO) listos.push(pendientes.shift().e);
    if (pendientes.length > 200) pendientes.splice(0, pendientes.length - 200);
    return listos;
  }

  return { socket, muestra, eventosListos, conectado: () => conectado };
}
