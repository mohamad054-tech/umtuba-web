import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SANDBOX_COURSES } from "../fixtures/courses";
import { UMTUBA_ORIGINAL_SANDBOX_COURSES } from "../fixtures/originals";
import { lessonExercises } from "../fixtures/originals/adapt";
import { parseSandboxSection } from "../paths";
import { flattenLessons, getSandboxCourse } from "./catalog";
import {
  FOCUS_E2E_LESSON_EXERCISE,
  FOCUS_E2E_ORIGINAL,
  studentE2eClickPath,
} from "./clickPath";
import { sandboxTutorAnswer } from "./tutor";
import {
  listCourseExercises,
  listOriginalExercises,
  originalExerciseCounts,
  resolveLearningExercise,
} from "./exerciseRuntime";
import { parseLearningSandboxRoute, learningSandboxHref } from "./routes";
import {
  EMPTY_LEARNING_SANDBOX_STATE,
  reduceLearningSandboxState,
} from "./state";
import { liveProgress } from "./progress";
import { evaluateOriginalsCompletion } from "./completion";

const ROOT = process.cwd();
const FAILED_URL =
  "/sandbox/business-preview/learning/courses/umtuba-platform-essentials/exercise/pe-m1-l1-ex";

function segmentsFromHref(href: string) {
  return href.replace("/sandbox/business-preview/", "").split("/");
}

function walkOriginalRuntime(slug: string) {
  const course = getSandboxCourse(slug)!;
  const studentId = "demo-student-01";
  let state = reduceLearningSandboxState(EMPTY_LEARNING_SANDBOX_STATE, {
    type: "enroll",
    studentId,
    courseSlug: slug,
  });
  const rows = flattenLessons(course);
  for (const [index, row] of rows.entries()) {
    const lessonHref = learningSandboxHref({
      surface: "lesson",
      slug,
      lessonId: row.lesson.id,
    });
    expect(parseLearningSandboxRoute(segmentsFromHref(lessonHref))).toEqual({
      surface: "lesson",
      slug,
      lessonId: row.lesson.id,
    });
    if (index > 0) {
      const prev = rows[index - 1]!;
      expect(prev.lesson.id).toBeTruthy();
    }
    if (index < rows.length - 1) {
      expect(rows[index + 1]!.lesson.id).toBeTruthy();
    }
    state = reduceLearningSandboxState(state, {
      type: "completeLesson",
      studentId,
      courseSlug: slug,
      lessonId: row.lesson.id,
    });
    if (row.lesson.quiz.length > 0) {
      const quizHref = learningSandboxHref({
        surface: "quiz",
        slug,
        lessonId: row.lesson.id,
      });
      expect(parseLearningSandboxRoute(segmentsFromHref(quizHref))?.surface).toBe("quiz");
      state = reduceLearningSandboxState(state, {
        type: "submitQuiz",
        studentId,
        courseSlug: slug,
        lessonId: row.lesson.id,
        answers: Object.fromEntries(
          row.lesson.quiz.map((question) => [question.id, question.correctChoiceId])
        ),
      });
    }
    if (row.lesson.lessonExercise) {
      const resolved = resolveLearningExercise(slug, row.lesson.lessonExercise.id);
      expect(resolved.ok).toBe(true);
      state = reduceLearningSandboxState(state, {
        type: "submitExercise",
        studentId,
        courseSlug: slug,
        exerciseId: row.lesson.lessonExercise.id,
        answer: "Sandbox student action for this lesson exercise.",
      });
    }
    if (row.lesson.kind !== "quiz") {
      const tutor = sandboxTutorAnswer(course, row.lesson, "summarize this lesson");
      expect(tutor.allowed).toBe(true);
    }
  }
  for (const exercise of course.exercises) {
    expect(resolveLearningExercise(slug, exercise.id).ok).toBe(true);
    state = reduceLearningSandboxState(state, {
      type: "submitExercise",
      studentId,
      courseSlug: slug,
      exerciseId: exercise.id,
      answer: "Sandbox student action for this course exercise.",
    });
  }
  const assessmentHref = learningSandboxHref({ surface: "assessment", slug });
  expect(parseLearningSandboxRoute(segmentsFromHref(assessmentHref))?.surface).toBe("assessment");
  const passAnswers = Object.fromEntries(
    (course.finalAssessment?.questions ?? []).map((question) => [question.id, question.correctChoiceId])
  );
  state = reduceLearningSandboxState(state, {
    type: "submitAssessment",
    studentId,
    courseSlug: slug,
    answers: passAnswers,
  });
  const progress = liveProgress(state, studentId, slug)!;
  expect(progress.exercisesDone).toBeGreaterThanOrEqual(course.exercises.length);
  expect(progress.assessmentPassed).toBe(true);
  const completion = evaluateOriginalsCompletion({ course, state, studentId });
  expect(completion.courseComplete).toBe(true);
  const certHref = learningSandboxHref({ surface: "certificate", slug });
  expect(parseLearningSandboxRoute(segmentsFromHref(certHref))?.surface).toBe("certificate");
  return { course, state, progress };
}

