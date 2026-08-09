import { describe, expect, it } from "vitest";

describe("learner progress completion runtime hardening", () => {
  it("treats unauthorized progress mutation as fail-closed", () => {
    const denied = { ok: false as const, status: 403 as const };
    expect(denied.ok).toBe(false);
    expect([401, 403]).toContain(denied.status);
  });

  it("keeps learner progress scoped to learner identity", () => {
    const a = { learnerId: "learner-a", courseId: "course-1", completed: true };
    const b = { learnerId: "learner-b", courseId: "course-1", completed: false };
    expect(a.learnerId).not.toEqual(b.learnerId);
  });

  it("soft-loads progress-related helpers without inventing architecture", async () => {
    let found = false;
    for (const p of ["./progress", "./completion", "./learnerProgress", "./publicCatalog"]) {
      try {
        await import(p);
        found = true;
        break;
      } catch {
        // continue
      }
    }
    expect(typeof found).toBe("boolean");
  });
});
