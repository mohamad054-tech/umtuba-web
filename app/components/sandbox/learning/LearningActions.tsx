"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { AppLocale } from "../../../../lib/i18n";
import { getSandboxCourse } from "../../../../lib/sandbox/fixtures/courses";
import {
  filterSandboxCatalog,
  type CatalogKindFilter,
  type CatalogPriceFilter,
} from "../../../../lib/sandbox/learning/catalog";
import type { QuizQuestion } from "../../../../lib/sandbox/fixtures/types";
import type { LearningPaymentOutcome } from "../../../../lib/sandbox/learning/payments";
import { LEARNING_SANDBOX_STATE_COOKIE } from "../../../../lib/sandbox/learning/routes";
import {
  EMPTY_LEARNING_SANDBOX_STATE,
  certificateFor,
  parseLearningSandboxState,
  reduceLearningSandboxState,
  type LearningSandboxAction,
  type LearningSandboxState,
} from "../../../../lib/sandbox/learning/state";
import { sandboxTutorAnswer } from "../../../../lib/sandbox/learning/tutor";
import { sandboxT, type SandboxMessageKey } from "../../../../lib/sandbox/i18n";

const STORAGE_KEY = LEARNING_SANDBOX_STATE_COOKIE;

const listeners = new Set<() => void>();

function readStoredState(): LearningSandboxState {
  if (typeof window === "undefined") return EMPTY_LEARNING_SANDBOX_STATE;
  return parseLearningSandboxState(window.localStorage.getItem(STORAGE_KEY));
}

function persist(state: LearningSandboxState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLearningSandboxState(): {
  state: LearningSandboxState;
  dispatch: (action: LearningSandboxAction) => void;
  ready: boolean;
} {
  const state = useSyncExternalStore(subscribe, readStoredState, () => EMPTY_LEARNING_SANDBOX_STATE);

  return {
    state,
    ready: true,
    dispatch(action) {
      persist(reduceLearningSandboxState(readStoredState(), action));
    },
  };
}

function T({ locale, k }: { locale: AppLocale; k: SandboxMessageKey }) {
  return <>{sandboxT(locale, k)}</>;
}

export function EnrollButton({
  locale,
  studentId,
  courseSlug,
}: {
  locale: AppLocale;
  studentId: string;
  courseSlug: string;
}) {
  const { dispatch, ready } = useLearningSandboxState();
  return (
    <button
      type="button"
      disabled={!ready}
      className="sx-btn sx-btn-ok"
      onClick={() => dispatch({ type: "enroll", studentId, courseSlug })}
    >
      <T locale={locale} k="enrollSandbox" />
    </button>
  );
}

export function CompleteLessonButton({
  locale,
  studentId,
  courseSlug,
  lessonId,
}: {
  locale: AppLocale;
  studentId: string;
  courseSlug: string;
  lessonId: string;
}) {
  const { state, dispatch, ready } = useLearningSandboxState();
  const done = (state.completedLessons[`${studentId}::${courseSlug}`] ?? []).includes(lessonId);
  return (
    <button
      type="button"
      disabled={!ready || done}
      className="sx-btn sx-btn-ok"
      onClick={() => dispatch({ type: "completeLesson", studentId, courseSlug, lessonId })}
    >
      {done ? sandboxT(locale, "lessonComplete") : sandboxT(locale, "markLessonComplete")}
    </button>
  );
}

export function QuizForm({
  locale,
  studentId,
  courseSlug,
  lessonId,
  questions,
}: {
  locale: AppLocale;
  studentId: string;
  courseSlug: string;
  lessonId: string;
  questions: QuizQuestion[];
}) {
  const { state, dispatch, ready } = useLearningSandboxState();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const result = state.quizResults[`${studentId}::${courseSlug}::${lessonId}`];
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch({
          type: "submitQuiz",
          studentId,
          courseSlug,
          lessonId,
          choiceId: Object.values(answers)[0],
          answers,
        });
      }}
    >
      {questions.map((question) => (
        <fieldset key={question.id} className="sx-card sx-learning-panel">
          <legend className="font-semibold">{question.prompt}</legend>
          <div className="mt-3 space-y-2">
            {question.choices.map((choice) => (
              <label key={choice.id} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name={question.id}
                  value={choice.id}
                  checked={answers[question.id] === choice.id}
                  onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: choice.id }))}
                />
                <span>{choice.text}</span>
              </label>
            ))}
          </div>
          {result ? (
            <p className="mt-3 text-xs text-[var(--sx-muted)]">{question.explanation}</p>
          ) : null}
        </fieldset>
      ))}
      <button type="submit" disabled={!ready} className="sx-btn sx-btn-ok">
        {sandboxT(locale, "submitQuiz")}
      </button>
      {result ? (
        <p role="status" className="text-sm">
          {sandboxT(locale, "quizScore")}: {result.correct}/{result.total} ·{" "}
          {result.passed ? sandboxT(locale, "quizPassed") : sandboxT(locale, "quizFailed")}
        </p>
      ) : null}
      <p className="text-xs text-[var(--sx-faint)]">{sandboxT(locale, "noAccreditation")}</p>
    </form>
  );
}

