import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LAUNCH_V1_POINTS,
  REWARDS_CROSS_PLATFORM_CONTRACT,
  assertNoClientAmount,
  assertNoTrustedMetadata,
  createRewardsEngine,
} from "./index";

const SQL = readFileSync(
  join(process.cwd(), "supabase/migrations/20260933_rewards_referral_launch_v1.sql"),
  "utf8"
);

function engine() {
  return createRewardsEngine();
}

describe("CLIENT_DIRECT_PROCESS_REWARD_EVENT", () => {
  it("revokes EXECUTE on the general grant RPC", () => {
    expect(SQL).toMatch(
      /revoke all on function public\.process_reward_event\(text, text, text, text, uuid, jsonb\)[\s\S]{0,40}from public, anon, authenticated/
    );
    expect(SQL).not.toMatch(
      /grant execute on function public\.process_reward_event\(text, text, text, text, uuid, jsonb\)/
    );
    expect(REWARDS_CROSS_PLATFORM_CONTRACT.rpcs.processEvent).toBe(
      "record_contract_reward_event"
    );
  });
});

describe("CLIENT_CHOOSES_POINTS_AMOUNT", () => {
  it("blocks amount keys in contract, engine, and SQL", () => {
    expect(assertNoClientAmount({ pointsAmount: 999 }).ok).toBe(false);
    const result = engine().processClientEvent({
      actorUserId: "u1",
      eventType: "VIDEO_PUBLISHED",
      idempotencyKey: "amt",
      sourceType: "post",
      sourceId: "p1",
      sourceVerified: true,
      clientAmount: 999,
    });
    expect(result.denialReason).toBe("unauthorized_client_amount");
    expect(result.awarded).toBe(0);
    expect(SQL).toMatch(/unauthorized_client_amount/);
  });
});

describe("CLIENT_CHOOSES_RECIPIENT", () => {
  it("forbids a different subject on the client path", () => {
    const result = engine().processClientEvent({
      actorUserId: "u1",
      subjectUserId: "victim",
      eventType: "VIDEO_PUBLISHED",
      idempotencyKey: "recv",
      sourceType: "post",
      sourceId: "p1",
      sourceVerified: true,
    });
    expect(result.denialReason).toBe("cross_user_forbidden");
    expect(result.awarded).toBe(0);
  });
});

