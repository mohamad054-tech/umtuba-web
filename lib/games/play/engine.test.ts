import { describe, expect, it } from "vitest";
import {
  canMove2048,
  formatPlayClock,
  formatPlayNumber,
  hanoiCanPlace,
  merge2048Line,
  move2048,
  consumeSnakeTurn,
  queueSnakeTurn,
  snakeDirFromDelta,
  snakeTickMs,
  snakeVisualChain,
  SNAKE_TICK_MIN_MS,
  SNAKE_TICK_START_MS,
  sudokuIsSolved,
  SUDOKU_PUZZLES,
  pickSudokuPuzzle,
  XO_LINES,
  xoBestMove,
  xoCpuMove,
  xoHumanCenterThenBlock,
  unoCpuIndex,
  wheelIndexAt,
  wheelStopAngle,
  xoWinner,
  type UnoCard,
  type XoMark,
} from "./engine";

describe("play engine", () => {
  it("formats clocks and locale numbers", () => {
    expect(formatPlayClock(0)).toBe("00:00");
    expect(formatPlayClock(75)).toBe("01:15");
    expect(formatPlayNumber("en", 2048)).toBe("2,048");
  });

  it("merges a 2048 line toward the start", () => {
    expect(merge2048Line([2, 2, 0, 4])).toEqual({
      next: [4, 4, 0, 0],
      gained: 4,
      moved: true,
    });
    expect(merge2048Line([2, 0, 2, 2])).toEqual({
      next: [4, 2, 0, 0],
      gained: 4,
      moved: true,
    });
  });

  it("moves a 2048 board left and detects a stuck board", () => {
    const moved = move2048([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "left");
    expect(moved.moved).toBe(true);
    expect(moved.gained).toBe(4);
    expect(canMove2048([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2])).toBe(false);
  });

  it("slows snake at the start and speeds up with score", () => {
    expect(snakeTickMs(0)).toBe(SNAKE_TICK_START_MS);
    expect(snakeTickMs(40)).toBe(SNAKE_TICK_START_MS - 4 * 12);
    expect(snakeTickMs(200)).toBe(SNAKE_TICK_MIN_MS);
    expect(snakeTickMs(0, true)).toBeGreaterThan(snakeTickMs(0));
  });

  it("eases the snake head forward without cutting the corner", () => {
    const body = [
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
    ];
    expect(snakeVisualChain(body, "right", 0)).toEqual(body);
    const mid = snakeVisualChain(body, "right", 0.5);
    expect(mid[0]).toEqual({ x: 8.5, y: 8 });
    expect(mid[1]).toEqual(body[0]);
    expect(mid[mid.length - 1]).toEqual({ x: 6.5, y: 8 });
    const bite = snakeVisualChain(body, "right", 1, true);
    expect(bite[0]).toEqual({ x: 9, y: 8 });
    expect(bite[bite.length - 1]).toEqual(body[2]);
  });

  it("keeps one extra snake turn and refuses a reverse", () => {
    const straight = { dir: "right" as const, pending: "right" as const, extra: null };
    const up = queueSnakeTurn(straight, "up");
    expect(up).toEqual({ dir: "right", pending: "up", extra: null });
    expect(queueSnakeTurn(up, "down")).toEqual(up);
    const corner = queueSnakeTurn(up, "left");
    expect(corner).toEqual({ dir: "right", pending: "up", extra: "left" });
    expect(queueSnakeTurn(corner, "down")).toEqual(corner);
    expect(consumeSnakeTurn(corner)).toEqual({ dir: "up", pending: "left", extra: null });
    expect(snakeDirFromDelta(4, 1)).toBe("right");
    expect(snakeDirFromDelta(-2, -9)).toBe("up");
    expect(snakeDirFromDelta(0, 0)).toBeNull();
  });

  it("detects a win on every row, column, and diagonal without flipping indices", () => {
    const lines: Array<readonly number[]> = [...XO_LINES];
    expect(lines).toHaveLength(8);
    expect(lines).toEqual([
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ]);
    for (const line of lines) {
      const board: XoMark[] = ["", "", "", "", "", "", "", "", ""];
      for (const index of line) board[index] = "X";
      const result = xoWinner(board);
      expect(result?.mark).toBe("X");
      expect(result?.line).toEqual(line);
    }
  });

  it("never lets a center-then-block human lose to the perfect engine", () => {
    const board: XoMark[] = ["", "", "", "", "", "", "", "", ""];
    while (true) {
      const human = xoHumanCenterThenBlock(board);
      expect(human).toBeGreaterThanOrEqual(0);
      board[human] = "X";
      const afterX = xoWinner(board);
      if (afterX) {
        expect(afterX.mark).not.toBe("O");
        break;
      }
      const cpu = xoBestMove(board, "O");
      expect(cpu).toBeGreaterThanOrEqual(0);
      board[cpu] = "O";
      const afterO = xoWinner(board);
      if (afterO) {
        expect(afterO.mark).not.toBe("O");
        break;
      }
    }
  });

  it("uses a random legal CPU move about a quarter of the time", () => {
    const board: XoMark[] = ["X", "", "", "", "O", "", "", "", ""];
    const picks = Array.from({ length: 80 }, (_, i) =>
      xoCpuMove(board, () => (i < 20 ? 0.1 : 0.9))
    );
    const randomish = picks.filter((index) => index !== xoBestMove(board, "O"));
    expect(randomish.length).toBeGreaterThan(0);
    expect(xoCpuMove(board, () => 0.9)).toBe(xoBestMove(board, "O"));
  });

  it("scores a perfect tic-tac-toe reply", () => {
    expect(xoWinner(["X", "X", "X", "", "", "", "", "", ""])?.mark).toBe("X");
    expect(xoBestMove(["X", "X", "", "", "O", "", "", "", ""], "O")).toBe(2);
  });

  it("allows a smaller Hanoi disc onto a larger one only", () => {
    expect(hanoiCanPlace(3, 2)).toBe(true);
    expect(hanoiCanPlace(1, 2)).toBe(false);
    expect(hanoiCanPlace(undefined, 3)).toBe(true);
  });

  it("stops the wheel on the chosen slice under the pointer", () => {
    const count = 6;
    for (let index = 0; index < count; index += 1) {
      const angle = wheelStopAngle(40, index, count, 5);
      expect(wheelIndexAt(angle, count)).toBe(index);
      expect(angle).toBeGreaterThan(40);
    }
    expect(wheelIndexAt(wheelStopAngle(0, 0, count, 0), count)).toBe(0);
  });

  it("picks a beatable Uno CPU move", () => {
    const top: UnoCard = { c: "gold", v: "3" };
    const hand: UnoCard[] = [
      { c: "gold", v: "+2" },
      { c: "mint", v: "3" },
      { c: "ink", v: "9" },
    ];
    expect(unoCpuIndex(hand, top, () => 0.9)).toBe(0);
    expect(unoCpuIndex(hand, top, () => 0.1)).not.toBe(-1);
    expect(unoCpuIndex([{ c: "ink", v: "9" }], top, () => 0.5)).toBe(-1);
  });

  it("accepts a solved sudoku board", () => {
    const solution =
      "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
    expect(
      sudokuIsSolved(solution.split("").map(Number), solution)
    ).toBe(true);
  });

  it("keeps every sudoku puzzle solvable and rotates away from the current one", () => {
    const seen = new Set<string>();
    for (const pack of SUDOKU_PUZZLES) {
      expect(pack.puzzle).toHaveLength(81);
      expect(pack.solution).toHaveLength(81);
      expect(seen.has(pack.puzzle)).toBe(false);
      seen.add(pack.puzzle);
      const solution = pack.solution.split("").map(Number);
      expect(sudokuIsSolved(solution, pack.solution)).toBe(true);
      for (let index = 0; index < 81; index += 1) {
        const given = Number(pack.puzzle[index]);
        if (given !== 0) expect(given).toBe(solution[index]);
      }
      const units = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      for (const i of units) {
        const row = new Set(solution.slice(i * 9, i * 9 + 9));
        const col = new Set(units.map((r) => solution[r * 9 + i]));
        const br = Math.floor(i / 3) * 3;
        const bc = (i % 3) * 3;
        const box = new Set<number>();
        for (let r = 0; r < 3; r += 1) {
          for (let c = 0; c < 3; c += 1) box.add(solution[(br + r) * 9 + bc + c] ?? 0);
        }
        expect(row.size).toBe(9);
        expect(col.size).toBe(9);
        expect(box.size).toBe(9);
      }
      expect(pickSudokuPuzzle(pack.puzzle, () => 0).puzzle).not.toBe(pack.puzzle);
    }
  });
});
