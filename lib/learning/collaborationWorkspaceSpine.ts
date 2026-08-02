/**
 * UM Learning OS — Collaboration Platform Workspace Spine Foundation V1.
 *
 * Derive-first course workspace identity over existing Spaces membership and
 * course entitlement. No second membership system, no migration, no realtime,
 * no shared files, no AI shared memory.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LEARNING_COMMUNITY_ROUTES } from "./communityFoundation";
import { LEARNING_LIVE_ROUTES } from "./liveCalendarFoundation";
import { LEARNING_LEARNER_ROUTES } from "./learnerDelivery";
import { LEARNING_SPACE_HELPERS } from "./spacesFoundation";

type AnyClient = SupabaseClient;

export const COLLABORATION_WORKSPACE_SPINE_ID =
  "learning.collaboration.workspace_spine_foundation_v1" as const;

export const COLLABORATION_WORKSPACE_IDENTITY_PREFIX = "lwsp_v1" as const;

export const LEARNING_COLLABORATION_WORKSPACE_ROUTES = {
  workspace: (courseId: string) =>
    `/learning/courses/${courseId}/workspace`,
} as const;

export const COLLABORATION_WORKSPACE_ATTACHMENT_IDS = [
  "community",
  "live",
  "assignments_projects",
  "tutor",
] as const;

export type CollaborationWorkspaceAttachmentId =
  (typeof COLLABORATION_WORKSPACE_ATTACHMENT_IDS)[number];

export type CollaborationWorkspaceAttachmentState = "empty" | "unavailable";

export type CollaborationWorkspaceAttachmentSlot = {
  id: CollaborationWorkspaceAttachmentId;
  label: string;
  state: CollaborationWorkspaceAttachmentState;
  reason: "spine_foundation_v1_no_attachment_payload";
  /**
   * Optional pointer to an existing Learning surface (not a workspace payload).
   * Null when no stable course-level surface exists yet (e.g. tutor needs lesson).
   */
  relatedHref: string | null;
};

export type CollaborationWorkspaceIdentity = {
  /** Deterministic key — not a persisted row id. */
  workspaceKey: string;
  courseId: string;
  spaceId: string;
  capability: typeof COLLABORATION_WORKSPACE_SPINE_ID;
};

export type CollaborationWorkspaceCourseBinding = {
  courseId: string;
  courseName: string;
  courseSlug: string;
  programId: string;
  status: string;
};

export type CollaborationWorkspaceSpaceBinding = {
  spaceId: string;
  spaceName: string;
  spaceSlug: string;
  status: string;
};

/**
 * Access uses existing course entitlement (RLS) as the gate.
 * Space membership is contextual only — never a substitute for entitlement.
 */
export type CollaborationWorkspaceAccess = {
  learnerUserId: string;
  courseEntitled: true;
  /** Active Space membership when readable; null when unknown/unavailable. */
  spaceMemberActive: boolean | null;
  membershipModel: "spaces_foundation_v1";
  authorizationModel: "course_entitlement_rls";
};

export type CollaborationWorkspaceView = {
  identity: CollaborationWorkspaceIdentity;
  course: CollaborationWorkspaceCourseBinding;
  space: CollaborationWorkspaceSpaceBinding;
  access: CollaborationWorkspaceAccess;
  attachments: CollaborationWorkspaceAttachmentSlot[];
};

export type CollaborationWorkspaceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: CollaborationWorkspaceErrorCode; message: string };

export type CollaborationWorkspaceErrorCode =
  | "invalid_course_id"
  | "invalid_learner_id"
  | "course_unavailable"
  | "program_unavailable"
  | "space_unavailable"
  | "unauthorized";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCollaborationWorkspaceUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Stable derive-first identity. Same courseId + spaceId ⇒ same workspaceKey.
 * No database row; no workspace membership table.
 */
export function deriveCollaborationWorkspaceIdentity(input: {
  courseId: string;
  spaceId: string;
}): CollaborationWorkspaceResult<CollaborationWorkspaceIdentity> {
  const courseId = input.courseId.trim();
  const spaceId = input.spaceId.trim();
  if (!isCollaborationWorkspaceUuid(courseId)) {
    return {
      ok: false,
      code: "invalid_course_id",
      message: "Course id is invalid.",
    };
  }
  if (!isCollaborationWorkspaceUuid(spaceId)) {
    return {
      ok: false,
      code: "space_unavailable",
      message: "Parent Learning Space id is invalid.",
    };
  }
  return {
    ok: true,
    data: {
      workspaceKey: `${COLLABORATION_WORKSPACE_IDENTITY_PREFIX}:${spaceId}:${courseId}`,
      courseId,
      spaceId,
      capability: COLLABORATION_WORKSPACE_SPINE_ID,
    },
  };
}

