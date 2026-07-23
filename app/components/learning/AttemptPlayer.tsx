"use client";

import { useEffect, useRef, useState, useEffectEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import {
  cancelLearningAttempt,
  getMyLearningAttemptView,
  isAttemptInputLocked,
  LEARNING_LEARNER_ROUTES,
  saveLearningAttemptAnswer,
  submitLearningAttempt,
  type LearningLearnerAttemptView,
} from "../../../lib/learning/learnerDelivery";
import AttemptQuestion from "./AttemptQuestion";
import AttemptStatusBanner from "./AttemptStatusBanner";

type AttemptPlayerProps = {
  initial: LearningLearnerAttemptView;
  activityName?: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export default function AttemptPlayer({
  initial,
  activityName,
}: AttemptPlayerProps) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>(
    () => Object.fromEntries(initial.answers.map((a) => [a.question_id, a.answer_payload]))
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(
    initial.remaining_seconds
  );
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const locked = isAttemptInputLocked(view.status, remaining);

  const refreshAttempt = useEffectEvent(async () => {
    const supabase = createClient();
    const result = await getMyLearningAttemptView(supabase, view.attempt_id);
    if (!result.ok) return;
    setView(result.data);
    setRemaining(result.data.remaining_seconds);
    setAnswers(
      Object.fromEntries(
        result.data.answers.map((a) => [a.question_id, a.answer_payload])
      )
    );
  });

  useEffect(() => {
    if (view.status !== "active" || remaining == null) return;
    if (remaining <= 0) {
      void refreshAttempt();
      return;
    }
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          void refreshAttempt();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [view.status, remaining, refreshAttempt]);

  useEffect(() => {
    const onFocus = () => {
      if (view.status === "active") void refreshAttempt();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [view.status, refreshAttempt]);

  useEffect(() => {
    const timersMap = timers.current;
    return () => {
      for (const t of timersMap.values()) clearTimeout(t);
      timersMap.clear();
    };
  }, []);

  function queueSave(questionId: string, payload: Record<string, unknown>) {
    setAnswers((prev) => ({ ...prev, [questionId]: payload }));
    if (locked) return;
    const existing = timers.current.get(questionId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      void persistAnswer(questionId, payload);
    }, 500);
    timers.current.set(questionId, t);
  }

  async function persistAnswer(
    questionId: string,
    payload: Record<string, unknown>
  ) {
    setSaveState("saving");
    setSaveError(null);
    const supabase = createClient();
    const result = await saveLearningAttemptAnswer(
      supabase,
      view.attempt_id,
      questionId,
      payload
    );
    if (!result.ok) {
      setSaveState("error");
      setSaveError(result.message);
      return;
    }
    setSaveState("saved");
  }

  async function onSubmit() {
    if (locked || busy) return;
    setBusy(true);
    setActionError(null);
    const supabase = createClient();
    const result = await submitLearningAttempt(supabase, view.attempt_id);
    setBusy(false);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    await refreshAttempt();
    router.refresh();
  }

  async function onCancel() {
    if (locked || busy) return;
    const confirmed = window.confirm(
      "Cancel this attempt? It will count toward your attempt limit."
    );
    if (!confirmed) return;
    setBusy(true);
    setActionError(null);
    const supabase = createClient();
    const result = await cancelLearningAttempt(supabase, view.attempt_id);
    setBusy(false);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    await refreshAttempt();
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-4">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          Attempt #{view.attempt_number}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          {activityName ?? "Activity attempt"}
        </h1>
        <div className="mt-4">
          <AttemptStatusBanner
            status={view.status}
            remainingSeconds={remaining}
          />
        </div>
        <p className="mt-3 text-xs text-white/40" aria-live="polite">
          {saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Saved"
              : saveState === "error"
                ? `Save error: ${saveError ?? "unknown"}`
                : "Answers autosave while you work."}
        </p>
      </section>

      <div className="space-y-3">
        {view.questions_snapshot.map((q) => (
          <AttemptQuestion
            key={q.question_id}
            question={q}
            value={answers[q.question_id]}
            disabled={locked || busy}
            onChange={(payload) => queueSave(q.question_id, payload)}
          />
        ))}
      </div>

      {actionError ? (
        <p role="alert" className="text-sm text-rose-300">
          {actionError}
        </p>
      ) : null}

      {view.status === "active" ? (
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={locked || busy}
            className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black disabled:opacity-40"
          >
            Submit attempt
          </button>
          <button
            type="button"
            onClick={() => void onCancel()}
            disabled={locked || busy}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80 disabled:opacity-40"
          >
            Cancel attempt
          </button>
          <a
            href={LEARNING_LEARNER_ROUTES.activity(view.activity_id)}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80"
          >
            Back to activity
          </a>
        </div>
      ) : (
        <div className="pt-2">
          <a
            href={LEARNING_LEARNER_ROUTES.activity(view.activity_id)}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80"
          >
            Back to activity
          </a>
        </div>
      )}
    </div>
  );
}
