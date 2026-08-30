import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROFILE_HERO_BIO_EXPAND_MIN_CHARS,
  PROFILE_HERO_SPECIALTY_CHIP_MAX,
  bioNeedsExpandToggle,
  normalizeSpecialtyChips,
} from "../../app/profile/lib/profileHeroCompleteness";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Hero Completeness V1 — helpers", () => {
  it("does not require more/less for short or empty bios", () => {
    expect(bioNeedsExpandToggle("")).toBe(false);
    expect(bioNeedsExpandToggle("   ")).toBe(false);
    expect(bioNeedsExpandToggle("Short bio.")).toBe(false);
    expect(
      bioNeedsExpandToggle("x".repeat(PROFILE_HERO_BIO_EXPAND_MIN_CHARS - 1))
    ).toBe(false);
  });

  it("requires more/less for long bios", () => {
    expect(
      bioNeedsExpandToggle("x".repeat(PROFILE_HERO_BIO_EXPAND_MIN_CHARS))
    ).toBe(true);
    expect(
      bioNeedsExpandToggle(`  ${"y".repeat(PROFILE_HERO_BIO_EXPAND_MIN_CHARS)}  `)
    ).toBe(true);
  });

  it("normalizes specialties: trim, dedupe, drop empties, max 3", () => {
    expect(normalizeSpecialtyChips(null)).toEqual([]);
    expect(normalizeSpecialtyChips([])).toEqual([]);
    expect(normalizeSpecialtyChips(["  ", ""])).toEqual([]);
    expect(
      normalizeSpecialtyChips([
        " Documentary film ",
        "documentary film",
        "City light",
        "",
        "Travel",
        "Extra",
      ])
    ).toEqual(["Documentary film", "City light", "Travel"]);
    expect(PROFILE_HERO_SPECIALTY_CHIP_MAX).toBe(3);
  });
});

describe("Hero Completeness V1 — header wiring", () => {
  it("wires bio clamp/more and specialty chips without inventing fields", () => {
    const header = read("app/profile/components/ProfileHeader.tsx");
    const helper = read("app/profile/lib/profileHeroCompleteness.ts");

    expect(helper).toMatch(/export function normalizeSpecialtyChips/);
    expect(helper).toMatch(/export function bioNeedsExpandToggle/);
    expect(header).toMatch(/"use client"/);
    expect(header).toMatch(/normalizeSpecialtyChips/);
    expect(header).toMatch(/bioNeedsExpandToggle/);
    expect(header).toMatch(/line-clamp-3/);
    expect(header).toMatch(/more|less/);
    expect(header).toMatch(/Creator specialties/);
    expect(header).toMatch(/dir="auto"/);
    expect(header).toMatch(/profile\.hero\.more/);
    expect(header).not.toMatch(/about\.interests/);
    expect(header).not.toMatch(/\bprofession\b/i);
    expect(header).not.toMatch(/\bverified\b/i);
    expect(header).not.toMatch(/cover_url|coverUrl/);
    expect(helper).not.toMatch(/cover_url|coverUrl/);
    expect(helper).toMatch(/normalizeSpecialtyChips/);
    expect(
      existsSync(join(ROOT, "app/profile/lib/profileHeroCompleteness.ts"))
    ).toBe(true);
  });

  it("keeps Stats/Actions outside Header and guards Home/Arc", () => {
    const header = read("app/profile/components/ProfileHeader.tsx");
    const experience = read("app/profile/ProfileExperience.tsx");
    const helper = read("app/profile/lib/profileHeroCompleteness.ts");

    expect(header).not.toMatch(/ProfileActions|ProfileStats/);
    expect(experience).toMatch(/ProfileHeader/);
    expect(experience).toMatch(/ProfileStats/);
    expect(experience).toMatch(/ProfileActions/);
    expect(`${header}\n${helper}`).not.toMatch(
      /DiscoverExperience|HomeFeed|shouldMountHomeCircularArc|HomeCircularArc/
    );
  });
});
