# Reconstrucción 3D de un jugador a partir de sus vistas (frente, lado, espalda):
#   silueta frente + profundidad del lado -> volumen -> malla (marching cubes)
#   -> simplificación -> UV (xatlas) -> textura horneada proyectando las fotos
#   -> pesos de esqueleto a partir de las articulaciones detectadas.
# Sistema del modelo: x = adelante, y = arriba, z = costado derecho del jugador.
import json, sys, os, math, struct
import numpy as np, cv2
from PIL import Image
from scipy import ndimage
from scipy.spatial import cKDTree
from skimage import measure
import trimesh, fast_simplification, xatlas
from heroe import registrar

INFO = json.load(open('cut/info.json'))
ALTURAS = {'maradona': 1.68, 'neymar': 1.78, 'ronaldinho': 1.82, 'ronaldo': 1.84}


class Vista:
    """Una foto recortada, normalizada a la altura del jugador."""
    def __init__(self, nombre, H, espejo=False):
        rgba = np.asarray(Image.open(f'cut/{nombre}.png').convert('RGBA'))
        m = np.asarray(Image.open(f'cut/{nombre}_mask.png')) > 127
        info = INFO[nombre]
        pose = info.get('pose', {})
        if espejo:
            rgba = rgba[:, ::-1].copy(); m = m[:, ::-1].copy()
            w = m.shape[1]
            pose = {k: [w - 1 - v[0], v[1], v[2]] for k, v in pose.items()}
        self.rgb = rgba[..., :3].astype(np.float32) / 255.0
        self.m = m
        ys, xs = np.nonzero(m)
        self.top, self.bot = ys.min(), ys.max()
        self.s = H / (self.bot - self.top)          # metros por pixel
        self.H = H
        self.pose = pose
        self.h, self.w = m.shape

    def fila(self, y):
        """fila de la imagen correspondiente a la altura y (metros)."""
        return self.bot - y / self.s

    def y_de(self, v):
        return (self.bot - v) * self.s

    def corridas(self, y):
        v = int(round(self.fila(y)))
        if v < 0 or v >= self.h: return []
        fila = self.m[v]
        d = np.diff(np.concatenate([[0], fila.astype(np.int8), [0]]))
        ini = np.nonzero(d == 1)[0]; fin = np.nonzero(d == -1)[0]
        return list(zip(ini, fin))


def smooth1d(a, s):
    return ndimage.gaussian_filter1d(a, s, mode='nearest')


