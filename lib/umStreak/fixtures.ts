import type { Conversation, Message } from "../../app/messages/types";
import { utcDayKey } from "./calendar";
import { viewerStatus } from "./engine";
import type { UmStreakRecord, UmStreakViewerStatus, VisualMessageRecord } from "./types";

export const UM_STREAK_DEMO_LABEL = "DEMO ONLY";

const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const USER_C = "cccccccc-cccc-cccc-cccc-cccccccccc01";
const USER_D = "cccccccc-cccc-cccc-cccc-cccccccccc02";
const USER_E = "cccccccc-cccc-cccc-cccc-cccccccccc03";
const USER_F = "cccccccc-cccc-cccc-cccc-cccccccccc04";

const CONV_ACTIVE = "c1111111-1111-1111-1111-111111111111";
const CONV_WAITING = "c2222222-2222-2222-2222-222222222222";
const CONV_REPLY = "c3333333-3333-3333-3333-333333333333";
const CONV_AT_RISK = "c4444444-4444-4444-4444-444444444444";
const CONV_STARTED = "c5555555-5555-5555-5555-555555555555";
const CONV_MILESTONE = "c6666666-6666-6666-6666-666666666666";

type Peer = {
  id: string;
  name: string;
  initials: string;
  gradient: string;
};

function message(
  conversationId: string,
  senderId: string,
  partial: Partial<Message> & Pick<Message, "id" | "text" | "isMine">
): Message {
  return {
    conversationId,
    senderId,
    sentAt: "2026-09-02T15:00:00.000Z",
    messageType: "text",
    ...partial,
  };
}

function conversation(
  id: string,
  peer: Peer,
  messages: Message[],
  streak?: UmStreakViewerStatus
): Conversation {
  const last = messages[messages.length - 1];
  return {
    id,
    peerId: peer.id,
    peerName: peer.name,
    peerInitials: peer.initials,
    peerAvatarGradient: peer.gradient,
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
    conversationId: CONV_ACTIVE,
    mediaRef: `${USER_B}/${CONV_ACTIVE}/demo.jpg`,
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
  const visualUnopened = message(CONV_ACTIVE, USER_B, {
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
  const visualOpened = message(CONV_ACTIVE, USER_B, {
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
      userHighId: USER_C,
      pairKey: `${USER_A}:${USER_C}`,
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
  const youNeedToReply = viewerStatus(
    demoStreakRecord({
      userHighId: USER_D,
      pairKey: `${USER_A}:${USER_D}`,
      currentStreak: 4,
      longestStreak: 4,
      lastQualifyingDayLow: null,
      lastQualifyingDayHigh: today,
      lastCompletedStreakDay: "2026-09-01",
      streakState: "waiting_for_friend",
    }),
    USER_A,
    today
  );
  const atRisk = viewerStatus(
    demoStreakRecord({
      userHighId: USER_E,
      pairKey: `${USER_A}:${USER_E}`,
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
  const started = viewerStatus(
    demoStreakRecord({
      userHighId: USER_F,
      pairKey: `${USER_A}:${USER_F}`,
      currentStreak: 1,
      longestStreak: 1,
      lastQualifyingDayLow: today,
      lastQualifyingDayHigh: today,
      lastCompletedStreakDay: today,
      streakState: "started",
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

  const conversationActive = conversation(
    CONV_ACTIVE,
    { id: USER_B, name: "Lina", initials: "LI", gradient: "from-amber-500 to-orange-400" },
    [visualUnopened],
    active
  );
  const conversationWaiting = conversation(
    CONV_WAITING,
    { id: USER_C, name: "Omar", initials: "OM", gradient: "from-violet-500 to-fuchsia-400" },
    [message(CONV_WAITING, USER_A, { id: "wait-1", text: "Sent a visual today", isMine: true })],
    waiting
  );
  const conversationReply = conversation(
    CONV_REPLY,
    { id: USER_D, name: "Nour", initials: "NO", gradient: "from-emerald-500 to-teal-400" },
    [message(CONV_REPLY, USER_D, { id: "reply-1", text: "Your friend sent a visual", isMine: false })],
    youNeedToReply
  );
  const conversationAtRisk = conversation(
    CONV_AT_RISK,
    { id: USER_E, name: "Sami", initials: "SA", gradient: "from-rose-500 to-pink-400" },
    [message(CONV_AT_RISK, USER_A, { id: "risk-1", text: "Yesterday’s streak", isMine: true })],
    atRisk
  );
  const conversationStarted = conversation(
    CONV_STARTED,
    { id: USER_F, name: "Hana", initials: "HA", gradient: "from-indigo-500 to-sky-400" },
    [message(CONV_STARTED, USER_A, { id: "start-1", text: "First UM Streak day", isMine: true })],
    started
  );
  const conversationMilestone = conversation(
    CONV_MILESTONE,
    { id: USER_B, name: "Lina", initials: "LI", gradient: "from-amber-500 to-orange-400" },
    [visualUnopened],
    milestone
  );

  return {
    demoOnly: true as const,
    currentUserId: USER_A,
    conversation: conversationActive,
    cameraOpen: true,
    receivedUnopened: visualUnopened,
    receivedOpened: visualOpened,
    active,
    waiting,
    youNeedToReply,
    atRisk,
    started,
    milestone,
    conversationActive,
    conversationWaiting,
    conversationReply,
    conversationAtRisk,
    conversationStarted,
    conversationMilestone,
    inbox: [
      conversationActive,
      conversationWaiting,
      conversationReply,
      conversationAtRisk,
      conversationStarted,
    ],
  };
}
