/**
 * UM Learning OS — Collaboration Workspace Activity Timeline Foundation V1.
 *
 * Read-model aggregation of existing Learning capabilities into one chronological feed.
 * No realtime, websocket, push, chat, shared memory, Commerce, or migrations.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LEARNING_AI_TUTOR_ROUTES,
} from "./aiTutorFoundation";
import { LEARNING_ASSIGNMENT_ROUTES } from "./assignmentsCoursework";
import {
  LEARNING_COMMUNITY_ROUTES,
  readCommunityItems,
  readCommunityNumber,
  readCommunityString,
} from "./communityFoundation";
import {
  type AssignmentOverviewItem,
  type CollaborationWorkspaceHubSources,
  loadCollaborationWorkspaceHubSources,
} from "./collaborationWorkspaceAttachments";
import { isCollaborationWorkspaceUuid } from "./collaborationWorkspaceSpine";
import { LEARNING_LEARNER_ROUTES } from "./learnerDelivery";
import {
  LEARNING_LIVE_ROUTES,
  readLiveItems,
  readLiveString,
} from "./liveCalendarFoundation";

type AnyClient = SupabaseClient;

export const COLLABORATION_WORKSPACE_TIMELINE_ID =
  "learning.collaboration.workspace_activity_timeline_foundation_v1" as const;

export type CollaborationWorkspaceTimelineSource =
  | "community"
  | "assignments_projects"
  | "tutor"
  | "live";

export type CollaborationWorkspaceTimelineEventType =
  | "latest_discussion"
  | "latest_reply"
  | "unanswered_discussion"
  | "assignment_published"
  | "submission_created"
  | "due_soon"
  | "graded"
  | "latest_conversation"
  | "latest_summary"
  | "continue_session"
  | "session_scheduled"
  | "session_started"
  | "session_completed"
  | "recording_available";

export type CollaborationWorkspaceTimelineImportance = "high" | "normal" | "low";

export type CollaborationWorkspaceTimelineAvailability =
  | "available"
  | "empty"
  | "unavailable";

export type CollaborationWorkspaceTimelineItem = {
  id: string;
  source: CollaborationWorkspaceTimelineSource;
  eventType: CollaborationWorkspaceTimelineEventType;
  title: string;
  summary: string;
  timestamp: string | null;
  href: string | null;
  importance: CollaborationWorkspaceTimelineImportance;
  unread: boolean;
  availability: CollaborationWorkspaceTimelineAvailability;
};

export type CollaborationWorkspaceTimelineView = {
  courseId: string;
  capability: typeof COLLABORATION_WORKSPACE_TIMELINE_ID;
  items: CollaborationWorkspaceTimelineItem[];
  availability: CollaborationWorkspaceTimelineAvailability;
};

export type CollaborationWorkspaceTimelineResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const DUE_SOON_MS = 72 * 60 * 60 * 1000;

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

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function item(
  partial: CollaborationWorkspaceTimelineItem
): CollaborationWorkspaceTimelineItem {
  return partial;
}

export function sortCollaborationWorkspaceTimelineItems(
  items: CollaborationWorkspaceTimelineItem[]
): CollaborationWorkspaceTimelineItem[] {
  return [...items].sort((a, b) => {
    const at = a.timestamp ? Date.parse(a.timestamp) : Number.NEGATIVE_INFINITY;
    const bt = b.timestamp ? Date.parse(b.timestamp) : Number.NEGATIVE_INFINITY;
    if (bt !== at) return bt - at;
    return a.id.localeCompare(b.id);
  });
}

/** Pure community → timeline items. */
export function mapCommunityTimelineItems(
  courseId: string,
  feed: Record<string, unknown> | null,
  discussionThreads: Record<string, unknown> | null
): CollaborationWorkspaceTimelineItem[] {
  const items: CollaborationWorkspaceTimelineItem[] = [];
  const unanswered = feed
    ? readCommunityNumber(feed, "unanswered_question_count", 0)
    : 0;

  if (unanswered > 0) {
    items.push(
      item({
        id: `tl:community:unanswered:${courseId}`,
        source: "community",
        eventType: "unanswered_discussion",
        title: "Unanswered discussions",
        summary: `${unanswered} unanswered question${unanswered === 1 ? "" : "s"} need attention.`,
        timestamp: null,
        href: LEARNING_COMMUNITY_ROUTES.qa(courseId),
        importance: "high",
        unread: true,
        availability: "available",
      })
    );
  }

  const threads = discussionThreads
    ? readCommunityItems(discussionThreads, "threads")
    : [];

  if (threads.length > 0) {
    const latest = threads[0]!;
    const threadId =
      readCommunityString(latest, "thread_id") ??
      readCommunityString(latest, "id");
    const title = readCommunityString(latest, "title") ?? "Discussion";
    const createdAt = readCommunityString(latest, "created_at");
    const lastReplyAt = readCommunityString(latest, "last_reply_at");
    const replyCount =
      asNumber(latest.reply_count) ??
      readCommunityNumber(latest, "reply_count", 0);
    const href = threadId
      ? LEARNING_COMMUNITY_ROUTES.discussion(courseId, threadId)
      : LEARNING_COMMUNITY_ROUTES.discussions(courseId);

    items.push(
      item({
        id: `tl:community:latest_discussion:${threadId ?? courseId}`,
        source: "community",
        eventType: "latest_discussion",
        title: "Latest discussion",
        summary: title,
        timestamp: createdAt,
        href,
        importance: "normal",
        unread: false,
        availability: "available",
      })
    );

    if (replyCount > 0 && lastReplyAt) {
      items.push(
        item({
          id: `tl:community:latest_reply:${threadId ?? courseId}`,
          source: "community",
          eventType: "latest_reply",
          title: "Latest reply",
          summary: `New reply on "${title}"`,
          timestamp: lastReplyAt,
          href,
          importance: "normal",
          unread: false,
          availability: "available",
        })
      );
    }
  } else if (feed) {
    const feedItems = readCommunityItems(feed, "items").filter(
      (row) => readCommunityString(row, "kind") === "discussion"
    );
    const latest = feedItems[0];
    if (latest) {
      const threadId = readCommunityString(latest, "id");
      const title = readCommunityString(latest, "title") ?? "Discussion";
      const occurredAt = readCommunityString(latest, "occurred_at");
      items.push(
        item({
          id: `tl:community:latest_discussion:${threadId ?? courseId}`,
          source: "community",
          eventType: "latest_discussion",
          title: "Latest discussion",
          summary: title,
          timestamp: occurredAt,
          href: threadId
            ? LEARNING_COMMUNITY_ROUTES.discussion(courseId, threadId)
            : LEARNING_COMMUNITY_ROUTES.discussions(courseId),
          importance: "normal",
          unread: false,
          availability: "available",
        })
      );
    }
  }

  return items;
}