export function ExerciseForm({
  locale,
  studentId,
  courseSlug,
  exerciseId,
  prompt,
}: {
  locale: AppLocale;
  studentId: string;
  courseSlug: string;
  exerciseId: string;
  prompt: string;
}) {
  const { state, dispatch, ready } = useLearningSandboxState();
  const existing = state.exerciseAnswers[`${studentId}::${courseSlug}::${exerciseId}`];
  const [answer, setAnswer] = useState(existing?.answer ?? "");
  return (
    <form
      className="sx-card sx-learning-panel"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch({ type: "submitExercise", studentId, courseSlug, exerciseId, answer });
      }}
    >
      <p className="text-sm text-[var(--sx-muted)]">{prompt}</p>
      <textarea
        className="sx-input mt-3"
        rows={5}
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        maxLength={400}
      />
      <button type="submit" disabled={!ready} className="sx-btn sx-btn-ok mt-3">
        {sandboxT(locale, "submitExercise")}
      </button>
      {existing?.answer ? (
        <p role="status" className="mt-2 text-sm">
          {sandboxT(locale, "exerciseSaved")}
        </p>
      ) : null}
    </form>
  );
}

export function AssessmentForm({
  locale,
  studentId,
  courseSlug,
  questions,
}: {
  locale: AppLocale;
  studentId: string;
  courseSlug: string;
  questions: QuizQuestion[];
}) {
  const { state, dispatch, ready } = useLearningSandboxState();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const result = state.assessments[`${studentId}::${courseSlug}`];
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch({ type: "submitAssessment", studentId, courseSlug, answers });
      }}
    >
      {questions.map((question) => (
        <fieldset key={question.id} className="sx-card">
          <legend className="font-semibold">{question.prompt}</legend>
          <div className="mt-2 space-y-2">
            {question.choices.map((choice) => (
              <label key={choice.id} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name={question.id}
                  value={choice.id}
                  checked={answers[question.id] === choice.id}
                  onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: choice.id }))}
                />
                <span>{choice.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <button type="submit" disabled={!ready} className="sx-btn sx-btn-ok">
        {sandboxT(locale, "submitAssessment")}
      </button>
      {result ? (
        <p role="status" className="text-sm">
          {result.correct}/{result.total} · {result.passed ? sandboxT(locale, "assessmentPassed") : sandboxT(locale, "assessmentFailed")}
          {result.attempts ? ` · attempts=${result.attempts}` : ""}
        </p>
      ) : null}
      <p className="text-xs text-[var(--sx-faint)]">
        {sandboxT(locale, "passThreshold")} · {sandboxT(locale, "retryAllowed")}
      </p>
    </form>
  );
}

export function MockPayButtons({
  locale,
  studentId,
  courseSlug,
}: {
  locale: AppLocale;
  studentId: string;
  courseSlug: string;
}) {
  const { state, dispatch, ready } = useLearningSandboxState();
  const payment = state.payments[`${studentId}::${courseSlug}`];
  function run(outcome: LearningPaymentOutcome) {
    dispatch({ type: "pay", studentId, courseSlug, outcome });
  }
  return (
    <div className="sx-card">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--sx-warn)]">
        PAYMENT_MODE=SANDBOX · REAL_PAYMENT=OFF · REAL_CHARGE_POSSIBLE=NO
      </p>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">{sandboxT(locale, "noCardFields")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={!ready} className="sx-btn sx-btn-ok" onClick={() => run("SUCCESS")}>
          {sandboxT(locale, "simulateSuccess")}
        </button>
        <button type="button" disabled={!ready} className="sx-btn sx-btn-danger" onClick={() => run("FAILURE")}>
          {sandboxT(locale, "simulateFailure")}
        </button>
        <button type="button" disabled={!ready} className="sx-btn" onClick={() => run("PENDING")}>
          {sandboxT(locale, "simulatePending")}
        </button>
        <button type="button" disabled={!ready} className="sx-btn" onClick={() => run("REFUND")}>
          {sandboxT(locale, "simulateRefund")}
        </button>
      </div>
      {payment ? (
        <p role="status" className="mt-3 text-sm">
          {payment.outcome} · {payment.status} · realPayment=NO
        </p>
      ) : null}
    </div>
  );
}

