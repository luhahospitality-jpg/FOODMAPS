import type { Button } from "../protocol";
import {
  centerText,
  H,
  hud,
  overlay,
  PALETTE,
  rectsOverlap,
  text,
  W,
  type Game,
  type GameDef,
  type GameHost,
  type Input,
} from "./types";

const LANES = 4;
const ROAD_W = 560;
const ROAD_X = (W - ROAD_W) / 2;
const LANE_W = ROAD_W / LANES;
const CAR_W = 70;
const CAR_H = 120;
const CAR_Y = H - CAR_H - 30;
const TRAFFIC_COLORS = [PALETTE.teal, PALETTE.red, PALETTE.yellow, "#ff5ad1", PALETTE.green];

type Car = { x: number; y: number; speed: number; color: string };

class Racer implements Game {
  private x = W / 2;
  private speed = 0.4; // px per ms of road scroll
  private road = 0;
  private traffic: Car[] = [];
  private spawnAcc = 0;
  private distance = 0;
  private best = 0;
  private state: "ready" | "driving" | "crashed" = "ready";

  constructor(private host: GameHost) {}

  private reset() {
    this.x = W / 2;
    this.speed = 0.4;
    this.traffic = [];
    this.spawnAcc = 0;
    this.distance = 0;
    this.state = "driving";
  }

  press(_player: number, button: Button) {
    if (button !== "a") return;
    if (this.state !== "driving") this.reset();
  }

  update(dt: number, input: Input) {
    dt = Math.min(dt, 40);
    if (this.state !== "driving") {
      this.road = (this.road + 0.15 * dt) % 80;
      return;
    }

    // Speed creeps up over time; ▲ boosts (more points), ▼ brakes.
    const base = 0.45 + Math.min(0.6, this.distance / 60000);
    const target = input.anyHeld("up") ? base * 1.5 : input.anyHeld("down") ? base * 0.55 : base;
    this.speed += (target - this.speed) * Math.min(1, dt / 250);

    if (input.anyHeld("left")) this.x -= 0.55 * dt;
    if (input.anyHeld("right")) this.x += 0.55 * dt;
    this.x = Math.max(ROAD_X + CAR_W / 2 + 6, Math.min(ROAD_X + ROAD_W - CAR_W / 2 - 6, this.x));

    this.road = (this.road + this.speed * dt) % 80;
    this.distance += this.speed * dt;

    this.spawnAcc += dt * this.speed;
    if (this.spawnAcc > 260) {
      this.spawnAcc = 0;
      const lane = Math.floor(Math.random() * LANES);
      const x = ROAD_X + lane * LANE_W + LANE_W / 2;
      const blocked = this.traffic.some((c) => Math.abs(c.x - x) < 5 && c.y < CAR_H * 1.5);
      if (!blocked) {
        this.traffic.push({
          x,
          y: -CAR_H,
          speed: 0.12 + Math.random() * 0.15,
          color: TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)],
        });
      }
    }
    for (const c of this.traffic) c.y += (this.speed - c.speed) * dt;
    this.traffic = this.traffic.filter((c) => c.y < H + CAR_H);

    const crash = this.traffic.some((c) =>
      rectsOverlap(c.x - CAR_W / 2 + 6, c.y + 6, CAR_W - 12, CAR_H - 12, this.x - CAR_W / 2 + 6, CAR_Y + 6, CAR_W - 12, CAR_H - 12),
    );
    if (crash) {
      this.state = "crashed";
      this.best = Math.max(this.best, this.points());
      this.host.rumble(0, 500);
    }
  }

  private points() {
    return Math.floor(this.distance / 100);
  }

  private car(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, player = false) {
    const left = x - CAR_W / 2;
    ctx.fillStyle = "#000";
    ctx.fillRect(left - 6, y + 14, 8, 30);
    ctx.fillRect(left + CAR_W - 2, y + 14, 8, 30);
    ctx.fillRect(left - 6, y + CAR_H - 44, 8, 30);
    ctx.fillRect(left + CAR_W - 2, y + CAR_H - 44, 8, 30);
    ctx.fillStyle = color;
    ctx.fillRect(left, y, CAR_W, CAR_H);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(left + 10, y + (player ? 26 : 70), CAR_W - 20, 24);
    ctx.fillStyle = player ? PALETTE.yellow : PALETTE.red;
    ctx.fillRect(left + 6, player ? y : y + CAR_H - 8, 14, 8);
    ctx.fillRect(left + CAR_W - 20, player ? y : y + CAR_H - 8, 14, 8);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.dimmer;
    ctx.fillRect(0, 0, W, H);
    // Roadside stripes scroll with the road to sell the speed.
    for (let y = -80 + this.road; y < H; y += 80) {
      ctx.fillStyle = PALETTE.orange;
      ctx.fillRect(ROAD_X - 24, y, 16, 40);
      ctx.fillRect(ROAD_X + ROAD_W + 8, y, 16, 40);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(ROAD_X - 24, y + 40, 16, 40);
      ctx.fillRect(ROAD_X + ROAD_W + 8, y + 40, 16, 40);
    }
    ctx.fillStyle = "#1b1410";
    ctx.fillRect(ROAD_X, 0, ROAD_W, H);
    ctx.fillStyle = "#ffb81c88";
    for (let l = 1; l < LANES; l++) {
      for (let y = -80 + this.road; y < H; y += 80) ctx.fillRect(ROAD_X + l * LANE_W - 3, y, 6, 44);
    }

    for (const c of this.traffic) this.car(ctx, c.x, c.y, c.color);
    this.car(ctx, this.x, CAR_Y, PALETTE.orange, true);

    hud(ctx, `PUNTOS ${this.points()}`, `RÉCORD ${this.best}`);
    text(ctx, `${Math.round(this.speed * 400)} KM/H`, 30, H - 40, 40, PALETTE.amber, "left", "mono");

    if (this.state === "ready") {
      centerText(ctx, "CARRETERA", H / 2 - 60, 90, PALETTE.yellow);
      text(ctx, "◀ ▶ volante · ▲ turbo · ▼ freno", W / 2, H / 2 + 30, 40, PALETTE.ink, "center", "mono");
      text(ctx, "Pulsa A para arrancar", W / 2, H / 2 + 90, 40, PALETTE.amber, "center", "mono");
    }
    if (this.state === "crashed") overlay(ctx, "¡CHOQUE!", `Puntos: ${this.points()} · A para reintentar`);
  }
}

export const racer: GameDef = {
  id: "racer",
  name: "Carretera",
  players: "1 jugador",
  blurb: "Esquiva el tráfico a toda velocidad.",
  color: "#ff5a1f",
  create: (host) => new Racer(host),
};
