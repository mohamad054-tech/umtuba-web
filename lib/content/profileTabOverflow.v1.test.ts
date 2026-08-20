import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getProfileTabOverflowEdges,
  PROFILE_TAB_OVERFLOW_FADE_LEFT_CLASS,
  PROFILE_TAB_OVERFLOW_FADE_PX,
  PROFILE_TAB_OVERFLOW_FADE_RIGHT_CLASS,
} from "../../app/profile/lib/profileTabOverflow";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Creator Space Tab Overflow Fade V1 — helpers", () => {
  it("shows right fade when overflowing at start, both when mid-scroll", () => {
    expect(PROFILE_TAB_OVERFLOW_FADE_PX).toBeGreaterThanOrEqual(16);
    expect(
      getProfileTabOverflowEdges({
        scrollLeft: 0,
        clientWidth: 320,
        scrollWidth: 320,
      })
    ).toEqual({ showLeftFade: false, showRightFade: false });

    expect(
      getProfileTabOverflowEdges({
        scrollLeft: 0,
        clientWidth: 320,
        scrollWidth: 640,
      })
    ).toEqual({ showLeftFade: false, showRightFade: true });

    expect(
      getProfileTabOverflowEdges({
        scrollLeft: 160,
        clientWidth: 320,
        scrollWidth: 640,
      })
    ).toEqual({ showLeftFade: true, showRightFade: true });

    expect(
      getProfileTabOverflowEdges({
        scrollLeft: 320,
        clientWidth: 320,
        scrollWidth: 640,
      })
    ).toEqual({ showLeftFade: true, showRightFade: false });

    expect(PROFILE_TAB_OVERFLOW_FADE_LEFT_CLASS).toMatch(/from-\[#080816\]/);
    expect(PROFILE_TAB_OVERFLOW_FADE_RIGHT_CLASS).toMatch(/from-\[#080816\]/);
  });
});

describe("Creator Space Tab Overflow Fade V1 — wiring", () => {
  it("wires fade edges on ProfileTabs without hamburger or Home edits", () => {
    const helper = read("app/profile/lib/profileTabOverflow.ts");
    const tabs = read("app/profile/components/ProfileTabs.tsx");

    expect(helper).toMatch(/getProfileTabOverflowEdges/);
    expect(tabs).toMatch(/getProfileTabOverflowEdges/);
    expect(tabs).toMatch(/PROFILE_TAB_OVERFLOW_FADE_LEFT_CLASS/);
    expect(tabs).toMatch(/PROFILE_TAB_OVERFLOW_FADE_RIGHT_CLASS/);
    expect(tabs).toMatch(/onScroll=\{updateOverflow\}/);
    expect(tabs).toMatch(/ResizeObserver/);
    expect(tabs).not.toMatch(/hamburger|Hamburger|menu-open/);
    expect(`${helper}\n${tabs}`).not.toMatch(
      /DiscoverExperience|HomeFeed|shouldMountHomeCircularArc|HomeCircularArc/
    );
    expect(
      existsSync(join(ROOT, "app/profile/lib/profileTabOverflow.ts"))
    ).toBe(true);
  });
});