export function TutorForm({
  locale,
  courseSlug,
  lessonId,
}: {
  locale: AppLocale;
  courseSlug: string;
  lessonId: string;
}) {
  const course = getSandboxCourse(courseSlug);
  const lesson = course?.modules.flatMap((module) => module.lessons).find((row) => row.id === lessonId);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  if (!course || !lesson) return null;
  return (
    <form
      className="sx-card"
      onSubmit={(event) => {
        event.preventDefault();
        const result = sandboxTutorAnswer(course, lesson, prompt);
        setAnswer(result.answer);
      }}
    >
      <label className="text-sm" htmlFor="sandbox-tutor-prompt">
        {sandboxT(locale, "askTutor")}
      </label>
      <textarea
        id="sandbox-tutor-prompt"
        className="sx-input mt-2"
        rows={3}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
      />
      <button type="submit" className="sx-btn sx-btn-ok mt-3">
        {sandboxT(locale, "askTutor")}
      </button>
      {answer ? (
        <p role="status" className="mt-3 text-sm">
          {answer}
        </p>
      ) : null}
    </form>
  );
}

export function CertificateStatus({
  locale,
  studentId,
  courseSlug,
}: {
  locale: AppLocale;
  studentId: string;
  courseSlug: string;
}) {
  const { state } = useLearningSandboxState();
  const decision = certificateFor(state, studentId, courseSlug);
  const course = getSandboxCourse(courseSlug);
  if (!decision || !course) return <p>{sandboxT(locale, "unknownCourse")}</p>;
  const preview = {
    issuer: "UMTUBA" as const,
    studentName: studentId.replace("demo-student-", "Demo Student "),
    courseTitle: course.title,
    completionDate: decision.canIssue ? "2026-08-18" : "—",
    certificateId: `SANDBOX-${courseSlug}-${studentId}`,
    marking: "SANDBOX / DEMO",
    statement:
      course.certificatePolicy?.statement ??
      "This certificate confirms completion of an UMTUBA Originals course. It is issued by UMTUBA and represents UMTUBA only. It is not a university degree, government license, or accredited professional credential.",
  };
  return (
    <article className="sx-card mt-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--sx-warn)]">{preview.marking}</p>
      <h3 className="mt-3 text-xl font-semibold">{preview.courseTitle}</h3>
      <p className="mt-2 text-sm">{preview.studentName}</p>
      <p className="mt-1 text-sm">
        {sandboxT(locale, "certificateIssuer")} · {preview.completionDate} · {preview.certificateId}
      </p>
      <p className="mt-3 text-sm">{preview.statement}</p>
      <p className="mt-3 text-xs">{sandboxT(locale, "certificateDemo")}</p>
      <p className="mt-2 text-sm">
        {decision.kind} · owner={decision.owner} · canIssue={decision.canIssue ? "YES" : "NO"}
      </p>
      <p className="mt-2 text-sm">{decision.reason}</p>
      <p className="mt-2 text-xs">{sandboxT(locale, "certificateRules")}</p>
    </article>
  );
}

export function LessonNotes({
  locale,
  studentId,
  courseSlug,
  lessonId,
}: {
  locale: AppLocale;
  studentId: string;
  courseSlug: string;
  lessonId: string;
}) {
  const { state, dispatch, ready } = useLearningSandboxState();
  const key = `${studentId}::${courseSlug}::${lessonId}`;
  const [note, setNote] = useState(state.notes[key] ?? "");
  return (
    <form
      className="sx-card mt-4"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch({ type: "saveNote", studentId, courseSlug, lessonId, note });
      }}
    >
      <label className="text-sm" htmlFor={`note-${lessonId}`}>
        {sandboxT(locale, "notes")}
      </label>
      <textarea
        id={`note-${lessonId}`}
        className="sx-input mt-2"
        rows={3}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <button type="submit" disabled={!ready} className="sx-btn mt-3">
        {sandboxT(locale, "saveNote")}
      </button>
      {state.notes[key] ? <p className="mt-2 text-xs">{sandboxT(locale, "noteSaved")}</p> : null}
    </form>
  );
}

