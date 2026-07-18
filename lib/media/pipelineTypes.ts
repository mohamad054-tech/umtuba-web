/**
 * Media Pipeline V1 — reusable types and pure helpers.
 * Future: HLS, DASH, ABR, AI enhancement / translation / dubbing
 * live under MediaPipelineExtensions (schema-ready, not implemented).
 */

export const MEDIA_PIPELINE_STATUSES = [
  "draft",
  "uploading",
  "queued",
  "processing",
  "ready",
  "failed",
] as const;

export type MediaPipelineStatus = (typeof MEDIA_PIPELINE_STATUSES)[number];

/** Public surfaces must only show ready videos. */
export const PUBLIC_MEDIA_STATUS: MediaPipelineStatus = "ready";

export type MediaPipelineExtensions = {
  hls: unknown | null;
  dash: unknown | null;
  abr: unknown | null;
  ai_enhancement: unknown | null;
  ai_translation: unknown | null;
  ai_dubbing: unknown | null;
};

export const EMPTY_MEDIA_PIPELINE_EXTENSIONS: MediaPipelineExtensions = {
  hls: null,
  dash: null,
  abr: null,
  ai_enhancement: null,
  ai_translation: null,
  ai_dubbing: null,
};

export type MediaMetadata = {
  durationMs: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  codec: string | null;
  bitrate: number | null;
  fileSize: number | null;
  aspectRatio: string | null;
};

export type MediaPipelineTimestamps = {
  uploadStartedAt: string | null;
  uploadCompletedAt: string | null;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
};

export type MediaPipelineState = {
  status: MediaPipelineStatus;
  progress: number | null;
  error: string | null;
  thumbnailPath: string | null;
  timestamps: MediaPipelineTimestamps;
  metadata: MediaMetadata;
  extensions: MediaPipelineExtensions;
};

export function isMediaPipelineStatus(
  value: string
): value is MediaPipelineStatus {
  return (MEDIA_PIPELINE_STATUSES as readonly string[]).includes(value);
}

export function isPubliclyVisibleMedia(input: {
  postType: string;
  mediaStatus: string | null | undefined;
  videoPath: string | null | undefined;
}): boolean {
  if (input.postType !== "video") {
    return false;
  }

  const status = input.mediaStatus ?? "ready";
  const path = input.videoPath?.trim() ?? "";
  return status === "ready" && path.length > 0;
}

export function clampProcessingProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeAspectRatioLabel(
  width: number | null | undefined,
  height: number | null | undefined
): string | null {
  if (
    !width ||
    !height ||
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null;
  }

  const w = Math.round(width);
  const h = Math.round(height);
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function mediaStatusLabel(status: MediaPipelineStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "uploading":
      return "Uploading";
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "ready":
      return "Ready";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function buildMockThumbnailPath(userId: string, assetId: string): string {
  const cleanUser = userId.trim();
  const cleanAsset = assetId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "thumb";
  return `${cleanUser}/thumbs/${cleanAsset}.jpg`;
}

export function createInitialPipelineState(
  partial?: Partial<MediaPipelineState>
): MediaPipelineState {
  return {
    status: "draft",
    progress: null,
    error: null,
    thumbnailPath: null,
    timestamps: {
      uploadStartedAt: null,
      uploadCompletedAt: null,
      processingStartedAt: null,
      processingCompletedAt: null,
    },
    metadata: {
      durationMs: null,
      width: null,
      height: null,
      fps: null,
      codec: null,
      bitrate: null,
      fileSize: null,
      aspectRatio: null,
    },
    extensions: { ...EMPTY_MEDIA_PIPELINE_EXTENSIONS },
    ...partial,
  };
}
