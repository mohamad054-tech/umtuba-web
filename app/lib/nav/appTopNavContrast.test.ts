import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("App top nav contrast tokens", () => {
  it("uses readable ink for the redesigned header search and upload", () => {
    const nav = readFileSync(
      join(process.cwd(), "app", "components", "AppTopNav.tsx"),
      "utf8"
    );
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

    expect(nav).not.toMatch(/text-white\/45/);
    expect(nav).toContain("app-top-nav-subtitle");
    expect(nav).toContain("watch-focus-ring");
    expect(nav).not.toContain("app-top-nav-link--active");

    expect(css).toContain("--app-top-nav-ink-inactive");
    expect(css).toContain("--app-top-nav-ink-active");
    expect(css).toContain(".app-top-nav-link--active");
    expect(css).toMatch(/--app-top-nav-ink-inactive:\s*#e8eaef/);
    expect(css).toContain("--app-top-nav-ink-active: #dbeafe");
  });
});
