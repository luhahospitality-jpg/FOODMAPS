// FABELA FOOTBALL — TV. Dibuja lo que manda el server; no tiene lógica de juego.
import * as THREE from '../../vendor/three.module.min.js';
import { crearRender, esTV, debug } from './render.js';
import { crearPelota, crearBala, crearPodio, PERSONAJES, COLOR_EQUIPO, NOMBRE_EQUIPO } from './modelos.js';
import { crearJugador, animar } from './personaje.js';
import { crearEscenario } from './escenario.js';
import { crearEfectos } from './efectos.js';
import { crearHud } from './hud.js';
import { crearRed } from './core.js';
import * as audio from './audio.js';

const VERSION = 5;
const NOMBRE_TRUCO = ['', '¡ELÁSTICO!', '¡PISADA!', '¡ROLETA!', '¡LAMBRETA!'];

function cargarFuentes() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const espera = new Promise((r) => setTimeout(r, 2500));
  return Promise.race([Promise.all([document.fonts.load('40px Bangers'), document.fonts.load('40px Marker')]), espera]).catch(() => {});
}

function liberar(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }
    }
  });
}

async function arrancar() {
  await cargarFuentes();
  const canvas = document.getElementById('lienzo');
  const R = crearRender(canvas);
  if (!esTV) document.getElementById('vineta').className = '';   // viñeta solo en PC (en TV nada encima del canvas)
  const cam = R.camara;
  const escena = new THREE.Scene();
  const hud = crearHud();
  hud.version(VERSION);
  const fx = crearEfectos(escena, cam);

  const pelota = crearPelota();
  escena.add(pelota.grupo); escena.add(pelota.sombra);
  const balas = [];
  for (let i = 0; i < 6; i++) { const b = crearBala(); balas.push(b); escena.add(b); }
  const podio = crearPodio();
  escena.add(podio);

  // ---------------- nivel ----------------
  let pmrem = null;
  let escenario = null, nivelId = null, nivelNombre = '', dims = { L: 36, W: 20, gw: 2.4, gh: 2, gd: 1.4 };
  function cargarNivel(n) {
    nivelNombre = n.nombre;
    if (n.id === nivelId) return;
    nivelId = n.id; dims = n;
    if (escenario) { escena.remove(escenario.grupo); liberar(escenario.grupo); }
    escenario = crearEscenario(n.id, n);
    escena.add(escenario.grupo);
    escena.fog = escenario.niebla;
    escena.background = escenario.fondo;
    if (!esTV) {
      // mapa de entorno a partir del cielo: reflejos y luz ambiente realistas (solo PC)
      if (!pmrem) pmrem = new THREE.PMREMGenerator(R.renderer);
      const escCielo = new THREE.Scene();
      escCielo.add(escenario.cielo.clone());
      if (escena.environment) escena.environment.dispose();
      escena.environment = pmrem.fromScene(escCielo, 0.02).texture;
      escena.environmentIntensity = 0.55;
    }
    R.renderer.compile(escena, cam);       // compilar shaders ya, para evitar tirones
  }
  cargarNivel({ id: 'laje', nombre: 'LAJE', L: 36, W: 20, gw: 2.4, gh: 2, gd: 1.4 });
  await R.prepararPost(escena);

  const red = crearRed((n) => cargarNivel(n));

  // ---------------- audio ----------------
  audio.iniciarAudio();
  const avisoAudio = document.getElementById('audioAviso');
  const activarAudio = () => { audio.desbloquear(); };
  window.addEventListener('keydown', (e) => { activarAudio(); saltarIntro(); if (e.key === 'd') debugOn = !debugOn; });
  window.addEventListener('pointerdown', () => { activarAudio(); saltarIntro(); });
  window.addEventListener('touchstart', activarAudio);
  window.addEventListener('click', activarAudio);
  setInterval(() => { avisoAudio.className = audio.audioActivo() ? 'oculto' : ''; }, 1000);

  // ---------------- jugadores ----------------
  const modelos = [];      // por slot
  function modeloDe(slot, ch, team) {
    let m = modelos[slot];
    if (m && m.ch === ch && m.team === team) return m;
    if (m) { escena.remove(m.raiz); }
    m = crearJugador(ch, team);
    m.animSeq = -1; m.animT = 0; m.anim = 0;
    modelos[slot] = m;
    escena.add(m.raiz);
    return m;
  }
  function ocultarJugadores() { for (const m of modelos) if (m) m.raiz.visible = false; }

  // ---------------- estado de la TV ----------------
  let fase = '', faseDesde = 0, tiempo = 0, debugOn = debug;
  let ultimoCd = -1, golAutor = -1, golDesde = 0;
  let ultimaOle = 0, ultimaSamba = -9;
  const pelotaPrev = new THREE.Vector3();
  const camPos = new THREE.Vector3(0, 30, 40), camMira = new THREE.Vector3();
  const camPosObj = new THREE.Vector3(), camMiraObj = new THREE.Vector3();
  const vista = new URLSearchParams(location.search).get('vista');
  let intro = { activa: !vista, t: 0 };
  let ultimoEstado = null, ultimaMuestra = null;
  const quat = new THREE.Quaternion(), eje = new THREE.Vector3();

  function saltarIntro() { if (intro.activa) { intro.activa = false; hud.intro(null); hud.enIntro(!!vista); } }

  const INTRO = [
    '1. RUA. A PELOTA ROLA.',
    '2. JOGADORES CHEGAM.',
    '3. A FAVELA VIVE.',
    '4. FUTEBOL SEM FRONTEIRAS.',
    '5. FABELA FOOTBALL.',
  ];

  function pos(slot) {
    const m = ultimaMuestra;
    if (m && m.p) { const p = m.p.find((q) => q.slot === slot); if (p) return p; }
    return { x: 0, z: 0, y: 0, ch: 0, team: 0 };
  }
  const nombreSlot = (slot) => {
    const p = pos(slot);
    return ((p.flags & 8) ? 'CPU' : 'J' + (slot + 1)) + ' · ' + PERSONAJES[p.ch || 0].nombre;
  };

  // ---------------- eventos del server → efectos, textos y sonidos ----------------
  function manejarEvento(e) {
    const P = e.s !== undefined && e.s >= 0 ? pos(e.s) : null;
    const ex = e.x !== undefined ? e.x / 100 : P ? P.x : 0, ez = e.z !== undefined ? e.z / 100 : P ? P.z : 0;
    switch (e.k) {
      case 'patada':
        audio.sfx.patada(e.p / 100);
        if (e.sup) { fx.texto('¡SUPERCHUTE!', ex, 2.4, ez, '#ff7a1a', 1.2); fx.sacudir(0.35); fx.chispas.emitir(ex, 0.4, ez, '#ff9a2a', 30, 7); }
        else if (e.vol) { fx.texto('¡VOLEA!', ex, 2.4, ez, '#f5c518'); fx.sacudir(0.25); }
        else if (Math.abs(e.c) > 35) { audio.sfx.curva(); fx.texto('¡EFECTO!', ex, 2.4, ez, '#7dd3fc', 0.8); }
        break;
      case 'pase': audio.sfx.pase(); break;
      case 'pide': if (P) fx.texto('¡TOCA!', P.x, 2.6, P.z, '#ffffff', 0.7); break;
      case 'gol': {
        const color = COLOR_EQUIPO[e.t];
        hud.grande('¡GOOOL!', e.own ? 'GOL EN CONTRA' : (e.s >= 0 ? nombreSlot(e.s) : ''), 3000, color);
        audio.sfx.gol();
        fx.sacudir(0.6);
        const gx = (e.t === 0 ? 1 : -1) * dims.L / 2;
        for (let k = 0; k < 4; k++) fx.chispas.emitir(gx, 1.2, (k - 1.5) * 1.2, k % 2 ? color : '#ffffff', esTV ? 18 : 40, 9, { vida: 1.2, grav: 6 });
        fx.polvo.emitir(gx * 0.9, 4, 0, '#ffffff', esTV ? 40 : 100, 6, { vida: 2.5, grav: 2, fr: 1.5, disp: 6, colores: ['#f5c518', '#16a34a', '#2563eb', '#e11d48', '#9333ea', '#ffffff'] });
        if (escenario) escenario.festejar();
        golAutor = e.s; golDesde = tiempo;
        audio.voz([e.s >= 0 ? PERSONAJES[pos(e.s).ch].id + '_gol' : 'x', Math.random() < 0.3 ? 'gol2' : 'gol', 'gol'], 0.25);
        break;
      }
      case 'poder':
        setTimeout(() => {
          hud.grande('¡PISTOLA!', nombreSlot(e.s) + ' · 2 goles seguidos · 1 tiro', 2200, '#ff5a1f');
          audio.sfx.poder();
          const p = pos(e.s);
          fx.chispas.emitir(p.x, 1.5, p.z, '#f5c518', esTV ? 30 : 60, 6, { vida: 1 });
          audio.voz([PERSONAJES[p.ch].id + '_poder']);
        }, 1300);
        break;
      case 'disparo': {
        audio.sfx.pistola();
        audio.voz('shot', 0.05);
        const a = e.a / 100;
        fx.chispas.emitir(ex + Math.cos(a) * 0.8, 1.3, ez + Math.sin(a) * 0.8, '#ffd23a', esTV ? 14 : 28, 5, { vida: 0.3, grav: 0 });
        fx.texto('¡PUM!', ex, 2.8, ez, '#ff5a1f', 1.3);
        fx.sacudir(0.3);
        break;
      }
      case 'ko':
        audio.sfx.ko();
        audio.voz('ko', 0.6);
        fx.texto('¡KO!', ex, 2.4, ez, '#e11d48', 1.4);
        fx.chispas.emitir(ex, 1.2, ez, '#ffe14a', esTV ? 20 : 40, 5, { vida: 0.8 });
        fx.sacudir(0.4);
        hud.aviso(nombreSlot(e.s) + ' DESMAYADO · vuelve en 15 s', 2500);
        break;
      case 'tuneado':
        audio.sfx.tuneado();
        fx.texto('¡TUNEADO!', ex, 2.5, ez, '#a855f7', 1.2);
        fx.chispas.emitir(ex, 1.6, ez, '#ffffff', esTV ? 12 : 24, 5, { vida: 0.5 });
        fx.sacudir(0.3);
        break;
      case 'voadora': audio.sfx.voadora(); if (P) fx.texto('¡VOADORA!', P.x, 2.6, P.z, '#f5c518', 0.9); break;
      case 'barrida': audio.sfx.barrida(); break;
      case 'entrada':
        audio.sfx.entrada();
        fx.texto('¡ENTRADA!', ex, 2.2, ez, '#ffffff', 0.9);
        fx.polvo.emitir(ex, 0.2, ez, '#9a8f80', esTV ? 10 : 22, 3, { vida: 0.7, grav: 1, fr: 2, variar: 0.2 });
        fx.sacudir(0.15);
        break;
      case 'truco':
        audio.sfx.truco();
        if (tiempo - ultimaSamba > 2) { ultimaSamba = tiempo; audio.voz('samba'); }
        if (P) { fx.texto(NOMBRE_TRUCO[e.t] || '¡FIRULETE!', P.x, 2.6, P.z, '#22c55e', 1); fx.chispas.emitir(P.x, 0.4, P.z, '#b9f99d', esTV ? 8 : 16, 3, { vida: 0.5 }); }
        break;
      case 'ole':
        if (tiempo - ultimaOle > 1.5) { audio.sfx.ole(); ultimaOle = tiempo; if (tiempo - ultimaSamba > 1) audio.voz('ole'); }
        if (P) fx.texto('¡OLÉ!', P.x, 2.3, P.z, '#f5c518', 0.9);
        break;
      case 'baile': if (P) fx.texto('¡SAMBA!', P.x, 2.5, P.z, '#f472b6', 0.8); audio.sfx.truco(); if (tiempo - ultimaSamba > 2) { ultimaSamba = tiempo; audio.voz('samba'); } break;
      case 'robo': audio.sfx.robo(); if (P) fx.texto('¡ROBO!', P.x, 2.2, P.z, '#ffffff', 0.7); break;
      case 'pique': audio.sfx.pique(e.f); if (e.f > 8) fx.polvo.emitir(ex, 0.1, ez, '#a09584', 5, 2, { vida: 0.5, grav: 1 }); break;
      case 'pared': case 'rebote': audio.sfx.pared(); break;
      case 'atajada': audio.sfx.entrada(); fx.texto('¡ATAJADA!', ex, 2.4, ez, '#7dd3fc', 1.1); fx.sacudir(0.15); break;
      case 'poste': audio.sfx.poste(); fx.texto('¡PALO!', ex, 2.4, ez, '#ffffff'); fx.sacudir(0.25); break;
      case 'preparados': hud.grande('¡PREPARADOS!', nivelNombre, 1400); audio.tema(null); audio.sfx.preparados(); audio.voz('preparados', 0.2); break;
      case 'go': hud.grande('¡VAMOS!', '', 900, '#22c55e'); audio.sfx.beep(true); audio.acelerar(false); break;
      case 'silbato': audio.sfx.silbato(); break;
      case 'matchpoint': hud.aviso('¡ÚLTIMA BOLA! ' + NOMBRE_EQUIPO[e.t] + ' está a un gol', 4000); audio.sfx.alarma(); audio.acelerar(true); break;
      case 'ultimos': hud.aviso('¡ÚLTIMOS 30 SEGUNDOS!', 3000); audio.sfx.alarma(); audio.acelerar(true); break;
      case 'oro': hud.grande('GOL DE OURO', 'el próximo gol gana', 2500); audio.sfx.alarma(); audio.acelerar(true); break;
      case 'fin': audio.sfx.silbato(true); setTimeout(() => audio.sfx.victoria(), 700); break;
      case 'elige': audio.sfx.click(); audio.voz([PERSONAJES[e.ch].id + '_elige']); break;
      case 'listo': audio.sfx.listo(); break;
      case 'cancha': audio.sfx.click(); break;
      case 'entra': audio.sfx.listo(); saltarIntro(); break;
      case 'respawn': audio.sfx.respawn(); if (P) fx.chispas.emitir(P.x, 1, P.z, COLOR_EQUIPO[P.team], esTV ? 14 : 30, 4, { vida: 0.6 }); break;
      default: break;
    }
  }

  // ---------------- dibujo de jugadores ----------------
  function dibujarJugadores(m, dt, ahora) {
    const vistos = [false, false, false, false];
    if (fase === 'select') {
      const sl = ultimoEstado && ultimoEstado.sl;
      if (sl) for (let i = 0; i < 4; i++) {
        const md = modeloDe(i, sl[i][1], i % 2);
        vistos[i] = true;
        md.raiz.visible = true;
        md.raiz.position.set(-3.3 + i * 2.2, 0, 2);
        md.giro.rotation.y = -Math.PI / 2;
        md.pistola.visible = false;
        const a = vista && vista.indexOf('baile') === 0 ? 9 : sl[i][2] ? 8 : 0;
        if (a !== md.anim) { md.anim = a; md.animT = 0; }
        md.animT += dt;
        animar(md, a, md.animT, 0, dt, a === 9 ? sl[i][1] : 0);
        md.etiqueta.actualizar(sl[i][0] ? 'J' + (i + 1) : 'CPU', i % 2, 0, 0, 0);
      }
    } else if (m.p) {
      for (const p of m.p) {
        const md = modeloDe(p.slot, p.ch, p.team);
        vistos[p.slot] = true;
        md.raiz.visible = (p.flags & 1) ? Math.floor(ahora / 90) % 2 === 0 : true;
        if (p.animSeq !== md.animSeq) { md.animSeq = p.animSeq; md.animT = 0; }
        md.animT += dt;
        md.pistola.visible = p.balas > 0;
        if (fase === 'finished' && ultimoEstado.pod) {
          const idx = ultimoEstado.pod.indexOf(p.slot);
          const lug = podio.userData.lugares[idx];
          md.raiz.position.set(lug.x, lug.y, lug.z);
          md.giro.rotation.y = -Math.PI / 2;
          const gana = p.team === ultimoEstado.g;
          animar(md, gana ? 9 : 0, md.animT + p.slot * 0.3, 0, dt, p.ch);
          md.etiqueta.actualizar((p.flags & 8) ? 'CPU' : 'J' + (p.slot + 1), p.team, 0, 0, 0);
          md.piso.visible = false;
          continue;
        }
        md.piso.visible = true;
        md.raiz.position.set(p.x, p.y, p.z);
        md.giro.rotation.y = -p.face;
        animar(md, p.anim, md.animT, p.vel, dt, p.anim === 9 ? p.ch : p.truco);
        if ((p.flags & 16) && p.vel > 5 && Math.random() < (esTV ? 0.25 : 0.6)) fx.polvo.emitir(p.x, 0.1, p.z, '#9d9282', 1, 1.2, { vida: 0.5, grav: 0.3, variar: 0.1 });
        md.etiqueta.actualizar((p.flags & 8) ? 'CPU' : 'J' + (p.slot + 1), p.team, p.balas, p.carga, p.anim === 5 ? p.ko : 0);
        // polvo en la barrida
        if (p.anim === 2 && md.animT < 0.5 && Math.random() < (esTV ? 0.3 : 0.7)) fx.polvo.emitir(p.x, 0.15, p.z, '#8f8575', 1, 1.5, { vida: 0.6, grav: 0.5, variar: 0.15 });
        if (p.flags & 2 && Math.random() < 0.5) fx.chispas.emitir(p.x + Math.cos(p.face) * 0.6, 0.3, p.z + Math.sin(p.face) * 0.6, p.carga > 80 ? '#ff5a1f' : '#f5c518', 1, 2, { vida: 0.35, grav: -2 });
      }
    }
    for (let i = 0; i < 4; i++) if (!vistos[i] && modelos[i]) modelos[i].raiz.visible = false;
  }

  // ---------------- pelota ----------------
  function dibujarPelota(m, dt, ahora) {
    let b = m.b;
    if (intro.activa && fase === 'select') {
      const k = intro.t;
      b = { x: -14 + k * 5, y: 0.22, z: 2.5, owner: -1, fx: 0 };
    }
    if (!b || fase === 'finished' || (fase === 'select' && !intro.activa)) { pelota.grupo.visible = false; pelota.sombra.visible = false; return; }
    pelota.grupo.visible = true; pelota.sombra.visible = true;
    let y = b.y;
    if (b.owner >= 0) {
      const p = pos(b.owner);
      if (p.vel > 1) y += Math.abs(Math.sin(ahora * 0.012)) * 0.12;
    }
    pelota.grupo.position.set(b.x, y, b.z);
    pelota.sombra.position.set(b.x, 0.04, b.z);
    const esc = Math.max(0.4, 1 - y * 0.12);
    pelota.sombra.scale.set(esc, esc, esc);
    // rodar según el desplazamiento
    const dx = b.x - pelotaPrev.x, dz = b.z - pelotaPrev.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.0001 && d < 3) {
      eje.set(dz, 0, -dx).normalize();
      quat.setFromAxisAngle(eje, d / 0.22);
      pelota.bola.quaternion.premultiply(quat);
    }
    pelotaPrev.set(b.x, y, b.z);
    if (b.fx === 2) { fx.chispas.emitir(b.x, y, b.z, '#ff7a1a', esTV ? 2 : 4, 1.2, { vida: 0.45, grav: -1, disp: 0.3 }); fx.chispas.emitir(b.x, y, b.z, '#ffd23a', 1, 0.8, { vida: 0.3, grav: -1 }); }
    else if (b.fx === 1 && Math.random() < 0.7) fx.chispas.emitir(b.x, y, b.z, '#bfe9ff', 1, 0.3, { vida: 0.4, grav: 0 });
  }

  function dibujarBalas(m) {
    const bl = fase === 'playing' && m.bl ? m.bl : [];
    for (let i = 0; i < balas.length; i++) {
      const b = balas[i];
      if (i < bl.length) {
        b.visible = true;
        b.position.set(bl[i][0] / 100, 1.35, bl[i][1] / 100);
        b.rotation.y = -bl[i][2] / 100;
        if (!esTV) fx.chispas.emitir(b.position.x, 1.35, b.position.z, '#ffe066', 1, 0.2, { vida: 0.15, grav: 0 });
      } else b.visible = false;
    }
  }

  // ---------------- cámara ----------------
  function camara(m, dt) {
    const L = dims.L;
    let suave = 2.5;
    if (intro.activa && fase === 'select') {
      const t = intro.t, k = (t % 2.4) / 2.4, toma = Math.floor(t / 2.4);
      suave = 20;
      if (toma === 0) { const bx = -14 + t * 5; camPosObj.set(bx - 2.5, 0.6, 5.5); camMiraObj.set(bx + 1, 0.3, 2.5); }
      else if (toma === 1) { camPosObj.set(-6 + k * 8, 1.3, 7); camMiraObj.set(-2 + k * 4, 1.3, 2); }
      else if (toma === 2) { camPosObj.set(0, 8 + k * 3, 14); camMiraObj.set(-30 + k * 30, 12, -70); }
      else if (toma === 3) { const a = k * 1.2 - 0.6; camPosObj.set(Math.sin(a) * 42, 26, Math.cos(a) * 34); camMiraObj.set(0, 0, 0); }
      else { camPosObj.set(0, 5, 16); camMiraObj.set(0, 1.5, 0); }
      if (toma !== intro.toma) { intro.toma = toma; camPos.copy(camPosObj); camMira.copy(camMiraObj); if (toma < 5) hud.intro(INTRO[toma]); if (toma === 4) { hud.grande('FABELA FOOTBALL', 'street · skills · people · football · always', 2300); audio.voz('fabela'); } }
      if (toma >= 5) saltarIntro();
    } else if (fase === 'select' && vista) {
      // ?vista=pj : los 4 personajes de cerca (para revisar modelos); ?vista=baile: bailando
      const k = parseInt(vista.slice(-1), 10);
      if (k >= 0 && k < 4) { const x = -3.3 + k * 2.2; camPosObj.set(x + 0.3, 1.5, 4.6); camMiraObj.set(x, 1.1, 2); }
      else { camPosObj.set(0, 1.7, 9.5); camMiraObj.set(0, 1.0, 2); }
      suave = 20;
    } else if (fase === 'select') {
      const a = tiempo * 0.06;
      camPosObj.set(Math.sin(a) * 30, 14, Math.cos(a) * 26 + 4);
      camMiraObj.set(0, 1, 0);
      suave = 1.5;
    } else if (fase === 'countdown') {
      const k = Math.min(1, (tiempo - faseDesde) / 4.2);
      const e = k * k * (3 - 2 * k);
      const a = (1 - e) * 2.4;
      camPosObj.set(Math.sin(a) * (16.5 + (1 - e) * 16), 13.5 + (1 - e) * 12, Math.cos(a) * 16.5);
      camMiraObj.set(0, 0, 0.3);
      suave = 6;
    } else if (fase === 'finished') {
      camPosObj.set(0.8, 2.8, 8.8);
      camMiraObj.set(0.8, 1.5, 0);
      suave = 3;
    } else {
      const b = m.b || { x: 0, z: 0 };
      if (ultimoEstado && ultimoEstado.sub === 'goal' && golAutor >= 0) {
        const p = pos(golAutor);
        if (tiempo - golDesde < 0.8) {
          // primero la pelota en la red…
          const gx = (p.team === 0 ? 1 : -1) * dims.L / 2;
          camPosObj.set(gx * 0.7, 6, 10); camMiraObj.set(gx, 1, 0); suave = 3;
        } else {
          // …y después zoom al baile del goleador
          camPosObj.set(p.x + 0.5, 1.55, p.z + 5.4);
          camMiraObj.set(p.x, 1.4, p.z);
          suave = 5;
        }
      } else {
        const tx = Math.max(-L / 2 + 8.5, Math.min(L / 2 - 8.5, b.x * 0.8));
        const tz = Math.max(-3, Math.min(3, b.z * 0.3));
        camPosObj.set(tx, 13.5, 16.5 + tz);
        camMiraObj.set(tx, 0, 0.3 + tz);
      }
    }
    const k = Math.min(1, dt * suave);
    camPos.lerp(camPosObj, k);
    camMira.lerp(camMiraObj, k);
    cam.position.copy(camPos);
    fx.aplicarSacudida(dt);
    cam.lookAt(camMira);
  }

  // ---------------- bucle ----------------
  let ultimo = performance.now();
  let ultimoDebug = 0;
  function frame(ahora) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ahora - ultimo) / 1000);
    ultimo = ahora;
    tiempo += dt;
    if (intro.activa) { intro.t += dt; }
    const m = red.muestra(ahora) || { s: null, p: null, b: null };
    ultimaMuestra = m;
    const st = m.ult;
    if (st) {
      ultimoEstado = st;
      if (st.f !== fase) {
        fase = st.f; faseDesde = tiempo;
        hud.fase(fase);
        podio.visible = fase === 'finished';
        if (fase === 'select') { audio.tema('menu'); audio.acelerar(false); }
        if (fase === 'finished') {
          audio.tema('podio');
          const mvp = st.pod[0];
          hud.podio(st.g, 'MVP: ' + nombreSlot(mvp) + ' · ' + st.sc[0] + ' - ' + st.sc[1]);
          saltarIntro();
        }
        if (fase !== 'select') saltarIntro();
      }
      if (fase === 'select') hud.menu(st.sl, st.n, nivelNombre);
      if (fase === 'playing' || fase === 'countdown') {
        hud.marcador(st.sc, st.t, st.oro);
        hud.chips(m.p);
      }
      if (st.cd !== ultimoCd) {
        if (st.cd >= 1 && st.cd <= 3) { hud.grande(String(st.cd), '', 900, '#ffffff'); audio.sfx.beep(false); }
        ultimoCd = st.cd;
      }
      if (fase === 'finished' && Math.random() < dt * 4) fx.polvo.emitir((Math.random() - 0.5) * 6, 5, 0, '#ffffff', esTV ? 6 : 14, 2, { vida: 2.5, grav: 1.2, fr: 1, disp: 5, colores: ['#f5c518', '#16a34a', '#2563eb', '#e11d48', '#9333ea'] });
    }
    for (const e of red.eventosListos(ahora)) manejarEvento(e);
    dibujarJugadores(m, dt, ahora);
    dibujarPelota(m, dt, ahora);
    dibujarBalas(m);
    if (escenario) escenario.actualizar(tiempo, dt);
    camara(m, dt);
    fx.actualizar(dt);
    hud.actualizar(ahora);
    R.dibujar(escena, ahora);
    if (debugOn && ahora - ultimoDebug > 500) {
      ultimoDebug = ahora;
      const i = R.info();
      hud.debug('v' + VERSION + ' ' + i.calidad + ' ' + i.fps + 'fps esc ' + i.escala + (i.mitad ? ' 30fps' : '') + '\ncalls ' + i.calls + ' tris ' + i.tris + '\n' + audio.estadoAudio());
    }
  }
  hud.enIntro(intro.activa || !!vista);
  document.getElementById('cargando').style.display = 'none';
  audio.sfx.jingle();
  audio.voz('fabela', 1.3);
  requestAnimationFrame(frame);

  // para las pruebas automáticas
  window.__fabela = { info: () => R.info(), fase: () => fase, saltarIntro, audio: () => audio.medir() };
}

function boot() {
  arrancar().catch((e) => { if (window.__mostrarError) window.__mostrarError(e && (e.stack || e.message) || String(e)); });
}
boot();
