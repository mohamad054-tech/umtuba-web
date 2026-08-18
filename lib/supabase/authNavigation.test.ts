import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assignAfterAuthSuccess } from "./authNavigation";

describe("assignAfterAuthSuccess", () => {
  it("is a no-op without window (server)", () => {
    expect(() => assignAfterAuthSuccess("/profile")).not.toThrow();
  });

  it("login page uses hard assign after verified sign-in", () => {
    const login = readFileSync(join(process.cwd(), "app/login/page.tsx"), "utf8");
    expect(login).toMatch(/await signInWithEmail/);
    expect(login).toMatch(/assignAfterAuthSuccess\(nextPath\)/);
    expect(login).not.toMatch(/router\.replace\(nextPath\)/);
    expect(login).not.toMatch(/router\.refresh\(\)/);
  });
});
