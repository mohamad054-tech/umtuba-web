"use server";

import { mintLiveMediaToken } from "../../lib/livekit/server";
import type { LiveMediaTokenPayload } from "../live/types";
import type { ActionResult } from "../../lib/supabase/live";

/**
 * Dev-only publisher token for browser media toggle verification.
 * Never enable in production builds.
 */
export async function getDevLiveMediaLabTokenAction(): Promise<
  ActionResult<{ media: LiveMediaTokenPayload }>
> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, message: "Media lab is disabled in production." };
  }

  const roomId = crypto.randomUUID();
  const minted = await mintLiveMediaToken({
    grants: {
      roomId,
      status: "live",
      sfuRoomId: `umtuba-lab-${roomId}`,
      maxOnStage: 8,
      pinnedParticipantId: null,
      stageLayoutMode: "auto",
      currentSessionId: null,
      identity: `lab-host-${roomId.slice(0, 8)}`,
      role: "host",
      stageStatus: "on_stage",
      canSubscribe: true,
      canPublishAudio: true,
      canPublishVideo: true,
      canShareScreen: true,
      mutedByHost: false,
      cameraDisabledByHost: false,
      queuePosition: null,
    },
    displayName: "Lab Host",
  });

  if ("error" in minted) {
    return { ok: false, message: minted.error };
  }

  return { ok: true, media: minted };
}
