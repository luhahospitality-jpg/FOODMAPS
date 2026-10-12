import type { Button } from "../protocol";
import {
  BANDS,
  H,
  hud,
  overlay,
  PALETTE,
  text,
  W,
  type Game,
  type GameDef,
  type GameHost,
  type Input,
} from "./types";

const PADDLE_W = 170;
const PADDLE_H = 18;
const PADDLE_Y = H - 50;
const BALL = 14;
const COLS = 12;
const ROWS = 6;
const BRICK_TOP = 110;
const BRICK_H = 30;
const SIDE = 40;
const BRICK_W = (W - SIDE * 2) / COLS;
const SUBSTEP = 8; // ms; small steps keep the ball from tunnelling through bricks

class Breakout implements Game {
  private paddle = W / 2;
  private ball = { x: 0, y: 0, vx: 0, vy: 0 };
  private stuck = true;
  private bricks: boolean[][] = [];
  private lives = 3;
  private score = 0;
  private best = 0;
  private level = 1;
  private dead = false;

  constructor(private host: GameHost) {
    this.reset();
  }

  private reset() {
    this.lives = 3;
    this.score = 0;
    this.level = 1;
    this.dead = false;
    this.build();
  }

  private build() {
    this.bricks = Array.from({ length: ROWS }, () => Array(COLS).fill(true));
    this.stuck = true;
  }

  private launch() {
    const speed = 0.5 + this.level * 0.05;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    this.ball.vx = Math.cos(angle) * speed;
    this.ball.vy = Math.sin(angle) * speed;
    this.stuck = false;
  }

  press(_player: number, button: Button) {
    if (this.dead) {
      if (button === "a") this.reset();
      return;
    }
    if (this.stuck && (button === "a" || button === "up")) this.launch();
  }

  private brickAt(x: number, y: number): [number, number] | null {
    const c = Math.floor((x - SIDE) / BRICK_W);
    const r = Math.floor((y - BRICK_TOP) / BRICK_H);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || !this.bricks[r][c]) return null;
    return [r, c];
  }

  private hit([r, c]: [number, number]) {
    this.bricks[r][c] = false;
    this.score += (ROWS - r) * 10;
    this.host.rumble(0, 15);
    if (this.bricks.every((row) => row.every((b) => !b))) {
      this.level++;
      this.build();
    }
  }

  update(dt: number, input: Input) {
    if (this.dead) return;
    dt = Math.min(dt, 48);
    const speed = 1.0;
    if (input.anyHeld("left")) this.paddle -= speed * dt;
    if (input.anyHeld("right")) this.paddle += speed * dt;
    this.paddle = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, this.paddle));

    if (this.stuck) {
      this.ball.x = this.paddle;
      this.ball.y = PADDLE_Y - BALL;
      return;
    }

    for (let left = dt; left > 0 && !this.stuck; left -= SUBSTEP) {
      this.step(Math.min(SUBSTEP, left));
    }
  }

  private step(dt: number) {
    const b = this.ball;
    b.x += b.vx * dt;
    let brick = this.brickAt(b.x, b.y);
    if (brick) {
      b.vx = -b.vx;
      b.x += b.vx * dt;
      this.hit(brick);
    }
    b.y += b.vy * dt;
    brick = this.brickAt(b.x, b.y);
    if (brick) {
      b.vy = -b.vy;
      b.y += b.vy * dt;
      this.hit(brick);
    }

    if (b.x < BALL / 2 || b.x > W - BALL / 2) {
      b.vx = -b.vx;
      b.x = Math.max(BALL / 2, Math.min(W - BALL / 2, b.x));
    }
    if (b.y < 70 + BALL / 2) {
      b.vy = Math.abs(b.vy);
    }

    if (
      b.vy > 0 &&
      b.y + BALL / 2 >= PADDLE_Y &&
      b.y - BALL / 2 <= PADDLE_Y + PADDLE_H &&
      Math.abs(b.x - this.paddle) <= PADDLE_W / 2 + BALL / 2
    ) {
      // Edge hits bounce wider; every hit adds a touch of speed.
      const rel = (b.x - this.paddle) / (PADDLE_W / 2);
      const speed = Math.min(1.1, Math.hypot(b.vx, b.vy) * 1.015);
      const angle = -Math.PI / 2 + rel * 1.05;
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
      b.y = PADDLE_Y - BALL / 2;
      this.host.rumble(0, 10);
    }

    if (b.y > H + BALL) {
      this.lives--;
      this.host.rumble(0, 250);
      if (this.lives <= 0) {
        this.dead = true;
        this.best = Math.max(this.best, this.score);
      }
      this.stuck = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, W, H);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!this.bricks[r][c]) continue;
        const x = SIDE + c * BRICK_W;
        const y = BRICK_TOP + r * BRICK_H;
        ctx.fillStyle = BANDS[r];
        ctx.fillRect(x + 3, y + 3, BRICK_W - 6, BRICK_H - 6);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(x + 3, y + BRICK_H - 9, BRICK_W - 6, 6);
      }
    }

    ctx.fillStyle = PALETTE.orange;
    ctx.fillRect(this.paddle - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(this.ball.x - BALL / 2, this.ball.y - BALL / 2, BALL, BALL);

    hud(ctx, `PUNTOS ${this.score}`, `VIDAS ${"♥".repeat(Math.max(0, this.lives))}`, `NIVEL ${this.level}`);

    if (this.dead) overlay(ctx, "GAME OVER");
    else if (this.stuck) text(ctx, "Pulsa A para lanzar", W / 2, H - 120, 40, PALETTE.amber, "center", "mono");
  }
}

export const breakout: GameDef = {
  id: "breakout",
  name: "Ladrillos",
  players: "1 jugador",
  blurb: "Rompe el muro con la pelota.",
  color: PALETTE.red,
  create: (host) => new Breakout(host),
};
