import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROFILE_EMPTY_STATES_COPY,
  shouldShowOwnerEmptyCreateActions,
} from "../../app/profile/lib/profileEmptyStates";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Creator Space Empty States V1 — helpers", () => {
  it("exposes All/Videos copy and owner create gate", () => {
    expect(PROFILE_EMPTY_STATES_COPY.allTitle).toBe(
      "No published content yet."
    );
    expect(shouldShowOwnerEmptyCreateActions(true)).toBe(true);
    expect(shouldShowOwnerEmptyCreateActions(false)).toBe(false);
  });
});

describe("Creator Space Empty States V1 — wiring", () => {
  it("wires owner CTAs on All empty and gates Videos upload CTA", () => {
    const helper = read("app/profile/lib/profileEmptyStates.ts");
    const all = read("app/profile/components/ProfileAllPanel.tsx");
    const videos = read("app/profile/components/ProfileVideoGrid.tsx");
    const experience = read("app/profile/ProfileExperience.tsx");

    expect(helper).toMatch(/PROFILE_EMPTY_STATES_COPY/);
    expect(all).toMatch(/isOwner/);
    expect(all).toMatch(/t\("profile.emptyAllTitle"\)/);
    expect(all).toMatch(/shouldShowOwnerEmptyCreateActions/);
    expect(all).toMatch(/APP_ROUTES\.createArticle/);
    expect(all).toMatch(/APP_ROUTES\.createVideo/);
    expect(videos).toMatch(/isOwner/);
    expect(videos).toMatch(/t\("profile.emptyVideos"\)/);
    expect(experience).toMatch(/<ProfileAllPanel[\s\S]*isOwner=\{isOwner\}/);
    expect(experience).toMatch(/<ProfileVideoGrid[\s\S]*isOwner=\{isOwner\}/);
    expect(`${all}\n${videos}\n${experience}`).not.toMatch(
      /DiscoverExperience|HomeFeed|shouldMountHomeCircularArc|HomeCircularArc/
    );
    expect(
      existsSync(join(ROOT, "app/profile/lib/profileEmptyStates.ts"))
    ).toBe(true);
  });
});
