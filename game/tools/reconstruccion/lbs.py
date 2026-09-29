# Prueba de esqueleto en Python: brazo adelante + codo doblado, pierna adelante
import json, sys, numpy as np
from PIL import Image
from previa import render
n = sys.argv[1] if len(sys.argv) > 1 else 'ronaldinho'
m = json.load(open(f'out/{n}.json')); b = open(f'out/{n}.bin', 'rb').read(); v = m['v']; o = m['ofs']
V = np.frombuffer(b, np.float32, v * 3, o[0]).reshape(-1, 3).astype(np.float64)
N = np.frombuffer(b, np.int8, v * 3, o[1]).reshape(-1, 3).astype(np.float32) / 127
UV = np.frombuffer(b, np.uint16, v * 2, o[2]).reshape(-1, 2).astype(np.float32) / 65535
SI = np.frombuffer(b, np.uint8, v * 4, o[3]).reshape(-1, 4)
SW = np.frombuffer(b, np.uint8, v * 4, o[4]).reshape(-1, 4).astype(np.float64) / 255
I = np.frombuffer(b, np.uint32 if m['i32'] else np.uint16, m['i'], o[5]).reshape(-1, 3).astype(np.int64)
tex = np.asarray(Image.open(f'out/{n}.jpg')).astype(np.float32) / 255
H = m['huesos']
nombres = ['base', 'cadera', 'torso', 'cabeza', 'hombroI', 'codoI', 'hombroD', 'codoD', 'piernaI', 'rodillaI', 'piernaD', 'rodillaD']
padre = {'base': None, 'cadera': 'base', 'torso': 'cadera', 'cabeza': 'torso', 'hombroI': 'torso', 'codoI': 'hombroI', 'hombroD': 'torso', 'codoD': 'hombroD', 'piernaI': 'cadera', 'rodillaI': 'piernaI', 'piernaD': 'cadera', 'rodillaD': 'piernaD'}
def rz(a):
    c, s = np.cos(a), np.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
def rx(a):
    c, s = np.cos(a), np.sin(a); return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
rot = {k: np.eye(3) for k in nombres}
rot['hombroI'] = rz(1.1) @ rx(-0.3); rot['codoI'] = rz(1.3)
rot['hombroD'] = rz(-0.6); rot['piernaI'] = rz(0.7); rot['rodillaI'] = rz(-1.0); rot['piernaD'] = rz(-0.5)
# transformaciones globales
G = {}
for k in nombres:
    pos = np.array(H[k]); p = padre[k]
    if p is None: G[k] = (rot[k], pos - rot[k] @ pos)
    else:
        Rp, tp = G[p]
        R = Rp @ rot[k]
        # punto del hueso se mueve con el padre
        pw = Rp @ pos + tp
        G[k] = (R, pw - R @ pos)
out = np.zeros_like(V)
for q in range(4):
    for kk, k in enumerate(nombres):
        sel = SI[:, q] == kk
        if not sel.any(): continue
        R, t = G[k]
        out[sel] += SW[sel, q:q + 1] * (V[sel] @ R.T + t)
ims = [render(out.astype(np.float32), N, UV, I, tex, a) for a in [0, 0.8, 1.5708]]
Image.fromarray(np.concatenate(ims, 1)).save(f'lbs_{n}.png')
