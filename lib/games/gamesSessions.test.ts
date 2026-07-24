import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GAMES_PUBLIC_RPCS } from "./gamesFoundation";
import {
  getMyGameSessionTrusted,
  parseGamesMySessionResponse,
  validateGameSessionId,
  type GamesMySessionView,
} from "./gamesSessions";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const MODULE = join(ROOT, "lib/games/gamesSessions.ts");
const HUB_RUNTIME = join(ROOT, "lib/games/gamesHubRuntime.ts");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const SAMPLE_SESSION_ID = "11111111-1111-4111-8111-111111111111";
const SAMPLE_GAME_ID = "22222222-2222-4222-8222-222222222222";
const SAMPLE_RESULT_ID = "33333333-3333-4333-8333-333333333333";

function sampleSession(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    session_id: SAMPLE_SESSION_ID,
    game_id: SAMPLE_GAME_ID,
    status: "active",
    started_at: "2026-07-24T10:00:00.000Z",
    expires_at: "2026-07-24T11:00:00.000Z",
    submitted_at: null,
    accepted_at: null,
    rejected_at: null,
    expired_at: null,
    result: null,
    ...overrides,
  };
}

function sampleWithResult(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return sampleSession({
    status: "accepted",
    submitted_at: "2026-07-24T10:30:00.000Z",
    accepted_at: "2026-07-24T10:30:01.000Z",
    result: {
      result_id: SAMPLE_RESULT_ID,
      decision_status: "accepted",
      rejection_reason: null,
      recorded_score: 42,
      recorded_level: 3,
      decided_at: "2026-07-24T10:30:01.000Z",
    },
    ...overrides,
  });
}

describe("Games Session Lookup Trusted V1 — validators", () => {
  it("validateGameSessionId accepts UUID and rejects malformed", () => {
    expect(validateGameSessionId(SAMPLE_SESSION_ID).ok).toBe(true);
    expect(validateGameSessionId("not-a-uuid").ok).toBe(false);
    expect(validateGameSessionId("").ok).toBe(false);
    expect(validateGameSessionId(null).ok).toBe(false);
    expect(validateGameSessionId(undefined).ok).toBe(false);
    const bad = validateGameSessionId("11111111-1111-1111-1111-111111111111");
    // version nibble must be 1-5
    expect(bad.ok).toBe(false);
  });

  it("parseGamesMySessionResponse accepts exact owner metadata", () => {
    const r = parseGamesMySessionResponse(sampleSession());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.session_id).toBe(SAMPLE_SESSION_ID);
    expect(r.value.result).toBeNull();
  });

  it("parseGamesMySessionResponse accepts nested result and rejects unknown fields", () => {
    const ok = parseGamesMySessionResponse(sampleWithResult());
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.value.result?.recorded_score).toBe(42);

    const unknownTop = parseGamesMySessionResponse(
      sampleSession({ runtime_eligible: true })
    );
    expect(unknownTop.ok).toBe(false);
    if (unknownTop.ok) return;
    expect(unknownTop.reason).toBe("session_unknown_field");

    const unknownResult = parseGamesMySessionResponse(
      sampleWithResult({
        result: {
          result_id: SAMPLE_RESULT_ID,
          decision_status: "accepted",
          rejection_reason: null,
          recorded_score: 1,
          recorded_level: null,
          decided_at: "2026-07-24T10:30:01.000Z",
          awarded_points: 10,
        },
      })
    );
    expect(unknownResult.ok).toBe(false);
    if (unknownResult.ok) return;
    expect(unknownResult.reason).toBe("session_result_unknown_field");
  });

  it("rejects unsupported session status and malformed result shape", () => {
    const badStatus = parseGamesMySessionResponse(
      sampleSession({ status: "playing" })
    );
    expect(badStatus.ok).toBe(false);
    if (badStatus.ok) return;
    expect(badStatus.reason).toBe("session_status_invalid");

    const badDecision = parseGamesMySessionResponse(
      sampleWithResult({
        result: {
          result_id: SAMPLE_RESULT_ID,
          decision_status: "pending",
          rejection_reason: null,
          recorded_score: null,
          recorded_level: null,
          decided_at: "2026-07-24T10:30:01.000Z",
        },
      })
    );
    expect(badDecision.ok).toBe(false);
    if (badDecision.ok) return;
    expect(badDecision.reason).toBe("decision_status_invalid");
  });
});

