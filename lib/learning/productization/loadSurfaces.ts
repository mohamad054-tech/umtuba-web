import {
  LEARNING_LEARNER_ROUTES,
  loadLessonDelivery,
  loadMyLearningHub,
  type LearningLearnerLessonDelivery,
} from "../learnerDelivery";
import {
  LEARNING_PUBLIC_ROUTES,
  isUserEnrolledInCourse,
  listRelatedPublicCourses,
  type PublicCourseLanding,
} from "../publicCatalog";
import {
  getCachedLearningViewer,
  getCachedPublicCatalog,
  getCachedPublicCourseBySlug,
} from "./requestCache";
import { canUserSelfEnrollInCourse } from "../publicCatalogSelfEnroll";
import { loadTeacherCenterContext } from "../teacherCenterAccess";
import {
  LEARNING_TEACHER_ROUTES,
  loadPublicTeacherProfile,
  type LearningTeacherProfile,
} from "../teacherPlatform";
import { loadPublicCourseReviews } from "../courseReviews";
import {
  DEMO_COURSES,
  DEMO_TEACHERS,
  DEMO_VIEWER,
  continueCourse,
  demoCourse,
  demoLesson,
  demoTeacher,
  enrolledCourses,
  relatedCourses,
  type DemoCourse,
  type DemoEnrollment,
  type DemoLesson,
  type DemoTeacher,
} from "../visualDemo";
import {
  hasLearningBackendEnv,
  isLearningVisualDemoForced,
  shouldPreferLiveLearningData,
  type LearningDataSource,
} from "./env";
import {
  displayNameFromUser,
  mapHubToVisualEnrollments,
  mapPublicCardToVisual,
  mapPublicLandingToVisual,
  mapTeacherProfileToVisual,
} from "./mapToVisual";

export type LearningHomeSurface = {
  source: LearningDataSource;
  surface: "discover" | "library";
  viewerName: string | null;
  isGuest: boolean;
  courses: DemoCourse[];
  teachers: DemoTeacher[];
  enrollments: { course: DemoCourse; enrollment: DemoEnrollment }[];
  continueItem: { course: DemoCourse; enrollment: DemoEnrollment } | null;
  loginHref: string;
};

export type LearningCourseSurface = {
  source: LearningDataSource;
  course: DemoCourse;
  teacher: DemoTeacher | null;
  related: DemoCourse[];
  enrolled: boolean;
  canSelfEnroll: boolean;
  isGuest: boolean;
  startHref: string;
  loginHref: string;
  enrollCourseId: string | null;
  enrollCourseSlug: string | null;
};

export type LearningLessonSurface = {
  source: LearningDataSource;
  course: DemoCourse;
  lesson: DemoLesson;
  canComplete: boolean;
  previousLessonId: string | null;
  nextLessonId: string | null;
};

export type LearningTeacherProfileSurface = {
  source: LearningDataSource;
  teacher: DemoTeacher;
  courses: DemoCourse[];
};

export type LearningTeacherCenterSurface = {
  source: LearningDataSource;
  canOperate: boolean;
  approved: boolean;
  teacher: DemoTeacher | null;
  courses: DemoCourse[];
  totals: {
    courses: number;
    students: number;
    completions: number;
    ratingLabel: string;
  };
};

function loginNext(path: string): string {
  return `/login?next=${encodeURIComponent(path)}`;
}

function demoHome(surface: "discover" | "library"): LearningHomeSurface {
  const resume = continueCourse();
  return {
    source: "demo_fallback",
    surface,
    viewerName: DEMO_VIEWER.name.en,
    isGuest: false,
    courses: DEMO_COURSES,
    teachers: DEMO_TEACHERS,
    enrollments: enrolledCourses(),
    continueItem: resume,
    loginHref: loginNext(LEARNING_LEARNER_ROUTES.hub),
  };
}

