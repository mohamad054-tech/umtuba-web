import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  AD_PLACEMENTS,
  ADS_DELIVERY_ENABLED,
  ADVERTISER_ROLES,
  PROHIBITED_TARGETING_ATTRIBUTES,
} from "./constants";
import {
  canManageAccount,
  canManageCampaigns,
  canApproveAds,
  canMutateSpend,
  canReadMetrics,
  canWriteReviewEvents,
} from "./permissions";
import {
  canActivateCampaign,
  canEditCreative,
  canTransitionAdvertiser,
  canTransitionCampaign,
  canTransitionCreative,
} from "./statusTransitions";
import {
  meetsMinimumAudienceContract,
  validateCampaignBudget,
  validateCampaignDates,
  validateCountryCode,
  validateCreativeMediaPath,
  validateDestinationUrl,
  validateTargeting,
} from "./validation";
import { emptyOverviewMetrics } from "./metrics";
import {
  advertiserCanSelfApprove,
  ADMIN_REVIEW_RPCS,
} from "./reviewWorkflow";
import { APP_ROUTES, advertiseCampaignDetail } from "../../app/lib/nav/routes";

const ROOT = process.cwd();
const MIGRATION = "supabase/migrations/20260807_ads_platform_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("ads budget / currency / dates", () => {
  it("validates minor-unit budgets and ISO currency", () => {
    expect(
      validateCampaignBudget({
        dailyBudgetMinor: 1000,
        totalBudgetMinor: 5000,
        currencyCode: "usd",
      })
    ).toEqual({
      ok: true,
      daily: 1000,
      total: 5000,
      currency: "USD",
    });
  });

  it("rejects float money and total < daily", () => {
    expect(
      validateCampaignBudget({
        dailyBudgetMinor: 10.5,
        totalBudgetMinor: null,
        currencyCode: "USD",
      }).ok
    ).toBe(false);
    expect(
      validateCampaignBudget({
        dailyBudgetMinor: 5000,
        totalBudgetMinor: 1000,
        currencyCode: "USD",
      }).ok
    ).toBe(false);
    expect(
      validateCampaignBudget({
        dailyBudgetMinor: 100,
        totalBudgetMinor: null,
        currencyCode: "US",
      }).ok
    ).toBe(false);
  });

  it("requires end after start", () => {
    expect(
      validateCampaignDates("2026-08-01T00:00:00Z", "2026-08-02T00:00:00Z").ok
    ).toBe(true);
    expect(
      validateCampaignDates("2026-08-02T00:00:00Z", "2026-08-01T00:00:00Z").ok
    ).toBe(false);
  });

  it("validates country codes", () => {
    expect(validateCountryCode("us")).toEqual({ ok: true, code: "US" });
    expect(validateCountryCode("USA").ok).toBe(false);
  });
});

describe("ads destination URL", () => {
  it("allows https only and blocks dangerous schemes", () => {
    expect(validateDestinationUrl("https://example.com/offer").ok).toBe(true);
    expect(validateDestinationUrl("http://example.com/offer").ok).toBe(false);
    expect(validateDestinationUrl("javascript:alert(1)").ok).toBe(false);
    expect(validateDestinationUrl("data:text/html,hi").ok).toBe(false);
    expect(validateDestinationUrl("file:///etc/passwd").ok).toBe(false);
    expect(validateDestinationUrl("https://localhost/x").ok).toBe(false);
    expect(validateDestinationUrl("https://user:pass@evil.com").ok).toBe(false);
  });
});

