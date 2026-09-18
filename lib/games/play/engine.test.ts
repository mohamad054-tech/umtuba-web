import { describe, expect, it } from "vitest";
import {
  canMove2048,
  formatPlayClock,
  formatPlayNumber,
  hanoiCanPlace,
  merge2048Line,
  move2048,
  snakeTickMs,
  SNAKE_TICK_MIN_MS,
  SNAKE_TICK_START_MS,
  sudokuIsSolved,
  XO_LINES,
  xoBestMove,
  xoCpuMove,
  xoHumanCenterThenBlock,
  unoCpuIndex,
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
});
