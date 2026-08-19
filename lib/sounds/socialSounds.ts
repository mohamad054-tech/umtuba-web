/**
 * Social Sound Library V1 — canonical SOUND entity + video mix.
 * Server/RLS is the authority for visibility and reuse. The client
 * must never treat an upload as public redistribution permission.
 */

export const SOCIAL_SOUND_VISIBILITY = [
  "private",
  "owner_only",
  "public_reusable",
] as const;

export const SOCIAL_SOUND_RIGHTS = [
  "unverified",
  "owner_confirmed",
  "platform_licensed",
  "blocked",
  "takedown",
] as const;

export const SOCIAL_SOUND_REUSE = ["none", "owner_only", "public"] as const;

export const SOCIAL_SOUND_SOURCES = [
  "uploaded",
  "original_video",
  "platform",
] as const;

export const SOUND_RIGHTS_CONFIRMATION_MIN = 8;

export type SocialSoundVisibility = (typeof SOCIAL_SOUND_VISIBILITY)[number];
export type SocialSoundRightsStatus = (typeof SOCIAL_SOUND_RIGHTS)[number];
export type SocialSoundReusePermission = (typeof SOCIAL_SOUND_REUSE)[number];
export type SocialSoundSourceType = (typeof SOCIAL_SOUND_SOURCES)[number];

export type SocialSound = {
  id: string;
  ownerUserId: string;
  sourceType: SocialSoundSourceType;
  sourceVideoId: number | null;
  parentSoundId: string | null;
  title: string;
  storagePath: string | null;
  durationMs: number | null;
  createdAt: string;
  visibility: SocialSoundVisibility;
  reusePermission: SocialSoundReusePermission;
  rightsStatus: SocialSoundRightsStatus;
  rightsConfirmedAt: string | null;
  moderationStatus: "pending" | "clean" | "flagged" | "blocked";
  usageCount: number;
};

export type VideoSoundMix = {
  originalAudioEnabled: boolean;
  originalAudioVolume: number;
  addedSoundVolume: number;
  soundStartOffsetMs: number;
};

export const DEFAULT_VIDEO_SOUND_MIX: VideoSoundMix = {
  originalAudioEnabled: true,
  originalAudioVolume: 1,
  addedSoundVolume: 1,
  soundStartOffsetMs: 0,
};

export function isPubliclyReusableSound(sound: {
  visibility: string;
  reusePermission: string;
  rightsStatus: string;
  moderationStatus: string;
  rightsConfirmedAt: string | null;
}): boolean {
  return (
    sound.visibility === "public_reusable" &&
    sound.reusePermission === "public" &&
    (sound.rightsStatus === "owner_confirmed" ||
      sound.rightsStatus === "platform_licensed") &&
    sound.moderationStatus !== "blocked" &&
    sound.rightsConfirmedAt != null
  );
}

export function defaultCreateSoundState(): {
  visibility: SocialSoundVisibility;
  reusePermission: SocialSoundReusePermission;
  rightsStatus: SocialSoundRightsStatus;
} {
  return {
    visibility: "private",
    reusePermission: "none",
    rightsStatus: "unverified",
  };
}

export function canUseSoundInEditor(sound: {
  visibility: string;
  reusePermission: string;
  rightsStatus: string;
  moderationStatus: string;
  rightsConfirmedAt: string | null;
  ownerUserId: string;
  viewerUserId: string | null;
}): boolean {
  if (sound.rightsStatus === "blocked" || sound.rightsStatus === "takedown") {
    return false;
  }
  if (sound.moderationStatus === "blocked") {
    return false;
  }
  if (sound.viewerUserId && sound.ownerUserId === sound.viewerUserId) {
    return true;
  }
  return isPubliclyReusableSound(sound);
}

export function clampMixVolume(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, value));
}

export function sanitizeVideoSoundMix(input: unknown): VideoSoundMix {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_VIDEO_SOUND_MIX };
  }
  const raw = input as Record<string, unknown>;
  return {
    originalAudioEnabled: raw.originalAudioEnabled !== false,
    originalAudioVolume: clampMixVolume(Number(raw.originalAudioVolume)),
    addedSoundVolume: clampMixVolume(Number(raw.addedSoundVolume)),
    soundStartOffsetMs: Math.max(
      0,
      Number.isFinite(Number(raw.soundStartOffsetMs))
        ? Math.round(Number(raw.soundStartOffsetMs))
        : 0
    ),
  };
}

export function sanitizeSoundTitle(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function canConfirmReuseRights(confirmation: string): boolean {
  return confirmation.trim().length >= SOUND_RIGHTS_CONFIRMATION_MIN;
}
