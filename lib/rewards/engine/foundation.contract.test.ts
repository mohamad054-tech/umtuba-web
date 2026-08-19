import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULE_LIMITS,
  REWARD_EVENT_TYPES,
  REWARDS_CROSS_PLATFORM_CONTRACT,
  RewardsEngine,
  assertNoClientAmount,
  countEnabledPositiveRules,
  createRewardsEngine,
  defaultRuleIdForEvent,
  toPlatformSnapshot,
} from "./index";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260933_rewards_referral_launch_v1.sql";

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("unified rewards migration contract", () => {
  const sql = read(MIGRATION);

  it("is additive, unapplied, and does not destroy history", () => {
    expect(sql).toMatch(/MIGRATION_APPLIED=NO/);
    expect(sql).toMatch(/POLICY_VERSION=launch_v1/);
    expect(sql).toMatch(/POINT_VALUES_CONFIGURED=YES/);
    expect(sql).toMatch(/20260931_NOT_INCLUDED=YES/);
    expect(sql).not.toMatch(/\bdrop table\b/i);
    expect(sql).not.toMatch(/\btruncate table\b/i);
    expect(sql).not.toMatch(/\bdrop column\b/i);
    expect(sql).not.toMatch(/create or replace function public\.complete_referral_signup\(/);
  });

  it("extends the existing wallet and ledger instead of cloning them", () => {
    expect(sql).toMatch(/alter table public\.um_point_balances/);
    expect(sql).toMatch(/pending_balance/);
    expect(sql).toMatch(/lifetime_earned/);
    expect(sql).toMatch(/lifetime_spent/);
    expect(sql).toMatch(/alter table public\.um_points_ledger/);
    expect(sql).not.toMatch(/create table if not exists public\.um_points_ledger_v2/);
    expect(sql).not.toMatch(/create table if not exists public\.um_wallets/);
  });

  it("does not overwrite spendable balance from ledger-only reconcile", () => {
    expect(sql).toMatch(/Spendable UM is um_point_balances\.balance/);
    expect(sql).toMatch(/Do not overwrite balance/);
    expect(sql).toMatch(
      /set pending_balance = excluded\.pending_balance,[\s\S]+lifetime_earned = excluded\.lifetime_earned/
    );
    expect(sql).not.toMatch(
      /on conflict \(user_id\) do update[\s\S]{0,80}set balance = excluded\.balance/
    );
    expect(sql).toMatch(
      /set balance = public\.um_point_balances\.balance \+ excluded\.balance/
    );
  });

  it("does not consume referral_conversions and keeps awards server-authoritative", () => {
    expect(sql).not.toMatch(/insert into public\.referral_conversions/);
    expect(sql).toMatch(/engine_not_authoritative/);
    expect(sql).toMatch(/unified_rewards_engine_authoritative/);
    expect(sql).toMatch(/pg_advisory_xact_lock/);
    expect(sql).toMatch(/self_interaction/);
    expect(sql).toMatch(/when l\.rule_id is null then l\.points/);
    expect(sql).toMatch(/direction <> 'CREDIT'/);
    expect(sql).toMatch(/for update;/);
  });

  it("locks RLS, ownership, idempotency, and admin authority", () => {
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/revoke insert, update, delete on public\.reward_events/);
    expect(sql).toMatch(/constraint reward_events_idempotency_unique unique \(idempotency_key\)/);
    expect(sql).toMatch(/is_platform_admin\(\)/);
    expect(sql).toMatch(/auto_punished boolean not null default false/);
    expect(sql).toMatch(/reward_abuse_flags_no_auto_punish check \(auto_punished = false\)/);
  });

  it("seeds launch_v1 rules and rejects client amounts", () => {
    expect(sql).toMatch(/insert into public\.reward_rules/);
    expect(sql).toMatch(/'capability.video_published'/);
    expect(sql).toMatch(/create or replace function public\.process_reward_event\(/);
    expect(sql).not.toMatch(/process_reward_event\(\s*[^)]*p_points/);
    expect(sql).toMatch(/unauthorized_client_amount/);
    expect(sql).toMatch(/cross_user_forbidden/);
    expect(sql).toMatch(/ingest_verified_reward_event/);
    expect(sql).toMatch(/admin_confirm_reward_qualification/);
    expect(sql).toMatch(/admin_reject_reward_qualification/);
    for (const eventType of REWARD_EVENT_TYPES) {
      expect(sql).toContain(eventType);
    }
  });

  it("defines the shared web/iOS/Android RPC names", () => {
    expect(sql).toContain(`function public.${REWARDS_CROSS_PLATFORM_CONTRACT.rpcs.snapshot}`);
    expect(sql).toContain(`function public.${REWARDS_CROSS_PLATFORM_CONTRACT.rpcs.history}`);
    expect(sql).toContain(`function public.${REWARDS_CROSS_PLATFORM_CONTRACT.rpcs.referral}`);
    expect(sql).toContain(
      `function public.${REWARDS_CROSS_PLATFORM_CONTRACT.rpcs.processEvent}`
    );
    expect(sql).toContain(
      `function public.${REWARDS_CROSS_PLATFORM_CONTRACT.rpcs.attributeReferral}`
    );
    expect(REWARDS_CROSS_PLATFORM_CONTRACT.forbiddenClientEngines).toEqual([
      "IOS_POINTS_ENGINE",
      "ANDROID_POINTS_ENGINE",
      "WEB_POINTS_ENGINE",
    ]);
  });
});

describe("unified rewards reuse — no duplicate client award surfaces", () => {
  it("keeps the new engine off the retired generic award RPC", () => {
    const engine = read("lib/rewards/engine/engine.ts");
    const actions = read("app/actions/rewardsEngine.ts");
    expect(engine).not.toMatch(/award_um_points_to_user/);
    expect(actions).not.toMatch(/award_um_points/);
    expect(actions).not.toMatch(/p_points/);
  });
});

function engineWithEnabledRule(
  eventType: (typeof REWARD_EVENT_TYPES)[number],
  pointsAmount: number,
  extra?: Partial<{ qualificationDelaySeconds: number }>
) {
  const engine = createRewardsEngine();
  engine.updateRule("admin_test", defaultRuleIdForEvent(eventType), {
    enabled: true,
    pointsAmount,
    limits: {
      ...DEFAULT_RULE_LIMITS,
      qualificationDelaySeconds: extra?.qualificationDelaySeconds ?? null,
    },
  });
  return engine;
}

describe("unified rewards engine — launch_v1 defaults", () => {
  it("seeds launch_v1 enabled positive rules", () => {
    const engine = createRewardsEngine();
    const rules = engine.listRules();
    expect(rules).toHaveLength(REWARD_EVENT_TYPES.length);
    expect(engine.countActiveRewardRules()).toBeGreaterThan(0);
    expect(engine.pointValuesConfigured()).toBe(true);
    expect(engine.pointsIssued()).toBe(0);
    expect(countEnabledPositiveRules(rules)).toBeGreaterThan(0);
  });
});

describe("section 18 — reward process matrix", () => {
  it("EVENT_WITH_DISABLED_RULE → 0 reward", () => {
    const result = createRewardsEngine().processVerifiedEvent({
      actorUserId: "user-a",
      eventType: "ADMIN_GRANT",
      idempotencyKey: "admin:1",
      sourceType: "admin",
      sourceId: "1",
    });
    expect(result.awarded).toBe(0);
    expect(result.denialReason).toBe("rule_disabled");
  });

  it("EVENT_WITH_ZERO_RULE → 0 reward", () => {
    const engine = createRewardsEngine();
    engine.updateRule("admin_test", defaultRuleIdForEvent("POST_PUBLISHED"), {
      enabled: true,
      pointsAmount: 0,
    });
    const result = engine.processVerifiedEvent({
      actorUserId: "user-a",
      eventType: "POST_PUBLISHED",
      idempotencyKey: "post:zero",
      sourceType: "post",
      sourceId: "zero",
    });
    expect(result.denialReason).toBe("rule_zero");
    expect(engine.pointsIssued()).toBe(0);
  });

  it("VALID_ENABLED_RULE → one ledger credit", () => {
    const engine = engineWithEnabledRule("POST_PUBLISHED", 7);
    const result = engine.processVerifiedEvent({
      actorUserId: "user-a",
      eventType: "POST_PUBLISHED",
      idempotencyKey: "post:valid",
      sourceType: "post",
      sourceId: "valid",
    });
    expect(result.awarded).toBe(7);
    expect(result.ledgerEntry?.direction).toBe("CREDIT");
    expect(engine.getBalance("user-a").availableBalance).toBe(7);
  });

  it("DUPLICATE_EVENT → no second credit", () => {
    const engine = engineWithEnabledRule("VIDEO_PUBLISHED", 5);
    const input = {
      actorUserId: "user-a",
      eventType: "VIDEO_PUBLISHED" as const,
      idempotencyKey: "video:dup",
      sourceType: "video",
      sourceId: "dup",
    };
    expect(engine.processVerifiedEvent(input).awarded).toBe(5);
    const replay = engine.processVerifiedEvent(input);
    expect(replay.replayed).toBe(true);
    expect(engine.listLedger()).toHaveLength(1);
  });

  it("NETWORK_RETRY → no duplicate", () => {
    const engine = engineWithEnabledRule("COMMENT_CREATED", 3);
    const key = "comment:retry";
    engine.processVerifiedEvent({
      actorUserId: "user-a",
      eventType: "COMMENT_CREATED",
      idempotencyKey: key,
      sourceType: "comment",
      sourceId: "retry",
    });
    expect(
      engine.processVerifiedEvent({
        actorUserId: "user-a",
        eventType: "COMMENT_CREATED",
        idempotencyKey: key,
        sourceType: "comment",
        sourceId: "retry",
      }).replayed
    ).toBe(true);
    expect(engine.listLedger()).toHaveLength(1);
  });

  it("PENDING_REWARD → available stays 0 and pending increases", () => {
    const engine = engineWithEnabledRule("REFERRAL_QUALIFIED", 11, {
      qualificationDelaySeconds: 86_400,
    });
    const result = engine.processVerifiedEvent({
      actorUserId: "user-a",
      eventType: "REFERRAL_QUALIFIED",
      idempotencyKey: "refq:1",
      sourceType: "referral",
      sourceId: "1",
    });
    expect(result.qualification?.status).toBe("PENDING");
    expect(engine.getBalance("user-a")).toMatchObject({
      availableBalance: 0,
      pendingBalance: 11,
      lifetimeEarned: 0,
    });
  });

  it("CONFIRMED_REWARD → balance correct", () => {
    const engine = engineWithEnabledRule("REFERRAL_QUALIFIED", 11, {
      qualificationDelaySeconds: 86_400,
    });
    const pending = engine.processVerifiedEvent({
      actorUserId: "user-a",
      eventType: "REFERRAL_QUALIFIED",
      idempotencyKey: "refq:2",
      sourceType: "referral",
      sourceId: "2",
    });
    expect(
      engine.confirmQualification(pending.qualification!.qualificationId).awarded
    ).toBe(11);
    expect(engine.getBalance("user-a")).toMatchObject({
      availableBalance: 11,
      pendingBalance: 0,
      lifetimeEarned: 11,
    });
  });

  it("REVERSAL → balance correct + history retained", () => {
    const engine = engineWithEnabledRule("MILESTONE_REACHED", 9);
    const granted = engine.processVerifiedEvent({
      actorUserId: "user-a",
      eventType: "MILESTONE_REACHED",
      idempotencyKey: "ms:1",
      sourceType: "milestone",
      sourceId: "1",
    });
    engine.reverseTransaction(
      "admin_test",
      granted.ledgerEntry!.transactionId,
      "admin_correction"
    );
    expect(engine.listLedger()).toHaveLength(2);
    expect(engine.getBalance("user-a")).toMatchObject({
      availableBalance: 0,
      lifetimeSpent: 9,
      lifetimeEarned: 9,
    });
  });

  it("RULE_VERSION_CHANGE → old transactions unchanged", () => {
    const engine = engineWithEnabledRule("FIRST_POST", 4);
    const first = engine.processVerifiedEvent({
      actorUserId: "user-a",
      eventType: "FIRST_POST",
      idempotencyKey: "fp:1",
      sourceType: "post",
      sourceId: "1",
    });
    engine.updateRule("admin_test", defaultRuleIdForEvent("FIRST_POST"), {
      pointsAmount: 40,
    });
    expect(engine.listLedger()[0].amount).toBe(first.ledgerEntry!.amount);
    expect(engine.listLedger()[0].ruleVersion).toBe(first.ledgerEntry!.ruleVersion);
    expect(engine.getRule(defaultRuleIdForEvent("FIRST_POST"))?.pointsAmount).toBe(40);
  });

  it("UNAUTHORIZED_CLIENT_AMOUNT → rejected", () => {
    const result = engineWithEnabledRule("LIKE_RECEIVED", 2).processVerifiedEvent({
      actorUserId: "user-a",
      eventType: "LIKE_RECEIVED",
      idempotencyKey: "like:forge",
      sourceType: "like",
      sourceId: "forge",
      clientAmount: 9999,
    });
    expect(result.denialReason).toBe("unauthorized_client_amount");
    expect(assertNoClientAmount({ points: 50 }).ok).toBe(false);
  });

  it("USER_A_CANNOT_MUTATE_USER_B_WALLET → PASS", () => {
    const engine = engineWithEnabledRule("ADMIN_GRANT", 15);
    const result = engine.processVerifiedEvent({
      actorUserId: "user-a",
      subjectUserId: "user-b",
      eventType: "ADMIN_GRANT",
      idempotencyKey: "grant:b",
      sourceType: "admin",
      sourceId: "b",
    });
    expect(result.denialReason).toBe("cross_user_forbidden");
    expect(engine.getBalance("user-b").availableBalance).toBe(0);
  });
});

describe("section 18 — referral matrix", () => {
  it("SELF_REFERRAL → rejected", () => {
    const engine = createRewardsEngine();
    const result = engine.attributeReferral({
      invitedUserId: "user-a",
      referralCode: engine.ensureReferralCode("user-a").code,
    });
    expect(result.denialReason).toBe("referral_self");
    expect(engine.listAbuseFlags().every((flag) => flag.autoPunished === false)).toBe(true);
  });

  it("DUPLICATE_REFERRAL → rejected", () => {
    const engine = createRewardsEngine();
    const codeA = engine.ensureReferralCode("inviter-a").code;
    engine.ensureReferralCode("inviter-b");
    expect(
      engine.attributeReferral({
        invitedUserId: "invitee-1",
        referralCode: codeA,
        signupCompleted: true,
      }).accepted
    ).toBe(true);
    expect(
      engine.attributeReferral({
        invitedUserId: "invitee-1",
        referralCode: engine.ensureReferralCode("inviter-b").code,
      }).denialReason
    ).toBe("referral_duplicate");
  });

  it("VALID_REFERRAL_ATTRIBUTION → recorded without awarding", () => {
    const engine = createRewardsEngine();
    const result = engine.attributeReferral({
      invitedUserId: "invitee-2",
      referralCode: engine.ensureReferralCode("inviter-a").code,
      signupCompleted: true,
    });
    expect(result.accepted).toBe(true);
    expect(result.attribution?.rewardStatus).toBe("PENDING");
    expect(engine.pointsIssued()).toBe(0);
  });

  it("rejects obvious referral loops", () => {
    const engine = createRewardsEngine();
    const codeA = engine.ensureReferralCode("user-a").code;
    const codeB = engine.ensureReferralCode("user-b").code;
    expect(
      engine.attributeReferral({ invitedUserId: "user-b", referralCode: codeA }).accepted
    ).toBe(true);
    expect(
      engine.attributeReferral({ invitedUserId: "user-a", referralCode: codeB }).denialReason
    ).toBe("referral_loop");
  });
});

describe("history, notifications, admin, contract", () => {
  it("hides amounts for inactive rules in user history", () => {
    const engine = engineWithEnabledRule("SHARE_CREATED", 6);
    engine.processVerifiedEvent({
      actorUserId: "user-a",
      eventType: "SHARE_CREATED",
      idempotencyKey: "share:1",
      sourceType: "share",
      sourceId: "1",
    });
    expect(engine.getHistory("user-a")[0].displayAmount).toBe(6);
    engine.updateRule("admin_test", defaultRuleIdForEvent("SHARE_CREATED"), {
      enabled: false,
    });
    expect(engine.getHistory("user-a")[0].displayAmount).toBeNull();
  });

  it("emits notification contracts only from ledger rows and does not spam retries", () => {
    const engine = engineWithEnabledRule("COURSE_COMPLETED", 8);
    const first = engine.processVerifiedEvent({
      actorUserId: "user-a",
      eventType: "COURSE_COMPLETED",
      idempotencyKey: "course:1",
      sourceType: "course",
      sourceId: "1",
    });
    engine.processVerifiedEvent({
      actorUserId: "user-a",
      eventType: "COURSE_COMPLETED",
      idempotencyKey: "course:1",
      sourceType: "course",
      sourceId: "1",
    });
    expect(engine.listNotifications()).toHaveLength(1);
    expect(engine.listNotifications()[0].transactionId).toBe(
      first.ledgerEntry?.transactionId
    );
  });

  it("audits admin rule changes and refuses destructive ledger edits", () => {
    const engine = createRewardsEngine();
    engine.updateRule("admin_test", defaultRuleIdForEvent("QUIZ_PASSED"), {
      enabled: true,
      pointsAmount: 1,
    });
    expect(engine.listAudits().some((row) => row.action === "update_rule")).toBe(true);
    expect(engine.listLedger()).toHaveLength(0);
  });

  it("exposes the same snapshot contract for web, iOS, and Android", () => {
    const engine = new RewardsEngine();
    const profile = engine.getReferralProfile("user-a");
    const snapshot = toPlatformSnapshot({
      platform: "web",
      wallet: engine.getBalance("user-a"),
      referral: { code: profile.code, referralLink: profile.referralLink },
      history: engine.getHistory("user-a"),
      activeRewardRuleCount: engine.countActiveRewardRules(),
      pointValuesConfigured: engine.pointValuesConfigured(),
    });
    expect(snapshot.activeRewardRuleCount).toBeGreaterThan(0);
    expect(snapshot.referral.joinLink).toMatch(/\/join\?ref=/);
    expect(snapshot.referral.code).toMatch(/^[A-Z0-9]{6,16}$/);
  });

  it("flags self-interaction without auto-punish", () => {
    const result = engineWithEnabledRule("LIKE_RECEIVED", 2).processVerifiedEvent({
      actorUserId: "user-a",
      eventType: "LIKE_RECEIVED",
      idempotencyKey: "like:self",
      sourceType: "like",
      sourceId: "self",
      counterpartUserId: "user-a",
    });
    expect(result.denialReason).toBe("self_interaction");
  });
});
