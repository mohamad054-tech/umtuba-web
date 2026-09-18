/**
 * Shared play engine for /games — TypeScript port of the prototype UM.Engine.
 * No inline scripts, no Google Fonts, no cloud scores.
 */

export const PLAY_FIELD = "#0C2723";
export const PLAY_SURFACE = "#14352F";
export const PLAY_RAISE = "#1B443C";
export const PLAY_LINE = "#255A50";
export const PLAY_INK = "#EAF2EE";
export const PLAY_MUTED = "#8FB3AA";
export const PLAY_GOLD = "#F0A93B";
export const PLAY_GOLD_DIM = "#9A6E22";
export const PLAY_CLAY = "#D46A5E";
export const PLAY_MINT = "#5FCBA4";
export const PLAY_RADIUS_PX = 14;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function formatPlayNumber(locale: string, value: number): string {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}

export function formatPlayClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = items[i] as T;
    items[i] = items[j] as T;
    items[j] = current;
  }
  return items;
}

export function shuffled<T>(items: readonly T[]): T[] {
  return shuffleInPlace([...items]);
}

export function createPlayStopwatch(onTick: (elapsedSec: number) => void) {
  let startedAt = 0;
  let elapsed = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const sync = () => {
    elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    onTick(elapsed);
  };

  return {
    start() {
      startedAt = Date.now();
      elapsed = 0;
      onTick(0);
      if (timer) clearInterval(timer);
      timer = setInterval(sync, prefersReducedMotion() ? 500 : 250);
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (startedAt) sync();
      return elapsed;
    },
    get elapsed() {
      return elapsed;
    },
  };
}

export function createPlaySfx() {
  let context: AudioContext | null = null;

  const getContext = () => {
    if (typeof window === "undefined") return null;
    const Ctor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    if (!context) context = new Ctor();
    return context;
  };

  const tone = (frequency: number, ms: number, type: OscillatorType = "sine") => {
    try {
      const ctx = getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.value = 0.035;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + ms / 1000);
    } catch {
      /* audio is optional */
    }
  };

  return {
    flip: () => tone(520, 55, "square"),
    ok: () => tone(660, 80),
    no: () => tone(220, 90, "sawtooth"),
    win: () => {
      tone(523, 70);
      window.setTimeout(() => tone(784, 130), 80);
    },
  };
}

export function verdictFromScore(kind: "high" | "moves", value: number):
  | "games.perfect"
  | "games.good"
  | "games.okay"
  | "games.weak" {
  if (kind === "high") {
    if (value >= 800) return "games.perfect";
    if (value >= 500) return "games.good";
    if (value >= 250) return "games.okay";
    return "games.weak";
  }
  if (value <= 11) return "games.perfect";
  if (value <= 16) return "games.good";
  if (value <= 24) return "games.okay";
  return "games.weak";
}

export function merge2048Line(line: readonly number[]): {
  next: number[];
  gained: number;
  moved: boolean;
} {
  const compact = line.filter((n) => n !== 0);
  const next: number[] = [];
  let gained = 0;
  for (let i = 0; i < compact.length; i += 1) {
    const current = compact[i] ?? 0;
    const upcoming = compact[i + 1] ?? 0;
    if (current !== 0 && current === upcoming) {
      const merged = current * 2;
      next.push(merged);
      gained += merged;
      i += 1;
    } else if (current !== 0) {
      next.push(current);
    }
  }
  while (next.length < 4) next.push(0);
  const moved = next.some((value, index) => value !== (line[index] ?? 0));
  return { next, gained, moved };
}

export function empty2048Cells(board: readonly number[]): number[] {
  return board.reduce<number[]>((cells, value, index) => {
    if (value === 0) cells.push(index);
    return cells;
  }, []);
}

