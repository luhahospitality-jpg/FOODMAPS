# FABELA FOOTBALL

Fútbol callejero **2 vs 2** para jugar en la TV con los celulares como control.
Primero en llegar a **5 goles** gana (tope de 4 minutos; si hay empate, gol de oro).

- **TV**: abrí la URL del juego en el navegador de la TV (Android TV / Xiaomi, Chromecast o una compu).
- **Celulares**: entran a `<url>/c` (o escanean el QR de la TV). No se instala nada.
- De 1 a 4 jugadores: se elige el **bando** (AMARELO: Ronaldinho y Ronaldo · AZUL: Maradona y Neymar). Los lugares que faltan los completa la máquina.
- Se puede entrar en cualquier momento: si el partido ya empezó, entrás en el lugar de un jugador de la máquina.

## Controles del celular (horizontal)

| Control | Acción |
|---|---|
| Joystick (izquierda) | Moverse. **Estirado a fondo y sostenido: correr más rápido** |
| Pad: **tocar** con la pelota | Patear al arco |
| Pad: **mantener** con la pelota | Superchute (se carga; más de ~1 s = ¡fuego!) |
| Pad: **deslizar curvo** con la pelota | Chute con efecto: la pelota dobla con la forma del trazo |
| Pad: **2 toques** sin la pelota | Barrida |
| Pad: **3 toques** sin la pelota | Voadora (patada voladora): deja "tuneado" al rival |
| Pad: mantener sin la pelota | Pique (sprint) |
| FIRULETE | Elástico, pisada, roleta y lambreta (van rotando). Los rivales cerca quedan "humillados" (¡OLÉ!) |
| PASE / PEDIR | Pasarla al compañero / pedírsela |
| PISTOLA | Aparece después de **2 goles seguidos del mismo jugador**. 1 tiro: el rival se desmaya 15 s y reaparece en su arco |

Al hacer un gol, el goleador festeja con su baile (samba, passinho, Paquetá o sarrada) y la cámara hace zoom.
| START (arriba) | El J1 arranca la partida / vuelve al menú |

## Personajes 3D

Los cuatro jugadores se reconstruyeron en 3D a partir de sus fotos (vistas de frente, lado y espalda):
recorte con IA, super-resolución x4 (Real-ESRGAN), silueta + profundidad → volumen → malla por piezas
(cuerpo, brazos y piernas separados para que se muevan sin estirarse), textura proyectada desde las fotos
(la cara sale de la foto grande) y esqueleto a partir de las articulaciones detectadas.
Archivos: `public/assets/pj/<jugador>.bin/.json/.jpg` (`_tv.jpg` en la TV).
Vistas de control: `/?vista=pjq0`…`pjq3` (quietos), `/?vista=baile`.

## Correr local

```bash
cd game
npm install
npm start          # http://localhost:3000  (TV)  y  http://localhost:3000/c  (control)
```

Parámetros de la TV: `?q=tv|med|high` (calidad), `?pr=0.6` (resolución interna), `?debug=1` (fps, draw calls, triángulos).

## Pruebas

```bash
npm run check                       # node --check en todos los .js
npm run sim                         # partidas completas con celulares falsos (socket.io-client)
node scripts/capturas.js capturas   # Chromium sin ventana: capturas de TV y celular + renderer.info
```

## Música, efectos y voces

Música: **"Favela Futebol"** en la intro y el menú (arranca con un pedazo de 12 s que carga al instante y sigue con la canción entera sin corte) y **"Rundo de Capoeira"** en loop durante el partido. Suenan por Web Audio desde que se abre la TV, sin tocar nada. Archivos en `public/assets/music/`. Los efectos son sintetizados.

Voces: desactivadas por ahora (`voices.json` vacío). Los MP3 siguen en `public/assets/voices/`; para reactivarlas, volver a listarlos en `voices.json` (ver `LEEME.txt`).

Vista para revisar personajes: `/?vista=pj`, `/?vista=pj0`…`pj3` (de cerca) y `/?vista=baile`.

## Deploy (Render)

`render.yaml` en la raíz del repo (web service, plan free, `rootDir: game`).
Cada push redeploya. El plan free se duerme: el primer ingreso tarda ~1 minuto.
