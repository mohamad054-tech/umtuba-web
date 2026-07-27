/**
 * Shared Teaser Template Engine (Unified Content Foundation V1).
 * Extracted from article teaser logic — extensible by template kind.
 */

export const TEASER_DURATION_MS = 5000;
export const TEASER_WIDTH = 1080;
export const TEASER_HEIGHT = 1920;
export const TEASER_ASPECT_RATIO = "9:16" as const;

export const TEASER_TEMPLATE_KINDS = ["article"] as const;
export type TeaserTemplateKind = (typeof TEASER_TEMPLATE_KINDS)[number];

export const TEASER_BACKGROUND_MODES = [
  "gradient",
  "article_image",
  "uploaded_image",
  "plain",
] as const;
export type TeaserBackgroundMode = (typeof TEASER_BACKGROUND_MODES)[number];

export const TEASER_GRADIENT_TEMPLATES = [
  "midnight",
  "aurora",
  "ember",
] as const;
export type TeaserGradientTemplate = (typeof TEASER_GRADIENT_TEMPLATES)[number];

export const TEASER_AUDIO_MODES = ["silent"] as const;
export type TeaserAudioMode = (typeof TEASER_AUDIO_MODES)[number];

export type TeaserTemplateContract = {
  kind: TeaserTemplateKind;
  durationMs: number;
  width: number;
  height: number;
  aspectRatio: typeof TEASER_ASPECT_RATIO;
  audioMode: TeaserAudioMode;
  backgroundMode: TeaserBackgroundMode;
  backgroundAssetPath?: string | null;
  title: string;
  creatorHandle: string;
  cta: string;
};

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

export function detectTeaserTextDirection(title: string): "rtl" | "ltr" {
  return ARABIC_RE.test(title) ? "rtl" : "ltr";
}

export function defaultCtaForTemplate(
  kind: TeaserTemplateKind,
  title: string
): string {
  const rtl = detectTeaserTextDirection(title) === "rtl";
  if (kind === "article") {
    return rtl ? "اقرأ المقالة كاملة" : "Read full article";
  }
  return rtl ? "اعرف المزيد" : "Learn more";
}

export function resolveGradientTemplate(
  path: string | null | undefined
): TeaserGradientTemplate {
  const raw = (path ?? "").trim();
  const key = raw.startsWith("template:") ? raw.slice("template:".length) : raw;
  if ((TEASER_GRADIENT_TEMPLATES as readonly string[]).includes(key)) {
    return key as TeaserGradientTemplate;
  }
  return "midnight";
}

export function gradientTemplatePath(
  template: TeaserGradientTemplate = "midnight"
): string {
  return `template:${template}`;
}

export function gradientBaseColor(template: TeaserGradientTemplate): string {
  switch (template) {
    case "aurora":
      return "0x071A2A";
    case "ember":
      return "0x1A0B0B";
    case "midnight":
    default:
      return "0x050510";
  }
}

export function layoutTeaserTitle(
  title: string,
  options?: { maxCharsPerLine?: number; maxLines?: number }
): {
  lines: string[];
  fontSize: number;
  direction: "rtl" | "ltr";
} {
  const direction = detectTeaserTextDirection(title);
  const cleaned = title.replace(/\s+/g, " ").trim() || "Untitled";
  const maxLines = options?.maxLines ?? 4;
  const maxChars =
    options?.maxCharsPerLine ?? (direction === "rtl" ? 18 : 22);

  let fontSize = 72;
  if (cleaned.length > 40) fontSize = 60;
  if (cleaned.length > 70) fontSize = 52;
  if (cleaned.length > 100) fontSize = 44;
  if (cleaned.length > 140) fontSize = 38;

  const words = cleaned.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines - 1) break;
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1] ?? "";
    lines[maxLines - 1] =
      last.length > 3 ? `${last.slice(0, Math.max(3, maxChars - 1))}…` : `${last}…`;
  }

  const totalChars = lines.join("").length;
  if (totalChars > 80 && fontSize > 40) fontSize -= 8;

  return {
    lines: lines.length > 0 ? lines : [cleaned.slice(0, maxChars)],
    fontSize,
    direction,
  };
}

