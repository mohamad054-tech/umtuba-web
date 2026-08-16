import { existsSync, statSync } from "node:fs";
import { runFfprobe } from "../processing/adapters/ffprobeAdapter";
import { parseFrameRate } from "./ugcVideoPolicy";

export type UgcProbeStream = {
  codecType: "video" | "audio" | "other";
  codecName: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  durationSec: number | null;
  channels: number | null;
};

export type UgcProbeResult = {
  hasVideo: boolean;
  hasAudio: boolean;
  width: number | null;
  height: number | null;
  fps: number | null;
  durationMs: number | null;
  sizeBytes: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  formatName: string | null;
  streams: UgcProbeStream[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseFfprobeJson(raw: string): UgcProbeResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const root = asRecord(parsed);
  if (!root) return null;
  const format = asRecord(root.format);
  const streamsRaw = Array.isArray(root.streams) ? root.streams : [];
  const streams: UgcProbeStream[] = streamsRaw.map((item) => {
    const row = asRecord(item) ?? {};
    const codecTypeRaw = String(row.codec_type ?? "");
    const codecType: UgcProbeStream["codecType"] =
      codecTypeRaw === "video" || codecTypeRaw === "audio" ? codecTypeRaw : "other";
    return {
      codecType,
      codecName: typeof row.codec_name === "string" ? row.codec_name : null,
      width: num(row.width),
      height: num(row.height),
      fps: parseFrameRate(typeof row.r_frame_rate === "string" ? row.r_frame_rate : null),
      durationSec: num(row.duration),
      channels: num(row.channels),
    };
  });

  const video = streams.find((s) => s.codecType === "video") ?? null;
  const audio = streams.find((s) => s.codecType === "audio") ?? null;
  const formatDuration = num(format?.duration);
  const durationSec = formatDuration ?? video?.durationSec ?? audio?.durationSec ?? null;

  return {
    hasVideo: Boolean(video),
    hasAudio: Boolean(audio),
    width: video?.width ?? null,
    height: video?.height ?? null,
    fps: video?.fps ?? null,
    durationMs: durationSec != null && durationSec > 0 ? Math.round(durationSec * 1000) : null,
    sizeBytes: num(format?.size),
    videoCodec: video?.codecName ?? null,
    audioCodec: audio?.codecName ?? null,
    formatName: typeof format?.format_name === "string" ? format.format_name : null,
    streams,
  };
}

export async function probeMediaFile(
  file: string,
  options?: { signal?: AbortSignal; binary?: string }
): Promise<{ ok: true; probe: UgcProbeResult } | { ok: false; code: string }> {
  if (!file || !existsSync(file)) {
    return { ok: false, code: "output_missing" };
  }
  const probed = await runFfprobe({
    file,
    signal: options?.signal,
    binary: options?.binary,
  });
  if (!probed.ok) {
    return { ok: false, code: probed.code };
  }
  const parsed = parseFfprobeJson(probed.json);
  if (!parsed) {
    return { ok: false, code: "probe_failed" };
  }
  try {
    const size = statSync(file).size;
    if (!parsed.sizeBytes) {
      parsed.sizeBytes = size;
    }
  } catch {
    // ignore
  }
  return { ok: true, probe: parsed };
}
