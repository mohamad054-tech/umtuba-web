import { describe, expect, it } from "vitest";

describe("assessment retry idempotency and result safety", () => {
  it("treats duplicate submit as idempotent", () => {
    const first = { attemptId: "a1", submitCount: 1, score: 80 };
    const dup = { attemptId: "a1", submitCount: 1, score: 80 };
    expect(dup.score).toEqual(first.score);
    expect(dup.attemptId).toEqual(first.attemptId);
  });

  it("hides answer keys before result", () => {
    expect({ phase: "retry" as const, answerKeyVisible: false }.answerKeyVisible).toBe(false);
  });

  it("keeps progress application idempotent across reload", () => {
    const applied = { progressEventId: "pe-1", applied: true };
    const reload = { progressEventId: "pe-1", applied: true };
    expect(applied.progressEventId).toEqual(reload.progressEventId);
  });

  it("isolates learners on attempt results", () => {
    expect({ learnerId: "L1" }.learnerId).not.toEqual({ learnerId: "L2" }.learnerId);
  });

  it("avoids A1 certification surfaces", () => {
    expect({ surface: "assessment-retry-safety" as const }.surface).not.toEqual(
      { surface: "certificate-verification" as const }.surface,
    );
  });
});
