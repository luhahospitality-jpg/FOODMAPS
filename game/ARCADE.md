# FABELA FOOTBALL como cartucho del Arcade Retro

Guía para quien trabaja en el **Arcade Retro**: la rama `claude/mobile-controller-wasm-arcade-sq1q4q`, con las
páginas `/arcade` (tele) y `/arcade/pad` (mando).

FABELA sigue corriendo en su propio servidor: **https://fabela-football.onrender.com**. El Arcade no copia nada
del juego:
- la tele abre FABELA en un iframe a pantalla completa;
- los mandos se pasan al control de FABELA.

## Cómo se juega

1. En el menú del Arcade aparece la tarjeta **Fabela Football**.
2. Al elegirla, la tele muestra FABELA en un iframe, en una sala con **el mismo código de 4 letras que el Arcade**.
3. Cada mando conectado recibe `{ t: "abrir", url }` y se va al control de FABELA. Lo mismo pasa con los mandos
   que se conecten mientras FABELA está abierto.
4. Para volver, hay dos caminos:
   - en el celular, el botón **◀ ARCADE** (dos toques);
   - en el control remoto de la tele, la tecla "volver" (Escape/Backspace).
5. Al volver, FABELA hace dos cosas:
   - le avisa a la página del Arcade con `postMessage({ tipo: "fabela:salir" })`, y el Arcade saca el iframe y
     vuelve a su menú;
   - manda a todos los celulares de vuelta a `/arcade/pad?room=CODIGO`, donde se reconectan solos.

## El contrato

**Links**

| Qué | Link |
|---|---|
| Base | `https://fabela-football.onrender.com` (conviene leerla de `NEXT_PUBLIC_FABELA_URL`) |
| Tele (iframe) | `${BASE}/?sala=${code}&arcade=${encodeURIComponent(padUrl)}` |
| Mando | `${BASE}/c/${code}?arcade=${encodeURIComponent(padUrl)}` |

`padUrl` es el link al mando del Arcade: `${location.origin}/arcade/pad?room=${code}`. `ArcadeTV` ya lo calcula.

**El iframe**

- Ponerle `allow="autoplay; fullscreen"`, para que suene la música.
- Darle foco cuando carga (`onLoad={(e) => e.currentTarget.focus()}`), así la tecla "volver" del control remoto le
  llega a FABELA.

**Mensajes** (con `window.postMessage`):

| Quién → a quién | Mensaje | Cuándo |
|---|---|---|
| FABELA → Arcade | `{ tipo: "fabela:lista", sala, version }` | Terminó de cargar. |
| FABELA → Arcade | `{ tipo: "fabela:salir", sala }` | Los jugadores eligieron volver. Puede llegar repetido: si ya estás en el menú, ignoralo. |
| Arcade → FABELA | `{ tipo: "arcade:salir" }` | El Arcade cierra FABELA por su cuenta. FABELA manda los celulares de vuelta. **Esperá ~0,5 s antes de sacar el iframe**, para que el aviso salga. |

**Despertador**

El plan gratis de Render se duerme a los 15 minutos sin uso y tarda ~1 minuto en despertar. Para que no se note:
- hacer `fetch(`${BASE}/info`, { mode: "no-cors", cache: "no-store" })` cuando se abre el Arcade;
- repetirlo cada 10 minutos mientras siga abierto.

Igual, mientras no llegue `fabela:lista`, mostrá "CARGANDO FABELA…".

**Ficha**

`GET ${BASE}/arcade.json` responde con CORS y trae:
- nombre, jugadores, descripción y color;
- portada (`/assets/img/portada.jpg`, 1280×720) y logo;
- los links de tele y mando, con `{SALA}` y `{VOLVER}` para reemplazar.

**Jugadores**

FABELA es de 1 a 4 jugadores, pero el Arcade acepta 2 mandos (`MAX_PLAYERS = 2`).
- El 3.º y el 4.º entran escaneando el QR que FABELA muestra en la tele, que ya lleva la sala.
- Si se quiere que entren por el Arcade, hay que subir `MAX_PLAYERS` a 4.

## Cambios en el Arcade

El código que sigue es de referencia: adaptalo a como está escrito el Arcade.

**1. `games/types.ts`**: un juego puede ser propio (`create`) o un cartucho externo (`external`).

