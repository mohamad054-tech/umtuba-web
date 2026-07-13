import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActionResult,
  LiveChatMessage,
  LiveChatPage,
  LiveHostProfile,
  LiveParticipantRole,
  LiveRecordingStatus,
  LiveRoom,
  LiveRoomStatus,
  LiveRoomVisibility,
} from "../../app/live/types";
import {
  LIVE_CHAT_MAX_LENGTH,
  LIVE_ROOM_TITLE_MAX,
  avatarGradientFromId,
  formatChatSentAt,
  formatStartedAtLabel,
  initialsFromName,
  previewAccentFromId,
  previewGradientFromId,
} from "../../app/live/types";

export const LIVE_CHAT_PAGE_SIZE = 40;
export { LIVE_CHAT_MAX_LENGTH, LIVE_ROOM_TITLE_MAX };

export type { ActionResult };

type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_initial: string | null;
};

type LiveRoomRow = {
  id: string;
  host_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  visibility: string;
  status: string;
  city: string | null;
  country: string | null;
  viewer_count: number;
  peak_viewer_count: number;
  chat_message_count: number;
  recording_status: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

type LiveChatRow = {
  id: string;
  room_id: string;
  sender_id: string | null;
  body: string | null;
  message_type: string;
  deleted_at: string | null;
  client_id: string | null;
  created_at: string;
};

type ParticipantRow = {
  room_id: string;
  user_id: string;
  role: string;
  left_at: string | null;
};

const ROOM_COLUMNS = `
  id,
  host_id,
  title,
  description,
  category,
  visibility,
  status,
  city,
  country,
  viewer_count,
  peak_viewer_count,
  chat_message_count,
  recording_status,
  started_at,
  ended_at,
  created_at
`;

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message).trim();
    if (message) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function displayNameFromProfile(
  profile: ProfileRow | undefined,
  fallback: string
) {
  if (!profile) {
    return fallback;
  }

  return profile.full_name?.trim() || profile.username || fallback;
}

function mapHost(
  hostId: string | null,
  profiles: Map<string, ProfileRow>
): LiveHostProfile {
  const id = hostId ?? "unknown";
  const profile = hostId ? profiles.get(hostId) : undefined;
  const name = displayNameFromProfile(profile, "UMTUBA Host");
  const username = profile?.username?.trim();

  return {
    id,
    name,
    handle: username ? `@${username}` : "@host",
    initials:
      profile?.avatar_initial?.trim()?.slice(0, 2).toUpperCase() ||
      initialsFromName(name),
    avatarGradient: avatarGradientFromId(id),
    followersLabel: "—",
  };
}

function mapRoomRow(
  row: LiveRoomRow,
  profiles: Map<string, ProfileRow>,
  currentUserId?: string | null,
  myRole?: LiveParticipantRole | null
): LiveRoom {
  const host = mapHost(row.host_id, profiles);
  const city = row.city?.trim() || "Unknown";
  const country = row.country?.trim() || "World";

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category?.trim() || "Live",
    visibility: row.visibility as LiveRoomVisibility,
    status: row.status as LiveRoomStatus,
    city,
    country,
    latitude: null,
    longitude: null,
    viewerCount: row.viewer_count ?? 0,
    peakViewerCount: row.peak_viewer_count ?? 0,
    chatMessageCount: Number(row.chat_message_count ?? 0),
    recordingStatus: row.recording_status as LiveRecordingStatus,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    startedAtLabel: formatStartedAtLabel(row.started_at),
    previewGradient: previewGradientFromId(row.id),
    previewAccent: previewAccentFromId(row.id),
    previewLabel:
      row.city && row.country
        ? `${row.city} · live now`
        : row.title.slice(0, 64),
    host,
    isHost: Boolean(currentUserId && row.host_id === currentUserId),
    myRole: myRole ?? null,
    ingestProtocol: null,
    sfuRoomId: null,
    mediaMetadata: {},
  };
}

function mapChatRow(
  row: LiveChatRow,
  profiles: Map<string, ProfileRow>,
  hostId: string | null,
  currentUserId?: string | null
): LiveChatMessage {
  const senderId = row.sender_id ?? "system";
  const profile = row.sender_id ? profiles.get(row.sender_id) : undefined;
  const name =
    row.deleted_at != null
      ? "Message removed"
      : displayNameFromProfile(profile, "Viewer");

  return {
    id: row.id,
    roomId: row.room_id,
    userId: senderId,
    userName: name,
    userInitials:
      row.deleted_at != null
        ? "—"
        : profile?.avatar_initial?.trim()?.slice(0, 2).toUpperCase() ||
          initialsFromName(name),
    avatarGradient: avatarGradientFromId(senderId),
    text:
      row.deleted_at != null
        ? "Message removed by moderation"
        : row.body || `[${row.message_type}]`,
    sentAt: formatChatSentAt(row.created_at),
    createdAt: row.created_at,
    isCreator: Boolean(hostId && row.sender_id === hostId),
    isMine: Boolean(currentUserId && row.sender_id === currentUserId),
    clientId: row.client_id ?? undefined,
    messageType: row.message_type as LiveChatMessage["messageType"],
    deleted: Boolean(row.deleted_at),
  };
}

