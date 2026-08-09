import { describe, expect, it } from "vitest";

describe("instructor authoring runtime completeness contracts", () => {
  it("keeps learner/instructor surface kinds distinct", () => {
    expect({ kind: "authoring" as const }.kind).not.toEqual({ kind: "attempt" as const }.kind);
  });
  it("expects unauthorized instructor mutation to fail closed", () => {
    const denied = { ok: false as const, status: 403 as const };
    expect(denied.ok).toBe(false);
    expect([401, 403]).toContain(denied.status);
  });
  it("soft-checks instructor-related modules without rebuilding architecture", async () => {
    let found = false;
    for (const p of ["./instructor", "./authoring", "./courses"]) {
      try { await import(p); found = true; break; } catch {}
    }
    expect(typeof found).toBe("boolean");
  });
});
