import type { Button } from "../protocol";
import {
  H,
  hud,
  overlay,
  PALETTE,
  text,
  W,
  type Game,
  type GameDef,
  type GameHost,
} from "./types";

const COLS = 16;
const ROWS = 9;
const MINES = 22;
const CELL = 66;
const OX = (W - COLS * CELL) / 2;
const OY = 80 + (H - 80 - ROWS * CELL) / 2;
const NUM_COLORS = ["", PALETTE.teal, PALETTE.green, PALETTE.yellow, PALETTE.amber, PALETTE.orange, PALETTE.red, PALETTE.red, PALETTE.red];

class Mines implements Game {
  private mine: boolean[] = [];
  private open: boolean[] = [];
  private flag: boolean[] = [];
  private cx = Math.floor(COLS / 2);
  private cy = Math.floor(ROWS / 2);
  private placed = false;
  private state: "playing" | "won" | "lost" = "playing";
  private time = 0;
  private best: number | null = null;

  constructor(private host: GameHost) {
    this.reset();
  }

  private reset() {
    this.mine = Array(COLS * ROWS).fill(false);
    this.open = Array(COLS * ROWS).fill(false);
    this.flag = Array(COLS * ROWS).fill(false);
    this.placed = false;
    this.state = "playing";
    this.time = 0;
  }

  /** Mines are placed after the first reveal so it is never a mine. */
  private place(safe: number) {
    let left = MINES;
    while (left > 0) {
      const i = Math.floor(Math.random() * COLS * ROWS);
      const near = Math.abs((i % COLS) - (safe % COLS)) <= 1 && Math.abs(Math.floor(i / COLS) - Math.floor(safe / COLS)) <= 1;
      if (this.mine[i] || near) continue;
      this.mine[i] = true;
      left--;
    }
    this.placed = true;
  }

  private neighbours(i: number) {
    const x = i % COLS;
    const y = Math.floor(i / COLS);
    const out: number[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if ((dx || dy) && nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) out.push(ny * COLS + nx);
      }
    }
    return out;
  }

  private count(i: number) {
    return this.neighbours(i).filter((n) => this.mine[n]).length;
  }

  private reveal(start: number) {
    const stack = [start];
    while (stack.length) {
      const i = stack.pop()!;
      if (this.open[i] || this.flag[i]) continue;
      this.open[i] = true;
      if (!this.mine[i] && this.count(i) === 0) stack.push(...this.neighbours(i));
    }
  }

  press(_player: number, button: Button) {
    if (this.state !== "playing") {
      if (button === "a") this.reset();
      return;
    }
    if (button === "left") this.cx = (this.cx - 1 + COLS) % COLS;
    if (button === "right") this.cx = (this.cx + 1) % COLS;
    if (button === "up") this.cy = (this.cy - 1 + ROWS) % ROWS;
    if (button === "down") this.cy = (this.cy + 1) % ROWS;
    const i = this.cy * COLS + this.cx;
    if (button === "b" && !this.open[i]) this.flag[i] = !this.flag[i];
    if (button !== "a" || this.flag[i]) return;

    if (!this.placed) this.place(i);
    if (this.open[i]) {
      // "Chording": A on a satisfied number opens all its unflagged neighbours.
      const flags = this.neighbours(i).filter((n) => this.flag[n]).length;
      if (flags === this.count(i)) this.neighbours(i).forEach((n) => this.reveal(n));
    } else {
      this.reveal(i);
    }

    if (this.mine.some((m, k) => m && this.open[k])) {
      this.state = "lost";
      this.mine.forEach((m, k) => m && (this.open[k] = true));
      this.host.rumble(0, 500);
    } else if (this.open.filter(Boolean).length === COLS * ROWS - MINES) {
      this.state = "won";
      const secs = Math.floor(this.time / 1000);
      this.best = this.best === null ? secs : Math.min(this.best, secs);
      this.host.rumble(0, 120);
    } else {
      this.host.rumble(0, 8);
    }
  }

  update(dt: number) {
    if (this.state === "playing" && this.placed) this.time += dt;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < COLS * ROWS; i++) {
      const x = OX + (i % COLS) * CELL;
      const y = OY + Math.floor(i / COLS) * CELL;
      if (this.open[i]) {
        ctx.fillStyle = this.mine[i] ? "#5a1408" : PALETTE.dimmer;
        ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        if (this.mine[i]) {
          ctx.fillStyle = PALETTE.red;
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, CELL * 0.24, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const n = this.count(i);
          if (n) text(ctx, String(n), x + CELL / 2, y + CELL / 2 + 2, 36, NUM_COLORS[n]);
        }
      } else {
        ctx.fillStyle = "#4a2410";
        ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        ctx.fillStyle = "#6b3416";
        ctx.fillRect(x + 2, y + 2, CELL - 4, 8);
        if (this.flag[i]) {
          ctx.fillStyle = PALETTE.yellow;
          ctx.beginPath();
          ctx.moveTo(x + 24, y + 14);
          ctx.lineTo(x + 48, y + 24);
          ctx.lineTo(x + 24, y + 34);
          ctx.fill();
          ctx.fillRect(x + 22, y + 14, 4, 38);
        }
      }
    }

    ctx.strokeStyle = PALETTE.orange;
    ctx.lineWidth = 5;
    ctx.strokeRect(OX + this.cx * CELL + 1, OY + this.cy * CELL + 1, CELL - 2, CELL - 2);

    const flags = this.flag.filter(Boolean).length;
    hud(
      ctx,
      `MINAS ${MINES - flags}`,
      `TIEMPO ${Math.floor(this.time / 1000)}`,
      "A abrir · B bandera",
    );
    if (this.state === "lost") overlay(ctx, "¡BOOM!");
    if (this.state === "won") {
      overlay(ctx, "¡DESPEJADO!", `${Math.floor(this.time / 1000)} s · récord ${this.best} s · A para otra`, PALETTE.teal);
    }
  }
}

export const mines: GameDef = {
  id: "mines",
  name: "Minas",
  players: "1 jugador",
  blurb: "Despeja el campo sin pisar ninguna mina.",
  color: "#b04a12",
  create: (host) => new Mines(host),
};
