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

const PLAYER_COLORS = ["bg-mustard", "bg-pink-dark"];

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
        if (button === "left" || button === "up") {
          setSelected((selected - 1 + GAMES.length) % GAMES.length);
        } else if (button === "right" || button === "down") {
          setSelected((selected + 1) % GAMES.length);
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

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink text-cream select-none">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-ink/80">
              <p className="font-display text-[10vh] font-black uppercase leading-none text-mustard">
                Pausa
              </p>
              <p className="font-label text-[3vh]">A · seguir &nbsp;&nbsp; B · salir al menú</p>
            </div>
          )}
          <PlayerDots players={players} className="absolute right-[2vh] top-[2vh]" />
        </div>
      )}

      {mode === "menu" && (
        <div className="flex h-full flex-col px-[5vw] py-[5vh]">
          <header className="flex items-end justify-between">
            <h1 className="font-display text-[11vh] font-black uppercase leading-none tracking-tight">
              FoodMaps <span className="text-mustard">Arcade</span>
            </h1>
            <PlayerDots players={players} />
          </header>

          <div className="mt-[5vh] grid flex-1 grid-cols-[1fr_auto] gap-[4vw]">
            <div className="flex flex-col gap-[2.5vh]">
              {GAMES.map((g, i) => (
                <div
                  key={g.id}
                  className={`flex items-center gap-[2vw] rounded-[1.5vh] border-[0.5vh] px-[2vw] py-[2.2vh] transition-transform ${
                    i === selected
                      ? "scale-[1.03] border-cream bg-cream/10"
                      : "border-transparent bg-cream/[0.04] opacity-70"
                  }`}
                >
                  <span
                    className="h-[7vh] w-[7vh] shrink-0 rounded-[1vh]"
                    style={{ background: g.color }}
                  />
                  <div className="flex-1">
                    <p className="font-display text-[6vh] font-extrabold uppercase leading-none">
                      {g.name}
                    </p>
                    <p className="mt-[0.8vh] text-[2.6vh] opacity-80">{g.blurb}</p>
                  </div>
                  <span className="font-label text-[2.2vh] uppercase opacity-70">{g.players}</span>
                </div>
              ))}
              <p className="mt-auto font-label text-[2.2vh] opacity-60">
                ◀ ▶ elegir · A jugar · START pausa · MENÚ volver aquí
              </p>
            </div>

            <aside className="flex w-[34vh] flex-col items-center gap-[2vh] text-center">
              {status === "ready" && qr ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- data: URL */}
                  <img src={qr} alt="Código QR del mando" className="w-full rounded-[1.5vh] bg-white p-[1vh]" />
                  <p className="text-[2.4vh]">Escanéalo con el móvil</p>
                  <p className="font-label text-[2vh] opacity-70">o entra en</p>
                  <p className="font-label text-[2vh] break-all text-mustard">
                    {padUrl.replace(/\?.*/, "").replace(/^https?:\/\//, "")}
                  </p>
                  <p className="font-label text-[2vh] opacity-70">con el código</p>
                  <p className="font-display text-[9vh] font-black leading-none tracking-[0.15em]">
                    {code}
                  </p>
                </>
              ) : status === "error" ? (
                <p className="text-[2.6vh] text-red">{error}</p>
              ) : (
                <p className="font-label text-[2.4vh] opacity-70">Preparando sala…</p>
              )}
              {status === "ready" && connectedCount === 0 && (
                <p className="mt-auto text-[2.2vh] opacity-60">
                  También puedes usar las flechas y OK del mando de la tele.
                </p>
              )}
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerDots({ players, className = "" }: { players: boolean[]; className?: string }) {
  return (
    <div className={`flex gap-[1vh] ${className}`}>
      {players.map((on, i) => (
        <span
          key={i}
          className={`rounded-full px-[1.6vh] py-[0.6vh] font-label text-[2vh] font-bold ${
            on ? `${PLAYER_COLORS[i]} text-ink` : "border-[0.3vh] border-cream/30 text-cream/40"
          }`}
        >
          J{i + 1}
        </span>
      ))}
    </div>
  );
}
