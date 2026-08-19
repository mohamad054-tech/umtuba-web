import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { translate } from "../../../lib/i18n";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("Landing join CTA contract (UAF-06)", () => {
  it("removes obsolete Join Beta copy from landing surfaces", () => {
    const hero = read("app/components/landing/LandingHero.tsx");
    const welcome = read("app/welcome/page.tsx");
    const join = read("app/components/landing/JoinBetaLink.tsx");

    expect(hero).not.toMatch(/Join Beta/);
    expect(welcome).not.toMatch(/Join the Beta/);
    expect(welcome).not.toMatch(/Join Beta/);
    expect(join).toMatch(/landing\.joinCta/);
    expect(hero).toMatch(/JoinBetaLink/);
    expect(welcome).toMatch(/JoinBetaLink/);
  });

  it("serves approved AR join string via i18n key only", () => {
    expect(translate("ar", "landing.joinCta")).toBe("انضم إلى UMTUBA");
    expect(translate("en", "landing.joinCta")).toBe("Join UMTUBA");
  });
});
