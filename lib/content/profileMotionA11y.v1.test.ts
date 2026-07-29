import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROFILE_HERO_COLLAPSE_SCROLL_PX,
  PROFILE_MOTION_DURATION_MS,
  PROFILE_PAGE_ENTER_CLASS,
  PROFILE_TAB_PANEL_FADE_CLASS,
} from "../../app/profile/lib/profileMotionA11y";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Creator Space Motion / A11y Pass V1", () => {
  it("defines collapse threshold and motion duration within §15 targets", () => {
    expect(PROFILE_HERO_COLLAPSE_SCROLL_PX).toBeGreaterThanOrEqual(80);
    expect(PROFILE_HERO_COLLAPSE_SCROLL_PX).toBeLessThanOrEqual(120);
    expect(PROFILE_MOTION_DURATION_MS).toBeGreaterThanOrEqual(200);
    expect(PROFILE_MOTION_DURATION_MS).toBeLessThanOrEqual(280);
    expect(PROFILE_PAGE_ENTER_CLASS).toMatch(/motion-reduce:animate-none/);
    expect(PROFILE_TAB_PANEL_FADE_CLASS).toMatch(/motion-reduce:animate-none/);
  });

  it("wires page enter, hero collapse, tab fade, and reduced-motion guards", () => {
    const experience = read("app/profile/ProfileExperience.tsx");
    const header = read("app/profile/components/ProfileHeader.tsx");
    const tabs = read("app/profile/components/ProfileTabs.tsx");
    const badge = read("app/profile/components/ProfileLiveBadge.tsx");
    const css = read("app/globals.css");

    expect(experience).toMatch(/PROFILE_PAGE_ENTER_CLASS/);
    expect(experience).toMatch(/PROFILE_TAB_PANEL_FADE_CLASS/);
    expect(experience).toMatch(/PROFILE_HERO_COLLAPSE_SCROLL_PX/);
    expect(experience).toMatch(/isCollapsed=\{isHeroCollapsed\}/);
    expect(experience).toMatch(/key=\{activeTab\}/);
    expect(header).toMatch(/isCollapsed/);
    expect(header).toMatch(/motion-reduce:transition-none/);
    expect(tabs).toMatch(/aria-orientation="horizontal"/);
    expect(tabs).toMatch(/min-h-\[44px\]|PROFILE_A11Y_TOUCH_TARGET_CLASS/);
    expect(tabs).toMatch(/Home/);
    expect(tabs).toMatch(/End/);
    expect(badge).toMatch(/aria-live="polite"/);
    expect(badge).toMatch(/motion-reduce:animate-none/);
    expect(css).toMatch(/@keyframes profilePageEnter/);
    expect(css).toMatch(/@keyframes profileTabFade/);
    expect(
      existsSync(join(ROOT, "app/profile/lib/profileMotionA11y.ts"))
    ).toBe(true);
  });

  it("does not touch Home feed, Watch player, or Store domain", () => {
    const experience = read("app/profile/ProfileExperience.tsx");
    const motion = read("app/profile/lib/profileMotionA11y.ts");
    expect(experience).not.toMatch(/DiscoverExperience|HomeFeed|VerticalVideoFeed/);
    expect(motion).not.toMatch(/DiscoverFeed|WatchPlayer|storeCheckout/);
    expect(motion).toMatch(/Profile-only/);
  });
});
