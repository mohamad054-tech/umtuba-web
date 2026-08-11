"use client";

import { useState } from "react";
import { submitAssessmentAttemptAction } from "../../learning/assessmentSubmissionActions";

type Props = {
  activityId: string;
  attemptId: string;
  answeredCount: number;
  questionCount: number;
};

/**
 * Final submission control with an explicit confirmation step.
 * After submit, the server action redirects to the attempt page in read-only mode.
 */
export default function AssessmentSubmitForm({
  activityId,
  attemptId,
  answeredCount,
  questionCount,
}: Props) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <form
      action={submitAssessmentAttemptAction}
      className="mt-6 rounded-2xl border border-white/15 bg-white/[0.03] p-4"
    >
      <input type="hidden" name="activityId" value={activityId} />
      <input type="hidden" name="attemptId" value={attemptId} />
      <input
        type="hidden"
        name="confirmSubmit"
        value={confirmed ? "1" : "0"}
      />

      <h2 className="text-sm font-bold text-white/80">Submit assessment</h2>
      <p className="mt-2 text-sm text-white/55">
        Saved answers: {answeredCount} / {questionCount}. Submitting locks this
        attempt permanently — you will not be able to change or delete answers,
        and you cannot cancel the attempt afterward.
      </p>

      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-white/80">
        <input
          type="checkbox"
          className="watch-focus-ring mt-1 h-4 w-4 accent-white"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          aria-describedby="submit-confirm-help"
        />
        <span id="submit-confirm-help">
          I understand that after submission my answers cannot be changed.
        </span>
      </label>

      <button
        type="submit"
        disabled={!confirmed}
        className="watch-focus-ring mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        Submit final answers
      </button>
    </form>
  );
}
