"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  LEARNING_AI_TUTOR_MESSAGE_KINDS,
  LEARNING_AI_TUTOR_ROUTES,
  appendMyAiTutorMessage,
  createMyAiTutorThread,
  type LearningAiTutorMessageKind,
} from "../../lib/learning/aiTutorFoundation";
import {
  LEARNING_COURSE_RESOURCE_KINDS,
  LEARNING_COURSE_RESOURCE_ROUTES,
  publishCourseResource,
  trackMyCourseResourceDownload,
  upsertCourseResource,
  type LearningCourseResourceKind,
} from "../../lib/learning/courseResourcesFoundation";
import {
  LEARNING_LAB_ROUTES,
  completeMyLab,
  startMyLab,
  upsertLabSpec,
} from "../../lib/learning/labsFoundation";
import { upsertMyLearningLessonMediaPosition } from "../../lib/learning/lessonEngineFoundation";
import { unlockMyLessonWithUmPoints } from "../../lib/learning/lessonUnlockFoundation";
import { LEARNING_LEARNER_ROUTES } from "../../lib/learning/learnerDelivery";
import {
  LEARNING_PROJECT_ROUTES,
  reviewProjectSubmission,
  saveMyProjectSubmission,
  startMyProjectSubmission,
  submitMyProjectSubmission,
  upsertProjectSpec,
} from "../../lib/learning/projectsFoundation";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function unlockLessonWithUmPointsAction(
  formData: FormData
): Promise<void> {
  const lessonId = str(formData, "lessonId");
  const path = LEARNING_LEARNER_ROUTES.lesson(lessonId);
  const user = await getServerUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  if (!lessonId) {
    redirect(
      `${LEARNING_LEARNER_ROUTES.hub}?error=${encodeURIComponent("Lesson is required.")}`
    );
  }
  const supabase = await createClient();
  const result = await unlockMyLessonWithUmPoints(supabase, lessonId);
  // Fail closed: only success===true && unlocked===true reach ok:true.
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?unlocked=1`);
}

export async function upsertLessonMediaPositionAction(
  formData: FormData
): Promise<void> {
  const lessonId = str(formData, "lessonId");
  const positionSeconds = Number(str(formData, "positionSeconds"));
  const contentBlockId = str(formData, "contentBlockId") || null;
  const user = await getServerUser();
  if (!user || !lessonId) return;
  const supabase = await createClient();
  await upsertMyLearningLessonMediaPosition(supabase, {
    lessonId,
    positionSeconds: Number.isFinite(positionSeconds) ? positionSeconds : 0,
    contentBlockId,
  });
}

export async function startProjectSubmissionAction(
  formData: FormData
): Promise<void> {
  const activityId = str(formData, "activityId");
  const path = LEARNING_PROJECT_ROUTES.learner(activityId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await startMyProjectSubmission(supabase, activityId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath(path);
  redirect(path);
}

export async function saveAndSubmitProjectAction(
  formData: FormData
): Promise<void> {
  const activityId = str(formData, "activityId");
  const submissionId = str(formData, "submissionId");
  const bodyText = String(formData.get("bodyText") ?? "");
  const artifactUrl = str(formData, "artifactUrl") || null;
  const path = LEARNING_PROJECT_ROUTES.learner(activityId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const saved = await saveMyProjectSubmission(supabase, {
    submissionId,
    bodyText,
    artifactUrl,
  });
  if (!saved.ok) {
    redirect(`${path}?error=${encodeURIComponent(saved.message)}`);
  }
  const submitted = await submitMyProjectSubmission(supabase, submissionId);
  if (!submitted.ok) {
    redirect(`${path}?error=${encodeURIComponent(submitted.message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?submitted=1`);
}

export async function reviewProjectSubmissionAction(
  formData: FormData
): Promise<void> {
  const submissionId = str(formData, "submissionId");
  const courseId = str(formData, "courseId");
  const status = str(formData, "status");
  const feedback = String(formData.get("feedback") ?? "") || null;
  const path = LEARNING_PROJECT_ROUTES.review(courseId, submissionId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await reviewProjectSubmission(supabase, {
    submissionId,
    status,
    feedback,
  });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?reviewed=1`);
}

export async function upsertProjectSpecAction(
  formData: FormData
): Promise<void> {
  const activityId = str(formData, "activityId");
  const courseId = str(formData, "courseId");
  const instructions = String(formData.get("instructions") ?? "");
  const path = LEARNING_PROJECT_ROUTES.author(courseId, activityId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await upsertProjectSpec(supabase, activityId, instructions);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?saved=1`);
}

export async function startLabAction(formData: FormData): Promise<void> {
  const activityId = str(formData, "activityId");
  const path = LEARNING_LAB_ROUTES.learner(activityId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await startMyLab(supabase, activityId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath(path);
  redirect(path);
}

export async function completeLabAction(formData: FormData): Promise<void> {
  const activityId = str(formData, "activityId");
  const path = LEARNING_LAB_ROUTES.learner(activityId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await completeMyLab(supabase, activityId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?completed=1`);
}

export async function upsertLabSpecAction(formData: FormData): Promise<void> {
  const activityId = str(formData, "activityId");
  const courseId = str(formData, "courseId");
  const instructions = String(formData.get("instructions") ?? "");
  const validationHook = str(formData, "validationHook") || null;
  const path = LEARNING_LAB_ROUTES.author(courseId, activityId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await upsertLabSpec(supabase, {
    activityId,
    instructions,
    validationHook,
  });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?saved=1`);
}

export async function trackCourseResourceDownloadAction(
  formData: FormData
): Promise<void> {
  const resourceId = str(formData, "resourceId");
  const courseId = str(formData, "courseId");
  const url = str(formData, "url");
  const path = LEARNING_COURSE_RESOURCE_ROUTES.learner(courseId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await trackMyCourseResourceDownload(supabase, resourceId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  if (url) redirect(url);
  revalidatePath(path);
  redirect(path);
}

export async function upsertCourseResourceAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const title = str(formData, "title");
  const resourceKindRaw = str(formData, "resourceKind");
  const url = str(formData, "url");
  const filename = str(formData, "filename") || null;
  const path = LEARNING_COURSE_RESOURCE_ROUTES.author(courseId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (
    !(LEARNING_COURSE_RESOURCE_KINDS as readonly string[]).includes(
      resourceKindRaw
    )
  ) {
    redirect(`${path}?error=${encodeURIComponent("Invalid resource kind")}`);
  }
  const resourceKind = resourceKindRaw as LearningCourseResourceKind;
  const supabase = await createClient();
  const result = await upsertCourseResource(supabase, {
    courseId,
    title,
    resourceKind,
    url,
    filename,
  });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?saved=1`);
}

export async function publishCourseResourceAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const resourceId = str(formData, "resourceId");
  const path = LEARNING_COURSE_RESOURCE_ROUTES.author(courseId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await publishCourseResource(supabase, resourceId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?published=1`);
}

export async function createAiTutorThreadAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const lessonId = str(formData, "lessonId");
  const title = str(formData, "title") || "AI Tutor";
  const path = LEARNING_AI_TUTOR_ROUTES.lesson(lessonId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await createMyAiTutorThread(supabase, {
    courseId,
    lessonId,
    title,
  });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  const threadId =
    result.data && typeof result.data.id === "string" ? result.data.id : "";
  revalidatePath(path);
  redirect(threadId ? `${path}?thread=${threadId}` : path);
}

export async function appendAiTutorMessageAction(
  formData: FormData
): Promise<void> {
  const lessonId = str(formData, "lessonId");
  const threadId = str(formData, "threadId");
  const kind = str(formData, "kind") as LearningAiTutorMessageKind;
  const content = String(formData.get("content") ?? "").trim();
  const path = LEARNING_AI_TUTOR_ROUTES.lesson(lessonId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (
    !(LEARNING_AI_TUTOR_MESSAGE_KINDS as readonly string[]).includes(kind)
  ) {
    redirect(`${path}?thread=${threadId}&error=${encodeURIComponent("Invalid kind")}`);
  }
  const supabase = await createClient();
  const result = await appendMyAiTutorMessage(supabase, {
    threadId,
    kind,
    content,
  });
  if (!result.ok) {
    redirect(
      `${path}?thread=${threadId}&error=${encodeURIComponent(result.message)}`
    );
  }
  revalidatePath(path);
  redirect(`${path}?thread=${threadId}`);
}
