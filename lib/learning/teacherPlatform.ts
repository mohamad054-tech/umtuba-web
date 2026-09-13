/**
 * UMTUBA Learning — Teacher + Student Platform V1.
 *
 * Become a Teacher lifecycle and Teacher Center contracts.
 * Approval is never client-granted. DB RPCs remain the authority.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const LEARNING_TEACHER_PLATFORM_MIGRATION =
  "20260934_learning_teacher_student_platform_v1.sql";

export const LEARNING_TEACHER_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "suspended",
  "rejected",
] as const;
export type LearningTeacherStatus = (typeof LEARNING_TEACHER_STATUSES)[number];

export const LEARNING_TEACHER_PUBLIC_STATUS: LearningTeacherStatus = "approved";

export const LEARNING_TEACHER_ROUTES = {
  become: "/learning/become-a-teacher",
  center: "/learning/teacher",
  courses: "/learning/teacher/courses",
  courseNew: "/learning/teacher/courses/new",
  course: (courseId: string) => `/learning/teacher/courses/${courseId}`,
  courseEdit: (courseId: string) => `/learning/teacher/courses/${courseId}/edit`,
  students: "/learning/teacher/students",
  reviews: "/learning/teacher/reviews",
  analytics: "/learning/teacher/analytics",
  earnings: "/learning/teacher/earnings",
  profile: "/learning/teacher/profile",
  settings: "/learning/teacher/settings",
  publicProfile: (userId: string) => `/learning/teachers/${userId}`,
} as const;

export const LEARNING_TEACHER_CENTER_NAV = [
  { id: "dashboard", href: LEARNING_TEACHER_ROUTES.center },
  { id: "courses", href: LEARNING_TEACHER_ROUTES.courses },
  { id: "create", href: LEARNING_TEACHER_ROUTES.courseNew },
  { id: "students", href: LEARNING_TEACHER_ROUTES.students },
  { id: "reviews", href: LEARNING_TEACHER_ROUTES.reviews },
  { id: "analytics", href: LEARNING_TEACHER_ROUTES.analytics },
  { id: "earnings", href: LEARNING_TEACHER_ROUTES.earnings },
  { id: "profile", href: LEARNING_TEACHER_ROUTES.profile },
  { id: "settings", href: LEARNING_TEACHER_ROUTES.settings },
] as const;

export const LEARNING_TEACHER_RPCS = {
  getMine: "get_my_learning_teacher_profile",
  saveDraft: "save_learning_teacher_profile_draft",
  submit: "submit_learning_teacher_application",
  getPublic: "get_public_learning_teacher_profile",
  moderate: "moderate_learning_teacher_application",
} as const;

export const LEARNING_TEACHER_SUBJECTS = [
  "language",
  "business",
  "technology",
  "design",
  "science",
  "arts",
  "health",
  "faith",
  "life_skills",
  "other",
] as const;
export type LearningTeacherSubject = (typeof LEARNING_TEACHER_SUBJECTS)[number];

export const LEARNING_TEACHER_EXPERIENCE_LEVELS = [
  "new",
  "1_3_years",
  "3_7_years",
  "7_plus_years",
] as const;
export type LearningTeacherExperienceLevel =
  (typeof LEARNING_TEACHER_EXPERIENCE_LEVELS)[number];

export type LearningTeacherProfile = {
  user_id: string;
  display_name: string;
  biography: string | null;
  subjects: string[];
  teaching_languages: string[];
  experience_level: LearningTeacherExperienceLevel | null;
  qualifications: string | null;
  profile_image_url: string | null;
  teaching_description: string | null;
  status: LearningTeacherStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_user_id: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
};

export type LearningTeacherResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type LearningTeacherDraftInput = {
  display_name: string;
  biography?: string | null;
  subjects?: string[];
  teaching_languages?: string[];
  experience_level?: string | null;
  qualifications?: string | null;
  profile_image_url?: string | null;
  teaching_description?: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LANG_RE = /^[a-z]{2}(-[A-Z]{2})?$/;
const HTTP_RE = /^https?:\/\//i;

export function isLearningTeacherUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isLearningTeacherStatus(
  value: string | null | undefined
): value is LearningTeacherStatus {
  return (
    typeof value === "string" &&
    (LEARNING_TEACHER_STATUSES as readonly string[]).includes(value)
  );
}

export function canTeacherUseCenter(
  status: LearningTeacherStatus | null | undefined
): boolean {
  return status === "approved";
}

export function canTeacherEditApplication(
  status: LearningTeacherStatus | null | undefined
): boolean {
  return status === "draft" || status === "rejected" || status == null;
}

export function isPublicTeacherProfile(
  status: LearningTeacherStatus | null | undefined
): boolean {
  return status === LEARNING_TEACHER_PUBLIC_STATUS;
}

export function teacherStatusMessageKey(
  status: LearningTeacherStatus | null | undefined
):
  | "teacher.become.status.draft"
  | "teacher.become.status.pending_review"
  | "teacher.become.status.approved"
  | "teacher.become.status.suspended"
  | "teacher.become.status.rejected" {
  switch (status) {
    case "pending_review":
      return "teacher.become.status.pending_review";
    case "approved":
      return "teacher.become.status.approved";
    case "suspended":
      return "teacher.become.status.suspended";
    case "rejected":
      return "teacher.become.status.rejected";
    default:
      return "teacher.become.status.draft";
  }
}

function trimOrNull(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function parseCsvList(raw: string | string[] | null | undefined, maxItems: number): string[] {
  const parts = Array.isArray(raw)
    ? raw
    : String(raw ?? "")
        .split(/[,|\n]/)
        .map((s) => s.trim());
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const item = part.trim();
    if (!item || seen.has(item.toLowerCase())) continue;
    seen.add(item.toLowerCase());
    out.push(item.slice(0, 80));
    if (out.length >= maxItems) break;
  }
  return out;
}

export function validateTeacherDraftInput(
  raw: LearningTeacherDraftInput
): LearningTeacherResult<LearningTeacherDraftInput> {
  const displayName = (raw.display_name ?? "").trim();
  if (displayName.length < 2 || displayName.length > 80) {
    return { ok: false, message: "teacher.become.error.displayName" };
  }
  const biography = trimOrNull(raw.biography, 4000);
  const teachingDescription = trimOrNull(raw.teaching_description, 4000);
  const qualifications = trimOrNull(raw.qualifications, 2000);
  const subjects = parseCsvList(raw.subjects ?? [], 16);
  const languages = parseCsvList(raw.teaching_languages ?? [], 16).filter(
    (lang) => LANG_RE.test(lang) || lang.length <= 32
  );
  const experience =
    raw.experience_level &&
    (LEARNING_TEACHER_EXPERIENCE_LEVELS as readonly string[]).includes(
      raw.experience_level
    )
      ? raw.experience_level
      : null;
  const image = trimOrNull(raw.profile_image_url, 2048);
  if (image && !HTTP_RE.test(image)) {
    return { ok: false, message: "teacher.become.error.profileImage" };
  }
  return {
    ok: true,
    data: {
      display_name: displayName,
      biography,
      subjects,
      teaching_languages: languages,
      experience_level: experience,
      qualifications,
      profile_image_url: image,
      teaching_description: teachingDescription,
    },
  };
}

export function canSubmitTeacherApplication(
  input: LearningTeacherDraftInput
): boolean {
  const validated = validateTeacherDraftInput(input);
  if (!validated.ok) return false;
  return Boolean(
    validated.data.display_name &&
      validated.data.biography &&
      validated.data.teaching_description &&
      (validated.data.subjects?.length ?? 0) > 0 &&
      (validated.data.teaching_languages?.length ?? 0) > 0
  );
}

function sanitizeTeacherRpcError(message: string | undefined): string {
  const raw = (message ?? "").trim();
  if (!raw) return "teacher.become.error.generic";
  const lower = raw.toLowerCase();
  if (lower.includes("authentication required")) {
    return "teacher.become.error.signIn";
  }
  if (lower.includes("not pending") || lower.includes("cannot submit")) {
    return "teacher.become.error.cannotSubmit";
  }
  if (lower.includes("not allowed") || lower.includes("permission")) {
    return "teacher.become.error.forbidden";
  }
  return "teacher.become.error.generic";
}

function asTeacherProfile(value: unknown): LearningTeacherProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.user_id !== "string" || !isLearningTeacherUuid(row.user_id)) {
    return null;
  }
  if (typeof row.display_name !== "string") return null;
  if (!isLearningTeacherStatus(String(row.status ?? ""))) return null;
  return {
    user_id: row.user_id,
    display_name: row.display_name,
    biography: typeof row.biography === "string" ? row.biography : null,
    subjects: Array.isArray(row.subjects)
      ? row.subjects.filter((s): s is string => typeof s === "string")
      : [],
    teaching_languages: Array.isArray(row.teaching_languages)
      ? row.teaching_languages.filter((s): s is string => typeof s === "string")
      : [],
    experience_level:
      typeof row.experience_level === "string" &&
      (LEARNING_TEACHER_EXPERIENCE_LEVELS as readonly string[]).includes(
        row.experience_level
      )
        ? (row.experience_level as LearningTeacherExperienceLevel)
        : null,
    qualifications:
      typeof row.qualifications === "string" ? row.qualifications : null,
    profile_image_url:
      typeof row.profile_image_url === "string" ? row.profile_image_url : null,
    teaching_description:
      typeof row.teaching_description === "string"
        ? row.teaching_description
        : null,
    status: row.status as LearningTeacherStatus,
    submitted_at: typeof row.submitted_at === "string" ? row.submitted_at : null,
    reviewed_at: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
    reviewer_user_id:
      typeof row.reviewer_user_id === "string" ? row.reviewer_user_id : null,
    review_note: typeof row.review_note === "string" ? row.review_note : null,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
  };
}

export async function loadMyTeacherProfile(
  supabase: AnyClient
): Promise<LearningTeacherResult<LearningTeacherProfile | null>> {
  const { data, error } = await supabase.rpc(LEARNING_TEACHER_RPCS.getMine);
  if (error) {
    return { ok: false, message: sanitizeTeacherRpcError(error.message) };
  }
  if (data == null) return { ok: true, data: null };
  const profile = asTeacherProfile(data);
  return { ok: true, data: profile };
}

export async function saveTeacherProfileDraft(
  supabase: AnyClient,
  raw: LearningTeacherDraftInput
): Promise<LearningTeacherResult<LearningTeacherProfile>> {
  const validated = validateTeacherDraftInput(raw);
  if (!validated.ok) return validated;
  const { data, error } = await supabase.rpc(LEARNING_TEACHER_RPCS.saveDraft, {
    p_display_name: validated.data.display_name,
    p_biography: validated.data.biography,
    p_subjects: validated.data.subjects,
    p_teaching_languages: validated.data.teaching_languages,
    p_experience_level: validated.data.experience_level,
    p_qualifications: validated.data.qualifications,
    p_profile_image_url: validated.data.profile_image_url,
    p_teaching_description: validated.data.teaching_description,
  });
  if (error) {
    return { ok: false, message: sanitizeTeacherRpcError(error.message) };
  }
  const profile = asTeacherProfile(data);
  if (!profile) {
    return { ok: false, message: "teacher.become.error.generic" };
  }
  return { ok: true, data: profile };
}

export async function submitTeacherApplication(
  supabase: AnyClient,
  raw: LearningTeacherDraftInput
): Promise<LearningTeacherResult<LearningTeacherProfile>> {
  if (!canSubmitTeacherApplication(raw)) {
    return { ok: false, message: "teacher.become.error.incomplete" };
  }
  const saved = await saveTeacherProfileDraft(supabase, raw);
  if (!saved.ok) return saved;
  const { data, error } = await supabase.rpc(LEARNING_TEACHER_RPCS.submit);
  if (error) {
    return { ok: false, message: sanitizeTeacherRpcError(error.message) };
  }
  const profile = asTeacherProfile(data);
  if (!profile) {
    return { ok: false, message: "teacher.become.error.generic" };
  }
  if (profile.status === "approved") {
    return { ok: false, message: "teacher.become.error.selfApprove" };
  }
  return { ok: true, data: profile };
}

export async function loadPublicTeacherProfile(
  supabase: AnyClient,
  userId: string
): Promise<LearningTeacherResult<LearningTeacherProfile | null>> {
  if (!isLearningTeacherUuid(userId)) {
    return { ok: false, message: "teacher.public.unavailable" };
  }
  const { data, error } = await supabase.rpc(LEARNING_TEACHER_RPCS.getPublic, {
    p_user_id: userId,
  });
  if (error) {
    return { ok: false, message: sanitizeTeacherRpcError(error.message) };
  }
  const profile = asTeacherProfile(data);
  if (!profile || !isPublicTeacherProfile(profile.status)) {
    return { ok: true, data: null };
  }
  return { ok: true, data: profile };
}
