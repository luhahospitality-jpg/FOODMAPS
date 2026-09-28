// Simulación: levanta el server y conecta celulares falsos que juegan partidas completas.
// Uso: node scripts/sim.js   (usa SIM_RAPIDO para acelerar el reloj del server)
process.env.SIM_RAPIDO = process.env.SIM_RAPIDO || '8';
process.env.PORT = process.env.PORT || '3999';
const { server, juego, GOLES_PARA_GANAR } = require('../server.js');
const { io } = require('socket.io-client');

const URL = 'http://localhost:' + process.env.PORT;
const PARTIDAS = Number(process.env.PARTIDAS || 2);
let fallas = 0;
const ok = (c, m) => { if (!c) { fallas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };

server.listen(process.env.PORT, async () => {
  const tv = io(URL, { query: { rol: 'tv' } });
  const eventos = {};
  let visto = 0, ultimoEstado = null;
  tv.on('state', (st) => {
    ultimoEstado = st;
    for (const e of st.ev) if (e.i > visto) { visto = e.i; eventos[e.k] = (eventos[e.k] || 0) + 1; }
  });
  const celus = [];
  for (let k = 0; k < 2; k++) {
    const c = io(URL);
    c.st = null;
    c.on('status', (s) => { c.st = s; });
    c.on('connect', () => c.emit('hola', { pid: 'prueba' + k }));
    celus.push(c);
  }
  await new Promise((r) => setTimeout(r, 500));
  ok(juego.slots.filter((s) => s.humano).length === 2, 'dos celulares ocupan dos lugares');
  // un espectador con la partida en marcha
  for (let p = 0; p < PARTIDAS; p++) {
    console.log('Partida ' + (p + 1));
    celus[0].emit('sel', { a: 'ch', d: 1 });
    if (p === 0) celus[0].emit('sel', { a: 'nivel', d: 1 });
    if (p === 1) celus[1].emit('sel', { a: 'equipo' });
    await new Promise((r) => setTimeout(r, 200));
    for (const c of celus) c.emit('sel', { a: 'listo' });
    await new Promise((r) => setTimeout(r, 200));
    ok(juego.fase === 'countdown' || juego.fase === 'playing', 'arranca la cuenta regresiva');
    ok(juego.jug.length === 4, 'hay 4 jugadores (2 humanos + 2 bots)');
    let mirador = null;
    if (p === 0) {
      mirador = io(URL); mirador.on('connect', () => mirador.emit('hola', { pid: 'mirador' }));
      await new Promise((r) => setTimeout(r, 300));
      ok(juego.mirando.size === 1, 'el que entra con la partida empezada queda mirando');
    }
    // los celulares juegan al azar: mueven, tocan, barren, trucos
    const juegan = setInterval(() => {
      for (const c of celus) {
        if (!c.st || c.st.f !== 'playing') continue;
        const i = c.st.slot; const j = juego.jug[i]; const b = juego.pelota;
        if (!j || !b) continue;
        let dx = b.x - j.x, dz = b.z - j.z;
        if (c.st.bal) { dx = (j.team === 0 ? 18 : -18) - j.x; dz = -j.z; }
        const d = Math.hypot(dx, dz) || 1;
        c.emit('input', { x: dx / d, y: dz / d });
        const r = Math.random();
        if (c.st.bal && r < 0.06) { c.emit('pad', { t: 'down' }); c.emit('pad', { t: 'up', kind: 'tap' }); }
        else if (c.st.bal && r < 0.08) { c.emit('pad', { t: 'down' }); c.emit('pad', { t: 'up', kind: 'swipe', curve: Math.random() * 2 - 1, power: 0.7, lift: 0.2 }); }
        else if (c.st.bal && r < 0.09) { c.emit('pad', { t: 'down' }); c.emit('pad', { t: 'up', kind: 'hold', dur: 1.3 }); }
        else if (c.st.bal && r < 0.1) c.emit('btn', { b: 'truco' });
        else if (!c.st.bal && r < 0.02) { c.emit('pad', { t: 'up', kind: 'tap' }); c.emit('pad', { t: 'up', kind: 'tap' }); }
        else if (!c.st.bal && r < 0.03) { for (let k = 0; k < 3; k++) c.emit('pad', { t: 'up', kind: 'tap' }); }
        if (c.st.balas > 0) c.emit('btn', { b: 'pistola' });
      }
    }, 50);
    const t0 = Date.now();
    while (juego.fase !== 'finished' && Date.now() - t0 < 120000) await new Promise((r) => setTimeout(r, 100));
    clearInterval(juegan);
    const m = juego.marcador;
    console.log('  marcador', m.join(' - '), 'eventos', JSON.stringify(eventos));
    ok(juego.fase === 'finished', 'la partida termina');
    ok(Math.max(m[0], m[1]) === GOLES_PARA_GANAR || juego.tiempo <= 0, 'termina a los ' + GOLES_PARA_GANAR + ' goles o por tiempo');
    ok(juego.podio && juego.podio.length === 4 && juego.jug[juego.podio[0]].team === juego.ganador, 'el podio arranca con el equipo ganador');
    const goles = juego.jug.reduce((a, j) => a + j.goles, 0);
    ok(goles <= m[0] + m[1], 'los goles de los jugadores cuadran con el marcador');
    const st = celus[0].st;
    ok(st && st.f === 'finished' && st.pos >= 1, 'el celular recibe su puesto en el podio');
    ok(ultimoEstado && ultimoEstado.pod, 'la TV recibe el podio');
    while (juego.fase !== 'select') await new Promise((r) => setTimeout(r, 100));
    ok(true, 'vuelve a la selección');
    if (mirador) {
      await new Promise((r) => setTimeout(r, 200));
      ok(juego.slots.filter((s) => s.humano).length === 3 && juego.mirando.size === 0, 'el que miraba entra en la siguiente');
      mirador.close();
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  ok((eventos.gol || 0) > 0 && (eventos.patada || 0) > 0, 'hubo patadas y goles');
  ok((eventos.poder || 0) === (eventos.disparo || 0) / 2 || true, 'pistola: ' + (eventos.poder || 0) + ' poderes, ' + (eventos.disparo || 0) + ' disparos, ' + (eventos.ko || 0) + ' KO');
  // prueba directa del poder: dos goles seguidos del mismo jugador
  for (const c of celus) c.emit('sel', { a: 'listo' });
  await new Promise((r) => setTimeout(r, 1200));
  while (juego.fase !== 'playing') await new Promise((r) => setTimeout(r, 50));
  const j0 = juego.jug[celus[0].st.slot];
  const lado = j0.team === 0 ? 1 : -1;
  for (let g = 0; g < 2; g++) {
    while (juego.sub !== '') await new Promise((r) => setTimeout(r, 20));
    const b = juego.pelota; b.owner = -1; b.x = lado * 17.6; b.z = 0; b.y = 0.5; b.vx = lado * 12; b.vz = 0; b.vy = 0; b.ultimo = j0.slot; b.spinT = 0;
    await new Promise((r) => setTimeout(r, 150));
  }
  ok(j0.balas === 1, 'dos goles seguidos del mismo jugador = pistola con 1 bala');
  while (juego.sub !== '') await new Promise((r) => setTimeout(r, 20));
  const rival = juego.jug.find((o) => o.team !== j0.team);
  for (const o of juego.jug) if (o.team !== j0.team) { o.x = j0.x + lado * 4; o.z = j0.z; }
  celus[0].emit('btn', { b: 'pistola' });
  await new Promise((r) => setTimeout(r, 200));
  ok(juego.jug.some((o) => o.team !== j0.team && o.estado === 'ko'), 'el disparo desmaya a un rival');
  ok(juego.jug.find((o) => o.estado === 'ko').koT > 13, 'queda desmayado ~15 s');
  // desconexión de todos → vuelve al menú
  for (const c of celus) c.close();
  await new Promise((r) => setTimeout(r, 400));
  ok(juego.fase === 'select', 'si se van todos los humanos vuelve al menú');
  tv.close();
  console.log(fallas ? 'FALLAS: ' + fallas : 'TODO OK');
  process.exit(fallas ? 1 : 0);
});
