import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "../../i18n/locales";
import { REWARDS_CATALOGS } from "../../i18n/messages/rewardsCatalogs";
import {
  LAUNCH_GROWTH_MODE,
  LAUNCH_GROWTH_REVIEW_TARGET,
  LAUNCH_POLICY_VERSION,
  LAUNCH_V1_POINTS,
  REFERRED_USER_EXTRA_POINTS,
  RewardsEngine,
  assertNoClientAmount,
  buildJoinReferralPath,
  buildJoinReferralUrl,
  buildWhatsAppShareUrl,
  countLaunchEnabledRules,
  createRewardsEngine,
  defaultRuleIdForEvent,
  historyLabelForReason,
} from "./index";

function engine(): RewardsEngine {
  return createRewardsEngine();
}

describe("LEDGER_GRANT", () => {
  it("credits from launch policy, never from client amount", () => {
    const result = engine().processVerifiedEvent({
      actorUserId: "u1",
      eventType: "VIDEO_PUBLISHED",
      idempotencyKey: "video:grant",
      sourceType: "post",
      sourceId: "p1",
    });
    expect(result.awarded).toBe(LAUNCH_V1_POINTS.VIDEO_PUBLISHED);
    expect(result.ledgerEntry?.amount).toBe(10);
  });
});

describe("LEDGER_IDEMPOTENCY", () => {
  it("replays the same key without a second credit", () => {
    const e = engine();
    const input = {
      actorUserId: "u1",
      eventType: "POST_PUBLISHED" as const,
      idempotencyKey: "post:idem",
      sourceType: "post",
      sourceId: "p2",
    };
    expect(e.processVerifiedEvent(input).awarded).toBe(6);
    expect(e.processVerifiedEvent(input).replayed).toBe(true);
    expect(e.listLedger()).toHaveLength(1);
  });
});

describe("BALANCE", () => {
  it("maintains available balance from confirmed credits minus reversals", () => {
    const e = engine();
    e.processVerifiedEvent({
      actorUserId: "u1",
      eventType: "COMMENT_CREATED",
      idempotencyKey: "c1",
      sourceType: "comment",
      sourceId: "c1",
    });
    expect(e.getBalance("u1").availableBalance).toBe(3);
  });
});

describe("REWARD_POLICY", () => {
  it("uses launch_v1 amounts for new events", () => {
    expect(LAUNCH_POLICY_VERSION).toBe("launch_v1");
    expect(countLaunchEnabledRules()).toBeGreaterThan(20);
    expect(LAUNCH_GROWTH_MODE).toBe("3_MONTHS");
    expect(LAUNCH_GROWTH_REVIEW_TARGET).toBe("APPROX_3_MONTHS");
  });
});

describe("POLICY_VERSION", () => {
  it("keeps previously awarded ledger amounts after a rule change", () => {
    const e = engine();
    const first = e.processVerifiedEvent({
      actorUserId: "u1",
      eventType: "SHARE_CREATED",
      idempotencyKey: "share:v",
      sourceType: "share",
      sourceId: "s1",
    });
    e.updateRule("admin", defaultRuleIdForEvent("SHARE_CREATED"), {
      pointsAmount: 99,
    });
    expect(e.listLedger()[0].amount).toBe(first.ledgerEntry?.amount);
    expect(e.listLedger()[0].ruleVersion).toBe(first.ledgerEntry?.ruleVersion);
  });
});

