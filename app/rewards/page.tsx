import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../components/AppTopNav";
import { APP_ROUTES } from "../lib/nav";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  claimVerifiedWelcomeBonus,
  getMyUmPointsSummary,
} from "../../lib/supabase/rewards";
import { nextUmPointsMilestone } from "../../lib/rewards/umPointsConfig";
import { formatRelativeTime } from "../notifications/lib/formatRelativeTime";

export default async function RewardsPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.rewards)}`);
  }

  const supabase = await createClient();
  await claimVerifiedWelcomeBonus(supabase);
  const summary = await getMyUmPointsSummary(supabase);

  const balance = summary?.balance ?? 0;
  const earnedToday = summary?.earnedToday ?? 0;
  const dailyCap = summary?.dailyCap ?? 200;
  const nextMilestone =
    summary?.nextMilestone ?? nextUmPointsMilestone(balance);
  const progress =
    nextMilestone != null
      ? Math.min(100, Math.round((balance / nextMilestone) * 100))
      : 100;

  return (
    <main className="min-h-screen bg-[#050510] text-white">
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <AppTopNav title="UM Points" subtitle="Rewards" />
        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            Rewards
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">UM Points</h1>
          <p className="mt-2 text-sm text-white/50">
            Earn points for meaningful actions — not unlimited likes or passive
            watch time.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-violet-400/25 bg-violet-500/10 px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200/70">
                Balance
              </p>
              <p className="mt-1 text-3xl font-black text-violet-50">
                {balance.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Earned today
              </p>
              <p className="mt-1 text-2xl font-black">
                {earnedToday.toLocaleString()}
                <span className="text-sm font-bold text-white/40">
                  {" "}
                  / {dailyCap}
                </span>
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Next milestone
              </p>
              <p className="mt-1 text-2xl font-black">
                {nextMilestone != null
                  ? nextMilestone.toLocaleString()
                  : "Maxed"}
              </p>
            </div>
          </div>

          {nextMilestone != null ? (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-[11px] font-bold text-white/40">
                <span>Milestone progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-8">
            <h2 className="text-sm font-black tracking-tight">Recent activity</h2>
            {(summary?.ledger.length ?? 0) === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/45">
                No UM Points yet. Publish, comment thoughtfully, or earn saves
                and shares.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {summary!.ledger.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white/90">
                        {item.reason}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/35">
                        {item.createdAt
                          ? formatRelativeTime(item.createdAt)
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-black text-violet-200">
                      +{item.points}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-white/35">
            <Link
              href={APP_ROUTES.settings + "?section=notifications"}
              className="font-bold text-blue-200 hover:text-blue-100"
            >
              Notification preferences
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
