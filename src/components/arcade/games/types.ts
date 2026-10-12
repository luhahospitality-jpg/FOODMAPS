import type { Button } from "../protocol";

// Every game draws on a fixed 1280x720 canvas; the TV shell scales it to fit.
export const W = 1280;
export const H = 720;

export interface Input {
  held(player: number, button: Button): boolean;
  /** Held by any connected player; single-player games accept every pad. */
  anyHeld(button: Button): boolean;
  connected(player: number): boolean;
}

export interface GameHost {
  rumble(player: number, ms: number): void;
}

export interface Game {
  update(dt: number, input: Input): void;
  /** Edge-triggered press. start/menu never reach the game; the shell owns them. */
  press(player: number, button: Button, input: Input): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export interface GameDef {
  id: string;
  name: string;
  players: string;
  blurb: string;
  color: string;
  create(host: GameHost): Game;
}

export const PALETTE = {
  bg: "#0b0603",
  ink: "#ffe9cf",
  orange: "#ff7a1a",
  amber: "#ffb81c",
  yellow: "#ffe45c",
  red: "#ff3d2e",
  teal: "#26e6c4",
  green: "#39ff6a",
  dim: "#2a160a",
  dimmer: "#170c05",
};

/** Top-to-bottom bands, yellow to red, used for bricks, sunsets and logos. */
export const BANDS = ["#ffe45c", "#ffc531", "#ffa21f", "#ff7a1a", "#ff5a1f", "#ff3d2e"];

// Canvas can't resolve CSS variables, so read the next/font family names once.
const fontCache: Record<string, string> = {};
export function font(size: number, kind: "display" | "mono" = "display") {
  const cssVar = kind === "display" ? "--font-retro-display" : "--font-retro-mono";
  if (!(cssVar in fontCache) && typeof document !== "undefined") {
    const root = document.getElementById("arcade-root") ?? document.documentElement;
    fontCache[cssVar] = getComputedStyle(root).getPropertyValue(cssVar).trim();
  }
  const fallback = kind === "display" ? "system-ui, sans-serif" : "monospace";
  const family = fontCache[cssVar] ? `${fontCache[cssVar]}, ${fallback}` : fallback;
  return `${size}px ${family}`;
}

export function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string = PALETTE.ink,
  align: CanvasTextAlign = "center",
  kind: "display" | "mono" = "display",
) {
  ctx.fillStyle = color;
  ctx.font = font(size, kind);
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
}

export function centerText(
  ctx: CanvasRenderingContext2D,
  value: string,
  y: number,
  size: number,
  color: string = PALETTE.ink,
) {
  text(ctx, value, W / 2, y, size, color);
}

/** Score bar along the top edge. */
export function hud(ctx: CanvasRenderingContext2D, left: string, right = "", center = "") {
  text(ctx, left, 30, 34, 40, PALETTE.amber, "left", "mono");
  if (right) text(ctx, right, W - 30, 34, 40, PALETTE.amber, "right", "mono");
  if (center) text(ctx, center, W / 2, 34, 40, PALETTE.amber, "center", "mono");
}

/** Dimmed full-screen message, e.g. game over. */
export function overlay(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle = "Pulsa A para jugar otra vez",
  color: string = PALETTE.orange,
) {
  ctx.fillStyle = "rgba(11,6,3,0.78)";
  ctx.fillRect(0, 0, W, H);
  centerText(ctx, title, H / 2 - 40, 96, color);
  text(ctx, subtitle, W / 2, H / 2 + 60, 44, PALETTE.ink, "center", "mono");
}

/** Banded 80s sun sitting on a horizon, with a perspective grid below. */
export function sunset(ctx: CanvasRenderingContext2D, horizon: number, scroll = 0) {
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, W, H);
  const r = 190;
  const cx = W / 2;
  const top = horizon - r;
  for (let i = 0; i < BANDS.length; i++) {
    const y0 = top + (i * r) / BANDS.length;
    const gap = i === 0 ? 0 : 3 + i * 2; // stripes widen towards the horizon
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y0 + gap, W, r / BANDS.length - gap);
    ctx.clip();
    ctx.fillStyle = BANDS[i];
    ctx.beginPath();
    ctx.arc(cx, horizon, r, Math.PI, 0);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = PALETTE.dimmer;
  ctx.fillRect(0, horizon, W, H - horizon);
  ctx.strokeStyle = "#ff7a1a66";
  ctx.lineWidth = 2;
  for (let i = -12; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 30, horizon);
    ctx.lineTo(cx + i * 260, H);
    ctx.stroke();
  }
  const span = H - horizon;
  for (let i = 0; i < 10; i++) {
    const t = (((i + scroll) % 10) + 10) % 10 / 10;
    const y = horizon + span * t * t;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

export function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
