import Link from "next/link";
import { APP_ROUTES } from "../../lib/nav";

const SECTIONS = [
  { label: "Learning", href: APP_ROUTES.learning, emoji: "📚" },
  { label: "Store", href: APP_ROUTES.store, emoji: "🛍️" },
  { label: "Games", href: APP_ROUTES.games, emoji: "🎮" },
  { label: "Live", href: APP_ROUTES.live, emoji: "🔴" },
  { label: "World", href: APP_ROUTES.worldDiscovery, emoji: "🌍" },
  { label: "Search", href: APP_ROUTES.search, emoji: "🔎" },
  { label: "Messages", href: APP_ROUTES.messages, emoji: "💬" },
  { label: "Create", href: APP_ROUTES.createVideo, emoji: "➕" },
] as const;

export default function HomeSectionCircles() {
  return (
    <nav
      aria-label="Section shortcuts"
      className="px-3 pb-1 pt-2 md:px-0"
    >
      <ul className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map((section) => (
          <li key={section.href} className="shrink-0">
            <Link
              href={section.href}
              prefetch={false}
              className="watch-focus-ring group flex w-[4.5rem] flex-col items-center gap-1.5"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-lg shadow-[0_0_20px_rgba(59,130,246,0.12)] transition group-hover:border-white/25 group-hover:bg-white/[0.1]">
                <span aria-hidden>{section.emoji}</span>
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
