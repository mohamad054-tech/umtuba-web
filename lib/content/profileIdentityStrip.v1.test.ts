import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROFILE_IDENTITY_INTEREST_TEASER_MAX,
  PROFILE_IDENTITY_ROLE_CHIP_MAX,
  normalizeInterestTeasers,
  normalizeRoleChips,
  shouldShowIdentityStrip,
} from "../../app/profile/lib/profileIdentityStrip";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Identity Strip V1 — helpers", () => {
  it("normalizes roles: trim, dedupe, max 2 visible + overflow", () => {
    expect(normalizeRoleChips(null)).toEqual({ visible: [], overflowCount: 0 });
    expect(normalizeRoleChips([])).toEqual({ visible: [], overflowCount: 0 });
    expect(normalizeRoleChips(["  ", ""])).toEqual({
      visible: [],
      overflowCount: 0,
    });
    expect(
      normalizeRoleChips([
        " Writer ",
        "writer",
        "Teacher",
        "Seller",
        "Producer",
      ])
    ).toEqual({
      visible: ["Writer", "Teacher"],
      overflowCount: 2,
    });
    expect(PROFILE_IDENTITY_ROLE_CHIP_MAX).toBe(2);
  });

  it("normalizes interest teasers to max 2", () => {
    expect(normalizeInterestTeasers(null)).toEqual([]);
    expect(
      normalizeInterestTeasers([" Travel ", "Documentary", "City light", "Food"])
    ).toEqual(["Travel", "Documentary"]);
    expect(PROFILE_IDENTITY_INTEREST_TEASER_MAX).toBe(2);
  });

  it("shows strip only when roles or interest teasers exist", () => {
    expect(shouldShowIdentityStrip({})).toBe(false);
    expect(shouldShowIdentityStrip({ roles: [], interests: [] })).toBe(false);
    expect(shouldShowIdentityStrip({ roles: ["Writer"] })).toBe(true);
    expect(shouldShowIdentityStrip({ interests: ["Travel"] })).toBe(true);
  });
});

describe("Identity Strip V1 — wiring", () => {
  it("wires strip under Hero without inventing verified/cover or Home edits", () => {
    const strip = read("app/profile/components/ProfileIdentityStrip.tsx");
    const helper = read("app/profile/lib/profileIdentityStrip.ts");
    const experience = read("app/profile/ProfileExperience.tsx");
    const header = read("app/profile/components/ProfileHeader.tsx");
    const types = read("app/profile/types.ts");

    expect(helper).toMatch(/export function normalizeRoleChips/);
    expect(helper).toMatch(/export function normalizeInterestTeasers/);
    expect(types).toMatch(/roles\?:/);
    expect(strip).toMatch(/t\("profile.rolesAria"\)/);
    expect(strip).toMatch(/t\("profile.interestsAria"\)/);
    expect(strip).toMatch(/isCollapsed/);
    expect(strip).toMatch(/onOpenAbout/);
    expect(experience).toMatch(/ProfileIdentityStrip/);
    expect(experience).toMatch(/isCollapsed=\{isHeroCollapsed\}/);
    expect(experience).toMatch(/onOpenAbout=\{.*setActiveTab\("about"\)/);
    expect(header).not.toMatch(/about\.roles/);
    expect(header).not.toMatch(/\bprofession\b/i);
    expect(`${strip}\n${helper}`).not.toMatch(/\bverified\b/i);
    expect(`${strip}\n${helper}`).not.toMatch(/cover_url|coverUrl/);
    expect(`${strip}\n${helper}\n${experience}`).not.toMatch(
      /DiscoverExperience|HomeFeed|shouldMountHomeCircularArc|HomeCircularArc/
    );
    expect(
      existsSync(join(ROOT, "app/profile/lib/profileIdentityStrip.ts"))
    ).toBe(true);

    const aboutUi = read("app/profile/components/ProfileAbout.tsx");
    const aboutLib = read("app/profile/lib/profileAboutLiveStructure.ts");
    expect(aboutLib).toMatch(/"roles"/);
    expect(aboutUi).toMatch(/t\("profile.roles"\)/);
  });

  it("keeps specialties in Hero Completeness and Stats/Actions outside the strip", () => {
    const strip = read("app/profile/components/ProfileIdentityStrip.tsx");
    const header = read("app/profile/components/ProfileHeader.tsx");
    const experience = read("app/profile/ProfileExperience.tsx");

    expect(header).toMatch(/normalizeSpecialtyChips/);
    expect(strip).not.toMatch(/specialt/i);
    expect(experience).toMatch(/ProfileStats/);
    expect(experience).toMatch(/ProfileActions/);
    expect(strip).not.toMatch(/ProfileStats|FollowButton/);
  });
});
