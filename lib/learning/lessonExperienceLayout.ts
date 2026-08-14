/**
 * Learner lesson experience layout helpers.
 * Pure partitioning / CTA copy — no DB, no secrets, no answer keys.
 */

import { isSafeHttpUrl } from "./contentBlockRender";
import type { LearningLessonContentBlock } from "./lessonContentBlocksFoundation";
import {
  LEARNING_LEARNER_ROUTES,
  resolveLearnerActivityTarget,
  type LearningLearnerActivitySummary,
} from "./learnerDelivery";

export type LessonExperienceBlockBucket =
  | "video"
  | "main"
  | "transcript"
  | "lab_content"
  | "supporting"
  | "resources";

export type LessonExperienceLayout = {
  videos: LearningLessonContentBlock[];
  main: LearningLessonContentBlock[];
  transcripts: LearningLessonContentBlock[];
  labContent: LearningLessonContentBlock[];
  supporting: LearningLessonContentBlock[];
  resources: LearningLessonContentBlock[];
};

export type LessonVideoSlot =
  | {
      kind: "playable";
      block: LearningLessonContentBlock;
      url: string;
      caption: string | null;
      provider: string | null;
    }
  | { kind: "coming_soon" };

export type LessonQuizCta = {
  activity_id: string;
  name: string;
  href: string;
  question_count: number | null;
  cta_label: string;
  attempt_label: string;
};

export type LessonLabCard = {
  activity_id: string;
  name: string;
  href: string;
  description: string | null;
};

function asText(content: Record<string, unknown>): string {
  const text = content.text;
  return typeof text === "string" ? text : "";
}

function headingOf(text: string): string {
  const line = text.split(/\r?\n/, 1)[0] ?? "";
  return line.replace(/^#+\s*/, "").trim().toLowerCase();
}

export function classifyLessonExperienceBlock(
  block: LearningLessonContentBlock
): LessonExperienceBlockBucket {
  if (block.block_type === "video") return "video";
  if (block.block_type === "transcript") return "transcript";
  if (block.block_type === "audio" || block.block_type === "image") {
    return "supporting";
  }

  const text = asText(block.content);
  const head = headingOf(text);

  if (
    block.block_type === "rich_text" &&
    (head.startsWith("lab ") ||
      head.startsWith("lab —") ||
      head.startsWith("lab -") ||
      head.includes("lab —") ||
      /^lab\b/.test(head))
  ) {
    return "lab_content";
  }

  if (
    block.block_type === "callout" ||
    head.startsWith("checkpoints") ||
    head.startsWith("assistant_hooks") ||
    head.startsWith("assistant hooks") ||
    head.startsWith("visual plan")
  ) {
    return "supporting";
  }

  if (head.startsWith("resources")) {
    return "resources";
  }

  return "main";
}

export function partitionLessonExperienceBlocks(
  blocks: readonly LearningLessonContentBlock[]
): LessonExperienceLayout {
  const layout: LessonExperienceLayout = {
    videos: [],
    main: [],
    transcripts: [],
    labContent: [],
    supporting: [],
    resources: [],
  };

  const ordered = [...blocks].sort((a, b) => a.position - b.position);
  for (const block of ordered) {
    if (block.status !== "published") continue;
    const bucket = classifyLessonExperienceBlock(block);
    switch (bucket) {
      case "video":
        layout.videos.push(block);
        break;
      case "transcript":
        layout.transcripts.push(block);
        break;
      case "lab_content":
        layout.labContent.push(block);
        break;
      case "supporting":
        layout.supporting.push(block);
        break;
      case "resources":
        layout.resources.push(block);
        break;
      default:
        layout.main.push(block);
        break;
    }
  }
  return layout;
}

export function resolveLessonVideoSlot(
  blocks: readonly LearningLessonContentBlock[]
): LessonVideoSlot {
  const playable = [...blocks]
    .filter((b) => b.block_type === "video" && b.status === "published")
    .sort((a, b) => a.position - b.position)
    .find((b) => isSafeHttpUrl(b.content?.url));

  if (!playable) return { kind: "coming_soon" };

  const url = playable.content.url;
  if (!isSafeHttpUrl(url)) return { kind: "coming_soon" };

  const caption =
    typeof playable.content.caption === "string" ? playable.content.caption : null;
  const provider =
    typeof playable.content.provider === "string"
      ? playable.content.provider
      : null;

  return {
    kind: "playable",
    block: playable,
    url,
    caption,
    provider,
  };
}

export function buildLessonQuizCtaLabel(input: {
  question_count: number | null;
}): string {
  const n = input.question_count;
  if (typeof n === "number" && Number.isFinite(n) && n > 0) {
    return `Start lesson quiz · ${n} question${n === 1 ? "" : "s"}`;
  }
  return "Start lesson quiz";
}

export function resolveLessonQuizCtas(input: {
  activities: readonly LearningLearnerActivitySummary[];
  questionCountByActivityId?: ReadonlyMap<string, number> | Record<string, number>;
  attemptLabelByActivityId?: ReadonlyMap<string, string> | Record<string, string>;
}): LessonQuizCta[] {
  const countOf = (id: string): number | null => {
    const map = input.questionCountByActivityId;
    if (!map) return null;
    if (map instanceof Map) {
      return map.has(id) ? (map.get(id) ?? null) : null;
    }
    const value = (map as Record<string, number>)[id];
    return typeof value === "number" ? value : null;
  };
  const attemptOf = (id: string): string => {
    const map = input.attemptLabelByActivityId;
    if (!map) return "Not started";
    if (map instanceof Map) return map.get(id) ?? "Not started";
    return (map as Record<string, string>)[id] ?? "Not started";
  };

  return input.activities
    .filter((a) => a.type === "quiz")
    .sort((a, b) => a.position - b.position)
    .map((activity) => {
      const target = resolveLearnerActivityTarget({
        activity_id: activity.id,
        type: activity.type,
      });
      const href =
        target?.href ?? LEARNING_LEARNER_ROUTES.assessment(activity.id);
      const question_count = countOf(activity.id);
      return {
        activity_id: activity.id,
        name: activity.name,
        href,
        question_count,
        cta_label: buildLessonQuizCtaLabel({ question_count }),
        attempt_label: attemptOf(activity.id),
      };
    });
}

export function resolveLessonLabCards(
  activities: readonly LearningLearnerActivitySummary[]
): LessonLabCard[] {
  return activities
    .filter((a) => a.type === "lab")
    .sort((a, b) => a.position - b.position)
    .map((activity) => {
      const target = resolveLearnerActivityTarget({
        activity_id: activity.id,
        type: activity.type,
      });
      return {
        activity_id: activity.id,
        name: activity.name,
        href: target?.href ?? LEARNING_LEARNER_ROUTES.lab(activity.id),
        description: activity.description,
      };
    });
}
