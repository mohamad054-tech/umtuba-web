import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("AppTopNav titleIsHeading contract", () => {
  it("exposes titleIsHeading so content can own the document H1", () => {
    const nav = read("app/components/AppTopNav.tsx");
    expect(nav).toMatch(/titleIsHeading\??:\s*boolean/);
    expect(nav).toMatch(/titleIsHeading\s*=\s*true/);
    expect(nav).toMatch(/titleIsHeading\s*\?\s*\(/);
  });

  it("Article page keeps content H1 and disables nav heading", () => {
    const article = read("app/articles/[articleId]/page.tsx");
    expect(article).toMatch(/titleIsHeading=\{false\}/);
    expect(article).toMatch(/<h1 className="mt-2 text-3xl/);
  });

  it("Rewards / Creator / Post Journey demote duplicate intros to h2", () => {
    expect(read("app/rewards/page.tsx").includes("<h1")).toBe(false);
    expect(read("app/creator/insights/page.tsx").includes("<h1")).toBe(false);
    expect(read("app/post-journey/page.tsx").includes("<h1")).toBe(false);
    expect(read("app/rewards/page.tsx")).toMatch(/UM Points<\/h2>/);
  });
});

describe("next.config security headers baseline", () => {
  it("disables X-Powered-By and ships conservative response headers", () => {
    const cfg = read("next.config.ts");
    expect(cfg).toMatch(/poweredByHeader:\s*false/);
    expect(cfg).toMatch(/X-Content-Type-Options/);
    expect(cfg).toMatch(/nosniff/);
    expect(cfg).toMatch(/X-Frame-Options/);
    expect(cfg).toMatch(/SAMEORIGIN/);
    expect(cfg).toMatch(/Referrer-Policy/);
    expect(cfg).toMatch(/strict-origin-when-cross-origin/);
    expect(cfg).toMatch(/Cross-Origin-Opener-Policy/);
    // Do not invent a CSP or blanket Permissions-Policy that would break Live/World.
    expect(cfg).not.toMatch(/Content-Security-Policy/);
    expect(cfg).not.toMatch(/Permissions-Policy/);
    expect(cfg).not.toMatch(/microphone=\(\)/);
  });
});

describe("Admin AI shell platform chrome contract", () => {
  it("keeps AppTopNav full-bleed on diagnostics and usage", () => {
    for (const rel of ["app/admin/ai/page.tsx", "app/admin/ai/usage/page.tsx"]) {
      const src = read(rel);
      const navIdx = src.indexOf("<AppTopNav");
      const constrainIdx = src.indexOf('className="mx-auto max-w-5xl');
      expect(navIdx, rel).toBeGreaterThan(-1);
      expect(constrainIdx, rel).toBeGreaterThan(-1);
      expect(navIdx, rel).toBeLessThan(constrainIdx);
      expect(src.includes("<h1"), `${rel} nested H1`).toBe(false);
    }
  });
});
