"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  answerQuestionLearningTutorAction,
  explainAgainLearningTutorAction,
  explainLessonLearningTutorAction,
  explainWrongAnswerLearningTutorAction,
  generatePracticeLearningTutorAction,
  giveHintLearningTutorAction,
  summarizeLessonLearningTutorAction,
} from "../../actions/learningTutor";
import type { LearningTutorServerActionResult } from "../../../lib/ai/contracts/learningTutorServerActions";
import {
  buildTutorSubmitKey,
  capabilityPersistsToThread,
  formatTutorResultForDisplay,
  isCapabilityEnabled,
  resolveAvailableCapabilities,
  shouldBlockDuplicateSubmit,
  type AiTutorLearnerCapabilityId,
  type AiTutorLearnerMessageView,
  type AiTutorWrongAnswerContext,
} from "../../../lib/learning/aiTutorLearnerUi";

type Props = {
  lessonId: string;
  courseId: string;
  threadId: string;
  initialMessages: AiTutorLearnerMessageView[];
  wrongAnswer: AiTutorWrongAnswerContext | null;
  lessonTitle?: string | null;
};

const CAPABILITY_LABELS: Record<AiTutorLearnerCapabilityId, string> = {
  ask_question: "Ask a question",
  explain_lesson: "Explain lesson",
  summarize_lesson: "Summarize lesson",
  generate_practice: "Generate practice",
  give_hint: "Give hint",
  explain_again: "Explain again",
  explain_wrong_answer: "Explain wrong answer",
};

function resultText(result: LearningTutorServerActionResult): string {
  if (!result.ok) return "";
  return formatTutorResultForDisplay(result.data.result);
}

