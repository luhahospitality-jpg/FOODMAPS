# Super-resolución x4 (Real-ESRGAN x4plus) de todos los recortes
import os, sys, torch, numpy as np
from PIL import Image
from huggingface_hub import hf_hub_download
from spandrel import ModelLoader
from recortes import CAJAS, LOGO
torch.set_num_threads(4)
ruta = hf_hub_download('lllyasviel/Annotators', 'RealESRGAN_x4plus.pth')
modelo = ModelLoader().load_from_file(ruta).eval()
print('modelo', modelo.architecture.name, modelo.scale)
os.makedirs('sr', exist_ok=True)
def subir(img):
    x = torch.from_numpy(np.asarray(img, dtype=np.float32) / 255.).permute(2, 0, 1)[None]
    with torch.no_grad():
        y = modelo(x)
    y = (y[0].permute(1, 2, 0).clamp(0, 1).numpy() * 255 + 0.5).astype(np.uint8)
    return Image.fromarray(y)
trabajos = []
for n, c in CAJAS.items():
    for k, caja in c.items():
        if k == 'img': continue
        trabajos.append((f'{n}_{k}', c['img'], caja))
trabajos.append(('logo', LOGO[0], LOGO[1]))
for nombre, img, caja in trabajos:
    dest = f'sr/{nombre}.png'
    if os.path.exists(dest): continue
    im = Image.open(img).convert('RGB').crop(caja)
    im.save(f'sr/{nombre}_orig.png')
    out = subir(im)
    out.save(dest)
    print(nombre, im.size, '->', out.size, flush=True)
