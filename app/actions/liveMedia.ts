"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  cancelLiveStageRequest,
  ensureLiveHostOnStage,
  getLiveMediaGrants,
  getLiveRoomById,
  inviteLiveStage,
  listLiveStageRequests,
  listMyPendingStageInvites,
  pinLiveStageParticipant,
  removeFromLiveStage,
  requestLiveStage,
  respondLiveStageInvite,
  respondLiveStageRequest,
  setLiveStageLayoutMode,
  setLiveStageMediaFlags,
  startLiveSession,
  type ActionResult,
} from "../../lib/supabase/live";
import { mintLiveMediaToken } from "../../lib/livekit/server";
import type {
  LiveMediaTokenPayload,
  LiveStageInvitation,
  LiveStageLayoutMode,
  LiveStageRequest,
} from "../live/types";

function parseUuid(value: string, label: string): ActionResult<{ id: string }> {
  const trimmed = value.trim();
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRe.test(trimmed)) {
    return { ok: false, message: `Invalid ${label}.` };
  }

  return { ok: true, id: trimmed };
}

export async function getLiveMediaTokenAction(input: {
  roomId: string;
  anonIdentity?: string | null;
  displayName?: string | null;
  /** Development only — forces publisher grants for real-room media debugging. */
  forcePublish?: boolean;
}): Promise<ActionResult<{ media: LiveMediaTokenPayload }>> {
  const parsed = parseUuid(input.roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  const supabase = await createClient();

  // Hosts created via create_live_room(go_live) may be stuck off-stage without
  // publish flags — repair before minting so cam/mic controls can appear.
  if (user) {
    const roomResult = await getLiveRoomById(supabase, parsed.id, user.id);
    if (
      roomResult.ok &&
      roomResult.room.isHost &&
      roomResult.room.status === "live"
    ) {
      const ensured = await ensureLiveHostOnStage(supabase, parsed.id);
      // If the follow-up migration is not applied yet, still mint with whatever
      // grants exist; client will show Join stage once RPC exists.
      if (
        !ensured.ok &&
        !/function|schema cache|does not exist/i.test(ensured.message)
      ) {
        // Non-missing-function errors are ignored for token mint; grants rechecked below.
      }
    }
  }

  let grantsResult = await getLiveMediaGrants(supabase, parsed.id);

  // App-level host publish fallback when RPC grants are subscribe-only but user is host.
  if (grantsResult.ok && user && grantsResult.grants.identity === user.id) {
    const roomResult = await getLiveRoomById(supabase, parsed.id, user.id);
    if (
      roomResult.ok &&
      roomResult.room.isHost &&
      roomResult.room.status === "live" &&
      (!grantsResult.grants.canPublishAudio ||
        !grantsResult.grants.canPublishVideo)
    ) {
      grantsResult = {
        ok: true,
        grants: {
          ...grantsResult.grants,
          role: "host",
          stageStatus: "on_stage",
          canPublishAudio: true,
          canPublishVideo: true,
          canShareScreen: true,
          mutedByHost: false,
          cameraDisabledByHost: false,
        },
      };
    }
  }

  // Dev-only publisher probe for the real room UI (?publish=1).
  if (
    process.env.NODE_ENV !== "production" &&
    input.forcePublish &&
    grantsResult.ok
  ) {
    const identity =
      grantsResult.grants.identity ||
      input.anonIdentity?.trim() ||
      `dev-publisher-${parsed.id.slice(0, 8)}`;
    grantsResult = {
      ok: true,
      grants: {
        ...grantsResult.grants,
        identity,
        role: grantsResult.grants.role === "viewer" ? "host" : grantsResult.grants.role,
        stageStatus: "on_stage",
        canSubscribe: true,
        canPublishAudio: true,
        canPublishVideo: true,
        canShareScreen: true,
        mutedByHost: false,
        cameraDisabledByHost: false,
      },
    };
  }

  if (!grantsResult.ok) {
    return grantsResult;
  }

  const minted = await mintLiveMediaToken({
    grants: grantsResult.grants,
    displayName: input.displayName ?? null,
    anonIdentity: user ? null : input.anonIdentity ?? null,
  });

  if ("error" in minted) {
    const { toLiveUserFacingMessage, LIVE_MEDIA_NOT_CONFIGURED_MESSAGE } =
      await import("../../lib/live/liveUserFacingCopy");
    return {
      ok: false,
      message: toLiveUserFacingMessage(
        minted.error,
        LIVE_MEDIA_NOT_CONFIGURED_MESSAGE
      ),
    };
  }

  return { ok: true, media: minted };
}

export async function ensureLiveHostOnStageAction(
  roomId: string
): Promise<ActionResult<{ done: true }>> {
  const parsed = parseUuid(roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return ensureLiveHostOnStage(supabase, parsed.id);
}

export async function requestLiveStageAction(input: {
  roomId: string;
  message?: string | null;
}): Promise<
  ActionResult<{
    requestId: string;
    status: string;
    queuePosition: number | null;
    seatAvailable: boolean;
  }>
> {
  const parsed = parseUuid(input.roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "Please sign in to request the stage.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return requestLiveStage(supabase, parsed.id, input.message);
}

export async function cancelLiveStageRequestAction(
  roomId: string
): Promise<ActionResult<{ done: true }>> {
  const parsed = parseUuid(roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return cancelLiveStageRequest(supabase, parsed.id);
}

export async function respondLiveStageRequestAction(input: {
  requestId: string;
  accept: boolean;
}): Promise<ActionResult<{ accepted: boolean; queued?: boolean; reason?: string }>> {
  const parsed = parseUuid(input.requestId, "request");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return respondLiveStageRequest(supabase, parsed.id, input.accept);
}

export async function inviteLiveStageAction(input: {
  roomId: string;
  inviteeId: string;
}): Promise<ActionResult<{ invitationId: string }>> {
  const roomParsed = parseUuid(input.roomId, "room");
  if (!roomParsed.ok) {
    return roomParsed;
  }
  const userParsed = parseUuid(input.inviteeId, "user");
  if (!userParsed.ok) {
    return userParsed;
  }

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return inviteLiveStage(supabase, roomParsed.id, userParsed.id);
}

export async function respondLiveStageInviteAction(input: {
  inviteId: string;
  accept: boolean;
}): Promise<ActionResult<{ accepted: boolean; queued?: boolean }>> {
  const parsed = parseUuid(input.inviteId, "invite");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return respondLiveStageInvite(supabase, parsed.id, input.accept);
}

export async function removeFromLiveStageAction(input: {
  roomId: string;
  userId: string;
}): Promise<ActionResult<{ done: true }>> {
  const roomParsed = parseUuid(input.roomId, "room");
  if (!roomParsed.ok) {
    return roomParsed;
  }
  const userParsed = parseUuid(input.userId, "user");
  if (!userParsed.ok) {
    return userParsed;
  }

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return removeFromLiveStage(supabase, roomParsed.id, userParsed.id);
}

export async function setLiveStageMediaFlagsAction(input: {
  roomId: string;
  userId: string;
  mutedByHost?: boolean;
  cameraDisabledByHost?: boolean;
}): Promise<ActionResult<{ done: true }>> {
  const roomParsed = parseUuid(input.roomId, "room");
  if (!roomParsed.ok) {
    return roomParsed;
  }
  const userParsed = parseUuid(input.userId, "user");
  if (!userParsed.ok) {
    return userParsed;
  }

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return setLiveStageMediaFlags(supabase, roomParsed.id, userParsed.id, {
    mutedByHost: input.mutedByHost,
    cameraDisabledByHost: input.cameraDisabledByHost,
  });
}

export async function pinLiveStageParticipantAction(input: {
  roomId: string;
  userId: string | null;
}): Promise<ActionResult<{ done: true }>> {
  const roomParsed = parseUuid(input.roomId, "room");
  if (!roomParsed.ok) {
    return roomParsed;
  }

  if (input.userId) {
    const userParsed = parseUuid(input.userId, "user");
    if (!userParsed.ok) {
      return userParsed;
    }
  }

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return pinLiveStageParticipant(
    supabase,
    roomParsed.id,
    input.userId
  );
}

export async function setLiveStageLayoutModeAction(input: {
  roomId: string;
  mode: LiveStageLayoutMode;
}): Promise<ActionResult<{ done: true }>> {
  const parsed = parseUuid(input.roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return setLiveStageLayoutMode(supabase, parsed.id, input.mode);
}

export async function startLiveSessionAction(input: {
  roomId: string;
  title?: string | null;
}): Promise<ActionResult<{ sessionId: string }>> {
  const parsed = parseUuid(input.roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return startLiveSession(supabase, parsed.id, input.title);
}

export async function listLiveStageRequestsAction(
  roomId: string
): Promise<ActionResult<{ requests: LiveStageRequest[] }>> {
  const parsed = parseUuid(roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return listLiveStageRequests(supabase, parsed.id);
}

export async function listMyPendingStageInvitesAction(
  roomId: string
): Promise<ActionResult<{ invitations: LiveStageInvitation[] }>> {
  const parsed = parseUuid(roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return listMyPendingStageInvites(supabase, parsed.id, user.id);
}
