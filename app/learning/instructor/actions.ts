"use server";

import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  archiveLearningCourse,
  archiveLearningProgram,
  archiveLearningSpace,
  createLearningCourse,
  createLearningProgram,
  createLearningSpace,
  publishLearningCourse,
  publishLearningProgram,
  publishLearningSpace,
} from "../../../lib/learning/instructorAuthoring";
import {
  LEARNING_COURSE_VISIBILITIES,
  type LearningCourseVisibility,
} from "../../../lib/learning/coursesFoundation";
import {
  LEARNING_PROGRAM_FORMATS,
  LEARNING_PROGRAM_VISIBILITIES,
  type LearningProgramFormat,
  type LearningProgramVisibility,
} from "../../../lib/learning/programsFoundation";
import {
  LEARNING_SPACE_MODES,
  LEARNING_SPACE_VISIBILITIES,
  type LearningSpaceMode,
  type LearningSpaceVisibility,
} from "../../../lib/learning/spacesFoundation";

function isMode(value: string): value is LearningSpaceMode {
  return (LEARNING_SPACE_MODES as readonly string[]).includes(value);
}

function isVisibility(value: string): value is LearningSpaceVisibility {
  return (LEARNING_SPACE_VISIBILITIES as readonly string[]).includes(value);
}

function isProgramFormat(value: string): value is LearningProgramFormat {
  return (LEARNING_PROGRAM_FORMATS as readonly string[]).includes(value);
}

function isProgramVisibility(
  value: string
): value is LearningProgramVisibility {
  return (LEARNING_PROGRAM_VISIBILITIES as readonly string[]).includes(value);
}

function isCourseVisibility(
  value: string
): value is LearningCourseVisibility {
  return (LEARNING_COURSE_VISIBILITIES as readonly string[]).includes(value);
}

