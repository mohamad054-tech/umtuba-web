import type { MessageReactionEmoji, MessageReactionSummary } from "../types";
import { isMessageReactionEmoji } from "../types";

export type ReactionAggRow = {
  message_id: string;
  emoji: string;
  count: number | string;
  reacted_by_me: boolean;
};

export function groupReactionsByMessage(
  rows: ReactionAggRow[]
): Map<string, MessageReactionSummary[]> {
  const map = new Map<string, MessageReactionSummary[]>();

  for (const row of rows) {
    if (!isMessageReactionEmoji(row.emoji)) {
      continue;
    }

    const count = Number(row.count);
    if (!Number.isFinite(count) || count <= 0) {
      continue;
    }

    const summary: MessageReactionSummary = {
      emoji: row.emoji,
      count,
      reactedByMe: Boolean(row.reacted_by_me),
    };

    const list = map.get(row.message_id) ?? [];
    list.push(summary);
    map.set(row.message_id, list);
  }

  for (const [messageId, list] of map) {
    map.set(
      messageId,
      list.slice().sort((a, b) => a.emoji.localeCompare(b.emoji))
    );
  }

  return map;
}

export function applyReactionToggle(input: {
  reactions: MessageReactionSummary[] | undefined;
  emoji: MessageReactionEmoji;
  removed: boolean;
}): MessageReactionSummary[] {
  const current = input.reactions ?? [];
  const existing = current.find((r) => r.emoji === input.emoji);

  if (input.removed) {
    if (!existing) {
      return current;
    }

    const nextCount = existing.count - 1;
    if (nextCount <= 0) {
      return current.filter((r) => r.emoji !== input.emoji);
    }

    return current.map((r) =>
      r.emoji === input.emoji
        ? { ...r, count: nextCount, reactedByMe: false }
        : r
    );
  }

  if (!existing) {
    return [...current, { emoji: input.emoji, count: 1, reactedByMe: true }].sort(
      (a, b) => a.emoji.localeCompare(b.emoji)
    );
  }

  if (existing.reactedByMe) {
    return current;
  }

  return current.map((r) =>
    r.emoji === input.emoji
      ? { ...r, count: r.count + 1, reactedByMe: true }
      : r
  );
}

export function mergeReactionRealtimeEvent(input: {
  reactions: MessageReactionSummary[] | undefined;
  emoji: string;
  userId: string;
  currentUserId: string;
  event: "INSERT" | "DELETE" | "UPDATE";
}): MessageReactionSummary[] | undefined {
  if (!isMessageReactionEmoji(input.emoji)) {
    return input.reactions;
  }

  const isMe = input.userId === input.currentUserId;
  const current = input.reactions ?? [];
  const existing = current.find((r) => r.emoji === input.emoji);

  if (input.event === "DELETE") {
    if (!existing) {
      return current.length ? current : undefined;
    }

    const nextCount = existing.count - 1;
    if (nextCount <= 0) {
      const next = current.filter((r) => r.emoji !== input.emoji);
      return next.length ? next : undefined;
    }

    return current.map((r) =>
      r.emoji === input.emoji
        ? {
            ...r,
            count: nextCount,
            reactedByMe: isMe ? false : r.reactedByMe,
          }
        : r
    );
  }

  // INSERT (and UPDATE treated as insert for safety)
  if (!existing) {
    return [
      ...current,
      { emoji: input.emoji, count: 1, reactedByMe: isMe },
    ].sort((a, b) => a.emoji.localeCompare(b.emoji));
  }

  // Avoid double-counting optimistic own insert echoed by realtime
  if (isMe && existing.reactedByMe) {
    return current;
  }

  return current.map((r) =>
    r.emoji === input.emoji
      ? {
          ...r,
          count: isMe && existing.reactedByMe ? r.count : r.count + 1,
          reactedByMe: r.reactedByMe || isMe,
        }
      : r
  );
}
