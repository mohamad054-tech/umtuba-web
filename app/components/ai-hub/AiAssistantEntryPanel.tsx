import type { AiHubAssistantEntry } from "../../../lib/ai/hub/types";
import { AI_HUB_EXPERIENCE_ROUTES } from "../../../lib/ai/hub/experience";
import Link from "next/link";

type Props = {
  entry: AiHubAssistantEntry;
  /** When true, render as destination panel (assistant page). */
  asDestination?: boolean;
};

/**
 * Assistant Entry only — does not start or render a conversation.
 */
export default function AiAssistantEntryPanel({
  entry,
  asDestination = false,
}: Props) {
  return (
    <section
      aria-labelledby="ai-assistant-entry-heading"
      className="rounded-lg border border-emerald-700/40 bg-[#0f1c17] px-4 py-4"
    >
      <h2
        id="ai-assistant-entry-heading"
        className="font-serif text-xl text-[#f3faf5]"
      >
        {entry.label}
      </h2>
      <p className="mt-2 text-sm text-emerald-100/70">{entry.description}</p>
      <dl className="mt-4 grid gap-2 text-xs text-emerald-100/55 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-emerald-200/80">Chat</dt>
          <dd>{entry.chatEnabled ? "Enabled" : "Not enabled"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-emerald-200/80">Conversations</dt>
          <dd>
            {entry.conversationExecutionEnabled
              ? "Executable"
              : "Entry only — not executed"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-emerald-200/80">Skills</dt>
          <dd>
            {entry.skillExecutionEnabled ? "Executable" : "Not executed"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-emerald-200/80">Tools</dt>
          <dd>
            {entry.toolExecutionEnabled ? "Executable" : "Not executed"}
          </dd>
        </div>
      </dl>
      {!asDestination ? (
        <Link
          href={AI_HUB_EXPERIENCE_ROUTES.assistant}
          className="mt-4 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200"
        >
          Open Assistant entry →
        </Link>
      ) : (
        <p className="mt-4 text-sm text-emerald-200/75">
          Runtime capability reserved:{" "}
          <code className="text-emerald-100">{entry.runtimeCapabilityId}</code>
          . No conversation is started from this screen.
        </p>
      )}
    </section>
  );
}
