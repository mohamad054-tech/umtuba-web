import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  buildTutorSubmitKey,
  capabilityPersistsToThread,
  formatStoredMessageContent,
  formatTutorResultForDisplay,
  loadAiTutorLearnerSession,
  mapResumeHistoryMessages,
  parseWrongAnswerContext,
  resolveAvailableCapabilities,
  shouldBlockDuplicateSubmit,
} from "./aiTutorLearnerUi";

const COURSE = "22222222-2222-4222-8222-222222222222";
const LESSON = "33333333-3333-4333-8333-333333333333";
const THREAD = "44444444-4444-4444-8444-444444444444";
const ATTEMPT = "55555555-5555-4555-8555-555555555555";
const QUESTION = "77777777-7777-4777-8777-777777777777";

describe("aiTutorLearnerUi — wrong-answer context", () => {
  it("hides wrong-answer when context unavailable", () => {
    expect(parseWrongAnswerContext({})).toBeNull();
    expect(
      parseWrongAnswerContext({ attemptId: ATTEMPT, questionId: "nope" })
    ).toBeNull();
    const caps = resolveAvailableCapabilities({ wrongAnswer: null });
    expect(caps.available).not.toContain("explain_wrong_answer");
    expect(caps.deferred.some((d) => d.id === "explain_wrong_answer")).toBe(
      true
    );
  });

  it("enables wrong-answer only with valid UUIDs", () => {
    const ctx = parseWrongAnswerContext({
      attemptId: ATTEMPT,
      questionId: QUESTION,
    });
    expect(ctx).toEqual({ attemptId: ATTEMPT, questionId: QUESTION });
    const caps = resolveAvailableCapabilities({ wrongAnswer: ctx });
    expect(caps.available).toContain("explain_wrong_answer");
  });
});

describe("aiTutorLearnerUi — history rendering", () => {
  it("maps empty history", () => {
    expect(mapResumeHistoryMessages([])).toEqual([]);
    expect(mapResumeHistoryMessages(null)).toEqual([]);
  });

  it("renders stored plain and structured messages", () => {
    const views = mapResumeHistoryMessages([
      {
        id: "m1",
        role: "user",
        message_kind: "ask_question",
        content: "What is gravity?",
      },
      {
        id: "m2",
        role: "assistant",
        kind: "ask_question",
        content: JSON.stringify({ answer: "Attraction between masses." }),
      },
      { role: "user", content: "missing id" },
    ]);
    expect(views).toHaveLength(2);
    expect(views[0]?.content).toBe("What is gravity?");
    expect(views[1]?.content).toContain("Attraction between masses.");
  });

  it("formats capability results without answer keys", () => {
    const text = formatTutorResultForDisplay({
      explanation: "Because forces balance.",
      answer_key: "SECRET",
      revealsAnswerKey: false,
      modelId: "leak",
    });
    expect(text).toContain("Because forces balance.");
    expect(text).not.toMatch(/SECRET|answer_key|modelId/i);
    expect(formatStoredMessageContent("plain")).toBe("plain");
  });
});

describe("aiTutorLearnerUi — persistence capability mapping", () => {
  it("marks only bridge-allowlisted actions as persistable", () => {
    expect(capabilityPersistsToThread("ask_question")).toBe(true);
    expect(capabilityPersistsToThread("give_hint")).toBe(true);
    expect(capabilityPersistsToThread("explain_again")).toBe(true);
    expect(capabilityPersistsToThread("explain_lesson")).toBe(false);
    expect(capabilityPersistsToThread("summarize_lesson")).toBe(false);
    expect(capabilityPersistsToThread("generate_practice")).toBe(false);
    expect(capabilityPersistsToThread("explain_wrong_answer")).toBe(false);
  });
});

describe("aiTutorLearnerUi — duplicate prevention", () => {
  it("blocks while in-flight or identical accepted key", () => {
    const key = buildTutorSubmitKey("ask_question", {
      lessonId: LESSON,
      threadId: THREAD,
      question: "Hi",
    });
    expect(
      shouldBlockDuplicateSubmit({
        inFlight: true,
        lastAcceptedKey: null,
        nextKey: key,
      })
    ).toBe(true);
    expect(
      shouldBlockDuplicateSubmit({
        inFlight: false,
        lastAcceptedKey: key,
        nextKey: key,
      })
    ).toBe(true);
    expect(
      shouldBlockDuplicateSubmit({
        inFlight: false,
        lastAcceptedKey: null,
        nextKey: key,
      })
    ).toBe(false);
  });
});

