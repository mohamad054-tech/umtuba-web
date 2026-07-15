/** Live Streaming V1 domain types (UI + DTOs). */

export type LiveRoomVisibility = "public" | "private" | "group";
export type LiveRoomStatus = "idle" | "live" | "ended";
export type LiveParticipantRole =
  | "host"
  | "co_host"
  | "guest"
  | "moderator"
  | "viewer";

export type LiveStageStatus =
  | "off_stage"
  | "queued"
  | "invited"
  | "on_stage";

export type LiveStageLayoutMode =
  | "auto"
  | "active_speaker"
  | "pinned"
  | "grid";

export type LiveStageRequestStatus =
  | "pending"
  | "queued"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "expired";

export type LiveMediaConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

/** Default simultaneous publishers (host + guests). DB allows up to 16. */
export const LIVE_DEFAULT_MAX_ON_STAGE = 8;
export const LIVE_MAX_ON_STAGE_CEILING = 16;
export type LiveChatMessageType =
  | "text"
  | "system"
  | "gift"
  | "reaction"
  | "moderation";
export type LiveRecordingStatus =
  | "none"
  | "recording"
  | "processing"
  | "ready"
  | "failed";

export type LiveQuality =
  | "Auto"
  | "1080p"
  | "720p"
  | "480p"
  | "360p";

export const LIVE_QUALITY_OPTIONS: LiveQuality[] = [
  "Auto",
  "1080p",
  "720p",
  "480p",
  "360p",
];

export const LIVE_REACTIONS = ["❤️", "👍", "🔥", "👏"] as const;

export type LiveReactionEmoji = (typeof LIVE_REACTIONS)[number];

export type FloatingLiveReaction = {
  id: string;
  emoji: string;
  /** Horizontal drift seed 0–1 for floating animation variety */
  drift?: number;
};

export type LiveRealtimeState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export const LIVE_CHAT_MAX_LENGTH = 500;
export const LIVE_ROOM_TITLE_MAX = 120;

/** Live Studio collaboration (UI foundation — backend upload later). */
export type LiveCollabItemKind =
  | "image"
  | "pdf"
  | "document"
  | "presentation"
  | "link"
  | "file";

export type LiveCollabSharedItem = {
  id: string;
  kind: LiveCollabItemKind;
  fileName: string;
  typeLabel: string;
  sizeLabel: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  sentAtLabel: string;
  /** Preview hint only — never a public storage URL in V1 UI. */
  previewLabel?: string;
  canPreview?: boolean;
};

export const LIVE_COLLAB_ALLOWED_TYPES = [
  "PNG",
  "JPG",
  "WEBP",
  "GIF",
  "PDF",
  "DOCX",
  "PPTX",
  "TXT",
] as const;

export const LIVE_COLLAB_MAX_SIZE_LABEL = "25 MB";

export type LiveHostProfile = {
  id: string;
  name: string;
  handle: string;
  initials: string;
  avatarGradient: string;
  followersLabel: string;
};

export type LiveChatMessage = {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userInitials: string;
  avatarGradient: string;
  text: string;
  sentAt: string;
  createdAt: string;
  isCreator?: boolean;
  isMine?: boolean;
  clientId?: string;
  messageType?: LiveChatMessageType;
  deleted?: boolean;
};

export type LiveRoom = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  visibility: LiveRoomVisibility;
  status: LiveRoomStatus;
  city: string;
  country: string;
  /** Exact coords are never returned to clients — host-only in DB. */
  latitude: null;
  longitude: null;
  viewerCount: number;
  peakViewerCount: number;
  chatMessageCount: number;
  recordingStatus: LiveRecordingStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  startedAtLabel: string;
  previewGradient: string;
  previewAccent: string;
  previewLabel: string;
  host: LiveHostProfile;
  isHost?: boolean;
  myRole?: LiveParticipantRole | null;
  ingestProtocol?: string | null;
  sfuRoomId?: string | null;
  mediaMetadata?: Record<string, unknown>;
  maxOnStage?: number;
  pinnedParticipantId?: string | null;
  stageLayoutMode?: LiveStageLayoutMode;
  currentSessionId?: string | null;
  autoAdmitFromQueue?: boolean;
};