def reconstruir(nombre, vox=0.0065, caras=14000, atlas=1024, salida='out'):
    H = ALTURAS[nombre]
    F = Vista(f'{nombre}_frente', H)
    B = Vista(f'{nombre}_espalda', H)
    R = Vista(f'{nombre}_ladoD', H)                     # mira a la derecha de la imagen: se ve su lado derecho
    if f'{nombre}_ladoI' in INFO:
        L = Vista(f'{nombre}_ladoI', H)                 # mira a la izquierda: se ve su lado izquierdo
    else:
        L = Vista(f'{nombre}_ladoD', H, espejo=True)    # sin vista izquierda: espejo de la derecha
    # ---- orígenes horizontales ----
    def centro_caderas(V):
        p = V.pose
        return (p['caderaI'][0] + p['caderaD'][0]) / 2
    uF = centro_caderas(F); uB = centro_caderas(B)
    # en las vistas de costado: centro de la profundidad a la altura de la cadera
    def centro_lado(V):
        yc = (F.y_de(F.pose['caderaI'][1]) + F.y_de(F.pose['caderaD'][1])) / 2
        c = V.corridas(yc)
        a = min(x[0] for x in c); b = max(x[1] for x in c)
        return (a + b) / 2
    uR = centro_lado(R); uL = centro_lado(L)
    zF = lambda u: -(u - uF) * F.s      # frente: la derecha del jugador queda a la izquierda de la foto
    zB = lambda u: (u - uB) * B.s
    xR = lambda u: (u - uR) * R.s       # lado derecho: mira hacia la derecha de la foto
    xL = lambda u: -(u - uL) * L.s

    # ---- landmarks ----
    pf = F.pose
    y_cadera = (F.y_de(pf['caderaI'][1]) + F.y_de(pf['caderaD'][1])) / 2
    y_hombro = (F.y_de(pf['hombroI'][1]) + F.y_de(pf['hombroD'][1])) / 2
    # entrepierna: desde abajo, hasta dónde hay aire en el centro
    uc = int(round(uF))
    y_entre = 0.0
    for v in range(F.bot, F.top, -1):
        if not F.m[v, max(0, uc - 1):uc + 2].any():
            y_entre = F.y_de(v)
        elif F.y_de(v) > 0.2 * H:
            break
    y_entre = min(y_entre, y_cadera - 0.03)
    print(nombre, 'H', H, 'cadera', round(y_cadera, 3), 'hombro', round(y_hombro, 3), 'entrepierna', round(y_entre, 3))

    # ---- perfiles de profundidad por altura (lado) ----
    NY = int(H / vox) + 1
    ys = (np.arange(NY) + 0.5) * vox
    xmin = np.zeros(NY); xmax = np.zeros(NY); tiene = np.zeros(NY, bool)
    for j, y in enumerate(ys):
        a = []; b = []
        for V, fx in ((R, xR), (L, xL)):
            c = V.corridas(y)
            if c:
                xs_ = [fx(c0) for c0, c1 in c] + [fx(c1) for c0, c1 in c]
                a.append(min(xs_)); b.append(max(xs_))
        if a:
            xmin[j] = np.mean(a); xmax[j] = np.mean(b); tiene[j] = True
    # rellenar/suavizar
    idx = np.nonzero(tiene)[0]
    xmin = np.interp(np.arange(NY), idx, xmin[idx]); xmax = np.interp(np.arange(NY), idx, xmax[idx])
    xmin = smooth1d(xmin, 1.2); xmax = smooth1d(xmax, 1.2)

    # ---- líneas de brazos y piernas (esqueleto de la foto de frente) ----
    def P(k):
        u, v, _ = pf[k]; return (F.y_de(v), zF(u))
    def linea(pts):
        pts = sorted(pts)                      # por altura
        yy = np.array([p[0] for p in pts]); zz = np.array([p[1] for p in pts])
        return lambda y: float(np.interp(y, yy, zz))
    brazo = {}
    for lado, mp_ in (('I', 'D'), ('D', 'I')):   # lado del juego <- lado de mediapipe (I juego = z>0 = derecha real)
        pts = [P('hombro' + mp_), P('codo' + mp_), P('muneca' + mp_), P('ind' + mp_)]
        brazo[lado] = {'z': linea(pts), 'y0': min(p[0] for p in pts) - 0.03, 'y1': P('hombro' + mp_)[0] + 0.05}
    pierna = {}
    for lado, mp_ in (('I', 'D'), ('D', 'I')):
        pts = [P('cadera' + mp_), P('rodilla' + mp_), P('tobillo' + mp_), P('pie' + mp_)]
        pierna[lado] = linea(pts)
    y_entre = max(y_entre, y_cadera - 0.1 * H / 1.8)       # entrepierna anatómica (shorts anchos no la tapan)
    r_brazo_max = 0.075 * H / 1.8

    # ---- volumen ----
    zlo = min(zF(F.w), zF(0)) - 0.05; zhi = max(zF(F.w), zF(0)) + 0.05
    xlo = xmin.min() - 0.05; xhi = xmax.max() + 0.05
    NZ = int((zhi - zlo) / vox) + 1; NX = int((xhi - xlo) / vox) + 1
    zs = zlo + (np.arange(NZ) + 0.5) * vox
    xs = xlo + (np.arange(NX) + 0.5) * vox
    # 5 piezas separadas: así los brazos y las piernas giran sin "telas" que los unan al cuerpo
    PARTES = ['cuerpo', 'brazoI', 'brazoD', 'piernaI', 'piernaD']
    TIPO = {0: 'cuerpo', 1: 'brazoI', 2: 'brazoD', 3: 'piernaI', 4: 'piernaD'}
    vols = {q: np.zeros((NX, NY, NZ), np.float32) for q in PARTES}
    parte = np.zeros((NY, NZ), np.int8)
    ZZ, XX = np.meshgrid(zs, xs)               # (NX, NZ)
    def elipse(j, za, zb, xc, d, n, tipo):
        hw = (zb - za) / 2; zc = (za + zb) / 2
        if hw < vox * 0.6 or d < vox * 0.6: return
        t = np.abs((ZZ - zc) / hw) ** n + np.abs((XX - xc) / d) ** n
        v = vols[TIPO[tipo]]
        v[:, j, :] = np.maximum(v[:, j, :], (t <= 1.0).astype(np.float32))
    for j, y in enumerate(ys):
        cor = F.corridas(y)
        if not cor: continue
        runs = [tuple(sorted((zF(c0), zF(c1)))) for c0, c1 in cor]
        prof = (xmax[j] - xmin[j]) / 2
        xc = (xmax[j] + xmin[j]) / 2
        usados = [False] * len(runs)
        lim = [min(r[0] for r in runs), max(r[1] for r in runs)]   # límites del torso (se achican con los brazos)
        brazos_fila = []                                            # (z0, z1, tipo) de los brazos en esta fila
        # brazos
        for lado, tipo in (('I', 1), ('D', 2)):
            b = brazo[lado]
            if not (b['y0'] <= y <= b['y1']): continue
            za_ = b['z'](y)
            k = min(range(len(runs)), key=lambda q: 0 if runs[q][0] <= za_ <= runs[q][1] else min(abs(runs[q][0] - za_), abs(runs[q][1] - za_)))
            r0, r1 = runs[k]
            if not (r0 - 0.05 <= za_ <= r1 + 0.05): continue
            contiene_centro = r0 - 0.01 <= 0 <= r1 + 0.01
            if not contiene_centro:
                usados[k] = True
                zc, rr = (r0 + r1) / 2, (r1 - r0) / 2
            else:
                # brazo pegado al cuerpo: su radio = distancia a su borde exterior
                borde = r1 if za_ > 0 else r0
                rr = float(np.clip(abs(borde - za_), 0.028, r_brazo_max))
                zc = borde - np.sign(za_) * rr
                if za_ > 0: lim[1] = min(lim[1], zc - rr * 0.85)
                else: lim[0] = max(lim[0], zc + rr * 0.85)
            rr *= 1.1
            elipse(j, zc - rr, zc + rr, xc - 0.01, min(prof, rr * 1.05), 2.0, tipo)
            brazos_fila.append((zc - rr, zc + rr, tipo))
        def sin_brazos(za, zb):
            # recorta de una corrida (torso/pierna) la parte que ocupa un brazo (mano pegada al short, etc.)
            for a0, a1, _ in brazos_fila:
                if a1 <= za or a0 >= zb: continue
                ac = (a0 + a1) / 2; rr_ = (a1 - a0) / 2
                if ac > (za + zb) / 2: zb = min(zb, a0 + 0.25 * rr_)
                else: za = max(za, a1 - 0.25 * rr_)
            return za, zb
        # resto: torso / piernas / cabeza
        for k, (za, zb) in enumerate(runs):
            if usados[k]: continue
            if y > y_entre:
                if not (za - 0.01 <= 0 <= zb + 0.01) and abs((za + zb) / 2) > 0.1:
                    continue          # restos sueltos (dedos, pliegues): los cubre el brazo
                za, zb = max(za, lim[0]), min(zb, lim[1])
                za, zb = sin_brazos(za, zb)
                n = 2.3 if y < y_hombro + 0.03 else 2.0
                elipse(j, za, zb, xc, prof, n, 0)
                # la parte de arriba de cada pierna se mete dentro de la cadera (queda tapada al girar)
                if y < y_cadera + 0.03:
                    zI = pierna['I'](y); zD = pierna['D'](y); medio = (zI + zD) / 2
                    if za < medio < zb:
                        ladoA = 'D' if zD < zI else 'I'; ladoB = 'I' if ladoA == 'D' else 'D'
                        for a, b_, lado in ((za, medio - vox, ladoA), (medio + vox, zb, ladoB)):
                            elipse(j, a, b_, xc, prof * 0.92, 2.0, 3 if lado == 'I' else 4)
            else:
                zI = pierna['I'](y); zD = pierna['D'](y)
                medio = (zI + zD) / 2
                piezas = []
                if za < medio < zb:     # corrida que abarca las dos piernas: se parte al medio
                    piezas = [(za, medio - vox * 0.7, 'D' if zD < zI else 'I'), (medio + vox * 0.7, zb, 'I' if zI > zD else 'D')]
                else:
                    lado = 'I' if abs((za + zb) / 2 - zI) < abs((za + zb) / 2 - zD) else 'D'
                    piezas = [(za, zb, lado)]
                for a, b_, lado in piezas:
                    a, b_ = sin_brazos(a, b_)
                    hw = (b_ - a) / 2
                    d = prof if y < 0.07 * H else min(prof, max(hw * 1.2, prof * 0.75))
                    elipse(j, a, b_, xc, d, 2.0, 3 if lado == 'I' else 4)
    # una malla por pieza (marching cubes + suavizado + simplificación)
    reparto = {'cuerpo': 0.56, 'brazoI': 0.08, 'brazoD': 0.08, 'piernaI': 0.14, 'piernaD': 0.14}
    mallas = []
    for q in PARTES:
        vq = ndimage.gaussian_filter(vols[q], 1.0)
        if vq.max() < 0.5: continue
        verts, faces, _, _ = measure.marching_cubes(np.pad(vq, 1), 0.5)
        verts = verts - 1
        Pq = np.stack([xlo + (verts[:, 0] + 0.5) * vox, (verts[:, 1] + 0.5) * vox, zlo + (verts[:, 2] + 0.5) * vox], 1)
        mq = trimesh.Trimesh(Pq, faces[:, ::-1], process=True)
        trimesh.smoothing.filter_taubin(mq, lamb=0.5, nu=-0.53, iterations=12)
        meta_caras = int(caras * reparto[q])
        if len(mq.faces) > meta_caras:
            v2, f2 = fast_simplification.simplify(mq.vertices.astype(np.float32), mq.faces.astype(np.int32), target_reduction=1 - meta_caras / len(mq.faces), agg=6)
            mq = trimesh.Trimesh(v2, f2, process=True)
        mq = max(mq.split(only_watertight=False), key=lambda c: len(c.faces))
        trimesh.repair.fix_normals(mq)
        trimesh.smoothing.filter_taubin(mq, lamb=0.4, nu=-0.42, iterations=4)
        mallas.append((q, mq))
        print('  pieza', q, len(mq.faces), 'caras')
    Vs, Fs, Ps = [], [], []
    base = 0
    for q, mq in mallas:
        Vs.append(mq.vertices); Fs.append(mq.faces + base); Ps.append(np.full(len(mq.vertices), PARTES.index(q)))
        base += len(mq.vertices)
    mesh = trimesh.Trimesh(np.concatenate(Vs), np.concatenate(Fs), process=False)
    pieza_v = np.concatenate(Ps)
    print('  total', len(mesh.faces), 'caras', len(mesh.vertices), 'vértices')

    # ---- UV ----
    # la cabeza se agranda SOLO para el desplegado UV: así la cara recibe muchos más texels
    Pv = mesh.vertices.copy()
    y_cue = y_hombro + 0.06 * H / 1.8
    cab = Pv[Pv[:, 1] > y_cue].mean(0)
    t = np.clip((Pv[:, 1] - (y_cue - 0.06)) / 0.09, 0, 1); t = t * t * (3 - 2 * t)
    f = 1 + 1.3 * t
    Pv = cab + (Pv - cab) * f[:, None]
    vmap, ind, uv = xatlas.parametrize(Pv, mesh.faces)
    V = mesh.vertices[vmap].astype(np.float32)
    N = mesh.vertex_normals[vmap].astype(np.float32)
    Fc = ind.astype(np.int64)
    uv = uv.astype(np.float32)
    pieza_uv = pieza_v[vmap]
    print('  uv', len(V), 'vértices con costuras')

    # ---- horneado de textura ----
    # frente: la foto "héroe" registrada (el doble de resolución, caras de verdad)
    esc = 2
    rgb2, m2, _ = registrar(nombre, esc=esc)
    class VT: pass
    Fh = VT(); Fh.rgb = rgb2.astype(np.float32) / 255; Fh.m = m2; Fh.h, Fh.w = m2.shape
    Fh.s = F.s / esc; bot2 = (F.bot + 0.5) * esc - 0.5; uF2 = (uF + 0.5) * esc - 0.5
    Fh.fila = lambda y: bot2 - y / Fh.s
    def zona_brazos(pose, w, h, s_, esc_=1):
        m = np.zeros((h, w), np.uint8)
        r_px = int(round(0.068 * H / 1.8 / s_ * esc_)) + 3
        for mp_ in ('I', 'D'):
            pts = [pose.get(k + mp_) for k in ('hombro', 'codo', 'muneca', 'ind')]
            pts = [(int(p[0] * esc_), int(p[1] * esc_)) for p in pts if p]
            # el hombro no se rechaza (ahí el brazo y el torso se mezclan de verdad)
            for a, b in zip(pts[1:-1], pts[2:]):
                cv2.line(m, a, b, 1, 2 * r_px)
            if len(pts) >= 2:
                a, b = pts[0], pts[1]
                mid = (int(a[0] * 0.4 + b[0] * 0.6), int(a[1] * 0.4 + b[1] * 0.6))
                cv2.line(m, mid, b, 1, 2 * r_px)
            for q in pts[1:]:
                cv2.circle(m, q, r_px, 1, -1)
        return m > 0
    zF_ = zona_brazos(F.pose, Fh.w, Fh.h, F.s, esc)
    zB_ = zona_brazos(B.pose, B.w, B.h, B.s)
    zR_ = zona_brazos(R.pose, R.w, R.h, R.s)
    zL_ = zona_brazos(L.pose, L.w, L.h, L.s)
    tex, cubierto = hornear(V, N, Fc, uv, atlas, [
        (Fh, np.array([1, 0, 0.]), lambda P: (uF2 - P[:, 2] / Fh.s, Fh.fila(P[:, 1])), lambda P: P[:, 0], zF_),
        (B, np.array([-1, 0, 0.]), lambda P: (uB + P[:, 2] / B.s, B.fila(P[:, 1])), lambda P: -P[:, 0], zB_),
        (R, np.array([0, 0, 1.]), lambda P: (uR + P[:, 0] / R.s, R.fila(P[:, 1])), lambda P: P[:, 2], zR_),
        (L, np.array([0, 0, -1.]), lambda P: (uL - P[:, 0] / L.s, L.fila(P[:, 1])), lambda P: -P[:, 2], zL_),
    ], cuello_y=y_hombro + 0.06 * H / 1.8, pieza=pieza_uv)

    # ---- esqueleto y pesos ----
    huesos, pesos_i, pesos_w = esqueleto(V, F, zF, xmin, xmax, ys, y_cadera, y_hombro, y_entre, pieza_uv, zs, H)
    os.makedirs(salida, exist_ok=True)
    guardar(salida, nombre, V, N, uv, Fc, pesos_i, pesos_w, huesos, tex, H)
    return V, Fc, uv, tex


