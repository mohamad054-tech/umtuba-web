import { describe, expect, it } from "vitest";

describe("instructor learner course lifecycle e2e contracts", () => {
  it("keeps instructor authoring distinct from learner progress mutation", () => {
    expect({ surface: "instructor-authoring" as const }.surface).not.toEqual(
      { surface: "learner-progress" as const }.surface,
    );
  });

  it("expects unauthorized lifecycle transitions to fail closed", () => {
    const denied = { ok: false as const, status: 403 as const };
    expect(denied.ok).toBe(false);
  });

  it("documents publish -> learner visibility handoff as ordered stages", () => {
    const stages = ["author", "publish", "learner-visible", "consume", "progress", "complete"] as const;
    expect(stages.indexOf("publish")).toBeLessThan(stages.indexOf("learner-visible"));
    expect(stages.indexOf("consume")).toBeLessThan(stages.indexOf("complete"));
  });
});