export default function AiTutorLearnerPanel({
  lessonId,
  courseId: _courseId,
  threadId,
  initialMessages,
  wrongAnswer,
  lessonTitle,
}: Props) {
  void _courseId;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ephemeral, setEphemeral] = useState<{
    capability: AiTutorLearnerCapabilityId;
    text: string;
  } | null>(null);
  const [question, setQuestion] = useState("");
  const [focus, setFocus] = useState("");
  const [activeCapability, setActiveCapability] =
    useState<AiTutorLearnerCapabilityId>("ask_question");
  const inFlightRef = useRef(false);
  const lastAcceptedKeyRef = useRef<string | null>(null);

  const { available, deferred } = useMemo(
    () => resolveAvailableCapabilities({ wrongAnswer }),
    [wrongAnswer]
  );

  const wrongAnswerDeferred = deferred.find(
    (d) => d.id === "explain_wrong_answer"
  );

  async function runCapability(
    capability: AiTutorLearnerCapabilityId
  ): Promise<void> {
    if (!isCapabilityEnabled(capability, available)) {
      setError("This action is not available for the current lesson context.");
      return;
    }

    const submitKey = buildTutorSubmitKey(capability, {
      lessonId,
      threadId,
      question,
      focus,
      attemptId: wrongAnswer?.attemptId,
      questionId: wrongAnswer?.questionId,
    });

    if (
      shouldBlockDuplicateSubmit({
        inFlight: inFlightRef.current,
        lastAcceptedKey: lastAcceptedKeyRef.current,
        nextKey: submitKey,
      })
    ) {
      setError("Please wait — your previous request is still processing.");
      return;
    }

    if (capability === "ask_question" && !question.trim()) {
      setError("Enter a question first.");
      return;
    }
    if (capability === "give_hint" && !focus.trim()) {
      setError("Enter a focus topic for the hint.");
      return;
    }

    inFlightRef.current = true;
    setError(null);
    setEphemeral(null);

    startTransition(async () => {
      try {
        let outcome: LearningTutorServerActionResult;

        switch (capability) {
          case "ask_question":
            outcome = await answerQuestionLearningTutorAction({
              lessonId,
              question: question.trim(),
              threadId,
            });
            break;
          case "explain_lesson":
            outcome = await explainLessonLearningTutorAction({ lessonId });
            break;
          case "summarize_lesson":
            outcome = await summarizeLessonLearningTutorAction({ lessonId });
            break;
          case "generate_practice":
            outcome = await generatePracticeLearningTutorAction({ lessonId });
            break;
          case "give_hint":
            outcome = await giveHintLearningTutorAction({
              lessonId,
              focus: focus.trim(),
              threadId,
            });
            break;
          case "explain_again":
            outcome = await explainAgainLearningTutorAction({
              lessonId,
              focus: focus.trim() || undefined,
              threadId,
            });
            break;
          case "explain_wrong_answer":
            if (!wrongAnswer) {
              setError(
                "Wrong-answer context is not available on this lesson path."
              );
              return;
            }
            outcome = await explainWrongAnswerLearningTutorAction({
              attemptId: wrongAnswer.attemptId,
              questionId: wrongAnswer.questionId,
            });
            break;
          default:
            setError("Unsupported tutor action.");
            return;
        }

        if (!outcome.ok) {
          setError(outcome.error.message);
          return;
        }

        // Accept once for this identical payload until inputs change
        // (guards double-submit races after inFlight clears).
        lastAcceptedKeyRef.current = submitKey;
        const text = resultText(outcome);
        if (!text) {
          setError("Tutor returned an empty response.");
          return;
        }

        if (capabilityPersistsToThread(capability)) {
          setQuestion("");
          if (capability === "give_hint") setFocus("");
          // Allow a later identical ask after history refresh / new typing.
          lastAcceptedKeyRef.current = null;
          router.refresh();
        } else {
          setEphemeral({ capability, text });
        }
      } catch {
        setError("Learning Tutor could not complete this request.");
      } finally {
        inFlightRef.current = false;
      }
    });
  }

  return (
    <div className="mt-6 space-y-6">
      {lessonTitle ? (
        <p className="text-sm text-white/50">Lesson: {lessonTitle}</p>
      ) : null}

      <p className="text-xs text-white/40" aria-live="polite">
        AI-generated help · not official course content · does not change grades
      </p>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100"
        >
          <p>{error}</p>
          <button
            type="button"
            className="watch-focus-ring mt-2 text-xs font-bold underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <section
        aria-label="Conversation history"
        className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      >
        <h2 className="text-sm font-bold text-white/70">Conversation</h2>
        {initialMessages.length === 0 ? (
          <p className="text-sm text-white/45">
            No messages yet. Ask a question or choose a tutor action below.
          </p>
        ) : (
          <ul className="space-y-3">
            {initialMessages.map((m) => (
              <li key={m.id} className="text-sm">
                <p className="text-[10px] uppercase tracking-wider text-white/35">
                  {m.role}
                  {m.kind ? ` · ${m.kind}` : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-white/80">
                  {m.content || "(empty)"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {ephemeral ? (
        <section
          aria-label="Latest tutor response"
          className="space-y-2 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4"
        >
          <h2 className="text-sm font-bold text-sky-100">
            Latest · {CAPABILITY_LABELS[ephemeral.capability]}
          </h2>
          <p className="whitespace-pre-wrap text-sm text-white/85">
            {ephemeral.text}
          </p>
          <p className="text-[11px] text-white/40">
            This response is not stored in thread history for this action type.
          </p>
        </section>
      ) : null}

      <section aria-label="Tutor actions" className="space-y-3">
        <h2 className="text-sm font-bold text-white/70">Actions</h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              "ask_question",
              "explain_lesson",
              "summarize_lesson",
              "generate_practice",
              "give_hint",
              "explain_again",
            ] as const
          ).map((id) => (
            <button
              key={id}
              type="button"
              disabled={pending}
              aria-pressed={activeCapability === id}
              onClick={() => setActiveCapability(id)}
              className={`watch-focus-ring rounded-full px-3 py-1.5 text-xs font-bold ${
                activeCapability === id
                  ? "bg-white text-black"
                  : "border border-white/20 bg-black/30 text-white/80"
              }`}
            >
              {CAPABILITY_LABELS[id]}
            </button>
          ))}
          <button
            type="button"
            disabled={pending || !wrongAnswer}
            aria-pressed={activeCapability === "explain_wrong_answer"}
            title={
              wrongAnswerDeferred
                ? wrongAnswerDeferred.reason
                : CAPABILITY_LABELS.explain_wrong_answer
            }
            onClick={() => {
              if (!wrongAnswer) return;
              setActiveCapability("explain_wrong_answer");
            }}
            className={`watch-focus-ring rounded-full px-3 py-1.5 text-xs font-bold ${
              !wrongAnswer
                ? "cursor-not-allowed border border-white/10 text-white/25"
                : activeCapability === "explain_wrong_answer"
                  ? "bg-white text-black"
                  : "border border-white/20 bg-black/30 text-white/80"
            }`}
          >
            {CAPABILITY_LABELS.explain_wrong_answer}
          </button>
        </div>

        {activeCapability === "ask_question" ? (
          <label className="block text-sm text-white/70">
            Question
            <textarea
              value={question}
              onChange={(e) => {
                lastAcceptedKeyRef.current = null;
                setQuestion(e.target.value);
              }}
              rows={4}
              disabled={pending}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
            />
          </label>
        ) : null}

        {activeCapability === "give_hint" ||
        activeCapability === "explain_again" ? (
          <label className="block text-sm text-white/70">
            {activeCapability === "give_hint"
              ? "Focus (required)"
              : "Focus (optional)"}
            <textarea
              value={focus}
              onChange={(e) => {
                lastAcceptedKeyRef.current = null;
                setFocus(e.target.value);
              }}
              rows={3}
              disabled={pending}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
            />
          </label>
        ) : null}

        {activeCapability === "explain_wrong_answer" && wrongAnswer ? (
          <p className="text-xs text-white/45">
            Uses your current attempt context (no answer key is shown).
          </p>
        ) : null}

        <button
          type="button"
          disabled={pending}
          onClick={() => void runCapability(activeCapability)}
          className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black disabled:opacity-50"
        >
          {pending ? "Working…" : "Run"}
        </button>
      </section>
    </div>
  );
}
