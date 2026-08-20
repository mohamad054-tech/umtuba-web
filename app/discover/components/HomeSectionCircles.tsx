"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "../../components/i18n";
import type { TranslationKey } from "../../../lib/i18n/messages/types";
import { APP_ROUTES } from "../../lib/nav";

function UmLifeCircleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7 text-white/85" aria-hidden>
      <circle
        cx="24"
        cy="24"
        r="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="24" cy="24" r="5.5" fill="currentColor" opacity="0.35" />
      <circle cx="19.5" cy="22.5" r="2.1" fill="currentColor" />
      <circle cx="28.5" cy="22.5" r="2.1" fill="currentColor" />
      <path
        d="M16.5 31.5c1.5-3.8 4.8-5.6 7.5-5.6s6 1.8 7.5 5.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SECTIONS: ReadonlyArray<{
  labelKey: TranslationKey;
  href: string;
  emoji?: string;
  icon?: "life";
}> = [
  { labelKey: "nav.learning", href: APP_ROUTES.learning, emoji: "📚" },
  { labelKey: "menu.store", href: APP_ROUTES.store, emoji: "🛍️" },
  { labelKey: "home.games", href: APP_ROUTES.games, emoji: "🎮" },
  { labelKey: "nav.live", href: APP_ROUTES.live, emoji: "🔴" },
  { labelKey: "nav.life", href: APP_ROUTES.life, icon: "life" },
  { labelKey: "nav.world", href: APP_ROUTES.worldDiscovery, emoji: "🌍" },
  { labelKey: "nav.search", href: APP_ROUTES.search, emoji: "🔎" },
  { labelKey: "nav.messages", href: APP_ROUTES.messages, emoji: "💬" },
  { labelKey: "menu.create", href: APP_ROUTES.create, emoji: "➕" },
];

export default function HomeSectionCircles() {
  const { t } = useTranslation();
  const pathname = usePathname();

  return (
    <nav aria-label={t("home.sectionsAria")} className="px-3 pb-1 pt-2 md:px-0">
      <ul className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map((section) => {
          const active =
            section.href === APP_ROUTES.life
              ? pathname === APP_ROUTES.life ||
                pathname.startsWith(`${APP_ROUTES.life}/`)
              : pathname === section.href ||
                pathname.startsWith(`${section.href}/`);
          return (
            <li key={section.href} className="shrink-0">
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className="watch-focus-ring group flex w-[4.5rem] flex-col items-center gap-1.5"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full border bg-white/[0.06] text-lg shadow-[0_0_20px_rgba(59,130,246,0.12)] transition group-hover:border-white/25 group-hover:bg-white/[0.1] ${
                    active
                      ? "border-white/45 ring-2 ring-inset ring-white/50"
                      : "border-white/12"
                  }`}
                >
                  {section.icon === "life" ? (
                    <UmLifeCircleIcon />
                  ) : (
                    <span aria-hidden>{section.emoji}</span>
                  )}
                </span>
                <span className="truncate text-[10px] font-bold tracking-wide text-white/55 group-hover:text-white/80">
                  {t(section.labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
