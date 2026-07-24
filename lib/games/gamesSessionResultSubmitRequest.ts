/**
 * UM Games Session Result Submit Request Validation Trusted V1 —
 * fail-closed request validation / assembly only.
 *
 * Assembles a bounded request model suitable for a *future*
 * `submit_game_session_result` client. Does not call Supabase or any RPC.
 * Does not perform session lookup, ownership, expiry, idempotency replay,
 * claim acceptance/rejection, anti-abuse scoring, result persistence,
 * progress updates, or achievement updates.
 *
 * Validation success must not be treated as permission to submit, session
 * ownership, session active/unexpired status, claim acceptance, authoritative
 * result, progress/achievement entitlement, or reward/economy entitlement.
 *
 * SQL `submit_game_session_result` remains the sole future mutation authority.
 * Hub Runtime authority remains closed.
 *
 * Reuses foundation / session validators as the single input-validation
 * source — no forked claim or idempotency logic.
 */

import {
  validateClientResultClaim,
  validateIdempotencyKey,
  type GamesClientResultClaim,
  type GamesValidationErr,
  type GamesValidationResult,
} from "./gamesFoundation";
import { validateGameSessionId } from "./gamesSessions";

/**
 * Exact top-level keys for a future submit request assembly.
 * Maps to SQL args: `p_session_id`, `p_idempotency_key`, `p_claim`.
 */
const GAMES_SESSION_RESULT_SUBMIT_REQUEST_KEYS = [
  "session_id",
  "idempotency_key",
  "claim",
] as const;

/**
 * Bounded, allowlisted request for a future `submit_game_session_result` call.
 * Logical field names only — a later client maps to `p_*` RPC args.
 * Not permission, ownership, acceptance, progress, reward, or Hub authority.
 */
export type GamesSessionResultSubmitRequest = {
  readonly session_id: string;
  readonly idempotency_key: string;
  readonly claim: GamesClientResultClaim;
};

function fail(reason: string): GamesValidationErr {
  return { ok: false, reason };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function freezeClaim(claim: GamesClientResultClaim): GamesClientResultClaim {
  const frozen: GamesClientResultClaim = { score: claim.score };
  if (claim.level !== undefined) frozen.level = claim.level;
  if (claim.experience_delta !== undefined) {
    frozen.experience_delta = claim.experience_delta;
  }
  if (claim.duration_ms !== undefined) frozen.duration_ms = claim.duration_ms;
  if (claim.client_meta !== undefined) {
    frozen.client_meta = Object.freeze({ ...claim.client_meta });
  }
  return Object.freeze(frozen);
}

/**
 * Fail-closed validation and assembly for a future submit RPC request.
 *
 * Accepts only `{ session_id, idempotency_key, claim }`. Reuses
 * `validateGameSessionId`, `validateIdempotencyKey`, and
 * `validateClientResultClaim` — no duplicated claim/idempotency rules.
 *
 * Pure and side-effect free: no RPC, no mutation, no ownership/expiry/
 * replay/acceptance authority.
 */
export function validateGamesSessionResultSubmitRequest(
  raw: unknown
): GamesValidationResult<GamesSessionResultSubmitRequest> {
  if (!isPlainObject(raw)) {
    return fail("submit_request_not_object");
  }

  const allowed = new Set<string>(GAMES_SESSION_RESULT_SUBMIT_REQUEST_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      return fail("submit_request_unknown_field");
    }
  }

  const sessionId = validateGameSessionId(raw.session_id);
  if (!sessionId.ok) return sessionId;

  const idempotencyKey = validateIdempotencyKey(raw.idempotency_key);
  if (!idempotencyKey.ok) return idempotencyKey;

  const claim = validateClientResultClaim(raw.claim, "fail_closed");
  if (!claim.ok) return claim;

  return {
    ok: true,
    value: Object.freeze({
      session_id: sessionId.value,
      idempotency_key: idempotencyKey.value,
      claim: freezeClaim(claim.value),
    }),
  };
}
