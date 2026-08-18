import { describe, expect, it } from "vitest";
import {
  addOriginalLesson,
  createOriginalDraft,
  evaluateOriginalAiTutor,
  evaluateOriginalCertificate,
  publishOriginal,
} from "./authoring";

describe("UMTUBA Originals", () => {
  it("creates, versions, and publishes an original with UMTUBA AI + certificate permission", () => {
    const draft = createOriginalDraft({
      id: "77777777-7777-4777-8777-777777777777",
      slug: "umtuba-commerce-rights",
      title: "UMTUBA Original: Commerce Rights",
      description: "First-party course owned by UMTUBA.",
      authors: [{ userId: "staff-1", displayName: "UMTUBA Staff Author", role: "author" }],
      at: "2026-08-18T08:00:00.000Z",
    });
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;

    const withLesson = addOriginalLesson(
      draft.course,
      {
        id: "lesson-1",
        kind: "text",
        title: "Rights default DENY",
        body: "Unknown rights are denied.",
        resourceRef: null,
        quizQuestionCount: 0,
        position: 0,
      },
      "2026-08-18T08:05:00.000Z"
    );
    expect(withLesson.ok).toBe(true);
    if (!withLesson.ok) return;

    const quiz = addOriginalLesson(
      withLesson.course,
      {
        id: "lesson-2",
        kind: "quiz",
        title: "Check understanding",
        body: null,
        resourceRef: null,
        quizQuestionCount: 3,
        position: 1,
      },
      "2026-08-18T08:06:00.000Z"
    );
    expect(quiz.ok).toBe(true);
    if (!quiz.ok) return;

    expect(evaluateOriginalAiTutor(quiz.course).allowed).toBe(false);
    const published = publishOriginal(quiz.course, "2026-08-18T08:10:00.000Z");
    expect(published.ok).toBe(true);
    if (!published.ok) return;
    expect(published.course.status).toBe("published");
    expect(published.course.versions.length).toBeGreaterThanOrEqual(4);
    expect(evaluateOriginalAiTutor(published.course).allowed).toBe(true);
    expect(evaluateOriginalCertificate(published.course).allowed).toBe(true);
  });

  it("rejects fabricated external instructors", () => {
    const created = createOriginalDraft({
      id: "88888888-8888-4888-8888-888888888888",
      slug: "bad-author",
      title: "Should fail",
      description: "nope",
      authors: [{ userId: "x", displayName: "Stanford Lecturer", role: "instructor" }],
      at: "2026-08-18T08:00:00.000Z",
    });
    expect(created.ok).toBe(false);
  });
});
