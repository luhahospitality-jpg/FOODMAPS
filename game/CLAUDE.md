# FABELA FOOTBALL: guía para agentes

Juego party de fútbol callejero 2 vs 2: la TV muestra el juego (Three.js) y los celulares son el control.
Todo el juego vive en `game/`. La app Next.js de la raíz del repo (`src/`, `next.config.ts`, `AGENTS.md`)
es otro proyecto y no tiene nada que ver con el juego: no tocarla.

Para jugar y para ver los controles y las reglas, leer `README.md` (en esta carpeta).

## Cómo trabaja el dueño (respetarlo siempre)

- **Todo en español rioplatense**: textos del juego ("tocá", "elegí") y las explicaciones.
- **Cada cambio sube la versión visible**. Está en tres lugares:
  - `VERSION` en `server.js`;
  - `VERSION` en `public/tv/js/main.js`;
  - `#version` en `public/tv/index.html`.

  El celular la toma del server.
- **Después de cada cambio**:
  1. Correr `npm run check` y `npm run sim`.
  2. Sacar capturas: `node scripts/capturas.js <carpeta> tv`.
  3. Hacer commit y push a la rama `claude/tv-celulares-party-game-jyvaby`.
  4. Mostrarle las capturas y explicarle en español qué cambió.
- **Deploy**: Render (https://fabela-football.onrender.com) despliega solo desde esa rama.
  - `render.yaml` en la raíz, con `rootDir: game`.
  - `GET /info` devuelve `{"version": N}`: esperar a que muestre la versión nueva antes de avisar.
  - El plan free se duerme: el primer ingreso tarda ~1 minuto.

## Arquitectura

- **`server.js`**: Express + Socket.IO, autoritativo a 20 ticks/s.
  - Estadísticas de los personajes en `PERSONAJES`.
  - Slots pares = AMARELO (Ronaldinho, Ronaldo); impares = AZUL (Maradona, Neymar).
  - Los huecos los juega la CPU.
  - Los **eventos** viajan en el estado y se podan a los 2 s. Lo que haga falta después va en `juego`
    (por ejemplo `juego.ultimoGolEquipo` para el saque del medio).
- **TV**, en `public/tv/js/`:

  | Archivo | Qué hace |
  |---|---|
  | `main.js` | loop, cámara, fases, vistas de debug |
  | `render.js` | calidad `tv`/`med`/`high`; Lambert en TV, PBR en PC |
  | `escenario.js` | canchas: `laje`, `praca`, `praia`, `noturno` |
  | `props.js` | passistas, paredão de som, barraca de pastel, perros, banderas |
  | `personaje.js` | carga los modelos reconstruidos (`assets/pj`), animación por huesos y bailes de gol |
  | `modelos.js` | utilidades de geometría (`pieza`, `fusionar`, `canvasTex`, …) |
  | `hud.js` | marcador, menú de bandos, avisos |
  | `audio.js` | música y efectos |
  | `efectos.js` | partículas |

- **Celular**: todo en `public/controller/index.html`.
- **Three.js** está vendorizado en `public/vendor/three.module.min.js`: bundle con esbuild que incluye
  `mergeGeometries`, `RoundedBoxGeometry`, `EffectComposer` y `UnrealBloomPass`. Sin CDN.
- **Vistas de debug de la TV**:
  - `?q=tv|med|high` y `?debug=1` (fps, draw calls, triángulos);
  - `?vista=pj0..3` y `pjq0..3` (jugadores de cerca), `baile`;
  - `?vista=props`, `props1`, `props2` (fondo).

## Cosas que ya costaron (no repetir)

- **Música en la TV**: el `<audio>` HTML no suena en el navegador de la TV.
  - La música va por **Web Audio** (`AudioBufferSource`) y arranca sola, sin tocar nada. Es un pedido explícito.
  - Hay una sola canción a la vez (`callarOtras`).
  - Intro y menú: `favela_futebol_ini.mp3` (arranque rápido) y después `favela_futebol_mono.mp3`.
  - Partido: `capoeira_mono.mp3`.
  - La música sintetizada y las voces están **desactivadas a pedido** (`voices.json` = `{}`).
- **Presupuesto de la TV** (calidad `tv`): menos de 100 draw calls y menos de 100k triángulos.
  - En v8 está en ~63–77 calls y ~75–95k triángulos.
  - Lo animado va en mallas con huesos y lo estático se fusiona.
  - Los fps de Chromium sin GPU de las capturas no representan la TV real.
- **Caché**: `html`/`js`/`css`/`json` van con `no-cache`. Las imágenes, mp3 y `.bin` no.
- **Jugadores 3D**: los `.bin`/`.jpg` de `public/assets/pj/` no se editan a mano. Se regeneran con
  `tools/reconstruccion` (ver `LEEME.md`).
  - Los recortes ya están en `tools/reconstruccion/cut/`.
  - Basta con `cd tools/reconstruccion && python3 reconstruir.py <jugador>` y copiar `out/*` a `public/assets/pj/`.
  - El resultado es determinista.

## Estado actual (v8)

Hecho en v8:
- Props brasileños en el fondo.
- Jugadores con textura des-iluminada, normal map de pliegues y costuras fundidas.
- Una sola música por vez.
- Botón de bando con animación, confeti y sello.
- Pistola:
  - el golpe se llama "disparo" y aparece "¡TE DISPARARON!";
  - deja al rival 10 s afuera;
  - si te disparan con la pistola sin usar, la perdés.
- Después de un gol saca del medio el equipo que lo recibió.
- Tiros más suaves:
  - un toque es casi un pase;
  - el gol de lejos necesita carga a fondo;
  - la CPU sigue las mismas reglas.
- Voadora al arco con fuerza suave; la CPU pasa más.

Mejorable o pendiente:
- Quedan manchas oscuras en el borde del short (Maradona, Ronaldo).
- Las passistas son de primitivas (simples).
- Falta medir los fps en la TV real.
