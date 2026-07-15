"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  createLiveRoom,
  endLiveRoom,
  getLiveRoomById,
  goLiveRoom,
  heartbeatLiveParticipant,
  joinLiveRoom,
  leaveLiveRoom,
  listLiveChatMessages,
  listLiveParticipants,
  listLiveRooms,
  moderateLiveChatMessage,
  sendLiveChatMessage,
  sendLiveReaction,
  setLiveParticipantRole,
  type ActionResult,
} from "../../lib/supabase/live";
import type {
  LiveChatMessage,
  LiveChatPage,
  LiveParticipant,
  LiveParticipantRole,
  LiveRoom,
  LiveRoomVisibility,
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

export async function listLiveRoomsAction(): Promise<
  ActionResult<{ rooms: LiveRoom[] }>
> {
  const user = await getServerUser();
  const supabase = await createClient();
  return listLiveRooms(supabase, user?.id ?? null, { status: "live" });
}

export async function getLiveRoomAction(
  roomId: string
): Promise<ActionResult<{ room: LiveRoom }>> {
  const parsed = parseUuid(roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  const supabase = await createClient();
  return getLiveRoomById(supabase, parsed.id, user?.id ?? null);
}

export async function listLiveParticipantsAction(
  roomId: string
): Promise<ActionResult<{ participants: LiveParticipant[] }>> {
  const parsed = parseUuid(roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  const supabase = await createClient();
  const roomResult = await getLiveRoomById(
    supabase,
    parsed.id,
    user?.id ?? null
  );

  if (!roomResult.ok) {
    return roomResult;
  }

  return listLiveParticipants(
    supabase,
    parsed.id,
    roomResult.room.host.id
  );
}

export async function createLiveRoomAction(input: {
  title: string;
  visibility?: LiveRoomVisibility;
  category?: string | null;
  description?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  goLive?: boolean;
}): Promise<ActionResult<{ roomId: string }>> {
  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in to go live.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return createLiveRoom(supabase, input);
}

export async function joinLiveRoomAction(
  roomId: string
): Promise<ActionResult<{ viewerCount: number }>> {
  const parsed = parseUuid(roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in to join a live room.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return joinLiveRoom(supabase, parsed.id);
}

export async function leaveLiveRoomAction(
  roomId: string
): Promise<ActionResult<{ viewerCount: number }>> {
  const parsed = parseUuid(roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return leaveLiveRoom(supabase, parsed.id);
}

export async function goLiveRoomAction(
  roomId: string
): Promise<ActionResult<{ done: true }>> {
  const parsed = parseUuid(roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return goLiveRoom(supabase, parsed.id);
}

export async function endLiveRoomAction(
  roomId: string
): Promise<ActionResult<{ done: true }>> {
  const parsed = parseUuid(roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return endLiveRoom(supabase, parsed.id);
}

export async function heartbeatLiveParticipantAction(
  roomId: string
): Promise<ActionResult<{ done: true }>> {
  const parsed = parseUuid(roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return heartbeatLiveParticipant(supabase, parsed.id);
}

export async function listLiveChatAction(
  roomId: string,
  cursor?: string | null
): Promise<ActionResult<LiveChatPage>> {
  const parsed = parseUuid(roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  const supabase = await createClient();
  const roomResult = await getLiveRoomById(
    supabase,
    parsed.id,
    user?.id ?? null
  );

  if (!roomResult.ok) {
    return roomResult;
  }

  return listLiveChatMessages(
    supabase,
    parsed.id,
    roomResult.room.host.id,
    user?.id ?? null,
    cursor ?? null
  );
}

export async function sendLiveChatAction(input: {
  roomId: string;
  body: string;
  clientId?: string | null;
}): Promise<ActionResult<{ message: LiveChatMessage }>> {
  const parsed = parseUuid(input.roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in to chat.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  const roomResult = await getLiveRoomById(supabase, parsed.id, user.id);

  if (!roomResult.ok) {
    return roomResult;
  }

  return sendLiveChatMessage(
    supabase,
    parsed.id,
    input.body,
    input.clientId,
    roomResult.room.host.id,
    user.id
  );
}

export async function moderateLiveChatAction(
  messageId: string,
  reason?: string | null
): Promise<ActionResult<{ done: true }>> {
  const parsed = parseUuid(messageId, "message");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return moderateLiveChatMessage(supabase, parsed.id, reason);
}

export async function setLiveParticipantRoleAction(input: {
  roomId: string;
  userId: string;
  role: Exclude<LiveParticipantRole, "host">;
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
    return {
      ok: false,
      message: "Please sign in.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return setLiveParticipantRole(
    supabase,
    roomParsed.id,
    userParsed.id,
    input.role
  );
}

export async function sendLiveReactionAction(input: {
  roomId: string;
  emoji: string;
}): Promise<ActionResult<{ reactionId: string }>> {
  const parsed = parseUuid(input.roomId, "room");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in to react.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return sendLiveReaction(supabase, parsed.id, input.emoji);
}

export async function createLiveReportAction(input: {
  roomId: string;
  reason: string;
  targetUserId?: string | null;
  targetMessageId?: string | null;
}): Promise<ActionResult<{ reportId: string }>> {
  const roomParsed = parseUuid(input.roomId, "room");
  if (!roomParsed.ok) {
    return roomParsed;
  }

  if (input.targetUserId) {
    const userParsed = parseUuid(input.targetUserId, "user");
    if (!userParsed.ok) {
      return userParsed;
    }
  }

  if (input.targetMessageId) {
    const messageParsed = parseUuid(input.targetMessageId, "message");
    if (!messageParsed.ok) {
      return messageParsed;
    }
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in to report.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_live_report", {
    p_room_id: roomParsed.id,
    p_reason: input.reason,
    p_target_user_id: input.targetUserId ?? null,
    p_target_message_id: input.targetMessageId ?? null,
  });

  if (error) {
    return {
      ok: false,
      message: error.message || "Unable to submit report.",
    };
  }

  return { ok: true, reportId: String(data) };
}
