"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DataConnection, Peer } from "peerjs";
import QRCode from "qrcode";
import { GAMES, H, W, type Game, type Input } from "./games";
import {
  isButton,
  MAX_PLAYERS,
  peerIdFor,
  peerOptions,
  randomRoomCode,
  type Button,
  type TvMessage,
} from "./protocol";

type Status = "starting" | "ready" | "error";
type Mode = "menu" | "play";

const KEYMAP: Record<string, Button> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Enter: "a",
  " ": "a",
  z: "a",
  x: "b",
  p: "start",
  Escape: "menu",
  Backspace: "menu",
};

const PLAYER_COLORS = ["#ff7a1a", "#26e6c4"];
const MENU_COLS = 4;

export function ArcadeTV() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("starting");
  const [error, setError] = useState("");
  const [qr, setQr] = useState("");
  const [padUrl, setPadUrl] = useState("");
  const [players, setPlayers] = useState<boolean[]>(Array(MAX_PLAYERS).fill(false));
  const [mode, setMode] = useState<Mode>("menu");
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const connsRef = useRef<(DataConnection | null)[]>(Array(MAX_PLAYERS).fill(null));
  const heldRef = useRef<Set<Button>[]>(Array.from({ length: MAX_PLAYERS }, () => new Set()));
  const stateRef = useRef({ mode, selected, paused });
  stateRef.current = { mode, selected, paused };

  const input = useRef<Input>({
    held: (p, b) => heldRef.current[p]?.has(b) ?? false,
    anyHeld: (b) => heldRef.current.some((set) => set.has(b)),
    connected: (p) => connsRef.current[p] !== null,
  }).current;

  const send = useCallback((player: number, msg: TvMessage) => {
    const conn = connsRef.current[player];
    if (conn?.open) conn.send(msg);
  }, []);

  const handleButton = useCallback(
    (player: number, button: Button, down: boolean) => {
      const held = heldRef.current[player];
      if (!down) {
        held.delete(button);
        return;
      }
      if (held.has(button)) return; // ignore key auto-repeat
      held.add(button);

      const { mode, selected, paused } = stateRef.current;
      if (mode === "menu") {
        const step = { left: -1, right: 1, up: -MENU_COLS, down: MENU_COLS }[button as string];
        if (step) {
          setSelected((selected + step + GAMES.length) % GAMES.length);
        } else if (button === "a" || button === "start") {
          setPaused(false);
          setMode("play");
        }
        return;
      }

      if (button === "menu") {
        setMode("menu");
        setPaused(false);
      } else if (button === "start") {
        setPaused(!paused);
      } else if (paused) {
        if (button === "a") setPaused(false);
        if (button === "b") setMode("menu");
      } else {
        gameRef.current?.press(player, button, input);
      }
    },
    [input],
  );

  // Pairing: the TV registers a short room code on the PeerJS broker and accepts pads.
  useEffect(() => {
    let peer: Peer | null = null;
    let cancelled = false;
    const conns = connsRef.current;
    const held = heldRef.current;

    async function open(attempt: number) {
      const { Peer } = await import("peerjs");
      if (cancelled) return;
      const room = randomRoomCode();
      const p = new Peer(peerIdFor(room), peerOptions());
      peer = p;

      p.on("open", async () => {
        if (cancelled) return;
        const url = `${window.location.origin}/arcade/pad?room=${room}`;
        setCode(room);
        setPadUrl(url);
        setQr(await QRCode.toDataURL(url, { margin: 1, width: 360 }));
        setStatus("ready");
      });

      p.on("connection", (conn) => {
        conn.on("open", () => {
          const slot = conns.findIndex((c) => c === null);
          if (slot === -1) {
            conn.send({ t: "full" } satisfies TvMessage);
            setTimeout(() => conn.close(), 500);
            return;
          }
          conns[slot] = conn;
          held[slot].clear();
          setPlayers(conns.map((c) => c !== null));
          conn.send({ t: "welcome", player: slot } satisfies TvMessage);

          conn.on("data", (raw) => {
            const msg = raw as { t?: string; b?: unknown; d?: unknown };
            if (msg?.t === "btn" && isButton(msg.b)) handleButton(slot, msg.b, msg.d === true);
          });
          conn.on("close", () => {
            if (conns[slot] !== conn) return;
            conns[slot] = null;
            held[slot].clear();
            setPlayers(conns.map((c) => c !== null));
          });
        });
      });

      // Losing the broker doesn't drop live pads, but new ones can't join until we're back.
      p.on("disconnected", () => {
        if (!cancelled && !p.destroyed) setTimeout(() => p.reconnect(), 1500);
      });

      p.on("error", (err) => {
        if (cancelled) return;
        if (err.type === "unavailable-id" && attempt < 5) {
          p.destroy();
          open(attempt + 1);
        } else if (err.type === "network" || err.type === "server-error") {
          setStatus("error");
          setError("No hay conexión con el servidor de emparejamiento. Revisa el wifi y recarga.");
        } else if (err.type === "browser-incompatible") {
          setStatus("error");
          setError("Este navegador no soporta WebRTC. Prueba con otro navegador en la tele.");
        }
      });
    }

    open(0);
    // PeerJS keeps retrying quietly when the broker is unreachable; tell the user instead.
    const slow = setTimeout(() => {
      if (!peer?.open) {
        setStatus((s) => (s === "starting" ? "error" : s));
        setError("No consigo conectar con el servidor de emparejamiento. Revisa el wifi y recarga.");
      }
    }, 15000);
    return () => {
      cancelled = true;
      clearTimeout(slow);
      peer?.destroy();
      conns.fill(null);
    };
  }, [handleButton]);

  // TV remote / keyboard drives player 1 too, so the menu works before a phone joins.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const button = KEYMAP[e.key] ?? KEYMAP[e.key.toLowerCase()];
      if (!button) return;
      e.preventDefault();
      handleButton(0, button, e.type === "keydown");
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [handleButton]);

  // Game loop: (re)created whenever a game is launched from the menu.
  useEffect(() => {
    if (mode !== "play") return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const game = GAMES[selected].create({
      rumble: (player, ms) => send(player, { t: "rumble", ms }),
    });
    gameRef.current = game;

    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const dt = Math.min(now - last, 100);
      last = now;
      if (!stateRef.current.paused) game.update(dt, input);
      game.draw(ctx);
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
      gameRef.current = null;
    };
  }, [mode, selected, input, send]);

  const connectedCount = players.filter(Boolean).length;
  const current = GAMES[selected];

  return (
    <div className="crt fixed inset-0 overflow-hidden select-none" style={{ background: "var(--retro-bg)" }}>
      {mode === "play" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block max-h-full max-w-full"
            style={{ aspectRatio: `${W} / ${H}`, width: "min(100vw, calc(100vh * 16 / 9))" }}
          />
          {paused && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3vh] bg-black/80">
              <p className="font-retro glow text-[12vh] leading-none">PAUSA</p>
              <p className="font-term text-[4.5vh]">A · seguir &nbsp;&nbsp; B · salir al menú</p>
              <PlayerDots players={players} />
            </div>
          )}
        </div>
      )}

      {mode === "menu" && (
        <div className="flex h-full flex-col px-[4vw] py-[4vh]">
          <header className="flex items-center justify-between">
            <Logo />
            <PlayerDots players={players} />
          </header>

          <div className="mt-[3.5vh] grid min-h-0 flex-1 grid-cols-[1fr_auto] gap-[3vw]">
            <div className="flex min-h-0 flex-col">
              <div className="grid flex-1 grid-cols-4 grid-rows-3 gap-[1.6vh]">
                {GAMES.map((g, i) => (
                  <div
                    key={g.id}
                    className={`flex flex-col justify-between rounded-[1vh] border-[0.35vh] px-[1.4vw] py-[1.4vh] ${
                      i === selected ? "card-on" : "border-[#ff7a1a26] opacity-60"
                    }`}
                  >
                    <span
                      className="block h-[0.8vh] w-[40%] rounded-full"
                      style={{ background: g.color, boxShadow: `0 0 1vh ${g.color}` }}
                    />
                    <p
                      className="font-retro text-[3.3vh] uppercase leading-tight"
                      style={{ color: i === selected ? "var(--retro-yellow)" : "var(--retro-ink)" }}
                    >
                      {g.name}
                    </p>
                    <p className="font-term text-[2.6vh] uppercase leading-none text-[var(--retro-amber)]">
                      {g.players}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-[2vh] min-h-[3.4vh] font-term text-[3.4vh] leading-none text-[var(--retro-ink)]">
                <span className="text-[var(--retro-orange)]">▶ </span>
                {current.blurb}
              </p>
              <p className="mt-[1vh] font-term text-[2.8vh] text-[#ffe9cf80]">
                ◀ ▲ ▼ ▶ elegir · A jugar · START pausa · MENÚ volver aquí
              </p>
            </div>

            <aside className="flex w-[34vh] flex-col items-center gap-[1.4vh] text-center">
              {status === "ready" && qr ? (
                <>
                  <p className="font-retro glow-soft text-[2.6vh] text-[var(--retro-amber)]">CONECTA TU MANDO</p>
                  {/* eslint-disable-next-line @next/next/no-img-element -- data: URL */}
                  <img
                    src={qr}
                    alt="Código QR del mando"
                    className="w-full rounded-[1vh] bg-[#ffe9cf] p-[1vh] shadow-[0_0_3vh_#ff7a1a66]"
                  />
                  <p className="font-term text-[2.8vh]">Escanéalo con el móvil o entra en</p>
                  <p className="font-term break-all text-[2.6vh] leading-none text-[var(--retro-orange)]">
                    {padUrl.replace(/\?.*/, "").replace(/^https?:\/\//, "")}
                  </p>
                  <p className="font-term text-[2.8vh] opacity-70">con el código</p>
                  <p className="font-retro glow text-[8vh] leading-none tracking-[0.12em]">{code}</p>
                </>
              ) : status === "error" ? (
                <p className="font-term text-[3.2vh] text-[var(--retro-red)]">{error}</p>
              ) : (
                <p className="blink font-term text-[3.4vh] text-[var(--retro-amber)]">CARGANDO…</p>
              )}
              {status === "ready" && connectedCount === 0 && (
                <p className="mt-auto font-term text-[2.6vh] opacity-60">
                  También vale el mando de la tele: flechas y OK.
                </p>
              )}
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-[2vw]">
      <svg viewBox="0 0 100 100" className="h-[11vh] w-[11vh]" aria-hidden>
        <defs>
          <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe45c" />
            <stop offset="0.5" stopColor="#ff7a1a" />
            <stop offset="1" stopColor="#ff3d2e" />
          </linearGradient>
          <clipPath id="bands">
            <rect x="0" y="0" width="100" height="44" />
            <rect x="0" y="48" width="100" height="9" />
            <rect x="0" y="61" width="100" height="7" />
            <rect x="0" y="72" width="100" height="5" />
            <rect x="0" y="81" width="100" height="3" />
          </clipPath>
        </defs>
        <circle cx="50" cy="56" r="44" fill="url(#sun)" clipPath="url(#bands)" />
      </svg>
      <h1 className="font-retro sunset-text text-[10vh] uppercase leading-[0.95]">
        Arcade
        <br />
        Retro
      </h1>
    </div>
  );
}

function PlayerDots({ players, className = "" }: { players: boolean[]; className?: string }) {
  return (
    <div className={`flex gap-[1.2vh] ${className}`}>
      {players.map((on, i) => (
        <span
          key={i}
          className="font-retro rounded-[0.6vh] border-[0.3vh] px-[1.4vh] py-[0.5vh] text-[2.4vh]"
          style={
            on
              ? { background: PLAYER_COLORS[i], borderColor: PLAYER_COLORS[i], color: "#0b0603", boxShadow: `0 0 1.5vh ${PLAYER_COLORS[i]}` }
              : { borderColor: "#ffe9cf33", color: "#ffe9cf55" }
          }
        >
          J{i + 1}
        </span>
      ))}
    </div>
  );
}
