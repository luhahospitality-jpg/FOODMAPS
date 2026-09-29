# Vista previa: renderiza la malla texturizada desde varios ángulos (ortográfica)
import sys, json, numpy as np
from PIL import Image
from reconstruir import raster, bilineal
def cargar(n):
    m = json.load(open(f'out/{n}.json')); b = open(f'out/{n}.bin', 'rb').read()
    v = m['v']; o = m['ofs']
    V = np.frombuffer(b, np.float32, v * 3, o[0]).reshape(-1, 3)
    N = np.frombuffer(b, np.int8, v * 3, o[1]).reshape(-1, 3).astype(np.float32) / 127
    UV = np.frombuffer(b, np.uint16, v * 2, o[2]).reshape(-1, 2).astype(np.float32) / 65535
    I = np.frombuffer(b, np.uint32 if m['i32'] else np.uint16, m['i'], o[5]).reshape(-1, 3).astype(np.int64)
    tex = np.asarray(Image.open(f'out/{n}.jpg')).astype(np.float32) / 255
    return V, N, UV, I, tex
def render(V, N, UV, I, tex, ang, W=300, Hh=600, esc=300):
    c, s = np.cos(ang), np.sin(ang)
    # cámara mirando hacia -dir; dir = (cos, 0, sin): ang=0 frente (+x)
    d = np.array([c, 0, s]); r = np.array([-s, 0, c])        # derecha de la pantalla
    u = -(V @ r) * esc + W / 2; v = Hh - 20 - V[:, 1] * esc
    prof = V @ d
    attr = np.concatenate([UV[I], N[I]], 2)
    img, ok, _ = raster(np.stack([u, v], 1)[I], attr, W, Hh, prof[I])
    uvp = img[..., :2][ok]; nn = img[..., 2:][ok]
    col = bilineal(tex, uvp[:, 0] * tex.shape[1], (1 - uvp[:, 1]) * tex.shape[0])
    luz = np.clip(nn @ np.array([0.5, 0.7, 0.5]) / np.linalg.norm([0.5, 0.7, 0.5]), 0, 1) * 0.35 + 0.75
    out = np.full((Hh, W, 3), 0.18, np.float32); out[ok] = col * luz[:, None]
    return (np.clip(out, 0, 1) * 255).astype(np.uint8)
if __name__ == '__main__':
    n = sys.argv[1]
    V, N, UV, I, tex = cargar(n)
    angs = [0, 0.7, 1.5708, 2.4, 3.1416, -1.5708]
    ims = [render(V, N, UV, I, tex, a) for a in angs]
    Image.fromarray(np.concatenate(ims, 1)).save(f'previa_{n}.png')
