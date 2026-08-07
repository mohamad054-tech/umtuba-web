import Link from "next/link";
import { HOME_SECTION_CIRCLE_ENTRIES } from "../../lib/nav/homePlatformEntryContract";

/** Decorative glyphs for the section strip (presentation only). */
const CIRCLE_GLYPHS: Record<string, string> = {
  learning: "📚",
  store: "🛍️",
  games: "🎮",
  live: "🔴",
  world: "🌍",
  search: "🔎",
  messages: "💬",
  create: "➕",
};

/**
 * Home secondary platform entry strip.
 * Hrefs come from homePlatformEntryContract (lockstep with HOME_CIRCLE_ENTRY_HREFS).
 * Does not duplicate AppTopNav; feed remains primary.
 */
export default function HomeSectionCircles() {
  return (
    <nav
      aria-label="Section shortcuts"
      className="px-3 pb-1 pt-2 md:px-0"
    >
      <ul className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {HOME_SECTION_CIRCLE_ENTRIES.map((section) => (
          <li key={section.href} className="shrink-0">
            <Link
              href={section.href}
              className="watch-focus-ring group flex w-[4.5rem] flex-col items-center gap-1.5"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-lg shadow-[0_0_20px_rgba(59,130,246,0.12)] transition group-hover:border-white/25 group-hover:bg-white/[0.1]">
                <span aria-hidden>
                  {CIRCLE_GLYPHS[section.id] ?? section.label.slice(0, 1)}
                </span>
              </span>
              <span className="truncate text-[10px] font-bold tracking-wide text-white/55 group-hover:text-white/80">
                {section.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
