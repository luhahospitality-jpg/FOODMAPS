"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { DataConnection, Peer } from "peerjs";
import {
  normalizeRoomCode,
  peerIdFor,
  peerOptions,
  type Button,
  type PadMessage,
  type TvMessage,
} from "./protocol";

type Status = "idle" | "connecting" | "connected" | "lost" | "not-found" | "full";
type Dir = "up" | "down" | "left" | "right";

const PLAYER_ACCENT = ["#ff7a1a", "#26e6c4"];

function buzz(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Some browsers throw when vibration is blocked; it's only a nicety.
  }
}

export function ArcadePad({ initialRoom }: { initialRoom: string }) {
  const [room, setRoom] = useState(initialRoom);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [player, setPlayer] = useState<number | null>(null);
  const [pressed, setPressed] = useState<Set<Button>>(new Set());

  const connRef = useRef<DataConnection | null>(null);
  const pressedRef = useRef<Set<Button>>(new Set());

  // Connect (and keep reconnecting) to the TV for the chosen room.
  useEffect(() => {
    if (!room) return;
    let peer: Peer | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    async function connect() {
      const { Peer } = await import("peerjs");
      if (cancelled) return;
      setStatus("connecting");
      peer?.destroy();
      const p = new Peer(peerOptions());
      peer = p;
      const scheduleRetry = () => {
        if (cancelled) return;
        clearTimeout(retry);
        retry = setTimeout(connect, 2000);
      };

      p.on("open", () => {
        const conn = p.connect(peerIdFor(room), { serialization: "json", reliable: true });
        conn.on("open", () => {
          connRef.current = conn;
          conn.send({ t: "hello" } satisfies PadMessage);
        });
        conn.on("data", (raw) => {
          const msg = raw as TvMessage;
          if (msg.t === "welcome") {
            setPlayer(msg.player);
            setStatus("connected");
            buzz(60);
          } else if (msg.t === "full") {
            cancelled = true;
            setStatus("full");
          } else if (msg.t === "rumble") {
            buzz(msg.ms);
          }
        });
        conn.on("close", () => {
          if (connRef.current === conn) connRef.current = null;
          if (cancelled) return;
          setStatus("lost");
          scheduleRetry();
        });
      });

      p.on("error", (err) => {
        if (cancelled) return;
        if (err.type === "peer-unavailable") {
          setStatus("not-found");
        } else {
          setStatus("lost");
        }
        scheduleRetry();
      });
    }

    connect();
    return () => {
      cancelled = true;
      clearTimeout(retry);
      connRef.current = null;
      peer?.destroy();
    };
  }, [room]);

  // Keep the phone screen awake while playing.
  useEffect(() => {
    if (status !== "connected" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = () =>
      navigator.wakeLock
        .request("screen")
        .then((l) => (lock = l))
        .catch(() => {});
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [status]);

  const setButton = useCallback((button: Button, down: boolean) => {
    const set = pressedRef.current;
    if (set.has(button) === down) return;
    if (down) {
      set.add(button);
      buzz(12);
    } else {
      set.delete(button);
    }
    setPressed(new Set(set));
    const conn = connRef.current;
    if (conn?.open) conn.send({ t: "btn", b: button, d: down } satisfies PadMessage);
  }, []);

  if (!room || status === "full") {
    return (
      <Shell>
        <form
          className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 px-6 text-center"
          onSubmit={(e) => {
            e.preventDefault();
            const code = normalizeRoomCode(draft);
            if (code.length === 4) {
              setStatus("idle");
              setRoom(code);
            }
          }}
        >
          <h1 className="font-retro sunset-text text-5xl uppercase leading-none">
            Arcade <span className="glow">Retro</span>
          </h1>
          {status === "full" ? (
            <p className="text-[var(--retro-red)]">Ya hay 2 mandos conectados a esa tele.</p>
          ) : (
            <p className="font-term text-2xl opacity-80">
              Abre <b className="text-[var(--retro-orange)]">/arcade</b> en el navegador de la tele y escribe aquí el código que aparece.
            </p>
          )}
          <input
            value={draft}
            onChange={(e) => setDraft(normalizeRoomCode(e.target.value))}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ABCD"
            className="font-retro w-56 rounded-lg border-4 border-[#ff7a1a80] bg-transparent py-3 text-center text-5xl tracking-[0.2em] text-[var(--retro-yellow)] outline-none placeholder:text-[#ffe9cf26] focus:border-[var(--retro-orange)] focus:shadow-[0_0_20px_#ff7a1a88]"
          />
          <button
            type="submit"
            disabled={draft.length !== 4}
            className="font-retro rounded-lg bg-[var(--retro-orange)] px-8 py-3 text-xl uppercase text-[var(--retro-bg)] shadow-[0_0_20px_#ff7a1a88] disabled:opacity-40 disabled:shadow-none"
          >
            Conectar
          </button>
        </form>
      </Shell>
    );
  }

  const accent = player !== null ? PLAYER_ACCENT[player] : "#f2ecdc";

  return (
    <Shell>
      <div className="absolute inset-0 z-10 hidden flex-col items-center justify-center gap-4 bg-[var(--retro-bg)] px-8 text-center portrait:flex">
        <p className="text-6xl text-[var(--retro-orange)]">⟳</p>
        <p className="font-retro glow text-3xl uppercase">Gira el móvil</p>
        <p className="font-term text-2xl opacity-70">El mando se usa en horizontal.</p>
      </div>
      <div className="flex h-full w-full items-stretch justify-between gap-[3vmin] px-[5vmin] py-[4vmin]">
        <div className="flex flex-1 items-center justify-center">
          <DPad pressed={pressed} onChange={setButton} />
        </div>

        <div className="flex flex-col items-center justify-between py-[2vmin] text-center">
          <div>
            <p className="font-retro text-[9vmin] leading-none" style={{ color: accent, textShadow: `0 0 2vmin ${accent}` }}>
              {player !== null ? `J${player + 1}` : "··"}
            </p>
            <StatusLine status={status} room={room} />
          </div>
          <div className="flex gap-[3vmin]">
            <PillButton label="Menú" button="menu" pressed={pressed} onChange={setButton} />
            <PillButton label="Start" button="start" pressed={pressed} onChange={setButton} />
          </div>
          <button
            type="button"
            onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
            className="font-term text-[4vmin] uppercase opacity-50"
          >
            ⤢ Pantalla completa
          </button>
        </div>

        <div className="relative flex-1">
          <RoundButton
            label="B"
            button="b"
            color="#ff3d2e"
            className="absolute bottom-[12%] left-[8%]"
            pressed={pressed}
            onChange={setButton}
          />
          <RoundButton
            label="A"
            button="a"
            color="#ff7a1a"
            className="absolute right-[8%] top-[12%]"
            pressed={pressed}
            onChange={setButton}
          />
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="crt fixed inset-0 flex items-center overflow-hidden bg-[var(--retro-bg)] text-[var(--retro-ink)] select-none"
      style={{ touchAction: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}

function StatusLine({ status, room }: { status: Status; room: string }) {
  const text: Record<Status, string> = {
    idle: "",
    connecting: `Conectando a ${room}…`,
    connected: `Sala ${room}`,
    lost: "Reconectando…",
    "not-found": `No encuentro la sala ${room}. ¿Está abierta /arcade en la tele?`,
    full: "",
  };
  return (
    <p
      className={`font-term mt-[1vmin] max-w-[38vmin] text-[3.6vmin] leading-none ${
        status === "connected" ? "opacity-60" : "text-[var(--retro-amber)]"
      }`}
    >
      {text[status]}
    </p>
  );
}

type ButtonProps = {
  button: Button;
  pressed: Set<Button>;
  onChange: (button: Button, down: boolean) => void;
};

function useHold(button: Button, onChange: ButtonProps["onChange"]) {
  return {
    onPointerDown: (e: PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      onChange(button, true);
    },
    onPointerUp: () => onChange(button, false),
    onPointerCancel: () => onChange(button, false),
    onLostPointerCapture: () => onChange(button, false),
  };
}

function RoundButton({
  label,
  color,
  className,
  ...props
}: ButtonProps & { label: string; color: string; className: string }) {
  const down = props.pressed.has(props.button);
  return (
    <div
      {...useHold(props.button, props.onChange)}
      className={`flex h-[30vmin] w-[30vmin] items-center justify-center font-retro rounded-full text-[11vmin] text-[var(--retro-bg)] transition-transform ${className}`}
      style={{
        background: color,
        transform: down ? "scale(0.92)" : undefined,
        boxShadow: down ? `0 0 4vmin ${color}` : `0 1.2vmin 0 rgba(0,0,0,0.6), 0 0 2vmin ${color}66`,
      }}
    >
      {label}
    </div>
  );
}

function PillButton({ label, ...props }: ButtonProps & { label: string }) {
  const down = props.pressed.has(props.button);
  return (
    <div
      {...useHold(props.button, props.onChange)}
      className={`font-term rounded-md border-[0.6vmin] border-[#ff7a1a99] px-[4vmin] py-[1.4vmin] text-[4.4vmin] uppercase leading-none ${
        down ? "bg-[var(--retro-orange)] text-[var(--retro-bg)]" : "text-[var(--retro-amber)]"
      }`}
    >
      {label}
    </div>
  );
}

// One touch surface for the cross so thumbs can roll between directions (and diagonals)
// without lifting, which separate buttons can't do.
function DPad({
  pressed,
  onChange,
}: {
  pressed: Set<Button>;
  onChange: (button: Button, down: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Set<Dir>>());

  const sync = () => {
    const active = new Set<Dir>();
    pointers.current.forEach((dirs) => dirs.forEach((d) => active.add(d)));
    (["up", "down", "left", "right"] as Dir[]).forEach((d) => onChange(d, active.has(d)));
  };

  const track = (e: PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const dirs = new Set<Dir>();
    if (Math.hypot(dx, dy) > rect.width * 0.12) {
      // 8 sectors of 45°: pure directions get 45° each, diagonals press two.
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle > -157.5 && angle < -22.5) dirs.add("up");
      if (angle > 22.5 && angle < 157.5) dirs.add("down");
      if (angle > 112.5 || angle < -112.5) dirs.add("left");
      if (angle > -67.5 && angle < 67.5) dirs.add("right");
    }
    pointers.current.set(e.pointerId, dirs);
    sync();
  };

  const release = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    sync();
  };

  const arm = "absolute flex items-center justify-center bg-[#ff7a1a26] text-[5vmin]";
  const lit = (d: Dir) =>
    pressed.has(d) ? "!bg-[var(--retro-orange)] text-[var(--retro-bg)] shadow-[0_0_3vmin_#ff7a1a]" : "text-[#ffb81c]";

  return (
    <div
      ref={ref}
      className="relative h-[60vmin] w-[60vmin]"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        track(e);
      }}
      onPointerMove={(e) => pointers.current.has(e.pointerId) && track(e)}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <div className={`${arm} left-1/3 top-0 h-1/3 w-1/3 rounded-t-[2vmin] ${lit("up")}`}>▲</div>
      <div className={`${arm} bottom-0 left-1/3 h-1/3 w-1/3 rounded-b-[2vmin] ${lit("down")}`}>▼</div>
      <div className={`${arm} left-0 top-1/3 h-1/3 w-1/3 rounded-l-[2vmin] ${lit("left")}`}>◀</div>
      <div className={`${arm} right-0 top-1/3 h-1/3 w-1/3 rounded-r-[2vmin] ${lit("right")}`}>▶</div>
      <div className="absolute left-1/3 top-1/3 h-1/3 w-1/3 bg-[#ff7a1a26]" />
    </div>
  );
}
