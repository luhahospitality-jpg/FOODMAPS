# Reconstrucción 3D de los jugadores desde fotos

Herramientas (Python, se corren una sola vez; el juego no las necesita).

1. `recortes.py`: cajas de cada vista (héroe, frente, lado, espalda) en `referencias/img1.jpg` y `img2.jpg`.
2. `sr.py`: super-resolución x4 con Real-ESRGAN (x4plus) → `sr/`.
3. `segmentar.py`: recorte sin fondo (rembg `u2net_human_seg`) + articulaciones (MediaPipe Pose) → `cut/`.
4. `reconstruir.py <jugador>`: silueta de frente + profundidad del lado → volumen por piezas
   (cuerpo, brazos, piernas) → marching cubes → simplificación → UV (xatlas) → textura horneada
   proyectando las fotos (frente desde la foto héroe registrada con `heroe.py`) → pesos de esqueleto.
   Sale `out/<jugador>.bin/.json/.jpg/_tv.jpg` → copiar a `public/assets/pj/`.
5. `previa.py` / `lbs.py`: vistas previas estáticas y con el esqueleto en pose.

Dependencias: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu`,
`pip install spandrel huggingface_hub opencv-contrib-python-headless scipy scikit-image "rembg[cpu]" mediapipe trimesh fast-simplification xatlas pillow`
y los modelos de MediaPipe `pose_landmarker_heavy.task` (en la carpeta de trabajo).