describe("Games Session Lookup Trusted V1", () => {
  it("getMyGameSessionTrusted succeeds with bounded owner metadata", async () => {
    const r = await getMyGameSessionTrusted(
      {
        rpc: async (fn, args) => {
          expect(fn).toBe(GAMES_PUBLIC_RPCS.getMySession);
          expect(fn).toBe("get_my_game_session");
          expect(args).toEqual({ p_session_id: SAMPLE_SESSION_ID });
          return { data: sampleWithResult(), error: null };
        },
      },
      SAMPLE_SESSION_ID
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const view: GamesMySessionView = r.value;
    expect(view.session_id).toBe(SAMPLE_SESSION_ID);
    expect(view.game_id).toBe(SAMPLE_GAME_ID);
    expect(view.status).toBe("accepted");
    expect(view.result?.decision_status).toBe("accepted");
    // Bounded return model — no runtime / playability flags.
    expect(Object.keys(view).sort()).toEqual(
      [
        "session_id",
        "game_id",
        "status",
        "started_at",
        "expires_at",
        "submitted_at",
        "accepted_at",
        "rejected_at",
        "expired_at",
        "result",
      ].sort()
    );
    expect(view).not.toHaveProperty("platformSessionId");
    expect(view).not.toHaveProperty("runtime_eligible");
    expect(view).not.toHaveProperty("can_resume");
    expect(view).not.toHaveProperty("can_submit");
  });

  it("rejects invalid session ID before RPC", async () => {
    let called = false;
    const r = await getMyGameSessionTrusted(
      {
        rpc: async () => {
          called = true;
          return { data: null, error: null };
        },
      },
      "not-a-uuid"
    );
    expect(called).toBe(false);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("session_id_invalid");
  });

  it("maps RPC not-found / non-owner shared deny to session_rpc_failed (no trusted null)", async () => {
    // SQL: not found OR non-owner → raise 'Not allowed to read this game session'
    for (const message of [
      "Not allowed to read this game session",
      "Authentication required",
      "session_id is required",
    ]) {
      const r = await getMyGameSessionTrusted(
        {
          rpc: async () => ({
            data: null,
            error: { message },
          }),
        },
        SAMPLE_SESSION_ID
      );
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.reason).toBe("session_rpc_failed");
    }
  });

  it("fails closed on RPC error and thrown client exception", async () => {
    const failed = await getMyGameSessionTrusted(
      { rpc: async () => ({ data: null, error: { message: "boom" } }) },
      SAMPLE_SESSION_ID
    );
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.reason).toBe("session_rpc_failed");

    const thrown = await getMyGameSessionTrusted(
      {
        rpc: async () => {
          throw new Error("network");
        },
      },
      SAMPLE_SESSION_ID
    );
    expect(thrown.ok).toBe(false);
    if (thrown.ok) return;
    expect(thrown.reason).toBe("session_rpc_failed");
  });

  it("rejects null, malformed, and unsupported-status responses", async () => {
    const nullData = await getMyGameSessionTrusted(
      { rpc: async () => ({ data: null, error: null }) },
      SAMPLE_SESSION_ID
    );
    expect(nullData.ok).toBe(false);
    if (nullData.ok) return;
    expect(nullData.reason).toBe("session_response_invalid");

    const malformed = await getMyGameSessionTrusted(
      {
        rpc: async () => ({
          data: sampleSession({ playable: true }),
          error: null,
        }),
      },
      SAMPLE_SESSION_ID
    );
    expect(malformed.ok).toBe(false);
    if (malformed.ok) return;
    expect(malformed.reason).toBe("session_response_invalid");

    const badStatus = await getMyGameSessionTrusted(
      {
        rpc: async () => ({
          data: sampleSession({ status: "running" }),
          error: null,
        }),
      },
      SAMPLE_SESSION_ID
    );
    expect(badStatus.ok).toBe(false);
    if (badStatus.ok) return;
    expect(badStatus.reason).toBe("session_response_invalid");
  });

  it("lookup module path uses only authenticated RPC registry (no service-role / table)", () => {
    const src = read(MODULE);
    expect(src).toMatch(/getMyGameSessionTrusted/);
    expect(src).toMatch(/GAMES_PUBLIC_RPCS\.getMySession/);
    expect(src).toMatch(/parseGamesMySessionResponse/);
    expect(src).toMatch(/validateGameSessionId/);
    expect(src).not.toMatch(/createServiceRole|service_role|serviceRole/i);
    expect(src).not.toMatch(/\.from\(\s*['"]game_sessions['"]\s*\)/);
    expect(src).not.toMatch(/\.from\(\s*['"]game_session_results['"]\s*\)/);
    expect(src).not.toMatch(/start_game_session|submit_game_session_result/);
    expect(src).not.toMatch(/platformSessionId/);
  });

  it("does not open Hub Runtime authority or populate platformSessionId", () => {
    const hub = read(HUB_RUNTIME);
    expect(hub).toMatch(/platformSessionId:\s*null/);
    expect(hub).not.toMatch(/getMyGameSessionTrusted/);
    expect(hub).not.toMatch(/get_my_game_session/);
  });
});
