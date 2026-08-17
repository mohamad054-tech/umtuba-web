import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildLoudnormAnalyzeArgs,
  buildLoudnormAnalyzeFilter,
  buildLoudnormApplyFilter,
  decideLoudnessPlan,
  extractLoudnormJson,
  outputTruePeakClipped,
  parseLoudnormJson,
  UGC_LOUDNESS_MAX_GAIN_DB,
  UGC_LOUDNESS_SKIP_BELOW_LUFS,
  UGC_LOUDNORM_FILTER,
  UGC_TARGET_LUFS,
  UGC_TRUE_PEAK_LIMIT_DBTP,
} from "./ugcAudioLoudness";
import { buildUgcFfmpegArgs } from "./ugcVideoPolicy";

const ROOT = join(__dirname, "../../..");

function measurement(overrides: Partial<{
  inputI: number;
  inputTp: number;
  inputLra: number;
  inputThresh: number;
  outputI: number | null;
  outputTp: number | null;
  outputLra: number | null;
  targetOffset: number | null;
  normalizationType: string | null;
}> = {}) {
  return {
    inputI: -24,
    inputTp: -2.1,
    inputLra: 6.4,
    inputThresh: -34.2,
    outputI: -16.1,
    outputTp: -1.4,
    outputLra: 6.4,
    targetOffset: 0.1,
    normalizationType: "dynamic",
    ...overrides,
  };
}