export async function loadLearningHomeSurface(
  surface: "discover" | "library"
): Promise<LearningHomeSurface> {
  if (!shouldPreferLiveLearningData()) {
    return demoHome(surface);
  }

  try {
    const { createClient } = await import("../../supabase/server");
    const supabase = await createClient();
    const [user, catalog] = await Promise.all([
      getCachedLearningViewer(),
      getCachedPublicCatalog(),
    ]);
    const courses = catalog.map(mapPublicCardToVisual);
    let enrollments: LearningHomeSurface["enrollments"] = [];
    if (user) {
      const hub = await loadMyLearningHub(supabase, user.id);
      if (hub.ok) {
        enrollments = mapHubToVisualEnrollments(hub.data, courses);
      }
    }
    const continueItem =
      enrollments
        .filter((row) => row.enrollment.status === "in_progress")
        .sort((a, b) => b.enrollment.percent - a.enrollment.percent)[0] ?? null;

    return {
      source: "live",
      surface,
      viewerName: displayNameFromUser(user),
      isGuest: !user,
      courses,
      teachers: [],
      enrollments,
      continueItem,
      loginHref: loginNext(
        surface === "library"
          ? `${LEARNING_LEARNER_ROUTES.hub}?surface=library`
          : LEARNING_LEARNER_ROUTES.hub
      ),
    };
  } catch {
    return demoHome(surface);
  }
}

function demoCourseSurface(slug: string): LearningCourseSurface | null {
  const course = demoCourse(slug);
  if (!course) return null;
  const firstLesson = course.chapters[0]?.lessons[0];
  return {
    source: "demo_fallback",
    course,
    teacher: demoTeacher(course.teacherId) ?? null,
    related: relatedCourses(course),
    enrolled: true,
    canSelfEnroll: false,
    isGuest: false,
    startHref: firstLesson
      ? LEARNING_LEARNER_ROUTES.lesson(firstLesson.id)
      : LEARNING_LEARNER_ROUTES.hub,
    loginHref: loginNext(LEARNING_PUBLIC_ROUTES.course(course.slug)),
    enrollCourseId: null,
    enrollCourseSlug: null,
  };
}

function landingStartHref(
  landing: PublicCourseLanding,
  enrolled: boolean
): string {
  const first = landing.curriculum[0]?.lessons[0]?.id;
  if (enrolled && first) return LEARNING_LEARNER_ROUTES.lesson(first);
  return LEARNING_PUBLIC_ROUTES.course(landing.course.slug);
}

export async function loadLearningCourseSurface(
  slug: string
): Promise<LearningCourseSurface | null> {
  if (!shouldPreferLiveLearningData()) {
    return demoCourseSurface(slug);
  }

  try {
    const { createClient } = await import("../../supabase/server");
    const supabase = await createClient();
    const landing = await getCachedPublicCourseBySlug(slug);
    if (!landing) {
      return null;
    }
    const [user, reviews, relatedCards] = await Promise.all([
      getCachedLearningViewer(),
      loadPublicCourseReviews(supabase, landing.course.id).catch(() => ({
        ok: false as const,
        message: "reviews_unavailable",
      })),
      listRelatedPublicCourses(supabase, landing.course.id, 3),
    ]);
    const enrolled = user
      ? await isUserEnrolledInCourse(supabase, landing.course.id, user.id)
      : false;
    const canSelfEnroll =
      user && !enrolled
        ? await canUserSelfEnrollInCourse(supabase, landing.course.id)
        : false;
    const course = mapPublicLandingToVisual(landing);
    if (reviews.ok) {
      course.reviews = reviews.data.map((review) => ({
        id: review.id,
        studentId: review.id,
        rating: review.rating,
        comment: { en: review.comment ?? "", ar: review.comment ?? "" },
      }));
    } else {
      course.reviews = [];
    }
    const related = relatedCards.map(mapPublicCardToVisual);

    return {
      source: "live",
      course,
      teacher: null,
      related,
      enrolled,
      canSelfEnroll: Boolean(canSelfEnroll),
      isGuest: !user,
      startHref: landingStartHref(landing, enrolled),
      loginHref: loginNext(LEARNING_PUBLIC_ROUTES.course(landing.course.slug)),
      enrollCourseId: landing.course.id,
      enrollCourseSlug: landing.course.slug,
    };
  } catch {
    return demoCourseSurface(slug);
  }
}

