import { describe, expect, it } from "vitest";
import {
  STEPS,
  orderPhaseAfterConfirm,
  orderPhaseAfterNext,
  reviewOrder,
  stepsInOrder,
  type OrderPhase,
} from "./banks";

describe("order the steps", () => {
  it("accepts only the full correct sequence", () => {
    for (const task of STEPS) {
      expect(stepsInOrder(task.steps, task.steps)).toBe(true);
      const swapped = [task.steps[1]!, task.steps[0]!, ...task.steps.slice(2)];
      expect(stepsInOrder(swapped, task.steps)).toBe(false);
      expect(new Set(task.steps).size).toBe(task.steps.length);
      expect(task.steps.length).toBeGreaterThanOrEqual(4);
    }
    expect(STEPS.length).toBeGreaterThanOrEqual(8);
  });

  it("shows the correct numbered order after a wrong try and stays until next", () => {
    const task = STEPS[0]!;
    const wrong = [task.steps[1]!, task.steps[0]!, ...task.steps.slice(2)];
    const review = reviewOrder(wrong, task.steps);
    expect(review.hit).toBe(false);
    expect(review.correct.map((line) => `${line.n}. ${line.text}`)).toEqual(
      task.steps.map((text, idx) => `${idx + 1}. ${text}`),
    );
    expect(review.yours.some((line) => line.wrong)).toBe(true);
    expect(review.yours.filter((line) => line.wrong).map((line) => line.text)).toEqual([
      wrong[0],
      wrong[1],
    ]);

    let phase: OrderPhase = "play";
    phase = orderPhaseAfterConfirm(phase);
    expect(phase).toBe("review");
    expect(orderPhaseAfterNext("play")).toBe("stay");
    expect(orderPhaseAfterConfirm(phase)).toBe("review");
    expect(orderPhaseAfterNext(phase)).toBe("advance");
  });
});
