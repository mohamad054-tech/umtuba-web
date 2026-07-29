/**
 * Learning AI Tutor — trusted context adapter (read-only).
 * Does not mutate progress, grades, enrollments, or content.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LEARNING_PROGRESS_HELPERS } from "../../../learning/progressFoundation";
import type { LearningLessonContentBlock } from "../../../learning/lessonContentBlocksFoundation";
import { filterPublishedCreatableBlocks } from "../../../learning/learnerDelivery";
import { requireLessonUnlockedForLearner } from "../../../learning/lessonUnlockFoundation";
import type { AiErrorCode, AiResult } from "../../contracts/types";

type AnyClient = SupabaseClient;

export type LearningTutorBlockRef = {
  id: string;
  blockType: string;
  position: number;
  /** Bounded plain-text excerpt for grounding (never drafts). */
  textExcerpt: string;
};

export type LearningTutorAuthorizedContext = {
  userId: string;
  courseId: string;
  courseName: string;
  sectionId: string;
  lessonId: string;
  lessonName: string;
  lessonDescription: string | null;
  locale: string | null;
  blocks: LearningTutorBlockRef[];
  activitySummaries: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  dataClassification: "confidential";
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function fail(
  code: AiErrorCode,
  message: string
): AiResult<never> {
  return { ok: false, code, message };
}

function extractTextFromBlockContent(content: unknown): string {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return "";
  }
  const record = content as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ["text", "body", "title", "caption", "quote", "code"]) {
    const v = record[key];
    if (typeof v === "string" && v.trim()) parts.push(v.trim());
  }
  return parts.join("\n").slice(0, 1200);
}

export async function assertLearningCourseAccess(
  supabase: AnyClient,
  courseId: string,
  userId: string
): Promise<AiResult<true>> {
  const { data, error } = await supabase.rpc(
    LEARNING_PROGRESS_HELPERS.hasCourseAccess,
    { p_course_id: courseId, p_user_id: userId }
  );
  if (error) {
    return fail("permission_denied", "Unable to verify Learning access.");
  }
  if (data !== true) {
    return fail(
      "permission_denied",
      "You are not enrolled or entitled for this course."
    );
  }
  return { ok: true, data: true };
}

/**
 * Resolve authorized published lesson context for Learning AI.
 * Never loads drafts, answer keys, or other learners' data.
 * Never mutates progress.
 */
export async function resolveLearningTutorContext(input: {
  supabase: AnyClient;
  userId: string;
  lessonId: string;
  locale?: string | null;
}): Promise<AiResult<LearningTutorAuthorizedContext>> {
  const unlock = await requireLessonUnlockedForLearner(
    input.supabase,
    input.lessonId
  );
  if (!unlock.ok) {
    const locked = unlock.message.toLowerCase().includes("locked");
    return fail(
      locked ? "permission_denied" : "invalid_input",
      unlock.message
    );
  }

  const { data: lesson, error: lessonError } = await input.supabase
    .from("learning_lessons")
    .select("id, section_id, name, description, status")
    .eq("id", input.lessonId)
    .eq("status", "published")
    .maybeSingle();

  if (lessonError || !lesson) {
    return fail("invalid_input", "Lesson not found or not published.");
  }

  const sectionId = asString(lesson.section_id);
  if (!sectionId) {
    return fail("invalid_input", "Lesson is missing section.");
  }

  const { data: section } = await input.supabase
    .from("learning_sections")
    .select("id, course_id, status")
    .eq("id", sectionId)
    .eq("status", "published")
    .maybeSingle();

  if (!section) {
    return fail("invalid_input", "Section not found or not published.");
  }

  const courseId = asString(section.course_id);
  if (!courseId) {
    return fail("invalid_input", "Section is missing course.");
  }

  const access = await assertLearningCourseAccess(
    input.supabase,
    courseId,
    input.userId
  );
  if (!access.ok) return access;

  const { data: course } = await input.supabase
    .from("learning_courses")
    .select("id, name, status")
    .eq("id", courseId)
    .eq("status", "published")
    .maybeSingle();

  if (!course) {
    return fail("invalid_input", "Course not found or not published.");
  }

  const { data: blockRows, error: blockError } = await input.supabase
    .from("learning_lesson_content_blocks")
    .select("id, lesson_id, block_type, status, position, content")
    .eq("lesson_id", input.lessonId)
    .eq("status", "published")
    .order("position", { ascending: true });

  if (blockError) {
    return fail("provider_error", "Unable to load published lesson blocks.");
  }

  const blocks = filterPublishedCreatableBlocks(
    (blockRows ?? []) as LearningLessonContentBlock[]
  ).map((b) => ({
    id: b.id,
    blockType: b.block_type,
    position: b.position,
    textExcerpt: extractTextFromBlockContent(b.content),
  }));

  const { data: activityRows } = await input.supabase
    .from("learning_activities")
    .select("id, name, type, status")
    .eq("lesson_id", input.lessonId)
    .eq("status", "published")
    .order("position", { ascending: true });

  return {
    ok: true,
    data: {
      userId: input.userId,
      courseId,
      courseName: String(course.name ?? ""),
      sectionId,
      lessonId: input.lessonId,
      lessonName: String(lesson.name ?? ""),
      lessonDescription:
        typeof lesson.description === "string" ? lesson.description : null,
      locale: input.locale ?? null,
      blocks,
      activitySummaries: (activityRows ?? []).map((a) => ({
        id: String(a.id),
        name: String(a.name ?? ""),
        type: String(a.type ?? ""),
      })),
      dataClassification: "confidential",
    },
  };
}

export function buildGroundingPack(
  ctx: LearningTutorAuthorizedContext,
  maxChars = 10000
): {
  pack: string;
  sourceReferences: Array<{ type: string; id: string; label: string }>;
} {
  const refs: Array<{ type: string; id: string; label: string }> = [
    { type: "course", id: ctx.courseId, label: ctx.courseName },
    { type: "lesson", id: ctx.lessonId, label: ctx.lessonName },
  ];
  const lines: string[] = [
    `Course: ${ctx.courseName}`,
    `Lesson: ${ctx.lessonName}`,
    ctx.lessonDescription ? `Lesson description: ${ctx.lessonDescription}` : "",
    "Published blocks:",
  ];
  for (const block of ctx.blocks) {
    refs.push({
      type: "lesson_block",
      id: block.id,
      label: `${block.blockType}#${block.position}`,
    });
    const excerpt = block.textExcerpt || `(${block.blockType} without text)`;
    lines.push(`[block ${block.id} | ${block.blockType}] ${excerpt}`);
  }
  if (ctx.activitySummaries.length > 0) {
    lines.push("Published activities (titles only, no keys):");
    for (const a of ctx.activitySummaries) {
      lines.push(`- ${a.name} (${a.type})`);
    }
  }
  let pack = lines.filter(Boolean).join("\n");
  if (pack.length > maxChars) {
    pack = `${pack.slice(0, maxChars)}\n…[truncated for context limit]`;
  }
  return { pack, sourceReferences: refs };
}