export function escapeDrawtext(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "%%");
}

export function buildTeaserTemplateContract(input: {
  kind?: TeaserTemplateKind;
  title: string;
  creatorHandle: string;
  backgroundMode?: TeaserBackgroundMode;
  backgroundAssetPath?: string | null;
  cta?: string;
}): TeaserTemplateContract {
  const kind = input.kind ?? "article";
  return {
    kind,
    durationMs: TEASER_DURATION_MS,
    width: TEASER_WIDTH,
    height: TEASER_HEIGHT,
    aspectRatio: TEASER_ASPECT_RATIO,
    audioMode: "silent",
    backgroundMode: input.backgroundMode ?? "gradient",
    backgroundAssetPath: input.backgroundAssetPath ?? gradientTemplatePath(),
    title: input.title,
    creatorHandle: input.creatorHandle.replace(/^@/, ""),
    cta: input.cta ?? defaultCtaForTemplate(kind, input.title),
  };
}

export type BuildTeaserFfmpegArgsInput = {
  template: TeaserTemplateContract;
  outputPath: string;
  fontFile: string;
  backgroundImageFile?: string | null;
};

/**
 * Kind-aware FFmpeg args. Adding a new template kind should extend
 * `defaultCtaForTemplate` / contract builder — not rewrite the worker loop.
 */
export function buildTeaserFfmpegArgsFromTemplate(
  input: BuildTeaserFfmpegArgsInput
): string[] {
  const t = input.template;
  const durationSec = t.durationMs / 1000;
  const layout = layoutTeaserTitle(t.title);
  const font = escapeDrawtext(input.fontFile.replace(/\\/g, "/"));
  const author = t.creatorHandle.replace(/^@/, "");

  const titleFilters = layout.lines.map((line, index) => {
    const y = 720 + index * Math.round(layout.fontSize * 1.25);
    return `drawtext=fontfile='${font}':text='${escapeDrawtext(line)}':fontsize=${layout.fontSize}:fontcolor=white:borderw=2:bordercolor=black@0.35:x=(w-text_w)/2:y=${y}`;
  });

  const authorY =
    720 + layout.lines.length * Math.round(layout.fontSize * 1.25) + 36;
  const ctaY = authorY + 56;
  const overlays = [
    ...titleFilters,
    `drawtext=fontfile='${font}':text='${escapeDrawtext("@" + author)}':fontsize=28:fontcolor=white@0.55:x=(w-text_w)/2:y=${authorY}`,
    `drawtext=fontfile='${font}':text='${escapeDrawtext(t.cta)}':fontsize=26:fontcolor=white@0.7:x=(w-text_w)/2:y=${ctaY}`,
  ].join(",");

  const motion = `scale=${t.width * 1.04}:${t.height * 1.04},crop=${t.width}:${t.height}:(in_w-out_w)/2+(in_w-out_w)/2*0.02*sin(2*PI*t/${durationSec}):(in_h-out_h)/2`;

  const args: string[] = ["-y", "-hide_banner", "-loglevel", "error"];

  if (
    (t.backgroundMode === "uploaded_image" ||
      t.backgroundMode === "article_image") &&
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
      `color=c=black@0.35:s=${t.width}x${t.height}:d=${durationSec}`,
      "-filter_complex",
      `[0:v]${motion},format=yuv420p[bg];[1:v]format=yuv420p[dim];[bg][dim]overlay=0:0,${overlays}[v]`,
      "-map",
      "[v]"
    );
  } else {
    const template = resolveGradientTemplate(t.backgroundAssetPath);
    const color =
      t.backgroundMode === "plain" ? "0x0A0A12" : gradientBaseColor(template);
    args.push(
      "-f",
      "lavfi",
      "-i",
      `color=c=${color}:s=${t.width}x${t.height}:d=${durationSec}`,
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
    "-an",
    "-movflags",
    "+faststart",
    input.outputPath
  );

  return args;
}