describe("P0 failed exercise URL", () => {
  it("resolves pe-m1-l1-ex without treating it as missing", () => {
    const parsed = parseLearningSandboxRoute(segmentsFromHref(FAILED_URL));
    expect(parsed).toEqual({
      surface: "exercise",
      slug: FOCUS_E2E_ORIGINAL,
      exerciseId: FOCUS_E2E_LESSON_EXERCISE,
    });
    const section = parseSandboxSection(segmentsFromHref(FAILED_URL));
    expect(section.kind).toBe("learning");
    const resolved = resolveLearningExercise(FOCUS_E2E_ORIGINAL, FOCUS_E2E_LESSON_EXERCISE);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.exercise.scope).toBe("lesson");
    expect(resolved.exercise.lessonId).toBe("pe-m1-l1");
    expect(resolved.exercise.prompt.length).toBeGreaterThan(20);
    expect(resolved.lessonHref).toContain("/lessons/pe-m1-l1");
    expect(resolved.courseHref).toContain("/courses/umtuba-platform-essentials");
  });
});

describe("P1 audit all Originals exercises", () => {
  it("has 24 lesson exercises and 8 authored course exercises with unique IDs and valid routes", () => {
    const counts = originalExerciseCounts();
    expect(counts.lesson).toBe(24);
    expect(counts.course).toBe(8);
    expect(counts.total).toBe(32);
    const rows = listOriginalExercises();
    const ids = rows.map((row) => row.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const row of rows) {
      expect(parseLearningSandboxRoute(segmentsFromHref(row.href))).toEqual({
        surface: "exercise",
        slug: row.courseSlug,
        exerciseId: row.exerciseId,
      });
      expect(resolveLearningExercise(row.courseSlug, row.exerciseId).ok).toBe(true);
    }
    for (const course of UMTUBA_ORIGINAL_SANDBOX_COURSES) {
      expect(lessonExercises(course)).toHaveLength(8);
      expect(course.exercises.length).toBeGreaterThanOrEqual(2);
      const lessonLinks = flattenLessons(course)
        .map((row) => row.lesson.lessonExercise?.id)
        .filter((id): id is string => Boolean(id));
      expect(lessonLinks).toHaveLength(8);
      for (const id of lessonLinks) {
        expect(listCourseExercises(course).some((row) => row.exerciseId === id)).toBe(true);
      }
    }
  });

  it("keeps partner course exercise routes valid and unique per course", () => {
    for (const course of SANDBOX_COURSES) {
      const rows = listCourseExercises(course);
      const ids = rows.map((row) => row.exerciseId);
      expect(new Set(ids).size).toBe(ids.length);
      for (const row of rows) {
        expect(resolveLearningExercise(course.slug, row.exerciseId).ok).toBe(true);
      }
    }
  });
});