describe("CLIENT_FAKE_TRUSTED_ACTOR", () => {
  it("rejects metadata trust claims", () => {
    expect(assertNoTrustedMetadata({ _trustedActor: "u-admin" }).ok).toBe(false);
    const result = engine().processClientEvent({
      actorUserId: "u1",
      subjectUserId: "victim",
      eventType: "VIDEO_PUBLISHED",
      idempotencyKey: "trust",
      sourceType: "post",
      sourceId: "p1",
      sourceVerified: true,
      metadata: { _trustedActor: "u-admin" },
    });
    expect(result.denialReason).toBe("untrusted_actor_metadata");
    expect(engine().processVerifiedEvent({
      actorUserId: "u1",
      eventType: "VIDEO_PUBLISHED",
      idempotencyKey: "trust-verified",
      sourceType: "post",
      sourceId: "p1",
      metadata: { trustedActor: true },
    }).denialReason).toBe("untrusted_actor_metadata");
    expect(SQL).toMatch(/untrusted_actor_metadata/);
    expect(SQL).not.toMatch(
      /\|\| jsonb_build_object\('_trustedActor'/
    );
  });
});

describe("CLIENT_FAKE_VIDEO_EVENT", () => {
  it("does not award without server source verification", () => {
    const result = engine().processClientEvent({
      actorUserId: "u1",
      eventType: "VIDEO_PUBLISHED",
      idempotencyKey: "fake-video",
      sourceType: "post",
      sourceId: "not-a-real-post",
    });
    expect(result.denialReason).toBe("unverified_source");
    expect(result.awarded).toBe(0);
    expect(SQL).toMatch(/verify_reward_event_source/);
    expect(SQL).toMatch(/unverified_source/);
  });
});

describe("CLIENT_DUPLICATE_EVENT", () => {
  it("replays the same verified key without a second credit", () => {
    const e = engine();
    const input = {
      actorUserId: "u1",
      eventType: "VIDEO_PUBLISHED" as const,
      idempotencyKey: "video:dup",
      sourceType: "post",
      sourceId: "p-dup",
    };
    expect(e.processVerifiedEvent(input).awarded).toBe(10);
    const replay = e.processVerifiedEvent(input);
    expect(replay.replayed).toBe(true);
    expect(replay.awarded).toBe(0);
    expect(e.pointsIssued()).toBe(10);
  });
});

describe("CLIENT_CROSS_USER_REFERRAL", () => {
  it("does not qualify from an unbound stranger attribution", () => {
    const e = engine();
    e.ensureReferralCode("inviter");
    e.attributeReferral({
      invitedUserId: "other-user",
      referralCode: e.ensureReferralCode("inviter").code,
      signupCompleted: true,
    });
    expect(e.qualifyAttributedReferral("attacker").denialReason).toBe(
      "invalid_event"
    );
    expect(SQL).toMatch(/Bound records for THIS user only/);
    expect(SQL).not.toMatch(
      /converted_user_id is null\s+and status = 'pending'/
    );
  });
});

describe("CLIENT_REASSIGN_INVITER", () => {
  it("keeps first-touch attribution", () => {
    const e = engine();
    const first = e.ensureReferralCode("inviter-a").code;
    const second = e.ensureReferralCode("inviter-b").code;
    expect(
      e.attributeReferral({ invitedUserId: "new", referralCode: first }).accepted
    ).toBe(true);
    const again = e.attributeReferral({
      invitedUserId: "new",
      referralCode: second,
    });
    expect(again.accepted).toBe(false);
    expect(again.denialReason).toBe("referral_duplicate");
    expect(again.attribution?.inviterUserId).toBe("inviter-a");
  });
});

describe("SELF_REFERRAL", () => {
  it("blocks using your own code", () => {
    const e = engine();
    const code = e.ensureReferralCode("self").code;
    expect(
      e.attributeReferral({ invitedUserId: "self", referralCode: code })
        .denialReason
    ).toBe("referral_self");
  });
});

describe("DOUBLE_QUALIFY", () => {
  it("does not pay the inviter twice", () => {
    const e = engine();
    const code = e.ensureReferralCode("inviter").code;
    e.attributeReferral({
      invitedUserId: "invitee",
      referralCode: code,
      signupCompleted: true,
    });
    expect(e.qualifyAttributedReferral("invitee").awarded).toBe(40);
    const second = e.qualifyAttributedReferral("invitee");
    expect(second.replayed).toBe(true);
    expect(second.awarded).toBe(0);
    expect(e.getBalance("inviter").availableBalance).toBe(40);
  });
});

describe("DIRECT_LEDGER_INSERT / DIRECT_BALANCE_UPDATE / DIRECT_REFERRAL_QUALIFY", () => {
  it("revokes client writes on ledger, balance, events, and qualifications", () => {
    expect(SQL).toMatch(
      /revoke insert, update, delete on public\.um_points_ledger from anon, authenticated/
    );
    expect(SQL).toMatch(
      /revoke insert, update, delete on public\.um_point_balances from anon, authenticated/
    );
    expect(SQL).toMatch(
      /revoke insert, update, delete on public\.reward_events from anon, authenticated/
    );
    expect(SQL).toMatch(
      /revoke insert, update, delete on public\.reward_qualifications from anon, authenticated/
    );
    expect(SQL).toMatch(
      /revoke all on function public\.ingest_verified_reward_event/
    );
    expect(SQL).toMatch(
      /revoke all on function public\.process_reward_event_trusted/
    );
  });
});

describe("LEGIT_VIDEO_REWARD", () => {
  it("awards launch_v1 +10 from server policy after a verified event", () => {
    const result = engine().processVerifiedEvent({
      actorUserId: "creator",
      eventType: "VIDEO_PUBLISHED",
      idempotencyKey: "video:legit",
      sourceType: "post",
      sourceId: "p-legit",
      sourceVerified: true,
    });
    expect(result.accepted).toBe(true);
    expect(result.awarded).toBe(LAUNCH_V1_POINTS.VIDEO_PUBLISHED);
    expect(result.awarded).toBe(10);
  });
});

describe("LEGIT_REFERRAL_ATTRIBUTION", () => {
  it("binds first-touch inviter to the new user", () => {
    const e = engine();
    const code = e.ensureReferralCode("inviter").code;
    const result = e.attributeReferral({
      invitedUserId: "new-user",
      referralCode: code,
      signupCompleted: true,
    });
    expect(result.accepted).toBe(true);
    expect(result.attribution?.inviterUserId).toBe("inviter");
    expect(result.attribution?.invitedUserId).toBe("new-user");
    expect(result.attribution?.rewardStatus).toBe("PENDING");
  });
});

describe("LEGIT_REFERRAL_QUALIFICATION / LEGIT_INVITER_REWARD", () => {
  it("pays the inviter +40 once the bound signup qualifies", () => {
    const e = engine();
    const code = e.ensureReferralCode("inviter").code;
    e.attributeReferral({
      invitedUserId: "new-user",
      referralCode: code,
      signupCompleted: true,
    });
    const qualified = e.qualifyAttributedReferral("new-user");
    expect(qualified.accepted).toBe(true);
    expect(qualified.awarded).toBe(LAUNCH_V1_POINTS.REFERRAL_QUALIFIED);
    expect(qualified.awarded).toBe(40);
    expect(e.getBalance("inviter").availableBalance).toBe(40);
    expect(e.getBalance("new-user").availableBalance).toBe(0);
  });
});

describe("IDEMPOTENT_RETRY", () => {
  it("keeps one ledger row across retries", () => {
    const e = engine();
    const input = {
      actorUserId: "creator",
      eventType: "VIDEO_PUBLISHED" as const,
      idempotencyKey: "video:retry",
      sourceType: "post",
      sourceId: "p-retry",
    };
    e.processVerifiedEvent(input);
    e.processVerifiedEvent(input);
    e.processClientEvent({ ...input, sourceVerified: true });
    expect(e.getHistory("creator")).toHaveLength(1);
    expect(e.getBalance("creator").availableBalance).toBe(10);
  });
});

describe("LEDGER_HISTORY / BALANCE_UPDATE", () => {
  it("appends history and increments the existing wallet", () => {
    const e = engine();
    e.processVerifiedEvent({
      actorUserId: "creator",
      eventType: "VIDEO_PUBLISHED",
      idempotencyKey: "video:hist",
      sourceType: "post",
      sourceId: "p-hist",
    });
    const history = e.getHistory("creator");
    expect(history).toHaveLength(1);
    expect(history[0]?.displayAmount).toBe(10);
    expect(e.getBalance("creator").availableBalance).toBe(10);
    expect(e.getBalance("creator").lifetimeEarned).toBe(10);
  });
});
