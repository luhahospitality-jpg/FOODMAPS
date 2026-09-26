import { CHAR_ORDER, CHAR_INFO, game } from './core.js';

const $ = (id) => document.getElementById(id);

// iconos de items que no existen en el moodboard, dibujados con el mismo estilo (contorno oscuro grueso)
const SVG_MUSHROOM = `<svg viewBox="0 0 100 100"><path d="M12 52 C12 22 88 22 88 52 C88 60 12 60 12 52Z" fill="#FF4B5C" stroke="#202030" stroke-width="6" stroke-linejoin="round"/>
<circle cx="34" cy="38" r="8" fill="#FFF8E7"/><circle cx="62" cy="34" r="10" fill="#FFF8E7"/><circle cx="76" cy="48" r="5" fill="#FFF8E7"/>
<path d="M34 56 L32 84 C32 90 68 90 68 84 L66 56Z" fill="#FFF8E7" stroke="#202030" stroke-width="6" stroke-linejoin="round"/>
<circle cx="43" cy="70" r="4" fill="#202030"/><circle cx="57" cy="70" r="4" fill="#202030"/></svg>`;
const SVG_MISSILE = `<svg viewBox="0 0 100 100"><g transform="rotate(-35 50 50)">
<path d="M50 6 C62 18 64 30 64 44 L64 70 L36 70 L36 44 C36 30 38 18 50 6Z" fill="#FFF8E7" stroke="#202030" stroke-width="6" stroke-linejoin="round"/>
<path d="M50 6 C58 14 61 22 62 30 L38 30 C39 22 42 14 50 6Z" fill="#FF4B5C" stroke="#202030" stroke-width="5" stroke-linejoin="round"/>
<path d="M36 56 L22 74 L36 70Z M64 56 L78 74 L64 70Z" fill="#FF4B5C" stroke="#202030" stroke-width="5" stroke-linejoin="round"/>
<path d="M40 72 L50 94 L60 72Z" fill="#FFD93D" stroke="#202030" stroke-width="5" stroke-linejoin="round"/></g></svg>`;
function itemHtml(item) {
  if (item === 'star') return '<img src="/assets/ui/star.png" alt="">';
  if (item === 'mushroom') return SVG_MUSHROOM;
  if (item === 'missile') return SVG_MISSILE;
  return '';
}
const ROLL = ['star', 'mushroom', 'missile'];

const POWER_ICON = { rabbit: 'pw_carrot', gorilla: 'pw_gorilla_banana', princess: 'pw_flower', ice: 'pw_freeze' };

// ---------- pantalla de seleccion ----------
export function initSelect() {
  const cc = $('charCards');
  CHAR_ORDER.forEach((ch) => {
    const info = CHAR_INFO[ch];
    const card = document.createElement('div');
    card.className = 'ccard';
    card.id = 'card-' + ch;
    card.style.background = `linear-gradient(180deg, ${info.card[0]}, ${info.card[1]})`;
    card.innerHTML = `<div class="holders" id="holders-${ch}"></div>
      <img src="/assets/chars/${info.sprite}_right.png" alt="">
      <div class="cname outline">${info.name}</div>
      <div class="cpower outline">${info.power}</div>`;
    cc.appendChild(card);
  });
  $('url').textContent = 'Abre en tu celular: ' + location.origin + '/controller';
}

const TRACK_THUMB = {
  rainbow: "url('/assets/scenery/backdrop_rainbow.jpg')",
  banana: "url('/assets/scenery/backdrop_banana.jpg')",
  space: "url('/assets/scenery/thumb_space.jpg')",
};
const TRACK_PILL = { rainbow: 'var(--violet)', banana: 'var(--green)', space: 'var(--blue)' };
let trackListKey = '';

export function updateSelect() {
  const s = game.state;
  CHAR_ORDER.forEach((ch) => {
    const el = $('holders-' + ch);
    const card = $('card-' + ch);
    const holders = s.players.filter((p) => p && p.character === ch);
    el.innerHTML = holders.map((p) => `<span class="chip outline ${p.confirmed ? 'ok' : ''}" style="background:${p.color}">${p.id}</span>`).join('');
    card.classList.toggle('picked', holders.length > 0);
    card.classList.toggle('confirmed', holders.some((p) => p.confirmed));
  });
  const list = s.trackList || [];
  const k = list.map((t) => t.id).join(',');
  if (k !== trackListKey) {
    trackListKey = k;
    $('trackCards').innerHTML = list.map((t, i) => `<div class="tcard" id="tcard-${i}"><div class="thumb" style="background-image:${TRACK_THUMB[t.theme] || TRACK_THUMB.space}"></div>
      <div class="tname outline" style="background:${TRACK_PILL[t.theme] || 'var(--blue)'}">${t.name}</div></div>`).join('');
  }
  list.forEach((t, i) => { const el = $('tcard-' + i); if (el) el.classList.toggle('active', i === s.trackIndex); });
}

