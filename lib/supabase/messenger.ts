import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Conversation,
  Message,
  MessageReactionSummary,
  MuteOption,
} from "../../app/messages/types";
import {
  initialsFromName,
  isConversationCurrentlyMuted,
  peerGradientFromId,
} from "../../app/messages/types";
import { mapMessengerMessageRow, type MessengerMessageRow } from "../../app/messages/lib/mapMessage";
import {
  groupReactionsByMessage,
  type ReactionAggRow,
} from "../../app/messages/lib/reactionState";
import { muteOptionToRpcValue } from "../../app/messages/lib/muteOptions";
import type { ProfileRow } from "./database.types";

export const MESSAGE_PAGE_SIZE = 40;
export const MESSAGE_MAX_LENGTH = 4000;

export type ActionResult<T> =
  | ({ ok: true } & T)
  | { ok: false; message: string; requiresAuth?: boolean };

export type ConversationListItemDTO = Conversation;

export type MessagesPageDTO = {
  messages: Message[];
  hasMore: boolean;
  nextCursor: string | null;
};

type ParticipantJoinRow = {
  conversation_id: string;
  unread_count: number;
  typing_at: string | null;
  last_read_at: string | null;
  last_read_message_id: string | null;
  is_muted: boolean;
  muted_until: string | null;
  conversations: {
    id: string;
    kind: string;
    last_message_at: string | null;
    last_message_preview: string | null;
    updated_at: string;
  } | null;
};

type MessageRow = MessengerMessageRow;

function displayNameFromProfile(profile: ProfileRow | undefined, fallback: string) {
  if (!profile) {
    return fallback;
  }

  return (
    profile.display_name?.trim() ||
    profile.full_name?.trim() ||
    profile.username ||
    fallback
  );
}

function mapMessageRow(
  row: MessageRow,
  currentUserId: string,
  options?: {
    replyById?: Map<string, MessageRow>;
    reactions?: MessageReactionSummary[];
    peerLastReadAt?: string | null;
    status?: Message["status"];
  }
): Message | null {
  return mapMessengerMessageRow(row, currentUserId, options);
}

function encodeMessagesCursor(createdAt: string, id: string) {
  return Buffer.from(JSON.stringify({ createdAt, id }), "utf8").toString(
    "base64url"
  );
}

function decodeMessagesCursor(
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
    .select(
      "id, username, display_name, full_name, avatar_url, avatar_initial, created_at, updated_at"
    )
    .in("id", unique);

  if (error) {
    console.error("Unable to load messenger profiles:", error);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.id, row as ProfileRow);
  }

  return map;
}

async function loadReplyTargets(
  supabase: SupabaseClient,
  conversationId: string,
  replyIds: string[]
): Promise<Map<string, MessageRow>> {
  const map = new Map<string, MessageRow>();
  const unique = Array.from(new Set(replyIds.filter(Boolean)));

  if (unique.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, sender_id, body, message_type, created_at, deleted_at, deleted_for, edited_at, reply_to_message_id, client_id"
    )
    .eq("conversation_id", conversationId)
    .in("id", unique);

  if (error) {
    console.error("Unable to load reply targets:", error);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.id, row as MessageRow);
  }

  return map;
}

