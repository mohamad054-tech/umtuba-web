"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  LEARNING_TEACHER_ROUTES,
  canTeacherUseCenter,
  loadMyTeacherProfile,
  saveTeacherProfileDraft,
  submitTeacherApplication,
} from "../../../lib/learning/teacherPlatform";
import {
  LEARNING_TEACHER_COURSE_RPCS,
  canTeacherCreateCourse,
  createTeacherCourseStudio,
  parseObjectivesField,
} from "../../../lib/learning/teacherCourseStudio";
import { LEARNING_COURSE_RPCS } from "../../../lib/learning/coursesFoundation";
import { submitCourseReview } from "../../../lib/learning/courseReviews";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../lib/learning/instructorAuthoring";

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function saveTeacherDraftAction(formData: FormData) {
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(LEARNING_TEACHER_ROUTES.become)}`);
  const supabase = await createClient();
  const result = await saveTeacherProfileDraft(supabase, {
    display_name: formString(formData, "display_name"),
    biography: formString(formData, "biography"),
    subjects: formString(formData, "subjects").split(","),
    teaching_languages: formString(formData, "teaching_languages").split(","),
    experience_level: formString(formData, "experience_level") || null,
    qualifications: formString(formData, "qualifications"),
    profile_image_url: formString(formData, "profile_image_url"),
    teaching_description: formString(formData, "teaching_description"),
  });
  revalidatePath(LEARNING_TEACHER_ROUTES.become);
  revalidatePath(LEARNING_TEACHER_ROUTES.center);
  if (!result.ok) {
    redirect(`${LEARNING_TEACHER_ROUTES.become}?error=${encodeURIComponent(result.message)}`);
  }
  redirect(`${LEARNING_TEACHER_ROUTES.become}?saved=1`);
}

export async function submitTeacherApplicationAction(formData: FormData) {
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(LEARNING_TEACHER_ROUTES.become)}`);
  const supabase = await createClient();
  const result = await submitTeacherApplication(supabase, {
    display_name: formString(formData, "display_name"),
    biography: formString(formData, "biography"),
    subjects: formString(formData, "subjects").split(","),
    teaching_languages: formString(formData, "teaching_languages").split(","),
    experience_level: formString(formData, "experience_level") || null,
    qualifications: formString(formData, "qualifications"),
    profile_image_url: formString(formData, "profile_image_url"),
    teaching_description: formString(formData, "teaching_description"),
  });
  revalidatePath(LEARNING_TEACHER_ROUTES.become);
  revalidatePath(LEARNING_TEACHER_ROUTES.center);
  if (!result.ok) {
    redirect(`${LEARNING_TEACHER_ROUTES.become}?error=${encodeURIComponent(result.message)}`);
  }
  redirect(`${LEARNING_TEACHER_ROUTES.become}?submitted=1`);
}

export async function createTeacherCourseAction(formData: FormData) {
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(LEARNING_TEACHER_ROUTES.courseNew)}`);
  const supabase = await createClient();
  const profile = await loadMyTeacherProfile(supabase);
  if (!profile.ok || !canTeacherCreateCourse(profile.data?.status)) {
    redirect(`${LEARNING_TEACHER_ROUTES.courseNew}?error=teacher.course.notApproved`);
  }
  const result = await createTeacherCourseStudio(
    supabase,
    profile.data?.display_name ?? user.id,
    {
      title: formString(formData, "title"),
      subtitle: formString(formData, "subtitle"),
      description: formString(formData, "description"),
      category: formString(formData, "category"),
      level: formString(formData, "level"),
      language: formString(formData, "language") || "ar",
      cover_url: formString(formData, "cover_url"),
      promo_video_url: formString(formData, "promo_video_url"),
      learning_objectives: parseObjectivesField(formString(formData, "learning_objectives")),
      prerequisites: formString(formData, "prerequisites"),
      access_kind: formString(formData, "access_kind") || "free",
      future_price_amount_minor: formString(formData, "future_price_amount_minor")
        ? Number(formString(formData, "future_price_amount_minor"))
        : null,
      future_price_currency: formString(formData, "future_price_currency") || "USD",
    }
  );
  revalidatePath(LEARNING_TEACHER_ROUTES.courses);
  revalidatePath(LEARNING_TEACHER_ROUTES.center);
  if (!result.ok) {
    redirect(`${LEARNING_TEACHER_ROUTES.courseNew}?error=${encodeURIComponent(result.message)}`);
  }
  redirect(LEARNING_TEACHER_ROUTES.course(result.data.course_id));
}

export async function updateTeacherCourseAction(formData: FormData) {
  const user = await getServerUser();
  const courseId = formString(formData, "course_id");
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(LEARNING_TEACHER_ROUTES.courseEdit(courseId))}`);
  }
  const supabase = await createClient();
  const profile = await loadMyTeacherProfile(supabase);
  if (!profile.ok || !canTeacherUseCenter(profile.data?.status)) {
    redirect(`${LEARNING_TEACHER_ROUTES.courseEdit(courseId)}?error=teacher.course.notApproved`);
  }

  const access = formString(formData, "access_kind") || "free";
  const update = await supabase.rpc(LEARNING_COURSE_RPCS.update, {
    p_course_id: courseId,
    p_name: formString(formData, "title") || null,
    p_description: formString(formData, "description") || null,
    p_category: formString(formData, "category") || null,
    p_difficulty: formString(formData, "level") || null,
    p_default_language: formString(formData, "language") || null,
    p_branding_metadata: {
      cover_url: formString(formData, "cover_url") || undefined,
      intro_video_url: formString(formData, "promo_video_url") || undefined,
    },
    p_ai_metadata: {
      outcomes: parseObjectivesField(formString(formData, "learning_objectives")),
    },
    p_marketplace_ready: access === "paid",
  });
  if (update.error) {
    redirect(
      `${LEARNING_TEACHER_ROUTES.courseEdit(courseId)}?error=teacher.course.error.generic`
    );
  }

  const product = await supabase.rpc(LEARNING_TEACHER_COURSE_RPCS.upsertProduct, {
    p_course_id: courseId,
    p_subtitle: formString(formData, "subtitle") || null,
    p_prerequisites: formString(formData, "prerequisites") || null,
    p_learning_objectives: parseObjectivesField(formString(formData, "learning_objectives")),
    p_access_kind: access,
    p_future_price_amount_minor: formString(formData, "future_price_amount_minor")
      ? Number(formString(formData, "future_price_amount_minor"))
      : null,
    p_future_price_currency: formString(formData, "future_price_currency") || "USD",
  });
  if (product.error) {
    redirect(
      `${LEARNING_TEACHER_ROUTES.courseEdit(courseId)}?error=teacher.course.error.generic`
    );
  }

  revalidatePath(LEARNING_TEACHER_ROUTES.course(courseId));
  revalidatePath(LEARNING_INSTRUCTOR_ROUTES.course(courseId));
  redirect(LEARNING_TEACHER_ROUTES.course(courseId));
}

export async function submitCourseReviewAction(formData: FormData) {
  const user = await getServerUser();
  const courseId = formString(formData, "course_id");
  const returnTo = formString(formData, "return_to") || `/learning/courses/${courseId}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  const supabase = await createClient();
  const result = await submitCourseReview(supabase, {
    course_id: courseId,
    rating: Number(formString(formData, "rating")),
    comment: formString(formData, "comment"),
  });
  revalidatePath(returnTo);
  if (!result.ok) {
    redirect(`${returnTo}?reviewError=${encodeURIComponent(result.message)}`);
  }
  redirect(`${returnTo}?reviewed=1`);
}