function isDueSoon(dueAt: string | null, nowMs: number): boolean {
  if (!dueAt) return false;
  const dueMs = Date.parse(dueAt);
  if (Number.isNaN(dueMs)) return false;
  return dueMs >= nowMs && dueMs - nowMs <= DUE_SOON_MS;
}

/** Pure assignments/projects → timeline items. */
export function mapAssignmentsTimelineItems(
  courseId: string,
  assignmentItems: AssignmentOverviewItem[] | null,
  nowMs: number = Date.now()
): CollaborationWorkspaceTimelineItem[] {
  if (!assignmentItems) return [];
  const items: CollaborationWorkspaceTimelineItem[] = [];

  for (const row of assignmentItems) {
    const href =
      row.type === "assignment"
        ? LEARNING_ASSIGNMENT_ROUTES.learner(row.activityId)
        : LEARNING_LEARNER_ROUTES.project(row.activityId);
    const status = (row.submissionStatus ?? "").toLowerCase();

    if (row.publishedAt) {
      items.push(
        item({
          id: `tl:assignments:published:${row.activityId}`,
          source: "assignments_projects",
          eventType: "assignment_published",
          title: "Assignment published",
          summary: row.name,
          timestamp: row.publishedAt,
          href,
          importance: "normal",
          unread: false,
          availability: "available",
        })
      );
    }

    if (row.submittedAt && ["submitted", "reviewed", "completed"].includes(status)) {
      items.push(
        item({
          id: `tl:assignments:submission:${row.activityId}`,
          source: "assignments_projects",
          eventType: "submission_created",
          title: "Submission created",
          summary: `${row.name} · ${status}`,
          timestamp: row.submittedAt,
          href,
          importance: "normal",
          unread: false,
          availability: "available",
        })
      );
    }

    if (
      isDueSoon(row.dueAt, nowMs) &&
      !["submitted", "reviewed", "completed"].includes(status)
    ) {
      items.push(
        item({
          id: `tl:assignments:due_soon:${row.activityId}`,
          source: "assignments_projects",
          eventType: "due_soon",
          title: "Due soon",
          summary: `${row.name} · due ${row.dueAt}`,
          timestamp: row.dueAt,
          href,
          importance: "high",
          unread: true,
          availability: "available",
        })
      );
    }

    if (row.reviewedAt && ["reviewed", "graded", "completed"].includes(status)) {
      items.push(
        item({
          id: `tl:assignments:graded:${row.activityId}`,
          source: "assignments_projects",
          eventType: "graded",
          title: "Graded",
          summary: `${row.name} · reviewed`,
          timestamp: row.reviewedAt,
          href,
          importance: "high",
          unread: false,
          availability: "available",
        })
      );
    }
  }

  return items;
}

