"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TranslationKey } from "../../../lib/i18n/messages/types";
import { APP_ROUTES, isNavActive } from "../../lib/nav";
import { LanguageSelector, useTranslation } from "../i18n";

const SIDE_ITEMS: Array<{ href: string; key: TranslationKey }> = [
  { href: APP_ROUTES.home, key: "nav.home" },
  { href: APP_ROUTES.worldDiscovery, key: "nav.world" },
  { href: APP_ROUTES.learning, key: "nav.learning" },
  { href: APP_ROUTES.quran, key: "nav.quran" },
  { href: APP_ROUTES.store, key: "nav.store" },
  { href: APP_ROUTES.games, key: "nav.games" },
  { href: APP_ROUTES.life, key: "nav.life" },
  { href: APP_ROUTES.live, key: "nav.live" },
  { href: APP_ROUTES.messages, key: "nav.messages" },
];

const LEGAL_LINKS: Array<{ href: string; key: TranslationKey }> = [
  { href: APP_ROUTES.privacy, key: "legal.footer.privacy" },
  { href: APP_ROUTES.terms, key: "legal.footer.terms" },
  { href: APP_ROUTES.communityGuidelines, key: "legal.footer.community" },
  { href: APP_ROUTES.support, key: "sections.support" },
  { href: APP_ROUTES.about, key: "sections.about" },
];

function itemActive(pathname: string, href: string): boolean {
  if (href === APP_ROUTES.home) return isNavActive(pathname, APP_ROUTES.home);
  if (href === APP_ROUTES.learning) {
    return (
      pathname === APP_ROUTES.learning ||
      (pathname.startsWith(`${APP_ROUTES.learning}/`) &&
        !pathname.startsWith(APP_ROUTES.quran))
    );
  }
  if (href === APP_ROUTES.quran) {
    return pathname === APP_ROUTES.quran || pathname.startsWith(`${APP_ROUTES.quran}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop menu on the line-start edge: right in Arabic, left in English. */
export default function DesktopSideNav() {
  const pathname = usePathname() || "/";
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("nav.side")}
      className="um-home-sky fixed inset-y-0 start-0 z-40 hidden w-[5.25rem] flex-col border-e border-[#f0a93b]/25 sm:flex"
    >
      <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1 py-3">
        {SIDE_ITEMS.map((item) => {
          const active = itemActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`watch-focus-ring flex min-h-11 items-center justify-center rounded-xl px-1 text-center text-[10px] font-bold leading-tight ${
                  active ? "bg-[#f0a93b]/15 text-[#f0a93b]" : "text-white/75 hover:bg-white/5 hover:text-white"
                }`}
              >
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/10 px-1 py-2">
        <LanguageSelector id="umtuba-language-shell" tone="dark" variant="compact" />
        <ul aria-label={t("sections.legalAria")} className="mt-2 space-y-1">
          {LEGAL_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block truncate text-center text-[10px] font-semibold text-white/55 hover:text-[#f0a93b]"
              >
                {t(link.key)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export function HomeLegalLinks({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("sections.legalAria")} className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {LEGAL_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-white/70 underline-offset-4 hover:text-[#f0a93b] hover:underline">
              {t(link.key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
