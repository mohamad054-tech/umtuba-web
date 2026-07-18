import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveMobileProfileHref } from "../nav/mobileNav";
import { APP_ROUTES } from "../nav/routes";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("Phase 3 end-to-end regression contracts", () => {
  it("provides a /profile owner redirect so login next=/profile cannot 404", () => {
    const page = read("app/profile/page.tsx");
    expect(page).toMatch(/buildCreatorProfileHref/);
    expect(page).toMatch(/APP_ROUTES\.settings/);
    expect(page).toMatch(/getProfileByIdFromDb/);
    expect(resolveMobileProfileHref(null, { signedIn: true })).toBe(
      APP_ROUTES.profile
    );
  });

  it("preserves DM message deep-link across Messages auth redirect", () => {
    const page = read("app/messages/page.tsx");
    expect(page).toMatch(/params\.message/);
    expect(page).toMatch(/isUuid\(message\)/);
    expect(page).toMatch(/query\.set\("message"/);
  });

  it("does not invent fake profile usernames from the activity tier chip", () => {
    const indicator = read(
      "app/components/activity-tiers/ActivityTierIndicator.tsx"
    );
    expect(indicator).not.toMatch(/user_\$\{user\.id/);
    expect(indicator).toMatch(/APP_ROUTES\.settings/);
  });

  it("ships route error boundaries on critical surfaces", () => {
    for (const path of [
      "app/messages/error.tsx",
      "app/live/error.tsx",
      "app/watch/error.tsx",
      "app/discover/error.tsx",
      "app/rewards/error.tsx",
    ]) {
      expect(read(path)).toMatch(/RouteErrorFallback/);
    }
  });

  it("gives Rewards summary failures a refresh retry", () => {
    const page = read("app/rewards/page.tsx");
    const retry = read("app/rewards/components/RewardsLoadError.tsx");
    expect(page).toMatch(/RewardsLoadError/);
    expect(retry).toMatch(/router\.refresh/);
  });
});
