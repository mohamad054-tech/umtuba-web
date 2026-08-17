/**
 * UGC playback loudness policy — EBU R128 two-pass FFmpeg loudnorm.
 * Server-side only. Skip when the source has no audio.
 *
 * TARGET_LUFS was locked from synthetic fixture evidence (see
 * scripts/media/ugcAudioLoudnessBenchmark.ts). -16 LUFS produced the
 * tightest applied cluster (median -19.05 after AAC, range -21.15 to
 * -18.95) with no true-peak clipping. Candidate -14 was hotter
 * (median -17.05) but wider. Quiet speech is gain-capped; near-silence
 * is skipped so noise is not slammed.
 */

import { runFfmpeg } from "../processing/adapters/ffmpegAdapter";

export const UGC_LOUDNESS_STANDARD = "EBU_R128";
export const UGC_TARGET_LUFS = -16;
export const UGC_TRUE_PEAK_LIMIT_DBTP = -1;
export const UGC_LOUDNESS_LRA = 11;
/** Do not boost quiet/noisy beds more than this toward the target. */
export const UGC_LOUDNESS_MAX_GAIN_DB = 12;
/** Integrated loudness at or below this is treated as near-silence. */
export const UGC_LOUDNESS_SKIP_BELOW_LUFS = -40;
export const UGC_LOUDNORM_FILTER = "loudnorm";

export type LoudnormMeasurement = {
  inputI: number;
  inputTp: number;
  inputLra: number;
  inputThresh: number;
  outputI: number | null;
  outputTp: number | null;
  outputLra: number | null;
  targetOffset: number | null;
  normalizationType: string | null;
};

export type LoudnessSkipReason = "no_audio" | "near_silence";

export type LoudnessPlan =
  | { apply: false; reason: LoudnessSkipReason }
  | {
      apply: true;
      filter: string;
      effectiveTargetLufs: number;
      measured: LoudnormMeasurement;
      capped: boolean;
    };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseLufs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === "-inf" || trimmed === "inf" || trimmed === "nan") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function extractLoudnormJson(raw: string): string | null {
  if (!raw) return null;
  const start = raw.lastIndexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return raw.slice(start, end + 1);
}

export function parseLoudnormJson(raw: string): LoudnormMeasurement | null {
  const json = extractLoudnormJson(raw);
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  const row = asRecord(parsed);
  if (!row) return null;
  const inputI = parseLufs(row.input_i);
  const inputTp = parseLufs(row.input_tp);
  const inputLra = parseLufs(row.input_lra);
  const inputThresh = parseLufs(row.input_thresh);
  if (inputI == null || inputTp == null || inputLra == null || inputThresh == null) {
    return null;
  }
  return {
    inputI,
    inputTp,
    inputLra,
    inputThresh,
    outputI: parseLufs(row.output_i),
    outputTp: parseLufs(row.output_tp),
    outputLra: parseLufs(row.output_lra),
    targetOffset: parseLufs(row.target_offset),
    normalizationType:
      typeof row.normalization_type === "string" ? row.normalization_type : null,
  };
}

export function formatLoudnormNumber(value: number): string {
  return value.toFixed(2);
}

export function buildLoudnormAnalyzeFilter(
  targetLufs: number = UGC_TARGET_LUFS,
  truePeak = UGC_TRUE_PEAK_LIMIT_DBTP
): string {
  return [
    `${UGC_LOUDNORM_FILTER}=I=${formatLoudnormNumber(targetLufs)}`,
    `TP=${formatLoudnormNumber(truePeak)}`,
    `LRA=${formatLoudnormNumber(UGC_LOUDNESS_LRA)}`,
    "print_format=json",
  ].join(":");
}

export function loudnormNullSink(): string[] {
  return process.platform === "win32" ? ["-f", "null", "NUL"] : ["-f", "null", "-"];
}

export function buildLoudnormAnalyzeArgs(inputPath: string): string[] {
  return [
    "-hide_banner",
    "-nostats",
    "-i",
    inputPath,
    "-vn",
    "-sn",
    "-dn",
    "-map",
    "0:a:0",
    "-af",
    buildLoudnormAnalyzeFilter(),
    ...loudnormNullSink(),
  ];
}

export function buildLoudnormApplyFilter(
  measured: LoudnormMeasurement,
  targetLufs: number = UGC_TARGET_LUFS
): string {
  const offset =
    targetLufs === UGC_TARGET_LUFS && measured.targetOffset != null
      ? measured.targetOffset
      : 0;
  return [
    `${UGC_LOUDNORM_FILTER}=I=${formatLoudnormNumber(targetLufs)}`,
    `TP=${formatLoudnormNumber(UGC_TRUE_PEAK_LIMIT_DBTP)}`,
    `LRA=${formatLoudnormNumber(UGC_LOUDNESS_LRA)}`,
    `measured_I=${formatLoudnormNumber(measured.inputI)}`,
    `measured_LRA=${formatLoudnormNumber(measured.inputLra)}`,
    `measured_TP=${formatLoudnormNumber(measured.inputTp)}`,
    `measured_thresh=${formatLoudnormNumber(measured.inputThresh)}`,
    `offset=${formatLoudnormNumber(offset)}`,
    "linear=true",
    "dual_mono=true",
    "print_format=json",
  ].join(":");
}

export function decideLoudnessPlan(
  hasAudio: boolean,
  measured: LoudnormMeasurement | null,
  targetLufs: number = UGC_TARGET_LUFS
): LoudnessPlan {
  if (!hasAudio) {
    return { apply: false, reason: "no_audio" };
  }
  if (!measured || !Number.isFinite(measured.inputI)) {
    return { apply: false, reason: "near_silence" };
  }
  if (measured.inputI <= UGC_LOUDNESS_SKIP_BELOW_LUFS) {
    return { apply: false, reason: "near_silence" };
  }

  const rawGain = targetLufs - measured.inputI;
  let effectiveTarget = targetLufs;
  let capped = false;
  if (rawGain > UGC_LOUDNESS_MAX_GAIN_DB) {
    effectiveTarget = measured.inputI + UGC_LOUDNESS_MAX_GAIN_DB;
    capped = true;
  }

  return {
    apply: true,
    filter: buildLoudnormApplyFilter(measured, effectiveTarget),
    effectiveTargetLufs: effectiveTarget,
    measured,
    capped,
  };
}

export function outputTruePeakClipped(outputTp: number | null | undefined): boolean {
  return typeof outputTp === "number" && Number.isFinite(outputTp) && outputTp > 0;
}

export async function analyzeUgcLoudness(input: {
  inputPath: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  binary?: string;
}): Promise<
  | { ok: true; measurement: LoudnormMeasurement }
  | { ok: false; code: string }
> {
  const ffmpeg = await runFfmpeg({
    args: buildLoudnormAnalyzeArgs(input.inputPath),
    signal: input.signal,
    timeoutMs: input.timeoutMs,
    binary: input.binary,
    captureStderr: true,
  });
  if (!ffmpeg.ok) {
    return {
      ok: false,
      code: ffmpeg.code === "ffmpeg_missing" ? "ffmpeg_missing" : "loudnorm_analyze_failed",
    };
  }
  const measurement = parseLoudnormJson(ffmpeg.stderr ?? "");
  if (!measurement) {
    return { ok: false, code: "loudnorm_analyze_failed" };
  }
  return { ok: true, measurement };
}
