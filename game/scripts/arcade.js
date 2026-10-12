// Prueba del "cartucho" (ver ARCADE.md): una página que hace de Arcade mete a FABELA en un
// iframe, un celular entra desde el Arcade, otro escribe el código a mano, y todos vuelven.
// Uso: node scripts/arcade.js [carpeta para las capturas]
process.env.PORT = process.env.PORT || '3994';
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(path.join(process.env.NODE_PATH || '/opt/node22/lib/node_modules', 'playwright'))); }
const { server, salas } = require('../server.js');
const URL = 'http://localhost:' + process.env.PORT;
const VUELTA = URL + '/info?vuelta=arcade';          // hace de "mando del Arcade"
const OUT = path.resolve(process.argv[2] || 'capturas');
fs.mkdirSync(OUT, { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let fallas = 0;
const ok = (c, m) => { if (!c) fallas++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };

server.listen(process.env.PORT, async () => {
  const nav = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const errores = [];
  // ---- el "Arcade": FABELA en un iframe a pantalla completa ----
  const arcade = await (await nav.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  arcade.on('pageerror', (e) => errores.push('ARCADE: ' + e.message));
  const msgs = [];
  await arcade.exposeFunction('anotar', (m) => msgs.push(m));
  await arcade.setContent(`<!doctype html><html><body style="margin:0;background:#0b0603;overflow:hidden">
    <iframe id="f" src="${URL}/?q=tv&sala=ARCA&arcade=${encodeURIComponent(VUELTA)}" allow="autoplay; fullscreen"
      style="position:fixed;inset:0;border:0;width:100vw;height:100vh"></iframe>
    <script>addEventListener('message', (e) => anotar(e.data));</script></body></html>`);
  const f0 = Date.now();
  while (!msgs.some((m) => m && m.tipo === 'fabela:lista') && Date.now() - f0 < 30000) await espera(200);
  const lista = msgs.find((m) => m && m.tipo === 'fabela:lista');
  ok(lista && lista.sala === 'ARCA' && lista.version >= 9, 'FABELA avisa al Arcade que está lista: ' + JSON.stringify(lista));

  // ---- celular que viene del Arcade ----
  const ctxC = { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 };
  const c1 = await (await nav.newContext(ctxC)).newPage();
  c1.on('pageerror', (e) => errores.push('C1: ' + e.message));
  await c1.goto(URL + '/c/ARCA?arcade=' + encodeURIComponent(VUELTA));
  await espera(1500);
  const g = salas.get('ARCA');
  ok(g && g.slots.filter((s) => s.humano).length === 1 && g.arcade === VUELTA, 'el celular entra a la sala ARCA');
  ok(await c1.isVisible('#btnArcade'), 'el celular muestra "◀ ARCADE"');
  ok((await c1.textContent('#salaTag')) === 'SALA ARCA', 'el celular muestra la sala');
  await c1.screenshot({ path: path.join(OUT, 'celu-arcade.png') });

  // ---- celular que entra sin código: lo escribe ----
  const c2 = await (await nav.newContext(ctxC)).newPage();
  c2.on('pageerror', (e) => errores.push('C2: ' + e.message));
  await c2.goto(URL + '/c');
  await espera(800);
  ok(await c2.isVisible('#capaSala'), 'sin código, el celular pide el código');
  await c2.fill('#salaInput', 'arca');
  await c2.screenshot({ path: path.join(OUT, 'celu-codigo.png') });
  await c2.tap('#salaOk');
  await espera(1200);
  ok(g.slots.filter((s) => s.humano).length === 2 && c2.url().endsWith('/c/ARCA'), 'con el código escrito entra a la misma sala');
  ok(await c2.isVisible('#btnArcade'), 'y también sabe volver al Arcade (se lo pasa la sala)');
  await espera(1500);
  await arcade.screenshot({ path: path.join(OUT, 'arcade-tv.png') });

  // ---- código equivocado: avisa que no hay tele ----
  const c3 = await (await nav.newContext(ctxC)).newPage();
  await c3.goto(URL + '/c/ZZZZ');
  await espera(7500);
  ok(await c3.isVisible('#sinTele'), 'con un código sin tele avisa y deja cambiarlo');
  await c3.screenshot({ path: path.join(OUT, 'celu-sin-tele.png') });

  // ---- volver al Arcade: dos toques en el celular ----
  await c2.tap('#btnArcade');
  await c2.screenshot({ path: path.join(OUT, 'celu-arcade-confirmar.png') });
  const t0 = Date.now();
  await c1.tap('#btnArcade');
  await c1.tap('#btnArcade');
  console.log('  (entre los dos toques: ' + (Date.now() - t0) + ' ms)');
  await espera(2500);
  ok(msgs.some((m) => m && m.tipo === 'fabela:salir' && m.sala === 'ARCA'), 'la tele le avisa al Arcade: fabela:salir');
  ok(c1.url() === VUELTA && c2.url() === VUELTA, 'los dos celulares vuelven al mando del Arcade');
  // ---- el Arcade cierra FABELA por su cuenta: le avisa con arcade:salir ----
  const c4 = await (await nav.newContext(ctxC)).newPage();
  await c4.goto(URL + '/c/ARCA?arcade=' + encodeURIComponent(VUELTA));
  await espera(1500);
  await arcade.evaluate(() => document.getElementById('f').contentWindow.postMessage({ tipo: 'arcade:salir' }, '*'));
  await espera(2500);
  ok(c4.url() === VUELTA, 'si el Arcade cierra FABELA (arcade:salir), los celulares vuelven solos');
  console.log('mensajes al Arcade:', JSON.stringify(msgs));
  console.log(errores.length ? 'ERRORES:\n' + errores.join('\n') : 'Sin errores de página');
  console.log(fallas ? 'FALLAS: ' + fallas : 'TODO OK');
  await nav.close();
  process.exit(fallas || errores.length ? 1 : 0);
});
