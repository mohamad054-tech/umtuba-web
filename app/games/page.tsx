import Link from "next/link";
import AppTopNav from "../components/AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../lib/nav";
import { resolveRequestLocale } from "../../lib/i18n/server";
import { buildLocalizedRouteMetadata } from "../../lib/site/localizedSeo";

export async function generateMetadata() {
  const { locale } = await resolveRequestLocale();
  return buildLocalizedRouteMetadata({
    key: "games",
    path: "/games",
    locale,
  });
}

/**
 * Public Games entry for Home section circles.
 * Does not implement gameplay — honest hub shell only (Games internals untouched).
 */
export default function GamesHubPage() {
  return (
    <main
      className={`relative min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <AppTopNav title="Games" subtitle="UMTUBA Games hub" sticky />
      <div className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-6 md:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            Games
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Not available yet
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/55">
            The Games route exists so Home shortcuts stay stable, but playable
            catalog and sessions are not part of the current Alpha 0.2 product.
            Nothing here can be played, purchased, or ranked yet.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={APP_ROUTES.home}
              className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
            >
              Back to Home
            </Link>
            <Link
              href={APP_ROUTES.live}
              className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80"
            >
              Open Live
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
