import { LEARNING_COURSE_RPCS } from "../coursesFoundation";
import { LEARNING_SECTION_RPCS } from "../sectionsFoundation";
import { LEARNING_LESSON_RPCS } from "../lessonsFoundation";
import { LEARNING_LESSON_CONTENT_BLOCK_RPCS } from "../lessonContentBlocksFoundation";
import { LEARNING_ACTIVITY_RPCS } from "../activitiesFoundation";
import { LEARNING_COURSE_RESOURCE_RPCS } from "../courseResourcesFoundation";
import { LEARNING_QUESTION_RPCS } from "../questionsFoundation";
import { planCourseImport } from "./planCourseImport";
import type {
  CourseImportFinding,
  CourseImportPlan,
  CourseManifestQuestion,
  LearningCourseManifestV1,
} from "./manifestTypes";

/** Minimal RPC port — wrap Supabase client or a test double. */
export type CourseImportRpcPort = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export type DraftCourseImportResult = {
  ok: boolean;
  status: "succeeded" | "failed" | "conflict" | "blocked";
  plan: CourseImportPlan;
  course_id?: string;
  created: Record<string, string>;
  findings: CourseImportFinding[];
  mutation_count: number;
};

export function wrapSupabaseRpc(client: {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
}): CourseImportRpcPort {
  return {
    async rpc(fn, args) {
      return client.rpc(fn, args);
    },
  };
}

/**
 * Execute draft-first import via existing create_* RPCs.
 * Fail-closed; never publishes; never enrolls learners; never overwrites mapped ids.
 */
