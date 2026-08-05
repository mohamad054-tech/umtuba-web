/**
 * UM Learning OS — Enrollments Foundation V1 constants & types.
 * DB-authoritative via learning enrollment RPCs; this module mirrors SQL contracts.
 *
 * An enrollment is an ENTITLEMENT to participate in a Program XOR a Course. It is
 * NOT payment, progress, completion percentage, certificate, attempt, submission,
 * grade, seat/capacity, or membership. Its lifecycle
 * (pending|active|suspended|expired|cancelled|completed) is DISTINCT from content
 * lifecycle and INDEPENDENT of space membership.
 *
 * Locked defaults: Program XOR Course via nullable hard FKs + target_type +
 * denormalized space_id; membership independent (require_* are enroll-time
 * preconditions only); no anonymous exposure (authenticated only); one live
 * enrollment per learner per target (partial unique on non-terminal statuses);
 * payments/UEOS via soft refs (source + source_reference_type/id, no cross-product
 * FKs); dedicated append-only events + summary audit; entitlement evaluated LIVE
 * via has_learning_program_access / has_learning_course_access.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

/** Enrollment target discriminator (Program XOR Course). */
export const LEARNING_ENROLLMENT_TARGET_TYPES = ["program", "course"] as const;
export type LearningEnrollmentTargetType =
  (typeof LEARNING_ENROLLMENT_TARGET_TYPES)[number];

/** Entitlement lifecycle statuses — distinct from content lifecycle. */
export const LEARNING_ENROLLMENT_STATUSES = [
  "pending",
  "active",
  "suspended",
  "expired",
  "cancelled",
  "completed",
] as const;
export type LearningEnrollmentStatus =
  (typeof LEARNING_ENROLLMENT_STATUSES)[number];

/**
 * Non-terminal ("live") statuses. Exactly one live enrollment may exist per
 * learner per target (enforced by partial unique indexes).
 */
export const LEARNING_ENROLLMENT_LIVE_STATUSES = [
  "pending",
  "active",
  "suspended",
] as const;
export type LearningEnrollmentLiveStatus =
  (typeof LEARNING_ENROLLMENT_LIVE_STATUSES)[number];

/** Terminal statuses. Re-enrolling after a terminal row creates a NEW row. */
export const LEARNING_ENROLLMENT_TERMINAL_STATUSES = [
  "expired",
  "cancelled",
  "completed",
] as const;
export type LearningEnrollmentTerminalStatus =
  (typeof LEARNING_ENROLLMENT_TERMINAL_STATUSES)[number];

/**
 * Immutable provenance allowlist. `self_enrollment` is reserved for the
 * learner-driven enroll_in_* RPCs; manager assignment uses the others.
 */
export const LEARNING_ENROLLMENT_SOURCES = [
  "self_enrollment",
  "invitation",
  "admin_assignment",
  "institution_assignment",
  "corporate_assignment",
  "scholarship",
  "voucher",
  "gift",
  "bundle",
  "migration",
] as const;
export type LearningEnrollmentSource =
  (typeof LEARNING_ENROLLMENT_SOURCES)[number];

/** Sources a manager may assign via create_learning_enrollment (no self_enrollment). */
export const LEARNING_ENROLLMENT_ASSIGNABLE_SOURCES =
  LEARNING_ENROLLMENT_SOURCES.filter(
    (s) => s !== "self_enrollment"
  ) as ReadonlyArray<Exclude<LearningEnrollmentSource, "self_enrollment">>;

/** Append-only per-enrollment event types. */
export const LEARNING_ENROLLMENT_EVENT_TYPES = [
  "created",
  "activated",
  "suspended",
  "reinstated",
  "cancelled",
  "completed",
  "moderated",
  "expired",
] as const;
export type LearningEnrollmentEventType =
  (typeof LEARNING_ENROLLMENT_EVENT_TYPES)[number];