describe("ads targeting contracts", () => {
  it("supports include/exclude without overlap", () => {
    const ok = validateTargeting({
      countries: ["US"],
      excludeCountries: ["CA"],
      ageMin: 18,
      ageMax: 45,
      placements: ["discover_feed"],
      interests: ["gaming"],
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.targeting.countries).toEqual(["US"]);
      expect(ok.targeting.excludeCountries).toEqual(["CA"]);
    }
  });

  it("rejects include/exclude country conflicts", () => {
    expect(
      validateTargeting({
        countries: ["US"],
        excludeCountries: ["US"],
      }).ok
    ).toBe(false);
  });

  it("blocks prohibited sensitive targeting", () => {
    expect(
      validateTargeting({
        userSegments: ["religion"],
      }).ok
    ).toBe(false);
    expect(
      validateTargeting({
        interests: ["political_affiliation" as "gaming"],
      }).ok
    ).toBe(false);
    for (const attr of PROHIBITED_TARGETING_ATTRIBUTES) {
      expect(attr.length).toBeGreaterThan(3);
    }
  });

  it("enforces teen/minor safety age floor and precise-targeting bans", () => {
    expect(
      validateTargeting({
        ageMin: 12,
        ageMax: 40,
      }).ok
    ).toBe(false);
    expect(
      validateTargeting({
        ageMin: 13,
        ageMax: 17,
        placements: ["discover_feed"],
      }).ok
    ).toBe(true);
    expect(
      validateTargeting({
        ageMin: 13,
        ageMax: 17,
        gender: "female",
      }).ok
    ).toBe(false);
    expect(
      validateTargeting({
        ageMin: 13,
        ageMax: 17,
        cities: ["Riyadh"],
      }).ok
    ).toBe(false);
  });

  it("blocks individual user targeting on include and exclude", () => {
    expect(
      validateTargeting({
        userSegments: ["user:abc"],
      }).ok
    ).toBe(false);
    expect(
      validateTargeting({
        userSegments: ["550e8400-e29b-41d4-a716-446655440000"],
      }).ok
    ).toBe(false);
    expect(
      validateTargeting({
        excludeUserSegments: ["550e8400-e29b-41d4-a716-446655440000"],
      }).ok
    ).toBe(false);
  });

  it("documents minimum audience contract", () => {
    expect(meetsMinimumAudienceContract(null)).toBe(true);
    expect(meetsMinimumAudienceContract(500)).toBe(false);
    expect(meetsMinimumAudienceContract(1000)).toBe(true);
  });
});

describe("ads role permissions", () => {
  it("maps owner/admin/campaign_manager/analyst/viewer correctly", () => {
    expect(canManageAccount("owner")).toBe(true);
    expect(canManageAccount("admin")).toBe(true);
    expect(canManageAccount("campaign_manager")).toBe(false);
    expect(canManageCampaigns("campaign_manager")).toBe(true);
    expect(canManageCampaigns("analyst")).toBe(false);
    expect(canReadMetrics("viewer")).toBe(true);
    expect(canReadMetrics(null)).toBe(false);
    expect(ADVERTISER_ROLES).toContain("analyst");
  });

  it("never lets advertisers approve or mutate spend/metrics audit", () => {
    for (const role of ADVERTISER_ROLES) {
      expect(canApproveAds(role)).toBe(false);
      expect(canMutateSpend(role)).toBe(false);
      expect(canWriteReviewEvents(role)).toBe(false);
    }
    expect(advertiserCanSelfApprove()).toBe(false);
  });
});

describe("ads status transitions", () => {
  it("follows advertiser / campaign / creative workflows", () => {
    expect(canTransitionAdvertiser("draft", "pending_review")).toBe(true);
    expect(canTransitionAdvertiser("draft", "approved")).toBe(false);
    expect(canTransitionCampaign("draft", "pending_review")).toBe(true);
    expect(canTransitionCampaign("draft", "active")).toBe(false);
    expect(canTransitionCreative("draft", "pending_review")).toBe(true);
    expect(canTransitionCreative("approved", "draft")).toBe(false);
  });

  it("cannot activate unapproved campaign", () => {
    expect(
      canActivateCampaign({
        advertiserStatus: "draft",
        campaignStatus: "approved",
        hasApprovedCreative: true,
        hasValidBudget: true,
        hasValidDates: true,
      }).ok
    ).toBe(false);
    expect(
      canActivateCampaign({
        advertiserStatus: "approved",
        campaignStatus: "draft",
        hasApprovedCreative: true,
        hasValidBudget: true,
        hasValidDates: true,
      }).ok
    ).toBe(false);
    expect(
      canActivateCampaign({
        advertiserStatus: "approved",
        campaignStatus: "approved",
        hasApprovedCreative: false,
        hasValidBudget: true,
        hasValidDates: true,
      }).ok
    ).toBe(false);
    expect(
      canActivateCampaign({
        advertiserStatus: "approved",
        campaignStatus: "approved",
        hasApprovedCreative: true,
        hasValidBudget: true,
        hasValidDates: true,
      }).ok
    ).toBe(true);
  });

  it("locks approved creatives from direct edit", () => {
    expect(canEditCreative("approved")).toBe(false);
    expect(canEditCreative("draft")).toBe(true);
  });
});

describe("ads storage path ownership", () => {
  it("requires advertiser/user prefix without traversal", () => {
    const accountId = "11111111-1111-1111-1111-111111111111";
    const userId = "22222222-2222-2222-2222-222222222222";
    expect(
      validateCreativeMediaPath(accountId, userId, `${accountId}/${userId}/file1`)
    ).toBe(true);
    expect(
      validateCreativeMediaPath(accountId, userId, `${accountId}/other/file1`)
    ).toBe(false);
    expect(
      validateCreativeMediaPath(accountId, userId, `${accountId}/${userId}/../x`)
    ).toBe(false);
  });
});

