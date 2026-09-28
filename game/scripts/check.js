// node --check en todos los .js del juego (menos vendor y node_modules)
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const archivos = [];
(function recorrer(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (f === 'node_modules' || f === 'vendor') continue;
    if (fs.statSync(p).isDirectory()) recorrer(p);
    else if (f.endsWith('.js')) archivos.push(p);
  }
})(raiz);
let mal = 0;
for (const a of archivos) {
  try { execFileSync(process.execPath, ['--check', a], { stdio: 'pipe' }); console.log('ok   ' + path.relative(raiz, a)); }
  catch (e) { mal++; console.log('MAL  ' + path.relative(raiz, a) + '\n' + e.stderr); }
}
process.exit(mal ? 1 : 0);
