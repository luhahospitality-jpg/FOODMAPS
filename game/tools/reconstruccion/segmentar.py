# Recorte sin fondo (u2net_human_seg) + limpieza + pose (MediaPipe) de cada vista
import os, json, numpy as np, cv2
from PIL import Image
from rembg import new_session, remove
import mediapipe as mp
from mediapipe.tasks import python as mpp
from mediapipe.tasks.python import vision
from recortes import CAJAS
os.makedirs('cut', exist_ok=True)
ses = new_session('u2net_human_seg')
pose = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
    base_options=mpp.BaseOptions(model_asset_path='pose_landmarker_heavy.task'), running_mode=vision.RunningMode.IMAGE, num_poses=1))
NOMBRES = ['nariz','ojoI_in','ojoI','ojoI_ex','ojoD_in','ojoD','ojoD_ex','orejaI','orejaD','bocaI','bocaD','hombroI','hombroD','codoI','codoD','munecaI','munecaD','menI','menD','indI','indD','pulI','pulD','caderaI','caderaD','rodillaI','rodillaD','tobilloI','tobilloD','talonI','talonD','pieI','pieD']

def limpiar(m):
    m = (m > 127).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    if n > 1:
        # el componente más grande que toque el centro horizontal
        cx = m.shape[1] / 2
        mejor = max(range(1, n), key=lambda i: st[i, cv2.CC_STAT_AREA] - (0 if st[i, 0] <= cx <= st[i, 0] + st[i, 2] else 1e9))
        m = (lab == mejor).astype(np.uint8)
    # rellenar agujeros
    inv = 1 - m
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(inv, 4)
    for i in range(1, n2):
        x, y, w, h, a = st2[i]
        if x > 0 and y > 0 and x + w < m.shape[1] and y + h < m.shape[0]:
            m[lab2 == i] = 1
    return m

res = {}
for n, c in CAJAS.items():
    for k in c:
        if k == 'img': continue
        nombre = f'{n}_{k}'
        im = Image.open(f'sr/{nombre}.png').convert('RGB')
        alfa = np.asarray(remove(im, session=ses, only_mask=True))
        m = limpiar(alfa)
        # alfa suave para los recortes de la pantalla de selección
        suave = (alfa.astype(np.float32) * m).astype(np.uint8)
        rgba = np.dstack([np.asarray(im), suave])
        Image.fromarray(rgba, 'RGBA').save(f'cut/{nombre}.png')
        Image.fromarray(m * 255).save(f'cut/{nombre}_mask.png')
        ys, xs = np.nonzero(m)
        info = {'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())], 'size': [im.width, im.height]}
        # pose
        rgb = np.asarray(im).copy(); rgb[m == 0] = 20
        r = pose.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
        if r.pose_landmarks:
            lm = r.pose_landmarks[0]
            info['pose'] = {NOMBRES[i]: [round(p.x * im.width, 1), round(p.y * im.height, 1), round(p.visibility, 2)] for i, p in enumerate(lm)}
        res[nombre] = info
        print(nombre, info['bbox'], 'pose' in info, flush=True)
json.dump(res, open('cut/info.json', 'w'), indent=1)
