/**
 * UM Games Hub Runtime Submit Outcome Adaptation Trusted V1 —
 * pure fail-closed observation adapter only.
 *
 * Converts a trusted Platform submit response into an immutable Hub Runtime
 * observation after strict continuity checks against the runtime session and
 * completion handoff.
 *
 * Observation only — does not mutate runtime session, completion handoff, or
 * submit response. Does not set handoff.applied to true. Does not change
 * runtime lifecycle state. Does not call Supabase, Submit, Start, or any RPC.
 *
 * Must not infer from decision_status = accepted:
 * - local apply success
 * - progress or achievement changes
 * - reward / economy entitlement
 * - gameplay validity
 * - Hub synchronization
 *
 * Must not infer from idempotent_replay = true:
 * - permission to reapply anything
 * - new progress or achievement mutation
 *
 * SQL remains the sole submit decision and mutation authority.
 * Existing trusted submit response is the only decision metadata source.
 * Hub Runtime authority remains closed.
 */

import type {
  GamesResultDecisionStatus,
  GamesValidationResult,
} from "./gamesFoundation";
import type {
  GamesRuntimeCompletionHandoff,
  GamesRuntimeSessionContract,
} from "./gamesHubRuntime";
import { parseGamesSessionResultSubmitResponse } from "./gamesSessionResultSubmitResponse";
import { validateGameSessionId } from "./gamesSessions";

/**
 * Immutable Hub Runtime observation of a trusted Platform submit outcome.
 *
 * Metadata only — not apply authority, lifecycle transition, handoff
 * mutation, progress/achievement mutation, reward/economy entitlement,
 * gameplay validity, or Hub synchronization.
 *
 * `applied` is always literal `false`.
 */
export type GamesRuntimeSubmitOutcomeObservation = Readonly<{
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  platformSessionId: string;
  resultId: string;
  decisionStatus: GamesResultDecisionStatus;
  rejectionReason: string | null;
  recordedScore: number | null;
  idempotentReplay: boolean;
  applied: false;
}>;

function fail(
  reason: string
): Extract<GamesValidationResult<never>, { ok: false }> {
  return { ok: false, reason };
}

/**
 * Pure fail-closed adapter: trusted submit response → Hub Runtime observation.
 *
 * Continuity uses only shared stable identity fields already guaranteed by
 * current contracts: platformSessionId ↔ session_id, runtimeSessionId,
 * gameId, playerId.
 *
 * Does not mutate inputs, change lifecycle, set handoff.applied, or call RPC.
 */
export function adaptGamesRuntimeSubmitOutcomeTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  submitResponse: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeObservation> {
  if (
    runtimeSession === null ||
    runtimeSession === undefined ||
    typeof runtimeSession !== "object"
  ) {
    return fail("session_required");
  }

  if (
    completionHandoff === null ||
    completionHandoff === undefined ||
    typeof completionHandoff !== "object"
  ) {
    return fail("handoff_required");
  }

  if (
    submitResponse === null ||
    submitResponse === undefined ||
    typeof submitResponse !== "object"
  ) {
    return fail("submit_response_invalid");
  }

  const parsed = parseGamesSessionResultSubmitResponse(submitResponse);
  if (!parsed.ok) {
    return fail("submit_response_invalid");
  }

  const runtime = runtimeSession as GamesRuntimeSessionContract;
  const handoff = completionHandoff as GamesRuntimeCompletionHandoff;
  const response = parsed.value;

  if (
    runtime.platformSessionId === null ||
    runtime.platformSessionId === undefined
  ) {
    return fail("platform_session_id_required");
  }

  const platformSessionId = validateGameSessionId(runtime.platformSessionId);
  if (!platformSessionId.ok) {
    return fail("platform_session_id_required");
  }

  if (platformSessionId.value !== response.session_id) {
    return fail("platform_session_id_mismatch");
  }

  if (runtime.runtimeSessionId !== handoff.runtimeSessionId) {
    return fail("runtime_session_id_mismatch");
  }

  if (runtime.gameId !== handoff.gameId) {
    return fail("session_game_mismatch");
  }

  if (runtime.playerId !== handoff.playerId) {
    return fail("session_owner_mismatch");
  }

  return {
    ok: true,
    value: Object.freeze({
      runtimeSessionId: runtime.runtimeSessionId,
      gameId: runtime.gameId,
      playerId: runtime.playerId,
      platformSessionId: platformSessionId.value,
      resultId: response.result_id,
      decisionStatus: response.decision_status,
      rejectionReason: response.rejection_reason,
      recordedScore: response.recorded_score,
      idempotentReplay: response.idempotent_replay,
      applied: false as const,
    }),
  };
}