def raster(tri2d, tri_attr, W, Hh, prof=None):
    """Rasteriza triángulos 2D (N,3,2) interpolando atributos (N,3,K).
    Si prof (N,3) está, gana el más cercano (mayor prof). Devuelve (attr W*H*K, ocupado)."""
    K = tri_attr.shape[2]
    out = np.zeros((Hh, W, K), np.float32)
    zbuf = np.full((Hh, W), -1e9, np.float32)
    ok = np.zeros((Hh, W), bool)
    for t in range(len(tri2d)):
        p = tri2d[t]
        x0 = max(int(np.floor(p[:, 0].min())), 0); x1 = min(int(np.ceil(p[:, 0].max())), W - 1)
        y0 = max(int(np.floor(p[:, 1].min())), 0); y1 = min(int(np.ceil(p[:, 1].max())), Hh - 1)
        if x1 < x0 or y1 < y0: continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (cx, cy) = p
        den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(den) < 1e-12: continue
        l1 = ((by - cy) * (gx - cx) + (cx - bx) * (gy - cy)) / den
        l2 = ((cy - ay) * (gx - cx) + (ax - cx) * (gy - cy)) / den
        l3 = 1 - l1 - l2
        e = -1e-4
        dentro = (l1 >= e) & (l2 >= e) & (l3 >= e)
        if not dentro.any(): continue
        a = tri_attr[t]
        val = l1[..., None] * a[0] + l2[..., None] * a[1] + l3[..., None] * a[2]
        sub_out = out[y0:y1 + 1, x0:x1 + 1]; sub_ok = ok[y0:y1 + 1, x0:x1 + 1]
        if prof is not None:
            z = l1 * prof[t, 0] + l2 * prof[t, 1] + l3 * prof[t, 2]
            sub_z = zbuf[y0:y1 + 1, x0:x1 + 1]
            gana = dentro & (z > sub_z)
            sub_z[gana] = z[gana]
        else:
            gana = dentro
        sub_out[gana] = val[gana]
        sub_ok[gana] = True
    return out, ok, zbuf


