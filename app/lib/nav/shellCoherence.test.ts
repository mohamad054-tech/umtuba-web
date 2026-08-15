import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_NAV_ITEMS, APP_ROUTES } from "./routes";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("shell coherence", () => {
  it("keeps a single primary desktop nav contract", () => {
    expect(APP_NAV_ITEMS.map((i) => i.label)).toEqual([
      "Home",
      "World",
      "Learning",
      "Live",
      "Messages",
    ]);
    // Contract Sync V1: Discover is a Home alias route, not a primary label.
    expect(APP_NAV_ITEMS.some((i) => i.label === "Discover")).toBe(false);
    expect(APP_NAV_ITEMS.some((i) => i.href === APP_ROUTES.discover)).toBe(
      false
    );
  });

  it("AppTopNav is the shared shell chrome", () => {
    const top = read("app/components/AppTopNav.tsx");
    expect(top).toMatch(/aria-label=\{t\("nav\.primary"\)\}/);
    expect(top).toMatch(/UserMenu/);
    expect(top).toMatch(/WalletBalanceIndicator/);
    expect(top).toMatch(/NotificationBell/);
    expect(top).toMatch(/APP_ROUTES\.search/);
    expect(top).toMatch(/actions\.search|nav\.search/);
    expect(top).toMatch(/watch-focus-ring/);
    expect(top).toMatch(/LanguageSelector/);
    expect(top).toMatch(/variant="compact"/);
  });

  it("StoreShell keeps AppTopNav as shared chrome with a store appearance", () => {
    const shell = read("app/components/store/StoreShell.tsx");
    const top = read("app/components/AppTopNav.tsx");
    expect(shell).toMatch(/AppTopNav/);
    expect(shell).toMatch(/appearance="store"/);
    expect(shell).not.toMatch(/StoreTopNav/);
    expect(top).toMatch(/appearance\?: "default" \| "store"/);
    expect(top).toMatch(/APP_NAV_ITEMS/);
    expect(top).toMatch(/UserMenu/);
    expect(top).toMatch(/NotificationBell/);
    expect(top).toMatch(/LanguageSelector/);
  });

  it("AuthShell exposes compact language control for guests", () => {
    const auth = read("app/components/auth/AuthShell.tsx");
    expect(auth).toMatch(/LanguageSelector/);
    expect(auth).toMatch(/variant="compact"/);
  });

  it("removes prototype version badges from product shells", () => {
    const discover = read("app/discover/components/DiscoverShell.tsx");
    const create = read("app/create/video/page.tsx");
    const auth = read("app/components/auth/AuthShell.tsx");
    expect(discover).not.toMatch(/Feed V1/);
    expect(create).not.toMatch(/Video V1/);
    expect(auth).not.toMatch(/Accounts V1/);
  });

  it("Settings uses AppTopNav hub instead of AuthShell", () => {
    const settings = read("app/settings/SettingsExperience.tsx");
    const shell = read("app/settings/SettingsShell.tsx");
    expect(shell).toMatch(/AppTopNav/);
    expect(shell).toMatch(/settings\.title/);
    expect(settings).toMatch(/SettingsShell/);
    expect(settings).not.toMatch(/AuthShell/);
    expect(settings).toMatch(/"notifications"/);
    expect(settings).toMatch(/"language"/);
    expect(settings).toMatch(/LanguageSelector/);
    expect(settings).toMatch(/searchParams\.get\("section"\)/);
  });

  it("Rewards and Insights keep AppTopNav full-bleed", () => {
    const rewards = read("app/rewards/page.tsx");
    const insights = read("app/creator/insights/page.tsx");
    expect(rewards).toMatch(/AppTopNav/);
    expect(insights).toMatch(/AppTopNav/);
    // Nav must not sit inside the narrow content column only.
    expect(rewards).toMatch(/max-w-3xl[\s\S]*section/);
    expect(rewards.indexOf("<AppTopNav")).toBeLessThan(
      rewards.indexOf("max-w-3xl")
    );
    expect(insights.indexOf("<AppTopNav")).toBeLessThan(
      insights.indexOf("max-w-3xl")
    );
  });

  it("Post Journey uses AppTopNav and drops legacy TopNavbar", () => {
    const journey = read("app/post-journey/page.tsx");
    expect(journey).toMatch(/AppTopNav/);
    expect(journey).not.toMatch(/TopNavbar/);
    expect(journey).not.toMatch(/LeftSidebar/);
  });

  it("Watch header includes UserMenu for account parity", () => {
    const watch = read("app/watch/WatchExperience.tsx");
    expect(watch).toMatch(/UserMenu/);
    expect(watch).not.toMatch(/>Related</);
  });

  it("does not reintroduce dead product routes into shell chrome", () => {
    for (const rel of [
      "app/components/AppTopNav.tsx",
      "app/components/UserMenu.tsx",
      "app/lib/nav/userMenuItems.ts",
      "app/settings/SettingsShell.tsx",
    ]) {
      const src = read(rel);
      expect(src).not.toMatch(/["']\/feed["']/);
      expect(src).not.toMatch(/["']\/ai["']/);
      expect(src).not.toMatch(/["']\/uconnect["']/);
      expect(src).not.toMatch(/["']\/ideas["']/);
      expect(src).not.toMatch(/["']\/journey-pro["']/);
      expect(src).not.toMatch(/["']\/live\/media-lab["']/);
    }
    // mobileNav may reference media-lab only as a hide exception (not a tab href).
    const mobileNav = read("app/lib/nav/mobileNav.ts");
    expect(mobileNav).not.toMatch(/["']\/feed["']/);
    expect(mobileNav).not.toMatch(/["']\/ai["']/);
    expect(mobileNav).not.toMatch(/["']\/uconnect["']/);
    expect(mobileNav).not.toMatch(/["']\/ideas["']/);
    expect(mobileNav).not.toMatch(/["']\/journey-pro["']/);
    expect(mobileNav).not.toMatch(/href:\s*["']\/live\/media-lab["']/);
    expect(APP_ROUTES.discover).toBe("/discover");
  });
});
