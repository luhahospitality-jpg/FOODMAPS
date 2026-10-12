import { pong } from "./pong";
import { snake } from "./snake";
import { tetris } from "./tetris";

export const GAMES = [snake, tetris, pong];
export type { Game, GameDef, Input } from "./types";
export { H, W } from "./types";
