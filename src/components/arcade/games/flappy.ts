import type { Button } from "../protocol";
import {
  centerText,
  H,
  hud,
  overlay,
  PALETTE,
  sunset,
  text,
  W,
  type Game,
  type GameDef,
  type GameHost,
} from "./types";

const GRAVITY = 0.0021;
const FLAP = -0.62;
const BIRD_X = 300;
const BIRD = 34;
const PIPE_W = 96;
const GAP = 210;
const SPEED = 0.3;
const SPAWN_MS = 1500;
const GROUND = H - 40;

type Pipe = { x: number; gapY: number; scored: boolean };

class Flappy implements Game {
  private y = H / 2;
  private vy = 0;
  private pipes: Pipe[] = [];
  private spawnAcc = 0;
  private scroll = 0;
  private score = 0;
  private best = 0;
  private state: "ready" | "flying" | "dead" = "ready";

  constructor(private host: GameHost) {}

  private reset() {
    this.y = H / 2;
    this.vy = 0;
    this.pipes = [];
    this.spawnAcc = SPAWN_MS * 0.6;
    this.score = 0;
    this.state = "ready";
  }

  press(_player: number, button: Button) {
    if (button !== "a" && button !== "up" && button !== "b") return;
    if (this.state === "dead") {
      if (button === "a") this.reset();
      return;
    }
    this.state = "flying";
    this.vy = FLAP;
  }

  update(dt: number) {
    dt = Math.min(dt, 40);
    if (this.state !== "dead") this.scroll += dt * 0.0015;
    if (this.state === "ready") {
      this.y = H / 2 + Math.sin(performance.now() / 250) * 12;
      return;
    }
    if (this.state === "dead") return;

    this.vy += GRAVITY * dt;
    this.y += this.vy * dt;

    this.spawnAcc += dt;
    if (this.spawnAcc >= SPAWN_MS) {
      this.spawnAcc -= SPAWN_MS;
      this.pipes.push({ x: W + PIPE_W, gapY: 150 + Math.random() * (GROUND - 300 - 150) + GAP / 2, scored: false });
    }
    for (const p of this.pipes) {
      p.x -= SPEED * dt;
      if (!p.scored && p.x + PIPE_W < BIRD_X) {
        p.scored = true;
        this.score++;
        this.host.rumble(0, 15);
      }
    }
    this.pipes = this.pipes.filter((p) => p.x > -PIPE_W);

    const r = BIRD / 2 - 4;
    const hitPipe = this.pipes.some(
      (p) =>
        BIRD_X + r > p.x &&
        BIRD_X - r < p.x + PIPE_W &&
        (this.y - r < p.gapY - GAP / 2 || this.y + r > p.gapY + GAP / 2),
    );
    if (hitPipe || this.y + r > GROUND || this.y < -50) {
      this.state = "dead";
      this.best = Math.max(this.best, this.score);
      this.host.rumble(0, 300);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    sunset(ctx, GROUND - 120, this.scroll * 3);

    for (const p of this.pipes) {
      const top = p.gapY - GAP / 2;
      const bottom = p.gapY + GAP / 2;
      ctx.fillStyle = PALETTE.orange;
      ctx.fillRect(p.x, 0, PIPE_W, top);
      ctx.fillRect(p.x, bottom, PIPE_W, GROUND - bottom);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(p.x - 8, top - 26, PIPE_W + 16, 26);
      ctx.fillRect(p.x - 8, bottom, PIPE_W + 16, 26);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      for (let x = p.x + 14; x < p.x + PIPE_W; x += 22) {
        ctx.fillRect(x, 0, 6, top - 26);
        ctx.fillRect(x, bottom + 26, 6, GROUND - bottom - 26);
      }
    }

    ctx.fillStyle = PALETTE.orange;
    ctx.fillRect(0, GROUND, W, 4);

    // Bird: a chunky pixel block that tilts with its speed.
    ctx.save();
    ctx.translate(BIRD_X, this.y);
    ctx.rotate(Math.max(-0.5, Math.min(1.1, this.vy * 1.4)));
    ctx.fillStyle = PALETTE.teal;
    ctx.fillRect(-BIRD / 2, -BIRD / 2, BIRD, BIRD);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(4, -10, 10, 10);
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(9, -7, 5, 5);
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(BIRD / 2, -2, 12, 10);
    ctx.restore();

    hud(ctx, `PUNTOS ${this.score}`, `RÉCORD ${this.best}`);
    if (this.state === "ready") {
      centerText(ctx, "VUELO", H / 2 - 140, 90, PALETTE.yellow);
      text(ctx, "Pulsa A para aletear", W / 2, H / 2 + 90, 44, PALETTE.ink, "center", "mono");
    }
    if (this.state === "dead") overlay(ctx, "¡PLAF!", `Puntos: ${this.score} · A para reintentar`);
  }
}

export const flappy: GameDef = {
  id: "flappy",
  name: "Vuelo",
  players: "1 jugador",
  blurb: "Aletea con A entre las tuberías.",
  color: PALETTE.yellow,
  create: (host) => new Flappy(host),
};