/** Pure AI Tutor → timeline items (learner-owned only; no shared memory). */
export function mapTutorTimelineItems(
  courseId: string,
  threadsPayload: Record<string, unknown> | null
): CollaborationWorkspaceTimelineItem[] {
  if (!threadsPayload) return [];
  const threads = asArray(threadsPayload.threads)
    .map(asRecord)
    .filter((r): r is Record<string, unknown> => r !== null);
  if (threads.length === 0) return [];

  const latest = threads[0]!;
  const threadId = asString(latest.id);
  const lessonId = asString(latest.lesson_id);
  const title = asString(latest.title) ?? "Tutor conversation";
  const summaryText =
    asString(latest.summary) ?? asString(latest.last_summary) ?? title;
  const updatedAt = asString(latest.updated_at) ?? asString(latest.created_at);
  const href = lessonId
    ? LEARNING_AI_TUTOR_ROUTES.lesson(lessonId)
    : LEARNING_LEARNER_ROUTES.course(courseId);
  const key = threadId ?? lessonId ?? courseId;

  return [
    item({
      id: `tl:tutor:latest_conversation:${key}`,
      source: "tutor",
      eventType: "latest_conversation",
      title: "Latest tutor conversation",
      summary: title,
      timestamp: updatedAt,
      href,
      importance: "normal",
      unread: false,
      availability: "available",
    }),
    item({
      id: `tl:tutor:latest_summary:${key}`,
      source: "tutor",
      eventType: "latest_summary",
      title: "Latest tutor summary",
      summary: summaryText,
      timestamp: updatedAt,
      href,
      importance: "low",
      unread: false,
      availability: "available",
    }),
    item({
      id: `tl:tutor:continue_session:${key}`,
      source: "tutor",
      eventType: "continue_session",
      title: "Continue tutor session",
      summary: `Resume "${title}"`,
      timestamp: updatedAt,
      href,
      importance: "normal",
      unread: false,
      availability: "available",
    }),
  ];
}

function hasRecordingAvailable(session: Record<string, unknown>): boolean {
  const flag = session.recording_available;
  if (flag === true) return true;
  const status = (asString(session.recording_status) ?? "").toLowerCase();
  if (status === "ready") return true;
  return Boolean(asString(session.recording_url));
}

