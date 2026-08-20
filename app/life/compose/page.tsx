import Link from "next/link";
import AppTopNav from "../../components/AppTopNav";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import { lifeComposeMetadata } from "../../../lib/site/routeMetadata";
import { APP_ROUTES } from "../../lib/nav";

export const metadata = lifeComposeMetadata;

/**
 * Phase 1 navigation shell only. Full UM Life composer is Phase 2.
 * Does not publish posts or upload media.
 */
export default async function LifeComposeShellPage() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);

  return (
    <main className="min-h-screen bg-[#050510] text-white max-sm:pb-[var(--app-mobile-bottom-nav-offset,0px)]">
      <AppTopNav title={t("life.title")} subtitle={t("life.composeShellTitle")} />
      <div className="mx-auto w-full min-w-0 max-w-[45rem] px-4 py-10 sm:px-6">
        <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-6 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            {t("life.composeComingSoon")}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {t("life.composeShellTitle")}
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/55">
            {t("life.composeShellBody")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={APP_ROUTES.life}
              className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
            >
              {t("life.backToFeed")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
