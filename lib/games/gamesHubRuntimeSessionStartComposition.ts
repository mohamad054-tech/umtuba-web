/**
 * UM Games Hub Runtime Session Start Composition Trusted V1 —
 * thin composition only.
 *
 * Sequence:
 * 1. startMyGameSessionTrusted (sole Platform start RPC boundary)
 * 2. exact game_id continuity check vs existing Hub Runtime session
 * 3. bindGamesRuntimePlatformSessionId (sole platformSessionId mutation)
 *
 * Preserves start-client and binder failure reasons exactly.
 * Adds one bounded continuity failure: platform_session_game_mismatch.
 *
 * Metadata binding only — does not imply gameplay started, that runtime is
 * playable, that the user may submit a result, that session ownership was
 * proven by app code, Catalog visibility/playability outside SQL, or
 * progress / achievement / reward / economy authority.
 *
 * Does not call Submit, complete a runtime session, launch gameplay, set
 * Hub authority flags, create a new Runtime authority object, rewrite Hub
 * start behavior, mutate the input runtime session, or reinterpret
 * resumed=true/false. platformSessionId remains metadata only.
 *
 * SQL remains sole Catalog / start / resume / TTL / expiry authority.
 * Hub Runtime authority remains closed. Keep RPC wiring out of
 * gamesHubRuntime.ts.
 */

import type { GamesValidationResult } from "./gamesFoundation";
import {
  bindGamesRuntimePlatformSessionId,
  type GamesRuntimeSessionContract,
} from "./gamesHubRuntime";
import {
  startMyGameSessionTrusted,
  type GamesSessionStartRpcClient,
} from "./gamesSessionStart";

function fail(
  reason: string
): Extract<GamesValidationResult<never>, { ok: false }> {
  return { ok: false, reason };
}

/**
 * Thin Hub Runtime → Platform session-start composition.
 *
 * Composition only — existing start client is the sole Platform RPC
 * boundary; existing binder is the sole platformSessionId mutation
 * boundary. Inputs are not mutated. Hub authority remains closed.
 */
export async function startGamesRuntimeSessionCompositionTrusted(
  client: GamesSessionStartRpcClient,
  runtimeSession: unknown
): Promise<GamesValidationResult<GamesRuntimeSessionContract>> {
  if (
    runtimeSession === null ||
    runtimeSession === undefined ||
    typeof runtimeSession !== "object"
  ) {
    return fail("session_required");
  }

  const runtime = runtimeSession as GamesRuntimeSessionContract;

  const started = await startMyGameSessionTrusted(client, runtime.gameId);
  if (!started.ok) return started;

  if (started.value.game_id !== runtime.gameId) {
    return fail("platform_session_game_mismatch");
  }

  return bindGamesRuntimePlatformSessionId(
    runtime,
    started.value.session_id
  );
}
