/**
 * UM Learning OS — Collaboration Workspace Attachments Foundation V1.
 *
 * Wires existing Learning surfaces into the workspace spine as summary cards.
 * No realtime, shared documents, shared AI memory, Commerce, or migrations.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LEARNING_AI_TUTOR_ROUTES,
  listMyAiTutorThreads,
} from "./aiTutorFoundation";
import { LEARNING_ASSIGNMENT_ROUTES, loadMyAssignment } from "./assignmentsCoursework";
import {
  LEARNING_COMMUNITY_ROUTES,
  getLearningCourseCommunityFeed,
  readCommunityItems,
  readCommunityNumber,
  readCommunityString,
} from "./communityFoundation";
import {
  isCollaborationWorkspaceUuid,
  type CollaborationWorkspaceAttachmentId,
} from "./collaborationWorkspaceSpine";
import { LEARNING_LEARNER_ROUTES, loadCourseOutline } from "./learnerDelivery";
import {
  LEARNING_LIVE_ROUTES,
  getLearningLiveSessionJoinGate,
  listMyLearningLiveSessions,
  readLiveBoolean,
  readLiveItems,
  readLiveString,
} from "./liveCalendarFoundation";
import { loadMyProject } from "./projectsFoundation";

type AnyClient = SupabaseClient;

/** UI / hub order for attachment cards (spine ids reused). */
export const COLLABORATION_WORKSPACE_ATTACHMENT_CARD_ORDER = [
  "community",
  "assignments_projects",
  "tutor",
  "live",
] as const satisfies readonly CollaborationWorkspaceAttachmentId[];

export const COLLABORATION_WORKSPACE_ATTACHMENTS_ID =
  "learning.collaboration.workspace_attachments_foundation_v1" as const;

export type CollaborationWorkspaceAttachmentAvailability =
  | "available"
  | "empty"
  | "unavailable";

export type CollaborationWorkspaceUnreadIndicator = {
  kind: "unanswered_questions";
  count: number;
};

export type CollaborationWorkspaceAttachmentCard = {
  id: CollaborationWorkspaceAttachmentId;
  title: string;
  icon: "community" | "assignments" | "tutor" | "live";
  availability: CollaborationWorkspaceAttachmentAvailability;
  summary: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  /** Community-only attention contract (not a messaging unread store). */
  unreadIndicator: CollaborationWorkspaceUnreadIndicator | null;
  meta: Record<string, string | number | boolean | null>;
};

export type CollaborationWorkspaceAttachmentsView = {
  courseId: string;
  capability: typeof COLLABORATION_WORKSPACE_ATTACHMENTS_ID;
  cards: CollaborationWorkspaceAttachmentCard[];
};

export type CollaborationWorkspaceAttachmentsResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function unavailableCard(
  id: CollaborationWorkspaceAttachmentId,
  title: string,
  icon: CollaborationWorkspaceAttachmentCard["icon"],
  summary: string
): CollaborationWorkspaceAttachmentCard {
  return {
    id,
    title,
    icon,
    availability: "unavailable",
    summary,
    ctaLabel: null,
    ctaHref: null,
    unreadIndicator: null,
    meta: {},
  };
}

function emptyCard(
  id: CollaborationWorkspaceAttachmentId,
  title: string,
  icon: CollaborationWorkspaceAttachmentCard["icon"],
  summary: string,
  ctaLabel: string | null,
  ctaHref: string | null
): CollaborationWorkspaceAttachmentCard {
  return {
    id,
    title,
    icon,
    availability: "empty",
    summary,
    ctaLabel,
    ctaHref,
    unreadIndicator: null,
    meta: {},
  };
}

