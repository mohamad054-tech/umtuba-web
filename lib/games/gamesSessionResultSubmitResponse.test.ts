import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  GAMES_PUBLIC_RPCS,
  GAMES_RESULT_DECISION_STATUSES,
} from "./gamesFoundation";
import { parseGamesSessionResultSubmitResponse } from "./gamesSessionResultSubmitResponse";

const SAMPLE_SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const SAMPLE_RESULT_ID = "ffffffff-1111-4222-8333-444444444444";

const MODULE = join(
  process.cwd(),
  "lib/games/gamesSessionResultSubmitResponse.ts"
);

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function sampleAccepted(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    session_id: SAMPLE_SESSION_ID,
    result_id: SAMPLE_RESULT_ID,
    decision_status: "accepted",
    rejection_reason: null,
    recorded_score: 42,
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

describe("Games Session Result Submit Response Parser Trusted V1", () => {
  it("accepts a valid accepted response", () => {
    const r = parseGamesSessionResultSubmitResponse(sampleAccepted());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      session_id: SAMPLE_SESSION_ID,
      result_id: SAMPLE_RESULT_ID,
      decision_status: "accepted",
      rejection_reason: null,
      recorded_score: 42,
      idempotent_replay: false,
    });
  });

  it("accepts a valid rejected response", () => {
    const r = parseGamesSessionResultSubmitResponse(sampleRejected());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      session_id: SAMPLE_SESSION_ID,
      result_id: SAMPLE_RESULT_ID,
      decision_status: "rejected",
      rejection_reason: "unknown_claim_field",
      recorded_score: null,
      idempotent_replay: false,
    });
  });

  it("accepts a valid idempotent replay response", () => {
    const r = parseGamesSessionResultSubmitResponse(
      sampleAccepted({
        recorded_score: 10.5,
        idempotent_replay: true,
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.idempotent_replay).toBe(true);
    expect(r.value.decision_status).toBe("accepted");
    expect(r.value.recorded_score).toBe(10.5);
  });

  it("rejects null, array, or non-object payload", () => {
    expect(parseGamesSessionResultSubmitResponse(null)).toMatchObject({
      ok: false,
      reason: "submit_response_not_object",
    });
    expect(parseGamesSessionResultSubmitResponse([])).toMatchObject({
      ok: false,
      reason: "submit_response_not_object",
    });
    expect(parseGamesSessionResultSubmitResponse("x")).toMatchObject({
      ok: false,
      reason: "submit_response_not_object",
    });
    expect(parseGamesSessionResultSubmitResponse(1)).toMatchObject({
      ok: false,
      reason: "submit_response_not_object",
    });
    expect(parseGamesSessionResultSubmitResponse(undefined)).toMatchObject({
      ok: false,
      reason: "submit_response_not_object",
    });
  });

  it("rejects missing required fields", () => {
    const { recorded_score: _omit, ...withoutScore } = sampleAccepted();
    void _omit;
    expect(
      parseGamesSessionResultSubmitResponse(withoutScore)
    ).toMatchObject({
      ok: false,
      reason: "submit_response_missing_field",
    });

    const { decision_status: _d, ...withoutDecision } = sampleAccepted();
    void _d;
    expect(
      parseGamesSessionResultSubmitResponse(withoutDecision)
    ).toMatchObject({
      ok: false,
      reason: "submit_response_missing_field",
    });
  });

  it("rejects unknown top-level fields", () => {
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ recorded_level: 1 })
      )
    ).toMatchObject({
      ok: false,
      reason: "submit_response_unknown_field",
    });
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ decided_at: "2026-01-01T00:00:00Z" })
      )
    ).toMatchObject({
      ok: false,
      reason: "submit_response_unknown_field",
    });
    expect(
      parseGamesSessionResultSubmitResponse(sampleAccepted({ extra: true }))
    ).toMatchObject({
      ok: false,
      reason: "submit_response_unknown_field",
    });
  });

  it("rejects invalid session_id or result_id UUID", () => {
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ session_id: "not-a-uuid" })
      )
    ).toMatchObject({ ok: false, reason: "session_id_invalid" });
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ session_id: "" })
      )
    ).toMatchObject({ ok: false, reason: "session_id_invalid" });
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ result_id: "bad" })
      )
    ).toMatchObject({ ok: false, reason: "result_id_invalid" });
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ result_id: null })
      )
    ).toMatchObject({ ok: false, reason: "result_id_invalid" });
  });

  it("rejects unsupported decision_status", () => {
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ decision_status: "pending" })
      )
    ).toMatchObject({ ok: false, reason: "decision_status_invalid" });
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ decision_status: "submitted" })
      )
    ).toMatchObject({ ok: false, reason: "decision_status_invalid" });
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ decision_status: null })
      )
    ).toMatchObject({ ok: false, reason: "decision_status_invalid" });
    expect(GAMES_RESULT_DECISION_STATUSES).toEqual(["accepted", "rejected"]);
  });

  it("rejects invalid rejection_reason type", () => {
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ rejection_reason: 1 })
      )
    ).toMatchObject({ ok: false, reason: "rejection_reason_invalid" });
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ rejection_reason: true })
      )
    ).toMatchObject({ ok: false, reason: "rejection_reason_invalid" });
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ rejection_reason: "x".repeat(121) })
      )
    ).toMatchObject({ ok: false, reason: "rejection_reason_invalid" });
  });

  it("rejects invalid recorded_score type or value", () => {
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ recorded_score: "42" })
      )
    ).toMatchObject({ ok: false, reason: "recorded_score_invalid" });
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ recorded_score: -1 })
      )
    ).toMatchObject({ ok: false, reason: "recorded_score_invalid" });
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ recorded_score: Number.NaN })
      )
    ).toMatchObject({ ok: false, reason: "recorded_score_invalid" });
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ recorded_score: Number.POSITIVE_INFINITY })
      )
    ).toMatchObject({ ok: false, reason: "recorded_score_invalid" });
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ recorded_score: true })
      )
    ).toMatchObject({ ok: false, reason: "recorded_score_invalid" });
  });

  it("rejects invalid idempotent_replay type", () => {
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ idempotent_replay: null })
      )
    ).toMatchObject({ ok: false, reason: "idempotent_replay_invalid" });
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ idempotent_replay: "true" })
      )
    ).toMatchObject({ ok: false, reason: "idempotent_replay_invalid" });
    expect(
      parseGamesSessionResultSubmitResponse(
        sampleAccepted({ idempotent_replay: 1 })
      )
    ).toMatchObject({ ok: false, reason: "idempotent_replay_invalid" });
  });

  it("returns exact bounded immutable output", () => {
    const r = parseGamesSessionResultSubmitResponse(sampleAccepted());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.value).sort()).toEqual([
      "decision_status",
      "idempotent_replay",
      "recorded_score",
      "rejection_reason",
      "result_id",
      "session_id",
    ]);
    expect(Object.isFrozen(r.value)).toBe(true);
  });

  it("is deterministic pure parsing for the same input", () => {
    const input = sampleRejected({
      rejection_reason: "score_not_finite",
      idempotent_replay: true,
    });
    const a = parseGamesSessionResultSubmitResponse(input);
    const b = parseGamesSessionResultSubmitResponse(input);
    expect(a).toEqual(b);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });

  it("does not invoke RPC or perform side effects", () => {
    const rpc = vi.fn();
    const r = parseGamesSessionResultSubmitResponse(sampleAccepted());
    expect(r.ok).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
    const src = read(MODULE);
    expect(src).not.toMatch(/\.rpc\s*\(/);
    expect(src).not.toMatch(/createClient|@supabase|from\(['"]supabase/i);
    expect(src).not.toMatch(/GAMES_PUBLIC_RPCS/);
    expect(src).not.toMatch(/submit_game_session_result\s*\(/);
    expect(src).not.toMatch(/start_game_session|get_my_game_session/);
    expect(src).not.toMatch(
      /platformSessionId|award_um_points|wallet|leaderboard/i
    );
    expect(src).not.toMatch(
      /import\s*\{[^}]*parseGamesMySessionResult|parseGamesMySessionResult\s*\(/
    );
    expect(GAMES_PUBLIC_RPCS.submitResult).toBe("submit_game_session_result");
  });

  it("reuses shared decision status and UUID helpers", () => {
    const src = read(MODULE);
    expect(src).toMatch(/GamesResultDecisionStatus/);
    expect(src).toMatch(/GAMES_RESULT_DECISION_STATUSES/);
    expect(src).toMatch(/validateGameSessionId/);
    expect(src).not.toMatch(
      /import\s*\{[^}]*parseGamesMySessionResult|parseGamesMySessionResult\s*\(/
    );
    expect(src).not.toMatch(/recorded_level|decided_at/);
  });
});
