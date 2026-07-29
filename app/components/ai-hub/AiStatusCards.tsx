import type { AiHubRuntimeStatus } from "../../../lib/ai/hub/types";

type Props = {
  status: AiHubRuntimeStatus;
};

export default function AiStatusCards({ status }: Props) {
  const cards = [
    { label: "Hub", value: status.hubEnabled ? "Enabled" : "Disabled" },
    { label: "Core mode", value: status.coreMode },
    {
      label: "Assistant runtime",
      value: status.assistantRuntimeFlagHint,
    },
    {
      label: "OpenAI configured",
      value: status.openaiConfigured ? "Yes" : "No",
    },
    {
      label: "Stub eligible",
      value: status.stubEligible ? "Yes" : "No",
    },
  ];

  return (
    <section aria-labelledby="ai-status-heading" className="mt-8">
      <h2 id="ai-status-heading" className="font-serif text-xl text-[#f3faf5]">
        Runtime status
      </h2>
      <p className="mt-1 text-sm text-emerald-100/65">
        Sanitized Core status — providers and models are not exposed.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {cards.map((card) => (
          <li
            key={card.label}
            className="rounded-md border border-emerald-900/50 bg-[#101a16] px-3 py-3"
          >
            <p className="text-[11px] uppercase tracking-wide text-emerald-300/70">
              {card.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-50">
              {card.value}
            </p>
          </li>
        ))}
      </ul>
      {status.missingConfigKeys.length > 0 ? (
        <p className="mt-3 text-xs text-amber-200/80">
          Missing config keys: {status.missingConfigKeys.join(", ")}
        </p>
      ) : null}
    </section>
  );
}
