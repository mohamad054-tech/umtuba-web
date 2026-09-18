import { describe, expect, it } from "vitest";
import {
  canMove2048,
  formatPlayClock,
  formatPlayNumber,
  hanoiCanPlace,
  merge2048Line,
  move2048,
  sudokuIsSolved,
  xoBestMove,
  xoWinner,
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

  it("scores a perfect tic-tac-toe reply", () => {
    expect(xoWinner(["X", "X", "X", "", "", "", "", "", ""])?.mark).toBe("X");
    expect(xoBestMove(["X", "X", "", "", "O", "", "", "", ""], "O")).toBe(2);
  });

  it("allows a smaller Hanoi disc onto a larger one only", () => {
    expect(hanoiCanPlace(3, 2)).toBe(true);
    expect(hanoiCanPlace(1, 2)).toBe(false);
    expect(hanoiCanPlace(undefined, 3)).toBe(true);
  });

  it("accepts a solved sudoku board", () => {
    const solution =
      "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
    expect(
      sudokuIsSolved(solution.split("").map(Number), solution)
    ).toBe(true);
  });
});
