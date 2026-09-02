export type OnlineStatus = "online" | "away" | "offline";

export type MessageStatus = "sending" | "sent" | "failed";

/** Delivery / read ticks for own messages (peer last_read cursor). */
export type ReceiptStatus = "sent" | "delivered" | "seen";

export const MESSAGE_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"] as const;
export type MessageReactionEmoji = (typeof MESSAGE_REACTION_EMOJIS)[number];

export type MessageReactionSummary = {
  emoji: MessageReactionEmoji;
  count: number;
  reactedByMe: boolean;
};

export type MessageReplyPreview = {
  messageId: string;
  text: string;
  senderId: string | null;
  unavailable: boolean;
};

export type VisualMessageView = {
  mediaType: "image" | "video";
  caption: string | null;
  viewed: boolean;
  openedAt: string | null;
  expirationPolicy: "view_once" | "disappear_after_view";
  previewUrl?: string | null;
  demoOnly?: boolean;
};

export type UmStreakViewerView = {
  state:
    | "none"
    | "started"
    | "active_today"
    | "waiting_for_friend"
    | "you_need_to_reply"
    | "at_risk";
  currentStreak: number;
  longestStreak: number;
  badges: Array<{
    days: 3 | 7 | 30 | 100 | 365;
    earned: boolean;
    earnedAt: string | null;
  }>;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  sentAt: string;
  isMine: boolean;
  status?: MessageStatus;
  clientId?: string;
  /** Prepared for read-receipt UI later */
  readAt?: string | null;
  /** Sent / Delivered / Seen for own outbound messages */
  receiptStatus?: ReceiptStatus;
  messageType?: string;
  replyToMessageId?: string | null;
  replyPreview?: MessageReplyPreview | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  isDeleted?: boolean;
  reactions?: MessageReactionSummary[];
  visual?: VisualMessageView | null;
};

export type MuteOption = "1h" | "8h" | "1w" | "forever" | "off";

export type Conversation = {
  id: string;
  peerId: string;
  peerName: string;
  peerInitials: string;
  peerAvatarGradient: string;
  peerAvatarUrl?: string | null;
  status: OnlineStatus;
  lastSeenLabel: string;
  unreadCount: number;
  isTyping: boolean;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  messages: Message[];
  hasMoreMessages: boolean;
  nextMessagesCursor: string | null;
  isMuted?: boolean;
  mutedUntil?: string | null;
  /** Peer's last_read_at — used for Delivered/Seen on own messages */
  peerLastReadAt?: string | null;
  umStreak?: UmStreakViewerView | null;
};

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function peerGradientFromId(id: string) {
  const gradients = [
    "from-blue-500 to-cyan-400",
    "from-violet-500 to-fuchsia-400",
    "from-emerald-500 to-teal-400",
    "from-amber-500 to-orange-400",
    "from-rose-500 to-pink-400",
    "from-indigo-500 to-sky-400",
  ] as const;

  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index) * (index + 1)) % gradients.length;
  }

  return gradients[hash] ?? gradients[0];
}

export function getLastMessage(conversation: Conversation): Message | undefined {
  if (conversation.messages.length === 0) {
    return undefined;
  }

  return conversation.messages[conversation.messages.length - 1];
}

export function formatMessageTime(iso: string | null | undefined) {
  if (!iso) {
    return "";
  }

  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) {
    return "";
  }

  const diffMs = Date.now() - created;
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatBubbleTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isMessageReactionEmoji(
  value: string
): value is MessageReactionEmoji {
  return (MESSAGE_REACTION_EMOJIS as readonly string[]).includes(value);
}

export function computeReceiptStatus(input: {
  isMine: boolean;
  sentAt: string;
  peerLastReadAt?: string | null;
  status?: MessageStatus;
}): ReceiptStatus | undefined {
  if (!input.isMine) {
    return undefined;
  }

  if (input.status === "sending" || input.status === "failed") {
    return undefined;
  }

  if (!input.peerLastReadAt) {
    return "sent";
  }

  const sent = Date.parse(input.sentAt);
  const read = Date.parse(input.peerLastReadAt);
  if (Number.isNaN(sent) || Number.isNaN(read)) {
    return "sent";
  }

  return read >= sent ? "seen" : "delivered";
}

export function isConversationCurrentlyMuted(input: {
  isMuted?: boolean;
  mutedUntil?: string | null;
  nowMs?: number;
}): boolean {
  if (!input.isMuted) {
    return false;
  }

  if (!input.mutedUntil) {
    return true;
  }

  const until = Date.parse(input.mutedUntil);
  if (Number.isNaN(until)) {
    return true;
  }

  return until > (input.nowMs ?? Date.now());
}