async function loadReactionsForMessages(
  supabase: SupabaseClient,
  conversationId: string,
  messageIds: string[]
): Promise<Map<string, MessageReactionSummary[]>> {
  if (messageIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.rpc("list_message_reactions", {
    p_conversation_id: conversationId,
    p_message_ids: messageIds,
  });

  if (error) {
    // Phase 2 migration may not be applied yet — keep thread usable.
    const message = (error.message || "").toLowerCase();
    if (
      (error as { code?: string }).code === "PGRST202" ||
      message.includes("could not find the function") ||
      message.includes("schema cache")
    ) {
      return new Map();
    }
    console.error("list_message_reactions failed:", error);
    return new Map();
  }

  return groupReactionsByMessage((data ?? []) as ReactionAggRow[]);
}

/**
 * Load inbox conversations for the current user (no N+1).
 * Messages are loaded separately per conversation.
 */
export async function listConversationsForUser(
  supabase: SupabaseClient,
  currentUserId: string
): Promise<ActionResult<{ conversations: Conversation[] }>> {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select(
      `
      conversation_id,
      unread_count,
      typing_at,
      last_read_at,
      last_read_message_id,
      is_muted,
      muted_until,
      conversations!inner (
        id,
        kind,
        last_message_at,
        last_message_preview,
        updated_at
      )
    `
    )
    .eq("user_id", currentUserId)
    .eq("is_archived", false);

  if (error) {
    // Fallback if muted_until column not yet migrated
    const message = (error.message || "").toLowerCase();
    if (message.includes("muted_until")) {
      return listConversationsForUserLegacy(supabase, currentUserId);
    }
    console.error("listConversationsForUser failed:", error);
    return {
      ok: false,
      message: "Unable to load conversations. Please try again.",
    };
  }

  const rows = ((data ?? []) as unknown as ParticipantJoinRow[]).filter(
    (row) => row.conversations?.kind === "direct"
  );

  if (rows.length === 0) {
    return { ok: true, conversations: [] };
  }

  const conversationIds = rows.map((row) => row.conversation_id);

  const { data: peerRows, error: peerError } = await supabase.rpc(
    "list_conversation_peers",
    { p_conversation_ids: conversationIds }
  );

  if (peerError) {
    console.error("Unable to load conversation peers:", peerError);
    return {
      ok: false,
      message: "Unable to load conversations. Please try again.",
    };
  }

  const peers = (peerRows ?? []) as Array<{
    conversation_id: string;
    user_id: string;
    role: string;
    typing_at: string | null;
    last_read_at?: string | null;
  }>;
  const peerByConversation = new Map<string, string>();
  const typingByConversation = new Map<string, boolean>();
  const peerLastReadByConversation = new Map<string, string | null>();
  const typingCutoff = Date.now() - 8000;

  for (const peer of peers) {
    if (!peerByConversation.has(peer.conversation_id)) {
      peerByConversation.set(peer.conversation_id, peer.user_id);
      peerLastReadByConversation.set(
        peer.conversation_id,
        peer.last_read_at ?? null
      );
    }

    if (peer.typing_at) {
      const typedAt = new Date(peer.typing_at).getTime();
      if (typedAt >= typingCutoff) {
        typingByConversation.set(peer.conversation_id, true);
      }
    }
  }

  const profiles = await loadProfilesByIds(
    supabase,
    Array.from(peerByConversation.values())
  );

  const conversations = rows
    .map((row): Conversation | null => {
      const conversation = row.conversations;
      if (!conversation) {
        return null;
      }

      const peerId = peerByConversation.get(row.conversation_id) ?? "";
      const profile = profiles.get(peerId);
      const peerName = displayNameFromProfile(profile, "UMTUBA User");
      const muted = isConversationCurrentlyMuted({
        isMuted: row.is_muted,
        mutedUntil: row.muted_until,
      });

      return {
        id: conversation.id,
        peerId,
        peerName,
        peerInitials:
          profile?.avatar_initial || initialsFromName(peerName),
        peerAvatarGradient: peerGradientFromId(peerId || conversation.id),
        peerAvatarUrl: profile?.avatar_url ?? null,
        status: "offline",
        lastSeenLabel: conversation.last_message_at
          ? "Recent activity"
          : "No messages yet",
        unreadCount: row.unread_count ?? 0,
        isTyping: typingByConversation.get(conversation.id) ?? false,
        lastMessagePreview: conversation.last_message_preview || "",
        lastMessageAt: conversation.last_message_at,
        messages: [],
        hasMoreMessages: false,
        nextMessagesCursor: null,
        isMuted: muted,
        mutedUntil: muted ? row.muted_until : null,
        peerLastReadAt:
          peerLastReadByConversation.get(conversation.id) ?? null,
      };
    })
    .filter((item): item is Conversation => item !== null)
    .sort((a, b) => {
      const aTime = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
      const bTime = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
      return bTime - aTime;
    });

  return { ok: true, conversations };
}

/** Pre-Phase-2 select without muted_until. */
async function listConversationsForUserLegacy(
  supabase: SupabaseClient,
  currentUserId: string
): Promise<ActionResult<{ conversations: Conversation[] }>> {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select(
      `
      conversation_id,
      unread_count,
      typing_at,
      last_read_at,
      last_read_message_id,
      is_muted,
      conversations!inner (
        id,
        kind,
        last_message_at,
        last_message_preview,
        updated_at
      )
    `
    )
    .eq("user_id", currentUserId)
    .eq("is_archived", false);

  if (error) {
    console.error("listConversationsForUserLegacy failed:", error);
    return {
      ok: false,
      message: "Unable to load conversations. Please try again.",
    };
  }

  const rows = ((data ?? []) as unknown as Array<
    Omit<ParticipantJoinRow, "muted_until"> & { muted_until?: null }
  >).filter((row) => row.conversations?.kind === "direct");

  if (rows.length === 0) {
    return { ok: true, conversations: [] };
  }

  const conversationIds = rows.map((row) => row.conversation_id);
  const { data: peerRows, error: peerError } = await supabase.rpc(
    "list_conversation_peers",
    { p_conversation_ids: conversationIds }
  );

  if (peerError) {
    return {
      ok: false,
      message: "Unable to load conversations. Please try again.",
    };
  }

  const peers = (peerRows ?? []) as Array<{
    conversation_id: string;
    user_id: string;
    typing_at: string | null;
  }>;
  const peerByConversation = new Map<string, string>();
  const typingByConversation = new Map<string, boolean>();
  const typingCutoff = Date.now() - 8000;

  for (const peer of peers) {
    if (!peerByConversation.has(peer.conversation_id)) {
      peerByConversation.set(peer.conversation_id, peer.user_id);
    }
    if (peer.typing_at) {
      const typedAt = new Date(peer.typing_at).getTime();
      if (typedAt >= typingCutoff) {
        typingByConversation.set(peer.conversation_id, true);
      }
    }
  }

  const profiles = await loadProfilesByIds(
    supabase,
    Array.from(peerByConversation.values())
  );

  const conversations = rows
    .map((row): Conversation | null => {
      const conversation = row.conversations;
      if (!conversation) return null;
      const peerId = peerByConversation.get(row.conversation_id) ?? "";
      const profile = profiles.get(peerId);
      const peerName = displayNameFromProfile(profile, "UMTUBA User");
      return {
        id: conversation.id,
        peerId,
        peerName,
        peerInitials: profile?.avatar_initial || initialsFromName(peerName),
        peerAvatarGradient: peerGradientFromId(peerId || conversation.id),
        peerAvatarUrl: profile?.avatar_url ?? null,
        status: "offline" as const,
        lastSeenLabel: conversation.last_message_at
          ? "Recent activity"
          : "No messages yet",
        unreadCount: row.unread_count ?? 0,
        isTyping: typingByConversation.get(conversation.id) ?? false,
        lastMessagePreview: conversation.last_message_preview || "",
        lastMessageAt: conversation.last_message_at,
        messages: [],
        hasMoreMessages: false,
        nextMessagesCursor: null,
        isMuted: Boolean(row.is_muted),
        mutedUntil: null,
        peerLastReadAt: null,
      };
    })
    .filter((item): item is Conversation => item !== null)
    .sort((a, b) => {
      const aTime = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
      const bTime = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
      return bTime - aTime;
    });

  return { ok: true, conversations };
}

export async function listMessagesForConversation(
  supabase: SupabaseClient,
  currentUserId: string,
  conversationId: string,
  cursor?: string | null,
  peerLastReadAt?: string | null
): Promise<ActionResult<MessagesPageDTO>> {
  const decoded = cursor ? decodeMessagesCursor(cursor) : null;

  if (cursor && !decoded) {
    return { ok: false, message: "Invalid message cursor." };
  }

  const { data, error } = await supabase.rpc("list_conversation_messages", {
    p_conversation_id: conversationId,
    p_limit: MESSAGE_PAGE_SIZE + 1,
    p_before_created_at: decoded?.createdAt ?? null,
    p_before_id: decoded?.id ?? null,
  });

  if (error) {
    console.error("listMessagesForConversation failed:", error);
    return {
      ok: false,
      message: "Unable to load messages. Please try again.",
    };
  }

  const rows = (data ?? []) as MessageRow[];
  const hasMore = rows.length > MESSAGE_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, MESSAGE_PAGE_SIZE) : rows;

  const replyIds = page
    .map((row) => row.reply_to_message_id)
    .filter((id): id is string => Boolean(id));
  const pageById = new Map(page.map((row) => [row.id, row]));
  const replyTargets = await loadReplyTargets(
    supabase,
    conversationId,
    replyIds.filter((id) => !pageById.has(id))
  );
  const replyById = new Map([...pageById, ...replyTargets]);

  const reactionMap = await loadReactionsForMessages(
    supabase,
    conversationId,
    page.map((row) => row.id)
  );

  const chronological = page
    .slice()
    .reverse()
    .map((row) =>
      mapMessageRow(row, currentUserId, {
        replyById,
        reactions: reactionMap.get(row.id),
        peerLastReadAt: peerLastReadAt ?? null,
      })
    )
    .filter((item): item is Message => item !== null);

  const oldest = page[page.length - 1];
  const nextCursor =
    hasMore && oldest
      ? encodeMessagesCursor(oldest.created_at, oldest.id)
      : null;

  return {
    ok: true,
    messages: chronological,
    hasMore,
    nextCursor,
  };
}