describe("ads migration security contracts", () => {
  it("exists and revokes anon privileged grants", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).toMatch(/force row level security/i);
    expect(sql).toMatch(/revoke all on table public\.advertiser_accounts from anon/i);
    expect(sql).toMatch(/revoke insert, update, delete on table public\.ad_daily_metrics from authenticated/i);
    expect(sql).toMatch(/revoke insert, update, delete on table public\.ad_review_events from authenticated/i);
    expect(sql).toMatch(/ad_campaigns_lock_spent/);
    expect(sql).toMatch(/advertiser_accounts_guard/);
    expect(sql).toMatch(/ad_campaigns_guard/);
    expect(sql).toMatch(/ad_creatives_guard/);
    expect(sql).toMatch(/advertiser_members_guard/);
    expect(sql).toMatch(/activate_ad_campaign/);
    expect(sql).toMatch(/archive_ad_campaign/);
    expect(sql).toMatch(/ad_sets_teen_safety_check/);
    expect(sql).toMatch(/Cannot remove the last owner/);
    expect(sql).toMatch(/Approved creatives are immutable/);
    expect(sql).toMatch(/service_role only/);
    expect(sql).toMatch(/set search_path = public/);
    expect(sql).toMatch(/'ad-creatives'/);
    expect(sql).toMatch(/'ad-creatives',\s*\n\s*false,/);
  });

  it("keeps admin approve RPCs service_role only", () => {
    const sql = read(MIGRATION);
    for (const rpc of ADMIN_REVIEW_RPCS) {
      expect(sql).toContain(rpc);
    }
    expect(sql).toMatch(
      /grant execute on function public\.approve_advertiser_account\(uuid\) to service_role/
    );
    expect(sql).toMatch(
      /revoke all on function public\.approve_advertiser_account\(uuid\) from public, anon, authenticated/
    );
  });
});

describe("ads route / placement / delivery contracts", () => {
  it("defines advertiser routes", () => {
    expect(APP_ROUTES.advertise).toBe("/advertise");
    expect(APP_ROUTES.advertiseApply).toBe("/advertise/apply");
    expect(APP_ROUTES.advertiseDashboard).toBe("/advertise/dashboard");
    expect(APP_ROUTES.advertiseCampaigns).toBe("/advertise/campaigns");
    expect(APP_ROUTES.advertiseCampaignsNew).toBe("/advertise/campaigns/new");
    expect(APP_ROUTES.advertiseCreativesNew).toBe("/advertise/creatives/new");
    expect(APP_ROUTES.advertiseSettings).toBe("/advertise/settings");
    expect(advertiseCampaignDetail("abc")).toBe("/advertise/campaigns/abc");
  });

  it("defines placements without live delivery", () => {
    expect(AD_PLACEMENTS).toEqual([
      "discover_feed",
      "watch_feed",
      "stories",
      "live_lobby",
      "search_results",
      "store_catalog",
      "profile_feed",
    ]);
    expect(ADS_DELIVERY_ENABLED).toBe(false);
  });

  it("does not wire delivery into Watch/Discover/Stories", () => {
    const watch = read("app/watch/WatchExperience.tsx");
    const discover = read("app/discover/components/DiscoverShell.tsx");
    expect(watch).not.toMatch(/ad_impression|serveAd|ADS_DELIVERY/);
    expect(discover).not.toMatch(/ad_impression|serveAd|ADS_DELIVERY/);
    expect(existsSync(join(ROOT, "app/advertise/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "docs/ads/ADS_PLATFORM_FOUNDATION_V1.md"))).toBe(
      true
    );
  });

  it("keeps empty metrics honest", () => {
    const m = emptyOverviewMetrics();
    expect(m.impressions).toBe(0);
    expect(m.deliveryEnabled).toBe(false);
    expect(m.note.toLowerCase()).toMatch(/not live|zeros|recorded/);
  });

  it("exposes Advertise from account menu / settings, not primary nav", () => {
    const menu = read("app/lib/nav/userMenuItems.ts");
    const routes = read("app/lib/nav/routes.ts");
    const settings = read("app/settings/SettingsExperience.tsx");
    const top = read("app/components/AppTopNav.tsx");
    const mobile = read("app/lib/nav/mobileNav.ts");
    expect(menu).toMatch(/Advertise/);
    expect(menu).toMatch(/APP_ROUTES\.advertise/);
    expect(settings).toMatch(/APP_ROUTES\.advertise/);
    expect(routes).toMatch(/advertise: "\/advertise"/);
    expect(top).not.toMatch(/APP_ROUTES\.advertise/);
    expect(mobile).not.toMatch(/advertise/);
  });
});
