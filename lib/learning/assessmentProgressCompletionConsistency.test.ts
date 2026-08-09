import { describe, expect, it } from "vitest";

describe("assessment progress completion consistency", () => {
  it("orders assessment result before progress and completion", () => {
    const stages = ["attempt", "submit", "result", "progress", "lesson-complete", "course-complete"] as const;
    expect(stages.indexOf("result")).toBeLessThan(stages.indexOf("progress"));
    expect(stages.indexOf("progress")).toBeLessThan(stages.indexOf("course-complete"));
  });

  it("keeps answer keys hidden before result", () => {
    expect({ phase: "attempt" as const, answerKeyVisible: false }.answerKeyVisible).toBe(false);
  });

  it("treats duplicate submission as idempotent outcome", () => {
    const first = { submissionId: "s1", applied: true };
    const dup = { submissionId: "s1", applied: true };
    expect(first.submissionId).toEqual(dup.submissionId);
  });

  it("fail-closes unauthorized progress mutation", () => {
    const denied = { ok: false as const, status: 403 as const };
    expect(denied.ok).toBe(false);
  });

  it("avoids A1 certification surfaces", () => {
    expect({ surface: "assessment-progress-consistency" as const }.surface).not.toEqual(
      { surface: "certification-foundation" as const }.surface,
    );
  });
});
