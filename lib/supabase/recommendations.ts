import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isValidWatchSessionId,
  normalizeWatchSignal,
  type RecommendationSurface,
  type WatchSignalInput,
} from "../recommendations";
import { normalizeDeviceViewerKey } from "./socialInteractions";

export type RecordWatchSignalResult =
  | { ok: true; signalId: number | null; skippedEarly: boolean }
  | { ok: false; message: string; reason?: string };

type RpcJson = Record<string, unknown> | null;

function parseRpcJson(data: unknown): RpcJson {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  return data as Record<string, unknown>;
}

/**
 * Persist a watch session signal via SECURITY DEFINER RPC.
 * Does not award rewards or touch Messenger / Media Pipeline.
 */
export async function recordWatchSignal(
  supabase: SupabaseClient,
  input: WatchSignalInput
): Promise<RecordWatchSignalResult> {
  if (!Number.isInteger(input.postId) || input.postId <= 0) {
    return { ok: false, message: "Invalid post.", reason: "invalid_post" };
  }

  if (!isValidWatchSessionId(input.sessionId)) {
    return {
      ok: false,
      message: "Invalid watch session.",
      reason: "invalid_session",
    };
  }

  const signal = normalizeWatchSignal(input);
  const surface: RecommendationSurface =
    signal.surface === "watch" ? "watch" : "discover";

  let viewerKey: string | null = null;
  if (signal.viewerKey) {
    viewerKey = normalizeDeviceViewerKey(signal.viewerKey);
    if (!viewerKey) {
      return {
        ok: false,
        message: "Invalid viewer key.",
        reason: "invalid_viewer_key",
      };
    }
  }

  const { data, error } = await supabase.rpc("record_watch_signal", {
    p_post_id: signal.postId,
    p_session_id: signal.sessionId.trim(),
    p_viewer_key: viewerKey,
    p_surface: surface,
    p_watch_duration_ms: signal.watchDurationMs,
    p_watch_percent: signal.watchPercent,
    p_completed: signal.completed,
    p_rewatch_count: signal.rewatchCount,
    p_liked: signal.liked,
    p_saved: signal.saved,
    p_shared: signal.shared,
    p_commented: signal.commented,
    p_follow_after_watch: signal.followAfterWatch,
    p_skipped_early: signal.skippedEarly,
  });

  if (error) {
    console.error("record_watch_signal failed:", error.message);
    return { ok: false, message: "Unable to record watch signal." };
  }

  const json = parseRpcJson(data);
  if (!json || json.ok !== true) {
    const reason =
      typeof json?.reason === "string" ? json.reason : "unknown";
    return {
      ok: false,
      message: "Watch signal rejected.",
      reason,
    };
  }

  return {
    ok: true,
    signalId:
      typeof json.signalId === "number"
        ? json.signalId
        : typeof json.signalid === "number"
          ? json.signalid
          : null,
    skippedEarly: Boolean(json.skippedEarly),
  };
}