export function spawn2048Tile(board: readonly number[]): number[] {
  const empty = empty2048Cells(board);
  if (empty.length === 0) return [...board];
  const next = [...board];
  const slot = empty[Math.floor(Math.random() * empty.length)] ?? 0;
  next[slot] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

export function create2048Board(): number[] {
  return spawn2048Tile(spawn2048Tile(Array.from({ length: 16 }, () => 0)));
}

export type Dir4 = "left" | "right" | "up" | "down";

export function move2048(
  board: readonly number[],
  direction: Dir4
): { board: number[]; gained: number; moved: boolean } {
  const next = [...board];
  let gained = 0;
  let moved = false;

  const readLine = (i: number): number[] => {
    if (direction === "left") return [0, 1, 2, 3].map((c) => next[i * 4 + c] ?? 0);
    if (direction === "right")
      return [3, 2, 1, 0].map((c) => next[i * 4 + c] ?? 0);
    if (direction === "up") return [0, 1, 2, 3].map((r) => next[r * 4 + i] ?? 0);
    return [3, 2, 1, 0].map((r) => next[r * 4 + i] ?? 0);
  };

  const writeLine = (i: number, line: readonly number[]) => {
    if (direction === "left") {
      line.forEach((value, c) => {
        next[i * 4 + c] = value;
      });
    } else if (direction === "right") {
      line.forEach((value, c) => {
        next[i * 4 + (3 - c)] = value;
      });
    } else if (direction === "up") {
      line.forEach((value, r) => {
        next[r * 4 + i] = value;
      });
    } else {
      line.forEach((value, r) => {
        next[(3 - r) * 4 + i] = value;
      });
    }
  };

  for (let i = 0; i < 4; i += 1) {
    const merged = merge2048Line(readLine(i));
    writeLine(i, merged.next);
    gained += merged.gained;
    if (merged.moved) moved = true;
  }

  return { board: next, gained, moved };
}

export function canMove2048(board: readonly number[]): boolean {
  if (empty2048Cells(board).length > 0) return true;
  for (const direction of ["left", "right", "up", "down"] as const) {
    if (move2048(board, direction).moved) return true;
  }
  return false;
}

export const SNAKE_SIZE = 16;
/** First-food tick. Slow enough to read the board on a phone. */
export const SNAKE_TICK_START_MS = 260;
/** Floor after many foods. */
export const SNAKE_TICK_MIN_MS = 120;
/** Drop this many ms per food (+10 score). */
export const SNAKE_TICK_STEP_MS = 12;
export const SNAKE_TICK_REDUCED_START_MS = 380;
export const SNAKE_TICK_REDUCED_MIN_MS = 220;

export function snakeTickMs(score: number, reducedMotion = false): number {
  const foods = Math.max(0, Math.floor(score / 10));
  if (reducedMotion) {
    return Math.max(
      SNAKE_TICK_REDUCED_MIN_MS,
      SNAKE_TICK_REDUCED_START_MS - foods * 8
    );
  }
  return Math.max(SNAKE_TICK_MIN_MS, SNAKE_TICK_START_MS - foods * SNAKE_TICK_STEP_MS);
}

export type SnakePoint = { x: number; y: number };

export function snakeKey(point: SnakePoint): string {
  return `${point.x},${point.y}`;
}

export function stepSnake(
  body: readonly SnakePoint[],
  direction: Dir4,
  food: SnakePoint
): { body: SnakePoint[]; ate: boolean; dead: boolean } {
  const head = body[0] ?? { x: 8, y: 8 };
  const nextHead = {
    x: head.x + (direction === "left" ? -1 : direction === "right" ? 1 : 0),
    y: head.y + (direction === "up" ? -1 : direction === "down" ? 1 : 0),
  };
  const hitWall =
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= SNAKE_SIZE ||
    nextHead.y >= SNAKE_SIZE;
  const hitSelf = body.some(
    (part, index) => index > 0 && part.x === nextHead.x && part.y === nextHead.y
  );
  if (hitWall || hitSelf) return { body: [...body], ate: false, dead: true };
  const ate = nextHead.x === food.x && nextHead.y === food.y;
  const nextBody = [nextHead, ...body];
  if (!ate) nextBody.pop();
  return { body: nextBody, ate, dead: false };
}

export const XO_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export type XoMark = "" | "X" | "O";

export function xoWinner(board: readonly XoMark[]): {
  mark: "X" | "O" | "draw";
  line?: readonly number[];
} | null {
  for (const line of XO_LINES) {
    const [a, b, c] = line;
    const mark = board[a];
    if (mark && mark === board[b] && mark === board[c]) {
      return { mark, line };
    }
  }
  if (board.every((cell) => cell)) return { mark: "draw" };
  return null;
}

export function xoBestMove(board: readonly XoMark[], me: "X" | "O"): number {
  const cells = [...board];

  const search = (
    grid: XoMark[],
    player: "X" | "O",
    depth: number
  ): { score: number; index: number } => {
    const over = xoWinner(grid);
    if (over) {
      if (over.mark === "O") return { score: 10 - depth, index: -1 };
      if (over.mark === "X") return { score: depth - 10, index: -1 };
      return { score: 0, index: -1 };
    }
    let bestScore = player === "O" ? -99 : 99;
    let bestIndex = -1;
    grid.forEach((value, index) => {
      if (value) return;
      grid[index] = player;
      const { score } = search(grid, player === "O" ? "X" : "O", depth + 1);
      grid[index] = "";
      if (player === "O" ? score > bestScore : score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    return { score: bestScore, index: bestIndex };
  };

  return search(cells, me, 0).index;
}

export const XO_CPU_RANDOM_CHANCE = 0.25;

export function xoLegalMoves(board: readonly XoMark[]): number[] {
  return board.flatMap((cell, index) => (cell ? [] : [index]));
}

export function xoLineThreat(board: readonly XoMark[], mark: "X" | "O"): number {
  for (const line of XO_LINES) {
    const marks = line.map((index) => board[index]);
    const filled = marks.filter((cell) => cell === mark).length;
    const empty = line.filter((index) => !board[index]);
    if (filled === 2 && empty.length === 1) return empty[0] ?? -1;
  }
  return -1;
}

/** Normal CPU: 75% best move, 25% random other legal cell. */
export function xoCpuMove(
  board: readonly XoMark[],
  rng: () => number = Math.random
): number {
  const legal = xoLegalMoves(board);
  if (legal.length === 0) return -1;
  const best = xoBestMove(board, "O");
  if (legal.length > 1 && rng() < XO_CPU_RANDOM_CHANCE) {
    const others = legal.filter((index) => index !== best);
    const pool = others.length ? others : legal;
    return pool[Math.floor(rng() * pool.length)] ?? best;
  }
  return best < 0 ? (legal[0] ?? -1) : best;
}

export function xoHumanCenterThenBlock(board: readonly XoMark[]): number {
  if (!board[4]) return 4;
  const win = xoLineThreat(board, "X");
  if (win >= 0) return win;
  const block = xoLineThreat(board, "O");
  if (block >= 0) return block;
  const corner = [0, 2, 6, 8].find((index) => !board[index]);
  if (corner != null) return corner;
  return board.findIndex((cell) => !cell);
}

export function hanoiCanPlace(onto: number | undefined, disc: number): boolean {
  return onto == null || disc < onto;
}

export const SUDOKU_PUZZLES = [
  {
    puzzle:
      "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
    solution:
      "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
  },
  {
    puzzle:
      "200080300060070084030500209000105408000000000402706000301007040720040060004010003",
    solution:
      "245981376169273584837564219976125438513498627482736951391657842728349165654812793",
  },
] as const;

export function sudokuCell(grid: string, index: number): number {
  return Number(grid[index] ?? "0") || 0;
}

export function sudokuIsSolved(board: readonly number[], solution: string): boolean {
  return board.every((value, index) => value === sudokuCell(solution, index));
}