describe("UGC loudness policy", () => {
  it("locks a measured social target, not an aggressive broadcast slam", () => {
    expect(UGC_TARGET_LUFS).toBe(-16);
    expect(UGC_TARGET_LUFS).toBeGreaterThanOrEqual(-16);
    expect(UGC_TARGET_LUFS).toBeLessThanOrEqual(-14);
    expect(UGC_TRUE_PEAK_LIMIT_DBTP).toBe(-1);
    expect(UGC_LOUDNESS_MAX_GAIN_DB).toBe(12);
    expect(UGC_LOUDNESS_SKIP_BELOW_LUFS).toBe(-40);
  });

  it("parses loudnorm JSON from noisy FFmpeg stderr", () => {
    const stderr = [
      "[Parsed_loudnorm_0 @ 0x1] ",
      "{",
      '\t"input_i" : "-23.45",',
      '\t"input_tp" : "-2.34",',
      '\t"input_lra" : "5.23",',
      '\t"input_thresh" : "-33.56",',
      '\t"output_i" : "-16.02",',
      '\t"output_tp" : "-1.51",',
      '\t"output_lra" : "5.23",',
      '\t"output_thresh" : "-26.12",',
      '\t"normalization_type" : "dynamic",',
      '\t"target_offset" : "0.02"',
      "}",
    ].join("\n");
    expect(extractLoudnormJson(stderr)).toContain("input_i");
    expect(parseLoudnormJson(stderr)).toMatchObject({
      inputI: -23.45,
      inputTp: -2.34,
      inputLra: 5.23,
      inputThresh: -33.56,
      outputI: -16.02,
      outputTp: -1.51,
    });
  });

  it("treats -inf / missing JSON as unusable", () => {
    expect(parseLoudnormJson("no json here")).toBeNull();
    expect(
      parseLoudnormJson(
        JSON.stringify({
          input_i: "-inf",
          input_tp: "-1.0",
          input_lra: "1.0",
          input_thresh: "-70.0",
        })
      )
    ).toBeNull();
  });

  it("skips loudnorm for no audio and near-silence", () => {
    expect(decideLoudnessPlan(false, measurement()).apply).toBe(false);
    expect(decideLoudnessPlan(false, measurement())).toMatchObject({
      reason: "no_audio",
    });
    expect(decideLoudnessPlan(true, null)).toMatchObject({
      apply: false,
      reason: "near_silence",
    });
    expect(
      decideLoudnessPlan(true, measurement({ inputI: -52 }))
    ).toMatchObject({ apply: false, reason: "near_silence" });
  });

  it("caps gain on quiet/noisy beds instead of slamming to target", () => {
    const plan = decideLoudnessPlan(true, measurement({ inputI: -34 }));
    expect(plan.apply).toBe(true);
    if (!plan.apply) return;
    expect(plan.capped).toBe(true);
    expect(plan.effectiveTargetLufs).toBe(-22);
    expect(plan.filter).toContain("I=-22.00");
    expect(plan.filter).toContain("measured_I=-34.00");
  });

  it("applies two-pass measured values for normal and loud sources", () => {
    const speech = decideLoudnessPlan(true, measurement({ inputI: -24 }));
    expect(speech.apply).toBe(true);
    if (!speech.apply) return;
    expect(speech.capped).toBe(false);
    expect(speech.effectiveTargetLufs).toBe(UGC_TARGET_LUFS);
    expect(speech.filter).toContain(`${UGC_LOUDNORM_FILTER}=I=-16.00`);
    expect(speech.filter).toContain("TP=-1.00");
    expect(speech.filter).toContain("measured_I=-24.00");
    expect(speech.filter).toContain("linear=true");
    expect(speech.filter).toContain("dual_mono=true");

    const loud = decideLoudnessPlan(true, measurement({ inputI: -8, inputTp: 0.4 }));
    expect(loud.apply).toBe(true);
    if (!loud.apply) return;
    expect(loud.filter).toContain("measured_I=-8.00");
    expect(loud.filter).toContain("measured_TP=0.40");
  });

  it("builds an analyze command that never writes a media file", () => {
    const args = buildLoudnormAnalyzeArgs("in.mp4");
    expect(args.join(" ")).toContain(buildLoudnormAnalyzeFilter());
    expect(args).toContain("-vn");
    expect(args.join(" ")).toContain("print_format=json");
    expect(args).toContain("null");
    expect(args.join(" ")).not.toMatch(/\.mp4$/);
  });

  it("flags only true-peak values above 0 dBTP as clipping", () => {
    expect(outputTruePeakClipped(-1.2)).toBe(false);
    expect(outputTruePeakClipped(-0.1)).toBe(false);
    expect(outputTruePeakClipped(0)).toBe(false);
    expect(outputTruePeakClipped(0.2)).toBe(true);
    expect(outputTruePeakClipped(null)).toBe(false);
  });

  it("attaches loudnorm only when the encode has audio", () => {
    const withAudio = buildUgcFfmpegArgs({
      inputPath: "in.mp4",
      outputPath: "out.mp4",
      hasAudio: true,
      audioFilter: buildLoudnormApplyFilter(measurement()),
    });
    expect(withAudio).toContain("-af");
    expect(withAudio.join(" ")).toContain("loudnorm=");
    const silent = buildUgcFfmpegArgs({
      inputPath: "in.mp4",
      outputPath: "out.mp4",
      hasAudio: false,
      audioFilter: "loudnorm=I=-16",
    });
    expect(silent).toContain("-an");
    expect(silent).not.toContain("-af");
  });

  it("keeps the worker on two-pass loudnorm and does not touch mobile", () => {
    const processor = readFileSync(
      join(ROOT, "lib/media/processing/processors/ugcVideoProcessor.ts"),
      "utf8"
    );
    const loudness = readFileSync(join(ROOT, "lib/media/ugc/ugcAudioLoudness.ts"), "utf8");
    expect(processor).toMatch(/analyzeUgcLoudness/);
    expect(processor).toMatch(/output_audio_clipping/);
    expect(processor).toMatch(/!loudnessApplied/);
    expect(loudness).toMatch(/loudnorm_analyze_failed/);
    expect(loudness).toMatch(/measured_I/);
    const apply = buildLoudnormApplyFilter(measurement());
    expect(apply).toContain("measured_I=");
    expect(apply).toContain("measured_TP=");
    expect(apply).toContain("measured_LRA=");
    expect(apply).toContain("measured_thresh=");
  });
});
