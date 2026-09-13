import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AI_FUNDAMENTALS,
  DIGITAL_SAFETY,
  PLATFORM_ESSENTIALS,
  UMTUBA_ORIGINAL_SANDBOX_COURSES,
  originalLessonCount,
} from "./originals";
import { ORIGINALS_CERTIFICATE_DISCLAIMER } from "./originalsShared";
import type { QuizQuestion, UmtubaOriginalCourse } from "./types";

const ROOT = process.cwd();

function everyLesson(course: UmtubaOriginalCourse) {
  return course.modules.flatMap((module) => module.lessons);
}

function quizLessons(course: UmtubaOriginalCourse) {
  return everyLesson(course).filter((lesson) => lesson.kind === "quiz");
}

function assertQuizShape(questions: QuizQuestion[]) {
  expect(questions.length).toBeGreaterThanOrEqual(3);
  expect(questions.length).toBeLessThanOrEqual(5);
  const ids = new Set<string>();
  for (const question of questions) {
    expect(question.prompt.trim().length).toBeGreaterThan(10);
    expect(question.choices).toHaveLength(4);
    expect(question.choices.some((choice) => choice.id === question.correctChoiceId)).toBe(
      true
    );
    expect(question.explanation.trim().length).toBeGreaterThan(8);
    expect(ids.has(question.id)).toBe(false);
    ids.add(question.id);
  }
}

describe("UMTUBA Originals content schema", () => {
  it("keeps the three owned drafts at 4 modules × 12 lessons", () => {
    expect(UMTUBA_ORIGINAL_SANDBOX_COURSES.map((course) => course.title)).toEqual([
      "UMTUBA Platform Essentials",
      "Digital Safety & Privacy Fundamentals",
      "AI Fundamentals for Everyone",
    ]);
    for (const course of UMTUBA_ORIGINAL_SANDBOX_COURSES) {
      expect(course.kind).toBe("UMTUBA_ORIGINAL");
      expect(course.status).toBe("DRAFT");
      expect(course.publishState).toBe("DRAFT");
      expect(course.publicCatalog).toBe(false);
      expect(course.contentOwner).toBe("UMTUBA");
      expect(course.certificateOwner).toBe("UMTUBA");
      expect(course.aiTutorAllowed).toBe(true);
      expect(course.modules).toHaveLength(4);
      expect(originalLessonCount(course)).toBe(12);
    }
  });

  it("completes every lesson with objective, body, takeaways, tutor context, and time", () => {
    for (const course of UMTUBA_ORIGINAL_SANDBOX_COURSES) {
      for (const lesson of everyLesson(course)) {
        expect(lesson.objective?.trim().length).toBeGreaterThan(20);
        expect(lesson.body.trim().length).toBeGreaterThan(
          lesson.kind === "quiz" ? 40 : 180
        );
        expect(lesson.aiTutorContext?.trim().length).toBeGreaterThan(40);
        expect(lesson.aiTutorContext!.length).toBeLessThan(600);
        expect(lesson.estimatedMinutes).toBeGreaterThanOrEqual(6);
        expect(lesson.estimatedMinutes).toBeLessThanOrEqual(16);
        if (lesson.kind !== "quiz") {
          expect(lesson.keyTakeaways?.length).toBeGreaterThanOrEqual(3);
          expect(lesson.examples?.length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("gives each module quiz 3–5 scored questions with explanations", () => {
    for (const course of UMTUBA_ORIGINAL_SANDBOX_COURSES) {
      const quizzes = quizLessons(course);
      expect(quizzes).toHaveLength(4);
      for (const lesson of quizzes) {
        assertQuizShape(lesson.quiz);
      }
    }
  });

  it("maps one final assessment per course onto existing score-mode completion", () => {
    for (const course of UMTUBA_ORIGINAL_SANDBOX_COURSES) {
      const assessment = course.finalAssessment;
      expect(assessment.completionMode).toBe("score");
      expect(assessment.maxAttempts).toBeNull();
      expect(assessment.passingScore).toBeLessThanOrEqual(assessment.maxScore);
      expect(assessment.passingScore).toBe(4);
      expect(assessment.maxScore).toBe(5);
      expect(assessment.completionRelationship).toMatch(
        /learning_completion_assessment_gate_ok/
      );
      expect(assessment.completionRelationship).toMatch(
        /course_progress\.status='completed'/
      );
      assertQuizShape(assessment.quiz);
    }
  });

  it("keeps Originals certificate copy as UMTUBA completion, not a degree", () => {
    for (const course of UMTUBA_ORIGINAL_SANDBOX_COURSES) {
      const copy = course.certificateCopy;
      expect(copy.courseName).toBe(course.title);
      expect(copy.issuer).toBe("UMTUBA");
      expect(copy.learnerNamePlaceholder).toBe("{{LEARNER_NAME}}");
      expect(copy.completionDatePlaceholder).toBe("{{COMPLETION_DATE}}");
      expect(copy.certificateIdPlaceholder).toBe("{{CERTIFICATE_ID}}");
      expect(copy.completionStatement).toContain("{{LEARNER_NAME}}");
      expect(copy.completionStatement).toContain(course.title);
      expect(copy.disclaimer).toBe(ORIGINALS_CERTIFICATE_DISCLAIMER);
      expect(copy.disclaimer).toMatch(/not a degree, license, accreditation/i);
    }
  });

  it("keeps exercises free of real secrets, payments, and unsafe asks", () => {
    const forbidden =
      /\b(paste your password|enter your password|real card|ssn|social security|upload a passport)\b/i;
    const blobs: string[] = [];
    for (const course of UMTUBA_ORIGINAL_SANDBOX_COURSES) {
      for (const exercise of course.exercises) blobs.push(exercise.prompt);
      for (const lesson of everyLesson(course)) {
        if (lesson.exercise) blobs.push(lesson.exercise.prompt);
      }
    }
    expect(blobs.length).toBeGreaterThan(20);
    for (const prompt of blobs) {
      expect(prompt).not.toMatch(forbidden);
    }
  });

  it("does not copy third-party course titles or invent citations", () => {
    const files = [
      "lib/sandbox/fixtures/originalsPlatform.ts",
      "lib/sandbox/fixtures/originalsSafety.ts",
      "lib/sandbox/fixtures/originalsAi.ts",
    ];
    for (const rel of files) {
      const text = readFileSync(join(ROOT, rel), "utf8");
      expect(text).not.toMatch(/Complete Python Bootcamp|Machine Learning by Andrew/i);
      expect(text).not.toMatch(/according to a 20\d\d (study|report) by/i);
    }
  });

  it("does not create instructor records", () => {
    expect(PLATFORM_ESSENTIALS.instructorId).toBe("demo-instructor-07");
    expect(DIGITAL_SAFETY.instructorId).toBe("demo-instructor-04");
    expect(AI_FUNDAMENTALS.instructorId).toBe("demo-instructor-01");
    const peoplePath = join(ROOT, "lib/sandbox/fixtures/people.ts");
    expect(() => readFileSync(peoplePath, "utf8")).toThrow();
  });
});