describe("aiTutorLearnerUi — session ensure / resume", () => {
  it("ensures a new thread then resumes empty history", async () => {
    const ensureThread = vi.fn(async () => ({
      ok: true as const,
      data: {
        thread_id: THREAD,
        course_id: COURSE,
        lesson_id: LESSON,
        lifecycle_status: "active",
        created: true,
      },
    }));
    const resumeThread = vi.fn(async () => ({
      ok: true as const,
      data: {
        thread_id: THREAD,
        course_id: COURSE,
        lesson_id: LESSON,
        messages: [],
      },
    }));

    const result = await loadAiTutorLearnerSession(
      { supabase: {} as never, ensureThread, resumeThread },
      { courseId: COURSE, lessonId: LESSON }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.threadId).toBe(THREAD);
    expect(result.created).toBe(true);
    expect(result.emptyHistory).toBe(true);
    expect(ensureThread).toHaveBeenCalledTimes(1);
    expect(resumeThread).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        threadId: THREAD,
        courseId: COURSE,
        lessonId: LESSON,
      })
    );
  });

  it("resumes an existing thread with history", async () => {
    const ensureThread = vi.fn(async () => ({
      ok: true as const,
      data: {
        thread_id: THREAD,
        created: false,
        lifecycle_status: "active",
      },
    }));
    const resumeThread = vi.fn(async () => ({
      ok: true as const,
      data: {
        thread_id: THREAD,
        course_id: COURSE,
        lesson_id: LESSON,
        messages: [
          {
            id: "m1",
            role: "user",
            message_kind: "ask_question",
            content: "Explain inertia",
          },
        ],
      },
    }));

    const result = await loadAiTutorLearnerSession(
      { supabase: {} as never, ensureThread, resumeThread },
      { courseId: COURSE, lessonId: LESSON }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created).toBe(false);
    expect(result.emptyHistory).toBe(false);
    expect(result.messages[0]?.content).toBe("Explain inertia");
  });

  it("fail-closed on access denied from ensure", async () => {
    const ensureThread = vi.fn(async () => ({
      ok: false as const,
      message: "You are not entitled to this course",
    }));
    const result = await loadAiTutorLearnerSession(
      {
        supabase: {} as never,
        ensureThread,
        resumeThread: vi.fn(),
      },
      { courseId: COURSE, lessonId: LESSON }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("access_denied");
  });

  it("fail-closed on missing / invalid lesson ids", async () => {
    const result = await loadAiTutorLearnerSession(
      { supabase: {} as never },
      { courseId: "bad", lessonId: LESSON }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid_ids");
  });

  it("fail-closed on backend resume error", async () => {
    const ensureThread = vi.fn(async () => ({
      ok: true as const,
      data: { thread_id: THREAD, created: false },
    }));
    const resumeThread = vi.fn(async () => ({
      ok: false as const,
      message: "provider blew up unexpectedly with secrets",
    }));
    const result = await loadAiTutorLearnerSession(
      { supabase: {} as never, ensureThread, resumeThread },
      { courseId: COURSE, lessonId: LESSON }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("resume_failed");
    expect(result.message.length).toBeLessThanOrEqual(180);
  });

  it("does not create a second ensure path for refresh semantics", async () => {
    const ensureThread = vi.fn(async () => ({
      ok: true as const,
      data: { thread_id: THREAD, created: false },
    }));
    const resumeThread = vi.fn(async () => ({
      ok: true as const,
      data: {
        thread_id: THREAD,
        course_id: COURSE,
        lesson_id: LESSON,
        messages: [],
      },
    }));
    const first = await loadAiTutorLearnerSession(
      { supabase: {} as never, ensureThread, resumeThread },
      { courseId: COURSE, lessonId: LESSON }
    );
    const second = await loadAiTutorLearnerSession(
      { supabase: {} as never, ensureThread, resumeThread },
      { courseId: COURSE, lessonId: LESSON }
    );
    expect(ensureThread).toHaveBeenCalledTimes(2);
    expect(ensureThread).toHaveBeenNthCalledWith(
      1,
      {},
      expect.objectContaining({ courseId: COURSE, lessonId: LESSON })
    );
    expect(ensureThread).toHaveBeenNthCalledWith(
      2,
      {},
      expect.objectContaining({ courseId: COURSE, lessonId: LESSON })
    );
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.threadId).toBe(THREAD);
    expect(second.threadId).toBe(THREAD);
    expect(first.created).toBe(false);
    expect(second.created).toBe(false);
  });
});

describe("aiTutorLearnerUi — page wiring contracts", () => {
  it("ai-tutor page no longer uses firstCourseActions stubs", () => {
    const page = readFileSync(
      join(
        process.cwd(),
        "app/learning/lessons/[lessonId]/ai-tutor/page.tsx"
      ),
      "utf8"
    );
    expect(page).not.toMatch(/firstCourseActions/);
    expect(page).not.toMatch(/createAiTutorThreadAction/);
    expect(page).not.toMatch(/appendAiTutorMessageAction/);
    expect(page).toMatch(/loadAiTutorLearnerSession/);
    expect(page).toMatch(/AiTutorLearnerPanel/);
  });

  it("panel uses official learningTutor server actions", () => {
    const panel = readFileSync(
      join(
        process.cwd(),
        "app/components/learning/AiTutorLearnerPanel.tsx"
      ),
      "utf8"
    );
    expect(panel).toMatch(/answerQuestionLearningTutorAction/);
    expect(panel).toMatch(/explainLessonLearningTutorAction/);
    expect(panel).toMatch(/summarizeLessonLearningTutorAction/);
    expect(panel).toMatch(/generatePracticeLearningTutorAction/);
    expect(panel).toMatch(/giveHintLearningTutorAction/);
    expect(panel).toMatch(/explainAgainLearningTutorAction/);
    expect(panel).toMatch(/explainWrongAnswerLearningTutorAction/);
    expect(panel).not.toMatch(/firstCourseActions/);
    expect(panel).not.toMatch(/appendAiTutorMessageAction/);
  });
});
