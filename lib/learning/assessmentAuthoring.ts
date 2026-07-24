/**
 * UM Learning OS — Question & Assessment Authoring Minimal V1.
 *
 * Typed, allowlisted wrappers over existing question RPCs
 * (`20260837_learning_questions_foundation_v1.sql`). DB remains the final
 * authorization authority. No direct table writes. No moderate. No activity
 * settings / result-policy mutation. Answer keys travel only through
 * `set_learning_question_answer_key` and are never returned to learner surfaces.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LEARNING_QUESTION_ANSWER_KEY_KEYS,
  LEARNING_QUESTION_CONTENT_KEYS,
  LEARNING_QUESTION_CREATABLE_TYPES,
  LEARNING_QUESTION_HELPERS,
  LEARNING_QUESTION_KEY_PATTERN,
  LEARNING_QUESTION_LIMITS,
  LEARNING_QUESTION_NORMALIZATION_KEYS,
  LEARNING_QUESTION_RPCS,
  type LearningQuestionCreatableType,
} from "./questionsFoundation";
import { LEARNING_ACTIVITY_HELPERS } from "./activitiesFoundation";
import { LEARNING_INSTRUCTOR_ROUTES } from "./instructorAuthoring";

type AnyClient = SupabaseClient;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ASSESSMENT_AUTHORING_FORBIDDEN_INPUT_KEYS = [
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
  "published_at",
  "suspended_at",
  "archived_at",
  "status",
  "position",
  "actor_id",
  "user_id",
  "staff_role",
  "role",
  "ownership",
  "audit_actor",
  "question_type", // immutable after create — accepted only on create
  "activity_id", // accepted only where the operation requires it
] as const;

export const ASSESSMENT_AUTHORING_OPERATIONS = [
  "create_question",
  "update_question",
  "publish_question",
  "unpublish_question",
  "archive_question",
  "reorder_questions",
  "set_answer_key",
] as const;

export type AssessmentAuthoringOperation =
  (typeof ASSESSMENT_AUTHORING_OPERATIONS)[number];

export const ASSESSMENT_AUTHORING_RPC_BY_OPERATION = {
  create_question: LEARNING_QUESTION_RPCS.create,
  update_question: LEARNING_QUESTION_RPCS.update,
  publish_question: LEARNING_QUESTION_RPCS.publish,
  unpublish_question: LEARNING_QUESTION_RPCS.unpublish,
  archive_question: LEARNING_QUESTION_RPCS.archive,
  reorder_questions: LEARNING_QUESTION_RPCS.reorder,
  set_answer_key: LEARNING_QUESTION_RPCS.setAnswerKey,
} as const satisfies Record<AssessmentAuthoringOperation, string>;

/** Explicitly out of Assessment Authoring Minimal V1. */
export const ASSESSMENT_AUTHORING_EXCLUDED_OPERATIONS = [
  "moderate_question",
  "update_activity_settings",
  "create_program",
  "create_course",
  "randomize",
  "question_bank",
] as const;

export const LEARNING_ASSESSMENT_ROUTES = {
  activityQuestions: (courseId: string, activityId: string) =>
    `/learning/instructor/courses/${courseId}/activities/${activityId}/questions`,
} as const;

export type AssessmentAuthoringOk = { ok: true; data: unknown };
export type AssessmentAuthoringErr = { ok: false; message: string };
export type AssessmentAuthoringResult =
  | AssessmentAuthoringOk
  | AssessmentAuthoringErr;

/** Staff-safe question row for authoring lists — never includes answer_key. */
export type AssessmentAuthoringQuestion = {
  id: string;
  activity_id: string;
  question_type: string;
  status: string;
  position: number;
  content: Record<string, unknown>;
  points: number | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  /** Presence flag only — never the key payload. */
  has_answer_key: boolean;
};

