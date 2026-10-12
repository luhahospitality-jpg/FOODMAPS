import type { Button } from "../protocol";
import {
  BANDS,
  H,
  hud,
  overlay,
  PALETTE,
  rectsOverlap,
  W,
  type Game,
  type GameDef,
  type GameHost,
  type Input,
} from "./types";

const ROWS = 5;
const COLS = 11;
const PX = 5; // sprite pixel size
const SPRITE_W = 11 * PX;
const SPRITE_H = 8 * PX;
const GAP_X = 78;
const GAP_Y = 56;
const SHIP_Y = H - 70;
const SHIP_W = 64;

// Two animation frames per alien type, 11x8 bitmaps.
const SPRITES = [
  [
    ["....##.....", "...####....", "..######...", ".##.##.##..", ".########..", "...#..#....", "..#.##.#...", ".#.#..#.#.."],
    ["....##.....", "...####....", "..######...", ".##.##.##..", ".########..", "..#.##.#...", ".#......#..", "..#....#..."],
  ],
  [
    ["..#.....#..", "...#...#...", "..#######..", ".##.###.##.", "###########", "#.#######.#", "#.#.....#.#", "...##.##..."],
    ["..#.....#..", "#..#...#..#", "#.#######.#", "###.###.###", "###########", ".#########.", "..#.....#..", ".#.......#."],
  ],
  [
    ["...#####...", ".#########.", "###########", "###..#..###", "###########", "...##.##...", "..##.#.##..", "##.......##"],
    ["...#####...", ".#########.", "###########", "###..#..###", "###########", "..###.###..", ".##..#..##.", "..##...##.."],
  ],
];
const ROW_TYPE = [0, 1, 1, 2, 2];
const ROW_POINTS = [40, 20, 20, 10, 10];

type Shot = { x: number; y: number };

class Invaders implements Game {
  private alive: boolean[][] = [];
  private ox = 0;
  private oy = 0;
  private dir = 1;
  private stepAcc = 0;
  private frame = 0;
  private ship = W / 2;
  private shot: Shot | null = null;
  private bombs: Shot[] = [];
  private bombAcc = 0;
  private lives = 3;
  private score = 0;
  private best = 0;
  private wave = 1;
  private dead = false;
  private hitFlash = 0;

  constructor(private host: GameHost) {
    this.reset();
  }

  private reset() {
    this.lives = 3;
    this.score = 0;
    this.wave = 1;
    this.dead = false;
    this.newWave();
  }

  private newWave() {
    this.alive = Array.from({ length: ROWS }, () => Array(COLS).fill(true));
    this.ox = 140;
    this.oy = 100 + Math.min(5, this.wave - 1) * 20;
    this.dir = 1;
    this.shot = null;
    this.bombs = [];
  }

  private aliveCount() {
    return this.alive.reduce((n, row) => n + row.filter(Boolean).length, 0);
  }

  press(_player: number, button: Button) {
    if (this.dead) {
      if (button === "a") this.reset();
      return;
    }
    if ((button === "a" || button === "b" || button === "up") && !this.shot) {
      this.shot = { x: this.ship, y: SHIP_Y - 20 };
    }
  }

  update(dt: number, input: Input) {
    if (this.dead) return;
    dt = Math.min(dt, 48);
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    if (input.anyHeld("left")) this.ship -= 0.6 * dt;
    if (input.anyHeld("right")) this.ship += 0.6 * dt;
    this.ship = Math.max(SHIP_W / 2 + 10, Math.min(W - SHIP_W / 2 - 10, this.ship));

    // The formation steps faster as it thins out, like the original.
    const count = this.aliveCount();
    const interval = Math.max(40, 18 + count * 13 - this.wave * 25);
    this.stepAcc += dt;
    while (this.stepAcc >= interval) {
      this.stepAcc -= interval;
      this.stepFormation();
    }

    if (this.shot) {
      this.shot.y -= 1.1 * dt;
      if (this.shot.y < 60) this.shot = null;
      else this.checkShot();
    }

    this.bombAcc += dt;
    const bombEvery = Math.max(250, 900 - this.wave * 100);
    if (this.bombAcc > bombEvery) {
      this.bombAcc = 0;
      this.dropBomb();
    }
    for (const b of this.bombs) b.y += (0.32 + this.wave * 0.03) * dt;
    this.bombs = this.bombs.filter((b) => {
      if (b.y > H) return false;
      if (this.hitFlash === 0 && rectsOverlap(b.x - 3, b.y - 10, 6, 20, this.ship - SHIP_W / 2, SHIP_Y - 14, SHIP_W, 30)) {
        this.loseLife();
        return false;
      }
      return true;
    });
  }

