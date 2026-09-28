// Capturas con Chromium sin ventana (Playwright + swiftshader): abre la TV y dos
// celulares, juega y saca fotos de cada pantalla importante. Revisa errores de consola
// y mide renderer.info (draw calls y triángulos).
// Uso: node scripts/capturas.js [carpeta] [calidad]
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(path.join(process.env.NODE_PATH || '/opt/node22/lib/node_modules', 'playwright'))); }

process.env.PORT = process.env.PORT || '3998';
const { server, juego } = require('../server.js');
const URL = 'http://localhost:' + process.env.PORT;
const OUT = path.resolve(process.argv[2] || 'capturas');
const Q = process.argv[3] || 'tv';
const NIVELES = (process.env.NIVELES || '0,1,2,3').split(',').map(Number);
fs.mkdirSync(OUT, { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

server.listen(process.env.PORT, async () => {
  const errores = [];
  const nav = await chromium.launch({
    executablePath: process.env.CHROMIUM || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
  const tv = await (await nav.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  tv.on('console', (m) => { if (m.type() === 'error') errores.push('TV: ' + m.text()); });
  tv.on('pageerror', (e) => errores.push('TV: ' + e.message));
  await tv.goto(URL + '/?q=' + Q + '&debug=1');
  await espera(4500);
  await tv.screenshot({ path: path.join(OUT, '01-intro.png') });

  const celus = [];
  for (let k = 0; k < 2; k++) {
    const ctx = await nav.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.on('console', (m) => { if (m.type() === 'error') errores.push('CEL' + k + ': ' + m.text()); });
    p.on('pageerror', (e) => errores.push('CEL' + k + ': ' + e.message));
    await p.goto(URL + '/c');
    celus.push(p);
  }
  await espera(1500);
  await celus[1].tap('#chSig');
  await espera(1500);
  await tv.screenshot({ path: path.join(OUT, '02-menu.png') });
  await celus[0].screenshot({ path: path.join(OUT, '03-celu-seleccion.png') });

  const infos = {};
  for (let ni = 0; ni < NIVELES.length; ni++) {
    const nivel = NIVELES[ni];
    while (juego.nivel !== nivel) { await celus[0].tap('#nvSig'); await espera(150); }
    await espera(1200);
    for (const c of celus) await c.tap('#btnListo');
    await espera(1300);
    if (ni === 0) {
      await tv.screenshot({ path: path.join(OUT, '04-cuenta.png') });
      await celus[0].screenshot({ path: path.join(OUT, '05-celu-cuenta.png') });
    }
    while (juego.fase !== 'playing') await espera(100);
    await espera(3500);
    await tv.screenshot({ path: path.join(OUT, '06-juego-' + juego.nivel + '.png') });
    infos[nivel] = await tv.evaluate(() => window.__fabela.info());
    if (ni === 0) {
      await celus[0].screenshot({ path: path.join(OUT, '07-celu-juego.png') });
      // gol forzado para ver el festejo
      const j0 = juego.jug[0];
      let b = juego.pelota;
      b.owner = -1; b.x = 17.6; b.z = 0.5; b.y = 0.6; b.vx = 12; b.vz = 0; b.vy = 1; b.ultimo = 0; b.fx = 2; b.spinT = 0;
      await espera(700);
      await tv.screenshot({ path: path.join(OUT, '08-gol.png') });
      await espera(1600);
      await tv.screenshot({ path: path.join(OUT, '08b-baile.png') });
      // segundo gol del mismo → pistola
      while (juego.sub !== '') await espera(50);
      b = juego.pelota;
      b.owner = -1; b.x = 17.6; b.z = 0.5; b.y = 0.6; b.vx = 12; b.vz = 0; b.vy = 1; b.ultimo = 0; b.spinT = 0;
      await espera(400);
      while (juego.sub !== '') await espera(50);
      await espera(300);
      await celus[0].screenshot({ path: path.join(OUT, '09-celu-pistola.png') });
      // disparo: pongo al rival cerca
      const rival = juego.jug[1];
      rival.x = j0.x + 5; rival.z = j0.z;
      await celus[0].tap('#btnPistola');
      await espera(120);
      await tv.screenshot({ path: path.join(OUT, '10-disparo-ko.png') });
      await espera(600);
      await tv.screenshot({ path: path.join(OUT, '10b-ko.png') });
      // el J1 mantiene el pad con la pelota (carga del superchute)
      juego.pelota.owner = 0;
      await celus[0].evaluate(() => {
        const pad = document.getElementById('pad'); const r = pad.getBoundingClientRect();
        pad.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, clientX: r.left + 50, clientY: r.top + 50, bubbles: true }));
      });
      await espera(1000);
      await tv.screenshot({ path: path.join(OUT, '11-carga.png') });
      await celus[0].screenshot({ path: path.join(OUT, '11b-celu-carga.png') });
      await celus[0].evaluate(() => {
        const pad = document.getElementById('pad'); const r = pad.getBoundingClientRect();
        pad.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, clientX: r.left + 50, clientY: r.top + 50, bubbles: true }));
      });
      await espera(250);
      await tv.screenshot({ path: path.join(OUT, '11c-superchute.png') });
      // KO en el celular del rival: el celu 1 es slot 1
      await celus[1].screenshot({ path: path.join(OUT, '12-celu-ko.png') });
    }
    // terminar rápido: goles al equipo 0
    while (juego.fase === 'playing') {
      if (juego.sub === '') {
        const b = juego.pelota;
        b.owner = -1; b.x = 17.6; b.z = 0.5; b.y = 0.6; b.vx = 12; b.vz = 0; b.vy = 1; b.ultimo = 2; b.spinT = 0;
      }
      await espera(200);
    }
    await espera(2500);
    if (ni === 0) {
      await tv.screenshot({ path: path.join(OUT, '13-podio.png') });
      await celus[0].screenshot({ path: path.join(OUT, '14-celu-fin.png') });
    }
    juego.faseT = 0.1;
    while (juego.fase !== 'select') await espera(100);
    await espera(800);
  }
  fs.writeFileSync(path.join(OUT, 'info.json'), JSON.stringify({ calidad: Q, infos, errores }, null, 2));
  console.log('calidad', Q, JSON.stringify(infos));
  console.log(errores.length ? 'ERRORES:\n' + errores.join('\n') : 'Sin errores de consola');
  await nav.close();
  process.exit(errores.length ? 1 : 0);
});
