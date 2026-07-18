/**
 * Live beta readiness — safe probes for LiveKit + live database.
 * Never returns secrets or technical schema details to clients.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isLiveKitConfigured } from "../livekit/env";
import {
  LIVE_DATABASE_UNAVAILABLE_MESSAGE,
  LIVE_MEDIA_UNAVAILABLE_MESSAGE,
  LIVE_TEMPORARILY_UNAVAILABLE_MESSAGE,
} from "./liveUserFacingCopy";

export type LiveBetaReadinessReason =
  | "ready"
  | "database_unavailable"
  | "media_unavailable"
  | "unavailable";

export type LiveBetaReadiness = {
  /** True only when both database and LiveKit media are ready. */
  ok: boolean;
  databaseReady: boolean;
  mediaReady: boolean;
  reason: LiveBetaReadinessReason;
  /** Safe copy for UI banners — never includes env/SQL details. */
  userMessage: string;
};

export function buildLiveBetaReadiness(input: {
  databaseReady: boolean;
  mediaReady: boolean;
}): LiveBetaReadiness {
  const { databaseReady, mediaReady } = input;

  if (databaseReady && mediaReady) {
    return {
      ok: true,
      databaseReady: true,
      mediaReady: true,
      reason: "ready",
      userMessage: "",
    };
  }

  if (!databaseReady && !mediaReady) {
    return {
      ok: false,
      databaseReady: false,
      mediaReady: false,
      reason: "unavailable",
      userMessage: LIVE_TEMPORARILY_UNAVAILABLE_MESSAGE,
    };
  }

  if (!databaseReady) {
    return {
      ok: false,
      databaseReady: false,
      mediaReady,
      reason: "database_unavailable",
      userMessage: LIVE_DATABASE_UNAVAILABLE_MESSAGE,
    };
  }

  return {
    ok: false,
    databaseReady: true,
    mediaReady: false,
    reason: "media_unavailable",
    userMessage: LIVE_MEDIA_UNAVAILABLE_MESSAGE,
  };
}

/** Server-only: does not expose key material. */
export function probeLiveKitMediaReady(): boolean {
  return isLiveKitConfigured();
}

/**
 * Lightweight existence probe for live_rooms.
 * Logs technical errors server-side; returns boolean only.
 */
export async function probeLiveDatabaseReady(
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { error } = await supabase.from("live_rooms").select("id").limit(1);
    if (!error) {
      return true;
    }
    console.error(
      "[live-readiness] database probe failed:",
      error.message || error
    );
    return false;
  } catch (error) {
    console.error("[live-readiness] database probe threw:", error);
    return false;
  }
}

export async function assessLiveBetaReadiness(
  supabase: SupabaseClient
): Promise<LiveBetaReadiness> {
  const [databaseReady, mediaReady] = await Promise.all([
    probeLiveDatabaseReady(supabase),
    Promise.resolve(probeLiveKitMediaReady()),
  ]);
  return buildLiveBetaReadiness({ databaseReady, mediaReady });
}
