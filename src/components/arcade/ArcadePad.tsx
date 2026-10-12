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

const PLAYER_ACCENT = ["#f0b60d", "#ec5fa0"];

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
          <h1 className="font-display text-5xl font-black uppercase leading-none">
            Mando <span className="text-mustard">Arcade</span>
          </h1>
          {status === "full" ? (
            <p className="text-red">Ya hay 2 mandos conectados a esa tele.</p>
          ) : (
            <p className="opacity-80">
              Abre <b>/arcade</b> en el navegador de la tele y escribe aquí el código que aparece.
            </p>
          )}
          <input
            value={draft}
            onChange={(e) => setDraft(normalizeRoomCode(e.target.value))}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ABCD"
            className="w-48 rounded-xl border-4 border-cream bg-transparent py-3 text-center font-display text-5xl font-black tracking-[0.2em] outline-none placeholder:text-cream/20 focus:border-mustard"
          />
          <button
            type="submit"
            disabled={draft.length !== 4}
            className="rounded-full bg-mustard px-8 py-3 font-label font-bold uppercase text-ink disabled:opacity-40"
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
      <div className="absolute inset-0 z-10 hidden flex-col items-center justify-center gap-4 bg-ink px-8 text-center portrait:flex">
        <p className="text-6xl">⟳</p>
        <p className="font-display text-4xl font-black uppercase">Gira el móvil</p>
        <p className="opacity-70">El mando se usa en horizontal.</p>
      </div>
      <div className="flex h-full w-full items-stretch justify-between gap-[3vmin] px-[5vmin] py-[4vmin]">
        <div className="flex flex-1 items-center justify-center">
          <DPad pressed={pressed} onChange={setButton} />
        </div>

        <div className="flex flex-col items-center justify-between py-[2vmin] text-center">
          <div>
            <p className="font-display text-[9vmin] font-black leading-none" style={{ color: accent }}>
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
            className="font-label text-[3vmin] uppercase opacity-50"
          >
            ⤢ Pantalla completa
          </button>
        </div>

        <div className="relative flex-1">
          <RoundButton
            label="B"
            button="b"
            color="#ec5fa0"
            className="absolute bottom-[12%] left-[8%]"
            pressed={pressed}
            onChange={setButton}
          />
          <RoundButton
            label="A"
            button="a"
            color="#f0b60d"
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
      className="fixed inset-0 flex items-center overflow-hidden bg-ink text-cream select-none"
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
      className={`mt-[1vmin] max-w-[38vmin] font-label text-[2.8vmin] ${
        status === "connected" ? "opacity-60" : "text-mustard"
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
      className={`flex h-[30vmin] w-[30vmin] items-center justify-center rounded-full font-display text-[12vmin] font-black text-ink transition-transform ${className}`}
      style={{
        background: color,
        transform: down ? "scale(0.92)" : undefined,
        boxShadow: down ? "none" : "0 1.2vmin 0 rgba(0,0,0,0.45)",
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
      className={`rounded-full border-[0.6vmin] border-cream/60 px-[4vmin] py-[2vmin] font-label text-[3.2vmin] font-bold uppercase ${
        down ? "bg-cream text-ink" : ""
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

  const arm = "absolute flex items-center justify-center bg-cream/15 text-[5vmin]";
  const lit = (d: Dir) => (pressed.has(d) ? "!bg-mustard text-ink" : "text-cream/70");

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
      <div className="absolute left-1/3 top-1/3 h-1/3 w-1/3 bg-cream/15" />
    </div>
  );
}
