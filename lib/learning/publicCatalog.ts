/**
 * UM Learning OS — Public Learning Catalog & Course Preview Foundation V1.
 * Public discovery surfaces only. Never selects content blocks, resources,
 * activities answer data, or package URLs.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearningCourseDifficulty } from "./coursesFoundation";

type AnyClient = SupabaseClient;

export const LEARNING_PUBLIC_ROUTES = {
  catalog: "/learning/catalog",
  course: (slug: string) => `/learning/catalog/${slug}`,
} as const;

export const LEARNING_PUBLIC_PREVIEW_RPCS = {
  get: "get_learning_course_public_preview",
  upsert: "upsert_learning_course_public_preview",
} as const;

export const LEARNING_PUBLIC_PREVIEW_MIGRATION =
  "20260866_learning_public_course_preview_foundation_v1.sql";

/** Patterns stripped from any public-facing text (fail closed). */
const PACKAGE_SCHEME_RE = /umtuba-package:\/\/\S*/gi;
const PACKAGE_PATH_RE = /\bpackage\s+path\b/gi;
const SK_KEY_RE = /\bsk-[A-Za-z0-9_-]+/gi;

export type PublicCourseCard = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  difficulty: LearningCourseDifficulty | null;
  estimated_duration_minutes: number | null;
  thumbnail_url: string | null;
  cover_url: string | null;
  skills: string[];
  outcomes: string[];
  module_count: number;
  lesson_count: number;
  is_free: boolean;
};

export type PublicCurriculumLesson = {
  id: string;
  name: string;
  slug: string;
  position: number;
};

export type PublicCurriculumModule = {
  id: string;
  name: string;
  slug: string;
  position: number;
  lessons: PublicCurriculumLesson[];
};

export type PublicPreview = {
  course_id: string;
  lesson_id: string | null;
  title: string;
  summary: string;
  body_excerpt: string;
  enabled: true;
};

export type PublicCourseLanding = {
  course: PublicCourseCard;
  curriculum: PublicCurriculumModule[];
  preview: PublicPreview | null;
  allow_self_enroll: boolean | null;
};

