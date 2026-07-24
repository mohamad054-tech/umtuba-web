import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  GAMES_CLIENT_RESULT_CLAIM_KEYS,
  GAMES_PUBLIC_RPCS,
} from "./gamesFoundation";
import { validateGamesSessionResultSubmitRequest } from "./gamesSessionResultSubmitRequest";

const SAMPLE_SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const MODULE = join(
  process.cwd(),
  "lib/games/gamesSessionResultSubmitRequest.ts"
);

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

describe("Games Session Result Submit Request Validation Trusted V1", () => {
  it("accepts a valid minimal request", () => {
    const r = validateGamesSessionResultSubmitRequest(minimalRequest());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      session_id: SAMPLE_SESSION_ID,
      idempotency_key: "run-1",
      claim: { score: 10 },
    });
  });

  it("accepts a fully populated allowlisted claim", () => {
    const r = validateGamesSessionResultSubmitRequest(
      minimalRequest({
        claim: {
          score: 12.5,
          level: 3,
          experience_delta: 40,
          duration_ms: 1500,
          client_meta: { note: "ok", city_id: null },
        },
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.claim).toEqual({
      score: 12.5,
      level: 3,
      experience_delta: 40,
      duration_ms: 1500,
      client_meta: { note: "ok", city_id: null },
    });
    expect(Object.keys(r.value.claim).sort()).toEqual(
      [...GAMES_CLIENT_RESULT_CLAIM_KEYS].sort()
    );
  });

  it("rejects invalid or missing session UUID", () => {
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ session_id: "not-a-uuid" })
      )
    ).toMatchObject({ ok: false, reason: "session_id_invalid" });
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ session_id: "" })
      )
    ).toMatchObject({ ok: false, reason: "session_id_invalid" });
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ session_id: null })
      )
    ).toMatchObject({ ok: false, reason: "session_id_invalid" });
    const missing = { ...minimalRequest() };
    delete missing.session_id;
    expect(validateGamesSessionResultSubmitRequest(missing)).toMatchObject({
      ok: false,
      reason: "session_id_invalid",
    });
  });

  it("rejects invalid or missing idempotency key", () => {
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ idempotency_key: "" })
      )
    ).toMatchObject({ ok: false, reason: "idempotency_key_required" });
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ idempotency_key: "bad key" })
      )
    ).toMatchObject({ ok: false, reason: "idempotency_key_invalid" });
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ idempotency_key: null })
      )
    ).toMatchObject({ ok: false, reason: "idempotency_key_required" });
    const missing = { ...minimalRequest() };
    delete missing.idempotency_key;
    expect(validateGamesSessionResultSubmitRequest(missing)).toMatchObject({
      ok: false,
      reason: "idempotency_key_required",
    });
  });

  it("rejects invalid or missing claim", () => {
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ claim: null })
      )
    ).toMatchObject({ ok: false, reason: "claim_not_object" });
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ claim: [] })
      )
    ).toMatchObject({ ok: false, reason: "claim_not_object" });
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ claim: "score" })
      )
    ).toMatchObject({ ok: false, reason: "claim_not_object" });
    const missing = { ...minimalRequest() };
    delete missing.claim;
    expect(validateGamesSessionResultSubmitRequest(missing)).toMatchObject({
      ok: false,
      reason: "claim_not_object",
    });
  });

  it("rejects unknown top-level fields", () => {
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ extra: true })
      )
    ).toMatchObject({ ok: false, reason: "submit_request_unknown_field" });
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ p_session_id: SAMPLE_SESSION_ID })
      )
    ).toMatchObject({ ok: false, reason: "submit_request_unknown_field" });
  });

  it("rejects unknown claim fields", () => {
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ claim: { score: 1, combo: 9 } })
      )
    ).toMatchObject({ ok: false, reason: "unknown_claim_field" });
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({
          claim: { score: 1, server_score: 99 },
        })
      )
    ).toMatchObject({ ok: false, reason: "authoritative_field_forbidden" });
  });

  it("rejects malformed numeric/string/boolean claim values", () => {
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ claim: { score: "10" } })
      )
    ).toMatchObject({ ok: false, reason: "score_not_finite" });
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ claim: { score: true } })
      )
    ).toMatchObject({ ok: false, reason: "score_not_finite" });
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ claim: { score: Number.NaN } })
      )
    ).toMatchObject({ ok: false, reason: "score_not_finite" });
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ claim: { score: 1, level: 1.5 } })
      )
    ).toMatchObject({ ok: false, reason: "level_not_integer" });
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ claim: { score: 1, level: "2" } })
      )
    ).toMatchObject({ ok: false, reason: "level_not_integer" });
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ claim: { score: 1, experience_delta: false } })
      )
    ).toMatchObject({ ok: false, reason: "experience_delta_not_integer" });
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ claim: { score: 1, duration_ms: "100" } })
      )
    ).toMatchObject({ ok: false, reason: "duration_ms_not_integer" });
    expect(
      validateGamesSessionResultSubmitRequest(
        minimalRequest({ claim: { score: 1, client_meta: "nope" } })
      )
    ).toMatchObject({ ok: false, reason: "client_meta_not_object" });
  });

  it("rejects null, array, or non-object request", () => {
    expect(validateGamesSessionResultSubmitRequest(null)).toMatchObject({
      ok: false,
      reason: "submit_request_not_object",
    });
    expect(validateGamesSessionResultSubmitRequest([])).toMatchObject({
      ok: false,
      reason: "submit_request_not_object",
    });
    expect(validateGamesSessionResultSubmitRequest("x")).toMatchObject({
      ok: false,
      reason: "submit_request_not_object",
    });
    expect(validateGamesSessionResultSubmitRequest(1)).toMatchObject({
      ok: false,
      reason: "submit_request_not_object",
    });
  });

  it("returns exact bounded output with no extra fields", () => {
    const r = validateGamesSessionResultSubmitRequest(
      minimalRequest({
        claim: {
          score: 7,
          level: 1,
          experience_delta: 0,
          duration_ms: 0,
          client_meta: { a: 1 },
        },
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.value).sort()).toEqual([
      "claim",
      "idempotency_key",
      "session_id",
    ]);
    expect(Object.isFrozen(r.value)).toBe(true);
    expect(Object.isFrozen(r.value.claim)).toBe(true);
    expect(Object.isFrozen(r.value.claim.client_meta)).toBe(true);
  });

  it("is deterministic for the same input", () => {
    const input = minimalRequest({
      claim: { score: 3, level: 2, client_meta: { k: "v" } },
    });
    const a = validateGamesSessionResultSubmitRequest(input);
    const b = validateGamesSessionResultSubmitRequest(input);
    expect(a).toEqual(b);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });

  it("does not invoke RPC or perform side effects", () => {
    const rpc = vi.fn();
    const r = validateGamesSessionResultSubmitRequest(minimalRequest());
    expect(r.ok).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
    const src = read(MODULE);
    expect(src).not.toMatch(/\.rpc\s*\(/);
    expect(src).not.toMatch(/createClient|@supabase|from\(['"]supabase/i);
    expect(src).not.toMatch(/GAMES_PUBLIC_RPCS/);
    // Future RPC name may appear in comments for mapping docs only — never called.
    expect(src).not.toMatch(/submit_game_session_result\s*\(/);
    expect(src).not.toMatch(/start_game_session|get_my_game_session/);
    expect(src).not.toMatch(
      /platformSessionId|award_um_points|wallet|leaderboard/i
    );
    // Registry constant still names the future RPC; this module must not use it.
    expect(GAMES_PUBLIC_RPCS.submitResult).toBe("submit_game_session_result");
  });

  it("reuses foundation validators without forking claim/idempotency logic", () => {
    const src = read(MODULE);
    expect(src).toMatch(/validateGameSessionId/);
    expect(src).toMatch(/validateIdempotencyKey/);
    expect(src).toMatch(/validateClientResultClaim/);
    expect(src).not.toMatch(/function validateIdempotencyKey/);
    expect(src).not.toMatch(/function validateClientResultClaim/);
    expect(src).not.toMatch(/function validateGameSessionId/);
    expect(src).not.toMatch(/GAMES_CLIENT_RESULT_CLAIM_KEYS/);
  });
});
