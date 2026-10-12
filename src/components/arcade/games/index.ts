import { asteroids } from "./asteroids";
import { breakout } from "./breakout";
import { flappy } from "./flappy";
import { g2048 } from "./g2048";
import { invaders } from "./invaders";
import { mines } from "./mines";
import { pacman } from "./pacman";
import { pong } from "./pong";
import { racer } from "./racer";
import { snake } from "./snake";
import { tetris } from "./tetris";
import { tron } from "./tron";

export const GAMES = [pacman, invaders, tetris, snake, breakout, asteroids, pong, tron, racer, flappy, g2048, mines];
export type { Game, GameDef, Input } from "./types";
export { H, W } from "./types";
