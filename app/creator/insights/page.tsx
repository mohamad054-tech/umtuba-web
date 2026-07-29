import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES } from "../../lib/nav";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { getMyCreatorInsights } from "../../../lib/supabase/rewards";
import { formatRelativeTime } from "../../notifications/lib/formatRelativeTime";

export default async function CreatorInsightsPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.creatorInsights)}`
    );
  }

  const supabase = await createClient();
  const insights = await getMyCreatorInsights(supabase);

  return (
    <main className="min-h-screen bg-[#050510] text-white max-sm:pb-[var(--app-mobile-bottom-nav-offset,0px)]">
      <AppTopNav title="Creator Insights" subtitle="Creator" />
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            Creator
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Creator Insights
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Stored performance notes about your content. These are account
            insights records — not a live AI assistant session.
          </p>

          {insights.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-white/15 px-4 py-14 text-center">
              <p className="text-base font-black">No insights yet</p>
              <p className="mt-2 text-sm text-white/45">
                Keep posting — insights will land here and in your notification
                inbox.
              </p>
              <Link
                href={APP_ROUTES.discover}
                className="watch-focus-ring mt-5 inline-flex rounded-full border border-blue-400/30 bg-blue-500/15 px-4 py-2 text-xs font-bold text-blue-100 transition hover:bg-blue-500/25"
              >
                Go to Discover
              </Link>
            </div>
          ) : (
            <ul className="mt-6 space-y-2.5">
              {insights.map((insight) => (
                <li
                  key={insight.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-white/95">
                      {insight.title}
                    </p>
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-cyan-200/70">
                      {insight.category}
                    </span>
                  </div>
                  {insight.body ? (
                    <p className="mt-1 text-sm text-white/55">{insight.body}</p>
                  ) : null}
                  <p className="mt-2 text-[11px] text-white/35">
                    {insight.createdAt
                      ? formatRelativeTime(insight.createdAt)
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
