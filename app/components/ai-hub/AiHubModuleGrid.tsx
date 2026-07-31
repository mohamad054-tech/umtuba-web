import Link from "next/link";
import type { AiHubNavItem } from "../../../lib/ai/hub/types";
import { AI_HUB_EXPERIENCE_ROUTES } from "../../../lib/ai/hub/experience";

type Props = {
  items: AiHubNavItem[];
};

export default function AiHubModuleGrid({ items }: Props) {
  return (
    <section aria-labelledby="ai-hub-modules-heading">
      <h2
        id="ai-hub-modules-heading"
        className="font-serif text-xl text-[#f3faf5]"
      >
        AI Home
      </h2>
      <p className="mt-1 text-sm text-emerald-100/65">
        Official entry map for every UMTUBA AI surface.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const href =
            item.moduleId === "assistant"
              ? AI_HUB_EXPERIENCE_ROUTES.assistant
              : `${AI_HUB_EXPERIENCE_ROUTES.home}#module-${item.moduleId}`;
          return (
            <li key={item.moduleId} id={`module-${item.moduleId}`}>
              <Link
                href={href}
                className="block rounded-lg border border-emerald-800/50 bg-[#101a16] px-4 py-3 transition hover:border-emerald-600/60"
              >
                <span className="block text-sm font-semibold text-emerald-100">
                  {item.label}
                </span>
                <span className="mt-1 block text-xs text-emerald-100/60">
                  {item.description}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
