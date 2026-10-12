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

// # wall · . pellet · o power pellet · P player start · G ghost start · space empty
const MAZE = [
  "###################",
  "#........#........#",
  "#o##.###.#.###.##o#",
  "#.................#",
  "#.##.#.#####.#.##.#",
  "#....#...#...#....#",
  "####.###.#.###.####",
  "   #.#.......#.#   ",
  "####.#.## ##.#.####",
  "    ...#GGG#...    ",
  "####.#.#####.#.####",
  "   #.#.......#.#   ",
  "####.#.#####.#.####",
  "#........#........#",
  "#.##.###.#.###.##.#",
  "#o.#.....P.....#.o#",
  "##.#.#.#####.#.#.##",
  "#....#...#...#....#",
  "#.######.#.######.#",
  "#.................#",
  "###################",
];
const COLS = MAZE[0].length;
const ROWS = MAZE.length;
const CELL = 31;
const OX = (W - COLS * CELL) / 2;
const OY = 64 + (H - 64 - ROWS * CELL) / 2;
const DOOR = { x: 9, y: 7 };
const FRIGHT_MS = 6000;
const GHOST_COLORS = [PALETTE.red, "#ff5ad1", PALETTE.teal, PALETTE.amber];

type Dir = { x: number; y: number };
const NONE: Dir = { x: 0, y: 0 };
const DIRS: Record<"up" | "down" | "left" | "right", Dir> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Moves cell to cell; t is progress (0..1) from (cx, cy) towards the next cell in dir. */
type Mover = { cx: number; cy: number; dir: Dir; t: number };
type Ghost = Mover & {
  home: { x: number; y: number };
  color: string;
  releaseAt: number;
  eaten: boolean;
};

function find(ch: string) {
  const out: { x: number; y: number }[] = [];
  MAZE.forEach((row, y) => [...row].forEach((c, x) => c === ch && out.push({ x, y })));
  return out;
}

function wrapX(x: number) {
  return (x + COLS) % COLS;
}

function open(x: number, y: number) {
  return y >= 0 && y < ROWS && MAZE[y][wrapX(x)] !== "#";
}

function same(a: Dir, b: Dir) {
  return a.x === b.x && a.y === b.y;
}