/** Bounded metadata limits mirrored in the SQL validator. */
export const LEARNING_ENROLLMENT_METADATA_LIMITS = {
  maxBytes: 4096,
  maxTopLevelKeys: 32,
  maxDepth: 2,
  maxArrayItems: 64,
  maxStringChars: 512,
} as const;

/** Soft-reference field limits mirrored in the SQL check constraints. */
export const LEARNING_ENROLLMENT_SOURCE_REFERENCE_LIMITS = {
  typeMaxChars: 80,
  idMaxChars: 128,
} as const;

export type LearningEnrollment = {
  id: string;
  space_id: string;
  target_type: LearningEnrollmentTargetType;
  program_id: string | null;
  course_id: string | null;
  user_id: string;
  status: LearningEnrollmentStatus;
  source: LearningEnrollmentSource;
  source_reference_type: string | null;
  source_reference_id: string | null;
  enrolled_by: string | null;
  starts_at: string | null;
  expires_at: string | null;
  activated_at: string | null;
  suspended_at: string | null;
  expired_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type LearningEnrollmentEvent = {
  id: string;
  enrollment_id: string;
  space_id: string | null;
  actor_user_id: string | null;
  event_type: LearningEnrollmentEventType;
  from_status: LearningEnrollmentStatus | null;
  to_status: LearningEnrollmentStatus | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export const LEARNING_ENROLLMENT_RPCS = {
  enrollProgram: "enroll_in_learning_program",
  enrollCourse: "enroll_in_learning_course",
  create: "create_learning_enrollment",
  activate: "activate_learning_enrollment",
  suspend: "suspend_learning_enrollment",
  reinstate: "reinstate_learning_enrollment",
  cancel: "cancel_learning_enrollment",
  complete: "complete_learning_enrollment",
  moderate: "moderate_learning_enrollment",
  expireDue: "expire_due_learning_enrollments",
} as const;

export const LEARNING_ENROLLMENT_HELPERS = {
  canManage: "can_manage_learning_enrollment",
  canEnrollProgram: "can_enroll_in_learning_program",
  canEnrollCourse: "can_enroll_in_learning_course",
  hasProgramAccess: "has_learning_program_access",
  hasCourseAccess: "has_learning_course_access",
} as const;

export const LEARNING_ENROLLMENT_AUDIT_ACTIONS = {
  create: "enrollment.create",
  activate: "enrollment.activate",
  suspend: "enrollment.suspend",
  reinstate: "enrollment.reinstate",
  cancel: "enrollment.cancel",
  complete: "enrollment.complete",
  moderation: "enrollment.moderation",
  expire: "enrollment.expire",
} as const;

export type EnrollmentResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type LearningEnrollmentMutationResult = {
  enrollment_id: string;
  status: LearningEnrollmentStatus;
  target_type?: LearningEnrollmentTargetType;
  program_id?: string | null;
  course_id?: string | null;
  user_id?: string;
};

export type CreateLearningEnrollmentInput = {
  targetType: LearningEnrollmentTargetType;
  targetId: string;
  userId: string;
  source: Exclude<LearningEnrollmentSource, "self_enrollment">;
  status?: "pending" | "active";
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type LearningEnrollmentLifecycleAction =
  | "activate"
  | "suspend"
  | "reinstate"
  | "cancel";

export type LearningCourseEnrollmentManageRow = {
  enrollment_id: string;
  user_id: string;
  status: LearningEnrollmentStatus;
  source: LearningEnrollmentSource | string;
  target_type: LearningEnrollmentTargetType | string;
};

export const LEARNING_ENROLLMENT_MANAGE_ROUTES = {
  learners: (courseId: string) =>
    `/learning/instructor/courses/${courseId}/learners`,
} as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CREATE_STATUSES = new Set(["pending", "active"]);
const STATUS_SET = new Set<string>(LEARNING_ENROLLMENT_STATUSES);
const ASSIGNABLE_SOURCE_SET = new Set<string>(
  LEARNING_ENROLLMENT_ASSIGNABLE_SOURCES
);

export function isLearningEnrollmentUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function sanitizeLearningEnrollmentError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Enrollment could not be processed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed")
  ) {
    return "You are not allowed to manage this enrollment.";
  }
  if (lower.includes("live enrollment already exists")) {
    return "A live enrollment already exists for this learner and course.";
  }
  if (lower.includes("learner profile not found")) {
    return "Learner profile not found.";
  }
  if (lower.includes("self_enrollment is reserved")) {
    return "Managers cannot create self-enrollment records.";
  }
  if (lower.includes("only pending")) {
    return "Only pending enrollments can be activated.";
  }
  if (lower.includes("only pending or active")) {
    return "Only pending or active enrollments can be suspended.";
  }
  if (lower.includes("only suspended")) {
    return "Only suspended enrollments can be reinstated.";
  }
  if (lower.includes("only live")) {
    return "Only live enrollments can be cancelled.";
  }
  if (lower.includes("must be draft or published")) {
    return "Course or program must be draft or published for enrollment.";
  }
  if (lower.includes("space must be active")) {
    return "Learning space must be active for enrollment changes.";
  }
  if (raw.length > 180) return "Enrollment could not be processed.";
  return raw;
}

export function parseLearningEnrollmentMutationResult(
  raw: unknown
): LearningEnrollmentMutationResult | null {
  const row = asRecord(raw);
  if (!row) return null;
  const enrollment_id = asString(row.enrollment_id);
  const status = asString(row.status);
  if (!enrollment_id || !status || !STATUS_SET.has(status)) return null;
  const target_type = asString(row.target_type);
  return {
    enrollment_id,
    status: status as LearningEnrollmentStatus,
    target_type:
      target_type === "program" || target_type === "course"
        ? target_type
        : undefined,
    program_id: asString(row.program_id),
    course_id: asString(row.course_id),
    user_id: asString(row.user_id) ?? undefined,
  };
}

/** UX-only: which lifecycle buttons to show. SQL still enforces transitions. */
export function enrollmentLifecycleActionsForStatus(
  status: string | null | undefined
): LearningEnrollmentLifecycleAction[] {
  switch (status) {
    case "pending":
      return ["activate", "suspend", "cancel"];
    case "active":
      return ["suspend", "cancel"];
    case "suspended":
      return ["reinstate", "cancel"];
    default:
      return [];
  }
}

export async function createLearningEnrollment(
  supabase: AnyClient,
  input: CreateLearningEnrollmentInput
): Promise<EnrollmentResult<LearningEnrollmentMutationResult>> {
  if (
    input.targetType !== "program" &&
    input.targetType !== "course"
  ) {
    return { ok: false, message: "target_type must be program or course" };
  }
  if (!isLearningEnrollmentUuid(input.targetId)) {
    return { ok: false, message: "target_id must be a valid UUID" };
  }
  if (!isLearningEnrollmentUuid(input.userId)) {
    return { ok: false, message: "user_id must be a valid UUID" };
  }
  if (!ASSIGNABLE_SOURCE_SET.has(input.source)) {
    return {
      ok: false,
      message: "Unsupported enrollment source for manager assignment.",
    };
  }
  if (input.source === ("self_enrollment" as never)) {
    return {
      ok: false,
      message: "Managers cannot create self-enrollment records.",
    };
  }
  const status = input.status ?? "active";
  if (!CREATE_STATUSES.has(status)) {
    return {
      ok: false,
      message: "create_learning_enrollment status must be pending or active",
    };
  }

  const { data, error } = await supabase.rpc(LEARNING_ENROLLMENT_RPCS.create, {
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_user_id: input.userId,
    p_source: input.source,
    p_status: status,
    p_source_reference_type: input.sourceReferenceType ?? null,
    p_source_reference_id: input.sourceReferenceId ?? null,
    p_starts_at: input.startsAt ?? null,
    p_expires_at: input.expiresAt ?? null,
    p_metadata: input.metadata ?? {},
  });
  if (error) {
    return { ok: false, message: sanitizeLearningEnrollmentError(error.message) };
  }
  const parsed = parseLearningEnrollmentMutationResult(data);
  if (!parsed) {
    return { ok: false, message: "Enrollment create payload is malformed." };
  }
  return { ok: true, data: parsed };
}

async function runEnrollmentLifecycleRpc(
  supabase: AnyClient,
  rpc: string,
  enrollmentId: string
): Promise<EnrollmentResult<LearningEnrollmentMutationResult>> {
  if (!isLearningEnrollmentUuid(enrollmentId)) {
    return { ok: false, message: "enrollment_id must be a valid UUID" };
  }
  const { data, error } = await supabase.rpc(rpc, {
    p_enrollment_id: enrollmentId,
  });
  if (error) {
    return { ok: false, message: sanitizeLearningEnrollmentError(error.message) };
  }
  const parsed = parseLearningEnrollmentMutationResult(data);
  if (!parsed) {
    return { ok: false, message: "Enrollment lifecycle payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export async function activateLearningEnrollment(
  supabase: AnyClient,
  enrollmentId: string
): Promise<EnrollmentResult<LearningEnrollmentMutationResult>> {
  return runEnrollmentLifecycleRpc(
    supabase,
    LEARNING_ENROLLMENT_RPCS.activate,
    enrollmentId
  );
}

export async function suspendLearningEnrollment(
  supabase: AnyClient,
  enrollmentId: string
): Promise<EnrollmentResult<LearningEnrollmentMutationResult>> {
  return runEnrollmentLifecycleRpc(
    supabase,
    LEARNING_ENROLLMENT_RPCS.suspend,
    enrollmentId
  );
}

export async function reinstateLearningEnrollment(
  supabase: AnyClient,
  enrollmentId: string
): Promise<EnrollmentResult<LearningEnrollmentMutationResult>> {
  return runEnrollmentLifecycleRpc(
    supabase,
    LEARNING_ENROLLMENT_RPCS.reinstate,
    enrollmentId
  );
}

export async function cancelLearningEnrollment(
  supabase: AnyClient,
  enrollmentId: string
): Promise<EnrollmentResult<LearningEnrollmentMutationResult>> {
  return runEnrollmentLifecycleRpc(
    supabase,
    LEARNING_ENROLLMENT_RPCS.cancel,
    enrollmentId
  );
}

/**
 * Load course enrollments for instructor lifecycle controls.
 * Relies on manager RLS SELECT; fail closed on query errors.
 */
export async function loadCourseEnrollmentsForManage(
  supabase: AnyClient,
  courseId: string
): Promise<EnrollmentResult<LearningCourseEnrollmentManageRow[]>> {
  if (!isLearningEnrollmentUuid(courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }
  const { data, error } = await supabase
    .from("learning_enrollments")
    .select("id, user_id, status, source, target_type, course_id")
    .eq("course_id", courseId)
    .in("status", ["pending", "active", "suspended", "completed"])
    .order("created_at", { ascending: false });
  if (error) {
    return { ok: false, message: sanitizeLearningEnrollmentError(error.message) };
  }
  const rows: LearningCourseEnrollmentManageRow[] = [];
  for (const item of data ?? []) {
    const enrollment_id = asString((item as { id?: unknown }).id);
    const user_id = asString((item as { user_id?: unknown }).user_id);
    const status = asString((item as { status?: unknown }).status);
    const source = asString((item as { source?: unknown }).source) ?? "";
    const target_type =
      asString((item as { target_type?: unknown }).target_type) ?? "course";
    if (!enrollment_id || !user_id || !status || !STATUS_SET.has(status)) {
      continue;
    }
    rows.push({
      enrollment_id,
      user_id,
      status: status as LearningEnrollmentStatus,
      source,
      target_type,
    });
  }
  return { ok: true, data: rows };
}
