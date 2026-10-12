import type { Button } from "../protocol";
import {
  centerText,
  H,
  overlay,
  PALETTE,
  text,
  W,
  type Game,
  type GameDef,
  type GameHost,
  type Input,
} from "./types";

const CELL = 16;
const COLS = W / CELL;
const TOP = 4; // rows reserved for the score bar
const ROWS = H / CELL;
const STEP_MS = 55;
const WIN_ROUNDS = 5;
const COLORS = [PALETTE.orange, PALETTE.teal];

type Dir = { x: number; y: number };
const DIRS: Partial<Record<Button, Dir>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

type Bike = { x: number; y: number; dir: Dir; next: Dir | null; alive: boolean };

class Tron implements Game {
  private grid = new Uint8Array(COLS * ROWS); // 0 empty, 1/2 trail owner, 3 wall
  private bikes: Bike[] = [];
  private acc = 0;
  private wins = [0, 0];
  private roundOver = false;
  private roundWinner: number | null = null; // -1 for a draw
  private matchOver = false;
  private countdown = 0;

  constructor(private host: GameHost) {
    this.newRound();
  }

  private newRound() {
    this.grid.fill(0);
    for (let x = 0; x < COLS; x++) {
      this.grid[TOP * COLS + x] = 3;
      this.grid[(ROWS - 1) * COLS + x] = 3;
    }
    for (let y = TOP; y < ROWS; y++) {
      this.grid[y * COLS] = 3;
      this.grid[y * COLS + COLS - 1] = 3;
    }
    const midY = Math.floor((TOP + ROWS) / 2);
    this.bikes = [
      { x: 10, y: midY, dir: { x: 1, y: 0 }, next: null, alive: true },
      { x: COLS - 11, y: midY, dir: { x: -1, y: 0 }, next: null, alive: true },
    ];
    this.bikes.forEach((b, i) => (this.grid[b.y * COLS + b.x] = i + 1));
    this.roundOver = false;
    this.roundWinner = null;
    this.countdown = 1500;
    this.acc = 0;
  }

  private free(x: number, y: number) {
    return x >= 0 && x < COLS && y >= 0 && y < ROWS && this.grid[y * COLS + x] === 0;
  }

  press(player: number, button: Button, input: Input) {
    if (this.roundOver) {
      if (button !== "a") return;
      if (this.matchOver) {
        this.wins = [0, 0];
        this.matchOver = false;
      }
      this.newRound();
      return;
    }
    // With one phone, player 1 drives the orange bike; the CPU drives teal.
    const who = player === 1 && input.connected(1) ? 1 : 0;
    const d = DIRS[button];
    const bike = this.bikes[who];
    if (!d) return;
    if (d.x === -bike.dir.x && d.y === -bike.dir.y) return;
    bike.next = d;
  }

  private ai(bike: Bike) {
    // Look ahead in each direction and steer towards the most open space, with some randomness.
    const options = Object.values(DIRS).filter((d) => !(d.x === -bike.dir.x && d.y === -bike.dir.y));
    const reach = (d: Dir) => {
      let n = 0;
      let x = bike.x;
      let y = bike.y;
      while (n < 25) {
        x += d.x;
        y += d.y;
        if (!this.free(x, y)) break;
        n++;
      }
      return n;
    };
    const ahead = reach(bike.dir);
    if (ahead > 6 && Math.random() > 0.03) return;
    let best = bike.dir;
    let bestScore = ahead;
    for (const d of options) {
      const score = reach(d) + Math.random() * 3;
      if (score > bestScore) {
        best = d;
        bestScore = score;
      }
    }
    bike.next = best;
  }

  update(dt: number, input: Input) {
    if (this.roundOver) return;
    if (this.countdown > 0) {
      this.countdown -= dt;
      return;
    }
    this.acc += dt;
    while (this.acc >= STEP_MS && !this.roundOver) {
      this.acc -= STEP_MS;
      if (!input.connected(1)) this.ai(this.bikes[1]);
      this.step();
    }
  }

  private step() {
    const targets = this.bikes.map((b) => {
      if (b.next) {
        b.dir = b.next;
        b.next = null;
      }
      return { x: b.x + b.dir.x, y: b.y + b.dir.y };
    });
    const headOn = targets[0].x === targets[1].x && targets[0].y === targets[1].y;
    this.bikes.forEach((b, i) => {
      const t = targets[i];
      if (headOn || !this.free(t.x, t.y)) {
        b.alive = false;
        this.host.rumble(i, 400);
      } else {
        b.x = t.x;
        b.y = t.y;
        this.grid[t.y * COLS + t.x] = i + 1;
      }
    });
    const alive = this.bikes.map((b) => b.alive);
    if (alive[0] && alive[1]) return;
    this.roundOver = true;
    this.roundWinner = alive[0] ? 0 : alive[1] ? 1 : -1;
    if (this.roundWinner >= 0) {
      this.wins[this.roundWinner]++;
      if (this.wins[this.roundWinner] >= WIN_ROUNDS) this.matchOver = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = PALETTE.dimmer;
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += CELL * 4) {
      ctx.beginPath();
      ctx.moveTo(x, TOP * CELL);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = TOP * CELL; y <= H; y += CELL * 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    for (let i = 0; i < this.grid.length; i++) {
      const v = this.grid[i];
      if (!v) continue;
      ctx.fillStyle = v === 3 ? PALETTE.dim : COLORS[v - 1];
      ctx.fillRect((i % COLS) * CELL, Math.floor(i / COLS) * CELL, CELL, CELL);
    }
    this.bikes.forEach((b, i) => {
      ctx.fillStyle = b.alive ? PALETTE.ink : PALETTE.red;
      ctx.fillRect(b.x * CELL - 3, b.y * CELL - 3, CELL + 6, CELL + 6);
      ctx.fillStyle = COLORS[i];
      ctx.fillRect(b.x * CELL + 2, b.y * CELL + 2, CELL - 4, CELL - 4);
    });

    text(ctx, `J1  ${this.wins[0]}`, 30, 32, 40, COLORS[0], "left", "mono");
    text(ctx, `${this.wins[1]}  J2`, W - 30, 32, 40, COLORS[1], "right", "mono");
    text(ctx, `A ${WIN_ROUNDS} RONDAS`, W / 2, 32, 34, PALETTE.amber, "center", "mono");

    if (this.countdown > 0 && !this.roundOver) {
      centerText(ctx, String(Math.ceil(this.countdown / 500)), H / 2, 120, PALETTE.yellow);
    }
    if (this.roundOver) {
      const w = this.roundWinner;
      const title = w === -1 ? "EMPATE" : this.matchOver ? `¡J${w! + 1} GANA!` : `RONDA PARA J${w! + 1}`;
      overlay(
        ctx,
        title,
        this.matchOver ? "Pulsa A para otra partida" : "Pulsa A para la siguiente ronda",
        w === -1 ? PALETTE.ink : COLORS[w!],
      );
    }
  }
}

export const tron: GameDef = {
  id: "tron",
  name: "Motos de luz",
  players: "1–2 jugadores",
  blurb: "Encierra al rival con tu estela.",
  color: PALETTE.teal,
  create: (host) => new Tron(host),
};