def bilineal(img, u, v):
    h, w = img.shape[:2]
    u = np.clip(u - 0.5, 0, w - 1.001); v = np.clip(v - 0.5, 0, h - 1.001)
    u0 = u.astype(int); v0 = v.astype(int); fu = (u - u0)[:, None]; fv = (v - v0)[:, None]
    return (img[v0, u0] * (1 - fu) * (1 - fv) + img[v0, u0 + 1] * fu * (1 - fv) +
            img[v0 + 1, u0] * (1 - fu) * fv + img[v0 + 1, u0 + 1] * fu * fv)


def hornear(V, N, Fc, uv, S, vistas, cuello_y=9.9, pieza=None):
    # 1) posición y normal por texel del atlas
    tri_uv = uv[Fc] * np.array([S, S]); tri_uv[..., 1] = S - tri_uv[..., 1]
    pz = (pieza if pieza is not None else np.zeros(len(V))).astype(np.float32)
    attr = np.concatenate([V[Fc], N[Fc], pz[Fc][..., None]], axis=2)
    img, ok, _ = raster(tri_uv, attr, S, S)
    P = img[ok][:, :3]; Nn = img[ok][:, 3:6]
    pzt = np.round(img[ok][:, 6]).astype(int)          # pieza de cada texel (0 cuerpo, 1-2 brazos, 3-4 piernas)
    es_brazo = (pzt == 1) | (pzt == 2)
    Nn /= np.linalg.norm(Nn, axis=1, keepdims=True) + 1e-9
    col = np.zeros((len(P), 3)); peso = np.zeros(len(P))
    pesos_vista = []
    for idx_v, (Vw, d, proy, prof, zona) in enumerate(vistas):
        # z-buffer de la malla vista desde esa cámara
        uu, vv = proy(V)
        tri2d = np.stack([uu, vv], 1)[Fc]
        _, _, zb = raster(tri2d, np.zeros((len(Fc), 3, 1), np.float32), Vw.w, Vw.h, prof(V)[Fc])
        pu, pv = proy(P)
        iu = np.clip(pu.astype(int), 0, Vw.w - 1); iv = np.clip(pv.astype(int), 0, Vw.h - 1)
        visible = prof(P) >= zb[iv, iu] - 0.008
        # máscara achicada: los bordes del recorte traen fondo oscuro
        mer = cv2.erode(Vw.m.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        en_mascara = mer[iv, iu]
        cosang = np.clip(Nn @ d, 0, 1)
        pref = 1.3 if idx_v < 2 else 0.75            # frente/espalda mandan; los costados completan
        w = cosang ** 6 * pref * visible * en_mascara
        # lo que no es brazo no toma color de donde, en la foto, hay un brazo
        w = np.where(~es_brazo & zona[iv, iu], 0, w)
        if idx_v >= 2:
            # la cara de perfil no se pinta sobre la cabeza (evita "dos caras")
            cabeza = P[:, 1] > cuello_y
            w = np.where(cabeza & (np.abs(Nn[:, 0]) > 0.25), w * 0.05, w)
        c = bilineal(Vw.rgb, pu, pv)
        col += c * w[:, None]; peso += w
    buenos = peso > 0.02
    col[buenos] /= peso[buenos, None]
    # lo que ninguna foto ve: color del punto visible más cercano DE LA MISMA PIEZA
    for q in np.unique(pzt):
        sel = pzt == q
        b_ = sel & buenos; m_ = sel & ~buenos
        if m_.any() and b_.any():
            arbol = cKDTree(P[b_])
            _, k = arbol.query(P[m_], k=6)
            col[m_] = col[b_][k].mean(1)
    tex = np.zeros((S, S, 3), np.float32)
    tex[ok] = col
    # relleno de bordes de las islas (evita costuras)
    t8 = (tex * 255).astype(np.uint8)
    hueco = (~ok).astype(np.uint8)
    for _ in range(6):
        dil = cv2.dilate(t8, np.ones((3, 3), np.uint8))
        t8[hueco > 0] = dil[hueco > 0]
        hueco = cv2.erode(hueco, np.ones((3, 3), np.uint8))
    return t8, ok


def esqueleto(V, F, zF, xmin, xmax, ys, y_cad, y_hom, y_ent, parte, zs, H):
    pf = F.pose
    def punto(k):
        u, v, _ = pf[k]
        y = F.y_de(v)
        j = min(max(int(y / (ys[1] - ys[0])), 0), len(ys) - 1)
        return np.array([(xmin[j] + xmax[j]) / 2, y, zF(u)])
    # MediaPipe: 'I' = izquierda del jugador (z negativo en nuestro sistema)
    J = {k: punto(k) for k in ['hombroI', 'hombroD', 'codoI', 'codoD', 'munecaI', 'munecaD', 'caderaI', 'caderaD', 'rodillaI', 'rodillaD', 'tobilloI', 'tobilloD']}
    cad = (J['caderaI'] + J['caderaD']) / 2
    hom = (J['hombroI'] + J['hombroD']) / 2
    cuello = hom + np.array([0, 0.045 * H / 1.8, 0])
    # nombres del juego: 'I' en el juego = z positivo (lado derecho real). Uso: hombroI(juego) = hombroD(mediapipe)
    huesos = {
        'base': [0, 0, 0],
        'cadera': cad.tolist(),
        'torso': (cad + np.array([0, 0.1 * H / 1.8, 0])).tolist(),
        'cabeza': cuello.tolist(),
        'hombroI': J['hombroD'].tolist(), 'codoI': J['codoD'].tolist(),
        'hombroD': J['hombroI'].tolist(), 'codoD': J['codoI'].tolist(),
        'piernaI': J['caderaD'].tolist(), 'rodillaI': J['rodillaD'].tolist(),
        'piernaD': J['caderaI'].tolist(), 'rodillaD': J['rodillaI'].tolist(),
    }
    nombres = ['base', 'cadera', 'torso', 'cabeza', 'hombroI', 'codoI', 'hombroD', 'codoD', 'piernaI', 'rodillaI', 'piernaD', 'rodillaD']
    I = {n: i for i, n in enumerate(nombres)}
    # pieza de cada vértice: 0 cuerpo, 1 brazoI, 2 brazoD, 3 piernaI, 4 piernaD
    pr = parte
    wi = np.zeros((len(V), 4), np.int32); ww = np.zeros((len(V), 4), np.float32)
    def ss(a, b, x):
        t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
    y = V[:, 1]; z = V[:, 2]
    y_rod = (huesos['rodillaI'][1] + huesos['rodillaD'][1]) / 2
    y_codo = (huesos['codoI'][1] + huesos['codoD'][1]) / 2
    y_cue = huesos['cabeza'][1]
    y_tor = huesos['torso'][1]
    for i in range(len(V)):
        p = pr[i]; ws = {}
        if p in (3, 4):          # piernas: muslo / canilla
            lado = 'I' if p == 3 else 'D'
            t = ss(y_rod - 0.04, y_rod + 0.04, y[i])
            ws['rodilla' + lado] = 1 - t; ws['pierna' + lado] = t
        elif p in (1, 2):        # brazos: brazo / antebrazo
            lado = 'I' if p == 1 else 'D'
            t = ss(y_codo - 0.035, y_codo + 0.035, y[i])
            ws['codo' + lado] = 1 - t; ws['hombro' + lado] = t
        else:                    # cuerpo: cadera / torso / cabeza
            tc = ss(y_cue - 0.02, y_cue + 0.05, y[i])
            tt = ss(y_tor - 0.07, y_tor + 0.07, y[i])
            ws['cabeza'] = tc
            ws['torso'] = (1 - tc) * tt
            ws['cadera'] = (1 - tc) * (1 - tt)
        items = sorted(ws.items(), key=lambda kv: -kv[1])[:4]
        tot = sum(v for _, v in items) or 1
        for q, (k, v) in enumerate(items):
            wi[i, q] = I[k]; ww[i, q] = v / tot
    return huesos, wi, ww


def guardar(salida, nombre, V, N, uv, Fc, wi, ww, huesos, tex, H):
    n = len(V)
    Nq = np.clip(np.round(N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-9) * 127), -127, 127).astype(np.int8)
    UVq = np.clip(np.round(uv * 65535), 0, 65535).astype(np.uint16)
    Wq = np.round(ww * 255).astype(np.int32)
    Wq[:, 0] += 255 - Wq.sum(1)
    Wq = np.clip(Wq, 0, 255).astype(np.uint8)
    idx = Fc.astype(np.uint16 if n < 65535 else np.uint32)
    partes = [V.astype(np.float32).tobytes(), Nq.tobytes(), UVq.tobytes(), wi.astype(np.uint8).tobytes(), Wq.tobytes(), idx.tobytes()]
    # alineación a 4 bytes
    buf = b''; ofs = []
    for p in partes:
        while len(buf) % 4: buf += b'\0'
        ofs.append(len(buf)); buf += p
    open(f'{salida}/{nombre}.bin', 'wb').write(buf)
    meta = {'v': n, 'i': int(Fc.size), 'i32': n >= 65535, 'ofs': ofs, 'huesos': huesos, 'altura': H}
    json.dump(meta, open(f'{salida}/{nombre}.json', 'w'))
    Image.fromarray(tex).save(f'{salida}/{nombre}.jpg', quality=88)
    Image.fromarray(tex).resize((tex.shape[1] // 2, tex.shape[0] // 2), Image.LANCZOS).save(f'{salida}/{nombre}_tv.jpg', quality=85)
    print('  guardado', nombre, n, 'vértices', Fc.shape[0], 'triángulos', len(buf) // 1024, 'KB')


if __name__ == '__main__':
    for n in sys.argv[1:] or ['ronaldinho']:
        reconstruir(n)
