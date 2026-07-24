import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GAMES_PUBLIC_RPCS } from "./gamesFoundation";
import {
  submitMyGameSessionResultTrusted,
  type GamesSessionResultSubmitResponseView,
} from "./gamesSessionResultSubmit";

const SAMPLE_SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const SAMPLE_RESULT_ID = "ffffffff-1111-4222-8333-444444444444";

const MODULE = join(process.cwd(), "lib/games/gamesSessionResultSubmit.ts");
const HUB_RUNTIME = join(process.cwd(), "lib/games/gamesHubRuntime.ts");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function minimalRequest(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    session_id: SAMPLE_SESSION_ID,
    idempotency_key: "run-1",
    claim: { score: 10 },
    ...overrides,
  };
}

function sampleAccepted(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    session_id: SAMPLE_SESSION_ID,
    result_id: SAMPLE_RESULT_ID,
    decision_status: "accepted",
    rejection_reason: null,
    recorded_score: 10,
    idempotent_replay: false,
    ...overrides,
  };
}

function sampleRejected(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    session_id: SAMPLE_SESSION_ID,
    result_id: SAMPLE_RESULT_ID,
    decision_status: "rejected",
    rejection_reason: "unknown_claim_field",
    recorded_score: null,
    idempotent_replay: false,
    ...overrides,
  };
}

