import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROUTES, buildArticleHref, isNavActive } from "./routes";
import { isMobilePrimaryNavActive } from "./mobileNav";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Page Assembly V1 — routes", () => {
  it("exposes home, welcome, games, createArticle", () => {
    expect(APP_ROUTES.home).toBe("/");
    expect(APP_ROUTES.welcome).toBe("/welcome");
    expect(APP_ROUTES.games).toBe("/games");
    expect(APP_ROUTES.createArticle).toBe("/create/article");
    expect(buildArticleHref("11111111-1111-4111-8111-111111111111")).toBe(
      "/articles/11111111-1111-4111-8111-111111111111"
    );
  });

  it("treats /discover as Home alias for nav active state", () => {
    expect(isNavActive("/", APP_ROUTES.home)).toBe(true);
    expect(isNavActive("/discover", APP_ROUTES.home)).toBe(true);
    expect(isNavActive("/discover", APP_ROUTES.discover)).toBe(false);
    expect(isMobilePrimaryNavActive("/discover", "home")).toBe(true);
    expect(isMobilePrimaryNavActive("/discover", "discover")).toBe(false);
  });

  it("ships welcome, games, home feed, discover redirect pages", () => {
    expect(existsSync(join(ROOT, "app/welcome/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/games/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/components/home/HomeFeedLoader.tsx"))).toBe(
      true
    );
    const discover = read("app/discover/page.tsx");
    expect(discover).toMatch(/redirect/);
    expect(discover).toMatch(/APP_ROUTES\.home/);
    const home = read("app/page.tsx");
    expect(home).toMatch(/HomeFeedLoader/);
    expect(home).not.toMatch(/LandingHero/);
  });

  it("Home shell includes section circles for Learning Store Games Live", () => {
    const circles = read("app/discover/components/HomeSectionCircles.tsx");
    expect(circles).toMatch(/APP_ROUTES\.learning/);
    expect(circles).toMatch(/APP_ROUTES\.store/);
    expect(circles).toMatch(/APP_ROUTES\.games/);
    expect(circles).toMatch(/APP_ROUTES\.live/);
    const shell = read("app/discover/components/DiscoverShell.tsx");
    expect(shell).toMatch(/HomeSectionCircles/);
    expect(shell).toMatch(/title="Home"/);
  });
});
