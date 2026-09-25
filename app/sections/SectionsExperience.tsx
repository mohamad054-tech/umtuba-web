"use client";

import Link from "next/link";
import type { TranslationKey } from "../../lib/i18n/messages/types";
import AppTopNav from "../components/AppTopNav";
import { HomeLegalLinks } from "../components/chrome/DesktopSideNav";
import { LanguageSelector, useTranslation } from "../components/i18n";
import { APP_ROUTES } from "../lib/nav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../lib/nav/mobileNav";
import StoryRail from "../stories/components/StoryRail";

const TILES: Array<{ href: string; key: TranslationKey }> = [
  { href: APP_ROUTES.worldDiscovery, key: "nav.world" },
  { href: APP_ROUTES.learning, key: "nav.learning" },
  { href: APP_ROUTES.quran, key: "nav.quran" },
  { href: APP_ROUTES.store, key: "nav.store" },
  { href: APP_ROUTES.games, key: "nav.games" },
  { href: APP_ROUTES.life, key: "nav.life" },
  { href: APP_ROUTES.live, key: "nav.live" },
  { href: APP_ROUTES.rewards, key: "nav.rewards" },
];

export default function SectionsExperience({
  viewerId,
}: {
  viewerId: string | null;
}) {
  const { t } = useTranslation();

  return (
    <main className={`um-home-sky min-h-dvh text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}>
      <AppTopNav title={t("nav.sections")} />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-4">
        <h1 className="text-2xl font-black">{t("nav.sections")}</h1>
        <StoryRail viewerId={viewerId} />
        <ul className="grid grid-cols-2 gap-3">
          {TILES.map((tile) => (
            <li key={tile.href}>
              <Link
                href={tile.href}
                className="watch-focus-ring flex min-h-28 items-center justify-center rounded-3xl border border-[#f0a93b]/70 bg-black/20 px-3 text-center text-lg font-black text-[#f0a93b]"
              >
                {t(tile.key)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex justify-center">
          <LanguageSelector id="umtuba-language-sections" tone="dark" variant="compact" />
        </div>
        <HomeLegalLinks />
      </div>
    </main>
  );
}
