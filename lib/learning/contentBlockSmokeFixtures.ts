/**
 * Learning Production Smoke — content-block fixtures for renderer coverage.
 * Pure data only; no DB / network.
 */

import {
  LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES,
  type LearningLessonContentBlock,
  type LearningLessonContentBlockCreatableType,
} from "./lessonContentBlocksFoundation";

const BASE = {
  lesson_id: "e2e60803-0001-4000-8000-0000000000l1",
  position: 1,
  created_by: "e2e60803-0001-4000-8000-0000000000u1",
  updated_by: null as string | null,
  created_at: "2026-08-03T00:00:00.000Z",
  updated_at: "2026-08-03T00:00:00.000Z",
  published_at: "2026-08-03T00:00:00.000Z",
  suspended_at: null as string | null,
  archived_at: null as string | null,
};

function block(
  idSuffix: string,
  block_type: LearningLessonContentBlock["block_type"],
  content: Record<string, unknown>,
  status: LearningLessonContentBlock["status"] = "published"
): LearningLessonContentBlock {
  return {
    ...BASE,
    id: `e2e60803-0001-4000-8000-00000000${idSuffix}`,
    block_type,
    status,
    content,
  };
}

/** One valid published fixture per creatable block type. */
export const CREATABLE_BLOCK_FIXTURES: Record<
  LearningLessonContentBlockCreatableType,
  LearningLessonContentBlock
> = {
  rich_text: block("b01", "rich_text", {
    text: "Hello learner <script>alert(1)</script>",
    format: "plain",
  }),
  heading: block("b02", "heading", { text: "Section title", level: 2 }),
  image: block("b03", "image", {
    url: "https://cdn.example.com/lesson.png",
    alt: "Diagram",
    caption: "Caption",
  }),
  video: block("b04", "video", {
    url: "https://cdn.example.com/lesson.mp4",
    provider: "file",
    caption: "Clip",
  }),
  audio: block("b05", "audio", {
    url: "https://cdn.example.com/lesson.mp3",
    caption: "Audio",
  }),
  quote: block("b06", "quote", {
    text: "Stay curious.",
    attribution: "Instructor",
  }),
  divider: block("b07", "divider", { style: "solid" }),
  callout: block("b08", "callout", {
    text: "Important tip",
    variant: "tip",
  }),
  external_link: block("b09", "external_link", {
    url: "https://docs.example.com/guide",
    label: "Guide",
    description: "External docs",
  }),
  code_block: block("b10", "code_block", {
    code: "const x = 1;",
    language: "ts",
  }),
  transcript: block("b11", "transcript", {
    text: "Spoken lesson transcript…",
    language: "en",
  }),
  pdf: block("b12", "pdf", {
    url: "https://cdn.example.com/handout.pdf",
    title: "Handout",
  }),
  downloadable_file: block("b13", "downloadable_file", {
    url: "https://cdn.example.com/worksheet.zip",
    title: "Worksheet",
    filename: "worksheet.zip",
  }),
};

export const ALL_CREATABLE_TYPES = [
  ...LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES,
] as LearningLessonContentBlockCreatableType[];

/** Unsafe / unsupported payloads — renderer must return null (no crash). */
export const FALLBACK_BLOCK_FIXTURES: Array<{
  name: string;
  block: LearningLessonContentBlock;
}> = [
  {
    name: "draft_hidden",
    block: block("f01", "rich_text", { text: "draft" }, "draft"),
  },
  {
    name: "reserved_ai_block",
    block: block("f02", "ai_block", { prompt: "x" }),
  },
  {
    name: "reserved_interactive",
    block: block("f03", "interactive_block", { widget: "x" }),
  },
  {
    name: "unknown_type",
    block: {
      ...block("f04", "rich_text", { text: "x" }),
      block_type: "gallery" as LearningLessonContentBlock["block_type"],
    },
  },
  {
    name: "image_javascript_url",
    block: block("f05", "image", {
      url: "javascript:alert(1)",
      alt: "bad",
    }),
  },
  {
    name: "video_data_url",
    block: block("f06", "video", {
      url: "data:text/html,hi",
      provider: "url",
    }),
  },
  {
    name: "external_link_relative",
    block: block("f07", "external_link", {
      url: "/internal/path",
      label: "rel",
    }),
  },
  {
    name: "pdf_empty_url",
    block: block("f08", "pdf", { url: "", title: "Empty" }),
  },
];
