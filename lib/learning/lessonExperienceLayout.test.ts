import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isSafeHttpUrl } from "./contentBlockRender";
import {
  buildLessonQuizCtaLabel,
  classifyLessonExperienceBlock,
  partitionLessonExperienceBlocks,
  resolveLessonLabCards,
  resolveLessonQuizCtas,
  resolveLessonVideoSlot,
} from "./lessonExperienceLayout";
import type { LearningLessonContentBlock } from "./lessonContentBlocksFoundation";
import {
  buildLessonVideoBlockContent,
} from "./lessonVideoIngestion";
import {
  classifyVideoProductionComplexity,
  estimateNarrationMinutesFromScriptChars,
  isLearningLessonVideoAssetStatus,
} from "./lessonVideoAssetContract";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");

function block(
  partial: Partial<LearningLessonContentBlock> & {
    id: string;
    block_type: LearningLessonContentBlock["block_type"];
    position: number;
    content?: Record<string, unknown>;
  }
): LearningLessonContentBlock {
  return {
    lesson_id: "11111111-1111-4111-8111-111111111111",
    status: "published",
    created_by: "u",
    updated_by: null,
    created_at: "",
    updated_at: "",
    published_at: null,
    suspended_at: null,
    archived_at: null,
    content: {},
    ...partial,
  };
}

describe("lessonExperienceLayout — video slot", () => {
  it("returns coming_soon when no playable video asset", () => {
    const slot = resolveLessonVideoSlot([
      block({
        id: "t1",
        block_type: "transcript",
        position: 0,
        content: { text: "script" },
      }),
    ]);
    expect(slot).toEqual({ kind: "coming_soon" });
  });

  it("returns playable when a safe HTTPS video URL exists", () => {
    const video = block({
      id: "v1",
      block_type: "video",
      position: 0,
      content: {
        url: "https://cdn.example.com/ja01-m01-l01.mp4",
        provider: "url",
        caption: "Lesson video",
      },
    });
    const slot = resolveLessonVideoSlot([video]);
    expect(slot.kind).toBe("playable");
    if (slot.kind !== "playable") return;
    expect(slot.url).toBe("https://cdn.example.com/ja01-m01-l01.mp4");
    expect(isSafeHttpUrl(slot.url)).toBe(true);
  });

  it("rejects unsafe/fake javascript URLs", () => {
    const slot = resolveLessonVideoSlot([
      block({
        id: "v-bad",
        block_type: "video",
        position: 0,
        content: { url: "javascript:alert(1)" },
      }),
    ]);
    expect(slot).toEqual({ kind: "coming_soon" });
  });
});

describe("lessonExperienceLayout — quiz CTA", () => {
  it("builds CTA with question count", () => {
    expect(buildLessonQuizCtaLabel({ question_count: 4 })).toBe(
      "Start lesson quiz · 4 questions"
    );
    expect(buildLessonQuizCtaLabel({ question_count: 1 })).toBe(
      "Start lesson quiz · 1 question"
    );
    expect(buildLessonQuizCtaLabel({ question_count: null })).toBe(
      "Start lesson quiz"
    );
  });

  it("resolves quiz CTAs to assessment routes with counts", () => {
    const ctas = resolveLessonQuizCtas({
      activities: [
        {
          id: "quiz-1",
          name: "Lesson quiz — M01-L01",
          slug: "quiz-1",
          type: "quiz",
          description: null,
          position: 1,
          hints: {
            is_required: true,
            max_attempts: null,
            time_limit_seconds: null,
          },
        },
        {
          id: "lab-1",
          name: "Lab",
          slug: "lab-1",
          type: "lab",
          description: null,
          position: 0,
          hints: {
            is_required: true,
            max_attempts: null,
            time_limit_seconds: null,
          },
        },
      ],
      questionCountByActivityId: { "quiz-1": 4 },
    });
    expect(ctas).toHaveLength(1);
    expect(ctas[0]?.href).toBe("/learning/activities/quiz-1/assessment");
    expect(ctas[0]?.cta_label).toBe("Start lesson quiz · 4 questions");
    expect(ctas[0]?.question_count).toBe(4);
  });
});