/** Pure community mapper — feed RPC payload → attachment card. */
export function mapCommunityAttachmentCard(
  courseId: string,
  feed: Record<string, unknown> | null
): CollaborationWorkspaceAttachmentCard {
  const href = LEARNING_COMMUNITY_ROUTES.hub(courseId);
  if (!feed) {
    return unavailableCard(
      "community",
      "Community",
      "community",
      "Community feed is unavailable for this course."
    );
  }
  const items = readCommunityItems(feed, "items");
  const unanswered = readCommunityNumber(feed, "unanswered_question_count", 0);
  const latest = items[0] ?? null;
  const latestTitle = latest
    ? readCommunityString(latest, "title") ?? "Recent activity"
    : null;
  const latestKind = latest ? readCommunityString(latest, "kind") : null;

  if (items.length === 0) {
    return {
      ...emptyCard(
        "community",
        "Community",
        "community",
        "No community activity yet.",
        "Open discussions",
        LEARNING_COMMUNITY_ROUTES.discussions(courseId)
      ),
      unreadIndicator:
        unanswered > 0
          ? { kind: "unanswered_questions", count: unanswered }
          : null,
      meta: { itemCount: 0, unansweredQuestionCount: unanswered },
    };
  }

  return {
    id: "community",
    title: "Community",
    icon: "community",
    availability: "available",
    summary: latestTitle
      ? `Latest: ${latestTitle}${latestKind ? ` (${latestKind.replaceAll("_", " ")})` : ""}`
      : `${items.length} community items`,
    ctaLabel: "Open community",
    ctaHref: href,
    unreadIndicator:
      unanswered > 0
        ? { kind: "unanswered_questions", count: unanswered }
        : null,
    meta: {
      itemCount: items.length,
      unansweredQuestionCount: unanswered,
      latestKind,
    },
  };
}

/** Pure live mapper — upcoming sessions + optional join gate. */
export function mapLiveAttachmentCard(
  courseId: string,
  sessionsPayload: Record<string, unknown> | null,
  joinGate: Record<string, unknown> | null
): CollaborationWorkspaceAttachmentCard {
  const scheduleHref = LEARNING_LIVE_ROUTES.learnerSchedule(courseId);
  if (!sessionsPayload) {
    return unavailableCard(
      "live",
      "Live",
      "live",
      "Live schedule is unavailable for this course."
    );
  }
  const sessions = readLiveItems(sessionsPayload, "sessions");
  if (sessions.length === 0) {
    return emptyCard(
      "live",
      "Live",
      "live",
      "No upcoming live sessions scheduled.",
      "View live schedule",
      scheduleHref
    );
  }
  const next = sessions[0]!;
  const sessionId = readLiveString(next, "session_id");
  const title = readLiveString(next, "title") ?? "Live session";
  const status = readLiveString(next, "status") ?? "scheduled";
  const startsAt = readLiveString(next, "starts_at");
  const canJoin = joinGate ? readLiveBoolean(joinGate, "can_join", false) : false;
  const href = sessionId
    ? LEARNING_LIVE_ROUTES.learnerSession(courseId, sessionId)
    : scheduleHref;

  return {
    id: "live",
    title: "Live",
    icon: "live",
    availability: "available",
    summary: startsAt
      ? `Next: ${title} · ${status} · ${startsAt}`
      : `Next: ${title} · ${status}`,
    ctaLabel: canJoin ? "Join session" : "View session",
    ctaHref: href,
    unreadIndicator: null,
    meta: {
      sessionId,
      status,
      startsAt,
      joinAvailable: canJoin,
      upcomingCount: sessions.length,
    },
  };
}

export type AssignmentOverviewItem = {
  activityId: string;
  name: string;
  type: "assignment" | "project";
  dueAt: string | null;
  submissionStatus: string | null;
};