describe("VIDEO/POST/COMMENT/LIKE/SAVE/SHARE/FOLLOW/SOUND_REWARD", () => {
  it("awards the launch matrix for social events", () => {
    const e = engine();
    expect(
      e.processVerifiedEvent({
        actorUserId: "u1",
        eventType: "VIDEO_PUBLISHED",
        idempotencyKey: "v",
        sourceType: "post",
        sourceId: "v",
      }).awarded
    ).toBe(10);
    expect(
      e.processVerifiedEvent({
        actorUserId: "u1",
        eventType: "POST_PUBLISHED",
        idempotencyKey: "p",
        sourceType: "post",
        sourceId: "p",
      }).awarded
    ).toBe(6);
    expect(
      e.processVerifiedEvent({
        actorUserId: "u1",
        eventType: "COMMENT_CREATED",
        idempotencyKey: "c",
        sourceType: "comment",
        sourceId: "c",
      }).awarded
    ).toBe(3);
    expect(
      e.processVerifiedEvent({
        actorUserId: "u1",
        eventType: "LIKE_GIVEN",
        idempotencyKey: "lg",
        sourceType: "like",
        sourceId: "lg",
        counterpartUserId: "u2",
      }).awarded
    ).toBe(1);
    expect(
      e.processVerifiedEvent({
        actorUserId: "u2",
        subjectUserId: "u1",
        actorIsAdmin: true,
        eventType: "SAVE_RECEIVED",
        idempotencyKey: "sr",
        sourceType: "save",
        sourceId: "sr",
        counterpartUserId: "u2",
      }).awarded
    ).toBe(2);
    expect(
      e.processVerifiedEvent({
        actorUserId: "u1",
        eventType: "SHARE_CREATED",
        idempotencyKey: "sh",
        sourceType: "share",
        sourceId: "sh",
        counterpartUserId: "u3",
      }).awarded
    ).toBe(3);
    expect(
      e.processVerifiedEvent({
        actorUserId: "u2",
        subjectUserId: "u1",
        actorIsAdmin: true,
        eventType: "FOLLOW_RECEIVED",
        idempotencyKey: "fr",
        sourceType: "follow",
        sourceId: "fr",
        counterpartUserId: "u2",
      }).awarded
    ).toBe(3);
    expect(
      e.processVerifiedEvent({
        actorUserId: "u1",
        eventType: "SOUND_CREATED",
        idempotencyKey: "snd",
        sourceType: "sound",
        sourceId: "snd",
      }).awarded
    ).toBe(8);
  });
});

describe("LEARNING/GAME/STORE_REWARD_CONTRACT", () => {
  it("exposes contract amounts without trusting client scores", () => {
    const e = engine();
    expect(
      e.processVerifiedEvent({
        actorUserId: "u1",
        eventType: "LESSON_COMPLETED",
        idempotencyKey: "les",
        sourceType: "learning",
        sourceId: "l1",
      }).awarded
    ).toBe(8);
    expect(
      e.processVerifiedEvent({
        actorUserId: "u1",
        eventType: "GAME_COMPLETED",
        idempotencyKey: "g",
        sourceType: "game",
        sourceId: "g1",
      }).awarded
    ).toBe(8);
    expect(
      e.processVerifiedEvent({
        actorUserId: "u1",
        eventType: "STORE_PURCHASE",
        idempotencyKey: "st",
        sourceType: "store",
        sourceId: "o1",
      }).awarded
    ).toBe(15);
    expect(assertNoClientAmount({ score: 9999 }).ok).toBe(true);
    expect(assertNoClientAmount({ points: 9999 }).ok).toBe(false);
  });
});

describe("REFERRAL_LINK/ATTRIBUTION/SIGNUP/QUALIFICATION", () => {
  it("preserves first-touch attribution then qualifies the inviter", () => {
    const e = engine();
    const code = e.ensureReferralCode("inviter").code;
    expect(buildJoinReferralPath(code)).toBe(`/join?ref=${code}`);
    expect(buildJoinReferralUrl(code)).toContain("/join?ref=");
    const attributed = e.attributeReferral({
      invitedUserId: "invitee",
      referralCode: code,
      signupCompleted: true,
    });
    expect(attributed.accepted).toBe(true);
    expect(attributed.attribution?.rewardStatus).toBe("PENDING");
    const qualified = e.qualifyAttributedReferral("invitee");
    expect(qualified.awarded).toBe(40);
    expect(e.getBalance("inviter").availableBalance).toBe(40);
  });
});

describe("INVITER_REWARD", () => {
  it("pays the inviter launch_v1 referral points", () => {
    expect(LAUNCH_V1_POINTS.REFERRAL_QUALIFIED).toBe(40);
  });
});

describe("NEW_USER_BONUS_NO_DUPLICATE", () => {
  it("awards welcome once and does not add a second referred-user bonus", () => {
    const e = engine();
    expect(REFERRED_USER_EXTRA_POINTS).toBe(0);
    const first = e.claimWelcomeBonus("new-user", true);
    const second = e.claimWelcomeBonus("new-user", true);
    expect(first.awarded).toBe(100);
    expect(second.replayed).toBe(true);
    expect(e.getBalance("new-user").availableBalance).toBe(100);
  });
});

