"use client";

import type { AssessmentDeliveryQuestion } from "../../../lib/learning/assessmentDelivery";
import { asPlainString } from "../../../lib/learning/contentBlockRender";

type Props = {
  question: AssessmentDeliveryQuestion;
  index: number;
};

/**
 * Read-only learner view of one published question. No inputs, no answer
 * persistence, no correctness cues.
 */
export default function AssessmentQuestionPreview({ question, index }: Props) {
  const prompt = asPlainString(question.content.prompt);
  const options = Array.isArray(question.content.options)
    ? question.content.options
    : [];
  const blanks = Array.isArray(question.content.blanks)
    ? question.content.blanks
    : [];
  const unit = asPlainString(question.content.unit);

  return (
    <article
      className="rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-4"
      aria-labelledby={`aq-${question.question_id}-title`}
    >
      <h2
        id={`aq-${question.question_id}-title`}
        className="text-sm font-bold text-white/90"
      >
        Q{index + 1}. {prompt || "Question"}
      </h2>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
        {question.question_type}
        {question.points != null ? ` · ${question.points} pts` : ""}
      </p>

      {(question.question_type === "multiple_choice_single" ||
        question.question_type === "multiple_choice_multiple") && (
        <ul className="mt-3 list-none space-y-2" role="list">
          {options.map((opt) => {
            const row =
              opt !== null && typeof opt === "object"
                ? (opt as Record<string, unknown>)
                : {};
            const key = asPlainString(row.key);
            const text = asPlainString(row.text) || key;
            if (!key) return null;
            return (
              <li
                key={key}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80"
              >
                <span className="font-mono text-xs text-white/40">{key}</span>
                <span className="ml-2">{text}</span>
              </li>
            );
          })}
        </ul>
      )}

      {question.question_type === "true_false" ? (
        <p className="mt-3 text-sm text-white/60">True / False</p>
      ) : null}

      {question.question_type === "short_answer" ? (
        <p className="mt-3 text-sm text-white/60">Short answer</p>
      ) : null}

      {question.question_type === "fill_blank" ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/70">
          {blanks.map((blank) => {
            const row =
              blank !== null && typeof blank === "object"
                ? (blank as Record<string, unknown>)
                : {};
            const key = asPlainString(row.key);
            if (!key) return null;
            return <li key={key}>Blank: {key}</li>;
          })}
        </ul>
      ) : null}

      {question.question_type === "numeric" ? (
        <p className="mt-3 text-sm text-white/60">
          Numeric answer{unit ? ` (${unit})` : ""}
        </p>
      ) : null}
    </article>
  );
}