/** Pure assignments/projects mapper. */
export function mapAssignmentsAttachmentCard(
  courseId: string,
  items: AssignmentOverviewItem[] | null
): CollaborationWorkspaceAttachmentCard {
  const courseHref = LEARNING_LEARNER_ROUTES.course(courseId);
  if (items === null) {
    return unavailableCard(
      "assignments_projects",
      "Assignments & projects",
      "assignments",
      "Assignments overview is unavailable for this course."
    );
  }
  if (items.length === 0) {
    return emptyCard(
      "assignments_projects",
      "Assignments & projects",
      "assignments",
      "No assignments or projects in this course yet.",
      "Open course outline",
      courseHref
    );
  }

  const withDue = items
    .filter((i) => i.dueAt)
    .sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)));
  const nextDue = withDue[0] ?? null;
  const submitted = items.filter((i) =>
    ["submitted", "reviewed", "completed"].includes(
      (i.submissionStatus ?? "").toLowerCase()
    )
  ).length;
  const first = items[0]!;
  const ctaHref =
    first.type === "assignment"
      ? LEARNING_ASSIGNMENT_ROUTES.learner(first.activityId)
      : LEARNING_LEARNER_ROUTES.project(first.activityId);

  return {
    id: "assignments_projects",
    title: "Assignments & projects",
    icon: "assignments",
    availability: "available",
    summary: nextDue?.dueAt
      ? `${items.length} items · next due ${nextDue.dueAt}${
          nextDue.submissionStatus ? ` · ${nextDue.submissionStatus}` : ""
        }`
      : `${items.length} items · ${submitted} submitted`,
    ctaLabel: "Open coursework",
    ctaHref,
    unreadIndicator: null,
    meta: {
      itemCount: items.length,
      submittedCount: submitted,
      nextDueAt: nextDue?.dueAt ?? null,
      nextDueActivityId: nextDue?.activityId ?? null,
    },
  };
}

/** Pure tutor mapper — learner-owned threads only (no shared memory). */
export function mapTutorAttachmentCard(
  courseId: string,
  threadsPayload: Record<string, unknown> | null
): CollaborationWorkspaceAttachmentCard {
  if (!threadsPayload) {
    return unavailableCard(
      "tutor",
      "AI Tutor",
      "tutor",
      "AI Tutor threads are unavailable for this course."
    );
  }
  const threads = asArray(threadsPayload.threads)
    .map(asRecord)
    .filter((r): r is Record<string, unknown> => r !== null);
  if (threads.length === 0) {
    return emptyCard(
      "tutor",
      "AI Tutor",
      "tutor",
      "No AI Tutor conversations yet. Open a lesson to start.",
      "Open course outline",
      LEARNING_LEARNER_ROUTES.course(courseId)
    );
  }
  const latest = threads[0]!;
  const lessonId = asString(latest.lesson_id);
  const title = asString(latest.title) ?? "Tutor conversation";
  const updatedAt = asString(latest.updated_at);
  const href = lessonId
    ? LEARNING_AI_TUTOR_ROUTES.lesson(lessonId)
    : LEARNING_LEARNER_ROUTES.course(courseId);

  return {
    id: "tutor",
    title: "AI Tutor",
    icon: "tutor",
    availability: "available",
    summary: updatedAt
      ? `Continue: ${title} · updated ${updatedAt}`
      : `Continue: ${title}`,
    ctaLabel: "Continue session",
    ctaHref: href,
    unreadIndicator: null,
    meta: {
      threadCount: threads.length,
      latestLessonId: lessonId,
      latestThreadId: asString(latest.id),
      sharedMemory: false,
    },
  };
}

