# Registra la foto "héroe" (4x más detalle) sobre la vista de frente con flujo óptico
import numpy as np, cv2, json
from PIL import Image
INFO = json.load(open('cut/info.json'))
def cargar(n):
    rgba = np.asarray(Image.open(f'cut/{n}.png').convert('RGBA'))
    m = np.asarray(Image.open(f'cut/{n}_mask.png')) > 127
    return rgba[..., :3], m, INFO[n]
def registrar(nombre, esc=2, debug=False):
    F, mF, iF = cargar(f'{nombre}_frente')
    Hh, mH, iH = cargar(f'{nombre}_hero')
    # alinear por caja: altura de la silueta y centro de caderas
    def caja(m):
        ys, xs = np.nonzero(m); return ys.min(), ys.max()
    t0, b0 = caja(mF); t1, b1 = caja(mH)
    s = (b0 - t0) / (b1 - t1)
    cxF = (iF['pose']['caderaI'][0] + iF['pose']['caderaD'][0]) / 2
    cxH = (iH['pose']['caderaI'][0] + iH['pose']['caderaD'][0]) / 2
    # matriz: punto héroe -> punto frente (a escala 'esc' del frente)
    M = np.array([[s * esc, 0, (cxF - cxH * s) * esc], [0, s * esc, (b0 - b1 * s) * esc]], np.float32)
    W, Hh_ = F.shape[1] * esc, F.shape[0] * esc
    Hs = cv2.warpAffine(Hh, M, (W, Hh_), flags=cv2.INTER_AREA if s * esc < 1 else cv2.INTER_CUBIC)
    mHs = cv2.warpAffine(mH.astype(np.uint8), M, (W, Hh_), flags=cv2.INTER_NEAREST) > 0
    F2 = cv2.resize(F, (W, Hh_), interpolation=cv2.INTER_CUBIC)
    mF2 = cv2.resize(mF.astype(np.uint8), (W, Hh_), interpolation=cv2.INTER_NEAREST) > 0
    # flujo óptico (en escala 1 para que sea robusto), del frente hacia el héroe
    def gris(img, m):
        g = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY).astype(np.float32)
        g[~m] = g[m].mean()
        return cv2.GaussianBlur(g, (0, 0), 1.0).astype(np.uint8)
    a = gris(cv2.resize(F2, (F.shape[1], F.shape[0]), interpolation=cv2.INTER_AREA), mF)
    b = gris(cv2.resize(Hs, (F.shape[1], F.shape[0]), interpolation=cv2.INTER_AREA), cv2.resize(mHs.astype(np.uint8), (F.shape[1], F.shape[0]), interpolation=cv2.INTER_NEAREST) > 0)
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    dis.setFinestScale(0); dis.setPatchSize(12); dis.setVariationalRefinementIterations(8)
    flujo = dis.calc(a, b, None)
    flujo = cv2.GaussianBlur(flujo, (0, 0), 3)
    flujo2 = cv2.resize(flujo, (W, Hh_), interpolation=cv2.INTER_LINEAR) * esc
    gx, gy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(Hh_, dtype=np.float32))
    mapx = gx + flujo2[..., 0]; mapy = gy + flujo2[..., 1]
    Hw = cv2.remap(Hs, mapx, mapy, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    mHw = cv2.remap(mHs.astype(np.uint8), mapx, mapy, cv2.INTER_NEAREST) > 0
    # confianza: parecido de color (suavizado) entre el frente y el héroe registrado
    d = np.abs(cv2.GaussianBlur(Hw.astype(np.float32), (0, 0), 3) - cv2.GaussianBlur(F2.astype(np.float32), (0, 0), 3)).mean(2)
    conf = np.clip(1 - (d - 25) / 35, 0, 1) * mHw * mF2
    # cabeza: alineación rígida (ojos, nariz, boca, orejas) -> la cara no se deforma
    pH, pF = iH['pose'], iF['pose']
    claves = [k for k in ['ojoI', 'ojoD', 'nariz', 'bocaI', 'bocaD', 'orejaI', 'orejaD', 'hombroI', 'hombroD'] if k in pH and k in pF]
    src = np.array([pH[k][:2] for k in claves], np.float32)
    dst = np.array([[pF[k][0] * esc, pF[k][1] * esc] for k in claves], np.float32)
    A, _ = cv2.estimateAffinePartial2D(src, dst, method=cv2.LMEDS)
    Hc = cv2.warpAffine(Hh, A, (W, Hh_), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    mHc = cv2.warpAffine(mH.astype(np.uint8), A, (W, Hh_), flags=cv2.INTER_NEAREST) > 0
    y_hom = min(pF['hombroI'][1], pF['hombroD'][1]) * esc
    y_bar = max(pF['bocaI'][1], pF['bocaD'][1]) * esc
    corte = (y_hom + y_bar) / 2                       # a mitad de camino entre la boca y los hombros
    peso_cab = np.clip((corte - gy) / (0.25 * (y_hom - y_bar) + 1), 0, 1) * mHc * mF2
    peso_cab = cv2.GaussianBlur(peso_cab.astype(np.float32), (0, 0), 2)
    Hw = (Hc * peso_cab[..., None] + Hw * (1 - peso_cab[..., None])).astype(np.uint8)
    conf = np.maximum(conf, peso_cab)
    conf = cv2.GaussianBlur(conf.astype(np.float32), (0, 0), 2)
    out = (Hw * conf[..., None] + F2 * (1 - conf[..., None])).astype(np.uint8)
    if debug:
        Image.fromarray(np.concatenate([F2, Hw, out, (np.dstack([conf] * 3) * 255).astype(np.uint8)], 1)).save(f'reg_{nombre}.png')
    return out, mF2, conf.mean()
if __name__ == '__main__':
    import sys
    for n in sys.argv[1:]:
        o, m, c = registrar(n, debug=True)
        print(n, o.shape, 'confianza media', round(float(c), 3))