/** Public catalog identity for a published+public lesson (no content blocks). */
export type PublicLessonAccessContext = {
  lesson_id: string;
  lesson_name: string;
  lesson_slug: string;
  course_id: string;
  course_name: string;
  course_slug: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function asNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asBooleanOrNull(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

/**
 * Strip package URLs, package-path mentions, and sk- secret patterns.
 * Returns null when the result is empty after sanitization.
 */
export function sanitizePublicText(
  text: string | null | undefined
): string | null {
  if (text == null) return null;
  const cleaned = String(text)
    .replace(PACKAGE_SCHEME_RE, "")
    .replace(PACKAGE_PATH_RE, "")
    .replace(SK_KEY_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** Fail-closed check for public catalog eligibility (status + visibility). */
export function isPublicCatalogEligible(row: {
  status?: string | null;
  visibility?: string | null;
}): boolean {
  return row.status === "published" && row.visibility === "public";
}

function sanitizeUrl(url: unknown): string | null {
  const raw = asString(url);
  if (!raw) return null;
  const cleaned = sanitizePublicText(raw);
  if (!cleaned) return null;
  if (/umtuba-package:/i.test(cleaned) || /^sk-/i.test(cleaned)) return null;
  if (!/^https?:\/\//i.test(cleaned) && !cleaned.startsWith("/")) return null;
  return cleaned;
}

function sanitizeStringList(value: unknown, maxItems = 32): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (out.length >= maxItems) break;
    const s = sanitizePublicText(asString(item));
    if (s) out.push(s);
  }
  return out;
}

function pickBrandingImage(
  branding: Record<string, unknown> | null,
  key: "thumbnail_url" | "cover_url"
): string | null {
  if (!branding) return null;
  return sanitizeUrl(branding[key]);
}

function pickAiLists(ai: Record<string, unknown> | null): {
  skills: string[];
  outcomes: string[];
} {
  if (!ai) return { skills: [], outcomes: [] };
  return {
    skills: sanitizeStringList(ai.skills),
    outcomes: sanitizeStringList(ai.outcomes),
  };
}

/**
 * V1 Free/Paid display: marketplace_ready false → Free.
 * Settings allow_self_enroll may not be readable publicly — omit paid.
 */
export function resolvePublicIsFree(input: {
  marketplace_ready?: boolean | null;
  allow_self_enroll?: boolean | null;
}): boolean {
  if (input.allow_self_enroll === true) return true;
  if (input.marketplace_ready === true) return false;
  return true;
}

export function mapPublicCourseCard(input: {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  difficulty?: string | null;
  estimated_duration_minutes?: number | null;
  marketplace_ready?: boolean | null;
  allow_self_enroll?: boolean | null;
  branding_metadata?: unknown;
  ai_metadata?: unknown;
  module_count?: number;
  lesson_count?: number;
  status?: string | null;
  visibility?: string | null;
  /** Must never reach the client — rejected if present on accidental spreads. */
  content_blocks?: unknown;
  resources?: unknown;
  package_url?: unknown;
}): PublicCourseCard | null {
  if (
    input.status != null ||
    input.visibility != null
  ) {
    if (
      !isPublicCatalogEligible({
        status: input.status,
        visibility: input.visibility,
      })
    ) {
      return null;
    }
  }

  const id = asString(input.id);
  const name = sanitizePublicText(input.name);
  const slug = asString(input.slug);
  if (!id || !name || !slug) return null;

  // Explicitly ignore unsafe fields — never map them through.
  void input.content_blocks;
  void input.resources;
  void input.package_url;

  const branding = asRecord(input.branding_metadata);
  const ai = asRecord(input.ai_metadata);
  const { skills, outcomes } = pickAiLists(ai);

  const difficultyRaw = asString(input.difficulty);
  const difficulty =
    difficultyRaw === "beginner" ||
    difficultyRaw === "intermediate" ||
    difficultyRaw === "advanced" ||
    difficultyRaw === "expert"
      ? (difficultyRaw as LearningCourseDifficulty)
      : null;

  return {
    id,
    name,
    slug,
    description: sanitizePublicText(input.description ?? null),
    difficulty,
    estimated_duration_minutes: asNumberOrNull(input.estimated_duration_minutes),
    thumbnail_url: pickBrandingImage(branding, "thumbnail_url"),
    cover_url: pickBrandingImage(branding, "cover_url"),
    skills,
    outcomes,
    module_count: Math.max(0, asNumberOrNull(input.module_count) ?? 0),
    lesson_count: Math.max(0, asNumberOrNull(input.lesson_count) ?? 0),
    is_free: resolvePublicIsFree({
      marketplace_ready: input.marketplace_ready,
      allow_self_enroll: input.allow_self_enroll,
    }),
  };
}

/**
 * Curriculum mapper: module + lesson names only.
 * Descriptions are never copied onto the public curriculum shape.
 */
export function mapPublicCurriculum(
  sections: Array<{
    id?: unknown;
    name?: unknown;
    slug?: unknown;
    position?: unknown;
    description?: unknown;
    lessons?: Array<{
      id?: unknown;
      name?: unknown;
      slug?: unknown;
      position?: unknown;
      description?: unknown;
    }>;
  }>
): PublicCurriculumModule[] {
  const modules: PublicCurriculumModule[] = [];
  for (const sec of sections) {
    const id = asString(sec.id);
    const name = sanitizePublicText(asString(sec.name));
    const slug = asString(sec.slug);
    if (!id || !name || !slug) continue;
    // Intentionally discard description — never expose to public clients.
    void sec.description;

    const lessons: PublicCurriculumLesson[] = [];
    for (const les of sec.lessons ?? []) {
      const lid = asString(les.id);
      const lname = sanitizePublicText(asString(les.name));
      const lslug = asString(les.slug);
      if (!lid || !lname || !lslug) continue;
      void les.description;
      lessons.push({
        id: lid,
        name: lname,
        slug: lslug,
        position: asNumberOrNull(les.position) ?? 0,
      });
    }
    lessons.sort((a, b) => a.position - b.position);

    modules.push({
      id,
      name,
      slug,
      position: asNumberOrNull(sec.position) ?? 0,
      lessons,
    });
  }
  modules.sort((a, b) => a.position - b.position);
  return modules;
}

/** Map RPC jsonb → PublicPreview; null when disabled / missing / malformed. */
export function mapPublicPreview(raw: unknown): PublicPreview | null {
  if (raw == null) return null;
  const row = asRecord(raw);
  if (!row) return null;
  if (row.enabled !== true) return null;

  const course_id = asString(row.course_id);
  const title = sanitizePublicText(asString(row.title));
  const summary = sanitizePublicText(asString(row.summary));
  const body_excerpt = sanitizePublicText(asString(row.body_excerpt));
  if (!course_id || !title || !summary || !body_excerpt) return null;

  return {
    course_id,
    lesson_id: asString(row.lesson_id),
    title,
    summary,
    body_excerpt,
    enabled: true,
  };
}

export async function listPublicCatalogCourses(
  supabase: AnyClient
): Promise<PublicCourseCard[]> {
  const { data, error } = await supabase
    .from("learning_courses")
    .select(
      "id, name, slug, description, difficulty, estimated_duration_minutes, marketplace_ready, branding_metadata, ai_metadata, status, visibility, position"
    )
    .eq("status", "published")
    .eq("visibility", "public")
    .order("position", { ascending: true });

  if (error || !data?.length) return [];

  const eligible = data.filter((row) =>
    isPublicCatalogEligible({
      status: asString(row.status),
      visibility: asString(row.visibility),
    })
  );
  if (eligible.length === 0) return [];

  const courseIds = eligible
    .map((r) => asString(r.id))
    .filter((id): id is string => Boolean(id));
  const { moduleCounts, lessonCounts } = await loadPublicModuleLessonCounts(
    supabase,
    courseIds
  );
  return mapEligibleCourseRowsToCards(eligible, moduleCounts, lessonCounts);
}

/**
 * Cheap related-rail fetch: a few other public courses, not the full catalog
 * plus every published section/lesson count.
 */
export async function listRelatedPublicCourses(
  supabase: AnyClient,
  excludeCourseId: string,
  limit = 3
): Promise<PublicCourseCard[]> {
  const excluded = asString(excludeCourseId);
  const take = Number.isFinite(limit) ? Math.max(1, Math.min(6, Math.trunc(limit))) : 3;
  let query = supabase
    .from("learning_courses")
    .select(
      "id, name, slug, description, difficulty, estimated_duration_minutes, marketplace_ready, branding_metadata, ai_metadata, status, visibility, position"
    )
    .eq("status", "published")
    .eq("visibility", "public")
    .order("position", { ascending: true })
    .limit(take + (excluded ? 1 : 0));
  if (excluded) {
    query = query.neq("id", excluded);
  }
  const { data, error } = await query;
  if (error || !data?.length) return [];

  const eligible = data
    .filter((row) =>
      isPublicCatalogEligible({
        status: asString(row.status),
        visibility: asString(row.visibility),
      })
    )
    .filter((row) => !excluded || asString(row.id) !== excluded)
    .slice(0, take);
  if (eligible.length === 0) return [];

  const courseIds = eligible
    .map((r) => asString(r.id))
    .filter((id): id is string => Boolean(id));
  const { moduleCounts, lessonCounts } = await loadPublicModuleLessonCounts(
    supabase,
    courseIds
  );
  return mapEligibleCourseRowsToCards(eligible, moduleCounts, lessonCounts);
}

async function loadPublicModuleLessonCounts(
  supabase: AnyClient,
  courseIds: string[]
): Promise<{
  moduleCounts: Map<string, number>;
  lessonCounts: Map<string, number>;
}> {
  const moduleCounts = new Map<string, number>();
  const lessonCounts = new Map<string, number>();
  if (courseIds.length === 0) {
    return { moduleCounts, lessonCounts };
  }

  const { data: sections } = await supabase
    .from("learning_sections")
    .select("id, course_id")
    .in("course_id", courseIds)
    .eq("status", "published")
    .eq("visibility", "public");

  const sectionIds: string[] = [];
  const sectionCourse = new Map<string, string>();
  for (const sec of sections ?? []) {
    const sid = asString(sec.id);
    const cid = asString(sec.course_id);
    if (!sid || !cid) continue;
    sectionIds.push(sid);
    sectionCourse.set(sid, cid);
    moduleCounts.set(cid, (moduleCounts.get(cid) ?? 0) + 1);
  }

  if (sectionIds.length > 0) {
    const { data: lessons } = await supabase
      .from("learning_lessons")
      .select("id, section_id")
      .in("section_id", sectionIds)
      .eq("status", "published")
      .eq("visibility", "public");

    for (const les of lessons ?? []) {
      const sectionId = asString(les.section_id);
      if (!sectionId) continue;
      const cid = sectionCourse.get(sectionId);
      if (!cid) continue;
      lessonCounts.set(cid, (lessonCounts.get(cid) ?? 0) + 1);
    }
  }

  return { moduleCounts, lessonCounts };
}

function mapEligibleCourseRowsToCards(
  eligible: Array<Record<string, unknown>>,
  moduleCounts: Map<string, number>,
  lessonCounts: Map<string, number>
): PublicCourseCard[] {
  const cards: PublicCourseCard[] = [];
  for (const row of eligible) {
    const id = asString(row.id);
    if (!id) continue;
    const card = mapPublicCourseCard({
      id,
      name: String(row.name ?? ""),
      slug: String(row.slug ?? ""),
      description: row.description as string | null,
      difficulty: row.difficulty as string | null,
      estimated_duration_minutes: row.estimated_duration_minutes as
        | number
        | null,
      marketplace_ready: row.marketplace_ready as boolean | null,
      branding_metadata: row.branding_metadata,
      ai_metadata: row.ai_metadata,
      module_count: moduleCounts.get(id) ?? 0,
      lesson_count: lessonCounts.get(id) ?? 0,
    });
    if (card) cards.push(card);
  }
  return cards;
}

export async function loadPublicCourseBySlug(
  supabase: AnyClient,
  slug: string
): Promise<PublicCourseLanding | null> {
  const cleanSlug = asString(slug);
  if (!cleanSlug) return null;

  const { data: courseRow, error } = await supabase
    .from("learning_courses")
    .select(
      "id, name, slug, description, difficulty, estimated_duration_minutes, marketplace_ready, branding_metadata, ai_metadata, status, visibility"
    )
    .eq("slug", cleanSlug)
    .eq("status", "published")
    .eq("visibility", "public")
    .maybeSingle();

  if (error || !courseRow) return null;
  if (
    !isPublicCatalogEligible({
      status: asString(courseRow.status),
      visibility: asString(courseRow.visibility),
    })
  ) {
    return null;
  }

  const courseId = asString(courseRow.id);
  if (!courseId) return null;

  const [settingsResult, sectionsResult, preview] = await Promise.all([
    supabase
      .from("learning_course_settings")
      .select("allow_self_enroll")
      .eq("course_id", courseId)
      .maybeSingle(),
    supabase
      .from("learning_sections")
      .select("id, name, slug, position")
      .eq("course_id", courseId)
      .eq("status", "published")
      .eq("visibility", "public")
      .order("position", { ascending: true }),
    loadPublicCoursePreview(supabase, courseId),
  ]);

  let allowSelfEnroll: boolean | null = null;
  if (settingsResult.data) {
    allowSelfEnroll = asBooleanOrNull(settingsResult.data.allow_self_enroll);
  }

  const sectionRows = sectionsResult.data ?? [];
  const sectionIds = sectionRows
    .map((s) => asString(s.id))
    .filter((id): id is string => Boolean(id));

  type LessonRow = {
    id: unknown;
    name: unknown;
    slug: unknown;
    position: unknown;
    section_id: unknown;
  };
  let lessonRows: LessonRow[] = [];
  if (sectionIds.length > 0) {
    const { data: lessons } = await supabase
      .from("learning_lessons")
      .select("id, name, slug, position, section_id")
      .in("section_id", sectionIds)
      .eq("status", "published")
      .eq("visibility", "public")
      .order("position", { ascending: true });
    lessonRows = (lessons ?? []) as LessonRow[];
  }

  const lessonsBySection = new Map<string, LessonRow[]>();
  for (const les of lessonRows) {
    const sid = asString(les.section_id);
    if (!sid) continue;
    const list = lessonsBySection.get(sid) ?? [];
    list.push(les);
    lessonsBySection.set(sid, list);
  }

  const curriculum = mapPublicCurriculum(
    sectionRows.map((sec) => {
      const sid = asString(sec.id) ?? "";
      return {
        id: sec.id,
        name: sec.name,
        slug: sec.slug,
        position: sec.position,
        lessons: (lessonsBySection.get(sid) ?? []).map((l) => ({
          id: l.id,
          name: l.name,
          slug: l.slug,
          position: l.position,
        })),
      };
    })
  );

  const card = mapPublicCourseCard({
    id: courseId,
    name: String(courseRow.name ?? ""),
    slug: String(courseRow.slug ?? ""),
    description: courseRow.description as string | null,
    difficulty: courseRow.difficulty as string | null,
    estimated_duration_minutes: courseRow.estimated_duration_minutes as
      | number
      | null,
    marketplace_ready: courseRow.marketplace_ready as boolean | null,
    allow_self_enroll: allowSelfEnroll,
    branding_metadata: courseRow.branding_metadata,
    ai_metadata: courseRow.ai_metadata,
    module_count: curriculum.length,
    lesson_count: curriculum.reduce((n, m) => n + m.lessons.length, 0),
  });
  if (!card) return null;

  return {
    course: card,
    curriculum,
    preview,
    allow_self_enroll: allowSelfEnroll,
  };
}

/**
 * Resolve a published+public lesson to its public course landing.
 * Titles/slugs only — never content blocks, resources, or package URLs.
 */
export async function loadPublicLessonAccessContext(
  supabase: AnyClient,
  lessonId: string
): Promise<PublicLessonAccessContext | null> {
  const id = asString(lessonId);
  if (!id) return null;

  const { data: lesson, error: lessonError } = await supabase
    .from("learning_lessons")
    .select("id, name, slug, section_id, status, visibility")
    .eq("id", id)
    .eq("status", "published")
    .eq("visibility", "public")
    .maybeSingle();

  if (lessonError || !lesson) return null;
  if (
    asString(lesson.status) !== "published" ||
    asString(lesson.visibility) !== "public"
  ) {
    return null;
  }

  const sectionId = asString(lesson.section_id);
  if (!sectionId) return null;

  const { data: section, error: sectionError } = await supabase
    .from("learning_sections")
    .select("id, course_id, status, visibility")
    .eq("id", sectionId)
    .eq("status", "published")
    .eq("visibility", "public")
    .maybeSingle();

  if (sectionError || !section) return null;
  const courseId = asString(section.course_id);
  if (!courseId) return null;

  const { data: course, error: courseError } = await supabase
    .from("learning_courses")
    .select("id, name, slug, status, visibility")
    .eq("id", courseId)
    .eq("status", "published")
    .eq("visibility", "public")
    .maybeSingle();

  if (courseError || !course) return null;
  if (
    !isPublicCatalogEligible({
      status: asString(course.status),
      visibility: asString(course.visibility),
    })
  ) {
    return null;
  }

  const lessonName = sanitizePublicText(asString(lesson.name));
  const courseName = sanitizePublicText(asString(course.name));
  const lessonSlug = asString(lesson.slug);
  const courseSlug = asString(course.slug);
  const resolvedLessonId = asString(lesson.id);
  const resolvedCourseId = asString(course.id);
  if (
    !lessonName ||
    !courseName ||
    !lessonSlug ||
    !courseSlug ||
    !resolvedLessonId ||
    !resolvedCourseId
  ) {
    return null;
  }

  return {
    lesson_id: resolvedLessonId,
    lesson_name: lessonName,
    lesson_slug: lessonSlug,
    course_id: resolvedCourseId,
    course_name: courseName,
    course_slug: courseSlug,
  };
}

/** Public UI must never deep-link a lesson that is not publicly accessible. */
export function resolvePublicLessonSafeHref(
  context: PublicLessonAccessContext | null
): string {
  if (!context) return LEARNING_PUBLIC_ROUTES.catalog;
  return `${LEARNING_PUBLIC_ROUTES.course(context.course_slug)}?lesson=${encodeURIComponent(context.lesson_id)}`;
}

/**
 * Call get_learning_course_public_preview RPC.
 * Fail closed: missing RPC / errors / disabled → null.
 * NEVER joins content_blocks or resources.
 */
export async function loadPublicCoursePreview(
  supabase: AnyClient,
  courseId: string
): Promise<PublicPreview | null> {
  const id = asString(courseId);
  if (!id) return null;

  try {
    const { data, error } = await supabase.rpc(
      LEARNING_PUBLIC_PREVIEW_RPCS.get,
      { p_course_id: id }
    );
    if (error) return null;
    return mapPublicPreview(data);
  } catch {
    return null;
  }
}

export async function isUserEnrolledInCourse(
  supabase: AnyClient,
  courseId: string,
  userId: string
): Promise<boolean> {
  const cid = asString(courseId);
  const uid = asString(userId);
  if (!cid || !uid) return false;

  const { data, error } = await supabase
    .from("learning_enrollments")
    .select("id")
    .eq("course_id", cid)
    .eq("user_id", uid)
    .in("status", ["pending", "active", "suspended"])
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}