export type AssessmentAuthoringActivityContext = {
  activity: {
    id: string;
    lesson_id: string;
    name: string;
    slug: string;
    status: string;
    type: string;
    description: string | null;
  };
  courseId: string;
  lessonId: string;
  canCreate: boolean;
  canManageActivity: boolean;
  questions: AssessmentAuthoringQuestion[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function rejectUnknownKeys(
  input: Record<string, unknown>,
  allowed: readonly string[]
): string | null {
  const allow = new Set(allowed);
  for (const key of Object.keys(input)) {
    if (!allow.has(key)) return `Unknown field: ${key}`;
  }
  return null;
}

function rejectForbiddenKeys(
  input: Record<string, unknown>,
  allowedParents: readonly string[] = []
): string | null {
  const parentAllow = new Set(allowedParents);
  for (const key of Object.keys(input)) {
    if (
      (ASSESSMENT_AUTHORING_FORBIDDEN_INPUT_KEYS as readonly string[]).includes(
        key
      )
    ) {
      if (parentAllow.has(key)) continue;
      return `Forbidden field: ${key}`;
    }
  }
  return null;
}

function requireUuid(value: unknown, label: string): string | null {
  if (typeof value !== "string" || !isUuid(value)) {
    return `${label} must be a valid UUID`;
  }
  return null;
}

function parseUuidList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !isUuid(item)) return null;
    out.push(item);
  }
  if (new Set(out).size !== out.length) return null;
  return out;
}

function parsePoints(
  value: unknown
): { ok: true; value: number | null | undefined } | { ok: false; message: string } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null || value === "") return { ok: true, value: null };
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, message: "points must be a non-negative number" };
  }
  return { ok: true, value: n };
}

function isCreatableType(value: unknown): value is LearningQuestionCreatableType {
  return (
    typeof value === "string" &&
    (LEARNING_QUESTION_CREATABLE_TYPES as readonly string[]).includes(value)
  );
}

function validateContentShape(
  questionType: LearningQuestionCreatableType,
  content: Record<string, unknown>
): string | null {
  const allowed = LEARNING_QUESTION_CONTENT_KEYS[questionType];
  for (const key of Object.keys(content)) {
    if (!(allowed as readonly string[]).includes(key)) {
      return `content contains unexpected key ${key} for type ${questionType}`;
    }
  }
  if (typeof content.prompt !== "string" || !content.prompt.trim()) {
    return "content.prompt is required";
  }
  if (content.prompt.length > LEARNING_QUESTION_LIMITS.promptMaxChars) {
    return "content.prompt exceeds maximum length";
  }

  if (
    questionType === "multiple_choice_single" ||
    questionType === "multiple_choice_multiple"
  ) {
    if (!Array.isArray(content.options)) {
      return "content.options must be an array";
    }
    if (
      content.options.length < LEARNING_QUESTION_LIMITS.minOptions ||
      content.options.length > LEARNING_QUESTION_LIMITS.maxOptions
    ) {
      return `content.options must contain ${LEARNING_QUESTION_LIMITS.minOptions}–${LEARNING_QUESTION_LIMITS.maxOptions} entries`;
    }
    const keys = new Set<string>();
    for (const opt of content.options) {
      if (!isPlainObject(opt)) return "each option must be an object";
      for (const k of Object.keys(opt)) {
        if (k !== "key" && k !== "text") {
          return `option contains unexpected key ${k}`;
        }
      }
      if (typeof opt.key !== "string" || !LEARNING_QUESTION_KEY_PATTERN.test(opt.key)) {
        return "option.key is invalid";
      }
      if (keys.has(opt.key)) return "option keys must be unique";
      keys.add(opt.key);
      if (
        typeof opt.text !== "string" ||
        opt.text.length < 1 ||
        opt.text.length > LEARNING_QUESTION_LIMITS.optionTextMaxChars
      ) {
        return "option.text must be 1–1000 characters";
      }
    }
  }

  if (questionType === "fill_blank") {
    if (!Array.isArray(content.blanks)) {
      return "content.blanks must be an array";
    }
    if (
      content.blanks.length < 1 ||
      content.blanks.length > LEARNING_QUESTION_LIMITS.maxBlanks
    ) {
      return "content.blanks count is out of range";
    }
    const keys = new Set<string>();
    for (const blank of content.blanks) {
      if (!isPlainObject(blank)) return "each blank must be an object";
      if (Object.keys(blank).some((k) => k !== "key")) {
        return "blank contains unexpected key";
      }
      if (
        typeof blank.key !== "string" ||
        !LEARNING_QUESTION_KEY_PATTERN.test(blank.key)
      ) {
        return "blank.key is invalid";
      }
      if (keys.has(blank.key)) return "blank keys must be unique";
      keys.add(blank.key);
    }
  }

  if (questionType === "numeric" && content.unit !== undefined) {
    if (
      typeof content.unit !== "string" ||
      content.unit.length > LEARNING_QUESTION_LIMITS.unitMaxChars
    ) {
      return "unit must be a string up to 64 chars";
    }
  }

  return null;
}