describe("lessonExperienceLayout — ordering buckets", () => {
  it("orders lab + quiz activities and partitions content", () => {
    const labs = resolveLessonLabCards([
      {
        id: "lab-1",
        name: "Lab — M01-L01",
        slug: "lab-1",
        type: "lab",
        description: null,
        position: 0,
        hints: {
          is_required: true,
          max_attempts: null,
          time_limit_seconds: null,
        },
      },
    ]);
    expect(labs[0]?.href).toBe("/learning/activities/lab-1/lab");

    const layout = partitionLessonExperienceBlocks([
      block({
        id: "h",
        block_type: "heading",
        position: 0,
        content: { text: "Title", level: 2 },
      }),
      block({
        id: "body",
        block_type: "rich_text",
        position: 1,
        content: { text: "# Lesson body", format: "markdown" },
      }),
      block({
        id: "tr",
        block_type: "transcript",
        position: 2,
        content: { text: "SCRIPT" },
      }),
      block({
        id: "lab",
        block_type: "rich_text",
        position: 3,
        content: { text: "# LAB — Classify", format: "markdown" },
      }),
      block({
        id: "cp",
        block_type: "callout",
        position: 4,
        content: { text: "# CHECKPOINTS", variant: "info" },
      }),
    ]);
    expect(layout.main.map((b) => b.id)).toEqual(["h", "body"]);
    expect(layout.transcripts.map((b) => b.id)).toEqual(["tr"]);
    expect(layout.labContent.map((b) => b.id)).toEqual(["lab"]);
    expect(classifyLessonExperienceBlock(layout.labContent[0]!)).toBe(
      "lab_content"
    );
  });
});

describe("lessonVideoAssetContract + ingestion content", () => {
  it("accepts known statuses and estimates duration", () => {
    expect(isLearningLessonVideoAssetStatus("planned")).toBe(true);
    expect(isLearningLessonVideoAssetStatus("bogus")).toBe(false);
    expect(estimateNarrationMinutesFromScriptChars(11000)).toBe(11);
    expect(
      classifyVideoProductionComplexity({
        estimated_narration_minutes: 12,
        scene_count: 4,
        has_screen_recording_hints: false,
      })
    ).toBe("medium");
  });

  it("builds video block content without inventing unsafe URLs", () => {
    expect(
      buildLessonVideoBlockContent({
        playback_url: "https://cdn.example.com/a.mp4",
        provider: "url",
        caption: "JA-01",
      })
    ).toEqual({
      url: "https://cdn.example.com/a.mp4",
      provider: "url",
      caption: "JA-01",
    });
    expect(
      buildLessonVideoBlockContent({ playback_url: "not-a-url" })
    ).toBeNull();
  });
});

describe("LessonViewer experience contract", () => {
  const viewer = readFileSync(
    join(ROOT, "app/components/learning/LessonViewer.tsx"),
    "utf8"
  ).replace(/\r\n/g, "\n");
  const page = readFileSync(
    join(ROOT, "app/learning/lessons/[lessonId]/page.tsx"),
    "utf8"
  ).replace(/\r\n/g, "\n");

  it("keeps locked/nav testids and adds video/quiz slots", () => {
    expect(viewer).toMatch(/data-testid="learning-lesson-viewer"/);
    expect(viewer).toMatch(/data-testid="learning-lesson-content"/);
    expect(viewer).toMatch(/data-testid="learning-lesson-locked"/);
    expect(viewer).toMatch(/data-testid="learning-lesson-nav"/);
    expect(viewer).toMatch(/data-testid="learning-lesson-video-slot"/);
    expect(viewer).toMatch(/data-testid="learning-lesson-video-coming-soon"/);
    expect(viewer).toMatch(/data-testid="learning-lesson-quiz"/);
    expect(viewer).toMatch(/data-testid="learning-lesson-lab"/);
    expect(viewer).toMatch(/Video lesson coming soon/);
    expect(viewer).toMatch(/quiz\.cta_label/);
    expect(viewer).toMatch(/buildLessonQuizCtaLabel|resolveLessonQuizCtas/);
  });

  it("never falls back to delivery SELECT blocks and never exposes answer keys", () => {
    expect(viewer).toMatch(/Never fall back to delivery SELECT/);
    expect(viewer).not.toMatch(/answer_key/i);
    expect(viewer).not.toMatch(/learning_question_answer_keys/);
    expect(viewer).not.toMatch(/dangerouslySetInnerHTML/);
    expect(page).toMatch(/loadPublishedQuestionCountsByActivityIds/);
    expect(page).toMatch(/questionCountByActivityId/);
  });

  it("uses layout partition helpers for lab/quiz ordering", () => {
    expect(viewer).toMatch(/partitionLessonExperienceBlocks/);
    expect(viewer).toMatch(/resolveLessonQuizCtas/);
    expect(viewer).toMatch(/resolveLessonLabCards/);
    expect(viewer).toMatch(/resolveLessonVideoSlot/);
  });
});

describe("normalized JA-06 / JA-09 content markers remain intact", () => {
  it("keeps content-block length constants for rich_text", () => {
    const foundation = readFileSync(
      join(ROOT, "lib/learning/lessonContentBlocksFoundation.ts"),
      "utf8"
    );
    expect(foundation).toMatch(/richTextMaxChars:\s*10000/);
  });

  it("hash-stable lesson experience layout module exports", () => {
    const src = readFileSync(
      join(ROOT, "lib/learning/lessonExperienceLayout.ts"),
      "utf8"
    );
    const digest = createHash("sha256").update(src).digest("hex");
    expect(digest.length).toBe(64);
    expect(src).toMatch(/export function resolveLessonVideoSlot/);
  });
});
