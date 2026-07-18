import {
  computeReceiptStatus,
  isConversationCurrentlyMuted,
  type Conversation,
  type Message,
} from "../types";

/** Recompute typing + receipts from peer participant snapshot. */
export function applyPeerState(
  conversation: Conversation,
  peer: { isTyping: boolean; peerLastReadAt: string | null }
): Conversation {
  const peerLastReadAt = peer.peerLastReadAt;
  return {
    ...conversation,
    isTyping: peer.isTyping,
    peerLastReadAt,
    messages: conversation.messages.map((message) => ({
      ...message,
      receiptStatus: computeReceiptStatus({
        isMine: message.isMine,
        sentAt: message.sentAt,
        peerLastReadAt,
        status: message.status,
      }),
    })),
  };
}

/**
 * After a failed optimistic send, drop the local bubble and restore list preview
 * from the remaining last message (or the pre-send snapshot).
 */
export function rollbackOptimisticSend(
  conversation: Conversation,
  clientId: string,
  previousPreview: string,
  previousAt: string | null
): Conversation {
  const messages = conversation.messages.filter(
    (message) => message.clientId !== clientId
  );
  const last = messages.at(-1);
  return {
    ...conversation,
    messages,
    lastMessagePreview: last?.text ?? previousPreview,
    lastMessageAt: last?.sentAt ?? previousAt,
  };
}

/** Patch inbox unread/mute from own participant realtime row. */
export function applyInboxParticipantPatch(
  conversation: Conversation,
  patch: {
    unreadCount?: number | null;
    isMuted?: boolean | null;
    mutedUntil?: string | null;
  },
  options?: { forceUnreadZero?: boolean }
): Conversation {
  const mutedUntil =
    patch.mutedUntil !== undefined
      ? patch.mutedUntil
      : conversation.mutedUntil ?? null;
  const isMutedFlag =
    patch.isMuted !== undefined && patch.isMuted !== null
      ? patch.isMuted
      : conversation.isMuted;

  let unreadCount = conversation.unreadCount;
  if (options?.forceUnreadZero) {
    unreadCount = 0;
  } else if (typeof patch.unreadCount === "number") {
    unreadCount = Math.max(0, patch.unreadCount);
  }

  return {
    ...conversation,
    unreadCount,
    mutedUntil,
    isMuted: isConversationCurrentlyMuted({
      isMuted: Boolean(isMutedFlag),
      mutedUntil,
    }),
  };
}

/** Increment unread for a peer message when the chat is not open. */
export function nextUnreadOnPeerMessage(
  conversation: Conversation,
  message: Pick<Message, "isMine">,
  isSelected: boolean
): number {
  if (message.isMine || isSelected) {
    return isSelected ? 0 : conversation.unreadCount;
  }
  return conversation.unreadCount + 1;
}

/**
 * Append `message` query when metadata carries a DM message id
 * (no DB migration — enriches stored href client-side).
 */
export function enrichDirectMessageHref(
  href: string | null | undefined,
  type: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined
): string | null {
  if (!href || type !== "direct_message") {
    return href ?? null;
  }

  const messageId = metadata?.messageId;
  if (typeof messageId !== "string" || !messageId.trim()) {
    return href;
  }

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(messageId.trim())) {
    return href;
  }

  try {
    const url = new URL(href, "https://umtuba.local");
    if (!url.searchParams.get("message")) {
      url.searchParams.set("message", messageId.trim());
    }
    const query = url.searchParams.toString();
    return query ? `${url.pathname}?${query}` : url.pathname;
  } catch {
    return href;
  }
}
