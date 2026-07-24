"use client";

import { reviewAssessmentAnswerAction } from "../../learning/assessmentManualReviewActions";
import type { ManualReviewQuestion } from "../../../lib/learning/assessmentManualReview";

type Props = {
  courseId: string;
  attemptId: string;
  question: ManualReviewQuestion;
};

export default function ManualReviewAnswerForm({
  courseId,
  attemptId,
  question,
}: Props) {
  const pending = question.result_state === "pending_manual_review";

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
        {question.question_type} · {question.result_state}
      </p>
      <h3 className="mt-1 text-base font-bold text-white/90">
        {question.prompt ?? "Question"}
      </h3>
      <p className="mt-1 text-sm text-white/50">
        Points possible: {question.points_possible}
      </p>

      <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white/70">
        <p className="text-white/40">Learner answer</p>
        <pre className="mt-1 whitespace-pre-wrap break-words font-sans">
          {question.learner_answer
            ? JSON.stringify(question.learner_answer, null, 2)
            : "(no answer)"}
        </pre>
      </div>

      {question.result_state === "manually_reviewed" ? (
        <p className="mt-3 text-sm text-emerald-200/90">
          Reviewed: {question.points_earned}/{question.points_possible}
          {question.learner_feedback
            ? ` · Feedback: ${question.learner_feedback}`
            : ""}
        </p>
      ) : null}

      <form action={reviewAssessmentAnswerAction} className="mt-4 space-y-3">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="attemptId" value={attemptId} />
        <input type="hidden" name="questionId" value={question.question_id} />
        <label className="block text-sm text-white/70">
          Points earned (0–{question.points_possible})
          <input
            name="pointsEarned"
            type="number"
            required
            min={0}
            max={question.points_possible}
            step="0.01"
            defaultValue={
              question.points_earned != null
                ? String(question.points_earned)
                : "0"
            }
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm text-white/70">
          Learner-visible feedback (optional)
          <textarea
            name="feedback"
            rows={3}
            maxLength={2000}
            defaultValue={question.learner_feedback ?? ""}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
        >
          {pending ? "Submit review" : "Update review"}
        </button>
      </form>
    </article>
  );
}
