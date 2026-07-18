import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { profileRowToView } from "../../profile/lib/mapProfile";
import type { ProfileRow } from "../../../lib/supabase/database.types";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const BASE_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "creator_one",
  display_name: "Creator One",
  full_name: "Creator One",
  bio: "Hello",
  city: "Nairobi",
  country: "Kenya",
  avatar_url: null,
  avatar_initial: "C",
  created_at: "2026-01-15T12:00:00.000Z",
  updated_at: "2026-01-15T12:00:00.000Z",
} as ProfileRow;

describe("rewards & profile journey hardening", () => {
  it("routes activity tier chip to a real username profile, not /profile", () => {
    const indicator = read(
      "app/components/activity-tiers/ActivityTierIndicator.tsx"
    );
    expect(indicator).toMatch(/buildCreatorProfileHref/);
    expect(indicator).not.toMatch(/router\.push\(APP_ROUTES\.profile\)/);
    expect(indicator).toMatch(/APP_ROUTES\.rewards/);
  });

  it("propagates own activity-tier RPC failures instead of fake Spark zeros", () => {
    const lib = read("lib/supabase/activityTiers.ts");
    const action = read("app/actions/activityTiers.ts");
    expect(lib).toMatch(
      /get_my_activity_tier_summary[\s\S]*?throw new Error\("Unable to load activity tier\."\)/
    );
    expect(action).toMatch(/sanitizeUserFacingMessage/);
  });

  it("sanitizes wallet action errors and refreshes on visibility/online", () => {
    const walletAction = read("app/actions/wallet.ts");
    const walletHook = read("app/components/wallet/useWalletBalance.ts");
    const tierHook = read("app/components/activity-tiers/useActivityTier.ts");
    expect(walletAction).toMatch(/sanitizeUserFacingMessage/);
    expect(walletHook).toMatch(/visibilitychange/);
    expect(walletHook).toMatch(/online/);
    expect(tierHook).toMatch(/visibilitychange/);
    expect(tierHook).toMatch(/online/);
  });

  it("retries referral claims with backoff and visibility re-entry", () => {
    const bootstrap = read("app/components/ReferralClaimBootstrap.tsx");
    expect(bootstrap).toMatch(/scheduleRetry|MAX_RETRY_ATTEMPTS/);
    expect(bootstrap).toMatch(/visibilitychange/);
    expect(bootstrap).toMatch(/RECONNECT_BASE_MS/);
  });

  it("does not invent zero UM Points when rewards summary fails", () => {
    const page = read("app/rewards/page.tsx");
    expect(page).toMatch(/ProductErrorState/);
    expect(page).toMatch(/if \(!summary\)/);
    expect(page).not.toMatch(/summary\?\.balance \?\? 0/);
  });

  it("marks profile content failures distinctly from empty catalogs", () => {
    const content = read("lib/supabase/profileContent.ts");
    const grid = read("app/profile/components/ProfileVideoGrid.tsx");
    expect(content).toMatch(/failed:\s*true/);
    expect(content).toMatch(/Promise<ProfileContentStats \| null>/);
    expect(grid).toMatch(/loadFailed/);
    expect(grid).toMatch(/Couldn't load videos/);

    const view = profileRowToView(BASE_ROW, {
      followFailed: true,
      statsFailed: true,
      videosFailed: true,
      liveFailed: true,
    });
    expect(view.followersLabel).toBe("—");
    expect(view.likesLabel).toBe("—");
    expect(view.videosLoadFailed).toBe(true);
    expect(view.liveLoadFailed).toBe(true);
  });

  it("wires profile share + tab a11y", () => {
    const actions = read("app/profile/components/ProfileActions.tsx");
    const tabs = read("app/profile/components/ProfileTabs.tsx");
    expect(actions).toMatch(/Share/);
    expect(actions).toMatch(/clipboard\.writeText/);
    expect(tabs).toMatch(/aria-controls/);
    expect(tabs).toMatch(/ArrowRight/);
    expect(tabs).toMatch(/tabIndex=\{active \? 0 : -1\}/);
  });
});
