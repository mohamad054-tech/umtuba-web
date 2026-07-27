/**
 * FFmpeg argument builder for Article Auto-Teaser Video V1 (pure / testable).
 * Produces a silent 5s H.264 MP4. Does not invoke FFmpeg.
 */

import {
  ARTICLE_TEASER_DURATION_MS,
  ARTICLE_TEASER_HEIGHT,
  ARTICLE_TEASER_WIDTH,
  gradientBaseColor,
  resolveGradientTemplate,
  type TeaserBackgroundMode,
} from "./articleTeaserFoundation";
import {
  escapeDrawtext,
  layoutTeaserTitle,
  teaserCtaForTitle,
} from "./articleTeaserTitleLayout";

export type BuildTeaserFfmpegArgsInput = {
  title: string;
  authorLabel: string;
  outputPath: string;
  fontFile: string;
  backgroundMode: TeaserBackgroundMode;
  backgroundAssetPath?: string | null;
  /** Local path to background image when mode is uploaded_image / article_image */
  backgroundImageFile?: string | null;
};

export function buildTeaserFfmpegArgs(
  input: BuildTeaserFfmpegArgsInput
): string[] {
  const durationSec = ARTICLE_TEASER_DURATION_MS / 1000;
  const layout = layoutTeaserTitle(input.title);
  const cta = teaserCtaForTitle(input.title);
  const author = input.authorLabel.replace(/^@/, "");
  const font = escapeDrawtext(input.fontFile.replace(/\\/g, "/"));

  const titleFilters = layout.lines.map((line, index) => {
    const y = 720 + index * Math.round(layout.fontSize * 1.25);
    return `drawtext=fontfile='${font}':text='${escapeDrawtext(line)}':fontsize=${layout.fontSize}:fontcolor=white:borderw=2:bordercolor=black@0.35:x=(w-text_w)/2:y=${y}`;
  });

  const authorY = 720 + layout.lines.length * Math.round(layout.fontSize * 1.25) + 36;
  const ctaY = authorY + 56;
  const overlays = [
    ...titleFilters,
    `drawtext=fontfile='${font}':text='${escapeDrawtext("@" + author)}':fontsize=28:fontcolor=white@0.55:x=(w-text_w)/2:y=${authorY}`,
    `drawtext=fontfile='${font}':text='${escapeDrawtext(cta)}':fontsize=26:fontcolor=white@0.7:x=(w-text_w)/2:y=${ctaY}`,
  ].join(",");

  // Subtle zoom for presence (soft motion)
  const motion = `scale=${ARTICLE_TEASER_WIDTH * 1.04}:${ARTICLE_TEASER_HEIGHT * 1.04},crop=${ARTICLE_TEASER_WIDTH}:${ARTICLE_TEASER_HEIGHT}:(in_w-out_w)/2+(in_w-out_w)/2*0.02*sin(2*PI*t/5):(in_h-out_h)/2`;

  const args: string[] = ["-y", "-hide_banner", "-loglevel", "error"];

  if (
    (input.backgroundMode === "uploaded_image" ||
      input.backgroundMode === "article_image") &&
    input.backgroundImageFile
  ) {
    const img = input.backgroundImageFile.replace(/\\/g, "/");
    args.push(
      "-loop",
      "1",
      "-i",
      img,
      "-f",
      "lavfi",
      "-i",
      `color=c=black@0.35:s=${ARTICLE_TEASER_WIDTH}x${ARTICLE_TEASER_HEIGHT}:d=${durationSec}`,
      "-filter_complex",
      `[0:v]${motion},format=yuv420p[bg];[1:v]format=yuv420p[dim];[bg][dim]overlay=0:0,${overlays}[v]`,
      "-map",
      "[v]"
    );
  } else {
    const template = resolveGradientTemplate(input.backgroundAssetPath);
    const color =
      input.backgroundMode === "plain"
        ? "0x0A0A12"
        : gradientBaseColor(template);
    args.push(
      "-f",
      "lavfi",
      "-i",
      `color=c=${color}:s=${ARTICLE_TEASER_WIDTH}x${ARTICLE_TEASER_HEIGHT}:d=${durationSec}`,
      "-vf",
      `${motion},${overlays},format=yuv420p`
    );
  }

  args.push(
    "-t",
    String(durationSec),
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-an", // silent V1 — no audio track
    "-movflags",
    "+faststart",
    input.outputPath
  );

  return args;
}
