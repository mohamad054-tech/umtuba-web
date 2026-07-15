import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActionResult,
  LiveChatMessage,
  LiveChatPage,
  LiveHostProfile,
  LiveParticipant,
  LiveParticipantRole,
  LiveRecordingStatus,
  LiveRoom,
  LiveRoomStatus,
  LiveRoomVisibility,
  LiveStageInvitation,
  LiveStageLayoutMode,
  LiveStageRequest,
  LiveStageStatus,
} from "../../app/live/types";
import {
  LIVE_CHAT_MAX_LENGTH,
  LIVE_DEFAULT_MAX_ON_STAGE,
  LIVE_ROOM_TITLE_MAX,
  avatarGradientFromId,
  formatChatSentAt,
  formatStartedAtLabel,
  initialsFromName,
  previewAccentFromId,
  previewGradientFromId,
} from "../../app/live/types";
import type { LiveMediaGrants } from "../livekit/server";

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
  ingest_protocol?: string | null;
  sfu_room_id?: string | null;
  media_metadata?: Record<string, unknown> | null;
  max_on_stage?: number | null;
  pinned_participant_id?: string | null;
  stage_layout_mode?: string | null;
  current_session_id?: string | null;
  auto_admit_from_queue?: boolean | null;
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

/** Columns present since Live Streaming V1 foundation. */
const ROOM_COLUMNS_V1 = `
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
  created_at,
  ingest_protocol,
  sfu_room_id,
  media_metadata
`;

/** Extra columns from Live Media V2 multi-guest migration. */
const ROOM_COLUMNS_V2 = `
  ${ROOM_COLUMNS_V1},
  max_on_stage,
  pinned_participant_id,
  stage_layout_mode,
  current_session_id,
  auto_admit_from_queue
`;

const PARTICIPANT_COLUMNS_V1 =
  "room_id, user_id, role, joined_at, last_seen_at, left_at, is_banned";

const PARTICIPANT_COLUMNS_V2 = `${PARTICIPANT_COLUMNS_V1}, stage_status, can_publish_audio, can_publish_video, can_share_screen, muted_by_host, camera_disabled_by_host, queue_position, stage_joined_at`;

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

