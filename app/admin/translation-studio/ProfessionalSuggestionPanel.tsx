/**
 * Compact professional quality display for Translation Studio suggestion cards.
 */

import { buildProfessionalSuggestionPanelViewModel } from "../../../lib/translationStudio/professionalQuality/professionalSuggestionPanelModel";
import type { SuggestionQualityMetadata } from "../../../lib/translationStudio/types";

export default function ProfessionalSuggestionPanel(props: {
  candidateText: string;
  locale: string;
  quality: SuggestionQualityMetadata;
  suggestionId?: string;
  valueId?: string;
  keyId?: string;
  returnTo?: string;
  applyAction?: (formData: FormData) => void | Promise<void>;
}) {
  const vm = buildProfessionalSuggestionPanelViewModel(props.quality);
  if (!vm) return null;

  const recColor =
    vm.recommendation === "PASS"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : vm.recommendation === "BLOCK"
        ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
        : "border-amber-400/30 bg-amber-500/10 text-amber-100";

  const stateLabel =
    vm.recommendation === "PASS"
      ? "PASS"
      : vm.recommendation === "BLOCK"
        ? "BLOCK"
        : "HUMAN REVIEW";

  return (
    <div
      className="mt-4 rounded-2xl border border-violet-400/25 bg-violet-500/5 p-3 text-sm"
      data-testid="professional-suggestion-panel"
      data-recommendation={vm.recommendation}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-bold text-violet-100">Professional quality</p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${recColor}`}
          data-testid="professional-recommendation"
        >
          {stateLabel}
        </span>
        {vm.humanReviewRequired ? (
          <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-100">
            Human review required
          </span>
        ) : null}
        {vm.placeholderIntegrityBlocking ? (
          <span
            className="rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-100"
            data-testid="placeholder-integrity-block"
          >
            Placeholder integrity blocked
          </span>
        ) : null}
        {vm.formattingIntegrityBlocking ? (
          <span
            className="rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-100"
            data-testid="formatting-integrity-block"
          >
            Formatting integrity blocked
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-white/45">Candidate · {props.locale}</p>
      <p className="mt-1 text-base text-white" dir="auto">
        {props.candidateText}
      </p>

      <p className="mt-3 text-xs text-white/60">
        Overall score{" "}
        <span className="font-black text-white" data-testid="professional-overall-score">
          {vm.overallScore ?? "—"}
        </span>
        {vm.providerId ? (
          <>
            {" "}
            · {vm.providerId}
            {vm.modelId ? ` / ${vm.modelId}` : ""}
          </>
        ) : null}
      </p>

      <div
        className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5"
        data-testid="professional-dimensions"
      >
        {vm.dimensions.map((d) => (
          <div
            key={d.id}
            data-dimension={d.id}
            data-blocking={d.blocking ? "1" : "0"}
            className={
              d.blocking
                ? "rounded-xl border border-rose-400/40 bg-rose-500/10 px-2 py-1.5 text-[10px]"
                : "rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 text-[10px]"
            }
          >
            <div className="text-white/45">
              {d.label}
              {d.integrityCritical ? " *" : ""}
            </div>
            <div className="font-black text-white">
              {d.score == null ? "—" : d.score}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-white/35">
        * placeholder_integrity and formatting_integrity are integrity-critical.
      </p>

      {vm.disqualifierCodes.length > 0 ? (
        <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-2 text-[11px] text-rose-50">
          <p className="font-bold">Disqualifiers / blockers</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {vm.disqualifierCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {vm.findings.length > 0 ? (
        <div className="mt-3 text-[11px] text-white/70">
          <p className="font-bold text-white/80">Findings (sanitized)</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {vm.findings.map((f) => (
              <li key={f.code + f.message}>
                [{f.severity}] {f.code}: {f.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {vm.suggestedRevision ? (
        <div className="mt-3 rounded-xl border border-sky-400/20 bg-sky-500/5 p-2 text-[11px]">
          <p className="font-bold text-sky-100">Suggested revision (not applied)</p>
          <p className="mt-1" dir="auto">
            {vm.suggestedRevision}
          </p>
        </div>
      ) : null}

      {props.applyAction &&
      props.suggestionId &&
      props.valueId &&
      props.keyId &&
      props.returnTo ? (
        <form action={props.applyAction} className="mt-3">
          <input type="hidden" name="suggestionId" value={props.suggestionId} />
          <input type="hidden" name="valueId" value={props.valueId} />
          <input type="hidden" name="keyId" value={props.keyId} />
          <input type="hidden" name="returnTo" value={props.returnTo} />
          <button
            type="submit"
            className="watch-focus-ring rounded-full bg-violet-400 px-4 py-2 text-xs font-black text-black"
            data-testid="apply-candidate-to-draft"
          >
            Apply candidate to draft
          </button>
        </form>
      ) : null}

      <p className="mt-3 text-[10px] text-white/45" data-testid="professional-safety-copy">
        {vm.safetyCopy}
      </p>
    </div>
  );
}