function validateAnswerKeyShape(
  questionType: LearningQuestionCreatableType,
  answerKey: Record<string, unknown>
): string | null {
  const allowed = LEARNING_QUESTION_ANSWER_KEY_KEYS[questionType];
  for (const key of Object.keys(answerKey)) {
    if (!(allowed as readonly string[]).includes(key)) {
      return `answer_key contains unexpected key ${key} for type ${questionType}`;
    }
  }

  switch (questionType) {
    case "multiple_choice_single":
      if (typeof answerKey.correct_key !== "string") {
        return "answer_key.correct_key must be a string";
      }
      break;
    case "multiple_choice_multiple":
      if (
        !Array.isArray(answerKey.correct_keys) ||
        answerKey.correct_keys.length < 1 ||
        answerKey.correct_keys.some((k) => typeof k !== "string")
      ) {
        return "answer_key.correct_keys must be a non-empty string array";
      }
      break;
    case "true_false":
      if (typeof answerKey.correct !== "boolean") {
        return "answer_key.correct must be a boolean";
      }
      break;
    case "short_answer": {
      if (
        !Array.isArray(answerKey.accepted) ||
        answerKey.accepted.length < 1 ||
        answerKey.accepted.length > LEARNING_QUESTION_LIMITS.shortAnswerMaxAccepted
      ) {
        return "answer_key.accepted must be a non-empty array (max 20)";
      }
      for (const a of answerKey.accepted) {
        if (
          typeof a !== "string" ||
          a.length < 1 ||
          a.length > LEARNING_QUESTION_LIMITS.shortAnswerAnswerMaxChars
        ) {
          return "answer_key.accepted entries must be 1–200 chars";
        }
      }
      if (answerKey.normalization !== undefined) {
        if (!isPlainObject(answerKey.normalization)) {
          return "answer_key.normalization must be an object";
        }
        for (const k of Object.keys(answerKey.normalization)) {
          if (
            !(LEARNING_QUESTION_NORMALIZATION_KEYS as readonly string[]).includes(
              k
            )
          ) {
            return `answer_key.normalization contains unexpected key ${k}`;
          }
          if (typeof answerKey.normalization[k] !== "boolean") {
            return `answer_key.normalization.${k} must be a boolean`;
          }
        }
      }
      break;
    }
    case "fill_blank":
      if (!isPlainObject(answerKey.answers)) {
        return "answer_key.answers must be an object";
      }
      break;
    case "numeric": {
      if (typeof answerKey.value !== "number" || !Number.isFinite(answerKey.value)) {
        return "answer_key.value must be a number";
      }
      if (answerKey.tolerance !== undefined) {
        if (
          typeof answerKey.tolerance !== "number" ||
          !Number.isFinite(answerKey.tolerance) ||
          answerKey.tolerance < 0
        ) {
          return "answer_key.tolerance must be a non-negative number";
        }
      }
      break;
    }
  }
  return null;
}

export function sanitizeAssessmentRpcError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Request could not be completed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("permission") ||
    lower.includes("not allowed") ||
    lower.includes("not entitled") ||
    lower.includes("authentication required")
  ) {
    return "You are not allowed to perform this action.";
  }
  if (lower.includes("not found")) {
    return "The requested item was not found.";
  }
  if (lower.includes("suspended")) {
    return "This item cannot be changed while suspended.";
  }
  if (lower.includes("archived")) {
    return "Archived items cannot be changed this way.";
  }
  if (lower.includes("reorder")) {
    return "Reorder failed. Provide the complete ordered id list.";
  }
  if (
    lower.includes("reserved") ||
    lower.includes("unsupported question type") ||
    lower.includes("cannot be created")
  ) {
    return "That question type is not supported.";
  }
  if (
    lower.includes("relation ") ||
    lower.includes("column ") ||
    lower.includes("policy") ||
    lower.includes("violates")
  ) {
    return "Request could not be completed.";
  }
  if (raw.length > 180) return "Request could not be completed.";
  return raw;
}