describe("SELF_REFERRAL_BLOCKED", () => {
  it("rejects self-referral", () => {
    const e = engine();
    const code = e.ensureReferralCode("solo").code;
    expect(
      e.attributeReferral({ invitedUserId: "solo", referralCode: code })
        .denialReason
    ).toBe("referral_self");
  });
});

describe("DUPLICATE_REFERRAL_BLOCKED", () => {
  it("rejects a second inviter after first-touch", () => {
    const e = engine();
    const a = e.ensureReferralCode("a").code;
    e.ensureReferralCode("b");
    expect(
      e.attributeReferral({ invitedUserId: "c", referralCode: a }).accepted
    ).toBe(true);
    expect(
      e.attributeReferral({
        invitedUserId: "c",
        referralCode: e.ensureReferralCode("b").code,
      }).denialReason
    ).toBe("referral_duplicate");
  });
});

describe("REFERRAL_RETRY_IDEMPOTENT", () => {
  it("qualifies the same referred user only once", () => {
    const e = engine();
    const code = e.ensureReferralCode("inviter").code;
    e.attributeReferral({
      invitedUserId: "invitee",
      referralCode: code,
      signupCompleted: true,
    });
    e.qualifyAttributedReferral("invitee");
    expect(e.qualifyAttributedReferral("invitee").replayed).toBe(true);
    expect(e.getBalance("inviter").availableBalance).toBe(40);
  });
});

describe("REFERRAL_HISTORY", () => {
  it("records a human reason for referral points", () => {
    expect(historyLabelForReason("REFERRAL_QUALIFIED")).toBe("Referral joined");
  });
});

describe("REFERRAL_SHARE", () => {
  it("builds a WhatsApp share URL for the same join link", () => {
    const url = buildWhatsAppShareUrl(
      "https://umtuba.com/join?ref=ABC123",
      "Join me on UMTUBA"
    );
    expect(url).toContain("wa.me");
    expect(url).toContain(encodeURIComponent("https://umtuba.com/join?ref=ABC123"));
  });
});

describe("REVERSAL", () => {
  it("appends a debit and keeps the original credit", () => {
    const e = engine();
    const granted = e.processVerifiedEvent({
      actorUserId: "u1",
      eventType: "VIDEO_PUBLISHED",
      idempotencyKey: "rev",
      sourceType: "post",
      sourceId: "rev",
    });
    e.reverseTransaction("admin", granted.ledgerEntry!.transactionId, "spam");
    expect(e.listLedger()).toHaveLength(2);
    expect(e.getBalance("u1").availableBalance).toBe(0);
  });
});

describe("RLS", () => {
  it("keeps write paths off the client contract", () => {
    const sql = require("node:fs").readFileSync(
      "supabase/migrations/20260933_rewards_referral_launch_v1.sql",
      "utf8"
    ) as string;
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(
      /revoke insert, update, delete on public\.reward_events/
    );
    expect(sql).toMatch(
      /revoke all on function public\.ingest_verified_reward_event/
    );
  });
});

describe("CLIENT_CANNOT_SET_POINTS", () => {
  it("rejects amount keys and does not take a points argument", () => {
    expect(assertNoClientAmount({ pointsAmount: 50 }).ok).toBe(false);
    const result = engine().processVerifiedEvent({
      actorUserId: "u1",
      eventType: "VIDEO_PUBLISHED",
      idempotencyKey: "forge",
      sourceType: "post",
      sourceId: "forge",
      clientAmount: 999,
    });
    expect(result.denialReason).toBe("unauthorized_client_amount");
  });
});

describe("LOCALIZATION_13", () => {
  it("ships rewards chrome in all 13 locales including Arabic RTL copy", () => {
    expect([...SUPPORTED_LOCALES]).toHaveLength(13);
    for (const locale of SUPPORTED_LOCALES) {
      const catalog = REWARDS_CATALOGS[locale];
      expect(catalog["rewards.title"].length).toBeGreaterThan(0);
      expect(catalog["rewards.invite.title"].length).toBeGreaterThan(0);
      expect(catalog["rewards.toast"].includes("{points}")).toBe(true);
    }
    expect(REWARDS_CATALOGS.ar["rewards.title"]).toMatch(/نقاط/);
  });
});
