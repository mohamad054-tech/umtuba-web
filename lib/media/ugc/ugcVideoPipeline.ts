export type UgcTranscodeState = {
  v: 1;
  enabled: boolean;
  original_path: string;
  optimized_path: string | null;
  attempt_count: number;
  last_error: string | null;
  playback_replaced: boolean;
  skipped: string | null;
};

export type MediaPipelineRecord = Record<string, unknown>;

export function emptyUgcTranscodeState(originalPath: string): UgcTranscodeState {
  return {
    v: 1,
    enabled: true,
    original_path: originalPath,
    optimized_path: null,
    attempt_count: 0,
    last_error: null,
    playback_replaced: false,
    skipped: null,
  };
}

export function readUgcTranscodeState(
  pipeline: unknown
): UgcTranscodeState | null {
  if (!pipeline || typeof pipeline !== "object" || Array.isArray(pipeline)) {
    return null;
  }
  const raw = (pipeline as MediaPipelineRecord).ugc_transcode;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const original =
    typeof row.original_path === "string" ? row.original_path.trim() : "";
  if (!original) return null;
  return {
    v: 1,
    enabled: row.enabled === true,
    original_path: original,
    optimized_path:
      typeof row.optimized_path === "string" && row.optimized_path.trim()
        ? row.optimized_path.trim()
        : null,
    attempt_count:
      typeof row.attempt_count === "number" && row.attempt_count >= 0
        ? Math.floor(row.attempt_count)
        : 0,
    last_error:
      typeof row.last_error === "string" && row.last_error.trim()
        ? row.last_error.trim().slice(0, 64)
        : null,
    playback_replaced: row.playback_replaced === true,
    skipped:
      typeof row.skipped === "string" && row.skipped.trim()
        ? row.skipped.trim().slice(0, 64)
        : null,
  };
}

export function mergeUgcTranscodeState(
  pipeline: unknown,
  next: UgcTranscodeState
): MediaPipelineRecord {
  const base =
    pipeline && typeof pipeline === "object" && !Array.isArray(pipeline)
      ? { ...(pipeline as MediaPipelineRecord) }
      : {};
  return {
    ...base,
    ugc_transcode: next,
  };
}

export function referencedUgcPaths(input: {
  videoPath?: string | null;
  thumbnailPath?: string | null;
  pipeline?: unknown;
}): string[] {
  const state = readUgcTranscodeState(input.pipeline);
  return [
    input.videoPath,
    input.thumbnailPath,
    state?.original_path,
    state?.optimized_path,
  ]
    .map((value) => (value ?? "").trim())
    .filter(Boolean);
}