class Pacman implements Game {
  private pellets = new Set<number>();
  private power = new Set<number>();
  private pac: Mover = { cx: 0, cy: 0, dir: NONE, t: 0 };
  private wanted: Dir = NONE;
  private ghosts: Ghost[] = [];
  private fright = 0;
  private chain = 0;
  private clock = 0;
  private pause = 0;
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
    this.fillPellets();
    this.placeActors();
  }

  private fillPellets() {
    this.pellets.clear();
    this.power.clear();
    MAZE.forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (c === ".") this.pellets.add(y * COLS + x);
        if (c === "o") this.power.add(y * COLS + x);
      }),
    );
  }

  private placeActors() {
    const start = find("P")[0];
    this.pac = { cx: start.x, cy: start.y, dir: NONE, t: 0 };
    this.wanted = NONE;
    const homes = [DOOR, ...find("G")];
    this.ghosts = homes.map((h, i) => ({
      cx: h.x,
      cy: h.y,
      dir: DIRS.left,
      t: 0,
      home: h,
      color: GHOST_COLORS[i],
      releaseAt: i * 3000,
      eaten: false,
    }));
    this.fright = 0;
    this.clock = 0;
    this.pause = 1200;
  }

  press(_player: number, button: Button) {
    if (this.dead) {
      if (button === "a") this.reset();
      return;
    }
    if (button in DIRS) {
      const d = DIRS[button as keyof typeof DIRS];
      this.wanted = d;
      // Reversing is always allowed mid-corridor.
      const p = this.pac;
      if (p.t > 0 && d.x === -p.dir.x && d.y === -p.dir.y) {
        p.cx = wrapX(p.cx + p.dir.x);
        p.cy += p.dir.y;
        p.t = 1 - p.t;
        p.dir = d;
      }
    }
  }

  private advance(m: Mover, dist: number, onCell: (m: Mover) => void) {
    if (same(m.dir, NONE)) {
      onCell(m);
      return;
    }
    m.t += dist;
    while (m.t >= 1) {
      m.t -= 1;
      m.cx = wrapX(m.cx + m.dir.x);
      m.cy += m.dir.y;
      onCell(m);
      if (same(m.dir, NONE)) {
        m.t = 0;
        break;
      }
    }
  }

  private pacOnCell = (m: Mover) => {
    const key = m.cy * COLS + m.cx;
    if (this.pellets.delete(key)) this.score += 10;
    if (this.power.delete(key)) {
      this.score += 50;
      this.fright = Math.max(1500, FRIGHT_MS - (this.level - 1) * 700);
      this.chain = 0;
      for (const g of this.ghosts) if (!g.eaten) g.dir = { x: -g.dir.x, y: -g.dir.y };
      this.host.rumble(0, 60);
    }
    if (!same(this.wanted, NONE) && open(m.cx + this.wanted.x, m.cy + this.wanted.y)) {
      m.dir = this.wanted;
    } else if (!open(m.cx + m.dir.x, m.cy + m.dir.y)) {
      m.dir = NONE;
    }
    if (this.pellets.size === 0 && this.power.size === 0) {
      this.level++;
      this.fillPellets();
      this.placeActors();
    }
  };

  private ghostTarget(g: Ghost, i: number) {
    if (g.eaten) return g.home;
    if (g.cy === 9 && g.cx >= 8 && g.cx <= 10) return DOOR; // leave the house first
    const p = this.pac;
    if (i === 1) return { x: p.cx + this.wanted.x * 4, y: p.cy + this.wanted.y * 4 };
    if (i === 2) return { x: Math.random() * COLS, y: Math.random() * ROWS };
    if (i === 3 && Math.hypot(g.cx - p.cx, g.cy - p.cy) < 6) return { x: 0, y: ROWS };
    return { x: p.cx, y: p.cy };
  }

  private ghostOnCell(g: Ghost, i: number) {
    if (g.eaten && g.cx === g.home.x && g.cy === g.home.y) g.eaten = false;
    const back = { x: -g.dir.x, y: -g.dir.y };
    let options = Object.values(DIRS).filter((d) => !same(d, back) && open(g.cx + d.x, g.cy + d.y));
    if (!options.length) options = [back];
    if (this.fright > 0 && !g.eaten) {
      g.dir = options[Math.floor(Math.random() * options.length)];
      return;
    }
    const target = this.ghostTarget(g, i);
    g.dir = options.reduce((best, d) =>
      Math.hypot(g.cx + d.x - target.x, g.cy + d.y - target.y) <
      Math.hypot(g.cx + best.x - target.x, g.cy + best.y - target.y)
        ? d
        : best,
    );
  }

  private pos(m: Mover) {
    let x = m.cx + m.dir.x * m.t;
    if (x < -0.5) x += COLS;
    if (x > COLS - 0.5) x -= COLS;
    return { x, y: m.cy + m.dir.y * m.t };
  }

  update(dt: number) {
    if (this.dead) return;
    dt = Math.min(dt, 40);
    if (this.pause > 0) {
      this.pause -= dt;
      return;
    }
    this.clock += dt;
    this.fright = Math.max(0, this.fright - dt);
    const boost = 1 + (this.level - 1) * 0.08;

    this.advance(this.pac, 0.0075 * boost * dt, this.pacOnCell);

    this.ghosts.forEach((g, i) => {
      if (this.clock < g.releaseAt) return;
      const speed = g.eaten ? 0.016 : this.fright > 0 ? 0.0042 : 0.0068 * boost;
      this.advance(g, speed * dt, () => this.ghostOnCell(g, i));
    });

    const p = this.pos(this.pac);
    for (const g of this.ghosts) {
      if (g.eaten) continue;
      const gp = this.pos(g);
      if (Math.hypot(gp.x - p.x, gp.y - p.y) > 0.65) continue;
      if (this.fright > 0) {
        g.eaten = true;
        this.chain++;
        this.score += 100 * 2 ** this.chain;
        this.host.rumble(0, 80);
      } else {
        this.lives--;
        this.host.rumble(0, 500);
        if (this.lives <= 0) {
          this.dead = true;
          this.best = Math.max(this.best, this.score);
        } else {
          this.placeActors();
        }
        return;
      }
    }
  }

  private wall(x: number, y: number) {
    return y >= 0 && y < ROWS && x >= 0 && x < COLS && MAZE[y][x] === "#";
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, W, H);

    // Neon maze: only the wall edges that face a corridor get a line.
    ctx.strokeStyle = PALETTE.orange;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!this.wall(x, y)) continue;
        const px = OX + x * CELL;
        const py = OY + y * CELL;
        const inset = 6;
        if (!this.wall(x, y - 1) && y > 0) {
          ctx.moveTo(px, py + inset);
          ctx.lineTo(px + CELL, py + inset);
        }
        if (!this.wall(x, y + 1) && y < ROWS - 1) {
          ctx.moveTo(px, py + CELL - inset);
          ctx.lineTo(px + CELL, py + CELL - inset);
        }
        if (!this.wall(x - 1, y) && x > 0) {
          ctx.moveTo(px + inset, py);
          ctx.lineTo(px + inset, py + CELL);
        }
        if (!this.wall(x + 1, y) && x < COLS - 1) {
          ctx.moveTo(px + CELL - inset, py);
          ctx.lineTo(px + CELL - inset, py + CELL);
        }
      }
    }
    ctx.stroke();
    ctx.strokeRect(OX + 2, OY + 2, COLS * CELL - 4, ROWS * CELL - 4);

    ctx.fillStyle = PALETTE.amber;
    for (const k of this.pellets) {
      ctx.fillRect(OX + (k % COLS) * CELL + CELL / 2 - 3, OY + Math.floor(k / COLS) * CELL + CELL / 2 - 3, 6, 6);
    }
    if (Math.floor(performance.now() / 250) % 2 === 0) {
      ctx.fillStyle = PALETTE.yellow;
      for (const k of this.power) {
        ctx.beginPath();
        ctx.arc(OX + (k % COLS) * CELL + CELL / 2, OY + Math.floor(k / COLS) * CELL + CELL / 2, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const toPx = (v: { x: number; y: number }) => ({ x: OX + v.x * CELL + CELL / 2, y: OY + v.y * CELL + CELL / 2 });

    for (const g of this.ghosts) {
      const { x, y } = toPx(this.pos(g));
      const r = CELL * 0.48;
      if (!g.eaten) {
        const flashing = this.fright > 0 && this.fright < 1500 && Math.floor(this.fright / 200) % 2 === 0;
        ctx.fillStyle = this.fright > 0 ? (flashing ? PALETTE.ink : "#3346ff") : g.color;
        ctx.beginPath();
        ctx.arc(x, y - 2, r, Math.PI, 0);
        ctx.lineTo(x + r, y + r);
        for (let k = 1; k <= 4; k++) ctx.lineTo(x + r - (k * r) / 2, y + r - (k % 2 ? 6 : 0));
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x - 9, y - 8, 7, 9);
      ctx.fillRect(x + 2, y - 8, 7, 9);
      ctx.fillStyle = "#101040";
      ctx.fillRect(x - 7 + g.dir.x * 2, y - 5 + g.dir.y * 2, 4, 4);
      ctx.fillRect(x + 4 + g.dir.x * 2, y - 5 + g.dir.y * 2, 4, 4);
    }

    const { x, y } = toPx(this.pos(this.pac));
    const facing = same(this.pac.dir, NONE) ? 0 : Math.atan2(this.pac.dir.y, this.pac.dir.x);
    const mouth = 0.08 + Math.abs(Math.sin(performance.now() / 70)) * 0.32;
    ctx.fillStyle = PALETTE.yellow;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, CELL * 0.48, facing + mouth * Math.PI, facing - mouth * Math.PI + Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    hud(ctx, `PUNTOS ${this.score}`, `VIDAS ${"♥".repeat(Math.max(0, this.lives))}`, `NIVEL ${this.level}`);
    if (this.pause > 0 && !this.dead) text(ctx, "¡PREPARADO!", W / 2, OY + 11.5 * CELL, 36, PALETTE.yellow, "center");
    if (this.dead) overlay(ctx, "GAME OVER", `Récord: ${this.best} · A para reintentar`);
  }
}

export const pacman: GameDef = {
  id: "pacman",
  name: "Comecocos",
  players: "1 jugador",
  blurb: "Cómete los puntos y huye de los fantasmas.",
  color: PALETTE.yellow,
  create: (host) => new Pacman(host),
};
