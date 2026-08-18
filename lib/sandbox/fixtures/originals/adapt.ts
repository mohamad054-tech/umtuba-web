/**
 * Adapt PC2 / pre-company Originals into sandbox course fixtures.
 * Lesson bodies, quiz stems, explanations, and exercise prompts stay verbatim.
 */

import type {
  SandboxCourse,
  SandboxExercise,
  SandboxFinalAssessment,
  SandboxLesson,
  SandboxModule,
} from "../types";
import {
  AI_FUNDAMENTALS_FOR_EVERYONE,
  DIGITAL_SAFETY_PRIVACY_FUNDAMENTALS,
  UMTUBA_CERTIFICATE_STATEMENT,
  UMTUBA_PLATFORM_ESSENTIALS,
  type PilotLesson,
  type PilotQuizQuestion,
  type UmtubaOriginalPilotCourse,
} from "./pilot";

const FINAL_IDS = {
  "umtuba-platform-essentials": "pe-final",
  "digital-safety-privacy-fundamentals": "ds-final",
  "ai-fundamentals-for-everyone": "ai-final",
} as const;

const INSTRUCTOR_IDS = {
  "umtuba-platform-essentials": "demo-instructor-07",
  "digital-safety-privacy-fundamentals": "demo-instructor-04",
  "ai-fundamentals-for-everyone": "demo-instructor-01",
} as const;

const SANDBOX_IDS = {
  "umtuba-platform-essentials": "sandbox-original-platform-essentials",
  "digital-safety-privacy-fundamentals": "sandbox-original-digital-safety",
  "ai-fundamentals-for-everyone": "sandbox-original-ai-fundamentals",
} as const;

const LESSON_PRACTICE_CHROME =
  "Using only this lesson, write one action you will take next. Do not invent product features that are not in the lesson.";

const ORIGINAL_BASE = {
  kind: "UMTUBA_ORIGINAL" as const,
  status: "DRAFT" as const,
  publishState: "DRAFT" as const,
  publicCatalog: false as const,
  synthetic: true as const,
  enrollmentMode: "HOSTED" as const,
  listPriceMinor: 0,
  revenueSharePercent: null,
  contentOwner: "UMTUBA",
  certificateOwner: "UMTUBA",
  contentRights: "OWNED" as const,
  aiTutorAllowed: true,
  providerId: "umtuba-originals",
};

function toQuiz(questions: readonly PilotQuizQuestion[]) {
  return questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    choices: question.choices.map((choice) => ({ id: choice.id, text: choice.text })),
    correctChoiceId: question.correctChoiceId,
    explanation: question.explanation,
  }));
}

function lessonExerciseFor(lesson: PilotLesson): SandboxExercise | undefined {
  if (lesson.kind === "quiz") return undefined;
  if (lesson.resource) {
    return {
      id: `${lesson.id}-ex`,
      title: lesson.resource.title,
      prompt: lesson.resource.body,
      successCriteria: [
        "Uses only this UMTUBA-owned resource.",
        "Does not invent a partner, live purchase, or production publish.",
      ],
      scope: "lesson",
      lessonId: lesson.id,
    };
  }
  return {
    id: `${lesson.id}-ex`,
    title: `Practice: ${lesson.title}`,
    prompt: LESSON_PRACTICE_CHROME,
    successCriteria: [
      "The write-up refers to this lesson only.",
      "No secrets, live partners, or production publish claims.",
    ],
    scope: "lesson",
    lessonId: lesson.id,
  };
}

function toLesson(lesson: PilotLesson): SandboxLesson {
  const kind = lesson.kind === "video" ? "text" : lesson.kind;
  return {
    id: lesson.id,
    title: lesson.title,
    kind,
    estimatedMinutes: lesson.estimatedMinutes,
    body: lesson.body,
    quiz: toQuiz(lesson.quiz),
    resource: lesson.resource,
    lessonExercise: lessonExerciseFor(lesson),
  };
}

function toModule(courseModule: UmtubaOriginalPilotCourse["modules"][number]): SandboxModule {
  return {
    id: courseModule.id,
    title: courseModule.title,
    summary: courseModule.summary,
    lessons: courseModule.lessons.map(toLesson),
  };
}

function toFinal(course: UmtubaOriginalPilotCourse): SandboxFinalAssessment {
  const questions = toQuiz(course.finalAssessment);
  return {
    id: FINAL_IDS[course.slug as keyof typeof FINAL_IDS],
    title: `${course.title} final assessment`,
    questions: questions.slice(0, 5),
    reviewBank: questions.slice(5),
    passCorrect: 4,
    passTotal: 5,
    attempts: "UNLIMITED",
    mode: "SCORE",
  };
}

function toCourseExercises(course: UmtubaOriginalPilotCourse): SandboxExercise[] {
  return course.exercises.map((exercise) => ({
    id: exercise.id,
    title: exercise.title,
    prompt: exercise.prompt,
    successCriteria: exercise.successCriteria,
    scope: "course",
  }));
}

export function adaptPilotCourse(course: UmtubaOriginalPilotCourse): SandboxCourse {
  return {
    ...ORIGINAL_BASE,
    id: SANDBOX_IDS[course.slug as keyof typeof SANDBOX_IDS],
    slug: course.slug,
    title: course.title,
    shortDescription: course.shortDescription,
    fullDescription: course.fullDescription,
    targetAudience: course.targetAudience,
    level: course.level,
    language: course.language,
    prerequisites: course.prerequisites,
    learningObjectives: course.learningObjectives,
    estimatedDurationMinutes: course.estimatedDurationMinutes,
    progressRules: course.progressRules,
    instructorId: INSTRUCTOR_IDS[course.slug as keyof typeof INSTRUCTOR_IDS],
    certificatePolicy: {
      issuer: "UMTUBA",
      represents: "UMTUBA_ONLY",
      requiresFinalAssessmentPass: true,
      passingScoreLabel: "4/5",
      notAnAccreditedCredential: true,
      statement: course.certificatePolicy.statement || UMTUBA_CERTIFICATE_STATEMENT,
    },
    finalAssessment: toFinal(course),
    modules: course.modules.map(toModule),
    exercises: toCourseExercises(course),
  };
}

export const ADAPTED_ORIGINALS: readonly SandboxCourse[] = [
  adaptPilotCourse(UMTUBA_PLATFORM_ESSENTIALS),
  adaptPilotCourse(DIGITAL_SAFETY_PRIVACY_FUNDAMENTALS),
  adaptPilotCourse(AI_FUNDAMENTALS_FOR_EVERYONE),
];

export function contentLessons(course: SandboxCourse): SandboxLesson[] {
  return course.modules.flatMap((courseModule) =>
    courseModule.lessons.filter((lesson) => lesson.kind !== "quiz")
  );
}

export function moduleQuizzes(course: SandboxCourse): SandboxLesson[] {
  return course.modules.flatMap((courseModule) =>
    courseModule.lessons.filter((lesson) => lesson.kind === "quiz")
  );
}

export function lessonExercises(course: SandboxCourse): SandboxExercise[] {
  return contentLessons(course)
    .map((lesson) => lesson.lessonExercise)
    .filter((exercise): exercise is SandboxExercise => Boolean(exercise));
}