/** PostgREST / Postgres errors when Media V2 migration is not applied yet. */
function isMissingSchemaColumnError(error: unknown): boolean {
  const message = getErrorMessage(error, "").toLowerCase();
  return (
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    /column .* of relation/i.test(message)
  );
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
    ingestProtocol: row.ingest_protocol ?? null,
    sfuRoomId: row.sfu_room_id ?? null,
    mediaMetadata: (row.media_metadata ?? {}) as Record<string, unknown>,
    maxOnStage: row.max_on_stage ?? LIVE_DEFAULT_MAX_ON_STAGE,
    pinnedParticipantId: row.pinned_participant_id ?? null,
    stageLayoutMode: (row.stage_layout_mode as LiveStageLayoutMode) ?? "auto",
    currentSessionId: row.current_session_id ?? null,
    autoAdmitFromQueue: Boolean(row.auto_admit_from_queue),
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

  let rows: LiveRoomRow[] | null = null;

  {
    const first = await supabase
      .from("live_rooms")
      .select(ROOM_COLUMNS_V2)
      .eq("status", status)
      .order("started_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (first.error && isMissingSchemaColumnError(first.error)) {
      const fallback = await supabase
        .from("live_rooms")
        .select(ROOM_COLUMNS_V1)
        .eq("status", status)
        .order("started_at", { ascending: false, nullsFirst: false })
        .limit(limit);

      if (fallback.error) {
        console.error("Unable to list live rooms:", fallback.error);
        return {
          ok: false,
          message: getErrorMessage(fallback.error, "Unable to load live rooms."),
        };
      }
      rows = (fallback.data ?? []) as LiveRoomRow[];
    } else if (first.error) {
      console.error("Unable to list live rooms:", first.error);
      return {
        ok: false,
        message: getErrorMessage(first.error, "Unable to load live rooms."),
      };
    } else {
      rows = (first.data ?? []) as LiveRoomRow[];
    }
  }

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
  let row: LiveRoomRow | null = null;

  {
    const first = await supabase
      .from("live_rooms")
      .select(ROOM_COLUMNS_V2)
      .eq("id", roomId)
      .maybeSingle();

    if (first.error && isMissingSchemaColumnError(first.error)) {
      const fallback = await supabase
        .from("live_rooms")
        .select(ROOM_COLUMNS_V1)
        .eq("id", roomId)
        .maybeSingle();

      if (fallback.error) {
        console.error("Unable to load live room:", fallback.error);
        return {
          ok: false,
          message: getErrorMessage(fallback.error, "Unable to load live room."),
        };
      }
      row = (fallback.data as LiveRoomRow | null) ?? null;
    } else if (first.error) {
      console.error("Unable to load live room:", first.error);
      return {
        ok: false,
        message: getErrorMessage(first.error, "Unable to load live room."),
      };
    } else {
      row = (first.data as LiveRoomRow | null) ?? null;
    }
  }

  if (!row) {
    return { ok: false, message: "Live room not found." };
  }

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

export async function listLiveParticipants(
  supabase: SupabaseClient,
  roomId: string,
  hostId?: string | null
): Promise<ActionResult<{ participants: LiveParticipant[] }>> {
  type ParticipantListRow = {
    room_id: string;
    user_id: string;
    role: string;
    joined_at: string;
    last_seen_at: string;
    stage_status?: string | null;
    can_publish_audio?: boolean | null;
    can_publish_video?: boolean | null;
    can_share_screen?: boolean | null;
    muted_by_host?: boolean | null;
    camera_disabled_by_host?: boolean | null;
    queue_position?: number | null;
    stage_joined_at?: string | null;
  };

  let rows: ParticipantListRow[] = [];

  {
    const first = await supabase
      .from("live_participants")
      .select(PARTICIPANT_COLUMNS_V2)
      .eq("room_id", roomId)
      .is("left_at", null)
      .eq("is_banned", false)
      .order("joined_at", { ascending: true })
      .limit(100);

    if (first.error && isMissingSchemaColumnError(first.error)) {
      const fallback = await supabase
        .from("live_participants")
        .select(PARTICIPANT_COLUMNS_V1)
        .eq("room_id", roomId)
        .is("left_at", null)
        .eq("is_banned", false)
        .order("joined_at", { ascending: true })
        .limit(100);

      if (fallback.error) {
        console.error("Unable to list live participants:", fallback.error);
        return {
          ok: false,
          message: getErrorMessage(
            fallback.error,
            "Unable to load participants."
          ),
        };
      }
      rows = (fallback.data ?? []) as ParticipantListRow[];
    } else if (first.error) {
      console.error("Unable to list live participants:", first.error);
      return {
        ok: false,
        message: getErrorMessage(first.error, "Unable to load participants."),
      };
    } else {
      rows = (first.data ?? []) as ParticipantListRow[];
    }
  }

  const profiles = await loadProfilesByIds(
    supabase,
    rows.map((row) => row.user_id)
  );

  const participants: LiveParticipant[] = rows.map((row) => {
    const profile = profiles.get(row.user_id);
    const displayName = displayNameFromProfile(profile, "Viewer");
    const username = profile?.username?.trim();
    const role = row.role as LiveParticipantRole;
    const isHost =
      role === "host" || Boolean(hostId && row.user_id === hostId);
    // Pre–Media V2 DBs have no stage_* columns — treat host/co_host as on stage.
    const stageStatus: LiveStageStatus =
      (row.stage_status as LiveStageStatus | null | undefined) ??
      (role === "host" || role === "co_host" || role === "guest"
        ? "on_stage"
        : "off_stage");
    const onStage = stageStatus === "on_stage";

    return {
      userId: row.user_id,
      roomId: row.room_id,
      role,
      displayName,
      handle: username ? `@${username}` : "@viewer",
      initials:
        profile?.avatar_initial?.trim()?.slice(0, 2).toUpperCase() ||
        initialsFromName(displayName),
      avatarGradient: avatarGradientFromId(row.user_id),
      joinedAt: row.joined_at,
      lastSeenAt: row.last_seen_at,
      isHost,
      stageStatus,
      canPublishAudio:
        row.can_publish_audio != null
          ? Boolean(row.can_publish_audio)
          : onStage && (role === "host" || role === "co_host" || role === "guest"),
      canPublishVideo:
        row.can_publish_video != null
          ? Boolean(row.can_publish_video)
          : onStage && (role === "host" || role === "co_host" || role === "guest"),
      canShareScreen:
        row.can_share_screen != null
          ? Boolean(row.can_share_screen)
          : onStage && (role === "host" || role === "co_host"),
      mutedByHost: Boolean(row.muted_by_host),
      cameraDisabledByHost: Boolean(row.camera_disabled_by_host),
      queuePosition: row.queue_position ?? null,
      stageJoinedAt: row.stage_joined_at ?? null,
    };
  });

  // Host first, then co_host / guest / moderator / viewer
  const roleRank: Record<LiveParticipantRole, number> = {
    host: 0,
    co_host: 1,
    guest: 2,
    moderator: 3,
    viewer: 4,
  };
  participants.sort(
    (a, b) => roleRank[a.role] - roleRank[b.role] || a.joinedAt.localeCompare(b.joinedAt)
  );

  return { ok: true, participants };
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

export async function sendLiveReaction(
  supabase: SupabaseClient,
  roomId: string,
  emoji: string
): Promise<ActionResult<{ reactionId: string }>> {
  const trimmed = emoji.trim();
  if (!trimmed || trimmed.length > 16) {
    return { ok: false, message: "Invalid reaction." };
  }

  const { data, error } = await supabase.rpc("send_live_reaction", {
    p_room_id: roomId,
    p_emoji: trimmed,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to send reaction."),
    };
  }

  return { ok: true, reactionId: String(data) };
}

function parseGrantsJson(data: unknown): LiveMediaGrants | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const g = data as Record<string, unknown>;
  return {
    roomId: String(g.roomId ?? ""),
    status: String(g.status ?? ""),
    sfuRoomId: g.sfuRoomId == null ? null : String(g.sfuRoomId),
    maxOnStage: Number(g.maxOnStage ?? LIVE_DEFAULT_MAX_ON_STAGE),
    pinnedParticipantId:
      g.pinnedParticipantId == null ? null : String(g.pinnedParticipantId),
    stageLayoutMode: String(g.stageLayoutMode ?? "auto"),
    currentSessionId:
      g.currentSessionId == null ? null : String(g.currentSessionId),
    identity: g.identity == null ? null : String(g.identity),
    role: String(g.role ?? "viewer"),
    stageStatus: String(g.stageStatus ?? "off_stage"),
    canSubscribe: Boolean(g.canSubscribe),
    canPublishAudio: Boolean(g.canPublishAudio),
    canPublishVideo: Boolean(g.canPublishVideo),
    canShareScreen: Boolean(g.canShareScreen),
    mutedByHost: Boolean(g.mutedByHost),
    cameraDisabledByHost: Boolean(g.cameraDisabledByHost),
    queuePosition:
      g.queuePosition == null || g.queuePosition === ""
        ? null
        : Number(g.queuePosition),
  };
}

export async function ensureLiveHostOnStage(
  supabase: SupabaseClient,
  roomId: string
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("ensure_live_host_on_stage", {
    p_room_id: roomId,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to place host on stage."),
    };
  }

  return { ok: true, done: true };
}

export async function getLiveMediaGrants(
  supabase: SupabaseClient,
  roomId: string
): Promise<ActionResult<{ grants: LiveMediaGrants }>> {
  const { data, error } = await supabase.rpc("get_live_media_grants", {
    p_room_id: roomId,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to load media grants."),
    };
  }

  const grants = parseGrantsJson(data);
  if (!grants) {
    return { ok: false, message: "Invalid media grants." };
  }

  return { ok: true, grants };
}

export async function requestLiveStage(
  supabase: SupabaseClient,
  roomId: string,
  message?: string | null
): Promise<
  ActionResult<{
    requestId: string;
    status: string;
    queuePosition: number | null;
    seatAvailable: boolean;
  }>
> {
  const { data, error } = await supabase.rpc("request_live_stage", {
    p_room_id: roomId,
    p_message: message ?? null,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to request stage."),
    };
  }

  const row = (data ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    requestId: String(row.requestId ?? ""),
    status: String(row.status ?? "pending"),
    queuePosition:
      row.queuePosition == null ? null : Number(row.queuePosition),
    seatAvailable: Boolean(row.seatAvailable),
  };
}

export async function cancelLiveStageRequest(
  supabase: SupabaseClient,
  roomId: string
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("cancel_live_stage_request", {
    p_room_id: roomId,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to cancel stage request."),
    };
  }

  return { ok: true, done: true };
}

export async function respondLiveStageRequest(
  supabase: SupabaseClient,
  requestId: string,
  accept: boolean
): Promise<ActionResult<{ accepted: boolean; queued?: boolean; reason?: string }>> {
  const { data, error } = await supabase.rpc("respond_live_stage_request", {
    p_request_id: requestId,
    p_accept: accept,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to respond to stage request."),
    };
  }

  const row = (data ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    accepted: Boolean(row.accepted),
    queued: row.queued ? true : undefined,
    reason: row.reason ? String(row.reason) : undefined,
  };
}

export async function inviteLiveStage(
  supabase: SupabaseClient,
  roomId: string,
  inviteeId: string
): Promise<ActionResult<{ invitationId: string }>> {
  const { data, error } = await supabase.rpc("invite_live_stage", {
    p_room_id: roomId,
    p_invitee_id: inviteeId,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to invite to stage."),
    };
  }

  return { ok: true, invitationId: String(data) };
}

export async function respondLiveStageInvite(
  supabase: SupabaseClient,
  inviteId: string,
  accept: boolean
): Promise<ActionResult<{ accepted: boolean; queued?: boolean }>> {
  const { data, error } = await supabase.rpc("respond_live_stage_invite", {
    p_invite_id: inviteId,
    p_accept: accept,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to respond to invitation."),
    };
  }

  const row = (data ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    accepted: Boolean(row.accepted),
    queued: row.queued ? true : undefined,
  };
}

export async function removeFromLiveStage(
  supabase: SupabaseClient,
  roomId: string,
  userId: string
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("remove_from_live_stage", {
    p_room_id: roomId,
    p_user_id: userId,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to remove from stage."),
    };
  }

  return { ok: true, done: true };
}

export async function setLiveStageMediaFlags(
  supabase: SupabaseClient,
  roomId: string,
  userId: string,
  flags: { mutedByHost?: boolean; cameraDisabledByHost?: boolean }
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("set_live_stage_media_flags", {
    p_room_id: roomId,
    p_user_id: userId,
    p_muted_by_host: flags.mutedByHost ?? null,
    p_camera_disabled_by_host: flags.cameraDisabledByHost ?? null,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to update media flags."),
    };
  }

  return { ok: true, done: true };
}

export async function pinLiveStageParticipant(
  supabase: SupabaseClient,
  roomId: string,
  userId: string | null
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("pin_live_stage_participant", {
    p_room_id: roomId,
    p_user_id: userId,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to pin participant."),
    };
  }

  return { ok: true, done: true };
}

export async function setLiveStageLayoutMode(
  supabase: SupabaseClient,
  roomId: string,
  mode: LiveStageLayoutMode
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("set_live_stage_layout_mode", {
    p_room_id: roomId,
    p_mode: mode,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to change layout mode."),
    };
  }

  return { ok: true, done: true };
}

export async function startLiveSession(
  supabase: SupabaseClient,
  roomId: string,
  title?: string | null
): Promise<ActionResult<{ sessionId: string }>> {
  const { data, error } = await supabase.rpc("start_live_session", {
    p_room_id: roomId,
    p_title: title ?? null,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to start session."),
    };
  }

  return { ok: true, sessionId: String(data) };
}

export async function listLiveStageRequests(
  supabase: SupabaseClient,
  roomId: string
): Promise<ActionResult<{ requests: LiveStageRequest[] }>> {
  const { data, error } = await supabase
    .from("live_stage_requests")
    .select(
      "id, room_id, requester_id, status, queue_position, message, created_at"
    )
    .eq("room_id", roomId)
    .in("status", ["pending", "queued"])
    .order("queue_position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to load stage requests."),
    };
  }

  type Row = {
    id: string;
    room_id: string;
    requester_id: string;
    status: string;
    queue_position: number | null;
    message: string | null;
    created_at: string;
  };

  const rows = (data ?? []) as Row[];
  const profiles = await loadProfilesByIds(
    supabase,
    rows.map((r) => r.requester_id)
  );

  const requests: LiveStageRequest[] = rows.map((row) => {
    const profile = profiles.get(row.requester_id);
    const displayName = displayNameFromProfile(profile, "Viewer");
    const username = profile?.username?.trim();
    return {
      id: row.id,
      roomId: row.room_id,
      requesterId: row.requester_id,
      status: row.status as LiveStageRequest["status"],
      queuePosition: row.queue_position,
      message: row.message,
      createdAt: row.created_at,
      displayName,
      handle: username ? `@${username}` : "@viewer",
      initials:
        profile?.avatar_initial?.trim()?.slice(0, 2).toUpperCase() ||
        initialsFromName(displayName),
      avatarGradient: avatarGradientFromId(row.requester_id),
    };
  });

  return { ok: true, requests };
}

export async function listMyPendingStageInvites(
  supabase: SupabaseClient,
  roomId: string,
  userId: string
): Promise<ActionResult<{ invitations: LiveStageInvitation[] }>> {
  const { data, error } = await supabase
    .from("live_stage_invitations")
    .select("id, room_id, invitee_id, invited_by, status, created_at")
    .eq("room_id", roomId)
    .eq("invitee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to load invitations."),
    };
  }

  type Row = {
    id: string;
    room_id: string;
    invitee_id: string;
    invited_by: string;
    status: string;
    created_at: string;
  };

  const invitations: LiveStageInvitation[] = ((data ?? []) as Row[]).map(
    (row) => ({
      id: row.id,
      roomId: row.room_id,
      inviteeId: row.invitee_id,
      invitedBy: row.invited_by,
      status: row.status as LiveStageInvitation["status"],
      createdAt: row.created_at,
    })
  );

  return { ok: true, invitations };
}

export function mapRealtimeChatInsert(
  row: LiveChatRow,
  profiles: Map<string, ProfileRow>,
  hostId: string | null,
  currentUserId?: string | null
): LiveChatMessage {
  return mapChatRow(row, profiles, hostId, currentUserId);
}