/** Explicit V1 attachment slots — empty/unavailable only; no collab payloads. */
export function buildCollaborationWorkspaceAttachmentSlots(input: {
  courseId: string;
}): CollaborationWorkspaceAttachmentSlot[] {
  const courseId = input.courseId.trim();
  const courseOk = isCollaborationWorkspaceUuid(courseId);
  return [
    {
      id: "community",
      label: "Community",
      state: "empty",
      reason: "spine_foundation_v1_no_attachment_payload",
      relatedHref: courseOk ? LEARNING_COMMUNITY_ROUTES.hub(courseId) : null,
    },
    {
      id: "live",
      label: "Live",
      state: "empty",
      reason: "spine_foundation_v1_no_attachment_payload",
      relatedHref: courseOk
        ? LEARNING_LIVE_ROUTES.learnerSchedule(courseId)
        : null,
    },
    {
      id: "assignments_projects",
      label: "Assignments & projects",
      state: "unavailable",
      reason: "spine_foundation_v1_no_attachment_payload",
      // Course outline is the safe related surface; no assignment-bucket reuse.
      relatedHref: courseOk ? LEARNING_LEARNER_ROUTES.course(courseId) : null,
    },
    {
      id: "tutor",
      label: "AI Tutor",
      state: "unavailable",
      reason: "spine_foundation_v1_no_attachment_payload",
      // Tutor is lesson-scoped; no course-level shared tutor memory in V1.
      relatedHref: null,
    },
  ];
}

/**
 * Resolve the spine view for an entitled learner.
 * Fail closed when course entitlement or parent space cannot be resolved.
 */
export async function loadCollaborationWorkspaceSpine(
  supabase: AnyClient,
  input: { courseId: string; learnerUserId: string }
): Promise<CollaborationWorkspaceResult<CollaborationWorkspaceView>> {
  const courseId = input.courseId.trim();
  const learnerUserId = input.learnerUserId.trim();

  if (!isCollaborationWorkspaceUuid(courseId)) {
    return {
      ok: false,
      code: "invalid_course_id",
      message: "Course id is invalid.",
    };
  }
  if (!isCollaborationWorkspaceUuid(learnerUserId)) {
    return {
      ok: false,
      code: "invalid_learner_id",
      message: "Learner id is invalid.",
    };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const authUid = asString(authData.user?.id);
  if (authError || !authUid || authUid !== learnerUserId) {
    return {
      ok: false,
      code: "unauthorized",
      message: "Authentication required.",
    };
  }

  const { data: course, error: courseError } = await supabase
    .from("learning_courses")
    .select("id, name, slug, program_id, status")
    .eq("id", courseId)
    .eq("status", "published")
    .maybeSingle();

  if (courseError || !course) {
    return {
      ok: false,
      code: "course_unavailable",
      message: "Course not found or not accessible.",
    };
  }

  const programId = asString(course.program_id);
  if (!programId) {
    return {
      ok: false,
      code: "program_unavailable",
      message: "Course program binding is missing.",
    };
  }

  const { data: program, error: programError } = await supabase
    .from("learning_programs")
    .select("id, space_id, status")
    .eq("id", programId)
    .maybeSingle();

  if (programError || !program) {
    return {
      ok: false,
      code: "program_unavailable",
      message: "Program not found or not accessible.",
    };
  }

  const spaceId = asString(program.space_id);
  if (!spaceId) {
    return {
      ok: false,
      code: "space_unavailable",
      message: "Parent Learning Space is missing.",
    };
  }

  const { data: space, error: spaceError } = await supabase
    .from("learning_spaces")
    .select("id, name, slug, status")
    .eq("id", spaceId)
    .maybeSingle();

  if (spaceError || !space) {
    return {
      ok: false,
      code: "space_unavailable",
      message: "Parent Learning Space not found or not accessible.",
    };
  }

  const identity = deriveCollaborationWorkspaceIdentity({
    courseId,
    spaceId,
  });
  if (!identity.ok) return identity;

  let spaceMemberActive: boolean | null = null;
  const { data: memberFlag, error: memberError } = await supabase.rpc(
    LEARNING_SPACE_HELPERS.isMember,
    { p_space_id: spaceId, p_user_id: learnerUserId }
  );
  if (!memberError && typeof memberFlag === "boolean") {
    spaceMemberActive = memberFlag;
  }

  return {
    ok: true,
    data: {
      identity: identity.data,
      course: {
        courseId: asString(course.id) ?? courseId,
        courseName: asString(course.name) ?? "Course",
        courseSlug: asString(course.slug) ?? courseId,
        programId,
        status: asString(course.status) ?? "published",
      },
      space: {
        spaceId: asString(space.id) ?? spaceId,
        spaceName: asString(space.name) ?? "Learning Space",
        spaceSlug: asString(space.slug) ?? spaceId,
        status: asString(space.status) ?? "unknown",
      },
      access: {
        learnerUserId,
        courseEntitled: true,
        spaceMemberActive,
        membershipModel: "spaces_foundation_v1",
        authorizationModel: "course_entitlement_rls",
      },
      attachments: buildCollaborationWorkspaceAttachmentSlots({ courseId }),
    },
  };
}
