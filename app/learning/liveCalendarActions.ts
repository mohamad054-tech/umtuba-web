"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  LEARNING_LIVE_ROUTES,
  cancelLearningLiveSession,
  completeLearningLiveSession,
  createLearningLiveSession,
  requestLearningLiveJoin,
  startLearningLiveSession,
  updateLearningLiveSession,
  upsertLearningLiveAttendance,
} from "../../lib/learning/liveCalendarFoundation";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function revalidateLive(courseId: string, sessionId?: string) {
  revalidatePath(LEARNING_LIVE_ROUTES.learnerSchedule(courseId));
  revalidatePath(LEARNING_LIVE_ROUTES.instructorSessions(courseId));
  revalidatePath(LEARNING_LIVE_ROUTES.learnerCalendar(courseId));
  revalidatePath(LEARNING_LIVE_ROUTES.instructorCalendar(courseId));
  if (sessionId) {
    revalidatePath(LEARNING_LIVE_ROUTES.learnerSession(courseId, sessionId));
    revalidatePath(LEARNING_LIVE_ROUTES.instructorSession(courseId, sessionId));
  }
}

export async function createLiveSessionAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const title = str(formData, "title");
  const description = String(formData.get("description") ?? "");
  const startsAt = str(formData, "startsAt");
  const endsAt = str(formData, "endsAt");
  const path = LEARNING_LIVE_ROUTES.instructorSessions(courseId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);

  const supabase = await createClient();
  const result = await createLearningLiveSession(supabase, {
    courseId,
    title,
    description,
    startsAt: new Date(startsAt).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
  });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  const sessionId = String(
    (result.data as { session_id?: string }).session_id ?? ""
  );
  revalidateLive(courseId, sessionId || undefined);
  if (sessionId) {
    redirect(LEARNING_LIVE_ROUTES.instructorSession(courseId, sessionId));
  }
  redirect(path);
}

export async function updateLiveSessionAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const sessionId = str(formData, "sessionId");
  const path = LEARNING_LIVE_ROUTES.instructorSession(courseId, sessionId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);

  const startsRaw = str(formData, "startsAt");
  const endsRaw = str(formData, "endsAt");
  const supabase = await createClient();
  const result = await updateLearningLiveSession(supabase, {
    sessionId,
    title: str(formData, "title"),
    description: String(formData.get("description") ?? ""),
    startsAt: startsRaw ? new Date(startsRaw).toISOString() : null,
    endsAt: endsRaw ? new Date(endsRaw).toISOString() : null,
  });
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateLive(courseId, sessionId);
  redirect(`${path}?saved=1`);
}

export async function cancelLiveSessionAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const sessionId = str(formData, "sessionId");
  const path = LEARNING_LIVE_ROUTES.instructorSessions(courseId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await cancelLearningLiveSession(
    supabase,
    sessionId,
    str(formData, "reason") || null
  );
  if (!result.ok) {
    redirect(
      `${LEARNING_LIVE_ROUTES.instructorSession(courseId, sessionId)}?error=${encodeURIComponent(result.message)}`
    );
  }
  revalidateLive(courseId, sessionId);
  redirect(path);
}

export async function startLiveSessionAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const sessionId = str(formData, "sessionId");
  const path = LEARNING_LIVE_ROUTES.instructorSession(courseId, sessionId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await startLearningLiveSession(supabase, sessionId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateLive(courseId, sessionId);
  redirect(path);
}

export async function completeLiveSessionAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const sessionId = str(formData, "sessionId");
  const path = LEARNING_LIVE_ROUTES.instructorSession(courseId, sessionId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await completeLearningLiveSession(supabase, sessionId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateLive(courseId, sessionId);
  redirect(path);
}

export async function joinLiveSessionAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const sessionId = str(formData, "sessionId");
  const path = LEARNING_LIVE_ROUTES.learnerSession(courseId, sessionId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await requestLearningLiveJoin(supabase, sessionId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateLive(courseId, sessionId);
  if (result.data.blocker && !result.data.token) {
    redirect(
      `${path}?joined=1&blocker=${encodeURIComponent(result.data.blocker)}`
    );
  }
  redirect(`${path}?joined=1`);
}

export async function leaveLiveSessionAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const sessionId = str(formData, "sessionId");
  const path = LEARNING_LIVE_ROUTES.learnerSession(courseId, sessionId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await upsertLearningLiveAttendance(supabase, sessionId, "leave");
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateLive(courseId, sessionId);
  redirect(path);
}
