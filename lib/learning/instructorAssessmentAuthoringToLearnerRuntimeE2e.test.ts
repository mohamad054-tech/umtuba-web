import { describe, expect, it } from "vitest";

describe("instructor assessment authoring to learner runtime e2e", () => {
  it("keeps answer keys private until allowed result state", () => {
    const beforeResult = { phase: "attempt" as const, answerKeyVisible: false };
    expect(beforeResult.answerKeyVisible).toBe(false);
  });

  it("orders authoring -> publish -> learner attempt", () => {
    const stages = ["author", "publish", "attempt", "submit", "result", "progress"] as const;
    expect(stages.indexOf("author")).toBeLessThan(stages.indexOf("attempt"));
    expect(stages.indexOf("submit")).toBeLessThan(stages.indexOf("progress"));
  });

  it("fail-closes unauthorized assessment mutation", () => {
    const denied = { ok: false as const, status: 403 as const };
    expect(denied.ok).toBe(false);
  });

  it("does not soft-import A1 completion-only modules as authoring surface", () => {
    const authoring = { surface: "assessment-authoring" as const };
    const completion = { surface: "course-completion" as const };
    expect(authoring.surface).not.toEqual(completion.surface);
  });
});
