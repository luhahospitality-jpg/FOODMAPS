import type { Button } from "../protocol";
import {
  font,
  H,
  overlay,
  PALETTE,
  W,
  type Game,
  type GameDef,
  type GameHost,
  type Input,
} from "./types";

const COLS = 10;
const ROWS = 20;
const CELL = 33;
const BOARD_X = (W - COLS * CELL) / 2;
const BOARD_Y = (H - ROWS * CELL) / 2;

const COLORS = ["#26e6c4", "#ffe45c", "#ff7a1a", "#39ff6a", "#ff3d2e", "#ffb81c", "#ff5ad1"];

// Each piece is a list of rotations; each rotation lists filled [x, y] cells in a 4x4 box.
const SHAPES: number[][][] = [
  [0x0f00, 0x2222, 0x00f0, 0x4444], // I
  [0x0660, 0x0660, 0x0660, 0x0660], // O
  [0x0e40, 0x4c40, 0x4e00, 0x4640], // T
  [0x06c0, 0x8c40, 0x6c00, 0x4620], // S
  [0x0c60, 0x4c80, 0xc600, 0x2640], // Z
  [0x0e80, 0xc440, 0x2e00, 0x4460], // L
  [0x0e20, 0x44c0, 0x8e00, 0x6440], // J
].map((rots) =>
  rots.map((mask) => {
    const cells: number[] = [];
    for (let i = 0; i < 16; i++) if (mask & (0x8000 >> i)) cells.push(i % 4, Math.floor(i / 4));
    return cells;
  }),
);

type Piece = { kind: number; rot: number; x: number; y: number };

const LINE_POINTS = [0, 100, 300, 500, 800];
const DAS_MS = 170;
const ARR_MS = 50;

class Tetris implements Game {
  private board: number[][] = [];
  private piece!: Piece;
  private nextKind = 0;
  private bag: number[] = [];
  private fallAcc = 0;
  private lines = 0;
  private score = 0;
  private best = 0;
  private dead = false;
  private repeat: { dir: -1 | 1; t: number; fired: boolean } | null = null;

  constructor(private host: GameHost) {
    this.reset();
  }

  private get level() {
    return Math.floor(this.lines / 10) + 1;
  }

  private reset() {
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
    this.bag = [];
    this.lines = 0;
    this.score = 0;
    this.dead = false;
    this.fallAcc = 0;
    this.nextKind = this.draw7();
    this.spawn();
  }

