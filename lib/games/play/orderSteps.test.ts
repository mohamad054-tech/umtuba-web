import { describe, expect, it } from "vitest";
import { STEPS, stepsInOrder } from "./banks";

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
});
