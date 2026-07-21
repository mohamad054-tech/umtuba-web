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
      "Discover",
      "World",
      "Live",
      "Messages",
    ]);
  });

  it("AppTopNav is the shared shell chrome", () => {
    const top = read("app/components/AppTopNav.tsx");
    expect(top).toMatch(/aria-label="Primary"/);
    expect(top).toMatch(/UserMenu/);
    expect(top).toMatch(/WalletBalanceIndicator/);
    expect(top).toMatch(/NotificationBell/);
    expect(top).toMatch(/APP_ROUTES\.search/);
    expect(top).toMatch(/aria-label="Search"/);
    expect(top).toMatch(/watch-focus-ring/);
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
    expect(shell).toMatch(/title="Settings"/);
    expect(settings).toMatch(/SettingsShell/);
    expect(settings).not.toMatch(/AuthShell/);
    expect(settings).toMatch(/"notifications"/);
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
      "app/lib/nav/mobileNav.ts",
      "app/settings/SettingsShell.tsx",
    ]) {
      const src = read(rel);
      expect(src).not.toMatch(/["']\/feed["']/);
      expect(src).not.toMatch(/["']\/ai["']/);
      expect(src).not.toMatch(/["']\/uconnect["']/);
      expect(src).not.toMatch(/["']\/ideas["']/);
    }
    expect(APP_ROUTES.discover).toBe("/discover");
  });
});
