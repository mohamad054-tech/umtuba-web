"use client";

import Link from "next/link";
import { useTranslation } from "../../components/i18n";
import type { TranslationKey } from "../../../lib/i18n/messages/types";
import { APP_ROUTES } from "../../lib/nav";

const SECTIONS: ReadonlyArray<{
  labelKey: TranslationKey;
  href: string;
  emoji: string;
}> = [
  { labelKey: "nav.learning", href: APP_ROUTES.learning, emoji: "📚" },
  { labelKey: "menu.store", href: APP_ROUTES.store, emoji: "🛍️" },
  { labelKey: "home.games", href: APP_ROUTES.games, emoji: "🎮" },
  { labelKey: "nav.live", href: APP_ROUTES.live, emoji: "🔴" },
  { labelKey: "nav.world", href: APP_ROUTES.worldDiscovery, emoji: "🌍" },
  { labelKey: "nav.search", href: APP_ROUTES.search, emoji: "🔎" },
  { labelKey: "nav.messages", href: APP_ROUTES.messages, emoji: "💬" },
  { labelKey: "menu.create", href: APP_ROUTES.create, emoji: "➕" },
];

export default function HomeSectionCircles() {
  const { t } = useTranslation();

  return (
    <nav aria-label={t("home.sectionsAria")} className="px-3 pb-1 pt-2 md:px-0">
      <ul className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map((section) => (
          <li key={section.href} className="shrink-0">
            <Link
              href={section.href}
              className="watch-focus-ring group flex w-[4.5rem] flex-col items-center gap-1.5"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-lg shadow-[0_0_20px_rgba(59,130,246,0.12)] transition group-hover:border-white/25 group-hover:bg-white/[0.1]">
                <span aria-hidden>{section.emoji}</span>
              </span>
              <span className="truncate text-[10px] font-bold tracking-wide text-white/55 group-hover:text-white/80">
                {t(section.labelKey)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
