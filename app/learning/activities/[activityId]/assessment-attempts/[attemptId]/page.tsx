import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import AssessmentAnswerSaveForm from "../../../../../components/learning/AssessmentAnswerSaveForm";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import {
  LEARNING_ASSESSMENT_ATTEMPT_ROUTES,
  loadAssessmentAttempt,
} from "../../../../../../lib/learning/assessmentAttemptFoundation";
import { LEARNING_ASSESSMENT_DELIVERY_ROUTES } from "../../../../../../lib/learning/assessmentDelivery";
import {
  answersByQuestionId,
  loadAssessmentAnswers,
} from "../../../../../../lib/learning/assessmentAnswerPersistence";
import { loadAssessmentSubmission } from "../../../../../../lib/learning/assessmentSubmissionFoundation";
import { loadAssessmentGrade } from "../../../../../../lib/learning/assessmentObjectiveGrading";
import { loadAssessmentProgressStatus } from "../../../../../../lib/learning/assessmentProgressIntegration";
import { cancelAssessmentAttemptAction } from "../../../../assessmentAttemptActions";
import AssessmentSubmitForm from "../../../../../components/learning/AssessmentSubmitForm";
import AssessmentGradePanel from "../../../../../components/learning/AssessmentGradePanel";

export const dynamic = "force-dynamic";

type PageProps = {
  params:
    | Promise<{ activityId: string; attemptId: string }>
    | { activityId: string; attemptId: string };
  searchParams?:
    | Promise<{
        error?: string;
        submitted?: string;
        graded?: string;
        progress?: string;
      }>
    | {
        error?: string;
        submitted?: string;
        graded?: string;
        progress?: string;
      };
};

export async function generateMetadata({ params }: PageProps) {
  const { attemptId } = await Promise.resolve(params);
  void attemptId;
  return { title: `Assessment attempt · Learning | UMTUBA` };
}