export async function getOrCreateDirectConversation(
  supabase: SupabaseClient,
  otherUserId: string
): Promise<ActionResult<{ conversationId: string }>> {
  const { data, error } = await supabase.rpc(
    "get_or_create_direct_conversation",
    { p_other_user_id: otherUserId }
  );

  if (error) {
    console.error("get_or_create_direct_conversation failed:", error);
    const message = (error.message || "").toLowerCase();
    const code = (error as { code?: string }).code ?? "";

    if (message.includes("authentication required")) {
      return {
        ok: false,
        message: "Please sign in to message.",
        requiresAuth: true,
      };
    }

    if (message.includes("user not found")) {
      return { ok: false, message: "That user could not be found." };
    }

    if (message.includes("invalid conversation peer")) {
      return { ok: false, message: "You cannot message this account." };
    }

    if (
      code === "PGRST202" ||
      message.includes("could not find the function") ||
      message.includes("schema cache")
    ) {
      return {
        ok: false,
        message:
          "Messenger is not set up on this project yet. Apply 20260713_messenger_v1_foundation.sql in Supabase.",
      };
    }

    return {
      ok: false,
      message: error.message || "Unable to open conversation. Please try again.",
    };
  }

  const conversationId =
    typeof data === "string"
      ? data
      : data != null
        ? String(data)
        : "";

  if (!conversationId) {
    console.error("get_or_create_direct_conversation returned empty:", data);
    return {
      ok: false,
      message: "Unable to open conversation. Please try again.",
    };
  }

  return { ok: true, conversationId };
}

