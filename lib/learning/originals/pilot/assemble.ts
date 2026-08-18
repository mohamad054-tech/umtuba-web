/**
 * Assemble pilot courses into draft originals and a learner test surface.
 * Publish is never automatic. AI Tutor ingest and certificates require publish.
 */

import {
  addOriginalLesson,
  createOriginalDraft,
  evaluateOriginalAiTutor,
  evaluateOriginalCertificate,
} from "../authoring";
import type { OriginalLesson, UmtubaOriginalCourse } from "../types";
import type {
  PilotLesson,
  PilotQuizQuestion,
  UmtubaOriginalPilotCourse,
} from "./types";
import { PILOT_PASS_THRESHOLD_PERCENT } from "./types";

export function countPilotLessons(course: UmtubaOriginalPilotCourse): number {
  return course.modules.reduce((sum, courseModule) => sum + courseModule.lessons.length, 0);
}

export function countPilotQuizzes(course: UmtubaOriginalPilotCourse): number {
  const moduleQuizzes = course.modules.reduce(
    (sum, courseModule) => sum + courseModule.lessons.filter((lesson) => lesson.kind === "quiz").length,
    0
  );
  return moduleQuizzes + 1;
}

export function assemblePilotDraft(
  course: UmtubaOriginalPilotCourse,
  at: string
): { ok: true; original: UmtubaOriginalCourse } | { ok: false; message: string } {
  const created = createOriginalDraft({
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.shortDescription,
    language: course.language,
    category: course.category,
    difficulty: course.level,
    authors: course.authors,
    at,
  });
  if (!created.ok) return created;

  let original = created.course;
  let position = 0;
  for (const courseModule of course.modules) {
    for (const lesson of courseModule.lessons) {
      const added = addOriginalLesson(original, toOriginalLesson(lesson, position), at);
      if (!added.ok) return added;
      original = added.course;
      position += 1;
    }
  }
  if (original.status !== "draft" || original.publishedAt !== null) {
    return { ok: false, message: "Pilot originals must remain draft until an explicit publish." };
  }
  return { ok: true, original };
}

function toOriginalLesson(lesson: PilotLesson, position: number): OriginalLesson {
  return {
    id: lesson.id,
    kind: lesson.kind,
    title: lesson.title,
    body: lesson.body,
    resourceRef: lesson.resource ? `pilot-resource:${lesson.resource.kind}:${lesson.resource.title}` : null,
    quizQuestionCount: lesson.quiz.length,
    position,
  };
}

export function gradeQuiz(
  questions: readonly PilotQuizQuestion[],
  answers: Record<string, string>,
  passingScorePercent: number = PILOT_PASS_THRESHOLD_PERCENT
): { total: number; correct: number; percent: number; passed: boolean; passingScorePercent: number } {
  let correct = 0;
  for (const question of questions) {
    if (answers[question.id] === question.correctChoiceId) correct += 1;
  }
  const total = questions.length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { total, correct, percent, passed: percent >= passingScorePercent, passingScorePercent };
}

export type PilotLearnerProgress = {
  courseId: string;
  completedLessonIds: string[];
  quizResults: Record<string, { percent: number; passed: boolean }>;
  finalAssessment: { percent: number; passed: boolean } | null;
};

export function emptyPilotProgress(courseId: string): PilotLearnerProgress {
  return { courseId, completedLessonIds: [], quizResults: {}, finalAssessment: null };
}

export function markLessonComplete(
  progress: PilotLearnerProgress,
  lessonId: string
): PilotLearnerProgress {
  if (progress.completedLessonIds.includes(lessonId)) return progress;
  return { ...progress, completedLessonIds: [...progress.completedLessonIds, lessonId] };
}

export function recordQuizResult(
  progress: PilotLearnerProgress,
  lessonId: string,
  result: { percent: number; passed: boolean }
): PilotLearnerProgress {
  return {
    ...progress,
    quizResults: { ...progress.quizResults, [lessonId]: result },
    completedLessonIds: progress.completedLessonIds.includes(lessonId)
      ? progress.completedLessonIds
      : [...progress.completedLessonIds, lessonId],
  };
}

