import { describe, expect, it } from "vitest";
import { clearTouching, stepChain, type MarbleBall } from "./marbleChain";

function lead(balls: MarbleBall[]) {
  return balls.reduce((best, ball) => (ball.s > best ? ball.s : best), 0);
}

describe("marble chain rollback", () => {
  it("rolls the front backward while the rear keeps moving forward", () => {
    const frontLead = { color: 0, s: 300 };
    const rearHead = { color: 1, s: 120 };
    const balls = [frontLead, { color: 0, s: 274 }, rearHead, { color: 1, s: 94 }];
    const pulling = stepChain(balls, 1 / 60, 16);
    expect(pulling).toBe(true);
    expect(frontLead.s).toBeLessThan(300);
    expect(rearHead.s).toBeGreaterThan(120);
  });

  it("moves a joined chain forward", () => {
    const head = { color: 0, s: 200 };
    const tail = { color: 1, s: 174 };
    stepChain([head, tail], 1 / 60, 16);
    expect(head.s).toBeGreaterThan(200);
    expect(tail.s).toBeGreaterThan(174);
  });

  it("pops again when the same color meets, and the chain loses ground", () => {
    const balls = [
      { color: 2, s: 260 },
      { color: 2, s: 234 },
      { color: 2, s: 100 },
      { color: 1, s: 74 },
    ];
    let popped = 0;
    for (let frame = 0; frame < 40 && popped < 3; frame += 1) {
      stepChain(balls, 1 / 60, 16);
      popped += clearTouching(balls);
    }
    expect(popped).toBe(3);
    expect(balls.map((ball) => ball.color)).toEqual([1]);
    expect(lead(balls)).toBeLessThan(200);
  });
});
