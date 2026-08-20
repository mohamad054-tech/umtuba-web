import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROFILE_IDENTITY_ACHIEVEMENT_MEDAL_MAX,
  normalizeAchievementMedals,
  shouldShowIdentityAchievements,
} from "../../app/profile/lib/profileIdentityAchievements";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Identity Achievements V1 — helpers", () => {
  it("normalizes medals: trim, dedupe, max 3 visible + overflow", () => {
    expect(normalizeAchievementMedals(null)).toEqual({
      visible: [],
      overflowCount: 0,
    });
    expect(normalizeAchievementMedals([])).toEqual({
      visible: [],
      overflowCount: 0,
    });
    expect(normalizeAchievementMedals(["  ", ""])).toEqual({
      visible: [],
      overflowCount: 0,
    });
    expect(
      normalizeAchievementMedals([
        " Pioneer ",
        "pioneer",
        "Top creator",
        "Mentor",
        "Launch week",
      ])
    ).toEqual({
      visible: ["Pioneer", "Top creator", "Mentor"],
      overflowCount: 1,
    });
    expect(PROFILE_IDENTITY_ACHIEVEMENT_MEDAL_MAX).toBe(3);
  });

  it("shows medals only when achievements exist", () => {
    expect(shouldShowIdentityAchievements(undefined)).toBe(false);
    expect(shouldShowIdentityAchievements([])).toBe(false);
    expect(shouldShowIdentityAchievements(["Pioneer"])).toBe(true);
  });
});

describe("Identity Achievements V1 — wiring", () => {
  it("wires medals under Hero without inventing verified/cover or Home edits", () => {
    const medals = read("app/profile/components/ProfileIdentityAchievements.tsx");
    const helper = read("app/profile/lib/profileIdentityAchievements.ts");
    const experience = read("app/profile/ProfileExperience.tsx");
    const header = read("app/profile/components/ProfileHeader.tsx");
    const about = read("app/profile/components/ProfileAbout.tsx");

    expect(helper).toMatch(/export function normalizeAchievementMedals/);
    expect(medals).toMatch(/Creator achievements/);
    expect(medals).toMatch(/isCollapsed/);
    expect(medals).toMatch(/onOpenAbout/);
    expect(experience).toMatch(/ProfileIdentityAchievements/);
    expect(experience).toMatch(/ProfileIdentityStrip/);
    expect(experience).toMatch(/isCollapsed=\{isHeroCollapsed\}/);
    expect(experience).toMatch(/onOpenAbout=\{.*setActiveTab\("about"\)/);
    // Dependency-correct order: Hero → Strip → Achievements → Stats
    const headerIdx = experience.indexOf("<ProfileHeader");
    const stripIdx = experience.indexOf("<ProfileIdentityStrip");
    const medalsIdx = experience.indexOf("<ProfileIdentityAchievements");
    const statsIdx = experience.indexOf("<ProfileStats");
    expect(headerIdx).toBeGreaterThan(-1);
    expect(stripIdx).toBeGreaterThan(headerIdx);
    expect(medalsIdx).toBeGreaterThan(stripIdx);
    expect(statsIdx).toBeGreaterThan(medalsIdx);
    expect(header).not.toMatch(/about\.achievements/);
    expect(about).toMatch(/Achievements/);
    expect(`${medals}\n${helper}`).not.toMatch(/\bverified\b/i);
    expect(`${medals}\n${helper}`).not.toMatch(/cover_url|coverUrl/);
    expect(`${medals}\n${helper}\n${experience}`).not.toMatch(
      /DiscoverExperience|HomeFeed|shouldMountHomeCircularArc|HomeCircularArc/
    );
    expect(
      existsSync(join(ROOT, "app/profile/lib/profileIdentityAchievements.ts"))
    ).toBe(true);
  });

  it("keeps Stats/Actions and specialties outside the medals strip", () => {
    const medals = read("app/profile/components/ProfileIdentityAchievements.tsx");
    const header = read("app/profile/components/ProfileHeader.tsx");
    const experience = read("app/profile/ProfileExperience.tsx");

    expect(header).toMatch(/normalizeSpecialtyChips/);
    expect(medals).not.toMatch(/specialt/i);
    expect(experience).toMatch(/ProfileStats/);
    expect(experience).toMatch(/ProfileActions/);
    expect(medals).not.toMatch(/ProfileStats|FollowButton/);
  });
});
