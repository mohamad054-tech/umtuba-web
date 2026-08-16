/**
 * Generate SAFE synthetic fixtures and measure UGC encode savings.
 * Does not use real user UGC. Requires ffmpeg + ffprobe on PATH or FFMPEG_PATH.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildUgcFfmpegArgs, computeOutputSize } from "../../lib/media/ugc/ugcVideoPolicy";
import { parseFfprobeJson } from "../../lib/media/ugc/ugcVideoProbe";

export type FixtureSpec = {
  id: string;
  label: string;
  kind: "portrait" | "landscape";
  motion: "low" | "high";
  width: number;
  height: number;
  seconds: number;
  extraInputArgs: string[];
};

export type FixtureMeasurement = {
  id: string;
  label: string;
  inputSize: number;
  outputSize: number;
  savingPercent: number | null;
  inputResolution: string;
  outputResolution: string;
  durationSec: number;
  encodeTimeMs: number;
  playbackValid: boolean;
  visualQa: string;
};

const FIXTURES: FixtureSpec[] = [
  {
    id: "portrait-low",
    label: "portrait low-motion",
    kind: "portrait",
    motion: "low",
    width: 1080,
    height: 1920,
    seconds: 3,
    extraInputArgs: ["-f", "lavfi", "-i", "color=c=0x1a1a2e:s=1080x1920:d=3:r=30"],
  },
  {
    id: "landscape-low",
    label: "landscape low-motion",
    kind: "landscape",
    motion: "low",
    width: 1920,
    height: 1080,
    seconds: 3,
    extraInputArgs: ["-f", "lavfi", "-i", "color=c=0x16213e:s=1920x1080:d=3:r=30"],
  },
  {
    id: "portrait-high",
    label: "portrait high-motion",
    kind: "portrait",
    motion: "high",
    width: 1080,
    height: 1920,
    seconds: 3,
    extraInputArgs: ["-f", "lavfi", "-i", "testsrc2=s=1080x1920:d=3:r=30"],
  },
  {
    id: "landscape-high",
    label: "landscape high-motion",
    kind: "landscape",
    motion: "high",
    width: 1920,
    height: 1080,
    seconds: 3,
    extraInputArgs: ["-f", "lavfi", "-i", "testsrc2=s=1920x1080:d=3:r=30"],
  },
  {
    id: "phone-compressed",
    label: "already-compressed phone-like",
    kind: "portrait",
    motion: "low",
    width: 720,
    height: 1280,
    seconds: 3,
    extraInputArgs: [
      "-f",
      "lavfi",
      "-i",
      "testsrc=s=720x1280:d=3:r=30",
    ],
  },
  {
    id: "phone-hires",
    label: "high-resolution phone-like",
    kind: "portrait",
    motion: "high",
    width: 2160,
    height: 3840,
    seconds: 2,
    extraInputArgs: ["-f", "lavfi", "-i", "testsrc2=s=2160x3840:d=2:r=30"],
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

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export async function runUgcVideoBenchmark(workDir?: string): Promise<{
  measurements: FixtureMeasurement[];
  medianStorageSaving: number | null;
  ffmpegAvailable: boolean;
}> {
  const ffmpeg = resolveBinary("ffmpeg");
  const version = run(ffmpeg, ["-version"], 10_000);
  if (version.status !== 0 && version.error) {
    return { measurements: [], medianStorageSaving: null, ffmpegAvailable: false };
  }

  const dir = workDir ?? join(tmpdir(), `umtuba-ugc-bench-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const measurements: FixtureMeasurement[] = [];

  for (const spec of FIXTURES) {
    const input = join(dir, `${spec.id}-src.mp4`);
    const output = join(dir, `${spec.id}-out.mp4`);
    const inputArgs =
      spec.id === "phone-compressed"
        ? [
            ...spec.extraInputArgs,
            "-an",
            "-c:v",
            "libx264",
            "-crf",
            "28",
            "-preset",
            "veryfast",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            input,
          ]
        : [
            ...spec.extraInputArgs,
            "-f",
            "lavfi",
            "-i",
            `sine=frequency=440:duration=${spec.seconds}`,
            "-c:v",
            "libx264",
            "-crf",
            spec.motion === "high" ? "14" : "16",
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
            input,
          ];

    const generated = run(ffmpeg, ["-y", ...inputArgs]);
    if (generated.status !== 0 || !existsSync(input)) {
      measurements.push({
        id: spec.id,
        label: spec.label,
        inputSize: 0,
        outputSize: 0,
        savingPercent: null,
        inputResolution: `${spec.width}x${spec.height}`,
        outputResolution: "n/a",
        durationSec: spec.seconds,
        encodeTimeMs: 0,
        playbackValid: false,
        visualQa: "GENERATE_FAILED",
      });
      continue;
    }

    const inputProbe = probeFile(input);
    const encodeArgs = buildUgcFfmpegArgs({
      inputPath: input,
      outputPath: output,
      width: spec.width,
      height: spec.height,
      fps: 30,
      hasAudio: spec.id !== "phone-compressed",
    });
    const started = Date.now();
    const encoded = run(ffmpeg, encodeArgs);
    const encodeTimeMs = Date.now() - started;
    const outputProbe = existsSync(output) ? probeFile(output) : null;
    const inputSize = statSync(input).size;
    const outputSize = existsSync(output) ? statSync(output).size : 0;
    const expected = computeOutputSize(spec.width, spec.height);
    const playbackValid = Boolean(
      encoded.status === 0 &&
        outputProbe?.hasVideo &&
        (spec.id === "phone-compressed" || outputProbe.hasAudio)
    );
    measurements.push({
      id: spec.id,
      label: spec.label,
      inputSize,
      outputSize,
      savingPercent:
        inputSize > 0 ? Number((((inputSize - outputSize) / inputSize) * 100).toFixed(1)) : null,
      inputResolution: `${inputProbe?.width ?? spec.width}x${inputProbe?.height ?? spec.height}`,
      outputResolution: `${outputProbe?.width ?? expected.width}x${outputProbe?.height ?? expected.height}`,
      durationSec: spec.seconds,
      encodeTimeMs,
      playbackValid,
      visualQa: "FFPROBE_SANITY_ONLY",
    });
  }

  const savings = measurements
    .map((row) => row.savingPercent)
    .filter((value): value is number => value != null);
  return {
    measurements,
    medianStorageSaving: median(savings),
    ffmpegAvailable: true,
  };
}

async function main() {
  const result = await runUgcVideoBenchmark();
  const outFile = join(tmpdir(), "ugc-video-benchmark.json");
  writeFileSync(outFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  console.log(`wrote ${outFile}`);
}

const isDirect =
  typeof process.argv[1] === "string" &&
  /ugcVideoBenchmark\.(ts|js)$/.test(process.argv[1].replace(/\\/g, "/"));

if (isDirect) {
  main().catch((error) => {
    console.error("[ugc-benchmark] fatal", error);
    process.exitCode = 1;
  });
}
