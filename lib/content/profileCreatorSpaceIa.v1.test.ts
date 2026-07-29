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
    expect(shell).toMatch(/title="Creator Space"/);
    expect(shell).toMatch(/subtitle="Creator hub"/);

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

    expect(tabs).toMatch(/CREATOR_SPACE_COPY\.tablistAriaLabel/);
    expect(actions).toMatch(/CREATOR_SPACE_COPY\.editOwnerCta/);
    expect(actions).toMatch(/CREATOR_SPACE_COPY\.shareAriaLabel/);
    expect(prompt).toMatch(/CREATOR_SPACE_COPY\.browseCta/);
    expect(prompt).toMatch(/CREATOR_SPACE_COPY\.browsePrompt/);
    expect(experience).toMatch(/CREATOR_SPACE_COPY\.notFoundEyebrow/);
    expect(experience).toMatch(/CREATOR_SPACE_COPY\.mockBanner/);
    expect(videos).toMatch(/CREATOR_SPACE_COPY\.videosEmptyDescription/);
    expect(videos).toMatch(/CREATOR_SPACE_COPY\.videosShowingLatest/);

    // Preserve identity stack order from prior closed tasks.
    expect(experience).toMatch(/ProfileIdentityStrip/);
    expect(experience).toMatch(/ProfileIdentityAchievements/);
    expect(`${tabs}\n${actions}\n${prompt}\n${experience}`).not.toMatch(
      /DiscoverExperience|HomeFeed|shouldMountHomeCircularArc|HomeCircularArc/
    );
  });
});
