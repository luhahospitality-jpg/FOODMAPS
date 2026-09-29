// HUD en DOM (barato: sin sombras difusas ni animaciones CSS).
import { PERSONAJES, NOMBRE_EQUIPO, COLOR_EQUIPO } from './modelos.js';

const $ = (id) => document.getElementById(id);
const NIVEL_IMG = ['laje', 'praca', 'praia', 'noturno'];

export function crearHud() {
  const el = {
    hud: $('hud'), gol0: $('gol0'), gol1: $('gol1'), reloj: $('reloj'), aviso: $('aviso'), chips: $('chips'),
    grande: $('grande'), grandeTxt: $('grandeTxt'), grandeSub: $('grandeSub'),
    menu: $('menu'), canchaImg: $('menuCanchaImg'), canchaNom: $('menuCanchaNom'),
    unirse: $('unirse'), url: $('url'), podio: $('podio'), podioTit: $('podioTit'), podioSub: $('podioSub'),
    intro: $('intro'), introTxt: $('introTxt'), debug: $('debug'), version: $('version'),
  };
  const host = location.host;
  el.url.textContent = host + '/c';

  // selección por bandos: cada lugar tiene su jugador fijo (lugares 0 y 2 AMARELO, 1 y 3 AZUL)
  const tarjetas = [];
  const cont = document.querySelectorAll('#bandos .bjug');
  for (const i of [0, 2, 1, 3]) {
    const d = document.createElement('div');
    d.className = 'pjc';
    d.innerHTML = '<div class="base"></div><img alt=""><div class="pnom"></div><div class="papo"></div><div class="quien"></div>';
    cont[i % 2].appendChild(d);
    tarjetas[i] = { d, img: d.querySelector('img'), pnom: d.querySelector('.pnom'), papo: d.querySelector('.papo'), quien: d.querySelector('.quien'), clave: '' };
  }
  // chips del partido
  const chips = [];
  for (let i = 0; i < 4; i++) {
    const d = document.createElement('div');
    d.className = 'chip t' + (i % 2);
    el.chips.appendChild(d);
    chips.push({ d, clave: '' });
  }

  let grandeHasta = 0, avisoHasta = 0;
  let ultimoMarcador = '', ultimoReloj = '';
  let fase = '', enIntro = false;

  const mostrar = (e, v) => { const c = e.className.replace(/\s*oculto/g, ''); e.className = v ? c : c + ' oculto'; };

  return {
    enIntro(v) { enIntro = v; mostrar(el.menu, fase === 'select' && !v); },
    version(v) { el.version.textContent = 'v' + v; },
    fase(f) {
      if (f === fase) return;
      fase = f;
      mostrar(el.menu, f === 'select' && !enIntro);
      mostrar(el.hud, f === 'playing' || f === 'countdown');
      mostrar(el.podio, f === 'finished');
      el.unirse.className = f === 'select' ? '' : 'chico';
      if (f !== 'playing') { el.aviso.textContent = ''; }
    },
    menu(sl, nivel, nombreNivel) {
      if (!sl) return;
      for (let i = 0; i < 4; i++) {
        const s = sl[i], t = tarjetas[i];
        const clave = s.join('|');
        if (clave === t.clave) continue;
        t.clave = clave;
        const pj = PERSONAJES[s[1]];
        const foto = '/assets/img/foto_' + pj.id + '.webp';
        if (t.img.getAttribute('src') !== foto) t.img.setAttribute('src', foto);
        t.pnom.textContent = pj.nombre;
        t.papo.textContent = pj.apodo;
        if (s[0] === 1) { t.quien.textContent = 'J' + (i + 1) + (s[2] ? ' · ¡LISTO!' : ''); t.quien.className = 'quien ' + (s[2] ? 'listo' : 'hum'); }
        else if (s[0] === 2) { t.quien.textContent = 'J' + (i + 1) + ' · volviendo…'; t.quien.className = 'quien hum'; }
        else { t.quien.textContent = 'CPU'; t.quien.className = 'quien'; }
        t.d.className = 'pjc' + (s[0] ? '' : ' cpu');
      }
      const img = '/assets/img/' + NIVEL_IMG[nivel] + '.jpg';
      if (el.canchaImg.getAttribute('src') !== img) el.canchaImg.setAttribute('src', img);
      el.canchaNom.textContent = nombreNivel || '';
    },
    marcador(sc, t, oro) {
      const m = sc[0] + '-' + sc[1];
      if (m !== ultimoMarcador) { ultimoMarcador = m; el.gol0.textContent = sc[0]; el.gol1.textContent = sc[1]; }
      const r = oro ? 'GOL DE OURO' : Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
      if (r !== ultimoReloj) { ultimoReloj = r; el.reloj.textContent = r; el.reloj.className = oro ? 'oro' : ''; }
    },
    chips(ps) {
      if (!ps) return;
      for (const p of ps) {
        const c = chips[p.slot];
        const bot = p.flags & 8;
        const nombre = (bot ? 'CPU' : 'J' + (p.slot + 1));
        let extra = '';
        if (p.anim === 5) extra = '<span class="ko">¡LE DISPARARON! · vuelve en ' + p.ko + 's</span>';
        else if (p.balas > 0) extra = '<span class="poder">PISTOLA x' + p.balas + '</span>';
        else extra = 'GOLES ' + p.goles;
        const clave = nombre + p.ch + extra;
        if (clave === c.clave) continue;
        c.clave = clave;
        c.d.innerHTML = '<img src="/assets/img/cara_' + PERSONAJES[p.ch].id + '.webp" alt=""><div>' + nombre + ' <span class="pj">' + PERSONAJES[p.ch].nombre + '</span><br>' + extra + '</div>';
      }
    },
    grande(txt, sub, dur, color) {
      el.grande.style.display = 'block';
      el.grandeTxt.textContent = txt;
      el.grandeTxt.style.color = color || '#f5c518';
      el.grandeSub.textContent = sub || '';
      grandeHasta = performance.now() + (dur || 1500);
    },
    aviso(txt, dur) { el.aviso.textContent = txt; avisoHasta = performance.now() + (dur || 3000); },
    podio(g, sub) {
      el.podioTit.textContent = '¡GANÓ ' + NOMBRE_EQUIPO[g] + '!';
      el.podioTit.style.color = COLOR_EQUIPO[g];
      el.podioSub.textContent = sub || '';
    },
    intro(txt) {
      if (txt) { mostrar(el.intro, true); el.introTxt.textContent = txt; } else mostrar(el.intro, false);
    },
    // la tarjeta del que eligió bando salta (movido por JS, sin animaciones CSS en la TV)
    saltar(slot) {
      const t = tarjetas[slot]; if (!t) return;
      const pasos = [['scale(1.12) rotate(-3deg)', 0], ['scale(0.95) rotate(2deg)', 110], ['scale(1.05) rotate(-1deg)', 220], ['', 340]];
      for (const [tr, ms] of pasos) setTimeout(() => { t.d.style.transform = tr; }, ms);
    },
    debug(txt) { mostrar(el.debug, true); el.debug.textContent = txt; },
    actualizar(ahora) {
      if (grandeHasta && ahora > grandeHasta) { grandeHasta = 0; el.grande.style.display = 'none'; }
      if (avisoHasta && ahora > avisoHasta) { avisoHasta = 0; el.aviso.textContent = ''; }
    },
  };
}
