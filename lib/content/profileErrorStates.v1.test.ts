import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROFILE_ERROR_SOFT_BANNER_CLASS,
  PROFILE_ERROR_STATES_COPY,
  shouldShowProfileErrorRetry,
} from "../../app/profile/lib/profileErrorStates";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Creator Space Error States V1 — helpers", () => {
  it("exposes §20 soft-banner copy and retry gate", () => {
    expect(PROFILE_ERROR_STATES_COPY.statsSoftBanner).toMatch(/stats/i);
    expect(PROFILE_ERROR_STATES_COPY.allPanel).toMatch(/Content/);
    expect(PROFILE_ERROR_STATES_COPY.retryCta).toBe("Try again");
    expect(PROFILE_ERROR_STATES_COPY.shareError).toMatch(/Creator Space/);
    expect(PROFILE_ERROR_SOFT_BANNER_CLASS).toMatch(/amber/);
    expect(typeof shouldShowProfileErrorRetry).toBe("function");
    expect(shouldShowProfileErrorRetry(() => undefined)).toBe(true);
    expect(shouldShowProfileErrorRetry(undefined)).toBe(false);
    expect(shouldShowProfileErrorRetry(null)).toBe(false);
  });
});

describe("Creator Space Error States V1 — wiring", () => {
  it("wires soft stats banner, panel errors with Retry, and share alert", () => {
    const helper = read("app/profile/lib/profileErrorStates.ts");
    const panelError = read("app/profile/components/ProfilePanelError.tsx");
    const experience = read("app/profile/ProfileExperience.tsx");
    const all = read("app/profile/components/ProfileAllPanel.tsx");
    const articles = read("app/profile/components/ProfileArticlesPanel.tsx");
    const videos = read("app/profile/components/ProfileVideoGrid.tsx");
    const photos = read("app/profile/components/ProfilePhotosPanel.tsx");
    const live = read("app/profile/components/ProfileLivePanel.tsx");
    const actions = read("app/profile/components/ProfileActions.tsx");

    expect(helper).toMatch(/PROFILE_ERROR_STATES_COPY/);
    expect(helper).toMatch(/shouldShowProfileErrorRetry/);
    expect(panelError).toMatch(/shouldShowProfileErrorRetry/);
    expect(experience).toMatch(/PROFILE_ERROR_STATES_COPY\.statsSoftBanner/);
    expect(experience).toMatch(/router\.refresh/);
    expect(experience).toMatch(/onRetry=\{retrySecondaryFetch\}/);
    expect(experience).toMatch(/ProfileNotFound/);
    expect(all).toMatch(/ProfilePanelError/);
    expect(all).toMatch(/PROFILE_ERROR_STATES_COPY\.allPanel/);
    expect(articles).toMatch(/ProfilePanelError/);
    expect(videos).toMatch(/ProfilePanelError/);
    expect(photos).toMatch(/ProfilePanelError/);
    expect(live).toMatch(/ProfilePanelError/);
    expect(actions).toMatch(/PROFILE_ERROR_STATES_COPY\.shareError/);
    expect(actions).toMatch(/role="alert"/);
    expect(experience).toMatch(/not found/);
    expect(
      `${helper}\n${experience}\n${all}\n${videos}\n${actions}`
    ).not.toMatch(
      /DiscoverExperience|HomeFeed|shouldMountHomeCircularArc|HomeCircularArc/
    );
    expect(
      existsSync(join(ROOT, "app/profile/components/ProfilePanelError.tsx"))
    ).toBe(true);
  });
});
