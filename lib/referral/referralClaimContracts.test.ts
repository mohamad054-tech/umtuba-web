import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readRepoFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("referral claim contracts", () => {
  it("uses DB param p_referral_code (not p_code) and never client-chosen amounts", () => {
    const referralLib = readRepoFile("lib/supabase/referral.ts");
    const actions = readRepoFile("app/actions/referral.ts");
    const coordinator = readRepoFile("lib/referral/claimCoordinator.ts");

    expect(referralLib).toMatch(/p_referral_code/);
    expect(referralLib).not.toMatch(/p_code:/);
    expect(referralLib).not.toMatch(/p_points/);
    expect(referralLib).not.toMatch(/award_um_points/);

    for (const src of [actions, coordinator]) {
      expect(src).not.toMatch(/p_points/);
      expect(src).not.toMatch(/p_dedupe_key/);
      expect(src).not.toMatch(/award_um_points/);
    }
  });

  it("wires claim coordinator at signup, login, callback, and session", () => {
    const signup = readRepoFile("app/signup/SignupForm.tsx");
    const login = readRepoFile("app/login/page.tsx");
    const callback = readRepoFile("app/auth/callback/route.ts");
    const session = readRepoFile("app/components/ReferralClaimBootstrap.tsx");
    const chrome = readRepoFile("app/components/AppChrome.tsx");

    expect(signup).toMatch(/claimPendingReferralAction/);
    expect(login).toMatch(/claimPendingReferralAction/);
    expect(callback).toMatch(/runReferralClaimCoordinator/);
    expect(session).toMatch(/claimPendingReferralAction/);
    expect(chrome).toMatch(/ReferralClaimBootstrap/);
  });

  it("migration adds visitor resolve + existing-account guard without client awards", () => {
    const sql = readRepoFile(
      "supabase/migrations/20260726_referral_claim_reliability.sql"
    );
    expect(sql).toMatch(/claim_my_referral_signup/);
    expect(sql).toMatch(/not_eligible_existing_account/);
    expect(sql).toMatch(/no_pending_attribution/);
    expect(sql).toMatch(/referral_attributions/);
    expect(sql).toMatch(/complete_referral_signup/);
    expect(sql).not.toMatch(/grant execute on function public\.award_um_points\(/);
  });

  it("documents cookie TTL and clearing policy", () => {
    const cookies = readRepoFile("lib/referral/cookies.ts");
    const config = readRepoFile("lib/referral/config.ts");
    expect(cookies).toMatch(/30 days/);
    expect(cookies).toMatch(/httpOnly/);
    expect(cookies).toMatch(/SameSite=Lax|sameSite: \"lax\"/);
    expect(cookies).toMatch(/clearReferralAttributionCookie/);
    expect(config).toMatch(/REFERRAL_ATTRIBUTION_TTL_SECONDS/);
  });
});