function demoLessonSurface(lessonId: string): LearningLessonSurface | null {
  const found = demoLesson(lessonId) ?? demoLesson(DEMO_COURSES[0].chapters[0].lessons[0].id);
  if (!found) return null;
  const flat = found.course.chapters.flatMap((chapter) => chapter.lessons);
  const index = flat.findIndex((item) => item.id === found.lesson.id);
  return {
    source: "demo_fallback",
    course: found.course,
    lesson: found.lesson,
    canComplete: false,
    previousLessonId: index > 0 ? flat[index - 1].id : null,
    nextLessonId: index >= 0 && index < flat.length - 1 ? flat[index + 1].id : null,
  };
}

function lessonFromDelivery(
  delivery: LearningLearnerLessonDelivery
): LearningLessonSurface {
  const course: DemoCourse = {
    id: delivery.lesson.course_id,
    slug: delivery.lesson.course_id,
    title: { en: delivery.lesson.course_name, ar: delivery.lesson.course_name },
    subtitle: { en: delivery.lesson.description ?? "", ar: delivery.lesson.description ?? "" },
    description: { en: delivery.lesson.description ?? "", ar: delivery.lesson.description ?? "" },
    category: "programming",
    teacherId: "",
    cover: DEMO_COURSES[0]?.cover ?? "/demo/learning/covers/programming.svg",
    rating: 0,
    enrollments: 0,
    durationHours: 1,
    level: "beginner",
    language: "both",
    isFree: true,
    isNew: false,
    isTrending: false,
    lessonCount: 1,
    chapterCount: 1,
    objectives: [],
    prerequisites: [],
    chapters: [
      {
        id: delivery.lesson.section_id,
        title: { en: delivery.lesson.course_name, ar: delivery.lesson.course_name },
        lessons: [
          {
            id: delivery.lesson.id,
            title: { en: delivery.lesson.name, ar: delivery.lesson.name },
            type: "video",
            durationMin: 8,
            completed: delivery.progress_status === "completed",
          },
        ],
      },
    ],
    reviews: [],
  };

  return {
    source: "live",
    course,
    lesson: course.chapters[0].lessons[0],
    canComplete: delivery.progress_status !== "completed",
    previousLessonId: delivery.previous_lesson?.lesson_id ?? null,
    nextLessonId: delivery.next_lesson?.lesson_id ?? null,
  };
}

export async function loadLearningLessonSurface(
  lessonId: string
): Promise<
  | { kind: "ready"; surface: LearningLessonSurface }
  | { kind: "auth"; loginHref: string }
  | { kind: "missing" }
> {
  if (!shouldPreferLiveLearningData()) {
    const surface = demoLessonSurface(lessonId);
    return surface ? { kind: "ready", surface } : { kind: "missing" };
  }

  try {
    const { createClient, getServerUser } = await import("../../supabase/server");
    const user = await getServerUser();
    if (!user) {
      return { kind: "auth", loginHref: loginNext(LEARNING_LEARNER_ROUTES.lesson(lessonId)) };
    }
    const supabase = await createClient();
    const delivery = await loadLessonDelivery(supabase, lessonId);
    if (!delivery.ok) {
      return { kind: "missing" };
    }
    return { kind: "ready", surface: lessonFromDelivery(delivery.data) };
  } catch {
    const surface = demoLessonSurface(lessonId);
    return surface ? { kind: "ready", surface } : { kind: "missing" };
  }
}

