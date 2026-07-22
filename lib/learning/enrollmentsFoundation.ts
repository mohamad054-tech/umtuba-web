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
