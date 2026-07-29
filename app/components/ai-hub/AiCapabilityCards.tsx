import type { AiHubCapabilityCard } from "../../../lib/ai/hub/types";

type Props = {
  capabilities: AiHubCapabilityCard[];
};

export default function AiCapabilityCards({ capabilities }: Props) {
  return (
    <section aria-labelledby="ai-capabilities-heading" className="mt-8">
      <h2
        id="ai-capabilities-heading"
        className="font-serif text-xl text-[#f3faf5]"
      >
        Capabilities
      </h2>
      <p className="mt-1 text-sm text-emerald-100/65">
        Catalog from the AI Capability Registry — display only.
      </p>
      <ul className="mt-4 grid gap-2">
        {capabilities.map((cap) => (
          <li
            key={cap.capabilityId}
            className="rounded-md border border-emerald-900/50 bg-[#101a16] px-3 py-2"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-emerald-50">
                {cap.title}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-emerald-300/70">
                {cap.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-emerald-100/45">
              {cap.capabilityId}
              {cap.promptVersion ? ` @ ${cap.promptVersion}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