export async function executeDraftCourseImport(input: {
  rpc: CourseImportRpcPort;
  manifest: LearningCourseManifestV1;
  confirmImportDraft: boolean;
}): Promise<DraftCourseImportResult> {
  const plan = planCourseImport(input.manifest);
  const findings: CourseImportFinding[] = [...plan.findings];
  if (!plan.ok) {
    return {
      ok: false,
      status: "blocked",
      plan,
      created: {},
      findings,
      mutation_count: 0,
    };
  }
  if (!input.confirmImportDraft) {
    findings.push({
      severity: "ERROR",
      code: "CONFIRMATION_REQUIRED",
      path: "$",
      message: "confirmImportDraft must be true to mutate",
    });
    return {
      ok: false,
      status: "blocked",
      plan,
      created: {},
      findings,
      mutation_count: 0,
    };
  }

  const created: Record<string, string> = {};
  let mutationCount = 0;
  const programId = input.manifest.program_id.trim();
  let importRunId: string | null = null;

  for (const entity of plan.entities) {
    // Question rows are created under activities but not yet in entity-map allowlist (20260918).
    if (entity.kind === "question") continue;
    const lookup = await input.rpc.rpc("lookup_learning_course_import_entity", {
      p_program_id: programId,
      p_entity_kind: entity.kind,
      p_external_id: entity.external_id,
    });
    if (!lookup.error && typeof lookup.data === "string" && lookup.data) {
      findings.push({
        severity: "ERROR",
        code: "IMPORT_CONFLICT",
        path: entity.external_id,
        message: `external_id already mapped to ${lookup.data}; V1 refuses overwrite`,
      });
      return {
        ok: false,
        status: "conflict",
        plan,
        created,
        findings,
        mutation_count: 0,
      };
    }
  }

  const startRun = await input.rpc.rpc("start_learning_course_import_run", {
    p_program_id: programId,
    p_manifest_version: String(input.manifest.manifest_version),
    p_manifest_fingerprint: plan.manifest_fingerprint,
    p_mode: "import_draft",
  });
  if (!startRun.error && typeof startRun.data === "string") {
    importRunId = startRun.data;
  }

  const course = input.manifest.course;
  const courseRes = await input.rpc.rpc(LEARNING_COURSE_RPCS.create, {
    p_program_id: programId,
    p_slug: course.slug.trim().toLowerCase(),
    p_name: course.title.trim(),
    p_description: course.description ?? null,
    p_visibility: "private",
    p_default_language: course.default_language ?? "en",
  });
  mutationCount += 1;
  if (courseRes.error) {
    findings.push({
      severity: "ERROR",
      code: "COURSE_CREATE_FAILED",
      path: "course",
      message: courseRes.error.message,
    });
    return fail(plan, findings, created, mutationCount);
  }
  const courseId = extractId(courseRes.data);
  if (!courseId) {
    findings.push({
      severity: "ERROR",
      code: "COURSE_ID_MISSING",
      path: "course",
      message: "create_learning_course returned no id",
    });
    return fail(plan, findings, created, mutationCount);
  }
  created[course.external_id] = courseId;
  await mapEntity(
    input.rpc,
    programId,
    "course",
    course.external_id,
    courseId,
    importRunId
  );

  for (const [sIdx, section] of course.sections.entries()) {
    const sectionRes = await input.rpc.rpc(LEARNING_SECTION_RPCS.create, {
      p_course_id: courseId,
      p_slug: section.slug?.trim().toLowerCase() ?? `section-${sIdx + 1}`,
      p_name: section.title.trim(),
      p_description: section.description ?? null,
      p_visibility: "private",
    });
    mutationCount += 1;
    if (sectionRes.error) {
      findings.push({
        severity: "ERROR",
        code: "SECTION_CREATE_FAILED",
        path: `course.sections[${sIdx}]`,
        message: sectionRes.error.message,
      });
      return fail(plan, findings, created, mutationCount, courseId);
    }
    const sectionId = extractId(sectionRes.data);
    if (!sectionId) {
      findings.push({
        severity: "ERROR",
        code: "SECTION_ID_MISSING",
        path: `course.sections[${sIdx}]`,
        message: "create_learning_section returned no id",
      });
      return fail(plan, findings, created, mutationCount, courseId);
    }
    created[section.external_id] = sectionId;
    await mapEntity(
      input.rpc,
      programId,
      "section",
      section.external_id,
      sectionId,
      importRunId
    );

    for (const [lIdx, lesson] of section.lessons.entries()) {
      const lessonRes = await input.rpc.rpc(LEARNING_LESSON_RPCS.create, {
        p_section_id: sectionId,
        p_slug: lesson.slug.trim().toLowerCase(),
        p_name: lesson.title.trim(),
        p_description: lesson.description ?? null,
        p_visibility: "private",
      });
      mutationCount += 1;
      if (lessonRes.error) {
        findings.push({
          severity: "ERROR",
          code: "LESSON_CREATE_FAILED",
          path: `course.sections[${sIdx}].lessons[${lIdx}]`,
          message: lessonRes.error.message,
        });
        return fail(plan, findings, created, mutationCount, courseId);
      }
      const lessonId = extractId(lessonRes.data);
      if (!lessonId) {
        findings.push({
          severity: "ERROR",
          code: "LESSON_ID_MISSING",
          path: `course.sections[${sIdx}].lessons[${lIdx}]`,
          message: "create_learning_lesson returned no id",
        });
        return fail(plan, findings, created, mutationCount, courseId);
      }
      created[lesson.external_id] = lessonId;
      await mapEntity(
        input.rpc,
        programId,
        "lesson",
        lesson.external_id,
        lessonId,
        importRunId
      );

      for (const [bIdx, block] of (lesson.content_blocks ?? []).entries()) {
        const blockRes = await input.rpc.rpc(
          LEARNING_LESSON_CONTENT_BLOCK_RPCS.create,
          {
            p_lesson_id: lessonId,
            p_block_type: block.type,
            p_content: block.content,
          }
        );
        mutationCount += 1;
        if (blockRes.error) {
          findings.push({
            severity: "ERROR",
            code: "BLOCK_CREATE_FAILED",
            path: `course.sections[${sIdx}].lessons[${lIdx}].content_blocks[${bIdx}]`,
            message: blockRes.error.message,
          });
          return fail(plan, findings, created, mutationCount, courseId);
        }
        const blockId = extractId(blockRes.data);
        if (blockId) {
          created[block.external_id] = blockId;
          await mapEntity(
            input.rpc,
            programId,
            "content_block",
            block.external_id,
            blockId,
            importRunId
          );
        }
      }

      for (const [aIdx, activity] of (lesson.activities ?? []).entries()) {
        const activityRes = await input.rpc.rpc(LEARNING_ACTIVITY_RPCS.create, {
          p_lesson_id: lessonId,
          p_type: activity.type,
          p_slug:
            activity.slug?.trim().toLowerCase() ??
            `activity-${aIdx + 1}`,
          p_name: activity.title.trim(),
          p_description: activity.description ?? null,
          p_visibility: "private",
        });
        mutationCount += 1;
        if (activityRes.error) {
          findings.push({
            severity: "ERROR",
            code: "ACTIVITY_CREATE_FAILED",
            path: `course.sections[${sIdx}].lessons[${lIdx}].activities[${aIdx}]`,
            message: activityRes.error.message,
          });
          return fail(plan, findings, created, mutationCount, courseId);
        }
        const activityId = extractId(activityRes.data);
        if (activityId) {
          created[activity.external_id] = activityId;
          await mapEntity(
            input.rpc,
            programId,
            "activity",
            activity.external_id,
            activityId,
            importRunId
          );
          // Persist READY graded questions into the activity (required for course import).
          for (const [qIdx, question] of (activity.questions ?? []).entries()) {
            const qPath = `course.sections[${sIdx}].lessons[${lIdx}].activities[${aIdx}].questions[${qIdx}]`;
            const mapped = mapQuestionPayload(question);
            if (!mapped.ok) {
              findings.push({
                severity: "ERROR",
                code: "QUESTION_PAYLOAD_INVALID",
                path: qPath,
                message: mapped.message || "Invalid question payload",
              });
              return fail(plan, findings, created, mutationCount, courseId);
            }
            const questionRes = await input.rpc.rpc(LEARNING_QUESTION_RPCS.create, {
              p_activity_id: activityId,
              p_question_type: mapped.dbType,
              p_content: mapped.content,
              p_points: question.points ?? 1,
            });
            mutationCount += 1;
            if (questionRes.error) {
              findings.push({
                severity: "ERROR",
                code: "QUESTION_CREATE_FAILED",
                path: qPath,
                message: questionRes.error.message,
              });
              return fail(plan, findings, created, mutationCount, courseId);
            }
            const questionId = extractId(questionRes.data);
            if (!questionId) {
              findings.push({
                severity: "ERROR",
                code: "QUESTION_ID_MISSING",
                path: qPath,
                message: "create_learning_question returned no id",
              });
              return fail(plan, findings, created, mutationCount, courseId);
            }
            created[question.external_id] = questionId;
            // Entity-map kind allowlist (20260918) is course…resource only — no 'question' yet.
            // Persist questions + answer keys; remap/conflict for questions deferred to a later migration.
            const keyRes = await input.rpc.rpc(LEARNING_QUESTION_RPCS.setAnswerKey, {
              p_question_id: questionId,
              p_answer_key: mapped.answerKey,
            });
            mutationCount += 1;
            if (keyRes.error) {
              findings.push({
                severity: "ERROR",
                code: "ANSWER_KEY_SET_FAILED",
                path: qPath,
                message: keyRes.error.message,
              });
              return fail(plan, findings, created, mutationCount, courseId);
            }
          }
        } else if ((activity.questions ?? []).length > 0) {
          findings.push({
            severity: "ERROR",
            code: "ACTIVITY_ID_MISSING_FOR_QUESTIONS",
            path: `course.sections[${sIdx}].lessons[${lIdx}].activities[${aIdx}]`,
            message: "Cannot attach questions without activity id",
          });
          return fail(plan, findings, created, mutationCount, courseId);
        }
      }
    }
  }

  for (const [rIdx, resource] of (course.resources ?? []).entries()) {
    const resourceRes = await input.rpc.rpc(LEARNING_COURSE_RESOURCE_RPCS.create, {
      p_course_id: courseId,
      p_title: resource.title.trim(),
      p_resource_kind: resource.resource_kind,
      p_url: resource.url.trim(),
    });
    mutationCount += 1;
    if (resourceRes.error) {
      findings.push({
        severity: "WARNING",
        code: "RESOURCE_CREATE_FAILED",
        path: `course.resources[${rIdx}]`,
        message: resourceRes.error.message,
      });
      continue;
    }
    const resourceId = extractId(resourceRes.data);
    if (resourceId) {
      created[resource.external_id] = resourceId;
      await mapEntity(
        input.rpc,
        programId,
        "resource",
        resource.external_id,
        resourceId,
        importRunId
      );
    }
  }

  findings.push({
    severity: "INFO",
    code: "DRAFT_ONLY",
    path: "course",
    message:
      "Import completed as draft; publication and catalog visibility require separate GO",
  });

  if (importRunId) {
    await input.rpc.rpc("finish_learning_course_import_run", {
      p_run_id: importRunId,
      p_status: "succeeded",
      p_target_course_id: courseId,
      p_entity_counts: plan.counts,
      p_error_summary: null,
    });
  }

  return {
    ok: true,
    status: "succeeded",
    plan,
    course_id: courseId,
    created,
    findings,
    mutation_count: mutationCount,
  };
}