// ---------- HUD por pantalla ----------
const hudEls = {};
let hudKey = '';

export function layoutHud(views) {
  const key = window.innerWidth + 'x' + window.innerHeight + '|' + views.map((v) => v.slot + ':' + v.rect.join(',')).join('|');
  if (key === hudKey) return;
  hudKey = key;
  const root = $('views');
  root.innerHTML = '';
  Object.keys(hudEls).forEach((k) => delete hudEls[k]);
  views.forEach((v) => {
    const [fx, fy, fw, fh] = v.rect;
    const d = document.createElement('div');
    d.className = 'vhud';
    d.style.left = fx * 100 + '%';
    d.style.top = (1 - fy - fh) * 100 + '%';
    d.style.width = fw * 100 + '%';
    d.style.height = fh * 100 + '%';
    const vw = window.innerWidth * fw, vh = window.innerHeight * fh;
    d.style.setProperty('--s', Math.max(0.55, Math.min(1.35, Math.min(vw / 1300, vh / 740))).toFixed(3));
    d.innerHTML = `
      <div class="frost"></div><div class="hitflash"></div>
      <div class="panel p-pos"><div class="lbl outline">POSITION</div><div><span class="big">1</span><span class="of outline">/4</span></div></div>
      <div class="panel p-lap"><div class="lbl outline">LAP</div><div class="val outline">1/3</div></div>
      <div class="panel p-item"></div>
      <div class="panel p-power"><img alt=""><div class="t outline"></div></div>
      <div class="panel p-coins"><img src="/assets/ui/coin.png" alt=""><span class="n outline">0</span><span class="hearts outline"></span></div>
      <div class="panel p-boost outline"><span class="chev">»»</span><span class="bt">BOOST READY</span><span class="chev">»»</span></div>
      <div class="v-banner outline"></div>
      <div class="v-done outline"></div>
      ${views.length > 1 ? '<div class="frame"></div>' : ''}`;
    root.appendChild(d);
    hudEls[v.slot] = {
      root: d, pos: d.querySelector('.p-pos .big'), of: d.querySelector('.p-pos .of'), lap: d.querySelector('.p-lap .val'),
      done: d.querySelector('.v-done'), item: d.querySelector('.p-item'), power: d.querySelector('.p-power'), powerImg: d.querySelector('.p-power img'), powerT: d.querySelector('.p-power .t'),
      coins: d.querySelector('.p-coins .n'), hearts: d.querySelector('.p-coins .hearts'), boost: d.querySelector('.p-boost'), boostT: d.querySelector('.p-boost .bt'),
      banner: d.querySelector('.v-banner'), frost: d.querySelector('.frost'), hit: d.querySelector('.hitflash'),
      last: {}, rollUntil: 0, bannerUntil: 0,
    };
  });
}

export function showHud(on) { $('views').style.display = on ? 'block' : 'none'; }

export function banner(slot, text, ms = 1600, color) {
  const h = hudEls[slot];
  if (!h) return;
  h.banner.textContent = text;
  h.banner.style.color = color || 'var(--yellow)';
  h.banner.classList.add('show');
  h.bannerUntil = performance.now() + ms;
}
export function hitFlash(slot) {
  const h = hudEls[slot];
  if (!h) return;
  h.hit.classList.add('on');
  setTimeout(() => h.hit.classList.remove('on'), 60);
}
export function startItemRoll(slot) {
  const h = hudEls[slot];
  if (h) h.rollUntil = performance.now() + 900;
}