function encodeChatCursor(createdAt: string, id: string) {
  return Buffer.from(JSON.stringify({ createdAt, id }), "utf8").toString(
    "base64url"
  );
}

function decodeChatCursor(
  cursor: string
): { createdAt: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as { createdAt?: string; id?: string };
    if (!parsed.createdAt || !parsed.id) {
      return null;
    }
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

async function loadProfilesByIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, ProfileRow>> {
  const map = new Map<string, ProfileRow>();
  const unique = Array.from(new Set(userIds.filter(Boolean)));

  if (unique.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_initial")
    .in("id", unique);

  if (error) {
    console.error("Unable to load live profiles:", error);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.id, row as ProfileRow);
  }

  return map;
}

async function loadMyRoles(
  supabase: SupabaseClient,
  userId: string,
  roomIds: string[]
): Promise<Map<string, LiveParticipantRole>> {
  const map = new Map<string, LiveParticipantRole>();
  if (!userId || roomIds.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("live_participants")
    .select("room_id, user_id, role, left_at")
    .eq("user_id", userId)
    .is("left_at", null)
    .in("room_id", roomIds);

  if (error) {
    console.error("Unable to load live participant roles:", error);
    return map;
  }

  for (const row of (data ?? []) as ParticipantRow[]) {
    map.set(row.room_id, row.role as LiveParticipantRole);
  }

  return map;
}

export async function listLiveRooms(
  supabase: SupabaseClient,
  currentUserId?: string | null,
  options?: { status?: LiveRoomStatus; limit?: number }
): Promise<ActionResult<{ rooms: LiveRoom[] }>> {
  const limit = Math.min(Math.max(options?.limit ?? 24, 1), 50);
  const status = options?.status ?? "live";

  const { data, error } = await supabase
    .from("live_rooms")
    .select(ROOM_COLUMNS)
    .eq("status", status)
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("Unable to list live rooms:", error);
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to load live rooms."),
    };
  }

  const rows = (data ?? []) as LiveRoomRow[];
  const hostIds = rows.map((row) => row.host_id).filter(Boolean) as string[];
  const profiles = await loadProfilesByIds(supabase, hostIds);
  const roles = currentUserId
    ? await loadMyRoles(
        supabase,
        currentUserId,
        rows.map((row) => row.id)
      )
    : new Map<string, LiveParticipantRole>();

  return {
    ok: true,
    rooms: rows.map((row) =>
      mapRoomRow(row, profiles, currentUserId, roles.get(row.id) ?? null)
    ),
  };
}

export async function getLiveRoomById(
  supabase: SupabaseClient,
  roomId: string,
  currentUserId?: string | null
): Promise<ActionResult<{ room: LiveRoom }>> {
  const { data, error } = await supabase
    .from("live_rooms")
    .select(ROOM_COLUMNS)
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load live room:", error);
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to load live room."),
    };
  }

  if (!data) {
    return { ok: false, message: "Live room not found." };
  }

  const row = data as LiveRoomRow;
  const profiles = await loadProfilesByIds(
    supabase,
    row.host_id ? [row.host_id] : []
  );
  const roles = currentUserId
    ? await loadMyRoles(supabase, currentUserId, [row.id])
    : new Map<string, LiveParticipantRole>();

  return {
    ok: true,
    room: mapRoomRow(row, profiles, currentUserId, roles.get(row.id) ?? null),
  };
}

export async function createLiveRoom(
  supabase: SupabaseClient,
  input: {
    title: string;
    visibility?: LiveRoomVisibility;
    category?: string | null;
    description?: string | null;
    city?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    goLive?: boolean;
  }
): Promise<ActionResult<{ roomId: string }>> {
  const title = input.title.trim();
  if (!title || title.length > LIVE_ROOM_TITLE_MAX) {
    return {
      ok: false,
      message: `Title must be 1–${LIVE_ROOM_TITLE_MAX} characters.`,
    };
  }

  const { data, error } = await supabase.rpc("create_live_room", {
    p_title: title,
    p_visibility: input.visibility ?? "public",
    p_category: input.category ?? null,
    p_description: input.description ?? null,
    p_city: input.city ?? null,
    p_country: input.country ?? null,
    p_latitude: input.latitude ?? null,
    p_longitude: input.longitude ?? null,
    p_go_live: input.goLive ?? true,
  });

  if (error) {
    console.error("Unable to create live room:", error);
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to create live room."),
    };
  }

  return { ok: true, roomId: String(data) };
}

export async function joinLiveRoom(
  supabase: SupabaseClient,
  roomId: string
): Promise<ActionResult<{ viewerCount: number }>> {
  const { data, error } = await supabase.rpc("join_live_room", {
    p_room_id: roomId,
  });

  if (error) {
    console.error("Unable to join live room:", error);
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to join live room."),
    };
  }

  return { ok: true, viewerCount: Number(data ?? 0) };
}