export type LiveParticipant = {
  userId: string;
  roomId: string;
  role: LiveParticipantRole;
  displayName: string;
  handle: string;
  initials: string;
  avatarGradient: string;
  joinedAt: string;
  lastSeenAt: string;
  isHost: boolean;
  stageStatus?: LiveStageStatus;
  canPublishAudio?: boolean;
  canPublishVideo?: boolean;
  canShareScreen?: boolean;
  mutedByHost?: boolean;
  cameraDisabledByHost?: boolean;
  queuePosition?: number | null;
  stageJoinedAt?: string | null;
};

export type LiveStageRequest = {
  id: string;
  roomId: string;
  requesterId: string;
  status: LiveStageRequestStatus;
  queuePosition: number | null;
  message: string | null;
  createdAt: string;
  displayName?: string;
  handle?: string;
  initials?: string;
  avatarGradient?: string;
};

export type LiveStageInvitation = {
  id: string;
  roomId: string;
  inviteeId: string;
  invitedBy: string;
  status: "pending" | "accepted" | "declined" | "revoked" | "expired";
  createdAt: string;
};

export type LiveMediaTokenPayload = {
  token: string;
  livekitUrl: string;
  identity: string;
  roomName: string;
  grants: {
    canSubscribe: boolean;
    canPublishAudio: boolean;
    canPublishVideo: boolean;
    canShareScreen: boolean;
  };
  expiresAt: number;
};

/** @deprecated Prefer LiveRoom — kept for gradual UI migration from mock */
export type LiveStream = LiveRoom & {
  chat?: LiveChatMessage[];
  creator: LiveHostProfile;
};

export type LiveChatPage = {
  messages: LiveChatMessage[];
  hasMore: boolean;
  nextCursor: string | null;
};

export type ActionResult<T> =
  | ({ ok: true } & T)
  | { ok: false; message: string; requiresAuth?: boolean };

export function formatViewerCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(count);
}

export function formatStartedAtLabel(startedAt: string | null): string {
  if (!startedAt) {
    return "Not started";
  }

  const ms = Date.now() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) {
    return "Just started";
  }

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) {
    return "Started just now";
  }
  if (minutes < 60) {
    return `Started ${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Started ${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `Started ${days}d ago`;
}

export function formatChatSentAt(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) {
    return "now";
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 45) {
    return "now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

const GRADIENTS = [
  "from-amber-400 to-rose-500",
  "from-pink-400 to-violet-600",
  "from-lime-400 to-emerald-600",
  "from-sky-400 to-blue-700",
  "from-cyan-300 to-blue-600",
  "from-yellow-400 to-orange-600",
  "from-fuchsia-400 to-violet-600",
  "from-emerald-400 to-teal-600",
] as const;

const PREVIEW_GRADIENTS = [
  "from-[#1a1040] via-[#0c1a3a] to-[#061820]",
  "from-[#1a0a28] via-[#0a1228] to-[#041018]",
  "from-[#2a1010] via-[#1a1420] to-[#0a1820]",
  "from-[#101828] via-[#12101f] to-[#081018]",
  "from-[#0a1828] via-[#0c1020] to-[#180a18]",
  "from-[#1a1808] via-[#14120f] to-[#081410]",
] as const;

const PREVIEW_ACCENTS = [
  "bg-amber-400/40",
  "bg-pink-400/35",
  "bg-lime-400/30",
  "bg-sky-400/30",
  "bg-cyan-300/35",
  "bg-yellow-400/30",
] as const;

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function avatarGradientFromId(id: string): string {
  return GRADIENTS[hashSeed(id) % GRADIENTS.length];
}

export function previewGradientFromId(id: string): string {
  return PREVIEW_GRADIENTS[hashSeed(id) % PREVIEW_GRADIENTS.length];
}

export function previewAccentFromId(id: string): string {
  return PREVIEW_ACCENTS[hashSeed(id + ":accent") % PREVIEW_ACCENTS.length];
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "U";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase() || "U";
}

export function citySlugFromName(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