async function callRpc(
  supabase: AnyClient,
  rpcName: string,
  args: Record<string, unknown>
): Promise<AssessmentAuthoringResult> {
  const { data, error } = await supabase.rpc(rpcName, args);
  if (error) {
    return { ok: false, message: sanitizeAssessmentRpcError(error.message) };
  }
  return { ok: true, data };
}

/**
 * Validate and map a single assessment authoring operation to an existing RPC.
 */
export function buildAssessmentAuthoringRpcCall(
  operation: string,
  rawInput: unknown
):
  | { ok: true; rpc: string; args: Record<string, unknown> }
  | AssessmentAuthoringErr {
  if (
    !(ASSESSMENT_AUTHORING_OPERATIONS as readonly string[]).includes(operation)
  ) {
    return { ok: false, message: "Unknown assessment authoring operation." };
  }
  if (!isPlainObject(rawInput)) {
    return { ok: false, message: "Input must be an object." };
  }

  const rpc =
    ASSESSMENT_AUTHORING_RPC_BY_OPERATION[
      operation as AssessmentAuthoringOperation
    ];

  switch (operation as AssessmentAuthoringOperation) {
    case "create_question": {
      const err =
        rejectForbiddenKeys(rawInput, ["activity_id", "question_type"]) ??
        rejectUnknownKeys(rawInput, [
          "activity_id",
          "question_type",
          "content",
          "points",
        ]) ??
        requireUuid(rawInput.activity_id, "activity_id");
      if (err) return { ok: false, message: err };
      if (!isCreatableType(rawInput.question_type)) {
        return { ok: false, message: "Invalid or unsupported question type." };
      }
      if (!isPlainObject(rawInput.content)) {
        return { ok: false, message: "content is required and must be an object." };
      }
      const contentErr = validateContentShape(
        rawInput.question_type,
        rawInput.content
      );
      if (contentErr) return { ok: false, message: contentErr };
      const points = parsePoints(rawInput.points);
      if (!points.ok) return points;
      const args: Record<string, unknown> = {
        p_activity_id: rawInput.activity_id,
        p_question_type: rawInput.question_type,
        p_content: rawInput.content,
      };
      if (points.value !== undefined) {
        args.p_points = points.value;
      }
      return { ok: true, rpc, args };
    }
    case "update_question": {
      const err =
        rejectForbiddenKeys(rawInput) ??
        rejectUnknownKeys(rawInput, [
          "question_id",
          "content",
          "points",
          "clear_points",
        ]) ??
        requireUuid(rawInput.question_id, "question_id");
      if (err) return { ok: false, message: err };
      const hasContent = rawInput.content !== undefined;
      const hasPoints = rawInput.points !== undefined;
      const clearPoints = rawInput.clear_points === true;
      if (!hasContent && !hasPoints && !clearPoints) {
        return { ok: false, message: "Nothing to update." };
      }
      if (hasContent) {
        if (!isPlainObject(rawInput.content)) {
          return {
            ok: false,
            message: "content must be an object when provided.",
          };
        }
        // Type is immutable; full per-type validation needs DB type.
        // Reject unknown top-level correctness keys that must never live in content.
        for (const k of Object.keys(rawInput.content)) {
          if (
            k === "correct" ||
            k === "correct_key" ||
            k === "correct_keys" ||
            k === "accepted" ||
            k === "answers" ||
            k === "value" ||
            k === "tolerance" ||
            k === "answer_key"
          ) {
            return {
              ok: false,
              message: "Correctness fields are not allowed in content.",
            };
          }
        }
        if (typeof rawInput.content.prompt !== "string") {
          return { ok: false, message: "content.prompt is required" };
        }
      }
      const points = parsePoints(rawInput.points);
      if (!points.ok) return points;
      const args: Record<string, unknown> = {
        p_question_id: rawInput.question_id,
      };
      if (hasContent) args.p_content = rawInput.content;
      if (points.value !== undefined) args.p_points = points.value;
      if (clearPoints) args.p_clear_points = true;
      return { ok: true, rpc, args };
    }
    case "publish_question":
    case "unpublish_question":
    case "archive_question": {
      const err =
        rejectForbiddenKeys(rawInput) ??
        rejectUnknownKeys(rawInput, ["question_id"]) ??
        requireUuid(rawInput.question_id, "question_id");
      if (err) return { ok: false, message: err };
      return { ok: true, rpc, args: { p_question_id: rawInput.question_id } };
    }
    case "reorder_questions": {
      const err =
        rejectForbiddenKeys(rawInput, ["activity_id"]) ??
        rejectUnknownKeys(rawInput, ["activity_id", "question_ids"]) ??
        requireUuid(rawInput.activity_id, "activity_id");
      if (err) return { ok: false, message: err };
      const ids = parseUuidList(rawInput.question_ids);
      if (!ids) {
        return {
          ok: false,
          message: "question_ids must be a non-empty unique UUID list.",
        };
      }
      return {
        ok: true,
        rpc,
        args: {
          p_activity_id: rawInput.activity_id,
          p_question_ids: ids,
        },
      };
    }
    case "set_answer_key": {
      const err =
        rejectForbiddenKeys(rawInput, ["question_type"]) ??
        rejectUnknownKeys(rawInput, [
          "question_id",
          "answer_key",
          "question_type",
        ]) ??
        requireUuid(rawInput.question_id, "question_id");
      if (err) return { ok: false, message: err };
      if (!isPlainObject(rawInput.answer_key)) {
        return {
          ok: false,
          message: "answer_key is required and must be an object.",
        };
      }
      // Optional client-side type hint for early validation only; never sent to RPC.
      if (rawInput.question_type !== undefined) {
        if (!isCreatableType(rawInput.question_type)) {
          return { ok: false, message: "Invalid or unsupported question type." };
        }
        const keyErr = validateAnswerKeyShape(
          rawInput.question_type,
          rawInput.answer_key
        );
        if (keyErr) return { ok: false, message: keyErr };
      }
      return {
        ok: true,
        rpc,
        args: {
          p_question_id: rawInput.question_id,
          p_answer_key: rawInput.answer_key,
        },
      };
    }
    default:
      return { ok: false, message: "Unknown assessment authoring operation." };
  }
}

