import { existsSync, statSync } from "node:fs";
import { durationWithinTolerance } from "./ugcVideoPolicy";
import type { UgcProbeResult } from "./ugcVideoProbe";

export type UgcLocalGateInput = {
  ffmpegOk: boolean;
  outputPath: string;
  inputProbe: UgcProbeResult;
  outputProbe: UgcProbeResult | null;
};

export type UgcLocalGateResult =
  | { ok: true; sizeBytes: number }
  | { ok: false; code: string };

/**
 * Local fail-safe steps 1–5. Steps 6–8 (upload / readable / DB switch)
 * are applied by the processor after this gate.
 */
export function validateOptimizedLocalOutput(
  input: UgcLocalGateInput
): UgcLocalGateResult {
  if (!input.ffmpegOk) {
    return { ok: false, code: "render_failed" };
  }
  if (!input.outputPath || !existsSync(input.outputPath)) {
    return { ok: false, code: "output_missing" };
  }

  let sizeBytes = 0;
  try {
    sizeBytes = statSync(input.outputPath).size;
  } catch {
    return { ok: false, code: "output_missing" };
  }
  if (sizeBytes <= 0) {
    return { ok: false, code: "output_empty" };
  }

  const output = input.outputProbe;
  if (!output) {
    return { ok: false, code: "probe_failed" };
  }
  if (!output.hasVideo) {
    return { ok: false, code: "output_not_playable" };
  }
  if (input.inputProbe.hasAudio && !output.hasAudio) {
    return { ok: false, code: "output_audio_missing" };
  }
  if (!input.inputProbe.hasAudio && output.hasAudio) {
    // Source had no audio — do not invent a track. Soft: still playable.
  }
  if (
    !durationWithinTolerance(input.inputProbe.durationMs, output.durationMs)
  ) {
    return { ok: false, code: "duration_mismatch" };
  }

  return { ok: true, sizeBytes };
}

export function shouldKeepOriginalBecauseNoSaving(
  inputBytes: number,
  outputBytes: number
): boolean {
  return inputBytes > 0 && outputBytes >= inputBytes;
}