export function evaluatePilotCompletion(input: {
  course: UmtubaOriginalPilotCourse;
  progress: PilotLearnerProgress;
}): { complete: boolean; reason: string } {
  const lessonIds = input.course.modules.flatMap((courseModule) =>
    courseModule.lessons.map((lesson) => lesson.id)
  );
  const missing = lessonIds.filter((id) => !input.progress.completedLessonIds.includes(id));
  if (missing.length > 0) {
    return { complete: false, reason: "All lessons must be completed." };
  }
  const quizzes = input.course.modules.flatMap((courseModule) =>
    courseModule.lessons.filter((lesson) => lesson.kind === "quiz")
  );
  const failedQuiz = quizzes.find((quiz) => input.progress.quizResults[quiz.id]?.passed !== true);
  if (failedQuiz) {
    return { complete: false, reason: "Every module quiz must be passed." };
  }
  if (input.progress.finalAssessment?.passed !== true) {
    return { complete: false, reason: "Final assessment must be passed." };
  }
  return { complete: true, reason: "Course lessons, quizzes, and final assessment are complete." };
}

export function evaluatePilotCertificatePath(input: {
  course: UmtubaOriginalPilotCourse;
  original: UmtubaOriginalCourse;
  progress: PilotLearnerProgress;
}): { ready: boolean; issuable: boolean; reason: string } {
  const completion = evaluatePilotCompletion(input);
  const cert = evaluateOriginalCertificate(input.original);
  const policy = input.course.certificatePolicy;
  if (policy.issuer !== "UMTUBA" || policy.represents !== "UMTUBA_ONLY") {
    return { ready: false, issuable: false, reason: "Certificate must represent UMTUBA only." };
  }
  if (!completion.complete) {
    return { ready: true, issuable: false, reason: completion.reason };
  }
  if (!cert.allowed) {
    return {
      ready: true,
      issuable: false,
      reason: "Certificate path is defined; issuance waits for an explicit publish of this UMTUBA original.",
    };
  }
  return { ready: true, issuable: true, reason: cert.reason };
}

export function buildAiTutorContext(course: UmtubaOriginalPilotCourse): {
  allowedToPrepare: boolean;
  ingest: ReturnType<typeof evaluateOriginalAiTutor> | null;
  excerpts: { lessonId: string; title: string; body: string }[];
} {
  const excerpts = course.modules.flatMap((courseModule) =>
    courseModule.lessons
      .filter((lesson) => lesson.kind === "text" || lesson.kind === "resource")
      .map((lesson) => ({ lessonId: lesson.id, title: lesson.title, body: lesson.body }))
  );
  return {
    allowedToPrepare: course.aiTutorAllowed && course.contentOwner === "UMTUBA",
    ingest: null,
    excerpts,
  };
}

export function evaluatePilotAiTutor(input: {
  course: UmtubaOriginalPilotCourse;
  original: UmtubaOriginalCourse;
}): { contextReady: boolean; ingestAllowed: boolean; reason: string } {
  const context = buildAiTutorContext(input.course);
  const ingest = evaluateOriginalAiTutor(input.original);
  if (!context.allowedToPrepare) {
    return { contextReady: false, ingestAllowed: false, reason: "AI Tutor is not allowed on this content." };
  }
  return {
    contextReady: true,
    ingestAllowed: ingest.allowed,
    reason: ingest.allowed
      ? ingest.reason
      : "Owned-content context is prepared; ingest waits for an explicit publish.",
  };
}

export function buildLearnerOverview(course: UmtubaOriginalPilotCourse) {
  return {
    title: course.title,
    slug: course.slug,
    shortDescription: course.shortDescription,
    fullDescription: course.fullDescription,
    targetAudience: course.targetAudience,
    level: course.level,
    prerequisites: course.prerequisites,
    learningObjectives: course.learningObjectives,
    moduleCount: course.modules.length,
    lessonCount: countPilotLessons(course),
    quizCount: countPilotQuizzes(course),
    exerciseCount: course.exercises.length,
    estimatedDurationMinutes: course.estimatedDurationMinutes,
    passThresholdPercent: course.passThresholdPercent,
    progressRules: course.progressRules,
    status: course.status,
    publishState: course.publishState,
    providerType: course.providerType,
    contentOwner: course.contentOwner,
    contentRights: course.contentRights,
    aiTutorAllowed: course.aiTutorAllowed,
    certificateRepresents: course.certificatePolicy.represents,
    modules: course.modules.map((courseModule) => ({
      id: courseModule.id,
      title: courseModule.title,
      summary: courseModule.summary,
      lessonTitles: courseModule.lessons.map((lesson) => lesson.title),
    })),
  };
}

export function correctAnswersFor(questions: readonly PilotQuizQuestion[]): Record<string, string> {
  return Object.fromEntries(questions.map((question) => [question.id, question.correctChoiceId]));
}