export async function runAssessmentAuthoringOperation(
  supabase: AnyClient,
  operation: string,
  rawInput: unknown
): Promise<AssessmentAuthoringResult> {
  const built = buildAssessmentAuthoringRpcCall(operation, rawInput);
  if (!built.ok) return built;
  return callRpc(supabase, built.rpc, built.args);
}

/** UX pre-check — RPC remains authoritative. */
export async function canCreateLearningQuestionUx(
  supabase: AnyClient,
  activityId: string
): Promise<boolean> {
  if (!isUuid(activityId)) return false;
  const { data, error } = await supabase.rpc(LEARNING_QUESTION_HELPERS.canCreate, {
    p_activity_id: activityId,
  });
  if (error) return false;
  return data === true;
}

export async function canManageLearningActivityUx(
  supabase: AnyClient,
  activityId: string
): Promise<boolean> {
  if (!isUuid(activityId)) return false;
  const { data, error } = await supabase.rpc(
    LEARNING_ACTIVITY_HELPERS.canManage,
    { p_activity_id: activityId }
  );
  if (error) return false;
  return data === true;
}

/**
 * Strip any accidental answer-key material from a staff question row before
 * handing it to UI props. Learner routes must never call this loader.
 */
export function toStaffSafeQuestion(
  row: Record<string, unknown>,
  hasAnswerKey: boolean
): AssessmentAuthoringQuestion {
  const content = isPlainObject(row.content) ? { ...row.content } : {};
  // Defensive: never allow correctness keys to ride along in content props.
  delete content.correct;
  delete content.correct_key;
  delete content.correct_keys;
  delete content.accepted;
  delete content.answers;
  delete content.value;
  delete content.tolerance;
  delete content.answer_key;

  return {
    id: String(row.id),
    activity_id: String(row.activity_id),
    question_type: String(row.question_type),
    status: String(row.status),
    position: Number(row.position) || 0,
    content,
    points: row.points == null ? null : Number(row.points),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    published_at:
      row.published_at == null ? null : String(row.published_at),
    has_answer_key: hasAnswerKey,
  };
}

