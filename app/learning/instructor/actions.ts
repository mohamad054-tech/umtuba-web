"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  runInstructorAuthoringOperation,
  type InstructorAuthoringResult,
} from "../../../lib/learning/instructorAuthoring";

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function parseIdList(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function requireUser(): Promise<InstructorAuthoringResult | null> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Sign in required." };
  }
  return null;
}

function revalidateAuthoring(courseId?: string, lessonId?: string) {
  revalidatePath(LEARNING_INSTRUCTOR_ROUTES.hub);
  if (courseId) {
    revalidatePath(LEARNING_INSTRUCTOR_ROUTES.course(courseId));
  }
  if (courseId && lessonId) {
    revalidatePath(LEARNING_INSTRUCTOR_ROUTES.lesson(courseId, lessonId));
  }
}

export async function instructorAuthoringAction(
  operation: string,
  input: Record<string, unknown>,
  revalidate?: { courseId?: string; lessonId?: string }
): Promise<InstructorAuthoringResult> {
  const authErr = await requireUser();
  if (authErr) return authErr;

  const supabase = await createClient();
  const result = await runInstructorAuthoringOperation(
    supabase,
    operation,
    input
  );
  if (result.ok) {
    revalidateAuthoring(revalidate?.courseId, revalidate?.lessonId);
  }
  return result;
}

export async function createSectionAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  return instructorAuthoringAction(
    "create_section",
    {
      course_id: courseId,
      slug: formString(formData, "slug"),
      name: formString(formData, "name"),
      description: formString(formData, "description") || null,
      visibility: formString(formData, "visibility") || "private",
    },
    { courseId }
  );
}

export async function updateSectionAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  return instructorAuthoringAction(
    "update_section",
    {
      section_id: formString(formData, "sectionId"),
      name: formString(formData, "name") || undefined,
      description: formString(formData, "description") || undefined,
      visibility: formString(formData, "visibility") || undefined,
    },
    { courseId }
  );
}

export async function publishSectionAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  return instructorAuthoringAction(
    "publish_section",
    { section_id: formString(formData, "sectionId") },
    { courseId }
  );
}

export async function archiveSectionAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  return instructorAuthoringAction(
    "archive_section",
    { section_id: formString(formData, "sectionId") },
    { courseId }
  );
}

export async function reorderSectionsAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  return instructorAuthoringAction(
    "reorder_sections",
    {
      course_id: courseId,
      section_ids: parseIdList(formString(formData, "sectionIds")),
    },
    { courseId }
  );
}

export async function createLessonAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  return instructorAuthoringAction(
    "create_lesson",
    {
      section_id: formString(formData, "sectionId"),
      slug: formString(formData, "slug"),
      name: formString(formData, "name"),
      description: formString(formData, "description") || null,
      visibility: formString(formData, "visibility") || "private",
    },
    { courseId }
  );
}

export async function updateLessonAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  return instructorAuthoringAction(
    "update_lesson",
    {
      lesson_id: formString(formData, "lessonId"),
      name: formString(formData, "name") || undefined,
      description: formString(formData, "description") || undefined,
      visibility: formString(formData, "visibility") || undefined,
    },
    { courseId }
  );
}

export async function publishLessonAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  return instructorAuthoringAction(
    "publish_lesson",
    { lesson_id: formString(formData, "lessonId") },
    { courseId }
  );
}

export async function archiveLessonAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  return instructorAuthoringAction(
    "archive_lesson",
    { lesson_id: formString(formData, "lessonId") },
    { courseId }
  );
}

export async function reorderLessonsAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  return instructorAuthoringAction(
    "reorder_lessons",
    {
      section_id: formString(formData, "sectionId"),
      lesson_ids: parseIdList(formString(formData, "lessonIds")),
    },
    { courseId }
  );
}

export async function createActivityAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  return instructorAuthoringAction(
    "create_activity",
    {
      lesson_id: formString(formData, "lessonId"),
      type: formString(formData, "type"),
      slug: formString(formData, "slug"),
      name: formString(formData, "name"),
      description: formString(formData, "description") || null,
      visibility: formString(formData, "visibility") || "private",
    },
    { courseId }
  );
}

export async function updateActivityAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  return instructorAuthoringAction(
    "update_activity",
    {
      activity_id: formString(formData, "activityId"),
      name: formString(formData, "name") || undefined,
      description: formString(formData, "description") || undefined,
      visibility: formString(formData, "visibility") || undefined,
    },
    { courseId }
  );
}

export async function publishActivityAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  return instructorAuthoringAction(
    "publish_activity",
    { activity_id: formString(formData, "activityId") },
    { courseId }
  );
}

export async function archiveActivityAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  return instructorAuthoringAction(
    "archive_activity",
    { activity_id: formString(formData, "activityId") },
    { courseId }
  );
}

export async function reorderActivitiesAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  return instructorAuthoringAction(
    "reorder_activities",
    {
      lesson_id: formString(formData, "lessonId"),
      activity_ids: parseIdList(formString(formData, "activityIds")),
    },
    { courseId }
  );
}

export async function createContentBlockAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  const lessonId = formString(formData, "lessonId");
  const blockType = formString(formData, "blockType") || "rich_text";
  const text = formString(formData, "text");
  const content =
    blockType === "heading"
      ? { text, level: 2 }
      : blockType === "external_link"
        ? {
            url: formString(formData, "url"),
            label: formString(formData, "label") || "Link",
          }
        : { text };

  return instructorAuthoringAction(
    "create_content_block",
    {
      lesson_id: lessonId,
      block_type: blockType,
      content,
    },
    { courseId, lessonId }
  );
}

export async function updateContentBlockAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  const lessonId = formString(formData, "lessonId");
  const text = formString(formData, "text");
  return instructorAuthoringAction(
    "update_content_block",
    {
      block_id: formString(formData, "blockId"),
      content: { text },
    },
    { courseId, lessonId }
  );
}

export async function publishContentBlockAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  const lessonId = formString(formData, "lessonId");
  return instructorAuthoringAction(
    "publish_content_block",
    { block_id: formString(formData, "blockId") },
    { courseId, lessonId }
  );
}

export async function unpublishContentBlockAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  const lessonId = formString(formData, "lessonId");
  return instructorAuthoringAction(
    "unpublish_content_block",
    { block_id: formString(formData, "blockId") },
    { courseId, lessonId }
  );
}

export async function archiveContentBlockAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  const lessonId = formString(formData, "lessonId");
  return instructorAuthoringAction(
    "archive_content_block",
    { block_id: formString(formData, "blockId") },
    { courseId, lessonId }
  );
}

export async function reorderContentBlocksAction(
  formData: FormData
): Promise<InstructorAuthoringResult> {
  const courseId = formString(formData, "courseId");
  const lessonId = formString(formData, "lessonId");
  return instructorAuthoringAction(
    "reorder_content_blocks",
    {
      lesson_id: lessonId,
      block_ids: parseIdList(formString(formData, "blockIds")),
    },
    { courseId, lessonId }
  );
}