async function mapEntity(
  rpc: CourseImportRpcPort,
  programId: string,
  kind: string,
  externalId: string,
  entityId: string,
  importRunId: string | null
) {
  if (!importRunId) return;
  await rpc.rpc("record_learning_course_import_entity_map", {
    p_program_id: programId,
    p_entity_kind: kind,
    p_external_id: externalId,
    p_entity_id: entityId,
    p_import_run_id: importRunId,
  });
}

function fail(
  plan: CourseImportPlan,
  findings: CourseImportFinding[],
  created: Record<string, string>,
  mutationCount: number,
  courseId?: string
): DraftCourseImportResult {
  return {
    ok: false,
    status: "failed",
    plan,
    course_id: courseId,
    created,
    findings,
    mutation_count: mutationCount,
  };
}

type MappedQuestionPayload =
  | {
      ok: true;
      dbType:
        | "multiple_choice_single"
        | "multiple_choice_multiple"
        | "true_false"
        | "short_answer";
      content: Record<string, unknown>;
      answerKey: Record<string, unknown>;
    }
  | { ok: false; message: string };

/**
 * Map Course Manifest V1 question shapes onto Learning Questions Foundation
 * create + answer-key contracts. Correctness never lives in `content`.
 */
export function mapQuestionPayload(
  question: CourseManifestQuestion & { correct_boolean?: boolean }
): MappedQuestionPayload {
  const prompt = question.prompt?.trim();
  if (!prompt) {
    return { ok: false, message: "question prompt is required" };
  }

  if (question.question_type === "single_choice") {
    const choices = question.choices ?? [];
    if (choices.length < 2) {
      return { ok: false, message: "single_choice requires at least 2 choices" };
    }
    const correctIds = question.answer_key?.correct_choice_ids ?? [];
    if (correctIds.length !== 1) {
      return {
        ok: false,
        message: "single_choice requires exactly one correct_choice_id",
      };
    }
    const correct = correctIds[0];
    if (!choices.some((c) => c.id === correct)) {
      return { ok: false, message: `unknown correct choice id ${correct}` };
    }
    return {
      ok: true,
      dbType: "multiple_choice_single",
      content: {
        prompt,
        options: choices.map((c) => ({ key: c.id, text: c.label })),
      },
      answerKey: { correct_key: correct },
    };
  }

  if (question.question_type === "multiple_choice") {
    const choices = question.choices ?? [];
    if (choices.length < 2) {
      return {
        ok: false,
        message: "multiple_choice requires at least 2 choices",
      };
    }
    const correctIds = question.answer_key?.correct_choice_ids ?? [];
    if (correctIds.length < 1) {
      return {
        ok: false,
        message: "multiple_choice requires correct_choice_ids",
      };
    }
    for (const id of correctIds) {
      if (!choices.some((c) => c.id === id)) {
        return { ok: false, message: `unknown correct choice id ${id}` };
      }
    }
    return {
      ok: true,
      dbType: "multiple_choice_multiple",
      content: {
        prompt,
        options: choices.map((c) => ({ key: c.id, text: c.label })),
      },
      answerKey: { correct_keys: correctIds },
    };
  }

  if (question.question_type === "true_false") {
    let correct: boolean | null = null;
    if (typeof question.correct_boolean === "boolean") {
      correct = question.correct_boolean;
    } else {
      const texts = question.answer_key?.expected_texts ?? [];
      const raw = texts[0]?.trim().toLowerCase();
      if (raw === "true" || raw === "false") {
        correct = raw === "true";
      }
    }
    if (correct === null) {
      return {
        ok: false,
        message: "true_false requires correct_boolean or expected_texts true/false",
      };
    }
    return {
      ok: true,
      dbType: "true_false",
      content: { prompt },
      answerKey: { correct },
    };
  }

  if (question.question_type === "short_text") {
    const accepted = (question.answer_key?.expected_texts ?? [])
      .map((t) => t.trim())
      .filter(Boolean);
    if (accepted.length < 1) {
      return {
        ok: false,
        message: "short_text requires expected_texts for graded import",
      };
    }
    return {
      ok: true,
      dbType: "short_answer",
      content: { prompt },
      answerKey: { accepted, normalization: { trim: true, case_sensitive: false } },
    };
  }

  return { ok: false, message: `unsupported question_type` };
}

export function extractId(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data === "object" && data !== null) {
    const row = data as Record<string, unknown>;
    for (const key of [
      "id",
      "course_id",
      "section_id",
      "lesson_id",
      "block_id",
      "activity_id",
      "question_id",
    ]) {
      if (typeof row[key] === "string") return row[key] as string;
    }
  }
  return null;
}

/**
 * Rollback contract (pre-publish / pre-enrollment only):
 * - Prefer archive of draft course via existing archive RPC.
 * - Never delete learner progress/notes/bookmarks/attempts.
 * - If course is published or has enrollments → fail closed.
 */
export function describeDraftImportRollbackContract(): {
  allowed_when: string[];
  forbidden: string[];
  preferred_action: string;
} {
  return {
    allowed_when: [
      "course.status === draft",
      "no active learner enrollments",
      "no published learner-facing content required",
    ],
    forbidden: [
      "delete learner progress",
      "delete notes",
      "delete bookmarks",
      "delete attempts/submissions",
      "auto-delete published trees",
    ],
    preferred_action:
      "archive_learning_course (and archive draft children) after operator review",
  };
}