/** Pure Live → timeline items (no realtime product). */
export function mapLiveTimelineItems(
  courseId: string,
  sessionsPayload: Record<string, unknown> | null
): CollaborationWorkspaceTimelineItem[] {
  if (!sessionsPayload) return [];
  const sessions = readLiveItems(sessionsPayload, "sessions");
  const items: CollaborationWorkspaceTimelineItem[] = [];

  for (const session of sessions) {
    const sessionId = readLiveString(session, "session_id");
    if (!sessionId) continue;
    const title = readLiveString(session, "title") ?? "Live session";
    const status = (readLiveString(session, "status") ?? "").toLowerCase();
    const startsAt = readLiveString(session, "starts_at");
    const createdAt = readLiveString(session, "created_at");
    const completedAt = readLiveString(session, "completed_at");
    const href = LEARNING_LIVE_ROUTES.learnerSession(courseId, sessionId);

    if (status === "scheduled" || status === "live" || status === "completed") {
      items.push(
        item({
          id: `tl:live:scheduled:${sessionId}`,
          source: "live",
          eventType: "session_scheduled",
          title: "Session scheduled",
          summary: title,
          timestamp: createdAt ?? startsAt,
          href,
          importance: "normal",
          unread: false,
          availability: "available",
        })
      );
    }

    if (status === "live") {
      items.push(
        item({
          id: `tl:live:started:${sessionId}`,
          source: "live",
          eventType: "session_started",
          title: "Session started",
          summary: `${title} is live`,
          timestamp: startsAt ?? createdAt,
          href,
          importance: "high",
          unread: true,
          availability: "available",
        })
      );
    }

    if (status === "completed") {
      items.push(
        item({
          id: `tl:live:completed:${sessionId}`,
          source: "live",
          eventType: "session_completed",
          title: "Session completed",
          summary: title,
          timestamp: completedAt ?? startsAt,
          href,
          importance: "normal",
          unread: false,
          availability: "available",
        })
      );
    }

    if (hasRecordingAvailable(session)) {
      items.push(
        item({
          id: `tl:live:recording:${sessionId}`,
          source: "live",
          eventType: "recording_available",
          title: "Recording available",
          summary: `Recording ready for "${title}"`,
          timestamp:
            asString(session.recording_ready_at) ?? completedAt ?? startsAt,
          href,
          importance: "normal",
          unread: false,
          availability: "available",
        })
      );
    }
  }

  return items;
}

export function buildCollaborationWorkspaceTimeline(
  sources: CollaborationWorkspaceHubSources,
  nowMs: number = Date.now()
): CollaborationWorkspaceTimelineView {
  const sourcesUnavailable =
    sources.communityFeed === null &&
    sources.discussionThreads === null &&
    sources.assignmentItems === null &&
    sources.tutorThreads === null &&
    sources.liveSessions === null;

  const raw = [
    ...mapCommunityTimelineItems(
      sources.courseId,
      sources.communityFeed,
      sources.discussionThreads
    ),
    ...mapAssignmentsTimelineItems(
      sources.courseId,
      sources.assignmentItems,
      nowMs
    ),
    ...mapTutorTimelineItems(sources.courseId, sources.tutorThreads),
    ...mapLiveTimelineItems(sources.courseId, sources.liveSessions),
  ];

  const items = sortCollaborationWorkspaceTimelineItems(raw);
  let availability: CollaborationWorkspaceTimelineAvailability = "available";
  if (sourcesUnavailable) availability = "unavailable";
  else if (items.length === 0) availability = "empty";

  return {
    courseId: sources.courseId,
    capability: COLLABORATION_WORKSPACE_TIMELINE_ID,
    items,
    availability,
  };
}

/**
 * Load the unified activity timeline. Pass preloaded hub sources to share
 * one fetch with workspace attachments (no duplicate queries).
 */
export async function loadCollaborationWorkspaceTimeline(
  supabase: AnyClient,
  input: { courseId: string },
  preloaded?: CollaborationWorkspaceHubSources
): Promise<CollaborationWorkspaceTimelineResult<CollaborationWorkspaceTimelineView>> {
  const courseId = input.courseId.trim();
  if (!isCollaborationWorkspaceUuid(courseId)) {
    return { ok: false, message: "Course id is invalid." };
  }

  const sourcesRes = preloaded
    ? { ok: true as const, data: preloaded }
    : await loadCollaborationWorkspaceHubSources(supabase, { courseId });
  if (!sourcesRes.ok) return sourcesRes;

  return {
    ok: true,
    data: buildCollaborationWorkspaceTimeline(sourcesRes.data),
  };
}
