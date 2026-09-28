// Efectos: partículas (pool fijo), textos flotantes pegados al mundo y sacudida de cámara.
import * as THREE from '../../vendor/three.module.min.js';
import { esTV } from './render.js';

function sistema(n, aditivo, tam) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({
    size: tam, vertexColors: true, transparent: true, depthWrite: false,
    blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  const p = [];
  for (let i = 0; i < n; i++) { p.push({ vida: 0, max: 1, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, grav: 0, fr: 0 }); pos[i * 3 + 1] = -99; }
  let cursor = 0;
  return {
    pts,
    emitir(x, y, z, color, cant, vel, opts) {
      opts = opts || {};
      const c = new THREE.Color(color);
      for (let k = 0; k < cant; k++) {
        const q = p[cursor]; cursor = (cursor + 1) % n;
        const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * Math.PI * 0.8;
        const v = vel * (0.4 + Math.random() * 0.6);
        q.x = x + (Math.random() - 0.5) * (opts.disp || 0.2); q.y = y; q.z = z + (Math.random() - 0.5) * (opts.disp || 0.2);
        q.vx = Math.cos(a) * Math.cos(e) * v + (opts.vx || 0);
        q.vy = Math.abs(Math.sin(e)) * v * (opts.arriba !== undefined ? opts.arriba : 1) + (opts.vy || 0);
        q.vz = Math.sin(a) * Math.cos(e) * v + (opts.vz || 0);
        q.max = q.vida = (opts.vida || 0.7) * (0.6 + Math.random() * 0.6);
        const var_ = opts.variar ? (Math.random() - 0.5) * opts.variar : 0;
        q.r = Math.min(1, c.r + var_); q.g = Math.min(1, c.g + var_); q.b = Math.min(1, c.b + var_);
        q.grav = opts.grav !== undefined ? opts.grav : 9;
        q.fr = opts.fr || 0.5;
        if (opts.colores) { const cc = new THREE.Color(opts.colores[(Math.random() * opts.colores.length) | 0]); q.r = cc.r; q.g = cc.g; q.b = cc.b; }
      }
    },
    actualizar(dt) {
      const pa = g.attributes.position.array, ca = g.attributes.color.array;
      for (let i = 0; i < n; i++) {
        const q = p[i];
        if (q.vida <= 0) { if (pa[i * 3 + 1] !== -99) pa[i * 3 + 1] = -99; continue; }
        q.vida -= dt;
        q.vy -= q.grav * dt;
        const k = Math.max(0, 1 - q.fr * dt);
        q.vx *= k; q.vz *= k;
        q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
        if (q.y < 0.03) { q.y = 0.03; q.vy = -q.vy * 0.3; }
        const f = aditivo ? Math.max(0, q.vida / q.max) : 1;
        pa[i * 3] = q.x; pa[i * 3 + 1] = q.vida > 0 ? q.y : -99; pa[i * 3 + 2] = q.z;
        ca[i * 3] = q.r * f; ca[i * 3 + 1] = q.g * f; ca[i * 3 + 2] = q.b * f;
      }
      g.attributes.position.needsUpdate = true;
      g.attributes.color.needsUpdate = true;
    },
  };
}

export function crearEfectos(escena, camara) {
  const chispas = sistema(esTV ? 260 : 700, true, esTV ? 0.28 : 0.22);
  const polvo = sistema(esTV ? 160 : 400, false, esTV ? 0.3 : 0.25);
  escena.add(chispas.pts); escena.add(polvo.pts);

  // Textos flotantes (DOM, movidos por JS: sin animaciones CSS)
  const capa = document.getElementById('flotantes');
  const pool = [];
  for (let i = 0; i < 8; i++) {
    const d = document.createElement('div');
    d.className = 'flot';
    d.style.display = 'none';
    capa.appendChild(d);
    pool.push({ el: d, vida: 0, max: 1, pos: new THREE.Vector3(), color: '#fff', tam: 1 });
  }
  let ip = 0;
  const v = new THREE.Vector3();

  let sacudida = 0;

  return {
    chispas, polvo,
    texto(txt, x, y, z, color, tam) {
      const t = pool[ip]; ip = (ip + 1) % pool.length;
      t.el.textContent = txt;
      t.el.style.color = color || '#fff';
      t.el.style.display = 'block';
      t.vida = t.max = 1.1;
      t.tam = tam || 1;
      t.pos.set(x, y, z);
    },
    sacudir(f) { sacudida = Math.max(sacudida, f); },
    actualizar(dt) {
      chispas.actualizar(dt);
      polvo.actualizar(dt);
      const w = window.innerWidth, h = window.innerHeight;
      for (const t of pool) {
        if (t.vida <= 0) continue;
        t.vida -= dt;
        if (t.vida <= 0) { t.el.style.display = 'none'; continue; }
        const k = 1 - t.vida / t.max;
        v.copy(t.pos); v.y += k * 1.2;
        v.project(camara);
        const esc = t.tam * (k < 0.15 ? 0.5 + (k / 0.15) * 0.7 : 1.2 - (k - 0.15) * 0.25);
        t.el.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * w).toFixed(0) + 'px,' + ((-v.y * 0.5 + 0.5) * h).toFixed(0) + 'px) translate(-50%,-50%) scale(' + esc.toFixed(2) + ')';
        t.el.style.opacity = k > 0.75 ? ((1 - k) / 0.25).toFixed(2) : '1';
      }
    },
    // aplica la sacudida a la cámara (después de posicionarla)
    aplicarSacudida(dt) {
      if (sacudida <= 0.001) return;
      camara.position.x += (Math.random() - 0.5) * sacudida;
      camara.position.y += (Math.random() - 0.5) * sacudida;
      camara.position.z += (Math.random() - 0.5) * sacudida * 0.5;
      sacudida = Math.max(0, sacudida - dt * 2.2);
    },
  };
}
