import { assessmentGradeStatusMessage } from "../../../lib/learning/assessmentObjectiveGrading";
import type { AssessmentGradeView } from "../../../lib/learning/assessmentObjectiveGrading";
import { gradeAssessmentAttemptAction } from "../../learning/assessmentGradingActions";

type Props = {
  activityId: string;
  attemptId: string;
  grade: AssessmentGradeView | null;
  canGrade: boolean;
};

export default function AssessmentGradePanel({
  activityId,
  attemptId,
  grade,
  canGrade,
}: Props) {
  const status = grade?.grading_status ?? "not_graded";
  const statusMessage = assessmentGradeStatusMessage(status);

  return (
    <section
      className="mt-6 rounded-2xl border border-white/15 bg-white/[0.03] p-4"
      aria-label="Assessment grading"
    >
      <h2 className="text-sm font-bold text-white/80">Assessment grading</h2>
      <p className="mt-2 text-sm text-white/55">{statusMessage}</p>

      {grade && grade.grading_status !== "not_graded" ? (
        <dl className="mt-4 grid gap-2 text-sm text-white/60 sm:grid-cols-2">
          <div>
            <dt className="text-white/35">Objective score</dt>
            <dd>
              {grade.objective_points_earned ?? "—"}
              {" / "}
              {grade.objective_points_possible ?? "—"}
              {grade.objective_percentage != null
                ? ` (${grade.objective_percentage}% objective-only)`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="text-white/35">Manual review</dt>
            <dd>
              {grade.has_pending_manual_review
                ? `${grade.pending_manual_points ?? 0} pts pending (not final)`
                : `${grade.manual_points_earned ?? 0} pts earned`}
            </dd>
          </div>
          <div>
            <dt className="text-white/35">Total</dt>
            <dd>
              {grade.is_final
                ? `${grade.total_points_earned ?? "—"} / ${grade.total_points_possible ?? "—"}`
                : `${grade.total_points_possible ?? "—"} possible (awaiting review)`}
            </dd>
          </div>
          <div>
            <dt className="text-white/35">Final result</dt>
            <dd>
              {grade.is_final
                ? `${grade.final_percentage != null ? `${grade.final_percentage}%` : "—"} · passed: ${
                    grade.passed == null ? "not set" : String(grade.passed)
                  }`
                : "Not final yet"}
            </dd>
          </div>
          <div>
            <dt className="text-white/35">Graded at</dt>
            <dd>{grade.graded_at ?? "—"}</dd>
          </div>
        </dl>
      ) : null}

      {grade?.has_pending_manual_review ? (
        <p className="mt-3 text-sm text-amber-100/90">
          Some answers are pending instructor review. Pass/fail is calculated
          only after all pending reviews are complete (when a passing score is
          configured).
        </p>
      ) : null}

      {grade && grade.question_results.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-white/55">
          {grade.question_results.map((q) => (
            <li key={q.question_id}>
              <span className="text-white/40">{q.question_type}</span>
              {": "}
              <span className="text-white/75">{q.result_state}</span>
              {q.points_earned != null
                ? ` · ${q.points_earned}/${q.points_possible}`
                : ` · ${q.points_possible} pts`}
              {q.learner_feedback ? (
                <span className="block text-white/45">
                  Feedback: {q.learner_feedback}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-xs text-white/40">
        Answer keys are never shown. Short-answer and fill-blank stay pending
        manual review until an instructor grades them.
      </p>

      {canGrade ? (
        <form action={gradeAssessmentAttemptAction} className="mt-4">
          <input type="hidden" name="activityId" value={activityId} />
          <input type="hidden" name="attemptId" value={attemptId} />
          <button
            type="submit"
            className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            Grade objective questions
          </button>
        </form>
      ) : null}
    </section>
  );
}
