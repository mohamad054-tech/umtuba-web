import {
  avatarGradientFromId,
  formatChatSentAt,
  initialsFromName,
  type LiveChatMessage,
  type LiveParticipant,
} from "../types";

export type LiveChatRealtimeRow = {
  id: string;
  room_id: string;
  sender_id: string | null;
  body: string | null;
  message_type: string;
  deleted_at: string | null;
  client_id: string | null;
  created_at: string;
};

/**
 * Map a postgres_changes chat row into a UI message.
 * Prefer participant display names when available (avoids an extra round-trip).
 */
export function mapRealtimeChatRow(
  row: LiveChatRealtimeRow,
  opts: {
    hostId: string | null;
    currentUserId: string | null;
    participants?: LiveParticipant[];
  }
): LiveChatMessage {
  const senderId = row.sender_id ?? "system";
  const participant = opts.participants?.find((p) => p.userId === senderId);
  const isMine = Boolean(opts.currentUserId && row.sender_id === opts.currentUserId);
  const isCreator = Boolean(opts.hostId && row.sender_id === opts.hostId);
  const deleted = Boolean(row.deleted_at);

  let userName: string;
  if (deleted) {
    userName = "Message removed";
  } else if (isMine) {
    userName = "You";
  } else if (participant?.displayName) {
    userName = participant.displayName;
  } else if (isCreator) {
    userName = "Host";
  } else {
    userName = "Viewer";
  }

  return {
    id: row.id,
    roomId: row.room_id,
    userId: senderId,
    userName,
    userInitials: deleted
      ? "—"
      : participant?.initials ||
        (isMine ? "YO" : isCreator ? "HO" : initialsFromName(userName)),
    avatarGradient:
      participant?.avatarGradient ?? avatarGradientFromId(senderId),
    text: deleted ? "Message removed by moderation" : (row.body ?? ""),
    sentAt: formatChatSentAt(row.created_at),
    createdAt: row.created_at,
    isCreator,
    isMine,
    clientId: row.client_id ?? undefined,
    messageType: row.message_type as LiveChatMessage["messageType"],
    deleted,
  };
}

export function mergeRealtimeChatMessage(
  prev: LiveChatMessage[],
  incoming: LiveChatMessage
): LiveChatMessage[] {
  if (prev.some((m) => m.id === incoming.id)) {
    return prev;
  }

  if (incoming.clientId) {
    const idx = prev.findIndex((m) => m.clientId === incoming.clientId);
    if (idx >= 0) {
      const next = [...prev];
      next[idx] = {
        ...prev[idx],
        ...incoming,
        userName: prev[idx].isMine ? prev[idx].userName : incoming.userName,
        userInitials: prev[idx].isMine
          ? prev[idx].userInitials
          : incoming.userInitials,
      };
      return next;
    }
  }

  return [...prev, incoming];
}
