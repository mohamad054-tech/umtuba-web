/**
 * Generate SAFE synthetic audio fixtures and measure two-pass loudnorm.
 * Does not use real user UGC. Requires ffmpeg + ffprobe on PATH or FFMPEG_PATH.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildLoudnormAnalyzeArgs,
  decideLoudnessPlan,
  parseLoudnormJson,
  UGC_TARGET_LUFS,
  UGC_TRUE_PEAK_LIMIT_DBTP,
  type LoudnormMeasurement,
} from "../../lib/media/ugc/ugcAudioLoudness";
import { buildUgcFfmpegArgs } from "../../lib/media/ugc/ugcVideoPolicy";
import { parseFfprobeJson } from "../../lib/media/ugc/ugcVideoProbe";

export type LoudnessFixtureSpec = {
  id: string;
  label: string;
  hasAudio: boolean;
  extraInputArgs: string[];
};

export type LoudnessFixtureRow = {
  id: string;
  label: string;
  hasAudio: boolean;
  inputIntegratedLufs: number | null;
  inputTruePeak: number | null;
  outputIntegratedLufs: number | null;
  outputTruePeak: number | null;
  plan: "applied" | "skipped_no_audio" | "skipped_near_silence" | "failed";
  capped: boolean;
  playbackValid: boolean;
  clipping: boolean;
};

const FIXTURES: LoudnessFixtureSpec[] = [
  {
    id: "quiet-speech",
    label: "quiet speech",
    hasAudio: true,
    extraInputArgs: [
      "-f",
      "lavfi",
      "-i",
      "aevalsrc=0.035*sin(2*PI*180*t)+0.028*sin(2*PI*320*t)+0.018*sin(2*PI*900*t):d=4",
    ],
  },
  {
    id: "loud-music",
    label: "loud music",
    hasAudio: true,
    extraInputArgs: [
      "-f",
      "lavfi",
      "-i",
      "aevalsrc=0.62*sin(2*PI*110*t)+0.55*sin(2*PI*220*t)+0.42*sin(2*PI*440*t)+0.28*sin(2*PI*660*t):d=4",
    ],
  },
  {
    id: "phone-speech",
    label: "normal phone-recorded speech",
    hasAudio: true,
    extraInputArgs: [
      "-f",
      "lavfi",
      "-i",
      "aevalsrc=0.14*sin(2*PI*300*t)+0.10*sin(2*PI*800*t)+0.06*sin(2*PI*1500*t):d=4",
    ],
  },
  {
    id: "mixed-speech-music",
    label: "mixed speech/music",
    hasAudio: true,
    extraInputArgs: [
      "-f",
      "lavfi",
      "-i",
      "aevalsrc=0.12*sin(2*PI*190*t)+0.08*sin(2*PI*380*t)+0.22*sin(2*PI*220*t)+0.16*sin(2*PI*440*t):d=4",
    ],
  },
  {
    id: "already-normalized",
    label: "already normalized",
    hasAudio: true,
    extraInputArgs: [
      "-f",
      "lavfi",
      "-i",
      "aevalsrc=0.18*sin(2*PI*220*t)+0.12*sin(2*PI*440*t):d=4",
    ],
  },
  {
    id: "no-audio",
    label: "no audio",
    hasAudio: false,
    extraInputArgs: ["-f", "lavfi", "-i", "color=c=0x1a1a2e:s=640x360:d=3:r=24"],
  },
  {
    id: "noisy-low-level",
    label: "very noisy/low-level audio",
    hasAudio: true,
    extraInputArgs: [
      "-f",
      "lavfi",
      "-i",
      "anoisesrc=color=white:amplitude=0.012:d=4",
    ],
  },
];

function resolveBinary(name: "ffmpeg" | "ffprobe"): string {
  const envName = name === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH";
  const alt = name === "ffmpeg" ? "UMTUBA_FFMPEG" : "UMTUBA_FFPROBE";
  return process.env[envName]?.trim() || process.env[alt]?.trim() || name;
}

function run(binary: string, args: string[], timeoutMs = 180_000) {
  return spawnSync(binary, args, {
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true,
  });
}

function probeFile(file: string) {
  const probed = run(resolveBinary("ffprobe"), [
    "-v",
    "error",
    "-show_entries",
    "stream=codec_type,codec_name,width,height,r_frame_rate,duration",
    "-show_entries",
    "format=duration,size,format_name",
    "-of",
    "json",
    file,
  ]);
  if (probed.status !== 0) return null;
  return parseFfprobeJson(probed.stdout || "");
}

function measureLoudness(file: string): LoudnormMeasurement | null {
  const analyzed = run(resolveBinary("ffmpeg"), buildLoudnormAnalyzeArgs(file));
  return parseLoudnormJson(`${analyzed.stderr || ""}\n${analyzed.stdout || ""}`);
}

function generateSource(spec: LoudnessFixtureSpec, dest: string): boolean {
  const ffmpeg = resolveBinary("ffmpeg");
  if (!spec.hasAudio) {
    const generated = run(ffmpeg, [
      "-y",
      ...spec.extraInputArgs,
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      dest,
    ]);
    return generated.status === 0 && existsSync(dest);
  }

  const generated = run(ffmpeg, [
    "-y",
    ...spec.extraInputArgs,
    "-f",
    "lavfi",
    "-i",
    "color=c=0x16213e:s=640x360:d=4:r=24",
    "-map",
    "1:v:0",
    "-map",
    "0:a:0",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    "-movflags",
    "+faststart",
    dest,
  ]);
  return generated.status === 0 && existsSync(dest);
}

function preNormalize(file: string): boolean {
  const tmp = `${file}.prenorm.mp4`;
  const result = run(resolveBinary("ffmpeg"), [
    "-y",
    "-i",
    file,
    "-c:v",
    "copy",
    "-af",
    `loudnorm=I=${UGC_TARGET_LUFS}:TP=${UGC_TRUE_PEAK_LIMIT_DBTP}:LRA=11`,
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    tmp,
  ]);
  if (result.status !== 0 || !existsSync(tmp)) return false;
  const swapped = run(resolveBinary("ffmpeg"), ["-y", "-i", tmp, "-c", "copy", file]);
  return swapped.status === 0 && existsSync(file);
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export async function runUgcAudioLoudnessBenchmark(workDir?: string): Promise<{
  targetLufs: number;
  truePeakLimit: number;
  rows: LoudnessFixtureRow[];
  inputMedian: number | null;
  outputMedian: number | null;
  inputRange: [number, number] | null;
  outputRange: [number, number] | null;
  candidateTargetLufs: number;
  candidateOutputMedian: number | null;
  candidateOutputRange: [number, number] | null;
  ffmpegAvailable: boolean;
}> {
  const ffmpeg = resolveBinary("ffmpeg");
  const version = run(ffmpeg, ["-version"], 10_000);
  if (version.status !== 0 && version.error) {
    return {
      targetLufs: UGC_TARGET_LUFS,
      truePeakLimit: UGC_TRUE_PEAK_LIMIT_DBTP,
      rows: [],
      inputMedian: null,
      outputMedian: null,
      inputRange: null,
      outputRange: null,
      candidateTargetLufs: -14,
      candidateOutputMedian: null,
      candidateOutputRange: null,
      ffmpegAvailable: false,
    };
  }

  const dir = workDir ?? join(tmpdir(), `umtuba-ugc-loudness-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const rows: LoudnessFixtureRow[] = [];

  for (const spec of FIXTURES) {
    const input = join(dir, `${spec.id}-src.mp4`);
    const output = join(dir, `${spec.id}-out.mp4`);
    const generated = generateSource(spec, input);
    if (generated && spec.id === "already-normalized") {
      preNormalize(input);
    }
    if (!generated) {
      rows.push({
        id: spec.id,
        label: spec.label,
        hasAudio: spec.hasAudio,
        inputIntegratedLufs: null,
        inputTruePeak: null,
        outputIntegratedLufs: null,
        outputTruePeak: null,
        plan: "failed",
        capped: false,
        playbackValid: false,
        clipping: false,
      });
      continue;
    }

    const inputProbe = probeFile(input);
    const inputLoud = spec.hasAudio ? measureLoudness(input) : null;
    const plan = decideLoudnessPlan(
      Boolean(spec.hasAudio && inputProbe?.hasAudio),
      inputLoud,
      UGC_TARGET_LUFS
    );
    const encodeArgs = buildUgcFfmpegArgs({
      inputPath: input,
      outputPath: output,
      width: 640,
      height: 360,
      fps: 24,
      hasAudio: Boolean(spec.hasAudio && inputProbe?.hasAudio),
      audioFilter: plan.apply ? plan.filter : null,
    });
    const encoded = run(ffmpeg, encodeArgs);
    const outputProbe = existsSync(output) ? probeFile(output) : null;
    const outputLoud =
      spec.hasAudio && existsSync(output) ? measureLoudness(output) : null;
    const playbackValid = Boolean(
      encoded.status === 0 &&
        outputProbe?.hasVideo &&
        (spec.hasAudio ? outputProbe.hasAudio : !outputProbe.hasAudio)
    );
    const outputTp = outputLoud?.inputTp ?? null;
    rows.push({
      id: spec.id,
      label: spec.label,
      hasAudio: spec.hasAudio,
      inputIntegratedLufs: inputLoud?.inputI ?? null,
      inputTruePeak: inputLoud?.inputTp ?? null,
      outputIntegratedLufs: outputLoud?.inputI ?? null,
      outputTruePeak: outputTp,
      plan: !spec.hasAudio
        ? "skipped_no_audio"
        : !plan.apply
          ? "skipped_near_silence"
          : encoded.status === 0
            ? "applied"
            : "failed",
      capped: plan.apply ? plan.capped : false,
      playbackValid,
      clipping: typeof outputTp === "number" && outputTp > 0,
    });
  }

  const inputs = rows
    .filter((row) => row.hasAudio && row.inputIntegratedLufs != null)
    .map((row) => row.inputIntegratedLufs as number);
  const outputs = rows
    .filter((row) => row.plan === "applied" && row.outputIntegratedLufs != null)
    .map((row) => row.outputIntegratedLufs as number);

  const candidateTarget = -14;
  const candidateOutputs: number[] = [];
  for (const spec of FIXTURES) {
    if (!spec.hasAudio) continue;
    const input = join(dir, `${spec.id}-src.mp4`);
    if (!existsSync(input)) continue;
    const inputLoud = measureLoudness(input);
    const plan = decideLoudnessPlan(true, inputLoud, candidateTarget);
    if (!plan.apply) continue;
    const candidateOut = join(dir, `${spec.id}-out-14.mp4`);
    const encoded = run(
      ffmpeg,
      buildUgcFfmpegArgs({
        inputPath: input,
        outputPath: candidateOut,
        width: 640,
        height: 360,
        fps: 24,
        hasAudio: true,
        audioFilter: plan.filter,
      })
    );
    if (encoded.status !== 0 || !existsSync(candidateOut)) continue;
    const measured = measureLoudness(candidateOut);
    if (measured?.inputI != null) candidateOutputs.push(measured.inputI);
  }

  return {
    targetLufs: UGC_TARGET_LUFS,
    truePeakLimit: UGC_TRUE_PEAK_LIMIT_DBTP,
    rows,
    inputMedian: median(inputs),
    outputMedian: median(outputs),
    inputRange: inputs.length ? [Math.min(...inputs), Math.max(...inputs)] : null,
    outputRange: outputs.length ? [Math.min(...outputs), Math.max(...outputs)] : null,
    candidateTargetLufs: candidateTarget,
    candidateOutputMedian: median(candidateOutputs),
    candidateOutputRange: candidateOutputs.length
      ? [Math.min(...candidateOutputs), Math.max(...candidateOutputs)]
      : null,
    ffmpegAvailable: true,
  };
}

async function main() {
  const result = await runUgcAudioLoudnessBenchmark();
  const outFile = join(tmpdir(), "ugc-audio-loudness-benchmark.json");
  writeFileSync(outFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  console.log(`wrote ${outFile}`);
}

const isDirect =
  typeof process.argv[1] === "string" &&
  /ugcAudioLoudnessBenchmark\.(ts|js)$/.test(process.argv[1].replace(/\\/g, "/"));

if (isDirect) {
  main().catch((error) => {
    console.error("[ugc-loudness-benchmark] fatal", error);
    process.exitCode = 1;
  });
}
