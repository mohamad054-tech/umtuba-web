import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatAboutJoinedBody,
  formatHeroJoinedLine,
  stripJoinedPrefix,
} from "../../app/profile/lib/profileJoinedLabel";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Hero Joined Label V1 — helpers", () => {
  it("strips Joined prefix and formats Hero/About without duplication", () => {
    expect(stripJoinedPrefix(null)).toBe("");
    expect(stripJoinedPrefix("  ")).toBe("");
    expect(stripJoinedPrefix("Joined March 2024")).toBe("March 2024");
    expect(stripJoinedPrefix("march 2024")).toBe("march 2024");
    expect(formatHeroJoinedLine("Joined March 2024")).toBe("Joined March 2024");
    expect(formatHeroJoinedLine("March 2024")).toBe("Joined March 2024");
    expect(formatHeroJoinedLine("Joined recently")).toBe("Joined recently");
    expect(formatHeroJoinedLine("")).toBeNull();
    expect(formatAboutJoinedBody("Joined March 2024")).toBe("March 2024");
    expect(formatAboutJoinedBody("March 2024")).toBe("March 2024");
    expect(formatAboutJoinedBody("")).toBeNull();
  });
});

describe("Hero Joined Label V1 — wiring", () => {
  it("wires Hero and About through helpers without inventing cover/verified", () => {
    const helper = read("app/profile/lib/profileJoinedLabel.ts");
    const header = read("app/profile/components/ProfileHeader.tsx");
    const about = read("app/profile/components/ProfileAbout.tsx");
    const experience = read("app/profile/ProfileExperience.tsx");

    expect(helper).toMatch(/export function formatHeroJoinedLine/);
    expect(helper).toMatch(/export function formatAboutJoinedBody/);
    expect(header).toMatch(/formatHeroJoinedLine/);
    expect(header).not.toMatch(/Joined \{profile\.about\.joinedLabel\}/);
    expect(about).toMatch(/formatAboutJoinedBody/);
    expect(experience).toMatch(/ProfileIdentityStrip/);
    expect(experience).toMatch(/ProfileIdentityAchievements/);
    expect(`${header}\n${helper}`).not.toMatch(/\bverified\b/i);
    expect(`${header}\n${helper}`).not.toMatch(/cover_url|coverUrl/);
    expect(`${header}\n${about}\n${experience}`).not.toMatch(
      /DiscoverExperience|HomeFeed|shouldMountHomeCircularArc|HomeCircularArc/
    );
    expect(existsSync(join(ROOT, "app/profile/lib/profileJoinedLabel.ts"))).toBe(
      true
    );
  });
});
