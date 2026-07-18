import { describe, expect, it } from "vitest";
import {
  applyInboxParticipantPatch,
  applyPeerState,
  enrichDirectMessageHref,
  nextUnreadOnPeerMessage,
  rollbackOptimisticSend,
} from "./threadState";
import type { Conversation, Message } from "../types";

function baseConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "c1",
    peerId: "p1",
    peerName: "Peer",
    peerInitials: "PE",
    peerAvatarGradient: "from-blue-500 to-cyan-500",
    peerAvatarUrl: null,
    status: "offline",
    lastSeenLabel: "Recent",
    unreadCount: 2,
    isTyping: false,
    lastMessagePreview: "Earlier",
    lastMessageAt: "2026-07-18T10:00:00.000Z",
    messages: [],
    hasMoreMessages: false,
    nextMessagesCursor: null,
    peerLastReadAt: null,
    ...overrides,
  };
}

function baseMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "m1",
    conversationId: "c1",
    senderId: "me",
    text: "Hello",
    sentAt: "2026-07-18T10:05:00.000Z",
    isMine: true,
    status: "sent",
    messageType: "text",
    ...overrides,
  };
}

describe("threadState helpers", () => {
  it("rolls back optimistic send preview to previous last message", () => {
    const conversation = baseConversation({
      lastMessagePreview: "Sending now",
      lastMessageAt: "2026-07-18T10:06:00.000Z",
      messages: [
        baseMessage({ id: "m0", text: "Earlier", clientId: undefined }),
        baseMessage({
          id: "local-x",
          text: "Sending now",
          clientId: "cid-1",
          status: "sending",
        }),
      ],
    });

    const rolled = rollbackOptimisticSend(
      conversation,
      "cid-1",
      "Earlier",
      "2026-07-18T10:00:00.000Z"
    );

    expect(rolled.messages).toHaveLength(1);
    expect(rolled.lastMessagePreview).toBe("Earlier");
    expect(rolled.lastMessageAt).toBe("2026-07-18T10:05:00.000Z");
  });

  it("applies peer typing and seen receipts", () => {
    const conversation = baseConversation({
      messages: [
        baseMessage({
          id: "m1",
          sentAt: "2026-07-18T10:00:00.000Z",
          receiptStatus: "sent",
        }),
      ],
    });

    const updated = applyPeerState(conversation, {
      isTyping: true,
      peerLastReadAt: "2026-07-18T10:01:00.000Z",
    });

    expect(updated.isTyping).toBe(true);
    expect(updated.peerLastReadAt).toBe("2026-07-18T10:01:00.000Z");
    expect(updated.messages[0]?.receiptStatus).toBe("seen");
  });

  it("increments unread only for peer messages in non-selected chats", () => {
    const conversation = baseConversation({ unreadCount: 1 });
    expect(
      nextUnreadOnPeerMessage(
        conversation,
        { isMine: false },
        false
      )
    ).toBe(2);
    expect(
      nextUnreadOnPeerMessage(conversation, { isMine: false }, true)
    ).toBe(0);
    expect(
      nextUnreadOnPeerMessage(conversation, { isMine: true }, false)
    ).toBe(1);
  });

  it("patches inbox mute/unread from participant rows", () => {
    const patched = applyInboxParticipantPatch(
      baseConversation({ unreadCount: 4 }),
      { unreadCount: 7, isMuted: true, mutedUntil: null }
    );
    expect(patched.unreadCount).toBe(7);
    expect(patched.isMuted).toBe(true);

    const zeroed = applyInboxParticipantPatch(
      baseConversation({ unreadCount: 4 }),
      { unreadCount: 9 },
      { forceUnreadZero: true }
    );
    expect(zeroed.unreadCount).toBe(0);
  });

  it("enriches direct_message notification hrefs with messageId", () => {
    expect(
      enrichDirectMessageHref(
        "/messages?conversation=11111111-1111-1111-1111-111111111111",
        "direct_message",
        { messageId: "22222222-2222-2222-2222-222222222222" }
      )
    ).toContain("message=22222222-2222-2222-2222-222222222222");

    expect(
      enrichDirectMessageHref(
        "/messages?conversation=11111111-1111-1111-1111-111111111111",
        "post_like",
        { messageId: "22222222-2222-2222-2222-222222222222" }
      )
    ).not.toContain("message=");
  });
});
