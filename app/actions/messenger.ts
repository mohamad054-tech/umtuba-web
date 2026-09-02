"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  deleteMessageForEveryone,
  deleteMessageForMe,
  editTextMessage,
  getConversationPeerState,
  getOrCreateDirectConversation,
  listConversationsForUser,
  listMessagesForConversation,
  markConversationRead,
  sendTextMessage,
  setConversationMute,
  setConversationTyping,
  toggleMessageReaction,
  type ActionResult,
  type MessagesPageDTO,
} from "../../lib/supabase/messenger";
import {
  getConversationUmStreak,
  openVisualMessage,
  sendVisualMessage,
} from "../../lib/supabase/umStreakMessenger";
import type {
  Conversation,
  Message,
  MuteOption,
  UmStreakViewerView,
} from "../messages/types";
import { isMuteOption } from "../messages/lib/muteOptions";
import { isMessageReactionEmoji } from "../messages/types";

function parseUuid(value: string, label: string): ActionResult<{ id: string }> {
  const trimmed = value.trim();
  // Accept any RFC-like UUID (v1–v8+). Strict variant checks reject valid Supabase ids.
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRe.test(trimmed)) {
    return { ok: false, message: `Invalid ${label}.` };
  }

  return { ok: true, id: trimmed };
}

export async function listConversationsAction(): Promise<
  ActionResult<{ conversations: Conversation[] }>
> {
  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in to view messages.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return listConversationsForUser(supabase, user.id);
}

export async function listMessagesAction(
  conversationId: string,
  cursor?: string | null,
  peerLastReadAt?: string | null
): Promise<ActionResult<MessagesPageDTO>> {
  const parsed = parseUuid(conversationId, "conversation");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in to view messages.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return listMessagesForConversation(
    supabase,
    user.id,
    parsed.id,
    cursor ?? null,
    peerLastReadAt ?? null
  );
}

export async function sendMessageAction(input: {
  conversationId: string;
  body: string;
  clientId?: string | null;
  replyToMessageId?: string | null;
}): Promise<ActionResult<{ message: Message }>> {
  const parsed = parseUuid(input.conversationId, "conversation");
  if (!parsed.ok) {
    return parsed;
  }

  if (input.replyToMessageId) {
    const replyParsed = parseUuid(input.replyToMessageId, "reply target");
    if (!replyParsed.ok) {
      return replyParsed;
    }
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in to send messages.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return sendTextMessage(
    supabase,
    user.id,
    parsed.id,
    input.body,
    input.clientId,
    input.replyToMessageId
  );
}

export async function editMessageAction(input: {
  messageId: string;
  body: string;
}): Promise<ActionResult<{ message: Message }>> {
  const parsed = parseUuid(input.messageId, "message");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in to edit messages.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return editTextMessage(supabase, user.id, parsed.id, input.body);
}

export async function deleteMessageForEveryoneAction(
  messageId: string
): Promise<ActionResult<{ message: Message }>> {
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
  return deleteMessageForEveryone(supabase, user.id, parsed.id);
}

export async function deleteMessageForMeAction(
  messageId: string
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
  return deleteMessageForMe(supabase, parsed.id);
}

export async function toggleReactionAction(input: {
  messageId: string;
  emoji: string;
}): Promise<ActionResult<{ removed: boolean; emoji: string; userId: string }>> {
  const parsed = parseUuid(input.messageId, "message");
  if (!parsed.ok) {
    return parsed;
  }

  if (!isMessageReactionEmoji(input.emoji)) {
    return { ok: false, message: "That reaction is not supported." };
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
  return toggleMessageReaction(supabase, parsed.id, input.emoji);
}

export async function setConversationMuteAction(input: {
  conversationId: string;
  option: string;
}): Promise<ActionResult<{ done: true }>> {
  const parsed = parseUuid(input.conversationId, "conversation");
  if (!parsed.ok) {
    return parsed;
  }

  if (!isMuteOption(input.option)) {
    return { ok: false, message: "Invalid mute option." };
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
  return setConversationMute(
    supabase,
    parsed.id,
    input.option as MuteOption
  );
}

export async function openDirectConversationAction(
  otherUserId: string
): Promise<ActionResult<{ conversationId: string }>> {
  const parsed = parseUuid(otherUserId, "user");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in to message.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return getOrCreateDirectConversation(supabase, parsed.id);
}

export async function markConversationReadAction(
  conversationId: string,
  messageId?: string | null
): Promise<ActionResult<{ done: true }>> {
  const parsed = parseUuid(conversationId, "conversation");
  if (!parsed.ok) {
    return parsed;
  }

  if (messageId) {
    const messageParsed = parseUuid(messageId, "message");
    if (!messageParsed.ok) {
      return messageParsed;
    }
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
  return markConversationRead(supabase, parsed.id, messageId ?? null);
}

export async function setTypingAction(
  conversationId: string,
  isTyping: boolean
): Promise<ActionResult<{ done: true }>> {
  const parsed = parseUuid(conversationId, "conversation");
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
  return setConversationTyping(supabase, parsed.id, isTyping);
}

export async function getConversationPeerStateAction(
  conversationId: string
): Promise<
  ActionResult<{ isTyping: boolean; peerLastReadAt: string | null }>
> {
  const parsed = parseUuid(conversationId, "conversation");
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
  return getConversationPeerState(supabase, parsed.id);
}

export async function getCurrentUserIdAction(): Promise<
  ActionResult<{ userId: string }>
> {
  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in.",
      requiresAuth: true,
    };
  }

  return { ok: true, userId: user.id };
}

export async function sendVisualMessageAction(input: {
  conversationId: string;
  storagePath: string;
  mimeType: string;
  mediaType: "image" | "video";
  caption?: string | null;
  clientId?: string | null;
  byteSize?: number | null;
}): Promise<ActionResult<{ message: Message }>> {
  const parsed = parseUuid(input.conversationId, "conversation");
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "Please sign in to send a visual message.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return sendVisualMessage(supabase, user.id, {
    ...input,
    conversationId: parsed.id,
  });
}

export async function openVisualMessageAction(
  messageId: string
): Promise<ActionResult<{ message: Message; signedUrl: string | null }>> {
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
  return openVisualMessage(supabase, user.id, parsed.id);
}

export async function getConversationUmStreakAction(
  conversationId: string
): Promise<ActionResult<{ streak: UmStreakViewerView | null }>> {
  const parsed = parseUuid(conversationId, "conversation");
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
  return getConversationUmStreak(supabase, user.id, parsed.id);
}