```ts
export interface GameDef {
  id: string;
  name: string;
  players: string;
  blurb: string;
  color: string;
  /** Juegos propios del Arcade (canvas 1280×720). */
  create?(host: GameHost): Game;
  /** Cartucho externo: corre en otro servidor y se abre en un iframe. */
  external?: {
    base: string;
    wake: string;
    tv(code: string, back: string): string;
    pad(code: string, back: string): string;
  };
}
```

**2. `games/fabela.ts`** (y sumarlo a `GAMES`). El menú es una grilla de 4×3 que ya está llena: hay que hacerle
lugar, por ejemplo con 4×4 o con 5 columnas.

```ts
import type { GameDef } from "./types";

export const FABELA_URL = process.env.NEXT_PUBLIC_FABELA_URL ?? "https://fabela-football.onrender.com";

export const fabela: GameDef = {
  id: "fabela",
  name: "Fabela Football",
  players: "1–4 jugadores",
  blurb: "Fútbol callejero 2 vs 2 en la favela.",
  color: "#f5c518",
  external: {
    base: FABELA_URL,
    wake: `${FABELA_URL}/info`,
    tv: (code, back) => `${FABELA_URL}/?sala=${code}&arcade=${encodeURIComponent(back)}`,
    pad: (code, back) => `${FABELA_URL}/c/${code}?arcade=${encodeURIComponent(back)}`,
  },
};
```

**3. `protocol.ts`**: un mensaje nuevo de la tele al mando.

```ts
export type TvMessage =
  | { t: "welcome"; player: number }
  | { t: "full" }
  | { t: "rumble"; ms: number }
  | { t: "abrir"; url: string };
```

**4. `ArcadeTV.tsx`**

- El bucle del canvas corre solo para juegos con `create`.
- Al entrar a un cartucho, mandar `{ t: "abrir", url: external.pad(code, padUrl) }` a cada mando conectado.
- En el `connection` de PeerJS, después del `welcome`: si hay un cartucho abierto, mandarle `abrir` también al
  mando nuevo.
- En vez del canvas, mostrar el iframe y escuchar sus mensajes:

```tsx
const frameRef = useRef<HTMLIFrameElement>(null);
const [ready, setReady] = useState(false);
const external = mode === "play" ? GAMES[selected].external : undefined;

useEffect(() => {
  if (!external) return;
  setReady(false);
  const onMessage = (e: MessageEvent) => {
    if (e.source !== frameRef.current?.contentWindow) return;
    const tipo = (e.data as { tipo?: string } | null)?.tipo;
    if (tipo === "fabela:lista") setReady(true);
    if (tipo === "fabela:salir") setMode("menu");
  };
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}, [external]);

// en el render, cuando external:
<iframe
  ref={frameRef}
  src={external.tv(code, padUrl)}
  allow="autoplay; fullscreen"
  className="absolute inset-0 h-full w-full border-0"
  onLoad={(e) => e.currentTarget.focus()}
/>
// + un cartel "CARGANDO FABELA…" mientras !ready
```

- Si el Arcade sale por su cuenta, por ejemplo con su tecla MENÚ, avisar y recién después volver al menú:

```ts
frameRef.current?.contentWindow?.postMessage({ tipo: "arcade:salir" }, "*");
setTimeout(() => setMode("menu"), 500);
```

- Despertador:

```ts
useEffect(() => {
  const wake = () =>
    GAMES.forEach((g) => g.external && fetch(g.external.wake, { mode: "no-cors", cache: "no-store" }).catch(() => {}));
  wake();
  const id = setInterval(wake, 10 * 60 * 1000);
  return () => clearInterval(id);
}, []);
```

**5. `ArcadePad.tsx`**: en `conn.on("data")`, ir al control del cartucho. Solo se aceptan links de FABELA.

```ts
} else if (msg.t === "abrir" && msg.url.startsWith(FABELA_URL + "/")) {
  window.location.href = msg.url;
}
```

## Para probar

- **Contra el server publicado:** abrir `/arcade` en la compu, entrar con el celular, elegir Fabela Football y
  volver con "◀ ARCADE".
- **Con FABELA local:**

  ```bash
  cd game && npm install && PORT=3100 npm start
  ```

  Después, en el Arcade, usar `NEXT_PUBLIC_FABELA_URL=http://localhost:3100`.
- **Prueba automática del lado de FABELA:** `node game/scripts/arcade.js`. Simula un Arcade con un iframe y
  celulares: avisos, códigos y la vuelta.