describe("Games Session Result Submit Trusted V1", () => {
  it("submitMyGameSessionResultTrusted succeeds for accepted submit", async () => {
    const r = await submitMyGameSessionResultTrusted(
      {
        rpc: async (fn, args) => {
          expect(fn).toBe(GAMES_PUBLIC_RPCS.submitResult);
          expect(fn).toBe("submit_game_session_result");
          expect(args).toEqual({
            p_session_id: SAMPLE_SESSION_ID,
            p_idempotency_key: "run-1",
            p_claim: { score: 10 },
          });
          return { data: sampleAccepted(), error: null };
        },
      },
      minimalRequest()
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const view: GamesSessionResultSubmitResponseView = r.value;
    expect(view.session_id).toBe(SAMPLE_SESSION_ID);
    expect(view.result_id).toBe(SAMPLE_RESULT_ID);
    expect(view.decision_status).toBe("accepted");
    expect(view.rejection_reason).toBeNull();
    expect(view.recorded_score).toBe(10);
    expect(view.idempotent_replay).toBe(false);
    expect(Object.keys(view).sort()).toEqual(
      [
        "decision_status",
        "idempotent_replay",
        "recorded_score",
        "rejection_reason",
        "result_id",
        "session_id",
      ].sort()
    );
    expect(view).not.toHaveProperty("platformSessionId");
    expect(view).not.toHaveProperty("awarded_points");
    expect(view).not.toHaveProperty("progress_changed");
    expect(view).not.toHaveProperty("can_replay");
  });

  it("submitMyGameSessionResultTrusted succeeds for rejected submit", async () => {
    const r = await submitMyGameSessionResultTrusted(
      {
        rpc: async () => ({ data: sampleRejected(), error: null }),
      },
      minimalRequest()
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.decision_status).toBe("rejected");
    expect(r.value.rejection_reason).toBe("unknown_claim_field");
    expect(r.value.recorded_score).toBeNull();
    expect(r.value.idempotent_replay).toBe(false);
  });

  it("submitMyGameSessionResultTrusted succeeds for idempotent replay", async () => {
    const r = await submitMyGameSessionResultTrusted(
      {
        rpc: async () => ({
          data: sampleAccepted({
            idempotent_replay: true,
            recorded_score: 42,
          }),
          error: null,
        }),
      },
      minimalRequest({ idempotency_key: "replay-key" })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.idempotent_replay).toBe(true);
    expect(r.value.decision_status).toBe("accepted");
    expect(r.value.recorded_score).toBe(42);
    expect(r.value).not.toHaveProperty("reapplied");
    expect(r.value).not.toHaveProperty("mutation_applied");
  });

  it("request validation failure prevents RPC and preserves reason", async () => {
    let called = false;
    const r = await submitMyGameSessionResultTrusted(
      {
        rpc: async () => {
          called = true;
          return { data: null, error: null };
        },
      },
      { session_id: "not-a-uuid", idempotency_key: "run-1", claim: { score: 1 } }
    );
    expect(called).toBe(false);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("session_id_invalid");

    const missing = await submitMyGameSessionResultTrusted(
      {
        rpc: async () => {
          called = true;
          return { data: null, error: null };
        },
      },
      null
    );
    expect(called).toBe(false);
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.reason).toBe("submit_request_not_object");
  });

  it("maps exact RPC name and argument keys from validated request", async () => {
    let captured: { fn?: string; args?: Record<string, unknown> } = {};
    await submitMyGameSessionResultTrusted(
      {
        rpc: async (fn, args) => {
          captured = { fn, args };
          return {
            data: sampleAccepted(),
            error: null,
          };
        },
      },
      minimalRequest({
        idempotency_key: "exact-map",
        claim: {
          score: 12.5,
          level: 3,
          experience_delta: 40,
          duration_ms: 1500,
          client_meta: { client: "test" },
        },
      })
    );
    expect(captured.fn).toBe("submit_game_session_result");
    expect(captured.fn).toBe(GAMES_PUBLIC_RPCS.submitResult);
    expect(Object.keys(captured.args ?? {}).sort()).toEqual(
      ["p_claim", "p_idempotency_key", "p_session_id"].sort()
    );
    expect(captured.args).toEqual({
      p_session_id: SAMPLE_SESSION_ID,
      p_idempotency_key: "exact-map",
      p_claim: {
        score: 12.5,
        level: 3,
        experience_delta: 40,
        duration_ms: 1500,
        client_meta: { client: "test" },
      },
    });
  });

  it("fails closed on RPC error", async () => {
    for (const message of [
      "Authentication required",
      "Not allowed to submit this game session",
      "session_expired",
      "session_not_active",
    ]) {
      const r = await submitMyGameSessionResultTrusted(
        {
          rpc: async () => ({
            data: null,
            error: { message },
          }),
        },
        minimalRequest()
      );
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.reason).toBe("session_result_submit_rpc_failed");
    }
  });

  it("fails closed on thrown client exception", async () => {
    const r = await submitMyGameSessionResultTrusted(
      {
        rpc: async () => {
          throw new Error("network");
        },
      },
      minimalRequest()
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("session_result_submit_rpc_failed");
  });

  it("rejects null and malformed responses", async () => {
    const nullData = await submitMyGameSessionResultTrusted(
      { rpc: async () => ({ data: null, error: null }) },
      minimalRequest()
    );
    expect(nullData.ok).toBe(false);
    if (nullData.ok) return;
    expect(nullData.reason).toBe("session_result_submit_response_invalid");

    const malformed = await submitMyGameSessionResultTrusted(
      {
        rpc: async () => ({
          data: sampleAccepted({ awarded_points: 5 }),
          error: null,
        }),
      },
      minimalRequest()
    );
    expect(malformed.ok).toBe(false);
    if (malformed.ok) return;
    expect(malformed.reason).toBe("session_result_submit_response_invalid");
  });

  it("collapses response parser failure to bounded reason", async () => {
    const badStatus = await submitMyGameSessionResultTrusted(
      {
        rpc: async () => ({
          data: sampleAccepted({ decision_status: "pending" }),
          error: null,
        }),
      },
      minimalRequest()
    );
    expect(badStatus.ok).toBe(false);
    if (badStatus.ok) return;
    expect(badStatus.reason).toBe("session_result_submit_response_invalid");

    const badReplay = await submitMyGameSessionResultTrusted(
      {
        rpc: async () => ({
          data: sampleAccepted({ idempotent_replay: "yes" }),
          error: null,
        }),
      },
      minimalRequest()
    );
    expect(badReplay.ok).toBe(false);
    if (badReplay.ok) return;
    expect(badReplay.reason).toBe("session_result_submit_response_invalid");

    const missing = await submitMyGameSessionResultTrusted(
      {
        rpc: async () => ({
          data: {
            session_id: SAMPLE_SESSION_ID,
            result_id: SAMPLE_RESULT_ID,
            decision_status: "accepted",
            rejection_reason: null,
            recorded_score: 1,
          },
          error: null,
        }),
      },
      minimalRequest()
    );
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.reason).toBe("session_result_submit_response_invalid");
  });

  it("enforces exact bounded return model (six keys only)", async () => {
    const r = await submitMyGameSessionResultTrusted(
      {
        rpc: async () => ({ data: sampleAccepted(), error: null }),
      },
      minimalRequest()
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.value).sort()).toEqual(
      [
        "decision_status",
        "idempotent_replay",
        "recorded_score",
        "rejection_reason",
        "result_id",
        "session_id",
      ].sort()
    );
    expect(r.value).not.toHaveProperty("platformSessionId");
    expect(r.value).not.toHaveProperty("runtime_eligible");
    expect(r.value).not.toHaveProperty("can_submit");
    expect(r.value).not.toHaveProperty("awarded_points");
    expect(r.value).not.toHaveProperty("wallet_credit");
    expect(r.value).not.toHaveProperty("progress_updated");
    expect(r.value).not.toHaveProperty("achievement_unlocked");
  });

  it("uses authenticated RPC only (no service-role / table path)", () => {
    const src = read(MODULE);
    expect(src).toMatch(/submitMyGameSessionResultTrusted/);
    expect(src).toMatch(/GAMES_PUBLIC_RPCS\.submitResult/);
    expect(src).toMatch(/submit_game_session_result/);
    expect(src).toMatch(/p_session_id/);
    expect(src).toMatch(/p_idempotency_key/);
    expect(src).toMatch(/p_claim/);
    expect(src).toMatch(/validateGamesSessionResultSubmitRequest/);
    expect(src).toMatch(/parseGamesSessionResultSubmitResponse/);
    expect(src).not.toMatch(/createServiceRole|service_role|serviceRole/i);
    expect(src).not.toMatch(/\.from\(\s*['"]game_session_results['"]\s*\)/);
    expect(src).not.toMatch(/\.from\(\s*['"]game_sessions['"]\s*\)/);
    expect(src).not.toMatch(/\.from\(\s*['"]game_player_progress['"]\s*\)/);
    expect(src).not.toMatch(/\.insert\(|\.upsert\(|\.update\(/);
  });

  it("does not add app-side ownership/expiry/replay/acceptance logic", () => {
    const src = read(MODULE);
    expect(src).toMatch(/sole ownership, expiry/);
    expect(src).not.toMatch(/user_id\s*===|owner_id\s*===/);
    expect(src).not.toMatch(/session_expired\s*===|expires_at\s*</);
    expect(src).not.toMatch(/idempotent_replay\s*===\s*false/);
    expect(src).not.toMatch(/decision_status\s*===\s*['"]accepted['"]/);
    expect(src).not.toMatch(/game_apply_accepted_result\s*\(/);
    expect(src).not.toMatch(/validateClientResultClaim\s*\(/);
  });

  it("does not open Hub Runtime or reward/economy inference", () => {
    const src = read(MODULE);
    const hub = read(HUB_RUNTIME);
    expect(src).toMatch(/Does not connect to Hub Runtime/);
    expect(src).toMatch(/NOT side-effect free/);
    expect(src).not.toMatch(/platformSessionId\s*[:=]/);
    expect(src).not.toMatch(/awarded_points|wallet_credit|economy_credit/);
    expect(src).not.toMatch(/can_submit\s*[:=]\s*true/);
    expect(hub).toMatch(/platformSessionId:\s*null/);
    expect(hub).not.toMatch(/submitMyGameSessionResultTrusted/);
    expect(hub).not.toMatch(/submit_game_session_result/);
  });
});
