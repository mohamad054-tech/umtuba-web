/**
 * Teacher Center course studio — product fields on top of existing
 * Space → Program → Course authoring RPCs.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LEARNING_COURSE_DIFFICULTIES,
  LEARNING_COURSE_RPCS,
  LEARNING_COURSE_VISIBILITIES,
  type LearningCourseDifficulty,
  type LearningCourseVisibility,
} from "./coursesFoundation";
import {
  createInstructorCourse,
  createInstructorProgram,
  createInstructorSpace,
} from "./instructorBootstrap";
import { canTeacherUseCenter, type LearningTeacherStatus } from "./teacherPlatform";

type AnyClient = SupabaseClient;

export const LEARNING_TEACHER_COURSE_ACCESS = ["free", "paid"] as const;
export type LearningTeacherCourseAccess =
  (typeof LEARNING_TEACHER_COURSE_ACCESS)[number];

export const LEARNING_TEACHER_COURSE_RPCS = {
  upsertProduct: "upsert_learning_teacher_course_product",
  getProduct: "get_learning_teacher_course_product",
} as const;

export type LearningTeacherCourseProduct = {
  course_id: string;
  subtitle: string | null;
  prerequisites: string | null;
  learning_objectives: string[];
  access_kind: LearningTeacherCourseAccess;
  future_price_amount_minor: number | null;
  future_price_currency: string | null;
};

export type TeacherCourseCreateInput = {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  category?: string | null;
  level?: string | null;
  language?: string;
  cover_url?: string | null;
  promo_video_url?: string | null;
  learning_objectives?: string[];
  prerequisites?: string | null;
  access_kind?: string;
  future_price_amount_minor?: number | null;
  future_price_currency?: string | null;
};

export type TeacherCourseResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const HTTP_RE = /^https?:\/\//i;
const LANG_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

function trimOrNull(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function canTeacherCreateCourse(
  status: LearningTeacherStatus | null | undefined
): boolean {
  return canTeacherUseCenter(status);
}

export function validateTeacherCourseCreateInput(
  raw: TeacherCourseCreateInput
): TeacherCourseResult<TeacherCourseCreateInput> {
  const title = (raw.title ?? "").trim();
  if (title.length < 3 || title.length > 160) {
    return { ok: false, message: "teacher.course.error.title" };
  }
  const language = (raw.language ?? "ar").trim() || "ar";
  if (!LANG_RE.test(language)) {
    return { ok: false, message: "teacher.course.error.language" };
  }
  const level = raw.level?.trim() || null;
  if (
    level &&
    !(LEARNING_COURSE_DIFFICULTIES as readonly string[]).includes(level)
  ) {
    return { ok: false, message: "teacher.course.error.level" };
  }
  const access =
    raw.access_kind === "paid" ? "paid" : raw.access_kind === "free" || !raw.access_kind
      ? "free"
      : null;
  if (!access) {
    return { ok: false, message: "teacher.course.error.access" };
  }
  const cover = trimOrNull(raw.cover_url, 2048);
  const promo = trimOrNull(raw.promo_video_url, 2048);
  if ((cover && !HTTP_RE.test(cover)) || (promo && !HTTP_RE.test(promo))) {
    return { ok: false, message: "teacher.course.error.media" };
  }
  const price =
    raw.future_price_amount_minor == null ||
    Number.isNaN(Number(raw.future_price_amount_minor))
      ? null
      : Math.trunc(Number(raw.future_price_amount_minor));
  if (price != null && (price < 0 || price > 1_000_000_000)) {
    return { ok: false, message: "teacher.course.error.price" };
  }
  const objectives = (raw.learning_objectives ?? [])
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 16);
  return {
    ok: true,
    data: {
      title,
      subtitle: trimOrNull(raw.subtitle, 240),
      description: trimOrNull(raw.description, 8000),
      category: trimOrNull(raw.category, 80),
      level,
      language,
      cover_url: cover,
      promo_video_url: promo,
      learning_objectives: objectives,
      prerequisites: trimOrNull(raw.prerequisites, 2000),
      access_kind: access,
      future_price_amount_minor: access === "paid" ? price : null,
      future_price_currency:
        access === "paid"
          ? (trimOrNull(raw.future_price_currency, 8) ?? "USD")
          : null,
    },
  };
}

export function resolveCourseVisibility(
  access: LearningTeacherCourseAccess
): LearningCourseVisibility {
  return access === "free" ? "public" : "private";
}

export async function createTeacherCourseStudio(
  supabase: AnyClient,
  teacherDisplayName: string,
  raw: TeacherCourseCreateInput
): Promise<TeacherCourseResult<{ course_id: string }>> {
  const validated = validateTeacherCourseCreateInput(raw);
  if (!validated.ok) return validated;

  const studioName = `${teacherDisplayName.trim() || "Teacher"} Studio`.slice(
    0,
    120
  );
  const space = await createInstructorSpace(supabase, {
    name: studioName,
    mode: "creator_academy",
    visibility: "private",
    default_language: validated.data.language,
    publish: true,
  });
  if (!space.ok) return space;

  const program = await createInstructorProgram(supabase, {
    space_id: space.data.space_id,
    name: validated.data.title,
    format: "self_paced",
    description: validated.data.description,
    visibility: resolveCourseVisibility(
      validated.data.access_kind as LearningTeacherCourseAccess
    ),
    default_language: validated.data.language,
  });
  if (!program.ok) return program;

  const publishedProgram = await supabase.rpc("publish_learning_program", {
    p_program_id: program.data.program_id,
  });
  if (publishedProgram.error) {
    return { ok: false, message: "teacher.course.error.generic" };
  }

  const course = await createInstructorCourse(supabase, {
    program_id: program.data.program_id,
    name: validated.data.title,
    description: validated.data.description,
    visibility: resolveCourseVisibility(
      validated.data.access_kind as LearningTeacherCourseAccess
    ),
    default_language: validated.data.language,
  });
  if (!course.ok) return course;

  const branding = {
    cover_url: validated.data.cover_url ?? undefined,
    intro_video_url: validated.data.promo_video_url ?? undefined,
  };
  const updated = await supabase.rpc(LEARNING_COURSE_RPCS.update, {
    p_course_id: course.data.course_id,
    p_category: validated.data.category,
    p_difficulty: validated.data.level as LearningCourseDifficulty | null,
    p_branding_metadata: branding,
    p_ai_metadata: { outcomes: validated.data.learning_objectives ?? [] },
    p_marketplace_ready: validated.data.access_kind === "paid",
  });
  if (updated.error) {
    return { ok: false, message: "teacher.course.error.generic" };
  }

  const product = await supabase.rpc(
    LEARNING_TEACHER_COURSE_RPCS.upsertProduct,
    {
      p_course_id: course.data.course_id,
      p_subtitle: validated.data.subtitle,
      p_prerequisites: validated.data.prerequisites,
      p_learning_objectives: validated.data.learning_objectives,
      p_access_kind: validated.data.access_kind,
      p_future_price_amount_minor: validated.data.future_price_amount_minor,
      p_future_price_currency: validated.data.future_price_currency,
    }
  );
  if (product.error) {
    return { ok: false, message: "teacher.course.error.generic" };
  }

  return { ok: true, data: { course_id: course.data.course_id } };
}

export function parseObjectivesField(raw: string): string[] {
  return raw
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 16);
}

export function isAllowedCourseVisibility(
  value: string
): value is LearningCourseVisibility {
  return (LEARNING_COURSE_VISIBILITIES as readonly string[]).includes(value);
}