export async function loadLearningTeacherProfileSurface(
  userId: string
): Promise<LearningTeacherProfileSurface | null> {
  if (!shouldPreferLiveLearningData()) {
    const teacher = demoTeacher(userId) ?? demoTeacher("demo-teacher-nour-qamar");
    if (!teacher) return null;
    return {
      source: "demo_fallback",
      teacher,
      courses: DEMO_COURSES.filter((course) => course.teacherId === teacher.id),
    };
  }

  try {
    const { createClient } = await import("../../supabase/server");
    const supabase = await createClient();
    const loaded = await loadPublicTeacherProfile(supabase, userId);
    if (!loaded.ok || !loaded.data) return null;
    const { data: rows } = await supabase
      .from("learning_courses")
      .select("id, name, slug, description, status, visibility, created_by")
      .eq("created_by", loaded.data.user_id)
      .eq("status", "published")
      .eq("visibility", "public")
      .order("name");
    const courses = (rows ?? []).map((row) =>
      mapPublicCardToVisual({
        id: String(row.id),
        name: String(row.name ?? "Course"),
        slug: String(row.slug ?? row.id),
        description: typeof row.description === "string" ? row.description : null,
        difficulty: null,
        estimated_duration_minutes: null,
        thumbnail_url: null,
        cover_url: null,
        skills: [],
        outcomes: [],
        module_count: 0,
        lesson_count: 0,
        is_free: true,
      })
    );
    return {
      source: "live",
      teacher: mapTeacherProfileToVisual(loaded.data, courses.length),
      courses,
    };
  } catch {
    const teacher = demoTeacher(userId);
    if (!teacher) return null;
    return {
      source: "demo_fallback",
      teacher,
      courses: DEMO_COURSES.filter((course) => course.teacherId === teacher.id),
    };
  }
}

export async function loadLearningTeacherCenterSurface(): Promise<
  | { kind: "ready"; surface: LearningTeacherCenterSurface }
  | { kind: "auth"; loginHref: string }
> {
  if (!shouldPreferLiveLearningData()) {
    const teacher = DEMO_TEACHERS[0];
    const mine = DEMO_COURSES.filter((course) => course.teacherId === teacher.id);
    return {
      kind: "ready",
      surface: {
        source: "demo_fallback",
        canOperate: true,
        approved: false,
        teacher,
        courses: mine,
        totals: {
          courses: mine.length,
          students: 0,
          completions: 0,
          ratingLabel: "—",
        },
      },
    };
  }

  try {
    const { createClient, getServerUser } = await import("../../supabase/server");
    const user = await getServerUser();
    if (!user) {
      return { kind: "auth", loginHref: loginNext(LEARNING_TEACHER_ROUTES.center) };
    }
    const supabase = await createClient();
    const ctx = await loadTeacherCenterContext(supabase);
    const courses = (ctx.dashboard?.courses ?? []).map((course) =>
      mapPublicCardToVisual({
        id: course.course_id,
        name: course.course_name,
        slug: course.course_slug || course.course_id,
        description: null,
        difficulty: null,
        estimated_duration_minutes: null,
        thumbnail_url: null,
        cover_url: null,
        skills: [],
        outcomes: [],
        module_count: 0,
        lesson_count: 0,
        is_free: true,
      })
    );
    return {
      kind: "ready",
      surface: {
        source: "live",
        canOperate: ctx.canOperate,
        approved: ctx.approved,
        teacher: ctx.profile ? mapTeacherProfileToVisual(ctx.profile, courses.length) : null,
        courses,
        totals: {
          courses: ctx.dashboard?.totals.course_count ?? courses.length,
          students: ctx.dashboard?.totals.enrollment_count ?? 0,
          completions: ctx.dashboard?.totals.completion_count ?? 0,
          ratingLabel: "—",
        },
      },
    };
  } catch {
    const teacher = DEMO_TEACHERS[0];
    const mine = DEMO_COURSES.filter((course) => course.teacherId === teacher.id);
    return {
      kind: "ready",
      surface: {
        source: "demo_fallback",
        canOperate: true,
        approved: false,
        teacher,
        courses: mine,
        totals: {
          courses: mine.length,
          students: 0,
          completions: 0,
          ratingLabel: "—",
        },
      },
    };
  }
}

export function learningProductizationFlags() {
  return {
    forcedDemo: isLearningVisualDemoForced(),
    backendConfigured: hasLearningBackendEnv(),
    preferLive: shouldPreferLiveLearningData(),
  };
}

export type { LearningTeacherProfile };
