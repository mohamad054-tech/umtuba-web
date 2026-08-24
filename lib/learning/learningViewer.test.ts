import { describe, expect, it } from "vitest";
import { hasLearningAuthCookie } from "./learningViewer";

describe("hasLearningAuthCookie", () => {
  it("treats guests with no auth cookies as signed out", () => {
    expect(hasLearningAuthCookie([])).toBe(false);
    expect(hasLearningAuthCookie(["locale", "hl"])).toBe(false);
  });

  it("detects Supabase SSR session cookies including chunks", () => {
    expect(
      hasLearningAuthCookie(["sb-xxxx-auth-token"])
    ).toBe(true);
    expect(
      hasLearningAuthCookie(["other", "sb-xxxx-auth-token.0"])
    ).toBe(true);
  });
});
