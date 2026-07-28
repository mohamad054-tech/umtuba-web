"use client";

import { useActionState, useEffect, useState } from "react";
import {
  suggestProductDraftAction,
  type ProductDraftAssistantActionState,
} from "../../actions/aiProductDraft";

type Props = {
  productId: string;
  canEdit: boolean;
  currentTitle: string;
  currentDescription: string;
  onApply?: (suggestion: {
    title: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
  }) => void;
};

const initial: ProductDraftAssistantActionState = { ok: false };

export default function ProductDraftAssistantPanel({
  productId,
  canEdit,
  currentTitle,
  currentDescription,
}: Props) {
  const [state, action, pending] = useActionState(
    suggestProductDraftAction,
    initial
  );
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  useEffect(() => {
    setAppliedNotice(null);
  }, [state.suggestion?.runId]);

  function copyField(label: string, value: string) {
    void navigator.clipboard?.writeText(value);
    setAppliedNotice(`${label} copied — paste into the form to apply. Nothing was auto-saved.`);
  }

  return (
    <section
      className="mt-6 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5"
      aria-labelledby="ai-draft-assist-heading"
    >
      <h2
        id="ai-draft-assist-heading"
        className="sf-display text-xl font-semibold tracking-tight"
      >
        AI draft suggestions
      </h2>
      <p className="mt-2 text-sm text-[var(--sf-muted)]">
        Suggestions are AI-generated for review only. They never change price,
        inventory, or publish state, and they are never saved automatically.
      </p>

      {!canEdit ? (
        <p className="mt-3 text-sm text-[var(--sf-faint)]" role="status">
          Catalog edit permission required to request suggestions.
        </p>
      ) : (
        <form action={action} className="mt-4 space-y-3">
          <input type="hidden" name="productId" value={productId} />
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
              Optional notes for the assistant
            </span>
            <textarea
              name="sellerNotes"
              rows={3}
              maxLength={1000}
              placeholder={`Current title: ${currentTitle.slice(0, 80)}`}
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/20 px-3 py-2 text-sm text-[var(--sf-ink)]"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="watch-focus-ring rounded-full border border-[var(--sf-line)] bg-[var(--sf-accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            {pending ? "Generating…" : "Suggest improvements"}
          </button>
        </form>
      )}

      {state.message && !state.ok ? (
        <p role="alert" className="mt-3 text-sm text-[var(--sf-danger)]">
          {state.message}
        </p>
      ) : null}

      {state.ok && state.suggestion ? (
        <div className="mt-4 space-y-3" aria-live="polite">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/80">
            AI-generated · prompt {state.suggestion.promptVersion} ·{" "}
            {state.suggestion.modelId}
          </p>
          {(
            [
              ["Title", state.suggestion.title],
              ["Description", state.suggestion.description],
              ["SEO title", state.suggestion.seoTitle],
              ["SEO description", state.suggestion.seoDescription],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--sf-line)] bg-black/25 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                  {label}
                </p>
                <button
                  type="button"
                  className="text-xs font-semibold text-[var(--sf-accent-strong)] hover:underline"
                  onClick={() => copyField(label, value)}
                >
                  Copy to apply
                </button>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--sf-ink)]">
                {value}
              </p>
            </div>
          ))}
          <div className="rounded-2xl border border-[var(--sf-line)] bg-black/25 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
              Tags
            </p>
            <p className="mt-1 text-sm text-[var(--sf-ink)]">
              {state.suggestion.tags.join(", ") || "—"}
            </p>
          </div>
          <p className="text-xs text-[var(--sf-faint)]">
            Baseline description length: {currentDescription.length}. Run{" "}
            {state.suggestion.runId.slice(0, 8)}…
          </p>
        </div>
      ) : null}

      {appliedNotice ? (
        <p className="mt-3 text-sm text-[var(--sf-muted)]" role="status">
          {appliedNotice}
        </p>
      ) : null}
    </section>
  );
}
