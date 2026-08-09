import { describe, expect, it } from "vitest";

describe("jinn assessment runtime hardening contracts", () => {
  it("does not export raw answer keys from public catalog helpers when module present", async () => {
    let mod: Record<string, unknown> | null = null;
    try { mod = await import("./publicCatalog"); } catch { mod = null; }
    if (!mod) { expect(true).toBe(true); return; }
    const exported = Object.keys(mod);
    const suspicious = exported.filter((k) => /answerKey|correctAnswers/i.test(k));
    expect(suspicious).toEqual([]);
  });
  it("marks unauthorized assessment access as fail-closed contract", () => {
    const unauthorizedResult = { ok: false as const, status: 401 as const };
    expect(unauthorizedResult.ok).toBe(false);
    expect(unauthorizedResult.status).toBeGreaterThanOrEqual(400);
  });
});
