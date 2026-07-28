/**
 * Learning Tutor Domain tools — read-only, revalidate via context adapter.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { registerTool } from "../../tools/registry";
import {
  assertLearningCourseAccess,
  resolveLearningTutorContext,
} from "./contextAdapter";

let installed = false;

export function installLearningTutorTools(supabase: SupabaseClient): void {
  if (installed) return;

  registerTool({
    toolId: "learning.read_lesson_outline",
    domainOwner: "learning",
    description: "Read authorized published lesson outline for the learner.",
    inputSchema: { required: ["lessonId"] },
    outputSchema: { type: "object" },
    requiredPermissions: ["learning.lesson.read"],
    dataClassification: "confidential",
    mutating: false,
    confirmationRequired: false,
    idempotent: true,
    auditRequired: true,
    available: true,
    executor: async ({ args, userId }) => {
      const lessonId = String(args.lessonId ?? "");
      const ctx = await resolveLearningTutorContext({
        supabase,
        userId,
        lessonId,
      });
      if (!ctx.ok) return { ok: false, message: ctx.message };
      return {
        ok: true,
        data: {
          courseId: ctx.data.courseId,
          courseName: ctx.data.courseName,
          lessonId: ctx.data.lessonId,
          lessonName: ctx.data.lessonName,
          blockCount: ctx.data.blocks.length,
          activities: ctx.data.activitySummaries,
        },
      };
    },
  });

  registerTool({
    toolId: "learning.read_published_lesson_blocks",
    domainOwner: "learning",
    description: "Read published lesson block excerpts for grounding.",
    inputSchema: { required: ["lessonId"] },
    outputSchema: { type: "object" },
    requiredPermissions: ["learning.lesson.read"],
    dataClassification: "confidential",
    mutating: false,
    confirmationRequired: false,
    idempotent: true,
    auditRequired: true,
    available: true,
    executor: async ({ args, userId }) => {
      const lessonId = String(args.lessonId ?? "");
      const ctx = await resolveLearningTutorContext({
        supabase,
        userId,
        lessonId,
      });
      if (!ctx.ok) return { ok: false, message: ctx.message };
      return {
        ok: true,
        data: {
          blocks: ctx.data.blocks.map((b) => ({
            id: b.id,
            blockType: b.blockType,
            position: b.position,
            textExcerpt: b.textExcerpt.slice(0, 500),
          })),
        },
      };
    },
  });

  registerTool({
    toolId: "learning.read_enrollment_state",
    domainOwner: "learning",
    description: "Confirm learner course access (boolean only).",
    inputSchema: { required: ["courseId"] },
    outputSchema: { type: "object" },
    requiredPermissions: ["learning.enrollment.read"],
    dataClassification: "internal",
    mutating: false,
    confirmationRequired: false,
    idempotent: true,
    auditRequired: true,
    available: true,
    executor: async ({ args, userId }) => {
      const courseId = String(args.courseId ?? "");
      const access = await assertLearningCourseAccess(
        supabase,
        courseId,
        userId
      );
      if (!access.ok) return { ok: false, message: access.message };
      return { ok: true, data: { courseId, entitled: true } };
    },
  });

  installed = true;
}

export function resetLearningTutorToolsForTests(): void {
  installed = false;
}
