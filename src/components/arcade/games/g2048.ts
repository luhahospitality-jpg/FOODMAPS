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

const N = 4;
const TILE = 132;
const GAP = 14;
const SIZE = N * TILE + (N + 1) * GAP;
const OX = (W - SIZE) / 2;
const OY = (H - SIZE) / 2 + 24;

const TILE_COLORS: Record<number, string> = {
  2: "#3a1e0c",
  4: "#4d260e",
  8: "#7a3410",
  16: "#a34312",
  32: "#cc5214",
  64: "#ff6a1a",
  128: "#ff8a1f",
  256: "#ffa21f",
  512: "#ffc531",
  1024: "#ffe45c",
  2048: "#26e6c4",
};

class G2048 implements Game {
  private grid: number[] = [];
  private score = 0;
  private best = 0;
  private dead = false;
  private won = false;
  private keepPlaying = false;

  constructor(private host: GameHost) {
    this.reset();
  }

  private reset() {
    this.grid = Array(N * N).fill(0);
    this.score = 0;
    this.dead = false;
    this.won = false;
    this.keepPlaying = false;
    this.spawn();
    this.spawn();
  }

  private spawn() {
    const empty = this.grid.flatMap((v, i) => (v ? [] : [i]));
    if (!empty.length) return;
    this.grid[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
  }

  /** Slides every line towards index 0 of the line; returns whether anything moved. */
  private slide(lines: number[][]) {
    let moved = false;
    for (const idx of lines) {
      const vals = idx.map((i) => this.grid[i]).filter(Boolean);
      const out: number[] = [];
      for (let k = 0; k < vals.length; k++) {
        if (vals[k] === vals[k + 1]) {
          out.push(vals[k] * 2);
          this.score += vals[k] * 2;
          if (vals[k] * 2 === 2048) this.won = true;
          k++;
        } else {
          out.push(vals[k]);
        }
      }
      idx.forEach((i, k) => {
        const v = out[k] ?? 0;
        if (this.grid[i] !== v) moved = true;
        this.grid[i] = v;
      });
    }
    return moved;
  }

  private lines(dir: Button) {
    const lines: number[][] = [];
    for (let a = 0; a < N; a++) {
      const line: number[] = [];
      for (let b = 0; b < N; b++) {
        if (dir === "left") line.push(a * N + b);
        if (dir === "right") line.push(a * N + (N - 1 - b));
        if (dir === "up") line.push(b * N + a);
        if (dir === "down") line.push((N - 1 - b) * N + a);
      }
      lines.push(line);
    }
    return lines;
  }

  private canMove() {
    for (let i = 0; i < N * N; i++) {
      if (!this.grid[i]) return true;
      if (i % N < N - 1 && this.grid[i] === this.grid[i + 1]) return true;
      if (i + N < N * N && this.grid[i] === this.grid[i + N]) return true;
    }
    return false;
  }

  press(_player: number, button: Button) {
    if (this.dead) {
      if (button === "a") this.reset();
      return;
    }
    if (this.won && !this.keepPlaying) {
      if (button === "a") this.keepPlaying = true;
      return;
    }
    if (!["up", "down", "left", "right"].includes(button)) return;
    if (this.slide(this.lines(button))) {
      this.spawn();
      this.host.rumble(0, 10);
      if (!this.canMove()) {
        this.dead = true;
        this.best = Math.max(this.best, this.score);
        this.host.rumble(0, 300);
      }
    }
  }

  update() {}

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PALETTE.dimmer;
    ctx.fillRect(OX, OY, SIZE, SIZE);
    ctx.strokeStyle = PALETTE.orange;
    ctx.lineWidth = 4;
    ctx.strokeRect(OX - 2, OY - 2, SIZE + 4, SIZE + 4);

    this.grid.forEach((v, i) => {
      const x = OX + GAP + (i % N) * (TILE + GAP);
      const y = OY + GAP + Math.floor(i / N) * (TILE + GAP);
      ctx.fillStyle = v ? TILE_COLORS[v] ?? PALETTE.teal : "#1d0f06";
      ctx.fillRect(x, y, TILE, TILE);
      if (!v) return;
      const size = v < 100 ? 60 : v < 1000 ? 48 : 38;
      text(ctx, String(v), x + TILE / 2, y + TILE / 2 + 2, size, v >= 512 ? PALETTE.bg : PALETTE.ink);
    });

    hud(ctx, `PUNTOS ${this.score}`, `RÉCORD ${Math.max(this.best, this.score)}`, "2048");
    if (this.dead) overlay(ctx, "SIN MOVIMIENTOS");
    else if (this.won && !this.keepPlaying) overlay(ctx, "¡2048!", "Pulsa A para seguir jugando", PALETTE.teal);
  }
}

export const g2048: GameDef = {
  id: "2048",
  name: "2048",
  players: "1 jugador",
  blurb: "Junta fichas iguales hasta llegar a 2048.",
  color: "#ffc531",
  create: (host) => new G2048(host),
};
