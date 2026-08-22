import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROFILE_A11Y_FOCUS_RING_CLASS,
  PROFILE_A11Y_MESSAGE_BUTTON_CLASS,
  PROFILE_A11Y_MIN_TOUCH_PX,
  PROFILE_A11Y_TOUCH_TARGET_CLASS,
  meetsProfileTouchTargetPx,
} from "../../app/profile/lib/profileAccessibility";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Creator Space Accessibility Contract V1 — helpers", () => {
  it("locks §21 touch-target and focus-ring constants", () => {
    expect(PROFILE_A11Y_MIN_TOUCH_PX).toBe(44);
    expect(meetsProfileTouchTargetPx(44)).toBe(true);
    expect(meetsProfileTouchTargetPx(43)).toBe(false);
    expect(PROFILE_A11Y_TOUCH_TARGET_CLASS).toBe("min-h-[44px]");
    expect(PROFILE_A11Y_FOCUS_RING_CLASS).toBe("watch-focus-ring");
    expect(PROFILE_A11Y_MESSAGE_BUTTON_CLASS).toMatch(/min-h-\[44px\]/);
    expect(PROFILE_A11Y_MESSAGE_BUTTON_CLASS).toMatch(/watch-focus-ring/);
  });
});

describe("Creator Space Accessibility Contract V1 — wiring", () => {
  it("wires §21 cover/avatar/tabs/live/kind/touch targets without Home edits", () => {
    const helper = read("app/profile/lib/profileAccessibility.ts");
    const actions = read("app/profile/components/ProfileActions.tsx");
    const experience = read("app/profile/ProfileExperience.tsx");
    const header = read("app/profile/components/ProfileHeader.tsx");
    const tabs = read("app/profile/components/ProfileTabs.tsx");
    const badge = read("app/profile/components/ProfileLiveBadge.tsx");
    const contentCard = read("app/components/content-cards/ContentCard.tsx");

    expect(helper).toMatch(/PROFILE_A11Y_TOUCH_TARGET_CLASS/);
    expect(actions).toMatch(/PROFILE_A11Y_TOUCH_TARGET_CLASS/);
    expect(actions).toMatch(/PROFILE_A11Y_MESSAGE_BUTTON_CLASS/);
    expect(actions).toMatch(/className=\{PROFILE_A11Y_TOUCH_TARGET_CLASS\}/);
    expect(experience).toMatch(/PROFILE_A11Y_TOUCH_TARGET_CLASS/);
    expect(header).toMatch(/aria-hidden/);
    expect(header).toMatch(/t\("profile.avatarAlt"/);
    expect(tabs).toMatch(/PROFILE_A11Y_TOUCH_TARGET_CLASS/);
    expect(tabs).toMatch(/PROFILE_A11Y_FOCUS_RING_CLASS/);
    expect(tabs).toMatch(/aria-selected/);
    expect(tabs).toMatch(/aria-controls/);
    expect(tabs).toMatch(/min-h-\[44px\]|PROFILE_A11Y_TOUCH_TARGET_CLASS/);
    expect(tabs).toMatch(/watch-focus-ring|PROFILE_A11Y_FOCUS_RING_CLASS/);
    expect(badge).toMatch(/aria-live="polite"/);
    expect(contentCard).toMatch(/CARD_KIND_I18N_KEYS/);
    expect(`${helper}\n${actions}\n${experience}`).not.toMatch(
      /DiscoverExperience|HomeFeed|shouldMountHomeCircularArc|HomeCircularArc/
    );
    expect(
      existsSync(join(ROOT, "app/profile/lib/profileAccessibility.ts"))
    ).toBe(true);
  });
});