  private draw7() {
    if (this.bag.length === 0) {
      this.bag = [0, 1, 2, 3, 4, 5, 6];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop()!;
  }

  private spawn() {
    this.piece = { kind: this.nextKind, rot: 0, x: 3, y: -1 };
    this.nextKind = this.draw7();
    if (this.collides(this.piece)) {
      this.dead = true;
      this.best = Math.max(this.best, this.score);
      this.host.rumble(0, 400);
    }
  }

  private cells(p: Piece) {
    const c = SHAPES[p.kind][p.rot];
    const out: [number, number][] = [];
    for (let i = 0; i < c.length; i += 2) out.push([p.x + c[i], p.y + c[i + 1]]);
    return out;
  }

  private collides(p: Piece) {
    return this.cells(p).some(
      ([x, y]) => x < 0 || x >= COLS || y >= ROWS || (y >= 0 && this.board[y][x] !== -1),
    );
  }

  private tryMove(dx: number, dy: number, drot = 0) {
    const rot = (this.piece.rot + drot + 4) % 4;
    // Simple wall kicks: try in place, then nudge sideways.
    const kicks = drot ? [0, -1, 1, -2, 2] : [0];
    for (const k of kicks) {
      const cand = { ...this.piece, x: this.piece.x + dx + k, y: this.piece.y + dy, rot };
      if (!this.collides(cand)) {
        this.piece = cand;
        return true;
      }
    }
    return false;
  }

  private lock() {
    for (const [x, y] of this.cells(this.piece)) {
      if (y < 0) {
        this.dead = true;
        this.best = Math.max(this.best, this.score);
        this.host.rumble(0, 400);
        return;
      }
      this.board[y][x] = this.piece.kind;
    }
    const kept = this.board.filter((row) => row.some((c) => c === -1));
    const cleared = ROWS - kept.length;
    if (cleared) {
      this.board = [
        ...Array.from({ length: cleared }, () => Array(COLS).fill(-1)),
        ...kept,
      ];
      this.lines += cleared;
      this.score += LINE_POINTS[cleared] * this.level;
      this.host.rumble(0, 40 * cleared);
    }
    this.fallAcc = 0;
    this.spawn();
  }

  press(_player: number, button: Button) {
    if (this.dead) {
      if (button === "a") this.reset();
      return;
    }
    switch (button) {
      case "left":
      case "right": {
        const dir = button === "left" ? -1 : 1;
        this.tryMove(dir, 0);
        this.repeat = { dir, t: 0, fired: false };
        break;
      }
      case "up":
      case "a":
        this.tryMove(0, 0, 1);
        break;
      case "b": {
        let dropped = 0;
        while (this.tryMove(0, 1)) dropped++;
        this.score += dropped * 2;
        this.lock();
        break;
      }
      case "down":
        if (this.tryMove(0, 1)) this.score++;
        this.fallAcc = 0;
        break;
    }
  }

  update(dt: number, input: Input) {
    if (this.dead) return;

    if (this.repeat) {
      const name = this.repeat.dir < 0 ? "left" : "right";
      if (!input.anyHeld(name)) {
        this.repeat = null;
      } else {
        this.repeat.t += dt;
        // Hold to auto-shift: wait DAS_MS once, then repeat every ARR_MS.
        for (;;) {
          const threshold = this.repeat.fired ? ARR_MS : DAS_MS;
          if (this.repeat.t < threshold) break;
          this.repeat.t -= threshold;
          this.repeat.fired = true;
          this.tryMove(this.repeat.dir, 0);
        }
      }
    }

    const softDrop = input.anyHeld("down");
    const fallMs = softDrop ? 40 : Math.max(80, 800 - (this.level - 1) * 70);
    this.fallAcc += dt;
    while (this.fallAcc >= fallMs && !this.dead) {
      this.fallAcc -= fallMs;
      if (this.tryMove(0, 1)) {
        if (softDrop) this.score++;
      } else {
        this.lock();
      }
    }
  }

  private cell(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, ox = BOARD_X, oy = BOARD_Y) {
    ctx.fillStyle = color;
    ctx.fillRect(ox + x * CELL + 1, oy + y * CELL + 1, CELL - 2, CELL - 2);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(ox + x * CELL + 1, oy + y * CELL + 1, CELL - 2, 5);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = PALETTE.dimmer;
    ctx.fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL);
    ctx.strokeStyle = PALETTE.orange;
    ctx.lineWidth = 4;
    ctx.strokeRect(BOARD_X - 4, BOARD_Y - 4, COLS * CELL + 8, ROWS * CELL + 8);

    this.board.forEach((row, y) =>
      row.forEach((k, x) => {
        if (k !== -1) this.cell(ctx, x, y, COLORS[k]);
      }),
    );

    if (!this.dead) {
      // Ghost piece shows where a hard drop will land.
      let ghost = this.piece;
      while (!this.collides({ ...ghost, y: ghost.y + 1 })) ghost = { ...ghost, y: ghost.y + 1 };
      ctx.globalAlpha = 0.22;
      for (const [x, y] of this.cells(ghost)) if (y >= 0) this.cell(ctx, x, y, COLORS[ghost.kind]);
      ctx.globalAlpha = 1;
      for (const [x, y] of this.cells(this.piece)) if (y >= 0) this.cell(ctx, x, y, COLORS[this.piece.kind]);
    }

    const sideX = BOARD_X + COLS * CELL + 50;
    ctx.fillStyle = PALETTE.ink;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = font(34, "mono");
    ctx.fillStyle = PALETTE.amber;
    ctx.fillText("SIGUIENTE", sideX, BOARD_Y);
    const nc = SHAPES[this.nextKind][0];
    for (let i = 0; i < nc.length; i += 2) {
      this.cell(ctx, nc[i], nc[i + 1], COLORS[this.nextKind], sideX, BOARD_Y + 45);
    }
    const stats: [string, number][] = [
      ["PUNTOS", this.score],
      ["LÍNEAS", this.lines],
      ["NIVEL", this.level],
      ["RÉCORD", this.best],
    ];
    stats.forEach(([label, value], i) => {
      const y = BOARD_Y + 220 + i * 95;
      ctx.font = font(30, "mono");
      ctx.fillStyle = PALETTE.amber;
      ctx.fillText(label, sideX, y);
      ctx.font = font(56, "mono");
      ctx.fillStyle = PALETTE.ink;
      ctx.fillText(String(value), sideX, y + 28);
    });

    const helpX = BOARD_X - 50;
    ctx.textAlign = "right";
    ctx.font = font(30, "mono");
    ctx.fillStyle = "#b08a6a";
    ["◀ ▶  mover", "▲ / A  girar", "▼  bajar", "B  soltar"].forEach((t, i) =>
      ctx.fillText(t, helpX, BOARD_Y + i * 36),
    );

    if (this.dead) overlay(ctx, "GAME OVER");
  }
}

export const tetris: GameDef = {
  id: "tetris",
  name: "Bloques",
  players: "1 jugador",
  blurb: "Encaja las piezas y limpia líneas.",
  color: PALETTE.teal,
  create: (host) => new Tetris(host),
};
