import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROFILE_LOADING_COPY,
  PROFILE_LOADING_PULSE_CLASS,
  PROFILE_LOADING_STATS_CELL_COUNT,
  PROFILE_LOADING_TAB_CHIP_COUNT,
  PROFILE_LOADING_TIMELINE_SKELETON_COUNT,
} from "../../app/profile/lib/profileLoadingStates";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Creator Space Loading States V1 — helpers", () => {
  it("exposes §19 skeleton counts and reduced-motion pulse class", () => {
    expect(PROFILE_LOADING_TIMELINE_SKELETON_COUNT).toBeGreaterThanOrEqual(3);
    expect(PROFILE_LOADING_TIMELINE_SKELETON_COUNT).toBeLessThanOrEqual(6);
    expect(PROFILE_LOADING_STATS_CELL_COUNT).toBe(4);
    expect(PROFILE_LOADING_TAB_CHIP_COUNT).toBeGreaterThanOrEqual(4);
    expect(PROFILE_LOADING_PULSE_CLASS).toMatch(/animate-pulse/);
    expect(PROFILE_LOADING_PULSE_CLASS).toMatch(/motion-reduce:animate-none/);
    expect(PROFILE_LOADING_COPY.ariaLabel).toBe("Loading Creator Space");
  });
});

describe("Creator Space Loading States V1 — wiring", () => {
  it("wires route loading.tsx and Suspense fallback to skeleton shell", () => {
    const helper = read("app/profile/lib/profileLoadingStates.ts");
    const skeleton = read("app/profile/components/ProfileLoadingSkeleton.tsx");
    const loading = read("app/profile/[username]/loading.tsx");
    const page = read("app/profile/[username]/page.tsx");
    const index = read("app/profile/components/index.ts");

    expect(helper).toMatch(/PROFILE_LOADING_TIMELINE_SKELETON_COUNT/);
    expect(skeleton).toMatch(/PROFILE_LOADING_PULSE_CLASS/);
    expect(skeleton).toMatch(/ProfileShell/);
    expect(skeleton).toMatch(/aria-busy/);
    expect(skeleton).toMatch(/PROFILE_LOADING_STATS_CELL_COUNT/);
    expect(skeleton).toMatch(/PROFILE_LOADING_TIMELINE_SKELETON_COUNT/);
    expect(loading).toMatch(/ProfileLoadingSkeleton/);
    expect(page).toMatch(/ProfileLoadingSkeleton/);
    expect(page).toMatch(/Suspense fallback=\{<ProfileLoadingSkeleton/);
    expect(page).not.toMatch(/Opening profile\.\.\./);
    expect(index).toMatch(/ProfileLoadingSkeleton/);
    expect(`${helper}\n${skeleton}\n${loading}\n${page}`).not.toMatch(
      /DiscoverExperience|HomeFeed|shouldMountHomeCircularArc|HomeCircularArc/
    );
    expect(
      existsSync(join(ROOT, "app/profile/[username]/loading.tsx"))
    ).toBe(true);
  });
});
