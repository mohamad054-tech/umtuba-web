import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyDailyCap,
  isSelfInteraction,
  UM_POINTS_REWARDS,
} from "./umPointsConfig";

const ROOT = join(process.cwd());

function readRepoFile(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts), "utf8");
}

function listSourceFiles(dir: string, acc: string[] = []): string[] {
  const abs = join(ROOT, dir);
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const rel = join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      listSourceFiles(rel, acc);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) acc.push(rel);
  }
  return acc;
}

describe("UM Points award security — pre-fix findings as regressions", () => {
  it("retires the generic client award RPC in the security migration", () => {
    const sql = readRepoFile(
      "supabase/migrations/20260723_um_points_award_security.sql"
    );

    expect(sql).toMatch(/create or replace function public\.award_um_points\(/i);
    expect(sql).toMatch(
      /UM Points awards are not available via client RPC/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.award_um_points\(integer, text, text, jsonb\) from authenticated/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.award_um_points_to_user\(uuid, integer, text, text, jsonb, integer\) from authenticated/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.award_um_points\(/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.award_um_points_to_user\(/i
    );
  });

  it("removes the generic award server action and supabase helper", () => {
    const actions = readRepoFile("app/actions/notifications.ts");
    const notificationsLib = readRepoFile("lib/supabase/notifications.ts");

    expect(actions).not.toMatch(/awardUmPointsAction/);
    expect(actions).not.toMatch(/awardUmPoints\b/);
    expect(actions).not.toMatch(/award_um_points/);
    expect(notificationsLib).not.toMatch(/export async function awardUmPoints/);
    expect(notificationsLib).not.toMatch(/rpc\(\s*["']award_um_points["']/);
  });

  it("keeps no client/component imports of a generic point-awarding action", () => {
    const sources = [
      ...listSourceFiles("app"),
      ...listSourceFiles("lib"),
    ].filter(
      (path) =>
        !path.endsWith(".test.ts") &&
        !path.endsWith(".test.tsx") &&
        path !== "lib/rewards/umPointsAwardSecurity.test.ts"
    );

    for (const path of sources) {
      const src = readRepoFile(path);
      expect(src, path).not.toMatch(/awardUmPointsAction/);
      expect(src, path).not.toMatch(/rpc\(\s*["']award_um_points["']/);
      expect(src, path).not.toMatch(/rpc\(\s*["']award_um_points_to_user["']/);
    }
  });
});

describe("UM Points award security — trusted flow contracts", () => {
  it("keeps fixed reward amounts owned by server/database config mirrors", () => {
    // Clients must not supply these; trusted SQL reads um_points_config.
    expect(UM_POINTS_REWARDS.verifiedWelcome).toBe(100);
    expect(UM_POINTS_REWARDS.referralSignup).toBe(20);
    expect(UM_POINTS_REWARDS.firstPostOfDay).toBe(25);
    expect(UM_POINTS_REWARDS.meaningfulComment).toBe(5);
    expect(UM_POINTS_REWARDS.dailyEarnCap).toBe(200);
  });

  it("blocks self-award style social interactions at the rule layer", () => {
    expect(isSelfInteraction("user-a", "user-a")).toBe(true);
    expect(isSelfInteraction("user-a", "user-b")).toBe(false);
  });

  it("preserves idempotent daily-cap behavior for legitimate earn paths", () => {
    expect(applyDailyCap(0, UM_POINTS_REWARDS.verifiedWelcome).awarded).toBe(
      100
    );
    expect(applyDailyCap(200, UM_POINTS_REWARDS.verifiedWelcome)).toEqual({
      awarded: 0,
      blocked: true,
      reason: "daily_cap",
    });
    // Repeating the same eligible event after the cap is exhausted cannot mint more.
    expect(applyDailyCap(200, UM_POINTS_REWARDS.referralSignup).blocked).toBe(
      true
    );
  });

  it("documents that welcome / referral claim RPCs stay client-callable with fixed rules", () => {
    const welcome = readRepoFile(
      "supabase/migrations/20260717_notifications_v2_automation.sql"
    );
    const referral = readRepoFile(
      "supabase/migrations/20260722_referral_rewards_v1.sql"
    );
    const rewardsLib = readRepoFile("lib/supabase/rewards.ts");

    expect(welcome).toMatch(
      /grant execute on function public\.claim_verified_welcome_bonus\(\) to authenticated/
    );
    expect(welcome).toMatch(/verified_welcome:/);
    expect(welcome).toMatch(/um_points_config_value\('verified_welcome'/);

    expect(referral).toMatch(
      /grant execute on function public\.claim_my_referral_signup\(/
    );
    expect(referral).toMatch(/award_um_points_to_user\(/);

    expect(rewardsLib).toMatch(/claim_verified_welcome_bonus/);
    expect(rewardsLib).toMatch(/get_my_um_points_summary/);
    expect(rewardsLib).not.toMatch(/award_um_points/);
  });

  it("keeps own-balance and own-ledger read paths in the rewards client", () => {
    const rewardsLib = readRepoFile("lib/supabase/rewards.ts");
    const walletAdapter = readRepoFile("lib/wallet/adapters/umPoints.ts");
    const migrationV2 = readRepoFile(
      "supabase/migrations/20260716_notifications_v2.sql"
    );

    expect(rewardsLib).toMatch(/get_my_um_points_summary/);
    expect(walletAdapter).toMatch(/um_point_balances/);
    expect(migrationV2).toMatch(/Users can view own UM point balance/);
    expect(migrationV2).toMatch(/Users can view own UM points ledger/);
    expect(migrationV2).toMatch(
      /revoke insert, update, delete on public\.um_point_balances from anon, authenticated/
    );
    expect(migrationV2).toMatch(
      /revoke insert, update, delete on public\.um_points_ledger from anon, authenticated/
    );
  });

  it("re-asserts table write lockdown in the security migration", () => {
    const sql = readRepoFile(
      "supabase/migrations/20260723_um_points_award_security.sql"
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on public\.um_point_balances from anon, authenticated/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on public\.um_points_ledger from anon, authenticated/
    );
  });
});

describe("UM Points award security — forge / cross-user denial contracts", () => {
  it("ensures forged reason/amount/dedupe cannot be passed through app actions", () => {
    const actions = readRepoFile("app/actions/notifications.ts");
    const walletActions = readRepoFile("app/actions/wallet.ts");
    const referralActions = readRepoFile("app/actions/referral.ts");

    for (const src of [actions, walletActions, referralActions]) {
      expect(src).not.toMatch(/p_points/);
      expect(src).not.toMatch(/p_dedupe_key/);
      expect(src).not.toMatch(/award_um_points/);
      expect(src).not.toMatch(/award_um_points_to_user/);
    }
  });

  it("keeps referral claim server-owned (no client-chosen points/reason)", () => {
    const referralLib = readRepoFile("lib/supabase/referral.ts");
    expect(referralLib).toMatch(/claim_my_referral_signup/);
    expect(referralLib).toMatch(/p_referral_code/);
    expect(referralLib).not.toMatch(/p_code:/);
    expect(referralLib).not.toMatch(/award_um_points/);
    expect(referralLib).not.toMatch(/p_points/);
  });
});
