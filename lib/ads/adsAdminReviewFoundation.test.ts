import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isPlatformAdminUser } from "./adminAuth";
import {
  PLATFORM_ADMIN_REVIEW_RPCS,
  assertAdminAdvertiserAction,
  assertAdminCampaignAction,
  assertAdminCreativeAction,
  resolveReviewerIdFromAuth,
} from "./adminReview";
import { ADS_DELIVERY_ENABLED } from "./constants";
import { APP_ROUTES } from "../../app/lib/nav/routes";
import { PROTECTED_PREFIXES } from "../env/supabaseAuthGate";
import type { User } from "@supabase/supabase-js";

const ROOT = process.cwd();
const MIGRATION = "supabase/migrations/20260806_ads_admin_review_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function fakeUser(partial: Partial<User> & { id: string }): User {
  return {
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "",
    ...partial,
  } as User;
}

describe("ads admin permissions", () => {
  it("recognizes platform admin JWT claims", () => {
    expect(
      isPlatformAdminUser(
        fakeUser({
          id: "u1",
          app_metadata: { platform_admin: true },
        })
      )
    ).toBe(true);
    expect(
      isPlatformAdminUser(
        fakeUser({
          id: "u1",
          app_metadata: { role: "platform_admin" },
        })
      )
    ).toBe(true);
  });

  it("denies ordinary users and advertiser-looking metadata", () => {
    expect(isPlatformAdminUser(null)).toBe(false);
    expect(
      isPlatformAdminUser(
        fakeUser({
          id: "u1",
          app_metadata: { role: "admin" },
        })
      )
    ).toBe(false);
    expect(
      isPlatformAdminUser(
        fakeUser({
          id: "u1",
          app_metadata: {},
        })
      )
    ).toBe(false);
  });

  it("never takes reviewer identity from client-supplied values", () => {
    expect(resolveReviewerIdFromAuth("auth-user-id")).toBe("auth-user-id");
    expect(resolveReviewerIdFromAuth(null)).toBeNull();
    expect(resolveReviewerIdFromAuth("")).toBeNull();
  });
});

describe("ads admin workflow contracts", () => {
  it("allows approve/reject only from pending_review", () => {
    expect(assertAdminAdvertiserAction("pending_review", "approve").ok).toBe(
      true
    );
    expect(assertAdminAdvertiserAction("approved", "approve").ok).toBe(false);
    expect(assertAdminAdvertiserAction("approved", "reject").ok).toBe(false);
    expect(assertAdminCampaignAction("pending_review", "reject").ok).toBe(true);
    expect(assertAdminCampaignAction("approved", "reject").ok).toBe(false);
    expect(assertAdminCreativeAction("pending_review", "approve").ok).toBe(
      true
    );
    expect(assertAdminCreativeAction("approved", "approve").ok).toBe(false);
  });

  it("supports suspend and restore workflows", () => {
    expect(assertAdminAdvertiserAction("approved", "suspend").ok).toBe(true);
    expect(assertAdminAdvertiserAction("suspended", "restore").ok).toBe(true);
    expect(assertAdminAdvertiserAction("approved", "restore").ok).toBe(false);
    expect(assertAdminCampaignAction("active", "pause").ok).toBe(true);
    expect(assertAdminCampaignAction("suspended", "restore").ok).toBe(true);
    expect(assertAdminCreativeAction("approved", "suspend").ok).toBe(true);
    expect(assertAdminCreativeAction("suspended", "restore").ok).toBe(true);
  });

  it("cannot approve twice / reject approved incorrectly", () => {
    expect(assertAdminAdvertiserAction("approved", "approve").ok).toBe(false);
    expect(assertAdminCampaignAction("approved", "approve").ok).toBe(false);
    expect(assertAdminCreativeAction("rejected", "approve").ok).toBe(false);
    expect(assertAdminCreativeAction("approved", "reject").ok).toBe(false);
  });
});