export async function leaveLiveRoom(
  supabase: SupabaseClient,
  roomId: string
): Promise<ActionResult<{ viewerCount: number }>> {
  const { data, error } = await supabase.rpc("leave_live_room", {
    p_room_id: roomId,
  });

  if (error) {
    console.error("Unable to leave live room:", error);
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to leave live room."),
    };
  }

  return { ok: true, viewerCount: Number(data ?? 0) };
}

export async function goLiveRoom(
  supabase: SupabaseClient,
  roomId: string
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("go_live_room", {
    p_room_id: roomId,
  });

  if (error) {
    console.error("Unable to go live:", error);
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to go live."),
    };
  }

  return { ok: true, done: true };
}

export async function endLiveRoom(
  supabase: SupabaseClient,
  roomId: string
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("end_live_room", {
    p_room_id: roomId,
  });

  if (error) {
    console.error("Unable to end live room:", error);
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to end live room."),
    };
  }

  return { ok: true, done: true };
}

export async function heartbeatLiveParticipant(
  supabase: SupabaseClient,
  roomId: string
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("heartbeat_live_participant", {
    p_room_id: roomId,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to refresh presence."),
    };
  }

  return { ok: true, done: true };
}

export async function listLiveChatMessages(
  supabase: SupabaseClient,
  roomId: string,
  hostId: string | null,
  currentUserId?: string | null,
  cursor?: string | null
): Promise<ActionResult<LiveChatPage>> {
  const decoded = cursor ? decodeChatCursor(cursor) : null;

  if (cursor && !decoded) {
    return { ok: false, message: "Invalid chat cursor." };
  }

  const { data, error } = await supabase.rpc("list_live_chat_messages", {
    p_room_id: roomId,
    p_limit: LIVE_CHAT_PAGE_SIZE + 1,
    p_before_created_at: decoded?.createdAt ?? null,
    p_before_id: decoded?.id ?? null,
  });

  if (error) {
    console.error("Unable to list live chat:", error);
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to load live chat."),
    };
  }

  const rows = (data ?? []) as LiveChatRow[];
  const hasMore = rows.length > LIVE_CHAT_PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, LIVE_CHAT_PAGE_SIZE) : rows;
  const senderIds = pageRows
    .map((row) => row.sender_id)
    .filter(Boolean) as string[];
  const profiles = await loadProfilesByIds(supabase, senderIds);

  // Return chronological (oldest → newest) for UI
  const chronological = [...pageRows].reverse();
  const messages = chronological.map((row) =>
    mapChatRow(row, profiles, hostId, currentUserId)
  );

  const oldest = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && oldest
      ? encodeChatCursor(oldest.created_at, oldest.id)
      : null;

  return {
    ok: true,
    messages,
    hasMore,
    nextCursor,
  };
}

export async function sendLiveChatMessage(
  supabase: SupabaseClient,
  roomId: string,
  body: string,
  clientId?: string | null,
  hostId?: string | null,
  currentUserId?: string | null
): Promise<ActionResult<{ message: LiveChatMessage }>> {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > LIVE_CHAT_MAX_LENGTH) {
    return {
      ok: false,
      message: `Message must be 1–${LIVE_CHAT_MAX_LENGTH} characters.`,
    };
  }

  const { data: messageId, error } = await supabase.rpc(
    "send_live_chat_message",
    {
      p_room_id: roomId,
      p_body: trimmed,
      p_client_id: clientId ?? null,
    }
  );

  if (error) {
    console.error("Unable to send live chat:", error);
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to send message."),
    };
  }

  const { data: row, error: fetchError } = await supabase
    .from("live_chat_messages")
    .select(
      "id, room_id, sender_id, body, message_type, deleted_at, client_id, created_at"
    )
    .eq("id", messageId)
    .maybeSingle();

  if (fetchError || !row) {
    return {
      ok: false,
      message: getErrorMessage(fetchError, "Message sent but could not reload."),
    };
  }

  const chatRow = row as LiveChatRow;
  const profiles = await loadProfilesByIds(
    supabase,
    chatRow.sender_id ? [chatRow.sender_id] : []
  );

  return {
    ok: true,
    message: mapChatRow(
      chatRow,
      profiles,
      hostId ?? null,
      currentUserId ?? chatRow.sender_id
    ),
  };
}

export async function moderateLiveChatMessage(
  supabase: SupabaseClient,
  messageId: string,
  reason?: string | null
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("moderate_live_chat_message", {
    p_message_id: messageId,
    p_reason: reason ?? null,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to moderate message."),
    };
  }

  return { ok: true, done: true };
}

export async function setLiveParticipantRole(
  supabase: SupabaseClient,
  roomId: string,
  userId: string,
  role: Exclude<LiveParticipantRole, "host">
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("set_live_participant_role", {
    p_room_id: roomId,
    p_user_id: userId,
    p_role: role,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to update participant role."),
    };
  }

  return { ok: true, done: true };
}

export function mapRealtimeChatInsert(
  row: LiveChatRow,
  profiles: Map<string, ProfileRow>,
  hostId: string | null,
  currentUserId?: string | null
): LiveChatMessage {
  return mapChatRow(row, profiles, hostId, currentUserId);
}
