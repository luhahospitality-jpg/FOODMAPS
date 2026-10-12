import type { Button } from "../protocol";
import {
  centerText,
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

const PADDLE_W = 22;
const PADDLE_H = 130;
const MARGIN = 40;
const BALL = 20;
const PADDLE_SPEED = 0.75; // px per ms
const AI_SPEED = 0.48;
const WIN_SCORE = 7;

class Pong implements Game {
  private paddles = [H / 2, H / 2]; // center y
  private score = [0, 0];
  private ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
  private serving = 0; // which side serves next
  private waiting = true; // ball held until the server presses A
  private winner: number | null = null;

  constructor(private host: GameHost) {
    this.resetBall();
  }

  private resetBall() {
    this.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    this.waiting = true;
  }

  private serve() {
    const dir = this.serving === 0 ? 1 : -1;
    const angle = (Math.random() - 0.5) * 0.8;
    const speed = 0.55;
    this.ball.vx = Math.cos(angle) * speed * dir;
    this.ball.vy = Math.sin(angle) * speed;
    this.waiting = false;
  }

  private isAi(player: number, input: Input) {
    return player === 1 && !input.connected(1);
  }

  press(player: number, button: Button, input: Input) {
    if (button !== "a") return;
    if (this.winner !== null) {
      this.score = [0, 0];
      this.winner = null;
      this.paddles = [H / 2, H / 2];
      this.resetBall();
      return;
    }
    // The serving side launches; when that side is the CPU, anyone can.
    if (this.waiting && (player === this.serving || this.isAi(this.serving, input))) this.serve();
  }

  update(dt: number, input: Input) {
    // Large frame gaps (tab switch, slow TV) would tunnel the ball through paddles.
    dt = Math.min(dt, 32);

    for (const p of [0, 1]) {
      let v = 0;
      if (this.isAi(p, input)) {
        const target = this.ball.vx > 0 ? this.ball.y : H / 2;
        const diff = target - this.paddles[p];
        if (Math.abs(diff) > 12) v = Math.sign(diff) * AI_SPEED;
      } else {
        if (input.held(p, "up")) v -= PADDLE_SPEED;
        if (input.held(p, "down")) v += PADDLE_SPEED;
      }
      this.paddles[p] = Math.max(
        PADDLE_H / 2,
        Math.min(H - PADDLE_H / 2, this.paddles[p] + v * dt),
      );
    }

    if (this.winner !== null) return;

    if (this.waiting) {
      if (this.isAi(this.serving, input)) this.serve();
      return;
    }

    const b = this.ball;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.y < BALL / 2) {
      b.y = BALL / 2;
      b.vy = Math.abs(b.vy);
    } else if (b.y > H - BALL / 2) {
      b.y = H - BALL / 2;
      b.vy = -Math.abs(b.vy);
    }

    for (const p of [0, 1]) {
      const px = p === 0 ? MARGIN : W - MARGIN - PADDLE_W;
      const py = this.paddles[p] - PADDLE_H / 2;
      const movingToward = p === 0 ? b.vx < 0 : b.vx > 0;
      if (
        movingToward &&
        b.x + BALL / 2 > px &&
        b.x - BALL / 2 < px + PADDLE_W &&
        b.y + BALL / 2 > py &&
        b.y - BALL / 2 < py + PADDLE_H
      ) {
        // Where it hits the paddle sets the bounce angle; each hit speeds it up a little.
        const rel = (b.y - this.paddles[p]) / (PADDLE_H / 2);
        const speed = Math.min(1.3, Math.hypot(b.vx, b.vy) * 1.06);
        const angle = rel * 0.9;
        b.vx = Math.cos(angle) * speed * (p === 0 ? 1 : -1);
        b.vy = Math.sin(angle) * speed;
        b.x = p === 0 ? px + PADDLE_W + BALL / 2 : px - BALL / 2;
        this.host.rumble(p, 25);
      }
    }

    if (b.x < -BALL || b.x > W + BALL) {
      const scorer = b.x < 0 ? 1 : 0;
      this.score[scorer]++;
      this.host.rumble(1 - scorer, 150);
      this.serving = 1 - scorer;
      if (this.score[scorer] >= WIN_SCORE) this.winner = scorer;
      this.resetBall();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = PALETTE.dim;
    for (let y = 10; y < H; y += 40) ctx.fillRect(W / 2 - 4, y, 8, 22);

    ctx.font = font(170, "mono");
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(String(this.score[0]), W / 2 - 160, 30);
    ctx.fillText(String(this.score[1]), W / 2 + 160, 30);

    ctx.fillStyle = PALETTE.orange;
    ctx.fillRect(MARGIN, this.paddles[0] - PADDLE_H / 2, PADDLE_W, PADDLE_H);
    ctx.fillStyle = PALETTE.teal;
    ctx.fillRect(W - MARGIN - PADDLE_W, this.paddles[1] - PADDLE_H / 2, PADDLE_W, PADDLE_H);

    if (this.winner === null) {
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(this.ball.x - BALL / 2, this.ball.y - BALL / 2, BALL, BALL);
    }

    if (this.winner !== null) {
      overlay(
        ctx,
        `¡GANA J${this.winner + 1}!`,
        "Pulsa A para la revancha",
        this.winner === 0 ? PALETTE.orange : PALETTE.teal,
      );
    } else if (this.waiting) {
      centerText(ctx, `J${this.serving + 1}: pulsa A para sacar`, H - 70, 36, PALETTE.amber);
    }
  }
}

export const pong: GameDef = {
  id: "pong",
  name: "Pong",
  players: "1–2 jugadores",
  blurb: "Contra la máquina o contra otro móvil.",
  color: PALETTE.yellow,
  create: (host) => new Pong(host),
};
