/**
 * UGC playback encode policy V1 — single H.264/AAC MP4, visually good social quality.
 * Never upscale. No HLS / multi-rendition in V1.
 */

export const UGC_VIDEO_CODEC = "libx264";
export const UGC_AUDIO_CODEC = "aac";
export const UGC_CONTAINER = "mp4";
export const UGC_PIXEL_FORMAT = "yuv420p";
export const UGC_CRF = 23;
export const UGC_X264_PRESET = "medium";
export const UGC_AUDIO_BITRATE = "128k";
export const UGC_MAX_LONG_EDGE_LANDSCAPE = 1920;
export const UGC_MAX_SHORT_EDGE_LANDSCAPE = 1080;
export const UGC_MAX_LONG_EDGE_PORTRAIT = 1920;
export const UGC_MAX_SHORT_EDGE_PORTRAIT = 1080;
export const UGC_FPS_CAP = 30;
export const UGC_VIDEO_MAXRATE = "5M";
export const UGC_VIDEO_BUFSIZE = "10M";
export const UGC_DURATION_TOLERANCE_RATIO = 0.05;
export const UGC_DURATION_TOLERANCE_MS = 500;
export const UGC_MAX_ATTEMPTS = 5;
export const UGC_STALE_PROCESSING_MS = 15 * 60 * 1000;
export const UGC_FFMPEG_TIMEOUT_MS = 8 * 60 * 1000;
export const UGC_PLAYBACK_SUFFIX = "-playback";
export const UGC_TEMP_SUFFIX = "-playback.tmp";

export type UgcOrientationBox = {
  maxWidth: number;
  maxHeight: number;
};

export function orientationBox(
  width: number | null | undefined,
  height: number | null | undefined
): UgcOrientationBox {
  const w = typeof width === "number" && width > 0 ? width : 1080;
  const h = typeof height === "number" && height > 0 ? height : 1920;
  if (h >= w) {
    return {
      maxWidth: UGC_MAX_SHORT_EDGE_PORTRAIT,
      maxHeight: UGC_MAX_LONG_EDGE_PORTRAIT,
    };
  }
  return {
    maxWidth: UGC_MAX_LONG_EDGE_LANDSCAPE,
    maxHeight: UGC_MAX_SHORT_EDGE_LANDSCAPE,
  };
}

/**
 * Fit inside the orientation box. Never upscale. Even dimensions for yuv420p.
 */
export function computeOutputSize(
  width: number,
  height: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: 2, height: 2 };
  }
  const box = orientationBox(width, height);
  const scale = Math.min(1, box.maxWidth / width, box.maxHeight / height);
  let outW = Math.max(2, Math.round(width * scale));
  let outH = Math.max(2, Math.round(height * scale));
  if (outW % 2 !== 0) outW -= 1;
  if (outH % 2 !== 0) outH -= 1;
  return { width: Math.max(2, outW), height: Math.max(2, outH) };
}

export function buildUgcScaleFilter(
  width: number | null | undefined,
  height: number | null | undefined
): string {
  const box = orientationBox(width, height);
  // min(iw, box) prevents upscale; decrease keeps aspect; even dims for yuv420p.
  return `scale='min(iw,${box.maxWidth})':'min(ih,${box.maxHeight})':force_original_aspect_ratio=decrease:force_divisible_by=2`;
}

export function shouldCapFps(sourceFps: number | null | undefined): boolean {
  return typeof sourceFps === "number" && Number.isFinite(sourceFps) && sourceFps > UGC_FPS_CAP + 0.05;
}

export function parseFrameRate(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("/")) {
    const [num, den] = trimmed.split("/");
    const n = Number(num);
    const d = Number(den);
    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
    return n / d;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export type UgcFfmpegArgsInput = {
  inputPath: string;
  outputPath: string;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  hasAudio: boolean;
};

export function buildUgcFfmpegArgs(input: UgcFfmpegArgsInput): string[] {
  const args = [
    "-y",
    "-i",
    input.inputPath,
    "-map",
    "0:v:0",
    "-c:v",
    UGC_VIDEO_CODEC,
    "-preset",
    UGC_X264_PRESET,
    "-crf",
    String(UGC_CRF),
    "-maxrate",
    UGC_VIDEO_MAXRATE,
    "-bufsize",
    UGC_VIDEO_BUFSIZE,
    "-pix_fmt",
    UGC_PIXEL_FORMAT,
    "-vf",
    buildUgcScaleFilter(input.width, input.height),
  ];

  if (shouldCapFps(input.fps)) {
    args.push("-r", String(UGC_FPS_CAP));
  }

  if (input.hasAudio) {
    args.push("-map", "0:a:0?", "-c:a", UGC_AUDIO_CODEC, "-b:a", UGC_AUDIO_BITRATE, "-ac", "2");
  } else {
    args.push("-an");
  }

  args.push("-movflags", "+faststart", "-f", UGC_CONTAINER, input.outputPath);
  return args;
}

export function durationWithinTolerance(
  inputDurationMs: number | null,
  outputDurationMs: number | null
): boolean {
  if (
    inputDurationMs == null ||
    outputDurationMs == null ||
    inputDurationMs <= 0 ||
    outputDurationMs <= 0
  ) {
    return false;
  }
  const allowed = Math.max(
    UGC_DURATION_TOLERANCE_MS,
    inputDurationMs * UGC_DURATION_TOLERANCE_RATIO
  );
  return Math.abs(outputDurationMs - inputDurationMs) <= allowed;
}
