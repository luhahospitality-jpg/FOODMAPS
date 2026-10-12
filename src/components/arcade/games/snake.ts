import type { Button } from "../protocol";
import { centerText, font, H, PALETTE, W, type Game, type GameDef, type GameHost } from "./types";

const CELL = 40;
const COLS = W / CELL;
const ROWS = (H - 80) / CELL; // top 80px is the score bar
const TOP = 80;

type Pt = { x: number; y: number };
const DIRS: Partial<Record<Button, Pt>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

class Snake implements Game {
  private body: Pt[] = [];
  private dir: Pt = { x: 1, y: 0 };
  private queue: Pt[] = [];
  private food: Pt = { x: 0, y: 0 };
  private acc = 0;
  private score = 0;
  private best = 0;
  private dead = false;

  constructor(private host: GameHost) {
    this.reset();
  }

  private reset() {
    const y = Math.floor(ROWS / 2);
    this.body = [
      { x: 6, y },
      { x: 5, y },
      { x: 4, y },
    ];
    this.dir = { x: 1, y: 0 };
    this.queue = [];
    this.score = 0;
    this.dead = false;
    this.acc = 0;
    this.placeFood();
  }

  private placeFood() {
    do {
      this.food = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (this.body.some((p) => p.x === this.food.x && p.y === this.food.y));
  }

  press(_player: number, button: Button) {
    if (this.dead) {
      if (button === "a") this.reset();
      return;
    }
    const d = DIRS[button];
    if (!d) return;
    // Compare against the last queued turn so quick double-taps can't reverse into yourself.
    const last = this.queue[this.queue.length - 1] ?? this.dir;
    if (d.x === -last.x && d.y === -last.y) return;
    if (d.x === last.x && d.y === last.y) return;
    if (this.queue.length < 3) this.queue.push(d);
  }

  update(dt: number) {
    if (this.dead) return;
    const stepMs = Math.max(55, 120 - this.score * 2);
    this.acc += dt;
    while (this.acc >= stepMs && !this.dead) {
      this.acc -= stepMs;
      this.step();
    }
  }

  private step() {
    this.dir = this.queue.shift() ?? this.dir;
    const head = this.body[0];
    const next = {
      x: (head.x + this.dir.x + COLS) % COLS,
      y: (head.y + this.dir.y + ROWS) % ROWS,
    };
    const eating = next.x === this.food.x && next.y === this.food.y;
    const body = eating ? this.body : this.body.slice(0, -1);
    if (body.some((p) => p.x === next.x && p.y === next.y)) {
      this.dead = true;
      this.best = Math.max(this.best, this.score);
      this.host.rumble(0, 300);
      return;
    }
    this.body = [next, ...body];
    if (eating) {
      this.score++;
      this.host.rumble(0, 30);
      this.placeFood();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = PALETTE.dim;
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, TOP + y * CELL, CELL, CELL);
      }
    }

    ctx.fillStyle = PALETTE.red;
    ctx.beginPath();
    ctx.arc(
      this.food.x * CELL + CELL / 2,
      TOP + this.food.y * CELL + CELL / 2,
      CELL * 0.4,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    this.body.forEach((p, i) => {
      ctx.fillStyle = i === 0 ? PALETTE.mustard : PALETTE.ink;
      ctx.fillRect(p.x * CELL + 3, TOP + p.y * CELL + 3, CELL - 6, CELL - 6);
    });

    ctx.fillStyle = PALETTE.ink;
    ctx.font = font(700, 32, "mono");
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(`PUNTOS ${this.score}`, 30, TOP / 2);
    ctx.textAlign = "right";
    ctx.fillText(`RÉCORD ${this.best}`, W - 30, TOP / 2);

    if (this.dead) {
      ctx.fillStyle = "rgba(23,19,15,0.75)";
      ctx.fillRect(0, 0, W, H);
      centerText(ctx, "GAME OVER", H / 2 - 40, 120, PALETTE.mustard);
      centerText(ctx, "Pulsa A para jugar otra vez", H / 2 + 60, 44);
    }
  }
}

export const snake: GameDef = {
  id: "snake",
  name: "Snake",
  players: "1 jugador",
  blurb: "Come, crece y no te muerdas.",
  color: PALETTE.mustard,
  create: (host) => new Snake(host),
};
