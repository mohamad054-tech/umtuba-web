"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  getOrCreateDirectConversation,
  listConversationsForUser,
  listMessagesForConversation,
  markConversationRead,
  sendTextMessage,
  setConversationTyping,
  type ActionResult,
  type MessagesPageDTO,
} from "../../lib/supabase/messenger";
import type { Conversation, Message } from "../messages/types";

function parseUuid(value: string, label: string): ActionResult<{ id: string }> {
  const trimmed = value.trim();
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  cursor?: string | null
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
    cursor ?? null
  );
}

export async function sendMessageAction(input: {
  conversationId: string;
  body: string;
  clientId?: string | null;
}): Promise<ActionResult<{ message: Message }>> {
  const parsed = parseUuid(input.conversationId, "conversation");
  if (!parsed.ok) {
    return parsed;
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
    input.clientId
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
