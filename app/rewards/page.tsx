import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AppTopNav from "../components/AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../lib/nav";
import { rewardsMetadata } from "../../lib/site/routeMetadata";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  claimVerifiedWelcomeBonus,
  getMyUmPointsSummary,
} from "../../lib/supabase/rewards";
import { getMyReferralStats } from "../../lib/supabase/referral";
import { nextUmPointsMilestone } from "../../lib/rewards/umPointsConfig";
import { historyLabelForReason } from "../../lib/rewards/engine";
import { resolveRequestLocale } from "../../lib/i18n/server";
import { translateRewards } from "../../lib/i18n/messages/rewardsCatalogs";
import { formatRelativeTime } from "../notifications/lib/formatRelativeTime";
import InviteShareCard from "./components/InviteShareCard";
import RewardsLoadError from "./components/RewardsLoadError";

export const metadata = rewardsMetadata;

export default async function RewardsPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.rewards)}`);
  }

  const { locale } = await resolveRequestLocale();
  const t = (key: Parameters<typeof translateRewards>[1], values?: Record<string, string | number>) =>
    translateRewards(locale, key, values);

  const supabase = await createClient();
  await claimVerifiedWelcomeBonus(supabase);
  await supabase.rpc("claim_daily_engagement");
  const summary = await getMyUmPointsSummary(supabase);

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") || "https";
  const origin = host ? `${proto}://${host}` : null;
  const referral = await getMyReferralStats(supabase, origin);

  if (!summary) {
    return (
      <main
        className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
      >
        <AppTopNav title={t("rewards.title")} subtitle={t("rewards.eyebrow")} />
        <div className="mx-auto flex max-w-3xl justify-center px-4 py-10 md:px-6">
          <RewardsLoadError />
        </div>
      </main>
    );
  }

  const balance = summary.balance;
  const earnedToday = summary.earnedToday;
  const dailyCap = summary.dailyCap;
  const nextMilestone =
    summary.nextMilestone ?? nextUmPointsMilestone(balance);
  const progress =
    nextMilestone != null
      ? Math.min(100, Math.round((balance / nextMilestone) * 100))
      : 100;

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <AppTopNav title={t("rewards.title")} subtitle={t("rewards.eyebrow")} />
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            {t("rewards.eyebrow")}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">
            {t("rewards.title")}
          </h1>
          <p className="mt-2 text-sm text-white/50">{t("rewards.intro")}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-violet-400/25 bg-violet-500/10 px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200/70">
                {t("rewards.balance")}
              </p>
              <p className="mt-1 text-3xl font-black text-violet-50">
                {balance.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                {t("rewards.earnedToday")}
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
                {t("rewards.nextMilestone")}
              </p>
              <p className="mt-1 text-2xl font-black">
                {nextMilestone != null
                  ? nextMilestone.toLocaleString()
                  : t("rewards.maxed")}
              </p>
            </div>
          </div>

          {nextMilestone != null ? (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-[11px] font-bold text-white/40">
                <span>{t("rewards.progress")}</span>
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

          {referral ? (
            <InviteShareCard
              stats={referral}
              labels={{
                title: t("rewards.invite.title"),
                body: t("rewards.invite.body", {
                  points: referral.pointsPerSignup,
                }),
                copy: t("rewards.invite.copy"),
                copied: t("rewards.invite.copied"),
                copyError: t("rewards.invite.copyError"),
                shareWhatsApp: t("rewards.invite.shareWhatsApp"),
                code: t("rewards.invite.code"),
                successful: t("rewards.invite.successful"),
                pending: t("rewards.invite.pending"),
                points: t("rewards.invite.points"),
              }}
            />
          ) : null}

          <div className="mt-8">
            <h2 className="text-sm font-black tracking-tight">
              {t("rewards.recent")}
            </h2>
            {summary.ledger.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/45">
                {t("rewards.empty")}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {summary.ledger.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white/90">
                        {historyLabelForReason(item.reason)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/35">
                        {item.createdAt
                          ? formatRelativeTime(item.createdAt)
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-black text-violet-200">
                      {t("rewards.toast", { points: item.points })}
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
