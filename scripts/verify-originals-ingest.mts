/**
 * Vitest-free ingest verifier. Imports only originals + types + certificates
 * so Node strip-types does not need a full node_modules tree.
 */
import { emptyRights, effectiveRights } from "../lib/sandbox/fixtures/types";
import { UMTUBA_ORIGINAL_SANDBOX_COURSES } from "../lib/sandbox/fixtures/originals";
import { contentLessons, lessonExercises, moduleQuizzes } from "../lib/sandbox/fixtures/originals/adapt";
import { UMTUBA_ORIGINAL_PILOT_COURSES } from "../lib/sandbox/fixtures/originals/pilot";
import { renderSandboxCertificate } from "../lib/sandbox/learning/certificates";

function flattenLessons(course: (typeof UMTUBA_ORIGINAL_SANDBOX_COURSES)[number]) {
  return course.modules.flatMap((courseModule) => courseModule.lessons);
}

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

function scoreFinal(course: (typeof UMTUBA_ORIGINAL_SANDBOX_COURSES)[number], answers: Record<string, string>) {
  const assessment = course.finalAssessment!;
  const correct = assessment.questions.filter((q) => answers[q.id] === q.correctChoiceId).length;
  return { correct, total: assessment.passTotal, passed: correct >= assessment.passCorrect };
}

let lessons = 0;
let quizzes = 0;
let lessonEx = 0;
let courseEx = 0;
assert(UMTUBA_ORIGINAL_SANDBOX_COURSES.length === 3, "expected 3 originals");
assert(UMTUBA_ORIGINAL_PILOT_COURSES.length === 3, "expected 3 source courses");
for (const [index, course] of UMTUBA_ORIGINAL_SANDBOX_COURSES.entries()) {
  const source = UMTUBA_ORIGINAL_PILOT_COURSES[index]!;
  assert(course.modules.length === 4, `${course.slug} modules`);
  assert(flattenLessons(course).length === 12, `${course.slug} lessons`);
  lessons += flattenLessons(course).length;
  quizzes += moduleQuizzes(course).length;
  lessonEx += lessonExercises(course).length;
  courseEx += course.exercises.length;
  assert(contentLessons(course).length === 8, `${course.slug} content lessons`);
  assert(course.publicCatalog === false, `${course.slug} public`);
  assert(course.finalAssessment?.questions.length === 5, `${course.slug} final size`);
  assert(course.finalAssessment?.passCorrect === 4, `${course.slug} pass`);
  assert(course.finalAssessment?.attempts === "UNLIMITED", `${course.slug} attempts`);
  assert(course.finalAssessment?.mode === "SCORE", `${course.slug} mode`);
  for (const lesson of flattenLessons(course)) {
    const sourceLesson = source.modules.flatMap((m) => m.lessons).find((l) => l.id === lesson.id);
    assert(sourceLesson, `missing source ${lesson.id}`);
    assert(lesson.body === sourceLesson!.body, `rewritten body ${lesson.id}`);
  }
}
assert(lessons === 36, `lessons ${lessons}`);
assert(quizzes === 12, `quizzes ${quizzes}`);
assert(lessonEx === 24, `lesson exercises ${lessonEx}`);
assert(courseEx >= 6, `course exercises ${courseEx}`);
assert(
  UMTUBA_ORIGINAL_SANDBOX_COURSES.map((c) => c.finalAssessment?.id).join(",") === "pe-final,ds-final,ai-final",
  "final ids"
);

for (const course of UMTUBA_ORIGINAL_SANDBOX_COURSES) {
  const failAnswers = Object.fromEntries(
    course.finalAssessment!.questions.map((question, index) => [
      question.id,
      index < 3
        ? question.correctChoiceId
        : question.choices.find((choice) => choice.id !== question.correctChoiceId)!.id,
    ])
  );
  const failed = scoreFinal(course, failAnswers);
  assert(failed.correct === 3 && failed.passed === false, `${course.slug} should fail <4/5`);
  const passAnswers = Object.fromEntries(
    course.finalAssessment!.questions.map((question) => [question.id, question.correctChoiceId])
  );
  const passed = scoreFinal(course, passAnswers);
  assert(passed.correct === 5 && passed.passed === true, `${course.slug} should pass 5/5`);
}

assert(effectiveRights(emptyRights({ AI_USAGE_ALLOWED: "DENY" })).AI_USAGE_ALLOWED === false, "AI deny");
const original = UMTUBA_ORIGINAL_SANDBOX_COURSES[0]!;
assert(original.aiTutorAllowed === true, "owned tutor allowed");
assert(original.kind === "UMTUBA_ORIGINAL", "owned kind");
const preview = renderSandboxCertificate({
  studentName: "Demo Student 01",
  courseTitle: original.title,
  courseSlug: original.slug,
  studentId: "demo-student-01",
  statement: original.certificatePolicy!.statement,
  issued: true,
});
assert(preview.issuer === "UMTUBA", "issuer");
assert(preview.realCredential === false, "no real credential");
assert(preview.marking === "SANDBOX / DEMO", "sandbox mark");

console.log(
  JSON.stringify(
    {
      ok: true,
      lessons,
      quizzes,
      lessonExercises: lessonEx,
      courseExercises: courseEx,
      finals: ["pe-final", "ds-final", "ai-final"],
    },
    null,
    2
  )
);
