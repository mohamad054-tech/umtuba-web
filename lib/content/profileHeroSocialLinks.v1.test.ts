import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROFILE_HERO_SOCIAL_LINK_MAX,
  formatWebsiteLabel,
  normalizeHeroSocialLinks,
  shouldShowHeroSocialLinks,
  shouldShowHeroWebsite,
  toExternalHref,
} from "../../app/profile/lib/profileHeroSocialLinks";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Hero Social Links V1 — helpers", () => {
  it("normalizes external hrefs and blocks unsafe schemes", () => {
    expect(toExternalHref(null)).toBeNull();
    expect(toExternalHref("  ")).toBeNull();
    expect(toExternalHref("umtuba.world/lina")).toBe(
      "https://umtuba.world/lina"
    );
    expect(toExternalHref("https://umtuba.world/lina")).toBe(
      "https://umtuba.world/lina"
    );
    expect(toExternalHref("javascript:alert(1)")).toBeNull();
    expect(formatWebsiteLabel("https://umtuba.world/lina")).toBe(
      "umtuba.world/lina"
    );
    expect(shouldShowHeroWebsite("umtuba.world")).toBe(true);
    expect(shouldShowHeroWebsite("")).toBe(false);
  });

  it("normalizes social links: trim, require label+href, dedupe, max 4", () => {
    expect(normalizeHeroSocialLinks(null)).toEqual([]);
    expect(
      normalizeHeroSocialLinks([
        { label: " ", href: "https://a.example" },
        { label: "Portfolio", href: "umtuba.world/lina" },
        { label: "Dup", href: "https://umtuba.world/lina" },
        { label: "YouTube", href: "https://youtube.com/@lina" },
        { label: "Bad", href: "javascript:nope" },
        { label: "X", href: "https://x.com/lina" },
        { label: "IG", href: "https://instagram.com/lina" },
        { label: "Extra", href: "https://extra.example" },
      ])
    ).toEqual([
      { label: "Portfolio", href: "https://umtuba.world/lina" },
      { label: "YouTube", href: "https://youtube.com/@lina" },
      { label: "X", href: "https://x.com/lina" },
      { label: "IG", href: "https://instagram.com/lina" },
    ]);
    expect(PROFILE_HERO_SOCIAL_LINK_MAX).toBe(4);
    expect(shouldShowHeroSocialLinks([])).toBe(false);
    expect(
      shouldShowHeroSocialLinks([{ label: "Site", href: "https://a.test" }])
    ).toBe(true);
  });
});

describe("Hero Social Links V1 — wiring", () => {
  it("wires safe website + social row in Header without inventing cover/verified", () => {
    const header = read("app/profile/components/ProfileHeader.tsx");
    const helper = read("app/profile/lib/profileHeroSocialLinks.ts");
    const experience = read("app/profile/ProfileExperience.tsx");

    expect(helper).toMatch(/export function toExternalHref/);
    expect(helper).toMatch(/export function normalizeHeroSocialLinks/);
    expect(header).toMatch(/normalizeHeroSocialLinks/);
    expect(header).toMatch(/toExternalHref/);
    expect(header).toMatch(/Creator links/);
    expect(header).toMatch(/noopener noreferrer/);
    expect(header).not.toMatch(/\bverified\b/i);
    expect(header).not.toMatch(/cover_url|coverUrl/);
    expect(experience).toMatch(/ProfileIdentityStrip/);
    expect(experience).toMatch(/ProfileIdentityAchievements/);
    // Keep dependency order: Hero → Strip → Achievements → Stats
    const headerIdx = experience.indexOf("<ProfileHeader");
    const stripIdx = experience.indexOf("<ProfileIdentityStrip");
    const medalsIdx = experience.indexOf("<ProfileIdentityAchievements");
    const statsIdx = experience.indexOf("<ProfileStats");
    expect(headerIdx).toBeGreaterThan(-1);
    expect(stripIdx).toBeGreaterThan(headerIdx);
    expect(medalsIdx).toBeGreaterThan(stripIdx);
    expect(statsIdx).toBeGreaterThan(medalsIdx);
    expect(`${header}\n${helper}\n${experience}`).not.toMatch(
      /DiscoverExperience|HomeFeed|shouldMountHomeCircularArc|HomeCircularArc/
    );
    expect(
      existsSync(join(ROOT, "app/profile/lib/profileHeroSocialLinks.ts"))
    ).toBe(true);
  });
});
