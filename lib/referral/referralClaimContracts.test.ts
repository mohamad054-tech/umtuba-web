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
    expect(sql).toMatch(/revoke all[\s\S]*from anon/i);
    expect(sql).toMatch(/grant execute[\s\S]*to authenticated/i);
    expect(sql).not.toMatch(/do not apply remotely until approved/i);
    expect(sql).not.toMatch(/grant execute on function public\.award_um_points\(/);
  });

  it("ships a B4 database verify script covering visitor resolve and grants", () => {
    const verify = readRepoFile(
      "scripts/verify-referral-claim-reliability.sql"
    );
    expect(verify).toMatch(/claim_rpc_no_anon_execute/);
    expect(verify).toMatch(/claim_body_resolves_visitor_attribution/);
    expect(verify).toMatch(/claim_body_rejects_existing_accounts/);
    expect(verify).toMatch(/not_eligible_existing_account/);
    expect(verify).toMatch(/complete_referral_still_not_client_callable/);
    expect(verify).toMatch(/20260726_referral_claim_reliability\.sql/);
    expect(verify).toMatch(
      /20260728_complete_referral_signup_client_revoke\.sql/
    );
  });

  it("revokes complete_referral_signup execute from public, anon, and authenticated", () => {
    const sql = readRepoFile(
      "supabase/migrations/20260728_complete_referral_signup_client_revoke.sql"
    );
    expect(sql).toMatch(
      /revoke all on function public\.complete_referral_signup\(uuid, text, text, text, text\) from public;/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.complete_referral_signup\(uuid, text, text, text, text\) from anon;/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.complete_referral_signup\(uuid, text, text, text, text\) from authenticated;/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.complete_referral_signup/i
    );
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

  it("documents B4 as a required migration with verify script (not on hold)", () => {
    const readme = readRepoFile("supabase/README.md");
    expect(readme).toMatch(/20260726_referral_claim_reliability\.sql/);
    expect(readme).toMatch(/verify-referral-claim-reliability\.sql/);
    expect(readme).toMatch(/Required for invite-alpha/);
    expect(readme).toMatch(
      /20260728_complete_referral_signup_client_revoke\.sql/
    );
    // B4 + revoke follow-up hold language must be gone; B7 may still be prepared.
    const b4Section = readme.slice(
      readme.indexOf("20260726_referral_claim_reliability.sql"),
      readme.indexOf("20260727_live_stale_participant_prune.sql")
    );
    expect(b4Section).not.toMatch(/Prepared — apply only after review/i);
  });
});