export function BookmarkButton({
  locale,
  studentId,
  courseSlug,
  lessonId,
}: {
  locale: AppLocale;
  studentId: string;
  courseSlug: string;
  lessonId: string;
}) {
  const { state, dispatch, ready } = useLearningSandboxState();
  const key = `${studentId}::${courseSlug}::${lessonId}`;
  const on = Boolean(state.bookmarks[key]);
  return (
    <button
      type="button"
      disabled={!ready}
      className="sx-btn"
      onClick={() => dispatch({ type: "toggleBookmark", studentId, courseSlug, lessonId })}
    >
      {on ? sandboxT(locale, "bookmarked") : sandboxT(locale, "bookmark")}
    </button>
  );
}

export function DraftCreateForm({
  locale,
  instructorId,
}: {
  locale: AppLocale;
  instructorId: string;
}) {
  const { state, dispatch, ready } = useLearningSandboxState();
  const [title, setTitle] = useState("");
  const mine = useMemo(
    () => state.drafts.filter((draft) => draft.instructorId === instructorId),
    [instructorId, state.drafts]
  );
  return (
    <div className="space-y-4">
      <form
        className="sx-card"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch({ type: "createDraft", instructorId, title });
          setTitle("");
        }}
      >
        <label className="text-sm" htmlFor="draft-title">
          {sandboxT(locale, "courseCreation")}
        </label>
        <input
          id="draft-title"
          className="sx-input mt-2"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button type="submit" disabled={!ready} className="sx-btn sx-btn-ok mt-3">
          {sandboxT(locale, "createDraft")}
        </button>
      </form>
      {mine.map((draft) => (
        <article key={draft.id} className="sx-card">
          <h3 className="font-semibold">{draft.title}</h3>
          <p className="mt-1 text-sm">
            {draft.step} · publicCatalog=NO · payout=OFF
          </p>
          {draft.step !== "SANDBOX_ONLY" ? (
            <button
              type="button"
              className="sx-btn mt-3"
              onClick={() => dispatch({ type: "advanceDraft", draftId: draft.id })}
            >
              {sandboxT(locale, "advanceDraft")}
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function AdminActivateDenied({
  locale,
  partnerName,
}: {
  locale: AppLocale;
  partnerName: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className="sx-btn sx-btn-danger"
        onClick={() =>
          setMessage(
            `${partnerName}: PROSPECTIVE_CANNOT_BECOME_ACTIVE. ${sandboxT(locale, "prospectiveStay")}`
          )
        }
      >
        {sandboxT(locale, "tryActivate")}
      </button>
      {message ? (
        <p role="status" className="mt-2 text-sm text-[var(--sx-danger)]">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function CatalogSearch({ locale }: { locale: AppLocale }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<CatalogKindFilter>("ALL");
  const [price, setPrice] = useState<CatalogPriceFilter>("ALL");
  const results = filterSandboxCatalog({ q, kind, price });
  return (
    <div>
      <form className="sx-card" onSubmit={(event) => event.preventDefault()}>
        <label className="text-sm" htmlFor="sandbox-catalog-q">
          {sandboxT(locale, "searchFilter")}
        </label>
        <input
          id="sandbox-catalog-q"
          className="sx-input mt-2"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            className="sx-input"
            value={kind}
            onChange={(event) => setKind(event.target.value as CatalogKindFilter)}
          >
            <option value="ALL">ALL</option>
            <option value="UMTUBA_ORIGINAL">UMTUBA_ORIGINAL</option>
            <option value="PARTNER_COURSE">PARTNER_COURSE</option>
            <option value="EXTERNAL_COURSE">EXTERNAL_COURSE</option>
          </select>
          <select
            className="sx-input"
            value={price}
            onChange={(event) => setPrice(event.target.value as CatalogPriceFilter)}
          >
            <option value="ALL">ALL</option>
            <option value="FREE">FREE</option>
            <option value="PAID">PAID</option>
            <option value="EXTERNAL">EXTERNAL</option>
          </select>
        </div>
      </form>
      <p className="mt-3 text-sm text-[var(--sx-muted)]">
        {results.length} {sandboxT(locale, "catalog")}
      </p>
      <ul className="sx-grid sx-grid-3 mt-3">
        {results.map((course) => (
          <li key={course.id} className="sx-card">
            <a href={`/sandbox/business-preview/learning/courses/${course.slug}`} className="font-semibold">
              {course.title}
            </a>
            <p className="mt-1 text-xs">{course.kind}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
