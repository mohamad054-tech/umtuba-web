/**
 * UM Games Session Result Submit Trusted V1 — fail-closed application client.
 *
 * Thin composition only:
 * - validateGamesSessionResultSubmitRequest (sole input boundary)
 * - rpc(GAMES_PUBLIC_RPCS.submitResult, { p_session_id, p_idempotency_key, p_claim })
 * - parseGamesSessionResultSubmitResponse (sole output boundary)
 *
 * SQL `submit_game_session_result` remains the sole ownership, expiry,
 * idempotency, claim-decision, progress, achievement, and mutation authority.
 * This module does not revalidate or reinterpret claim semantics after the
 * request validator, does not duplicate the response parser, and does not
 * invent a second submit state machine.
 *
 * Successful metadata must not be treated as:
 * - gameplay validity
 * - ownership proven by app code
 * - permission to reapply an accepted result
 * - permission for idempotent replay to mutate again
 * - guarantee that progress or achievements changed
 * - reward / wallet / points / economy entitlement
 * - Hub Runtime authority
 *
 * NOT side-effect free: SQL may insert/update `game_session_results` /
 * `game_sessions` rows; accepted results may invoke
 * `game_apply_accepted_result`; progress and achievements may change inside
 * SQL. Idempotent replay returns the prior decision without re-applying
 * mutations. Application code must not duplicate those gates.
 *
 * Does not connect to Hub Runtime or populate `platformSessionId`.
 * Database authentication remains authoritative. No service-role. No direct
 * table reads or writes.
 */

import {
  GAMES_PUBLIC_RPCS,
  type GamesValidationErr,
  type GamesValidationResult,
} from "./gamesFoundation";
import { validateGamesSessionResultSubmitRequest } from "./gamesSessionResultSubmitRequest";
import {
  parseGamesSessionResultSubmitResponse,
  type GamesSessionResultSubmitResponseView,
} from "./gamesSessionResultSubmitResponse";

export type { GamesSessionResultSubmitResponseView };

/**
 * Minimal authenticated RPC client for trusted session result submit.
 * Intentionally narrow — no service-role, no direct table access.
 */
export type GamesSessionResultSubmitRpcClient = {
  rpc(
    fn: string,
    args?: Record<string, unknown>
  ): PromiseLike<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

function fail(reason: string): GamesValidationErr {
  return { ok: false, reason };
}

/**
 * Map a submit-result RPC payload through
 * `parseGamesSessionResultSubmitResponse`. SQL returns a jsonb object on
 * success; it does not return null for denial (it raises). Null/malformed
 * payloads therefore fail closed — no trusted-null success union.
 * Parser-local reasons collapse to one bounded client reason.
 */
function parseGamesSessionResultSubmitRpcResponse(
  data: unknown
): GamesValidationResult<GamesSessionResultSubmitResponseView> {
  if (data === null || data === undefined) {
    return fail("session_result_submit_response_invalid");
  }
  const parsed = parseGamesSessionResultSubmitResponse(data);
  if (!parsed.ok) {
    return fail("session_result_submit_response_invalid");
  }
  return parsed;
}

/**
 * Trusted authenticated submit via `submit_game_session_result`.
 *
 * Submit metadata only — does not imply gameplay was valid, that ownership
 * was proven by app code, that an accepted result may be applied again,
 * that idempotent replay may mutate again, that progress/achievements
 * definitely changed, reward/economy entitlement, or Hub Runtime authority.
 * Does not wire Hub Runtime `platformSessionId`.
 *
 * Ownership, expiry, idempotency, claim acceptance/rejection, anti-abuse,
 * progress, and achievements remain SQL-authoritative. Do not duplicate
 * those checks or invent a second submit state machine here.
 *
 * NOT side-effect free: SQL may insert/update result/session rows; accepted
 * results may invoke `game_apply_accepted_result`; progress and achievements
 * may change inside SQL. Idempotent replay is not permission to reapply.
 */
export async function submitMyGameSessionResultTrusted(
  client: GamesSessionResultSubmitRpcClient,
  raw: unknown
): Promise<GamesValidationResult<GamesSessionResultSubmitResponseView>> {
  const request = validateGamesSessionResultSubmitRequest(raw);
  if (!request.ok) return request;

  try {
    const { data, error } = await client.rpc(GAMES_PUBLIC_RPCS.submitResult, {
      p_session_id: request.value.session_id,
      p_idempotency_key: request.value.idempotency_key,
      p_claim: request.value.claim,
    });
    if (error) {
      return fail("session_result_submit_rpc_failed");
    }
    return parseGamesSessionResultSubmitRpcResponse(data);
  } catch {
    return fail("session_result_submit_rpc_failed");
  }
}
