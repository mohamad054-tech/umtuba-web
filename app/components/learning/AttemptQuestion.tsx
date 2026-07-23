"use client";

import { LEARNING_ATTEMPT_ANSWER_PAYLOAD_KEYS } from "../../../lib/learning/attemptsFoundation";
import type { LearningLearnerSnapshotQuestion } from "../../../lib/learning/learnerDelivery";
import { asPlainString } from "../../../lib/learning/contentBlockRender";

type AttemptQuestionProps = {
  question: LearningLearnerSnapshotQuestion;
  value: Record<string, unknown> | undefined;
  disabled: boolean;
  onChange: (payload: Record<string, unknown>) => void;
};

export default function AttemptQuestion({
  question,
  value,
  disabled,
  onChange,
}: AttemptQuestionProps) {
  const prompt = asPlainString(question.content.prompt);
  const options = Array.isArray(question.content.options)
    ? question.content.options
    : [];
  const blanks = Array.isArray(question.content.blanks)
    ? question.content.blanks
    : [];

  return (
    <fieldset
      disabled={disabled}
      className="rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-4"
    >
      <legend className="px-1 text-sm font-bold text-white/90">
        Q{question.position + 1}. {prompt || "Question"}
      </legend>

      {question.question_type === "multiple_choice_single" ? (
        <div className="mt-3 space-y-2" role="radiogroup" aria-label={prompt}>
          {options.map((opt) => {
            const row =
              opt !== null && typeof opt === "object"
                ? (opt as Record<string, unknown>)
                : {};
            const key = asPlainString(row.key);
            const text = asPlainString(row.text) || key;
            if (!key) return null;
            return (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-2 text-sm text-white/80"
              >
                <input
                  type="radio"
                  name={`q-${question.question_id}`}
                  value={key}
                  checked={value?.selected_key === key}
                  onChange={() =>
                    onChange({
                      [LEARNING_ATTEMPT_ANSWER_PAYLOAD_KEYS.multiple_choice_single[0]]:
                        key,
                    })
                  }
                  className="mt-1"
                />
                <span>{text}</span>
              </label>
            );
          })}
        </div>
      ) : null}

      {question.question_type === "multiple_choice_multiple" ? (
        <div className="mt-3 space-y-2">
          {options.map((opt) => {
            const row =
              opt !== null && typeof opt === "object"
                ? (opt as Record<string, unknown>)
                : {};
            const key = asPlainString(row.key);
            const text = asPlainString(row.text) || key;
            if (!key) return null;
            const selected = Array.isArray(value?.selected_keys)
              ? (value.selected_keys as string[])
              : [];
            const checked = selected.includes(key);
            return (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-2 text-sm text-white/80"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? selected.filter((k) => k !== key)
                      : [...selected, key];
                    onChange({ selected_keys: next });
                  }}
                  className="mt-1"
                />
                <span>{text}</span>
              </label>
            );
          })}
        </div>
      ) : null}

      {question.question_type === "true_false" ? (
        <div className="mt-3 flex gap-4" role="radiogroup" aria-label={prompt}>
          {[true, false].map((boolVal) => (
            <label
              key={String(boolVal)}
              className="flex cursor-pointer items-center gap-2 text-sm text-white/80"
            >
              <input
                type="radio"
                name={`q-${question.question_id}`}
                checked={value?.value === boolVal}
                onChange={() => onChange({ value: boolVal })}
              />
              <span>{boolVal ? "True" : "False"}</span>
            </label>
          ))}
        </div>
      ) : null}

      {question.question_type === "short_answer" ? (
        <textarea
          className="mt-3 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          rows={3}
          maxLength={5000}
          value={asPlainString(value?.text)}
          onChange={(e) => onChange({ text: e.target.value })}
          aria-label={prompt || "Short answer"}
        />
      ) : null}

      {question.question_type === "numeric" ? (
        <input
          type="number"
          className="mt-3 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          value={
            typeof value?.value === "number" || typeof value?.value === "string"
              ? String(value.value)
              : ""
          }
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange({ value: null });
              return;
            }
            const n = Number(raw);
            onChange({ value: Number.isFinite(n) ? n : raw });
          }}
          aria-label={prompt || "Numeric answer"}
        />
      ) : null}

      {question.question_type === "fill_blank" ? (
        <div className="mt-3 space-y-2">
          {blanks.map((blank) => {
            const row =
              blank !== null && typeof blank === "object"
                ? (blank as Record<string, unknown>)
                : {};
            const key = asPlainString(row.key);
            if (!key) return null;
            const blanksMap =
              value?.blanks !== null &&
              typeof value?.blanks === "object" &&
              !Array.isArray(value?.blanks)
                ? (value.blanks as Record<string, string>)
                : {};
            return (
              <label key={key} className="block text-sm text-white/80">
                <span className="text-xs text-white/45">{key}</span>
                <input
                  type="text"
                  maxLength={1000}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                  value={blanksMap[key] ?? ""}
                  onChange={(e) =>
                    onChange({
                      blanks: { ...blanksMap, [key]: e.target.value },
                    })
                  }
                />
              </label>
            );
          })}
        </div>
      ) : null}
    </fieldset>
  );
}