async function loadAssignmentOverviewItems(
  supabase: AnyClient,
  courseId: string
): Promise<AssignmentOverviewItem[] | null> {
  const outline = await loadCourseOutline(supabase, courseId);
  if (!outline.ok) return null;

  const lessonIds = outline.data.sections.flatMap((s) =>
    s.lessons.map((l) => l.id)
  );
  if (lessonIds.length === 0) return [];

  const { data: activities, error } = await supabase
    .from("learning_activities")
    .select("id, name, type, lesson_id, status")
    .in("lesson_id", lessonIds)
    .in("type", ["assignment", "project"])
    .eq("status", "published")
    .order("position", { ascending: true });

  if (error) return null;
  const rows = activities ?? [];
  if (rows.length === 0) return [];

  const activityIds = rows
    .map((r) => asString(r.id))
    .filter((v): v is string => Boolean(v));

  const dueByActivity = new Map<string, string | null>();
  if (activityIds.length > 0) {
    const { data: specs } = await supabase
      .from("learning_assignment_specs")
      .select("activity_id, due_at")
      .in("activity_id", activityIds);
    for (const spec of specs ?? []) {
      const aid = asString(spec.activity_id);
      if (!aid) continue;
      dueByActivity.set(aid, asString(spec.due_at));
    }
  }

  const items: AssignmentOverviewItem[] = [];
  for (const row of rows.slice(0, 12)) {
    const activityId = asString(row.id);
    const type = asString(row.type);
    if (!activityId || (type !== "assignment" && type !== "project")) continue;

    let submissionStatus: string | null = null;
    if (type === "assignment") {
      const mine = await loadMyAssignment(supabase, activityId);
      if (mine.ok) {
        submissionStatus =
          asString(mine.data.submission_status) ??
          asString(mine.data.status) ??
          null;
        if (!dueByActivity.has(activityId) && asString(mine.data.due_at)) {
          dueByActivity.set(activityId, asString(mine.data.due_at));
        }
      }
    } else {
      const mine = await loadMyProject(supabase, activityId);
      if (mine.ok) {
        submissionStatus =
          asString(mine.data.submission_status) ??
          asString(mine.data.status) ??
          null;
      }
    }

    items.push({
      activityId,
      name: asString(row.name) ?? "Coursework",
      type,
      dueAt: dueByActivity.get(activityId) ?? null,
      submissionStatus,
    });
  }
  return items;
}

/**
 * Load all four attachment cards for an entitled course workspace.
 * Access is assumed already verified by the spine loader; each card fail-soft.
 */
export async function loadCollaborationWorkspaceAttachments(
  supabase: AnyClient,
  input: { courseId: string }
): Promise<CollaborationWorkspaceAttachmentsResult<CollaborationWorkspaceAttachmentsView>> {
  const courseId = input.courseId.trim();
  if (!isCollaborationWorkspaceUuid(courseId)) {
    return { ok: false, message: "Course id is invalid." };
  }

  const [communityRes, liveRes, assignmentItems, tutorRes] = await Promise.all([
    getLearningCourseCommunityFeed(supabase, courseId, 8),
    listMyLearningLiveSessions(supabase, courseId, "upcoming"),
    loadAssignmentOverviewItems(supabase, courseId),
    listMyAiTutorThreads(supabase, courseId),
  ]);

  let joinGate: Record<string, unknown> | null = null;
  if (liveRes.ok) {
    const sessions = readLiveItems(liveRes.data, "sessions");
    const nextId = sessions[0] ? readLiveString(sessions[0], "session_id") : null;
    if (nextId) {
      const gate = await getLearningLiveSessionJoinGate(supabase, nextId);
      if (gate.ok) joinGate = gate.data;
    }
  }

  const byId = new Map<
    CollaborationWorkspaceAttachmentId,
    CollaborationWorkspaceAttachmentCard
  >([
    [
      "community",
      mapCommunityAttachmentCard(
        courseId,
        communityRes.ok ? communityRes.data : null
      ),
    ],
    [
      "assignments_projects",
      mapAssignmentsAttachmentCard(courseId, assignmentItems),
    ],
    [
      "tutor",
      mapTutorAttachmentCard(courseId, tutorRes.ok ? tutorRes.data : null),
    ],
    [
      "live",
      mapLiveAttachmentCard(
        courseId,
        liveRes.ok ? liveRes.data : null,
        joinGate
      ),
    ],
  ]);

  const ordered = COLLABORATION_WORKSPACE_ATTACHMENT_CARD_ORDER.map((id) => {
    const card = byId.get(id);
    if (!card) {
      return unavailableCard(
        id,
        id,
        id === "live"
          ? "live"
          : id === "tutor"
            ? "tutor"
            : id === "assignments_projects"
              ? "assignments"
              : "community",
        "Attachment missing."
      );
    }
    return card;
  });

  return {
    ok: true,
    data: {
      courseId,
      capability: COLLABORATION_WORKSPACE_ATTACHMENTS_ID,
      cards: ordered,
    },
  };
}