  private loseLife() {
    this.lives--;
    this.hitFlash = 1500;
    this.host.rumble(0, 300);
    if (this.lives <= 0) this.gameOver();
  }

  private gameOver() {
    this.dead = true;
    this.best = Math.max(this.best, this.score);
  }

  private stepFormation() {
    this.frame ^= 1;
    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    this.alive.forEach((row, r) =>
      row.forEach((on, c) => {
        if (!on) return;
        minX = Math.min(minX, this.ox + c * GAP_X);
        maxX = Math.max(maxX, this.ox + c * GAP_X + SPRITE_W);
        maxY = Math.max(maxY, this.oy + r * GAP_Y + SPRITE_H);
      }),
    );
    if ((this.dir > 0 && maxX + 14 > W - 20) || (this.dir < 0 && minX - 14 < 20)) {
      this.dir = -this.dir;
      this.oy += 24;
    } else {
      this.ox += 14 * this.dir;
    }
    if (maxY + 24 >= SHIP_Y - 20) this.gameOver();
  }

  private checkShot() {
    const s = this.shot!;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!this.alive[r][c]) continue;
        const x = this.ox + c * GAP_X;
        const y = this.oy + r * GAP_Y;
        if (rectsOverlap(s.x - 2, s.y - 12, 4, 24, x, y, SPRITE_W, SPRITE_H)) {
          this.alive[r][c] = false;
          this.shot = null;
          this.score += ROW_POINTS[r];
          this.host.rumble(0, 20);
          if (this.aliveCount() === 0) {
            this.wave++;
            this.newWave();
          }
          return;
        }
      }
    }
  }

  private dropBomb() {
    // Only the lowest alien of each column can fire.
    const shooters: [number, number][] = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.alive[r][c]) {
          shooters.push([r, c]);
          break;
        }
      }
    }
    if (!shooters.length) return;
    const [r, c] = shooters[Math.floor(Math.random() * shooters.length)];
    this.bombs.push({ x: this.ox + c * GAP_X + SPRITE_W / 2, y: this.oy + r * GAP_Y + SPRITE_H });
  }

  private sprite(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, color: string) {
    ctx.fillStyle = color;
    rows.forEach((line, j) => {
      for (let i = 0; i < line.length; i++) if (line[i] === "#") ctx.fillRect(x + i * PX, y + j * PX, PX, PX);
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, W, H);

    this.alive.forEach((row, r) =>
      row.forEach((on, c) => {
        if (on) {
          this.sprite(ctx, SPRITES[ROW_TYPE[r]][this.frame], this.ox + c * GAP_X, this.oy + r * GAP_Y, BANDS[r]);
        }
      }),
    );

    if (this.hitFlash === 0 || Math.floor(this.hitFlash / 120) % 2 === 0) {
      ctx.fillStyle = PALETTE.teal;
      ctx.fillRect(this.ship - SHIP_W / 2, SHIP_Y, SHIP_W, 16);
      ctx.fillRect(this.ship - SHIP_W / 2 + 8, SHIP_Y - 8, SHIP_W - 16, 8);
      ctx.fillRect(this.ship - 5, SHIP_Y - 20, 10, 12);
    }

    ctx.fillStyle = PALETTE.ink;
    if (this.shot) ctx.fillRect(this.shot.x - 2, this.shot.y - 12, 4, 24);
    ctx.fillStyle = PALETTE.red;
    for (const b of this.bombs) ctx.fillRect(b.x - 3, b.y - 10, 6, 20);

    ctx.fillStyle = PALETTE.orange;
    ctx.fillRect(0, H - 30, W, 3);

    hud(ctx, `PUNTOS ${this.score}`, `VIDAS ${"♥".repeat(Math.max(0, this.lives))}`, `OLEADA ${this.wave}`);
    if (this.dead) overlay(ctx, "INVADIDOS", `Puntos: ${this.score} · Récord: ${this.best} · A para reintentar`);
  }
}

export const invaders: GameDef = {
  id: "invaders",
  name: "Invasores",
  players: "1 jugador",
  blurb: "Defiende la Tierra disparando con A.",
  color: PALETTE.green,
  create: (host) => new Invaders(host),
};