/**
 * Load activity + staff-visible questions via JWT SELECT/RLS.
 * Answer key payloads are never selected — only question_id presence.
 */
export async function loadAssessmentActivityQuestions(
  supabase: AnyClient,
  courseId: string,
  activityId: string
): Promise<AssessmentAuthoringResult> {
  if (!isUuid(courseId) || !isUuid(activityId)) {
    return { ok: false, message: "Invalid course or activity id." };
  }

  const { data: activity, error: activityError } = await supabase
    .from("learning_activities")
    .select("id, lesson_id, name, slug, status, type, description")
    .eq("id", activityId)
    .maybeSingle();
  if (activityError) {
    return {
      ok: false,
      message: sanitizeAssessmentRpcError(activityError.message),
    };
  }
  if (!activity) {
    return { ok: false, message: "Activity not found or unavailable." };
  }

  const { data: lesson, error: lessonError } = await supabase
    .from("learning_lessons")
    .select("id, section_id")
    .eq("id", activity.lesson_id)
    .maybeSingle();
  if (lessonError) {
    return {
      ok: false,
      message: sanitizeAssessmentRpcError(lessonError.message),
    };
  }
  if (!lesson) {
    return { ok: false, message: "Lesson not found or unavailable." };
  }

  const { data: section, error: sectionError } = await supabase
    .from("learning_sections")
    .select("id, course_id")
    .eq("id", lesson.section_id)
    .maybeSingle();
  if (sectionError) {
    return {
      ok: false,
      message: sanitizeAssessmentRpcError(sectionError.message),
    };
  }
  if (!section || section.course_id !== courseId) {
    return {
      ok: false,
      message: "Activity is not available in this course.",
    };
  }

  const { data: questionRows, error: questionsError } = await supabase
    .from("learning_questions")
    .select(
      "id, activity_id, question_type, status, position, content, points, created_at, updated_at, published_at"
    )
    .eq("activity_id", activityId)
    .order("position", { ascending: true });
  if (questionsError) {
    return {
      ok: false,
      message: sanitizeAssessmentRpcError(questionsError.message),
    };
  }

  const rows = (questionRows ?? []) as Array<Record<string, unknown>>;
  const questionIds = rows.map((r) => String(r.id));

  const keyPresence = new Set<string>();
  if (questionIds.length > 0) {
    // Select question_id ONLY — never the answer_key jsonb payload.
    const { data: keyRows, error: keyError } = await supabase
      .from("learning_question_answer_keys")
      .select("question_id")
      .in("question_id", questionIds);
    if (keyError) {
      return {
        ok: false,
        message: sanitizeAssessmentRpcError(keyError.message),
      };
    }
    for (const k of keyRows ?? []) {
      keyPresence.add(String((k as { question_id: string }).question_id));
    }
  }

  const [canCreate, canManageActivity] = await Promise.all([
    canCreateLearningQuestionUx(supabase, activityId),
    canManageLearningActivityUx(supabase, activityId),
  ]);

  const payload: AssessmentAuthoringActivityContext = {
    activity: {
      id: String(activity.id),
      lesson_id: String(activity.lesson_id),
      name: String(activity.name),
      slug: String(activity.slug),
      status: String(activity.status),
      type: String(activity.type),
      description: (activity.description as string | null) ?? null,
    },
    courseId,
    lessonId: String(activity.lesson_id),
    canCreate,
    canManageActivity,
    questions: rows.map((row) =>
      toStaffSafeQuestion(row, keyPresence.has(String(row.id)))
    ),
  };

  return { ok: true, data: payload };
}

export function assessmentRevalidatePaths(
  courseId: string,
  activityId: string
): string[] {
  return [
    LEARNING_INSTRUCTOR_ROUTES.hub,
    LEARNING_INSTRUCTOR_ROUTES.course(courseId),
    LEARNING_ASSESSMENT_ROUTES.activityQuestions(courseId, activityId),
  ];
}
