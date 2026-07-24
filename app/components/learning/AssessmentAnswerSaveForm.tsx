"use client";

import { useState, useTransition } from "react";
import AttemptQuestion from "./AttemptQuestion";
import type { AssessmentDeliveryQuestion } from "../../../lib/learning/assessmentDelivery";
import { saveAssessmentAnswerAction } from "../../learning/assessmentAnswerActions";

type Props = {
  activityId: string;
  attemptId: string;
  question: AssessmentDeliveryQuestion;
  index: number;
  initialAnswer?: Record<string, unknown>;
  disabled: boolean;
};

export default function AssessmentAnswerSaveForm({
  activityId,
  attemptId,
  question,
  index,
  initialAnswer,
  disabled,
}: Props) {
  const [value, setValue] = useState<Record<string, unknown> | undefined>(
    initialAnswer
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <AttemptQuestion
        question={{
          question_id: question.question_id,
          question_type: question.question_type,
          position: question.position,
          content: question.content,
          points: question.points,
        }}
        value={value}
        disabled={disabled || pending}
        onChange={setValue}
      />
      {!disabled ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending || !value}
            className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black disabled:opacity-50"
            onClick={() => {
              setMessage(null);
              startTransition(async () => {
                const formData = new FormData();
                formData.set("activityId", activityId);
                formData.set("attemptId", attemptId);
                formData.set("questionId", question.question_id);
                formData.set("questionType", question.question_type);
                formData.set("answerJson", JSON.stringify(value ?? {}));
                const result = await saveAssessmentAnswerAction(formData);
                if (result.ok) {
                  setIsError(false);
                  setMessage(`Saved (Q${index + 1}).`);
                } else {
                  setIsError(true);
                  setMessage(result.message);
                }
              });
            }}
          >
            {pending ? "Saving…" : "Save answer"}
          </button>
          {message ? (
            <p
              className={`text-sm ${isError ? "text-rose-300" : "text-emerald-300"}`}
              role="status"
            >
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
