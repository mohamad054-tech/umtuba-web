import Link from "next/link";
import { redirect } from "next/navigation";
import {
  submitAdvertiserForReviewAction,
} from "../../actions/ads";
import { APP_ROUTES, advertiseCampaignDetail } from "../../lib/nav";
import { formatMinorUnits } from "../../../lib/store/money";
import { loadAdvertiserDashboard } from "../../../lib/ads/queries";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import AdvertiseShell from "../AdvertiseShell";

export const metadata = {
  title: "Advertise Dashboard | UMTUBA",
};

type PageProps = {
  searchParams?:
    | Promise<{ error?: string; created?: string; submitted?: string }>
    | { error?: string; created?: string; submitted?: string };
};

export default async function AdvertiseDashboardPage({
  searchParams,
}: PageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseDashboard)}`
    );
  }

  const params = await Promise.resolve(searchParams ?? {});
  const supabase = await createClient();
  const data = await loadAdvertiserDashboard(supabase, user.id);

  if (!data.ok) {
    return (
      <AdvertiseShell title="Dashboard">
        <p role="alert" className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {data.message}
        </p>
      </AdvertiseShell>
    );
  }

  if (!data.account) {
    return (
      <AdvertiseShell title="Dashboard">
        <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-6">
          <h2 className="text-2xl font-black">No advertiser account yet</h2>
          <p className="mt-2 text-sm text-white/50">
            Apply to create an advertiser account before drafting campaigns.
          </p>
          <Link
            href={APP_ROUTES.advertiseApply}
            className="watch-focus-ring mt-5 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            Apply to advertise
          </Link>
        </section>
      </AdvertiseShell>
    );
  }

  const { account, campaigns, metrics } = data;

  return (
    <AdvertiseShell title="Dashboard">
      {params.error ? (
        <p role="alert" className="mb-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {params.error}
        </p>
      ) : null}
      {params.created || params.submitted ? (
        <p className="mb-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {params.submitted
            ? "Account submitted for review."
            : "Advertiser account created."}
        </p>
      ) : null}

      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
              Advertiser
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              {account.businessName}
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Status: <span className="text-white/80">{account.status}</span> · Role:{" "}
              {account.myRole}
            </p>
          </div>
          {account.status === "draft" || account.status === "rejected" ? (
            <form action={submitAdvertiserForReviewAction}>
              <input type="hidden" name="accountId" value={account.id} />
              <button
                type="submit"
                className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
              >
                Submit for review
              </button>
            </form>
          ) : null}
        </div>
        {account.reviewNote ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
            Review note: {account.reviewNote}
          </p>
        ) : null}
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Impressions", value: String(metrics.impressions) },
          { label: "Clicks", value: String(metrics.clicks) },
          { label: "Reach", value: String(metrics.uniqueReach) },
          {
            label: "Spend",
            value: formatMinorUnits(metrics.spendMinor, "USD"),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
              {stat.label}
            </p>
            <p className="mt-1 text-xl font-black">{stat.value}</p>
          </div>
        ))}
      </section>
      <p className="mt-2 text-xs text-white/40">{metrics.note}</p>

      <section className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">Campaigns</h2>
          <Link
            href={APP_ROUTES.advertiseCampaignsNew}
            className="watch-focus-ring text-sm font-bold text-white/70 underline-offset-4 hover:underline"
          >
            New campaign
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/45">
            No campaigns yet. Create a draft to get started.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {campaigns.slice(0, 5).map((campaign) => (
              <li key={campaign.id}>
                <Link
                  href={advertiseCampaignDetail(campaign.id)}
                  className="watch-focus-ring flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:bg-white/5"
                >
                  <span>
                    <span className="block text-sm font-bold">{campaign.name}</span>
                    <span className="text-xs text-white/45">
                      {campaign.objective} · {campaign.status}
                    </span>
                  </span>
                  <span className="text-xs text-white/40">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdvertiseShell>
  );
}
