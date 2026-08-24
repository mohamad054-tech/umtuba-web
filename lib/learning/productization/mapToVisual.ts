import type { LearningLearnerHub } from "../learnerDelivery";
import type {
  PublicCourseCard,
  PublicCourseLanding,
  PublicCurriculumModule,
} from "../publicCatalog";
import type { LearningTeacherProfile } from "../teacherPlatform";
import {
  DEMO_ASSET_BASE,
  DEMO_CATEGORIES,
  type DemoCategoryId,
  type DemoChapter,
  type DemoCourse,
  type DemoEnrollment,
  type DemoLocalized,
  type DemoTeacher,
} from "../visualDemo";

function L(text: string): DemoLocalized {
  return { en: text, ar: text };
}

const CATEGORY_HINTS: Array<{ id: DemoCategoryId; needles: string[] }> = [
  { id: "ai", needles: ["ai", "intelligence", "ذكاء"] },
  { id: "mobile", needles: ["mobile", "android", "ios", "جوال"] },
  { id: "uiux", needles: ["ui", "ux", "design", "واجهة"] },
  { id: "photography", needles: ["photo", "camera", "تصوير"] },
  { id: "languages", needles: ["language", "arabic", "english", "لغة"] },
  { id: "business", needles: ["business", "startup", "أعمال"] },
  { id: "mathematics", needles: ["math", "algebra", "رياض"] },
  { id: "marketing", needles: ["market", "تسويق"] },
  { id: "programming", needles: ["code", "program", "software", "برمجة"] },
];

export function inferVisualCategory(input: {
  name?: string | null;
  description?: string | null;
  skills?: string[];
}): DemoCategoryId {
  const hay = `${input.name ?? ""} ${input.description ?? ""} ${(input.skills ?? []).join(" ")}`.toLowerCase();
  for (const hint of CATEGORY_HINTS) {
    if (hint.needles.some((needle) => hay.includes(needle))) return hint.id;
  }
  return "programming";
}

function coverFor(course: {
  cover_url?: string | null;
  thumbnail_url?: string | null;
  name?: string | null;
  description?: string | null;
  skills?: string[];
}): string {
  return (
    course.cover_url ||
    course.thumbnail_url ||
    `${DEMO_ASSET_BASE}/covers/${inferVisualCategory(course)}.svg`
  );
}

function levelOf(
  difficulty: string | null | undefined
): DemoCourse["level"] {
  if (difficulty === "intermediate" || difficulty === "advanced") return difficulty;
  return "beginner";
}

export function mapCurriculumToChapters(
  curriculum: PublicCurriculumModule[]
): DemoChapter[] {
  return curriculum.map((module) => ({
    id: module.id,
    title: L(module.name),
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id,
      title: L(lesson.name),
      type: "video" as const,
      durationMin: 8,
    })),
  }));
}

export function mapPublicCardToVisual(course: PublicCourseCard): DemoCourse {
  const category = inferVisualCategory(course);
  const hours =
    course.estimated_duration_minutes && course.estimated_duration_minutes > 0
      ? Math.max(1, Math.round(course.estimated_duration_minutes / 60))
      : 1;
  return {
    id: course.id,
    slug: course.slug,
    title: L(course.name),
    subtitle: L(course.description ?? ""),
    description: L(course.description ?? ""),
    category,
    teacherId: "",
    cover: coverFor(course),
    rating: 0,
    enrollments: 0,
    durationHours: hours,
    level: levelOf(course.difficulty),
    language: "both",
    isFree: course.is_free,
    isNew: false,
    isTrending: false,
    lessonCount: course.lesson_count,
    chapterCount: course.module_count,
    objectives: course.outcomes.map(L),
    prerequisites: course.skills.map(L),
    chapters: [],
    reviews: [],
  };
}

export function mapPublicLandingToVisual(
  landing: PublicCourseLanding
): DemoCourse {
  const base = mapPublicCardToVisual(landing.course);
  const chapters = mapCurriculumToChapters(landing.curriculum);
  return {
    ...base,
    chapters,
    chapterCount: chapters.length || base.chapterCount,
    lessonCount:
      chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0) ||
      base.lessonCount,
  };
}

export function mapHubToVisualEnrollments(
  hub: LearningLearnerHub,
  catalog: DemoCourse[]
): { course: DemoCourse; enrollment: DemoEnrollment }[] {
  const byId = new Map(catalog.map((course) => [course.id, course]));
  const bySlug = new Map(catalog.map((course) => [course.slug, course]));
  return hub.courses.map((item) => {
    const mapped =
      byId.get(item.id) ??
      bySlug.get(item.slug) ??
      ({
        ...mapPublicCardToVisual({
          id: item.id,
          name: item.name,
          slug: item.slug,
          description: item.description,
          difficulty: null,
          estimated_duration_minutes: null,
          thumbnail_url: null,
          cover_url: null,
          skills: [],
          outcomes: [],
          module_count: 0,
          lesson_count: item.progress?.total_lessons_count ?? 0,
          is_free: true,
        }),
      } satisfies DemoCourse);
    const percent = item.progress?.percent_complete ?? 0;
    const status =
      item.progress?.status === "completed"
        ? "completed"
        : percent > 0 || item.progress?.status === "in_progress"
          ? "in_progress"
          : "not_started";
    return {
      course: mapped,
      enrollment: {
        courseId: item.id,
        percent,
        status,
        continueLessonId: item.progress?.last_lesson_id ?? "",
      },
    };
  });
}

export function mapTeacherProfileToVisual(
  profile: LearningTeacherProfile,
  courseCount = 0
): DemoTeacher {
  const name = profile.display_name || "Teacher";
  return {
    id: profile.user_id,
    handle: profile.user_id,
    name: L(name),
    bio: L(profile.biography || profile.teaching_description || ""),
    specialties: (profile.subjects ?? []).map(L),
    portrait: profile.profile_image_url || `${DEMO_ASSET_BASE}/teachers/nour.svg`,
    rating: 0,
    students: 0,
    courseCount,
    reviewCount: 0,
    achievements: [],
  };
}

export function visualCategoryLabel(id: DemoCategoryId): DemoLocalized {
  return DEMO_CATEGORIES.find((item) => item.id === id)?.label ?? L(id);
}

export function displayNameFromUser(input: {
  email?: string | null;
  user_metadata?: { full_name?: unknown; name?: unknown };
} | null): string | null {
  if (!input) return null;
  const meta = input.user_metadata ?? {};
  const named =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    "";
  if (named) return named;
  const email = input.email?.trim() ?? "";
  if (!email) return null;
  return email.split("@")[0] || null;
}
