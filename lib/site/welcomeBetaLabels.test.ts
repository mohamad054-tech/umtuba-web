import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Welcome beta label cleanup", () => {
  const hero = read("app/components/landing/LandingHero.tsx");
  const welcome = read("app/welcome/page.tsx");

  it("does not render the Alpha 0.2 badge or Join Beta CTAs", () => {
    expect(hero).not.toMatch(/Alpha 0\.2/);
    expect(hero).not.toMatch(/Built for a new generation/);
    expect(hero).not.toMatch(/Join Beta/);
    expect(hero).not.toMatch(/JoinBetaLink/);
    expect(welcome).not.toMatch(/Join Beta/);
    expect(welcome).not.toMatch(/Join the Beta/);
    expect(welcome).not.toMatch(/JoinBetaLink/);
  });

  it("keeps the approved logo and globe on Welcome", () => {
    expect(hero).toMatch(/UmtubaStackedLogo/);
    expect(hero).toMatch(/LandingHeroGlobe/);
    expect(welcome).toMatch(/UmtubaStackedLogo/);
    expect(hero).toMatch(/APP_NAV_ITEMS/);
  });
});
