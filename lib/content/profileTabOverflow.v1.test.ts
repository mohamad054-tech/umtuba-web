import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getProfileTabOverflowEdges,
  PROFILE_TAB_OVERFLOW_FADE_END_CLASS,
  PROFILE_TAB_OVERFLOW_FADE_PX,
  PROFILE_TAB_OVERFLOW_FADE_START_CLASS,
} from "../../app/profile/lib/profileTabOverflow";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

const LTR_AT_START = {
  scrollLeft: 0,
  clientWidth: 320,
  scrollWidth: 640,
};

describe("Creator Space Tab Overflow Fade V1 — helpers", () => {
  it("PROFILE_TAB_OVERFLOW_LTR: start hidden / end visible at inline-start", () => {
    expect(PROFILE_TAB_OVERFLOW_FADE_PX).toBeGreaterThanOrEqual(16);
    expect(
      getProfileTabOverflowEdges({
        scrollLeft: 0,
        clientWidth: 320,
        scrollWidth: 320,
      })
    ).toEqual({ showStartFade: false, showEndFade: false });

    expect(getProfileTabOverflowEdges(LTR_AT_START)).toEqual({
      showStartFade: false,
      showEndFade: true,
    });

    expect(
      getProfileTabOverflowEdges({
        scrollLeft: 160,
        clientWidth: 320,
        scrollWidth: 640,
      })
    ).toEqual({ showStartFade: true, showEndFade: true });

    expect(
      getProfileTabOverflowEdges({
        scrollLeft: 320,
        clientWidth: 320,
        scrollWidth: 640,
      })
    ).toEqual({ showStartFade: true, showEndFade: false });
  });

  it("PROFILE_TAB_OVERFLOW_RTL: Chromium negative scrollLeft mirrors LTR", () => {
    expect(
      getProfileTabOverflowEdges({
        scrollLeft: 0,
        clientWidth: 320,
        scrollWidth: 640,
      })
    ).toEqual({ showStartFade: false, showEndFade: true });

    expect(
      getProfileTabOverflowEdges({
        scrollLeft: -160,
        clientWidth: 320,
        scrollWidth: 640,
      })
    ).toEqual({ showStartFade: true, showEndFade: true });

    expect(
      getProfileTabOverflowEdges({
        scrollLeft: -320,
        clientWidth: 320,
        scrollWidth: 640,
      })
    ).toEqual({ showStartFade: true, showEndFade: false });
  });

  it("uses logical start/end classes and dir-aware gradients, not physical left/right", () => {
    expect(PROFILE_TAB_OVERFLOW_FADE_START_CLASS).toMatch(/\bstart-0\b/);
    expect(PROFILE_TAB_OVERFLOW_FADE_START_CLASS).toMatch(/rtl:bg-gradient-to-l/);
    expect(PROFILE_TAB_OVERFLOW_FADE_START_CLASS).toMatch(/from-\[#080816\]/);
    expect(PROFILE_TAB_OVERFLOW_FADE_START_CLASS).not.toMatch(/\bleft-0\b/);
    expect(PROFILE_TAB_OVERFLOW_FADE_START_CLASS).not.toMatch(/\bright-0\b/);

    expect(PROFILE_TAB_OVERFLOW_FADE_END_CLASS).toMatch(/\bend-0\b/);
    expect(PROFILE_TAB_OVERFLOW_FADE_END_CLASS).toMatch(/rtl:bg-gradient-to-r/);
    expect(PROFILE_TAB_OVERFLOW_FADE_END_CLASS).toMatch(/from-\[#080816\]/);
    expect(PROFILE_TAB_OVERFLOW_FADE_END_CLASS).not.toMatch(/\bleft-0\b/);
    expect(PROFILE_TAB_OVERFLOW_FADE_END_CLASS).not.toMatch(/\bright-0\b/);
  });
});

describe("Creator Space Tab Overflow Fade V1 — wiring", () => {
  it("wires logical fade edges on ProfileTabs without hamburger or Home edits", () => {
    const helper = read("app/profile/lib/profileTabOverflow.ts");
    const tabs = read("app/profile/components/ProfileTabs.tsx");

    expect(helper).toMatch(/getProfileTabOverflowEdges/);
    expect(tabs).toMatch(/getProfileTabOverflowEdges/);
    expect(tabs).toMatch(/PROFILE_TAB_OVERFLOW_FADE_START_CLASS/);
    expect(tabs).toMatch(/PROFILE_TAB_OVERFLOW_FADE_END_CLASS/);
    expect(tabs).toMatch(/onScroll=\{updateOverflow\}/);
    expect(tabs).toMatch(/ResizeObserver/);
    expect(tabs).toMatch(/overflow-x-auto/);
    expect(tabs).toMatch(/shrink-0/);
    expect(tabs).toMatch(/role="tab"/);
    expect(tabs).not.toMatch(/hamburger|Hamburger|menu-open/);
    expect(helper).not.toMatch(/\bleft-0\b|\bright-0\b/);
    expect(tabs).not.toMatch(/PROFILE_TAB_OVERFLOW_FADE_LEFT_CLASS/);
    expect(tabs).not.toMatch(/PROFILE_TAB_OVERFLOW_FADE_RIGHT_CLASS/);
    expect(`${helper}\n${tabs}`).not.toMatch(
      /DiscoverExperience|HomeFeed|shouldMountHomeCircularArc|HomeCircularArc/
    );
    expect(
      existsSync(join(ROOT, "app/profile/lib/profileTabOverflow.ts"))
    ).toBe(true);
  });
});
