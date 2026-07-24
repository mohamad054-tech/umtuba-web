/**
 * UM Learning OS — Discussions & Course Community Foundation V1.
 *
 * Course community: discussions, Q&A, announcements, feed, moderation.
 * DB-authoritative RPCs. Reuses course access / staff / notifications / audit.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const LEARNING_COMMUNITY_RPCS = {
  createDiscussionThread: "create_learning_discussion_thread",
  replyToDiscussion: "reply_to_learning_discussion",
  editDiscussionThread: "edit_learning_discussion_thread",
  editDiscussionReply: "edit_learning_discussion_reply",
  softDeleteDiscussionThread: "soft_delete_learning_discussion_thread",
  softDeleteDiscussionReply: "soft_delete_learning_discussion_reply",
  lockDiscussionThread: "lock_learning_discussion_thread",
  archiveDiscussionThread: "archive_learning_discussion_thread",
  listDiscussionThreads: "list_learning_discussion_threads",
  getDiscussionThread: "get_learning_discussion_thread",
  createQaQuestion: "create_learning_qa_question",
  answerQaQuestion: "answer_learning_qa_question",
  acceptQaAnswer: "accept_learning_qa_answer",
  listQaQuestions: "list_learning_qa_questions",
  getQaQuestion: "get_learning_qa_question",
  moderateQaQuestion: "moderate_learning_qa_question",
  publishAnnouncement: "publish_learning_announcement",
  pinAnnouncement: "pin_learning_announcement",
  archiveAnnouncement: "archive_learning_announcement",
  removeAnnouncement: "remove_learning_announcement",
  listAnnouncements: "list_learning_announcements",
  getCommunityFeed: "get_learning_course_community_feed",
} as const;

export const LEARNING_COMMUNITY_ROUTES = {
  hub: (courseId: string) => `/learning/courses/${courseId}/community`,
  discussions: (courseId: string) =>
    `/learning/courses/${courseId}/community/discussions`,
  discussion: (courseId: string, threadId: string) =>
    `/learning/courses/${courseId}/community/discussions/${threadId}`,
  qa: (courseId: string) => `/learning/courses/${courseId}/community/qa`,
  question: (courseId: string, questionId: string) =>
    `/learning/courses/${courseId}/community/qa/${questionId}`,
  announcements: (courseId: string) =>
    `/learning/courses/${courseId}/community/announcements`,
} as const;

export type CommunityResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type DiscussionThreadStatus = "open" | "locked" | "archived" | "removed";
export type QaQuestionStatus =
  | "open"
  | "resolved"
  | "locked"
  | "archived"
  | "removed";
export type AnnouncementStatus = "published" | "archived" | "removed";
export type QaAskerRole = "learner" | "instructor";
export type CommunityFeedKind =
  | "announcement"
  | "discussion"
  | "unanswered_question"
  | "instructor_activity";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCommunityUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function sanitizeCommunityError(message: string | undefined): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Community action could not be processed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not entitled") ||
    lower.includes("not allowed")
  ) {
    return "You are not allowed to access this course community.";
  }
  if (lower.includes("not found")) {
    return "Community content was not found.";
  }
  if (lower.includes("not open") || lower.includes("not editable")) {
    return raw.length > 180 ? "This item is locked or closed." : raw;
  }
  if (raw.length > 180) return "Community action could not be processed.";
  return raw;
}

async function callRpc(
  supabase: AnyClient,
  rpc: string,
  args?: Record<string, unknown>
): Promise<CommunityResult<unknown>> {
  const { data, error } = args
    ? await supabase.rpc(rpc, args)
    : await supabase.rpc(rpc);
  if (error) {
    return { ok: false, message: sanitizeCommunityError(error.message) };
  }
  return { ok: true, data };
}

function requireUuid(
  value: string,
  label: string
): { ok: false; message: string } | null {
  if (!isCommunityUuid(value)) {
    return { ok: false, message: `${label} must be a valid UUID` };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Discussions
// ---------------------------------------------------------------------------

export async function createLearningDiscussionThread(
  supabase: AnyClient,
  input: { courseId: string; title: string; body: string }
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(input.courseId, "course_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_COMMUNITY_RPCS.createDiscussionThread,
    {
      p_course_id: input.courseId,
      p_title: input.title,
      p_body: input.body,
    }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function replyToLearningDiscussion(
  supabase: AnyClient,
  input: { threadId: string; body: string; parentReplyId?: string | null }
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(input.threadId, "thread_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_COMMUNITY_RPCS.replyToDiscussion,
    {
      p_thread_id: input.threadId,
      p_body: input.body,
      p_parent_reply_id: input.parentReplyId ?? null,
    }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function editLearningDiscussionThread(
  supabase: AnyClient,
  input: { threadId: string; title: string; body: string }
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(input.threadId, "thread_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_COMMUNITY_RPCS.editDiscussionThread,
    {
      p_thread_id: input.threadId,
      p_title: input.title,
      p_body: input.body,
    }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function editLearningDiscussionReply(
  supabase: AnyClient,
  input: { replyId: string; body: string }
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(input.replyId, "reply_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_COMMUNITY_RPCS.editDiscussionReply,
    {
      p_reply_id: input.replyId,
      p_body: input.body,
    }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function softDeleteLearningDiscussionThread(
  supabase: AnyClient,
  input: { threadId: string; reason?: string | null }
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(input.threadId, "thread_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_COMMUNITY_RPCS.softDeleteDiscussionThread,
    {
      p_thread_id: input.threadId,
      p_reason: input.reason ?? null,
    }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function softDeleteLearningDiscussionReply(
  supabase: AnyClient,
  input: { replyId: string; reason?: string | null }
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(input.replyId, "reply_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_COMMUNITY_RPCS.softDeleteDiscussionReply,
    {
      p_reply_id: input.replyId,
      p_reason: input.reason ?? null,
    }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function lockLearningDiscussionThread(
  supabase: AnyClient,
  input: { threadId: string; locked?: boolean }
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(input.threadId, "thread_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_COMMUNITY_RPCS.lockDiscussionThread,
    {
      p_thread_id: input.threadId,
      p_locked: input.locked !== false,
    }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function archiveLearningDiscussionThread(
  supabase: AnyClient,
  threadId: string
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(threadId, "thread_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_COMMUNITY_RPCS.archiveDiscussionThread,
    { p_thread_id: threadId }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function listLearningDiscussionThreads(
  supabase: AnyClient,
  courseId: string,
  limit = 50
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(courseId, "course_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_COMMUNITY_RPCS.listDiscussionThreads,
    { p_course_id: courseId, p_limit: limit }
  );
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.course_id) !== courseId) {
    return { ok: false, message: "Discussion list payload is malformed." };
  }
  return { ok: true, data: row };
}

export async function getLearningDiscussionThread(
  supabase: AnyClient,
  threadId: string
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(threadId, "thread_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_COMMUNITY_RPCS.getDiscussionThread,
    { p_thread_id: threadId }
  );
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.thread_id) !== threadId) {
    return { ok: false, message: "Discussion thread payload is malformed." };
  }
  return { ok: true, data: row };
}

// ---------------------------------------------------------------------------
// Q&A
// ---------------------------------------------------------------------------

export async function createLearningQaQuestion(
  supabase: AnyClient,
  input: { courseId: string; title: string; body: string }
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(input.courseId, "course_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_COMMUNITY_RPCS.createQaQuestion, {
    p_course_id: input.courseId,
    p_title: input.title,
    p_body: input.body,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function answerLearningQaQuestion(
  supabase: AnyClient,
  input: { questionId: string; body: string }
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(input.questionId, "question_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_COMMUNITY_RPCS.answerQaQuestion, {
    p_question_id: input.questionId,
    p_body: input.body,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function acceptLearningQaAnswer(
  supabase: AnyClient,
  answerId: string
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(answerId, "answer_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_COMMUNITY_RPCS.acceptQaAnswer, {
    p_answer_id: answerId,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function listLearningQaQuestions(
  supabase: AnyClient,
  input: { courseId: string; status?: string | null; limit?: number }
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(input.courseId, "course_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_COMMUNITY_RPCS.listQaQuestions, {
    p_course_id: input.courseId,
    p_status: input.status ?? null,
    p_limit: input.limit ?? 50,
  });
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.course_id) !== input.courseId) {
    return { ok: false, message: "Q&A list payload is malformed." };
  }
  return { ok: true, data: row };
}

export async function getLearningQaQuestion(
  supabase: AnyClient,
  questionId: string
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(questionId, "question_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_COMMUNITY_RPCS.getQaQuestion, {
    p_question_id: questionId,
  });
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.question_id) !== questionId) {
    return { ok: false, message: "Q&A question payload is malformed." };
  }
  return { ok: true, data: row };
}

export async function moderateLearningQaQuestion(
  supabase: AnyClient,
  input: {
    questionId: string;
    action: "lock" | "archive" | "remove" | "reopen";
    reason?: string | null;
  }
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(input.questionId, "question_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_COMMUNITY_RPCS.moderateQaQuestion,
    {
      p_question_id: input.questionId,
      p_action: input.action,
      p_reason: input.reason ?? null,
    }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export async function publishLearningAnnouncement(
  supabase: AnyClient,
  input: {
    courseId: string;
    title: string;
    body: string;
    pinned?: boolean;
  }
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(input.courseId, "course_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_COMMUNITY_RPCS.publishAnnouncement,
    {
      p_course_id: input.courseId,
      p_title: input.title,
      p_body: input.body,
      p_pinned: input.pinned === true,
    }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function pinLearningAnnouncement(
  supabase: AnyClient,
  input: { announcementId: string; pinned?: boolean }
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(input.announcementId, "announcement_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_COMMUNITY_RPCS.pinAnnouncement, {
    p_announcement_id: input.announcementId,
    p_pinned: input.pinned !== false,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function archiveLearningAnnouncement(
  supabase: AnyClient,
  announcementId: string
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(announcementId, "announcement_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_COMMUNITY_RPCS.archiveAnnouncement,
    { p_announcement_id: announcementId }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function removeLearningAnnouncement(
  supabase: AnyClient,
  input: { announcementId: string; reason?: string | null }
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(input.announcementId, "announcement_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_COMMUNITY_RPCS.removeAnnouncement,
    {
      p_announcement_id: input.announcementId,
      p_reason: input.reason ?? null,
    }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function listLearningAnnouncements(
  supabase: AnyClient,
  courseId: string,
  limit = 50
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(courseId, "course_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_COMMUNITY_RPCS.listAnnouncements,
    { p_course_id: courseId, p_limit: limit }
  );
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.course_id) !== courseId) {
    return { ok: false, message: "Announcement list payload is malformed." };
  }
  return { ok: true, data: row };
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

export async function getLearningCourseCommunityFeed(
  supabase: AnyClient,
  courseId: string,
  limit = 40
): Promise<CommunityResult<Record<string, unknown>>> {
  const bad = requireUuid(courseId, "course_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_COMMUNITY_RPCS.getCommunityFeed, {
    p_course_id: courseId,
    p_limit: limit,
  });
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.course_id) !== courseId) {
    return { ok: false, message: "Community feed payload is malformed." };
  }
  return { ok: true, data: row };
}

export function readCommunityItems(
  payload: Record<string, unknown>,
  key: string
): Record<string, unknown>[] {
  return asArray(payload[key])
    .map(asRecord)
    .filter((row): row is Record<string, unknown> => row !== null);
}

export function readCommunityString(
  row: Record<string, unknown>,
  key: string
): string | null {
  return asString(row[key]);
}

export function readCommunityBoolean(
  row: Record<string, unknown>,
  key: string,
  fallback = false
): boolean {
  return asBoolean(row[key], fallback);
}

export function readCommunityNumber(
  row: Record<string, unknown>,
  key: string,
  fallback = 0
): number {
  return asNumber(row[key], fallback);
}
