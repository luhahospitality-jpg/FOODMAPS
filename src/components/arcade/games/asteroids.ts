import type { Button } from "../protocol";
import {
  H,
  hud,
  overlay,
  PALETTE,
  W,
  type Game,
  type GameDef,
  type GameHost,
  type Input,
} from "./types";

const TURN = 0.0045; // rad per ms
const THRUST = 0.0005; // px per ms²
const MAX_SPEED = 0.6;
const BULLET_SPEED = 0.8;
const BULLET_LIFE = 900;
const SHIP_R = 18;
const SIZES = [64, 34, 18];
const POINTS = [20, 50, 100];

type Rock = { x: number; y: number; vx: number; vy: number; size: number; shape: number[]; spin: number; a: number };
type Bullet = { x: number; y: number; vx: number; vy: number; life: number };

function wrap(v: number, max: number) {
  return ((v % max) + max) % max;
}

class Asteroids implements Game {
  private ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0 };
  private rocks: Rock[] = [];
  private bullets: Bullet[] = [];
  private cooldown = 0;
  private invulnerable = 0;
  private thrusting = false;
  private lives = 3;
  private score = 0;
  private best = 0;
  private wave = 0;
  private dead = false;

  constructor(private host: GameHost) {
    this.reset();
  }

  private reset() {
    this.lives = 3;
    this.score = 0;
    this.wave = 0;
    this.dead = false;
    this.bullets = [];
    this.respawn();
    this.nextWave();
  }

  private respawn() {
    this.ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0 };
    this.invulnerable = 2500;
  }

  private nextWave() {
    this.wave++;
    this.rocks = [];
    for (let i = 0; i < 3 + this.wave; i++) {
      // Spawn along the edges, away from the ship in the middle.
      const edge = Math.random() < 0.5;
      this.rocks.push(
        this.rock(edge ? Math.random() * W : 0, edge ? 0 : Math.random() * H, 0),
      );
    }
  }

  private rock(x: number, y: number, size: number): Rock {
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.05 + Math.random() * 0.08) * (1 + size * 0.5) * (1 + this.wave * 0.05);
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      shape: Array.from({ length: 11 }, () => 0.75 + Math.random() * 0.35),
      spin: (Math.random() - 0.5) * 0.002,
      a: 0,
    };
  }

  press(_player: number, button: Button) {
    if (this.dead) {
      if (button === "a") this.reset();
      return;
    }
    if (button === "a") this.fire();
    if (button === "b") {
      // Hyperspace: jump somewhere random and hope for the best.
      this.ship.x = Math.random() * W;
      this.ship.y = Math.random() * H;
      this.ship.vx = this.ship.vy = 0;
    }
  }

  private fire() {
    if (this.cooldown > 0 || this.bullets.length >= 6) return;
    const { x, y, a, vx, vy } = this.ship;
    this.bullets.push({
      x: x + Math.cos(a) * SHIP_R,
      y: y + Math.sin(a) * SHIP_R,
      vx: vx + Math.cos(a) * BULLET_SPEED,
      vy: vy + Math.sin(a) * BULLET_SPEED,
      life: BULLET_LIFE,
    });
    this.cooldown = 160;
  }

  update(dt: number, input: Input) {
    if (this.dead) return;
    dt = Math.min(dt, 48);
    const s = this.ship;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);

    if (input.anyHeld("left")) s.a -= TURN * dt;
    if (input.anyHeld("right")) s.a += TURN * dt;
    this.thrusting = input.anyHeld("up");
    if (this.thrusting) {
      s.vx += Math.cos(s.a) * THRUST * dt;
      s.vy += Math.sin(s.a) * THRUST * dt;
    }
    if (input.anyHeld("a")) this.fire(); // hold A for autofire
    const speed = Math.hypot(s.vx, s.vy);
    if (speed > MAX_SPEED) {
      s.vx *= MAX_SPEED / speed;
      s.vy *= MAX_SPEED / speed;
    }
    const drag = Math.pow(0.9994, dt);
    s.vx *= drag;
    s.vy *= drag;
    s.x = wrap(s.x + s.vx * dt, W);
    s.y = wrap(s.y + s.vy * dt, H);

    for (const r of this.rocks) {
      r.x = wrap(r.x + r.vx * dt, W);
      r.y = wrap(r.y + r.vy * dt, H);
      r.a += r.spin * dt;
    }
    for (const b of this.bullets) {
      b.x = wrap(b.x + b.vx * dt, W);
      b.y = wrap(b.y + b.vy * dt, H);
      b.life -= dt;
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);

    const spawned: Rock[] = [];
    this.rocks = this.rocks.filter((r) => {
      const radius = SIZES[r.size];
      const hit = this.bullets.find((b) => Math.hypot(b.x - r.x, b.y - r.y) < radius);
      if (!hit) return true;
      hit.life = 0;
      this.score += POINTS[r.size];
      this.host.rumble(0, 20 + (2 - r.size) * 20);
      if (r.size < 2) spawned.push(this.rock(r.x, r.y, r.size + 1), this.rock(r.x, r.y, r.size + 1));
      return false;
    });
    this.rocks.push(...spawned);
    this.bullets = this.bullets.filter((b) => b.life > 0);

    if (this.invulnerable === 0) {
      const crashed = this.rocks.some((r) => Math.hypot(r.x - s.x, r.y - s.y) < SIZES[r.size] * 0.85 + SHIP_R * 0.6);
      if (crashed) {
        this.lives--;
        this.host.rumble(0, 400);
        if (this.lives <= 0) {
          this.dead = true;
          this.best = Math.max(this.best, this.score);
        } else {
          this.respawn();
        }
      }
    }

    if (this.rocks.length === 0) this.nextWave();
  }

  private shipPath(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, scale = 1) {
    const pt = (ang: number, r: number) => [x + Math.cos(a + ang) * r * scale, y + Math.sin(a + ang) * r * scale];
    ctx.beginPath();
    ctx.moveTo(...(pt(0, SHIP_R * 1.3) as [number, number]));
    ctx.lineTo(...(pt(2.5, SHIP_R) as [number, number]));
    ctx.lineTo(...(pt(Math.PI, SHIP_R * 0.45) as [number, number]));
    ctx.lineTo(...(pt(-2.5, SHIP_R) as [number, number]));
    ctx.closePath();
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";

    ctx.strokeStyle = PALETTE.amber;
    for (const r of this.rocks) {
      const radius = SIZES[r.size];
      ctx.beginPath();
      r.shape.forEach((k, i) => {
        const ang = r.a + (i / r.shape.length) * Math.PI * 2;
        const px = r.x + Math.cos(ang) * radius * k;
        const py = r.y + Math.sin(ang) * radius * k;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
    }

    const s = this.ship;
    if (!this.dead && (this.invulnerable === 0 || Math.floor(this.invulnerable / 120) % 2 === 0)) {
      ctx.strokeStyle = PALETTE.orange;
      this.shipPath(ctx, s.x, s.y, s.a);
      ctx.stroke();
      if (this.thrusting && Math.random() > 0.3) {
        ctx.strokeStyle = PALETTE.red;
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(s.a + 2.7) * SHIP_R * 0.7, s.y + Math.sin(s.a + 2.7) * SHIP_R * 0.7);
        ctx.lineTo(s.x + Math.cos(s.a + Math.PI) * SHIP_R * 1.5, s.y + Math.sin(s.a + Math.PI) * SHIP_R * 1.5);
        ctx.lineTo(s.x + Math.cos(s.a - 2.7) * SHIP_R * 0.7, s.y + Math.sin(s.a - 2.7) * SHIP_R * 0.7);
        ctx.stroke();
      }
    }

    ctx.fillStyle = PALETTE.ink;
    for (const b of this.bullets) ctx.fillRect(b.x - 3, b.y - 3, 6, 6);

    hud(ctx, `PUNTOS ${this.score}`, `VIDAS ${"♥".repeat(Math.max(0, this.lives))}`, `OLEADA ${this.wave}`);
    if (this.dead) overlay(ctx, "GAME OVER", `Récord: ${this.best} · A para reintentar`);
  }
}

export const asteroids: GameDef = {
  id: "asteroids",
  name: "Asteroides",
  players: "1 jugador",
  blurb: "◀ ▶ girar, ▲ propulsar, A disparar, B hiperespacio.",
  color: PALETTE.amber,
  create: (host) => new Asteroids(host),
};
