import { describe, expect, it } from "vitest";
import {
  applyReactionToggle,
  groupReactionsByMessage,
  mergeReactionRealtimeEvent,
} from "./reactionState";
import {
  canDeleteForEveryone,
  canDeleteForMe,
  canEditMessage,
  canReactToMessage,
  replyPreviewText,
} from "./messagePermissions";
import { isMuteOption, MUTE_OPTIONS } from "./muteOptions";
import {
  computeReceiptStatus,
  isConversationCurrentlyMuted,
  type Message,
} from "../types";
import { mapMessengerMessageRow } from "./mapMessage";

function baseMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    conversationId: "22222222-2222-2222-2222-222222222222",
    senderId: "user-a",
    text: "Hello",
    sentAt: "2026-07-18T10:00:00.000Z",
    isMine: true,
    status: "sent",
    messageType: "text",
    ...overrides,
  };
}

describe("reactionState", () => {
  it("groups reaction aggregates by message", () => {
    const map = groupReactionsByMessage([
      {
        message_id: "m1",
        emoji: "👍",
        count: 2,
        reacted_by_me: true,
      },
      {
        message_id: "m1",
        emoji: "❤️",
        count: "1",
        reacted_by_me: false,
      },
      {
        message_id: "m2",
        emoji: "😂",
        count: 3,
        reacted_by_me: false,
      },
    ]);

    expect(map.get("m1")).toEqual([
      { emoji: "❤️", count: 1, reactedByMe: false },
      { emoji: "👍", count: 2, reactedByMe: true },
    ]);
    expect(map.get("m2")?.[0]).toMatchObject({ emoji: "😂", count: 3 });
  });

  it("toggles reactions optimistically", () => {
    const added = applyReactionToggle({
      reactions: undefined,
      emoji: "👍",
      removed: false,
    });
    expect(added).toEqual([{ emoji: "👍", count: 1, reactedByMe: true }]);

    const removed = applyReactionToggle({
      reactions: added,
      emoji: "👍",
      removed: true,
    });
    expect(removed).toEqual([]);
  });

  it("merges realtime reaction events without double-counting own inserts", () => {
    const afterOptimistic = applyReactionToggle({
      reactions: undefined,
      emoji: "❤️",
      removed: false,
    });

    const echoed = mergeReactionRealtimeEvent({
      reactions: afterOptimistic,
      emoji: "❤️",
      userId: "me",
      currentUserId: "me",
      event: "INSERT",
    });

    expect(echoed).toEqual([{ emoji: "❤️", count: 1, reactedByMe: true }]);

    const peer = mergeReactionRealtimeEvent({
      reactions: echoed,
      emoji: "❤️",
      userId: "peer",
      currentUserId: "me",
      event: "INSERT",
    });
    expect(peer?.[0]?.count).toBe(2);
  });
});

describe("messagePermissions", () => {
  it("allows edit only for own non-deleted text messages", () => {
    expect(canEditMessage(baseMessage(), "user-a")).toBe(true);
    expect(canEditMessage(baseMessage({ isMine: false, senderId: "other" }), "user-a")).toBe(
      false
    );
    expect(canEditMessage(baseMessage({ isDeleted: true }), "user-a")).toBe(false);
    expect(canEditMessage(baseMessage({ messageType: "system" }), "user-a")).toBe(
      false
    );
    expect(canEditMessage(baseMessage({ id: "local-x" }), "user-a")).toBe(false);
  });

  it("scopes delete-for-everyone to sender and delete-for-me to persisted rows", () => {
    expect(canDeleteForEveryone(baseMessage(), "user-a")).toBe(true);
    expect(canDeleteForEveryone(baseMessage(), "other")).toBe(false);
    expect(canDeleteForMe(baseMessage())).toBe(true);
    expect(canDeleteForMe(baseMessage({ status: "sending" }))).toBe(false);
    expect(canReactToMessage(baseMessage({ isDeleted: true }))).toBe(false);
  });

  it("handles deleted or missing reply previews safely", () => {
    expect(replyPreviewText({ body: "Hi there", deletedAt: null })).toEqual({
      text: "Hi there",
      unavailable: false,
    });
    expect(replyPreviewText({ body: "Hi", deletedAt: "2026-07-18T11:00:00Z" })).toEqual({
      text: "Message deleted",
      unavailable: true,
    });
    expect(replyPreviewText({ body: null, deletedAt: null }).unavailable).toBe(true);
  });
});

describe("mute and receipts", () => {
  it("supports mute option tokens", () => {
    expect(MUTE_OPTIONS).toEqual(["1h", "8h", "1w", "forever", "off"]);
    expect(isMuteOption("1h")).toBe(true);
    expect(isMuteOption("nope")).toBe(false);
  });

  it("evaluates timed mute expiry", () => {
    expect(
      isConversationCurrentlyMuted({
        isMuted: true,
        mutedUntil: null,
      })
    ).toBe(true);
    expect(
      isConversationCurrentlyMuted({
        isMuted: true,
        mutedUntil: "2099-01-01T00:00:00.000Z",
        nowMs: Date.parse("2026-07-18T00:00:00.000Z"),
      })
    ).toBe(true);
    expect(
      isConversationCurrentlyMuted({
        isMuted: true,
        mutedUntil: "2020-01-01T00:00:00.000Z",
        nowMs: Date.parse("2026-07-18T00:00:00.000Z"),
      })
    ).toBe(false);
  });

  it("computes Sent / Delivered / Seen from peer last_read", () => {
    expect(
      computeReceiptStatus({
        isMine: true,
        sentAt: "2026-07-18T10:00:00.000Z",
        peerLastReadAt: null,
      })
    ).toBe("sent");
    expect(
      computeReceiptStatus({
        isMine: true,
        sentAt: "2026-07-18T10:00:00.000Z",
        peerLastReadAt: "2026-07-18T09:59:00.000Z",
      })
    ).toBe("delivered");
    expect(
      computeReceiptStatus({
        isMine: true,
        sentAt: "2026-07-18T10:00:00.000Z",
        peerLastReadAt: "2026-07-18T10:01:00.000Z",
      })
    ).toBe("seen");
  });
});

describe("mapMessengerMessageRow", () => {
  it("maps deleted messages and reply previews", () => {
    const replyTarget = {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      conversation_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      sender_id: "peer",
      body: "Original",
      message_type: "text",
      created_at: "2026-07-18T09:00:00.000Z",
      deleted_at: null,
      edited_at: null,
      reply_to_message_id: null,
      client_id: null,
    };

    const mapped = mapMessengerMessageRow(
      {
        id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
        conversation_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        sender_id: "me",
        body: "Reply body",
        message_type: "text",
        created_at: "2026-07-18T10:00:00.000Z",
        deleted_at: null,
        edited_at: "2026-07-18T10:05:00.000Z",
        reply_to_message_id: replyTarget.id,
        client_id: "c1",
      },
      "me",
      {
        replyById: new Map([[replyTarget.id, replyTarget]]),
        peerLastReadAt: "2026-07-18T10:06:00.000Z",
      }
    );

    expect(mapped.replyPreview?.text).toBe("Original");
    expect(mapped.editedAt).toBeTruthy();
    expect(mapped.receiptStatus).toBe("seen");

    const deleted = mapMessengerMessageRow(
      {
        ...replyTarget,
        deleted_at: "2026-07-18T11:00:00.000Z",
        body: null,
      },
      "me"
    );
    expect(deleted.isDeleted).toBe(true);
    expect(deleted.text).toBe("Message deleted");
  });
});