export function updateHud() {
  const s = game.state;
  const now = performance.now();
  const total = s.players.filter((p) => p && !p.spectating).length;
  s.players.forEach((p, slot) => {
    const h = hudEls[slot];
    if (!p || !h) return;
    const L = h.last;
    if (L.place !== p.place || L.total !== total) { h.pos.textContent = p.place || 1; h.of.textContent = '/' + total; L.place = p.place; L.total = total; }
    const lapNow = Math.min((p.lap || 0) + 1, s.laps || 3);
    if (L.lap !== lapNow) { h.lap.textContent = lapNow + '/' + (s.laps || 3); L.lap = lapNow; }
    // ruleta del item (como Mario Kart) antes de mostrar el que te toco
    let itemView = p.item;
    const rolling = now < h.rollUntil && p.item;
    if (rolling) itemView = ROLL[Math.floor(now / 90) % ROLL.length];
    const ik = (itemView || '') + (rolling ? 'r' : '');
    if (L.item !== ik) {
      h.item.innerHTML = itemHtml(itemView);
      h.item.classList.toggle('rolling', !!rolling);
      h.item.classList.toggle('has', !!p.item && !rolling);
      L.item = ik;
    }
    const uses = p.powerUses === undefined ? 2 : p.powerUses;
    const pk = p.character + (p.powerReady ? 'R' : p.powerCooldown) + uses;
    if (L.power !== pk) {
      h.powerImg.src = '/assets/ui/' + POWER_ICON[p.character] + '.png';
      // 2 usos por carrera: se muestra cuantos quedan
      h.powerT.innerHTML = uses <= 0 ? 'SIN<br>POWER' : p.powerReady ? 'POWER<br>×' + uses : 'POWER<br>' + (p.powerCooldown || 0) + 's';
      h.power.classList.toggle('ready', !!p.powerReady);
      h.power.classList.toggle('cool', !p.powerReady);
      L.power = pk;
    }
    const ck = (p.coins || 0) + ':' + p.lives;
    if (L.coins !== ck) {
      h.coins.textContent = '×' + (p.coins || 0);
      h.hearts.innerHTML = '♥'.repeat(p.lives) + '<span class="off">' + '♥'.repeat(Math.max(0, 3 - p.lives)) + '</span>';
      L.coins = ck;
    }
    const bk = p.starActive ? 'A' : p.turbo ? 'T' : p.item === 'star' && !rolling ? 'R' : '';
    if (L.boost !== bk) {
      h.boost.style.display = bk ? 'flex' : 'none';
      h.boost.classList.toggle('active', bk === 'A' || bk === 'T');
      h.boostT.textContent = bk === 'A' ? 'BOOST!' : bk === 'T' ? 'TURBO!' : 'BOOST READY';
      L.boost = bk;
    }
    const frozen = s.ice && s.ice.active && s.ice.ownerId !== p.id && !p.starActive && !p.finished;
    h.frost.classList.toggle('on', !!frozen);
    // ya llego: queda su puesto en grande mientras terminan los demas
    const left = s.players.filter((q) => q && !q.spectating && !q.finished).length;
    const dk = p.finished ? p.finishPlace + ':' + left : '';
    if (L.done !== dk) {
      h.done.classList.toggle('on', !!p.finished);
      if (p.finished) {
        h.done.innerHTML = '<div class="tt">' + (p.finishPlace === 1 ? '¡GANASTE!' : 'FINISH!') + '</div><div class="pl">' + p.finishPlace + 'º</div>'
          + '<div class="sub">' + (left ? 'esperando a los demás · faltan ' + left : '¡llegaron todos!') + '</div>';
        h.banner.classList.remove('show'); h.bannerUntil = 0;
      }
      L.done = dk;
    }
    if (h.bannerUntil && now > h.bannerUntil) { h.banner.classList.remove('show'); h.bannerUntil = 0; }
  });
}

// ---------- cuenta regresiva ----------
let lastCount = null;
export function updateCountdown(show) {
  const el = $('countdown');
  el.style.display = show ? 'flex' : 'none';
  if (!show) { lastCount = null; return; }
  const n = game.state.countdown;
  if (n === lastCount) return;
  lastCount = n;
  const span = $('countdownNum');
  span.textContent = n > 0 ? String(n) : 'GO!';
  span.classList.toggle('go', n <= 0);
  span.classList.remove('pop'); void span.offsetWidth; span.classList.add('pop');
}

export function setSelectVisible(on) { $('select').style.display = on ? 'flex' : 'none'; }
export function setFinishFlash(on) { $('finishFlash').style.display = on ? 'flex' : 'none'; }
export function setPodium(on, text, sub) {
  $('podiumUI').style.display = on ? 'flex' : 'none';
  if (on) { $('podiumWho').textContent = text; $('podiumSub').textContent = sub; }
}
export function setLoading(frac, done) {
  $('loadFill').style.width = Math.round(frac * 100) + '%';
  if (done) { const l = $('loading'); l.style.opacity = '0'; setTimeout(() => { l.style.display = 'none'; }, 600); }
}
export function setQualityBadge(txt) { $('qbadge').textContent = txt; }
