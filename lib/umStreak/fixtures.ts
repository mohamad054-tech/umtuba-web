import type { Conversation, Message } from "../../app/messages/types";
import { utcDayKey } from "./calendar";
import { viewerStatus } from "./engine";
import type { UmStreakRecord, UmStreakViewerStatus, VisualMessageRecord } from "./types";

export const UM_STREAK_DEMO_LABEL = "DEMO ONLY";

const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CONVERSATION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

function message(partial: Partial<Message> & Pick<Message, "id" | "text" | "isMine">): Message {
  return {
    conversationId: CONVERSATION_ID,
    senderId: partial.isMine ? USER_A : USER_B,
    sentAt: "2026-09-02T15:00:00.000Z",
    messageType: "text",
    ...partial,
  };
}

function conversation(
  messages: Message[],
  streak?: UmStreakViewerStatus
): Conversation {
  const last = messages[messages.length - 1];
  return {
    id: CONVERSATION_ID,
    peerId: USER_B,
    peerName: "Lina",
    peerInitials: "LI",
    peerAvatarGradient: "from-amber-500 to-orange-400",
    status: "offline",
    lastSeenLabel: "",
    unreadCount: 0,
    isTyping: false,
    lastMessagePreview: last?.text ?? "",
    lastMessageAt: last?.sentAt ?? null,
    messages,
    hasMoreMessages: false,
    nextMessagesCursor: null,
    umStreak: streak,
  };
}

export function demoStreakRecord(overrides: Partial<UmStreakRecord> = {}): UmStreakRecord {
  return {
    pairKey: `${USER_A}:${USER_B}`,
    userLowId: USER_A,
    userHighId: USER_B,
    currentStreak: 0,
    longestStreak: 0,
    lastQualifyingDayLow: null,
    lastQualifyingDayHigh: null,
    lastCompletedStreakDay: null,
    streakState: "none",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-09-02T15:00:00.000Z",
    ...overrides,
  };
}

export function demoVisual(partial: Partial<VisualMessageRecord> = {}): VisualMessageRecord {
  return {
    id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    senderId: USER_B,
    recipientId: USER_A,
    conversationId: CONVERSATION_ID,
    mediaRef: `${USER_B}/${CONVERSATION_ID}/demo.jpg`,
    mediaType: "image",
    createdAt: "2026-09-02T14:58:00.000Z",
    openedAt: null,
    expiresAt: null,
    expirationPolicy: "view_once",
    caption: "Good morning",
    viewed: false,
    ...partial,
  };
}

export function buildUmStreakPreviewStates(nowIso = "2026-09-02T15:00:00.000Z") {
  const today = utcDayKey(nowIso);
  const visualUnopened = message({
    id: "visual-unopened",
    text: "Good morning",
    isMine: false,
    messageType: "image",
    visual: {
      mediaType: "image",
      caption: "Good morning",
      viewed: false,
      openedAt: null,
      expirationPolicy: "view_once",
      previewUrl: null,
      demoOnly: true,
    },
  });
  const visualOpened = message({
    id: "visual-opened",
    text: "",
    isMine: false,
    messageType: "image",
    visual: {
      mediaType: "image",
      caption: null,
      viewed: true,
      openedAt: nowIso,
      expirationPolicy: "view_once",
      previewUrl: null,
      demoOnly: true,
    },
  });

  const active = viewerStatus(
    demoStreakRecord({
      currentStreak: 7,
      longestStreak: 7,
      lastQualifyingDayLow: today,
      lastQualifyingDayHigh: today,
      lastCompletedStreakDay: today,
      streakState: "active_today",
    }),
    USER_A,
    today
  );
  const waiting = viewerStatus(
    demoStreakRecord({
      currentStreak: 7,
      longestStreak: 7,
      lastQualifyingDayLow: today,
      lastQualifyingDayHigh: null,
      lastCompletedStreakDay: "2026-09-01",
      streakState: "waiting_for_friend",
    }),
    USER_A,
    today
  );
  const atRisk = viewerStatus(
    demoStreakRecord({
      currentStreak: 7,
      longestStreak: 7,
      lastQualifyingDayLow: null,
      lastQualifyingDayHigh: null,
      lastCompletedStreakDay: "2026-09-01",
      streakState: "at_risk",
    }),
    USER_A,
    today
  );
  const milestone = viewerStatus(
    demoStreakRecord({
      currentStreak: 30,
      longestStreak: 30,
      lastQualifyingDayLow: today,
      lastQualifyingDayHigh: today,
      lastCompletedStreakDay: today,
      streakState: "active_today",
    }),
    USER_A,
    today
  );

  return {
    demoOnly: true as const,
    currentUserId: USER_A,
    conversation: conversation([visualUnopened, visualOpened], active),
    cameraOpen: true,
    receivedUnopened: visualUnopened,
    receivedOpened: visualOpened,
    active,
    waiting,
    atRisk,
    milestone,
    conversationActive: conversation([visualUnopened], active),
    conversationWaiting: conversation([visualUnopened], waiting),
    conversationAtRisk: conversation([visualUnopened], atRisk),
    conversationMilestone: conversation([visualUnopened], milestone),
  };
}
