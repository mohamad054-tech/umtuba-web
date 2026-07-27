/**
 * Article teaser FFmpeg builder — thin wrapper over shared Teaser Template Engine.
 */

import {
  buildTeaserFfmpegArgsFromTemplate,
  buildTeaserTemplateContract,
  type TeaserBackgroundMode,
} from "../content/teaser/teaserTemplateEngine";

export type BuildTeaserFfmpegArgsInput = {
  title: string;
  authorLabel: string;
  outputPath: string;
  fontFile: string;
  backgroundMode: TeaserBackgroundMode;
  backgroundAssetPath?: string | null;
  backgroundImageFile?: string | null;
};

export function buildTeaserFfmpegArgs(
  input: BuildTeaserFfmpegArgsInput
): string[] {
  const template = buildTeaserTemplateContract({
    kind: "article",
    title: input.title,
    creatorHandle: input.authorLabel,
    backgroundMode: input.backgroundMode,
    backgroundAssetPath: input.backgroundAssetPath,
  });
  return buildTeaserFfmpegArgsFromTemplate({
    template,
    outputPath: input.outputPath,
    fontFile: input.fontFile,
    backgroundImageFile: input.backgroundImageFile,
  });
}
