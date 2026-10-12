import type { Button } from "../protocol";

// Every game draws on a fixed 1280x720 canvas; the TV shell scales it to fit.
export const W = 1280;
export const H = 720;

export interface Input {
  held(player: number, button: Button): boolean;
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
  bg: "#17130f",
  ink: "#f2ecdc",
  mustard: "#f0b60d",
  pink: "#ec5fa0",
  blue: "#2c46e8",
  red: "#e2381f",
  dim: "#3a332b",
};

// Canvas can't resolve CSS variables, so read the next/font family names once.
const fontCache: Record<string, string> = {};
export function font(weight: number, size: number, kind: "display" | "mono" = "display") {
  const cssVar = kind === "display" ? "--font-big-shoulders" : "--font-space-mono";
  if (!(cssVar in fontCache)) {
    fontCache[cssVar] =
      typeof document === "undefined"
        ? ""
        : getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  }
  const fallback = kind === "display" ? "system-ui, sans-serif" : "monospace";
  const family = fontCache[cssVar] ? `${fontCache[cssVar]}, ${fallback}` : fallback;
  return `${weight} ${size}px ${family}`;
}

export function centerText(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  size: number,
  color: string = PALETTE.ink,
) {
  ctx.fillStyle = color;
  ctx.font = font(800, size);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, y);
}
