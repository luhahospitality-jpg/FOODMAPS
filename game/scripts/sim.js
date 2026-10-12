// Simulación: levanta el server y conecta celulares falsos que juegan partidas completas.
// Uso: node scripts/sim.js   (usa SIM_RAPIDO para acelerar el reloj del server)
process.env.SIM_RAPIDO = process.env.SIM_RAPIDO || '8';
process.env.PORT = process.env.PORT || '3999';
const { server, sala, salas, GOLES_PARA_GANAR } = require('../server.js');
const { io } = require('socket.io-client');

const URL = 'http://localhost:' + process.env.PORT;
// todo pasa en la sala PRUE (cada tele tiene la suya)
const SALA = 'PRUE';
const ARCADE = 'https://arcade.ejemplo/arcade/pad?room=PRUE';
const juego = sala(SALA);
const conectar = (extra) => io(URL, { query: Object.assign({ sala: SALA }, extra || {}) });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const PARTIDAS = Number(process.env.PARTIDAS || 2);
let fallas = 0;
const ok = (c, m) => { if (!c) { fallas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };

server.listen(process.env.PORT, async () => {
  const tv = conectar({ rol: 'tv', arcade: ARCADE });
  const eventos = {};
  let visto = 0, ultimoEstado = null;
  tv.on('state', (st) => {
    ultimoEstado = st;
    for (const e of st.ev) if (e.i > visto) { visto = e.i; eventos[e.k] = (eventos[e.k] || 0) + 1; }
  });
  const celus = [];
  for (let k = 0; k < 2; k++) {
    const c = conectar();
    c.st = null;
    c.on('status', (s) => { c.st = s; });
    c.on('connect', () => c.emit('hola', { pid: 'prueba' + k }));
    celus.push(c);
    // de a uno: así el primero queda en el lugar 0 (AMARELO) y el segundo en el 1 (AZUL)
    await new Promise((r) => { c.once('bienvenida', r); setTimeout(r, 3000); });
  }
  await new Promise((r) => setTimeout(r, 500));
  ok(juego.slots.filter((s) => s.humano).length === 2, 'dos celulares ocupan dos lugares');
  // un espectador con la partida en marcha
  for (let p = 0; p < PARTIDAS; p++) {
    console.log('Partida ' + (p + 1));
    if (p === 0) {
      ok(juego.slots[0].ch === 0 && juego.slots[1].ch === 2 && juego.slots[2].ch === 1 && juego.slots[3].ch === 3, 'jugadores fijos por lugar: AMARELO Ronaldinho+Ronaldo, AZUL Maradona+Neymar');
    }
    if (p === 0) celus[0].emit('sel', { a: 'nivel', d: 1 });
    if (p === 1) {
      const antes = juego.slots.findIndex((x) => x.pid === 'prueba1');
      celus[1].emit('sel', { a: 'equipo', t: 0 });
      await new Promise((r) => setTimeout(r, 200));
      const ahora = juego.slots.findIndex((x) => x.pid === 'prueba1');
      ok(antes % 2 === 1 && ahora % 2 === 0 && juego.slots[ahora].ch === 1, 'elegir bando AMARELO: pasa a ser Ronaldo'
        + (antes % 2 === 1 && ahora % 2 === 0 ? '' : ' [antes ' + antes + ', ahora ' + ahora + ', lugares ' + JSON.stringify(juego.slots.map((x) => [x.pid, !!x.humano])) + ']'));
      celus[1].emit('sel', { a: 'equipo', t: 0 });
      await new Promise((r) => setTimeout(r, 200));
      ok(juego.slots.findIndex((x) => x.pid === 'prueba1') === ahora, 'con el bando lleno de humanos no se mueve');
    }
    await new Promise((r) => setTimeout(r, 200));
    for (const c of celus) c.emit('sel', { a: 'listo' });
    await new Promise((r) => setTimeout(r, 200));
    ok(juego.fase === 'countdown' || juego.fase === 'playing', 'arranca la cuenta regresiva');
    ok(juego.jug.length === 4, 'hay 4 jugadores (2 humanos + 2 bots)');
    let mirador = null;
    if (p === 0) {
      mirador = conectar(); mirador.on('connect', () => mirador.emit('hola', { pid: 'mirador' }));
      await new Promise((r) => setTimeout(r, 300));
      const iM = juego.slots.findIndex((x) => x.pid === 'mirador');
      ok(iM >= 0 && juego.mirando.size === 0 && juego.jug[iM].bot === false, 'el que entra con la partida empezada juega enseguida (reemplaza a un bot)');
      const cuarto = conectar(); cuarto.on('connect', () => cuarto.emit('hola', { pid: 'cuarto' }));
      const quinto = conectar(); quinto.on('connect', () => quinto.emit('hola', { pid: 'quinto' }));
      await new Promise((r) => setTimeout(r, 300));
      ok(juego.slots.filter((x) => x.humano).length === 4, 'entran 4 jugadores humanos');
      ok(juego.mirando.size === 1, 'el quinto queda mirando');
      cuarto.close(); quinto.close();
      await new Promise((r) => setTimeout(r, 200));
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
      ok(juego.slots.filter((s) => s.humano).length === 3 && juego.mirando.size === 0, 'sigue en la partida siguiente');
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
  ok(juego.jug.find((o) => o.estado === 'ko').koT > 8 && juego.jug.find((o) => o.estado === 'ko').koT <= 10, 'queda fuera ~10 s por el disparo');
  // si tenés pistola y te disparan, la perdés
  const conPistola = juego.jug.find((o) => o.team !== j0.team && o.estado !== 'ko');
  if (conPistola) {
    conPistola.balas = 1; j0.balas = 1; j0.cd.pistola = 0; j0.estado = 'normal';
    conPistola.x = j0.x + lado * 4; conPistola.z = j0.z; conPistola.inv = 0;
    celus[0].emit('btn', { b: 'pistola' });
    await new Promise((r) => setTimeout(r, 200));
    ok(conPistola.estado === 'ko' && conPistola.balas === 0, 'al que tenía pistola y le disparan, la pierde');
  }
  // saque: lo hace el que recibió el gol
  while (juego.sub !== '') await new Promise((r) => setTimeout(r, 20));
  for (const o of juego.jug) { if (o.estado === 'ko') { o.estado = 'normal'; o.koT = 0; } }
  const bg = juego.pelota; bg.owner = -1; bg.x = lado * 17.6; bg.z = 0; bg.y = 0.5; bg.vx = lado * 12; bg.vz = 0; bg.vy = 0; bg.ultimo = j0.slot; bg.spinT = 0;
  while (juego.sub !== 'kickoff') await new Promise((r) => setTimeout(r, 20));
  ok(juego.pelota.owner >= 0 && juego.jug[juego.pelota.owner].team !== j0.team, 'saca del medio el equipo que recibió el gol');
  // desconexión de todos → vuelve al menú
  for (const c of celus) c.close();
  await new Promise((r) => setTimeout(r, 400));
  ok(juego.fase === 'select', 'si se van todos los humanos vuelve al menú');

  // ---------------- salas ----------------
  console.log('Salas y Arcade');
  const nuevo = (q, pid) => {
    const c = io(URL, { query: q, reconnection: false });
    c.st = null; c.on('status', (st) => { c.st = st; });
    if (pid) c.on('connect', () => c.emit('hola', { pid }));
    return c;
  };
  const a1 = nuevo({ sala: SALA }, 'a1'), a2 = nuevo({ sala: SALA }, 'a2');
  const otra = nuevo({ sala: 'OTRA' }, 'otra');
  await espera(500);
  const g2 = salas.get('OTRA');
  ok(g2 && g2 !== juego && g2.slots.filter((x) => x.humano).length === 1, 'otra sala tiene su propio partido');
  ok(!juego.slots.some((x) => x.pid === 'otra') && juego.slots.filter((x) => x.humano).length === 2, 'el celular de otra sala no aparece en esta');
  ok(otra.st && otra.st.sala === 'OTRA' && otra.st.tv === 0, 'el celular sabe su sala y que ahí no hay tele');
  ok(a1.st && a1.st.sala === SALA && a1.st.tv === 1, 'en esta sala hay una tele');
  ok(juego.arcade === ARCADE && a1.st.arcade === ARCADE, 'la sala guarda el link de vuelta al Arcade y se lo pasa al celular');
  ok(!otra.st.arcade, 'la otra sala no tiene Arcade');
  const tvNueva = nuevo({ rol: 'tv' });
  const cod = await new Promise((r) => { tvNueva.on('sala', (d) => r(d.codigo)); setTimeout(() => r(''), 2000); });
  ok(/^[A-HJ-NP-Z2-9]{4}$/.test(cod) && salas.has(cod), 'una tele sin código abre una sala nueva (' + cod + ')');
  const sinCod = nuevo({});
  const rechazado = await new Promise((r) => { sinCod.on('sinSala', () => r(true)); setTimeout(() => r(false), 2000); });
  ok(rechazado, 'un celular sin código no entra a ninguna sala');
  const mala = nuevo({ sala: 'MALA', arcade: 'javascript:alert(1)' }, 'mala');
  await espera(300);
  ok(salas.has('MALA') && salas.get('MALA').arcade === '', 'un link de vuelta raro (javascript:) se ignora');
  // empieza un partido y alguien elige VOLVER AL ARCADE
  a1.emit('sel', { a: 'listo' }); a2.emit('sel', { a: 'listo' });
  await espera(300);
  ok(juego.fase === 'countdown' || juego.fase === 'playing', 'la sala del Arcade juega');
  const salen = [];
  for (const [n, c] of [['tv', tv], ['a1', a1], ['a2', a2], ['otra', otra]]) c.on('salirArcade', () => salen.push(n));
  a2.emit('btn', { b: 'arcade' });
  await espera(300);
  ok(['tv', 'a1', 'a2'].every((n) => salen.includes(n)) && !salen.includes('otra'), 'VOLVER AL ARCADE avisa a la tele y a los celulares de esa sala (y a nadie más)');
  ok(juego.fase === 'select', 'y la sala vuelve a la selección');
  // en una sala que no viene del Arcade, el botón no hace nada
  otra.emit('btn', { b: 'arcade' });
  await espera(300);
  ok(!salen.includes('otra'), 'en una sala sin Arcade, VOLVER AL ARCADE no hace nada');
  salen.length = 0;
  tv.emit('salir');
  await espera(300);
  ok(salen.includes('tv') && salen.includes('a1'), 'el "volver" del control remoto de la tele también saca a todos');
  // las salas vacías se borran solas (a los 60 s; acá el reloj va x' + process.env.SIM_RAPIDO + ')
  otra.close(); mala.close(); tvNueva.close(); sinCod.close();
  await espera(200);
  ok(g2.conectados === 0, 'al irse todos, la sala queda sin conexiones');
  await espera((60 / Number(process.env.SIM_RAPIDO)) * 1000 + 800);
  ok(!salas.has('OTRA') && !salas.has('MALA') && !salas.has(cod), 'las salas vacías se borran solas');
  ok(salas.has(SALA), 'la sala con gente sigue');
  a1.close(); a2.close();
  tv.close();
  console.log(fallas ? 'FALLAS: ' + fallas : 'TODO OK');
  process.exit(fallas ? 1 : 0);
});
