import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CREATOR_SPACE_COPY,
  CREATOR_SPACE_PRODUCT_NAME,
} from "../../app/profile/lib/profileCreatorSpaceIa";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Creator Space IA Rename V1 — copy contract", () => {
  it("exports Creator Space product naming without renaming the route", () => {
    expect(CREATOR_SPACE_PRODUCT_NAME).toBe("Creator Space");
    expect(CREATOR_SPACE_COPY.tablistAriaLabel).toBe("Creator Space sections");
    expect(CREATOR_SPACE_COPY.browseCta).toBe("Browse Creator Space");
    expect(CREATOR_SPACE_COPY.editOwnerCta).toBe("Edit Creator Space");

    const shell = read("app/profile/components/ProfileShell.tsx");
    expect(shell).toMatch(/t\("profile.creatorSpace"\)/);
    expect(shell).toMatch(/t\("profile.creatorHub"\)/);

    // Route path stays /profile — no rename GO in this phase.
    const prompt = read("app/profile/components/ProfileLinkedArticlePrompt.tsx");
    expect(prompt).toMatch(/\/profile\/\$\{username/);
    expect(prompt).not.toMatch(/\/creator-space\//);
    expect(
      existsSync(join(ROOT, "app/profile/lib/profileCreatorSpaceIa.ts"))
    ).toBe(true);
  });

  it("wires user-facing Profile copy to Creator Space across shell surfaces", () => {
    const tabs = read("app/profile/components/ProfileTabs.tsx");
    const actions = read("app/profile/components/ProfileActions.tsx");
    const prompt = read("app/profile/components/ProfileLinkedArticlePrompt.tsx");
    const experience = read("app/profile/ProfileExperience.tsx");
    const videos = read("app/profile/components/ProfileVideoGrid.tsx");

    expect(tabs).toMatch(/t\("profile.tablistAria"\)/);
    expect(actions).toMatch(/t\("profile.editOwnerCta"\)/);
    expect(actions).toMatch(/t\("profile.shareAria"\)/);
    expect(prompt).toMatch(/t\("profile.browseCta"\)/);
    expect(prompt).toMatch(/t\("profile.browsePrompt"\)/);
    expect(experience).toMatch(/t\("profile.notFoundEyebrow"\)/);
    expect(experience).toMatch(/t\("profile.mockBanner"\)/);
    expect(videos).toMatch(/t\("profile.videosShowingLatest"\)/);
    expect(videos).toMatch(/PROFILE_EMPTY_STATES_COPY/);

    // Preserve identity stack order from prior closed tasks.
    expect(experience).toMatch(/ProfileIdentityStrip/);
    expect(experience).toMatch(/ProfileIdentityAchievements/);
    expect(`${tabs}\n${actions}\n${prompt}\n${experience}`).not.toMatch(
      /DiscoverExperience|HomeFeed|shouldMountHomeCircularArc|HomeCircularArc/
    );
  });
});
