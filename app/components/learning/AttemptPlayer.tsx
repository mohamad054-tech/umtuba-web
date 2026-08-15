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
import {
  getMyLearningAttemptResultView,
  type LearningLearnerAttemptResultView,
} from "../../../lib/learning/learnerResultDelivery";
import AttemptQuestion from "./AttemptQuestion";
import AttemptStatusBanner from "./AttemptStatusBanner";

type AttemptPlayerProps = {
  initial: LearningLearnerAttemptView;
  activityName?: string;
  initialResult?: LearningLearnerAttemptResultView | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_FAIL_MESSAGE =
  "Could not save your latest answers. Please try again.";

export default function AttemptPlayer({
  initial,
  activityName,
  initialResult = null,
}: AttemptPlayerProps) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [resultView, setResultView] =
    useState<LearningLearnerAttemptResultView | null>(initialResult);
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
  /** Latest unsaved payloads waiting on debounce timers. */
  const pendingPayloads = useRef<Map<string, Record<string, unknown>>>(
    new Map()
  );
  /** In-flight save promises keyed by question id. */
  const inFlightSaves = useRef<Map<string, Promise<boolean>>>(new Map());
  const terminalRef = useRef(false);

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
    if (result.data.status !== "active") {
      terminalRef.current = true;
    }
    if (result.data.status === "submitted") {
      const scored = await getMyLearningAttemptResultView(
        supabase,
        view.attempt_id
      );
      setResultView(scored.ok ? scored.data : null);
    } else {
      setResultView(null);
    }
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

  function clearPendingTimers() {
    for (const t of timers.current.values()) clearTimeout(t);
    timers.current.clear();
  }

  /** Cancel policy: drop pending autosave so nothing fires after a terminal action. */
  function discardPendingAutosave() {
    clearPendingTimers();
    pendingPayloads.current.clear();
  }

  async function persistAnswer(
    questionId: string,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    if (terminalRef.current) return false;
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
      setSaveError(SAVE_FAIL_MESSAGE);
      return false;
    }
    pendingPayloads.current.delete(questionId);
    setSaveState("saved");
    return true;
  }

  function trackPersist(
    questionId: string,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    const existing = inFlightSaves.current.get(questionId);
    const run = (async () => {
      if (existing) await existing;
      return persistAnswer(questionId, payload);
    })();
    inFlightSaves.current.set(questionId, run);
    void run.finally(() => {
      if (inFlightSaves.current.get(questionId) === run) {
        inFlightSaves.current.delete(questionId);
      }
    });
    return run;
  }

  /**
   * Clear debounce timers, wait for in-flight saves, then save any still-pending
   * payloads. Used before submit so the last edit is not lost.
   */
  async function flushPendingAnswers(): Promise<boolean> {
    clearPendingTimers();

    const inFlight = [...inFlightSaves.current.values()];
    for (const p of inFlight) {
      const ok = await p;
      if (!ok) return false;
    }

    const pending = [...pendingPayloads.current.entries()];
    for (const [questionId, payload] of pending) {
      const ok = await trackPersist(questionId, payload);
      if (!ok) return false;
    }

    return pendingPayloads.current.size === 0;
  }

  function queueSave(questionId: string, payload: Record<string, unknown>) {
    setAnswers((prev) => ({ ...prev, [questionId]: payload }));
    if (locked || busy || terminalRef.current) return;
    pendingPayloads.current.set(questionId, payload);
    const existing = timers.current.get(questionId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      timers.current.delete(questionId);
      const latest = pendingPayloads.current.get(questionId);
      if (!latest || terminalRef.current) return;
      void trackPersist(questionId, latest);
    }, 500);
    timers.current.set(questionId, t);
  }

  async function onSubmit() {
    if (locked || busy || terminalRef.current) return;
    setBusy(true);
    setActionError(null);

    const flushed = await flushPendingAnswers();
    if (!flushed) {
      setBusy(false);
      setActionError(SAVE_FAIL_MESSAGE);
      setSaveState("error");
      setSaveError(SAVE_FAIL_MESSAGE);
      return;
    }

    const supabase = createClient();
    const result = await submitLearningAttempt(supabase, view.attempt_id);
    if (!result.ok) {
      setBusy(false);
      setActionError(result.message);
      return;
    }
    terminalRef.current = true;
    discardPendingAutosave();
    setBusy(false);
    await refreshAttempt();
    router.refresh();
  }

  async function onCancel() {
    if (locked || busy || terminalRef.current) return;
    const confirmed = window.confirm(
      "Cancel this attempt? It will count toward your attempt limit."
    );
    if (!confirmed) return;
    setBusy(true);
    setActionError(null);
    // Cancel discards pending autosave so no delayed save runs after terminal.
    discardPendingAutosave();
    terminalRef.current = true;

    const supabase = createClient();
    const result = await cancelLearningAttempt(supabase, view.attempt_id);
    setBusy(false);
    if (!result.ok) {
      // Allow retry if cancel RPC failed; keep terminal guard until refresh.
      terminalRef.current = false;
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
            resultView={resultView}
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
            className="watch-focus-ring inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black disabled:opacity-40"
          >
            Submit attempt
          </button>
          <button
            type="button"
            onClick={() => void onCancel()}
            disabled={locked || busy}
            className="watch-focus-ring inline-flex min-h-11 items-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80 disabled:opacity-40"
          >
            Cancel attempt
          </button>
          <a
            href={LEARNING_LEARNER_ROUTES.activity(view.activity_id)}
            className="watch-focus-ring inline-flex min-h-11 items-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80"
          >
            Back to activity
          </a>
        </div>
      ) : (
        <div className="pt-2">
          <a
            href={LEARNING_LEARNER_ROUTES.activity(view.activity_id)}
            className="watch-focus-ring inline-flex min-h-11 items-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80"
          >
            Back to activity
          </a>
        </div>
      )}
    </div>
  );
}