export default async function AssessmentAttemptFoundationPage({
  params,
  searchParams,
}: PageProps) {
  const { activityId, attemptId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_ASSESSMENT_ATTEMPT_ROUTES.attempt(activityId, attemptId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadAssessmentAttempt(supabase, attemptId);
  if (!loaded.ok) {
    const lower = loaded.message.toLowerCase();
    if (lower.includes("not found") || lower.includes("unavailable")) {
      notFound();
    }
    return (
      <LearningShell
        title="Assessment attempt"
        subtitle="Session"
        layout="focus"
        backHref={LEARNING_ASSESSMENT_DELIVERY_ROUTES.assessment(activityId)}
        backLabel="Back to assessment"
      >
        <div
          className="mt-6 rounded-[28px] border border-rose-400/25 bg-rose-500/10 p-5 text-sm text-rose-100"
          role="alert"
        >
          {loaded.message}
        </div>
      </LearningShell>
    );
  }

  const view = loaded.data;
  if (view.activity_id !== activityId) {
    notFound();
  }

  const answersLoaded = await loadAssessmentAnswers(supabase, attemptId);
  const submissionLoaded = await loadAssessmentSubmission(supabase, attemptId);
  const savedByQuestion =
    answersLoaded.ok ? answersByQuestionId(answersLoaded.data) : {};
  const canAnswer = view.status === "active";
  const isSubmitted =
    view.status === "submitted" ||
    (submissionLoaded.ok && submissionLoaded.data.is_submitted);
  const submittedAt =
    (submissionLoaded.ok ? submissionLoaded.data.submitted_at : null) ??
    view.submitted_at;
  const gradeLoaded = isSubmitted
    ? await loadAssessmentGrade(supabase, attemptId)
    : null;
  const progressLoaded = isSubmitted
    ? await loadAssessmentProgressStatus(supabase, attemptId)
    : null;

  return (
    <LearningShell
      title="Assessment attempt"
      subtitle={`Attempt #${view.attempt_number}`}
      layout="focus"
      backHref={LEARNING_ASSESSMENT_DELIVERY_ROUTES.assessment(view.activity_id)}
      backLabel="Back to assessment"
    >
      <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          Submission foundation · no grading in this foundation
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          Status: {view.status}
        </h1>
        <dl className="mt-4 grid gap-2 text-sm text-white/60 sm:grid-cols-2">
          <div>
            <dt className="text-white/35">Started</dt>
            <dd>{view.started_at}</dd>
          </div>
          <div>
            <dt className="text-white/35">Submitted</dt>
            <dd>{submittedAt ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-white/35">Expires (metadata)</dt>
            <dd>{view.expires_at ?? "No time limit"}</dd>
          </div>
          <div>
            <dt className="text-white/35">Remaining seconds</dt>
            <dd>
              {view.remaining_seconds == null
                ? "—"
                : String(view.remaining_seconds)}
            </dd>
          </div>
          <div>
            <dt className="text-white/35">Saved answers</dt>
            <dd>
              {answersLoaded.ok
                ? String(answersLoaded.data.answer_count)
                : "—"}
              {" / "}
              {view.question_count}
            </dd>
          </div>
          <div>
            <dt className="text-white/35">Lifecycle</dt>
            <dd>
              {isSubmitted
                ? "Submitted (read-only)"
                : view.status === "active"
                  ? "Active"
                  : view.status}
            </dd>
          </div>
        </dl>

        {!answersLoaded.ok ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-50"
          >
            Could not restore saved answers: {answersLoaded.message}
          </p>
        ) : null}

        {query.submitted === "1" && isSubmitted ? (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50"
          >
            Submitted. Answers are locked and cannot be changed.
          </p>
        ) : null}

        {query.graded === "1" ? (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50"
          >
            Objective grading updated.
          </p>
        ) : null}

        {query.progress === "1" ? (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50"
          >
            Lesson completion recorded.
          </p>
        ) : null}

        {query.error ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          >
            {query.error}
          </p>
        ) : null}

        {view.status === "active" ? (
          <>
            <AssessmentSubmitForm
              activityId={view.activity_id}
              attemptId={view.attempt_id}
              answeredCount={
                answersLoaded.ok ? answersLoaded.data.answer_count : 0
              }
              questionCount={view.question_count}
            />
            <form action={cancelAssessmentAttemptAction} className="mt-4">
              <input type="hidden" name="activityId" value={view.activity_id} />
              <input type="hidden" name="attemptId" value={view.attempt_id} />
              <button
                type="submit"
                className="watch-focus-ring rounded-full border border-white/20 bg-transparent px-5 py-2.5 text-sm font-bold text-white"
              >
                Cancel attempt
              </button>
            </form>
          </>
        ) : (
          <p className="mt-4 text-sm text-white/50">
            This attempt is {view.status}. Answers are view-only
            {isSubmitted && submittedAt
              ? ` (submitted at ${submittedAt})`
              : ""}
            .
          </p>
        )}

        {isSubmitted ? (
          <AssessmentGradePanel
            activityId={view.activity_id}
            attemptId={view.attempt_id}
            grade={gradeLoaded?.ok ? gradeLoaded.data : null}
            canGrade={view.status === "submitted"}
            progress={progressLoaded?.ok ? progressLoaded.data : null}
          />
        ) : null}
      </section>

      <section className="mt-6 space-y-6" aria-label="Assessment answers">
        <h2 className="text-sm font-bold text-white/70">
          Questions {canAnswer ? "(save individually)" : "(locked)"}
        </h2>
        {view.questions.map((question, index) => (
          <AssessmentAnswerSaveForm
            key={question.question_id}
            activityId={view.activity_id}
            attemptId={view.attempt_id}
            question={question}
            index={index}
            initialAnswer={savedByQuestion[question.question_id]}
            disabled={!canAnswer}
          />
        ))}
      </section>

      <p className="mt-8 text-xs text-white/40">
        <Link
          href={LEARNING_ASSESSMENT_DELIVERY_ROUTES.assessment(view.activity_id)}
          className="underline underline-offset-2"
        >
          Assessment preview
        </Link>
        {" · "}
        <Link
          href={LEARNING_ASSESSMENT_ATTEMPT_ROUTES.activity(view.activity_id)}
          className="underline underline-offset-2"
        >
          Activity gate
        </Link>
      </p>
    </LearningShell>
  );
}