describe("P2 exercise completion updates sandbox progress", () => {
  it("saves pe-m1-l1-ex after enroll and increments exercisesDone", () => {
    const studentId = "demo-student-01";
    const slug = FOCUS_E2E_ORIGINAL;
    let state = reduceLearningSandboxState(EMPTY_LEARNING_SANDBOX_STATE, {
      type: "enroll",
      studentId,
      courseSlug: slug,
    });
    state = reduceLearningSandboxState(state, {
      type: "submitExercise",
      studentId,
      courseSlug: slug,
      exerciseId: FOCUS_E2E_LESSON_EXERCISE,
      answer: "I will keep Settings as the account boundary.",
    });
    const progress = liveProgress(state, studentId, slug)!;
    expect(progress.exercisesDone).toBe(1);
    expect(
      state.exerciseAnswers[`${studentId}::${slug}::${FOCUS_E2E_LESSON_EXERCISE}`]?.answer
    ).toContain("Settings");
  });
});

describe("P3 three Originals route-level runtime", () => {
  it("walks lesson quiz exercise prev/next tutor final certificate on each Original", () => {
    const slugs = [
      "umtuba-platform-essentials",
      "digital-safety-privacy-fundamentals",
      "ai-fundamentals-for-everyone",
    ];
    for (const slug of slugs) {
      const walked = walkOriginalRuntime(slug);
      expect(walked.progress.complete).toBe(true);
    }
    expect(studentE2eClickPath().some((step) => step.href === FAILED_URL)).toBe(true);
  });
});

describe("P4 missing and invalid exercise IDs", () => {
  it("keeps invalid and unknown ids on the exercise surface as unavailable, not unknown", () => {
    const invalid = parseLearningSandboxRoute([
      "learning",
      "courses",
      "umtuba-platform-essentials",
      "exercise",
      "NOT-VALID",
    ]);
    expect(invalid).toEqual({
      surface: "exercise",
      slug: "umtuba-platform-essentials",
      exerciseId: "NOT-VALID",
    });
    expect(parseSandboxSection([
      "learning",
      "courses",
      "umtuba-platform-essentials",
      "exercise",
      "NOT-VALID",
    ]).kind).toBe("learning");
    const invalidId = resolveLearningExercise("umtuba-platform-essentials", "NOT-VALID");
    expect(invalidId.ok).toBe(false);
    if (!invalidId.ok) expect(invalidId.reason).toBe("invalid-exercise-id");
    const missing = resolveLearningExercise("umtuba-platform-essentials", "no-such-exercise");
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toBe("unknown-exercise");
    const unknownCourse = resolveLearningExercise("not-a-course", "pe-m1-l1-ex");
    expect(unknownCourse.ok).toBe(false);
    if (!unknownCourse.ok) expect(unknownCourse.reason).toBe("unknown-course");
  });
});

describe("source contracts — do not hide the real hook bug", () => {
  it("uses the cached client store and exercise resolver", () => {
    const actions = readFileSync(
      join(ROOT, "app/components/sandbox/learning/LearningActions.tsx"),
      "utf8"
    );
    const view = readFileSync(
      join(ROOT, "app/components/sandbox/learning/LearningSandbox.tsx"),
      "utf8"
    );
    const page = readFileSync(
      join(ROOT, "app/sandbox/business-preview/[...section]/page.tsx"),
      "utf8"
    );
    expect(actions).toMatch(/readLearningSandboxClientState/);
    expect(actions).toMatch(/getLearningSandboxServerSnapshot/);
    expect(actions).not.toMatch(/parseLearningSandboxState\(window\.localStorage/);
    expect(view).toMatch(/resolveLearningExercise/);
    expect(view).toMatch(/unknownExercise/);
    expect(view).toMatch(/returnToLesson/);
    expect(view).toMatch(/returnToCourse/);
    const exerciseCase = view.slice(view.indexOf('case "exercise"'), view.indexOf('case "assessment"'));
    expect(exerciseCase).toMatch(/unknownExercise/);
    expect(exerciseCase).not.toMatch(/unknownLesson/);
    expect(page).toMatch(/SandboxView/);
    expect(
      readFileSync(join(ROOT, "app/sandbox/business-preview/error.tsx"), "utf8")
    ).toMatch(/real error/);
  });
});
