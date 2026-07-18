import Link from "next/link";
import { Suspense } from "react";
import AppTopNav from "../components/AppTopNav";
import PostJourneyGlobeSection from "./PostJourneyGlobeSection";
import { postJourneyMetadata } from "../../lib/site/routeMetadata";
import { createClient } from "../../lib/supabase/server";
import { getPostJourney } from "../../lib/supabase/rewards";
import { APP_ROUTES, buildPostNotificationHref } from "../lib/nav";
import { countryCodeToFlag } from "../notifications/lib/notificationMeta";
import { formatInteractionCount } from "../lib/social/shareAndViews";

export const metadata = postJourneyMetadata;

function PostJourneyGlobeFallback() {
  return (
    <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0b18]">
      <div className="flex h-[620px] items-center justify-center text-sm text-white/50">
        Loading globe...
      </div>
    </div>
  );
}

type PostJourneyPageProps = {
  searchParams?: Promise<{ postId?: string }> | { postId?: string };
};

export default async function PostJourneyPage({
  searchParams,
}: PostJourneyPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const postIdRaw = params.postId;
  const postId = postIdRaw ? Number(postIdRaw) : NaN;
  const hasPost = Number.isInteger(postId) && postId > 0;

  const supabase = await createClient();
  const journey = hasPost ? await getPostJourney(supabase, postId) : null;

  const stats = [
    {
      label: "Countries reached",
      value: journey ? String(journey.countryCount) : "—",
      icon: "🌍",
    },
    {
      label: "Total views",
      value: journey ? formatInteractionCount(journey.views) : "—",
      icon: "▶",
    },
    {
      label: "Trending countries",
      value: journey
        ? String(journey.countries.filter((c) => c.isTrending).length)
        : "—",
      icon: "↗",
    },
    {
      label: "Tracked stops",
      value: journey ? String(journey.countries.length) : "—",
      icon: "◉",
    },
  ];

  return (
    <main className="min-h-screen bg-[#050510] text-white max-sm:pb-[var(--app-mobile-bottom-nav-offset,0px)]">
      <AppTopNav
        title="Post Journey"
        subtitle="Global reach"
        actions={
          hasPost ? (
            <Link
              href={buildPostNotificationHref({ postId })}
              className="watch-focus-ring rounded-full border border-white/15 bg-white px-3 py-1.5 text-xs font-black text-black transition hover:bg-white/90"
            >
              Open post
            </Link>
          ) : (
            <Link
              href={APP_ROUTES.discover}
              className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10"
            >
              Discover
            </Link>
          )
        }
      />

      <div className="mx-auto grid max-w-[1420px] grid-cols-1 gap-7 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0">
          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#17112f] via-[#0e1024] to-[#071d20] p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
                  UMTUBA Global Discovery
                </p>

                <h1 className="mt-3 text-4xl font-black sm:text-5xl">
                  Post Journey
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-7 text-white/60">
                  {hasPost && journey
                    ? `Live country reach for post #${postId} — approximate regions only, never exact coordinates.`
                    : "Open a journey notification or add ?postId= to see real country reach for a post."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {stat.icon} {stat.label}
                </p>
                <p className="mt-1 text-2xl font-black">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Suspense fallback={<PostJourneyGlobeFallback />}>
              <PostJourneyGlobeSection />
            </Suspense>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/70 p-5">
            <h2 className="text-lg font-black tracking-tight">
              Countries reached
            </h2>
            {!hasPost ? (
              <p className="mt-3 text-sm text-white/45">
                No post selected. Journey notifications deep-link here with{" "}
                <code className="text-cyan-200/80">?postId=</code>.
              </p>
            ) : !journey || journey.countries.length === 0 ? (
              <p className="mt-3 text-sm text-white/45">
                No country reach recorded yet. Qualified views with approximate
                country data will appear here.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {journey.countries.map((country) => (
                  <li
                    key={country.countryCode}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {countryCodeToFlag(country.countryCode) ?? ""}{" "}
                        {country.countryName}
                        {country.isTrending ? (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                            Trending
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/35">
                        {country.countryCode}
                      </p>
                    </div>
                    <span className="text-sm font-black text-cyan-100">
                      {formatInteractionCount(country.viewCount)} views
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="hidden space-y-4 lg:block">
          <div className="rounded-[28px] border border-white/10 bg-[#080816]/70 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              Privacy
            </p>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Journey tracking uses approximate country and city only. Exact
              coordinates are never stored or shown.
            </p>
          </div>
          <Link
            href={APP_ROUTES.creatorInsights}
            className="block rounded-[28px] border border-cyan-400/20 bg-cyan-500/10 p-5 transition hover:bg-cyan-500/15"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-200/70">
              AI Insights
            </p>
            <p className="mt-2 text-sm font-semibold text-white/90">
              Open your creator insights
            </p>
          </Link>
        </aside>
      </div>
    </main>
  );
}