describe("ads admin migration + route protection", () => {
  it("ships admin review migration with reviewer_id = auth and no anon grants", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/is_platform_admin/);
    expect(sql).toMatch(/require_platform_admin/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/admin_sanitize_search/);
    expect(sql).toMatch(/ad_review_events_append_only/);
    expect(sql).toMatch(/revoke insert, update, delete on table public\.platform_admins from authenticated/);
    expect(sql).toMatch(/reviewer := public\.require_platform_admin/);
    expect(sql).toMatch(/admin_approve_advertiser_account/);
    expect(sql).toMatch(/admin_restore_advertiser_account/);
    expect(sql).toMatch(/admin_list_review_events/);
    expect(sql).toMatch(/revoke all on function public\.admin_approve_advertiser_account/);
    expect(sql).not.toMatch(
      /grant execute on function public\.admin_approve_advertiser_account\(uuid\) to anon/
    );
    expect(sql).not.toMatch(/insert into public\.platform_admins/);
    expect(sql).toMatch(/Platform admins read ad creatives/);
    for (const rpc of PLATFORM_ADMIN_REVIEW_RPCS) {
      expect(sql).toContain(rpc);
    }
  });

  it("DB admin check ignores JWT-only claims in SQL authority path", () => {
    const sql = read(MIGRATION);
    expect(sql).not.toMatch(/raw_app_meta_data/);
    expect(sql).not.toMatch(/app_metadata/);
    expect(sql).toMatch(/from public\.platform_admins a/);
  });

  it("protects admin routes and keeps delivery off", () => {
    expect(APP_ROUTES.adminAds).toBe("/admin/ads");
    expect(APP_ROUTES.adminAdsAdvertisers).toBe("/admin/ads/advertisers");
    expect(APP_ROUTES.adminAdsCampaigns).toBe("/admin/ads/campaigns");
    expect(APP_ROUTES.adminAdsCreatives).toBe("/admin/ads/creatives");
    expect(APP_ROUTES.adminAdsReviews).toBe("/admin/ads/reviews");
    expect(APP_ROUTES.adminAdsDiagnostics).toBe("/admin/ads/diagnostics");
    expect(PROTECTED_PREFIXES).toContain("/admin");
    expect(ADS_DELIVERY_ENABLED).toBe(false);
    expect(existsSync(join(ROOT, "app/admin/ads/page.tsx"))).toBe(true);
    expect(
      existsSync(join(ROOT, "app/admin/ads/diagnostics/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(join(ROOT, "docs/ads/ADS_ADMIN_REVIEW_FOUNDATION_V1.md"))
    ).toBe(true);
    const diagnosticsPage = read("app/admin/ads/diagnostics/page.tsx");
    expect(diagnosticsPage).toMatch(/requireAdminAdsSession/);
    expect(diagnosticsPage).toMatch(/executeAdsDiagnosticRunnerV1/);
    expect(diagnosticsPage).toMatch(/diagnosticRunnerServer/);
    expect(diagnosticsPage).not.toMatch(/createAdsDiagnosticAdminGate/);
    expect(diagnosticsPage).not.toMatch(/runAdsDiagnosticRunnerV1\b/);
    expect(diagnosticsPage).not.toMatch(/advertiseDashboard|requireAccountManager/);
    const index = read("lib/ads/index.ts");
    expect(index).not.toMatch(/from ["'].*diagnosticRunnerServer["']/);
    expect(index).not.toMatch(
      /export\s*\{[^}]*executeAdsDiagnosticRunnerV1/
    );
  });

  it("gates admin pages and actions via DB RPC; advertisers cannot use admin actions", () => {
    const gate = read("app/admin/ads/requireAdminAds.ts");
    const actions = read("app/actions/adsAdmin.ts");
    const auth = read("lib/ads/adminAuth.ts");
    const queries = read("lib/ads/adminQueries.ts");
    const advertiserActions = read("app/actions/ads.ts");
    const menu = read("app/lib/nav/userMenuItems.ts");
    const top = read("app/components/AppTopNav.tsx");

    expect(auth).toMatch(/assertPlatformAdminDb/);
    expect(gate).toMatch(/assertPlatformAdminDb/);
    expect(actions).toMatch(/assertPlatformAdminDb/);
    expect(queries).toMatch(/is_platform_admin/);
    expect(actions).toMatch(/requirePlatformAdmin/);
    expect(actions).toMatch(/approveAdvertiserAction/);
    expect(actions).not.toMatch(/formData\.get\(["']reviewer/);
    expect(advertiserActions).not.toMatch(/admin_approve_/);
    expect(advertiserActions).not.toMatch(/approveAdvertiser\(/);
    // Capability Links V1: Admin may appear in UserMenu only behind showAdmin.
    expect(menu).toMatch(/showAdmin/);
    expect(menu).toMatch(/APP_ROUTES\.adminAds/);
    expect(top).not.toMatch(/adminAds/);
  });

  it("documents audit immutability and spent/metrics protection", () => {
    const docs = read("docs/ads/ADS_ADMIN_REVIEW_FOUNDATION_V1.md");
    expect(docs.toLowerCase()).toMatch(/audit/);
    expect(docs.toLowerCase()).toMatch(/reviewer/);
    expect(docs.toLowerCase()).toMatch(/spent/);
    expect(docs.toLowerCase()).toMatch(/platform admin/);
    expect(docs.toLowerCase()).toMatch(/sole authority/);
  });
});
