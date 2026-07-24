"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  LEARNING_COMMUNITY_ROUTES,
  acceptLearningQaAnswer,
  answerLearningQaQuestion,
  archiveLearningAnnouncement,
  archiveLearningDiscussionThread,
  createLearningDiscussionThread,
  createLearningQaQuestion,
  editLearningDiscussionReply,
  editLearningDiscussionThread,
  lockLearningDiscussionThread,
  moderateLearningQaQuestion,
  pinLearningAnnouncement,
  publishLearningAnnouncement,
  removeLearningAnnouncement,
  replyToLearningDiscussion,
  softDeleteLearningDiscussionReply,
  softDeleteLearningDiscussionThread,
} from "../../lib/learning/communityFoundation";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function revalidateCommunity(courseId: string, extra?: string) {
  revalidatePath(LEARNING_COMMUNITY_ROUTES.hub(courseId));
  revalidatePath(LEARNING_COMMUNITY_ROUTES.discussions(courseId));
  revalidatePath(LEARNING_COMMUNITY_ROUTES.qa(courseId));
  revalidatePath(LEARNING_COMMUNITY_ROUTES.announcements(courseId));
  if (extra) revalidatePath(extra);
}

export async function createDiscussionThreadAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const title = str(formData, "title");
  const body = String(formData.get("body") ?? "");
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_COMMUNITY_ROUTES.discussions(courseId))}`
    );
  }
  const supabase = await createClient();
  const result = await createLearningDiscussionThread(supabase, {
    courseId,
    title,
    body,
  });
  const path = LEARNING_COMMUNITY_ROUTES.discussions(courseId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  const threadId = String(
    (result.data as { thread_id?: string }).thread_id ?? ""
  );
  revalidateCommunity(courseId);
  if (threadId) {
    redirect(LEARNING_COMMUNITY_ROUTES.discussion(courseId, threadId));
  }
  redirect(path);
}

export async function replyToDiscussionAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const threadId = str(formData, "threadId");
  const body = String(formData.get("body") ?? "");
  const parentReplyId = str(formData, "parentReplyId") || null;
  const path = LEARNING_COMMUNITY_ROUTES.discussion(courseId, threadId);
  const user = await getServerUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  const supabase = await createClient();
  const result = await replyToLearningDiscussion(supabase, {
    threadId,
    body,
    parentReplyId,
  });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateCommunity(courseId, path);
  redirect(path);
}

export async function editDiscussionThreadAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const threadId = str(formData, "threadId");
  const title = str(formData, "title");
  const body = String(formData.get("body") ?? "");
  const path = LEARNING_COMMUNITY_ROUTES.discussion(courseId, threadId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await editLearningDiscussionThread(supabase, {
    threadId,
    title,
    body,
  });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateCommunity(courseId, path);
  redirect(`${path}?edited=1`);
}

export async function editDiscussionReplyAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const threadId = str(formData, "threadId");
  const replyId = str(formData, "replyId");
  const body = String(formData.get("body") ?? "");
  const path = LEARNING_COMMUNITY_ROUTES.discussion(courseId, threadId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await editLearningDiscussionReply(supabase, { replyId, body });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateCommunity(courseId, path);
  redirect(path);
}

export async function softDeleteDiscussionThreadAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const threadId = str(formData, "threadId");
  const path = LEARNING_COMMUNITY_ROUTES.discussions(courseId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await softDeleteLearningDiscussionThread(supabase, {
    threadId,
  });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateCommunity(courseId);
  redirect(path);
}

export async function softDeleteDiscussionReplyAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const threadId = str(formData, "threadId");
  const replyId = str(formData, "replyId");
  const path = LEARNING_COMMUNITY_ROUTES.discussion(courseId, threadId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await softDeleteLearningDiscussionReply(supabase, { replyId });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateCommunity(courseId, path);
  redirect(path);
}

export async function lockDiscussionThreadAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const threadId = str(formData, "threadId");
  const locked = str(formData, "locked") !== "0";
  const path = LEARNING_COMMUNITY_ROUTES.discussion(courseId, threadId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await lockLearningDiscussionThread(supabase, {
    threadId,
    locked,
  });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateCommunity(courseId, path);
  redirect(path);
}

export async function archiveDiscussionThreadAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const threadId = str(formData, "threadId");
  const path = LEARNING_COMMUNITY_ROUTES.discussions(courseId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await archiveLearningDiscussionThread(supabase, threadId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateCommunity(courseId);
  redirect(path);
}

export async function createQaQuestionAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const title = str(formData, "title");
  const body = String(formData.get("body") ?? "");
  const path = LEARNING_COMMUNITY_ROUTES.qa(courseId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await createLearningQaQuestion(supabase, {
    courseId,
    title,
    body,
  });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  const questionId = String(
    (result.data as { question_id?: string }).question_id ?? ""
  );
  revalidateCommunity(courseId);
  if (questionId) {
    redirect(LEARNING_COMMUNITY_ROUTES.question(courseId, questionId));
  }
  redirect(path);
}

export async function answerQaQuestionAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const questionId = str(formData, "questionId");
  const body = String(formData.get("body") ?? "");
  const path = LEARNING_COMMUNITY_ROUTES.question(courseId, questionId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await answerLearningQaQuestion(supabase, { questionId, body });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateCommunity(courseId, path);
  redirect(path);
}

export async function acceptQaAnswerAction(formData: FormData): Promise<void> {
  const courseId = str(formData, "courseId");
  const questionId = str(formData, "questionId");
  const answerId = str(formData, "answerId");
  const path = LEARNING_COMMUNITY_ROUTES.question(courseId, questionId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await acceptLearningQaAnswer(supabase, answerId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateCommunity(courseId, path);
  redirect(`${path}?resolved=1`);
}

export async function moderateQaQuestionAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const questionId = str(formData, "questionId");
  const action = str(formData, "action") as
    | "lock"
    | "archive"
    | "remove"
    | "reopen";
  const path = LEARNING_COMMUNITY_ROUTES.qa(courseId);
  const detail = LEARNING_COMMUNITY_ROUTES.question(courseId, questionId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(detail)}`);
  const supabase = await createClient();
  const result = await moderateLearningQaQuestion(supabase, {
    questionId,
    action,
  });
  if (!result.ok) {
    redirect(`${detail}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateCommunity(courseId, detail);
  if (action === "remove" || action === "archive") {
    redirect(path);
  }
  redirect(detail);
}

export async function publishAnnouncementAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const title = str(formData, "title");
  const body = String(formData.get("body") ?? "");
  const pinned = str(formData, "pinned") === "1";
  const path = LEARNING_COMMUNITY_ROUTES.announcements(courseId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await publishLearningAnnouncement(supabase, {
    courseId,
    title,
    body,
    pinned,
  });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateCommunity(courseId);
  redirect(`${path}?published=1`);
}

export async function pinAnnouncementAction(formData: FormData): Promise<void> {
  const courseId = str(formData, "courseId");
  const announcementId = str(formData, "announcementId");
  const pinned = str(formData, "pinned") !== "0";
  const path = LEARNING_COMMUNITY_ROUTES.announcements(courseId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await pinLearningAnnouncement(supabase, {
    announcementId,
    pinned,
  });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateCommunity(courseId);
  redirect(path);
}

export async function archiveAnnouncementAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const announcementId = str(formData, "announcementId");
  const path = LEARNING_COMMUNITY_ROUTES.announcements(courseId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await archiveLearningAnnouncement(supabase, announcementId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateCommunity(courseId);
  redirect(path);
}

export async function removeAnnouncementAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const announcementId = str(formData, "announcementId");
  const path = LEARNING_COMMUNITY_ROUTES.announcements(courseId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await removeLearningAnnouncement(supabase, { announcementId });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateCommunity(courseId);
  redirect(path);
}
