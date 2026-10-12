// Sala de esta tele: cada tele tiene su código y su propio partido (el código va en la URL,
// ?sala=ABCD, así una recarga vuelve a la misma sala). Modo Arcade: FABELA puede abrirse
// dentro de otra web (el Arcade) en un iframe; le avisa con postMessage cuando está lista
// ('fabela:lista') y cuando los jugadores eligen volver ('fabela:salir').
const params = new URLSearchParams(location.search);
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sin 0/O/1/I: fácil de leer y tipear

function codigoAlAzar() {
  let c = '';
  for (let i = 0; i < 4; i++) c += ALFABETO[(Math.random() * ALFABETO.length) | 0];
  return c;
}
function linkSeguro(u) {
  try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; } catch (e) { return ''; }
}

let codigo = (params.get('sala') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
if (!codigo) {
  codigo = codigoAlAzar();
  params.set('sala', codigo);
  try { history.replaceState(null, '', location.pathname + '?' + params.toString() + location.hash); } catch (e) { /* sin historial: no pasa nada */ }
}

export const SALA = codigo;
// link al mando del Arcade: a donde vuelven los celulares al salir
export const ARCADE = linkSeguro(params.get('arcade') || '');
export const EN_ARCADE = params.has('arcade');
export const EN_IFRAME = window.parent !== window;

// Avisa a la página que contiene a FABELA (si está en un iframe)
export function avisarArcade(tipo, datos) {
  if (!EN_IFRAME) return false;
  try { window.parent.postMessage(Object.assign({ tipo, sala: SALA }, datos || {}), '*'); return true; } catch (e) { return false; }
}
