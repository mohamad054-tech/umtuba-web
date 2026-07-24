/**
 * UM Games Hub Runtime Completion Submit Composition Trusted V1 —
 * thin composition only.
 *
 * Sequence:
 * 1. assembleGamesRuntimeCompletionSubmitRequest (sole Hub→request boundary)
 * 2. submitMyGameSessionResultTrusted (sole RPC / response boundary)
 *
 * Preserves assembly and submit-client failure reasons exactly.
 * Does not reinterpret SQL decisions, adapt responses, mutate runtime
 * session or completion handoff, or set handoff.applied.
 *
 * Successful submit metadata must not be treated as ownership, gameplay
 * completion, accepted-result application, progress/achievement updates,
 * reward/economy entitlement, or Hub synchronization.
 *
 * SQL remains the sole ownership, expiry, idempotency, acceptance,
 * progress, achievement, and mutation authority. Hub Runtime authority
 * remains closed. No Session Start. No additional RPC.
 */

import type { GamesValidationResult } from "./gamesFoundation";
import { assembleGamesRuntimeCompletionSubmitRequest } from "./gamesHubRuntime";
import {
  submitMyGameSessionResultTrusted,
  type GamesSessionResultSubmitRpcClient,
  type GamesSessionResultSubmitResponseView,
} from "./gamesSessionResultSubmit";

export type { GamesSessionResultSubmitResponseView };

/**
 * Thin Hub Runtime completion→submit composition.
 *
 * Composition only — no new business logic, authority, response adaptation,
 * or Hub state mutation. Inputs are not mutated; handoff.applied stays false.
 */
export async function completeGamesRuntimeSubmitCompositionTrusted(
  client: GamesSessionResultSubmitRpcClient,
  runtimeSession: unknown,
  completionHandoff: unknown,
  idempotencyKey: unknown
): Promise<GamesValidationResult<GamesSessionResultSubmitResponseView>> {
  const request = assembleGamesRuntimeCompletionSubmitRequest(
    runtimeSession,
    completionHandoff,
    idempotencyKey
  );
  if (!request.ok) return request;

  return submitMyGameSessionResultTrusted(client, request.value);
}