export function validateMessageBody(
  body: string
): ActionResult<{ body: string }> {
  const trimmed = body.trim();

  if (!trimmed) {
    return { ok: false, message: "Message cannot be empty." };
  }

  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      message: `Message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, body: trimmed };
}

export async function sendTextMessage(
  supabase: SupabaseClient,
  currentUserId: string,
  conversationId: string,
  rawBody: string,
  clientId?: string | null,
  replyToMessageId?: string | null
): Promise<ActionResult<{ message: Message }>> {
  const validated = validateMessageBody(rawBody);
  if (!validated.ok) {
    return validated;
  }

  if (replyToMessageId) {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(replyToMessageId.trim())) {
      return { ok: false, message: "Invalid reply target." };
    }
  }

  const insertPayload: {
    conversation_id: string;
    sender_id: string;
    body: string;
    message_type: string;
    client_id?: string;
    reply_to_message_id?: string;
  } = {
    conversation_id: conversationId,
    sender_id: currentUserId,
    body: validated.body,
    message_type: "text",
  };

  if (clientId && clientId.trim()) {
    insertPayload.client_id = clientId.trim().slice(0, 80);
  }

  if (replyToMessageId?.trim()) {
    insertPayload.reply_to_message_id = replyToMessageId.trim();
  }

  const selectCols =
    "id, conversation_id, sender_id, body, message_type, created_at, deleted_at, deleted_for, edited_at, reply_to_message_id, client_id";

  const { data, error } = await supabase
    .from("messages")
    .insert(insertPayload)
    .select(selectCols)
    .single();

  if (error) {
    if (
      insertPayload.client_id &&
      (error.code === "23505" ||
        (error.message || "").toLowerCase().includes("duplicate"))
    ) {
      const { data: existing } = await supabase
        .from("messages")
        .select(selectCols)
        .eq("conversation_id", conversationId)
        .eq("sender_id", currentUserId)
        .eq("client_id", insertPayload.client_id)
        .maybeSingle();

      if (existing) {
        const replyById = await loadReplyTargets(
          supabase,
          conversationId,
          existing.reply_to_message_id ? [existing.reply_to_message_id] : []
        );
        const mapped = mapMessageRow(existing as MessageRow, currentUserId, {
          replyById,
        });
        if (mapped) {
          return { ok: true, message: mapped };
        }
      }
    }

    console.error("sendTextMessage failed:", error);
    return {
      ok: false,
      message: "Unable to send message. Please try again.",
    };
  }

  const replyById = await loadReplyTargets(
    supabase,
    conversationId,
    data.reply_to_message_id ? [data.reply_to_message_id] : []
  );
  const mapped = mapMessageRow(data as MessageRow, currentUserId, { replyById });
  if (!mapped) {
    return {
      ok: false,
      message: "Unable to send message. Please try again.",
    };
  }

  return { ok: true, message: mapped };
}

export async function editTextMessage(
  supabase: SupabaseClient,
  currentUserId: string,
  messageId: string,
  rawBody: string
): Promise<ActionResult<{ message: Message }>> {
  const validated = validateMessageBody(rawBody);
  if (!validated.ok) {
    return validated;
  }

  const { data, error } = await supabase.rpc("edit_own_text_message", {
    p_message_id: messageId,
    p_body: validated.body,
  });

  if (error) {
    console.error("editTextMessage failed:", error);
    const message = (error.message || "").toLowerCase();
    if (message.includes("only the sender")) {
      return { ok: false, message: "You can only edit your own messages." };
    }
    if (message.includes("only text") || message.includes("attachments")) {
      return { ok: false, message: "This message cannot be edited." };
    }
    if (message.includes("deleted")) {
      return { ok: false, message: "Deleted messages cannot be edited." };
    }
    return { ok: false, message: "Unable to edit message. Please try again." };
  }

  const row = data as MessageRow;
  const replyById = await loadReplyTargets(
    supabase,
    row.conversation_id,
    row.reply_to_message_id ? [row.reply_to_message_id] : []
  );
  const mapped = mapMessageRow(row, currentUserId, { replyById });
  if (!mapped) {
    return { ok: false, message: "Unable to edit message. Please try again." };
  }

  return { ok: true, message: mapped };
}

export async function deleteMessageForEveryone(
  supabase: SupabaseClient,
  currentUserId: string,
  messageId: string
): Promise<ActionResult<{ message: Message }>> {
  const { data, error } = await supabase.rpc(
    "soft_delete_message_for_everyone",
    { p_message_id: messageId }
  );

  if (error) {
    console.error("deleteMessageForEveryone failed:", error);
    const message = (error.message || "").toLowerCase();
    if (message.includes("only the sender")) {
      return {
        ok: false,
        message: "Only the sender can delete this message for everyone.",
      };
    }
    return { ok: false, message: "Unable to delete message. Please try again." };
  }

  const mapped = mapMessageRow(data as MessageRow, currentUserId);
  if (!mapped) {
    return { ok: false, message: "Unable to delete message. Please try again." };
  }

  return { ok: true, message: mapped };
}

export async function deleteMessageForMe(
  supabase: SupabaseClient,
  messageId: string
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("hide_message_for_me", {
    p_message_id: messageId,
  });

  if (error) {
    console.error("deleteMessageForMe failed:", error);
    return { ok: false, message: "Unable to delete message. Please try again." };
  }

  return { ok: true, done: true };
}

export async function toggleMessageReaction(
  supabase: SupabaseClient,
  messageId: string,
  emoji: string
): Promise<ActionResult<{ removed: boolean; emoji: string; userId: string }>> {
  const { data, error } = await supabase.rpc("toggle_message_reaction", {
    p_message_id: messageId,
    p_emoji: emoji,
  });

  if (error) {
    console.error("toggleMessageReaction failed:", error);
    const message = (error.message || "").toLowerCase();
    if (message.includes("invalid reaction")) {
      return { ok: false, message: "That reaction is not supported." };
    }
    if (message.includes("deleted")) {
      return { ok: false, message: "Cannot react to a deleted message." };
    }
    return { ok: false, message: "Unable to update reaction. Please try again." };
  }

  const payload = data as {
    removed?: boolean;
    emoji?: string;
    userId?: string;
  };

  return {
    ok: true,
    removed: Boolean(payload.removed),
    emoji: String(payload.emoji ?? emoji),
    userId: String(payload.userId ?? ""),
  };
}

export async function setConversationMute(
  supabase: SupabaseClient,
  conversationId: string,
  option: MuteOption
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("set_conversation_mute", {
    p_conversation_id: conversationId,
    p_mute_option: muteOptionToRpcValue(option),
  });

  if (error) {
    console.error("setConversationMute failed:", error);
    const message = (error.message || "").toLowerCase();
    if (
      (error as { code?: string }).code === "PGRST202" ||
      message.includes("could not find the function")
    ) {
      // Fallback: direct column update for boolean mute only
      if (option === "off") {
        const { error: updateError } = await supabase
          .from("conversation_participants")
          .update({ is_muted: false })
          .eq("conversation_id", conversationId);
        if (updateError) {
          return { ok: false, message: "Unable to update mute. Please try again." };
        }
        return { ok: true, done: true };
      }
      if (option === "forever") {
        const { error: updateError } = await supabase
          .from("conversation_participants")
          .update({ is_muted: true })
          .eq("conversation_id", conversationId);
        if (updateError) {
          return { ok: false, message: "Unable to update mute. Please try again." };
        }
        return { ok: true, done: true };
      }
      return {
        ok: false,
        message:
          "Timed mute requires the Phase 2 migration. Apply 20260729_messenger_production_phase2.sql.",
      };
    }
    return { ok: false, message: "Unable to update mute. Please try again." };
  }

  return { ok: true, done: true };
}

export async function markConversationRead(
  supabase: SupabaseClient,
  conversationId: string,
  messageId?: string | null
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
    p_message_id: messageId ?? null,
  });

  if (error) {
    console.error("markConversationRead failed:", error);
    return {
      ok: false,
      message: "Unable to update read state.",
    };
  }

  return { ok: true, done: true };
}

export async function setConversationTyping(
  supabase: SupabaseClient,
  conversationId: string,
  isTyping: boolean
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("set_conversation_typing", {
    p_conversation_id: conversationId,
    p_is_typing: isTyping,
  });

  if (error) {
    console.error("setConversationTyping failed:", error);
    return { ok: false, message: "Unable to update typing state." };
  }

  return { ok: true, done: true };
}

/** Map a realtime message row into the client DTO (best-effort). */
export function mapRealtimeMessageRow(
  row: MessageRow,
  currentUserId: string,
  options?: {
    replyById?: Map<string, MessageRow>;
    reactions?: MessageReactionSummary[];
    peerLastReadAt?: string | null;
  }
): Message | null {
  return mapMessengerMessageRow(row, currentUserId, options);
}

export type { MessageRow };
