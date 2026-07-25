"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES,
  createInstructorCourse,
  createInstructorProgram,
  createInstructorSpace,
} from "../../../lib/learning/instructorBootstrap";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../lib/learning/instructorAuthoring";
import type { LearningSpaceMode } from "../../../lib/learning/spacesFoundation";
import type { LearningProgramFormat } from "../../../lib/learning/programsFoundation";

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function requireAuthMessage(): Promise<string | null> {
  const user = await getServerUser();
  if (!user) return "Sign in required.";
  return null;
}

export async function createSpaceBootstrapAction(
  formData: FormData
): Promise<void> {
  const authErr = await requireAuthMessage();
  if (authErr) {
    redirect(
      `${LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.spaceNew}?error=${encodeURIComponent(authErr)}`
    );
  }

  const supabase = await createClient();
  const result = await createInstructorSpace(supabase, {
    name: formString(formData, "name"),
    slug: formString(formData, "slug") || undefined,
    description: formString(formData, "description") || null,
    mode: formString(formData, "mode") as LearningSpaceMode,
    visibility: (formString(formData, "visibility") ||
      "private") as "private" | "unlisted" | "public",
    default_language: formString(formData, "default_language") || "en",
    publish: true,
  });

  if (!result.ok) {
    redirect(
      `${LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.spaceNew}?error=${encodeURIComponent(result.message)}`
    );
  }

  revalidatePath(LEARNING_INSTRUCTOR_ROUTES.hub);
  revalidatePath(LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.hub);
  redirect(
    LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.programNew(result.data.space_id)
  );
}

export async function createProgramBootstrapAction(
  formData: FormData
): Promise<void> {
  const spaceId = formString(formData, "spaceId");
  const authErr = await requireAuthMessage();
  if (authErr) {
    redirect(
      `${LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.programNew(spaceId)}?error=${encodeURIComponent(authErr)}`
    );
  }

  const supabase = await createClient();
  const result = await createInstructorProgram(supabase, {
    space_id: spaceId,
    name: formString(formData, "name"),
    slug: formString(formData, "slug") || undefined,
    format: formString(formData, "format") as LearningProgramFormat,
    description: formString(formData, "description") || null,
    visibility: (formString(formData, "visibility") ||
      "private") as "private" | "unlisted" | "public",
    default_language: formString(formData, "default_language") || "en",
  });

  if (!result.ok) {
    redirect(
      `${LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.programNew(spaceId)}?error=${encodeURIComponent(result.message)}`
    );
  }

  revalidatePath(LEARNING_INSTRUCTOR_ROUTES.hub);
  revalidatePath(LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.hub);
  redirect(
    LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.courseNew(result.data.program_id)
  );
}

export async function createCourseBootstrapAction(
  formData: FormData
): Promise<void> {
  const programId = formString(formData, "programId");
  const authErr = await requireAuthMessage();
  if (authErr) {
    redirect(
      `${LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.courseNew(programId)}?error=${encodeURIComponent(authErr)}`
    );
  }

  const supabase = await createClient();
  const result = await createInstructorCourse(supabase, {
    program_id: programId,
    name: formString(formData, "name"),
    slug: formString(formData, "slug") || undefined,
    description: formString(formData, "description") || null,
    visibility: (formString(formData, "visibility") ||
      "private") as "private" | "unlisted" | "public",
    default_language: formString(formData, "default_language") || "en",
  });

  if (!result.ok) {
    redirect(
      `${LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.courseNew(programId)}?error=${encodeURIComponent(result.message)}`
    );
  }

  revalidatePath(LEARNING_INSTRUCTOR_ROUTES.hub);
  revalidatePath(LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.hub);
  revalidatePath(LEARNING_INSTRUCTOR_ROUTES.course(result.data.course_id));
  redirect(LEARNING_INSTRUCTOR_ROUTES.course(result.data.course_id));
}