export async function createLearningSpaceAction(
  formData: FormData
): Promise<void> {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_INSTRUCTOR_ROUTES.spaceNew)}`
    );
  }

  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const description = String(formData.get("description") ?? "");
  const modeRaw = String(formData.get("mode") ?? "");
  const visibilityRaw = String(formData.get("visibility") ?? "private");

  if (!isMode(modeRaw)) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.spaceNew}?error=${encodeURIComponent(
        "Invalid learning space mode"
      )}`
    );
  }
  if (!isVisibility(visibilityRaw)) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.spaceNew}?error=${encodeURIComponent(
        "Invalid learning space visibility"
      )}`
    );
  }

  const supabase = await createClient();
  const result = await createLearningSpace(supabase, {
    name,
    slug,
    description: description.trim() ? description : null,
    mode: modeRaw,
    visibility: visibilityRaw,
  });

  if (!result.ok) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.spaceNew}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  redirect(LEARNING_INSTRUCTOR_ROUTES.space(result.data.space_id));
}

export async function publishLearningSpaceAction(
  formData: FormData
): Promise<void> {
  const spaceId = String(formData.get("spaceId") ?? "").trim();
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        spaceId
          ? LEARNING_INSTRUCTOR_ROUTES.space(spaceId)
          : LEARNING_INSTRUCTOR_ROUTES.hub
      )}`
    );
  }

  if (!spaceId) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.hub}?error=${encodeURIComponent(
        "Space is required"
      )}`
    );
  }

  const supabase = await createClient();
  const result = await publishLearningSpace(supabase, spaceId);
  if (!result.ok) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.space(spaceId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  redirect(
    `${LEARNING_INSTRUCTOR_ROUTES.space(spaceId)}?notice=${encodeURIComponent(
      "Space published"
    )}`
  );
}

export async function archiveLearningSpaceAction(
  formData: FormData
): Promise<void> {
  const spaceId = String(formData.get("spaceId") ?? "").trim();
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        spaceId
          ? LEARNING_INSTRUCTOR_ROUTES.space(spaceId)
          : LEARNING_INSTRUCTOR_ROUTES.hub
      )}`
    );
  }

  if (!spaceId) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.hub}?error=${encodeURIComponent(
        "Space is required"
      )}`
    );
  }

  const supabase = await createClient();
  const result = await archiveLearningSpace(supabase, spaceId);
  if (!result.ok) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.space(spaceId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  redirect(
    `${LEARNING_INSTRUCTOR_ROUTES.space(spaceId)}?notice=${encodeURIComponent(
      "Space archived"
    )}`
  );
}

export async function createLearningProgramAction(
  formData: FormData
): Promise<void> {
  const spaceId = String(formData.get("spaceId") ?? "").trim();
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        spaceId
          ? LEARNING_INSTRUCTOR_ROUTES.programNew(spaceId)
          : LEARNING_INSTRUCTOR_ROUTES.hub
      )}`
    );
  }

  if (!spaceId) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.hub}?error=${encodeURIComponent(
        "Space is required"
      )}`
    );
  }

  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const description = String(formData.get("description") ?? "");
  const formatRaw = String(formData.get("format") ?? "");
  const visibilityRaw = String(formData.get("visibility") ?? "private");

  if (!isProgramFormat(formatRaw)) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.programNew(spaceId)}?error=${encodeURIComponent(
        "Invalid learning program format"
      )}`
    );
  }
  if (!isProgramVisibility(visibilityRaw)) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.programNew(spaceId)}?error=${encodeURIComponent(
        "Invalid learning program visibility"
      )}`
    );
  }

  const supabase = await createClient();
  const result = await createLearningProgram(supabase, {
    space_id: spaceId,
    name,
    slug,
    format: formatRaw,
    description: description.trim() ? description : null,
    visibility: visibilityRaw,
  });

  if (!result.ok) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.programNew(spaceId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  redirect(LEARNING_INSTRUCTOR_ROUTES.program(result.data.program_id));
}

export async function publishLearningProgramAction(
  formData: FormData
): Promise<void> {
  const programId = String(formData.get("programId") ?? "").trim();
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        programId
          ? LEARNING_INSTRUCTOR_ROUTES.program(programId)
          : LEARNING_INSTRUCTOR_ROUTES.hub
      )}`
    );
  }

  if (!programId) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.hub}?error=${encodeURIComponent(
        "Program is required"
      )}`
    );
  }

  const supabase = await createClient();
  const result = await publishLearningProgram(supabase, programId);
  if (!result.ok) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.program(programId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  redirect(
    `${LEARNING_INSTRUCTOR_ROUTES.program(programId)}?notice=${encodeURIComponent(
      "Program published"
    )}`
  );
}

export async function archiveLearningProgramAction(
  formData: FormData
): Promise<void> {
  const programId = String(formData.get("programId") ?? "").trim();
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        programId
          ? LEARNING_INSTRUCTOR_ROUTES.program(programId)
          : LEARNING_INSTRUCTOR_ROUTES.hub
      )}`
    );
  }

  if (!programId) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.hub}?error=${encodeURIComponent(
        "Program is required"
      )}`
    );
  }

  const supabase = await createClient();
  const result = await archiveLearningProgram(supabase, programId);
  if (!result.ok) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.program(programId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  redirect(
    `${LEARNING_INSTRUCTOR_ROUTES.program(programId)}?notice=${encodeURIComponent(
      "Program archived"
    )}`
  );
}

export async function createLearningCourseAction(
  formData: FormData
): Promise<void> {
  const programId = String(formData.get("programId") ?? "").trim();
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        programId
          ? LEARNING_INSTRUCTOR_ROUTES.courseNew(programId)
          : LEARNING_INSTRUCTOR_ROUTES.hub
      )}`
    );
  }

  if (!programId) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.hub}?error=${encodeURIComponent(
        "Program is required"
      )}`
    );
  }

  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const description = String(formData.get("description") ?? "");
  const visibilityRaw = String(formData.get("visibility") ?? "private");

  if (!isCourseVisibility(visibilityRaw)) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.courseNew(programId)}?error=${encodeURIComponent(
        "Invalid learning course visibility"
      )}`
    );
  }

  const supabase = await createClient();
  const result = await createLearningCourse(supabase, {
    program_id: programId,
    name,
    slug,
    description: description.trim() ? description : null,
    visibility: visibilityRaw,
  });

  if (!result.ok) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.courseNew(programId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  redirect(LEARNING_INSTRUCTOR_ROUTES.course(result.data.course_id));
}

export async function publishLearningCourseAction(
  formData: FormData
): Promise<void> {
  const courseId = String(formData.get("courseId") ?? "").trim();
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        courseId
          ? LEARNING_INSTRUCTOR_ROUTES.course(courseId)
          : LEARNING_INSTRUCTOR_ROUTES.hub
      )}`
    );
  }

  if (!courseId) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.hub}?error=${encodeURIComponent(
        "Course is required"
      )}`
    );
  }

  const supabase = await createClient();
  const result = await publishLearningCourse(supabase, courseId);
  if (!result.ok) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.course(courseId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  redirect(
    `${LEARNING_INSTRUCTOR_ROUTES.course(courseId)}?notice=${encodeURIComponent(
      "Course published"
    )}`
  );
}

export async function archiveLearningCourseAction(
  formData: FormData
): Promise<void> {
  const courseId = String(formData.get("courseId") ?? "").trim();
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        courseId
          ? LEARNING_INSTRUCTOR_ROUTES.course(courseId)
          : LEARNING_INSTRUCTOR_ROUTES.hub
      )}`
    );
  }

  if (!courseId) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.hub}?error=${encodeURIComponent(
        "Course is required"
      )}`
    );
  }

  const supabase = await createClient();
  const result = await archiveLearningCourse(supabase, courseId);
  if (!result.ok) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.course(courseId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  redirect(
    `${LEARNING_INSTRUCTOR_ROUTES.course(courseId)}?notice=${encodeURIComponent(
      "Course archived"
    )}`
  );
}
