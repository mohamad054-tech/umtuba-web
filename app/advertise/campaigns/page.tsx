import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_ROUTES, advertiseCampaignDetail } from "../../lib/nav";
import { listCampaigns } from "../../../lib/ads/campaigns";
import { resolvePrimaryAdvertiserAccount } from "../../../lib/ads/queries";
import { formatMinorUnits } from "../../../lib/store/money";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import AdvertiseShell from "../AdvertiseShell";

export const metadata = {
  title: "Campaigns | UMTUBA Ads",
};

export default async function AdvertiseCampaignsPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseCampaigns)}`
    );
  }

  const supabase = await createClient();
  const primary = await resolvePrimaryAdvertiserAccount(supabase, user.id);
  if (!primary.ok) {
    return (
      <AdvertiseShell title="Campaigns">
        <p role="alert" className="text-sm text-red-100">{primary.message}</p>
      </AdvertiseShell>
    );
  }
  if (!primary.account) {
    redirect(APP_ROUTES.advertiseApply);
  }

  const result = await listCampaigns(supabase, primary.account.id);

  return (
    <AdvertiseShell title="Campaigns">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Your campaigns</h2>
          <p className="mt-1 text-sm text-white/50">
            Draft, submit, pause, and archive. Delivery is off in V1.
          </p>
        </div>
        <Link
          href={APP_ROUTES.advertiseCampaignsNew}
          className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
        >
          New campaign
        </Link>
      </div>

      {!result.ok ? (
        <p role="alert" className="mt-4 text-sm text-red-100">
          {result.message}
        </p>
      ) : result.campaigns.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-white/45">
          No campaigns yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {result.campaigns.map((campaign) => (
            <li key={campaign.id}>
              <Link
                href={advertiseCampaignDetail(campaign.id)}
                className="watch-focus-ring block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:bg-white/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black">{campaign.name}</p>
                  <p className="text-xs uppercase tracking-wide text-white/45">
                    {campaign.status}
                  </p>
                </div>
                <p className="mt-1 text-xs text-white/50">
                  {campaign.objective}
                  {campaign.dailyBudgetMinor != null
                    ? ` · Daily ${formatMinorUnits(
                        campaign.dailyBudgetMinor,
                        campaign.currencyCode
                      )}`
                    : ""}
                  {campaign.totalBudgetMinor != null
                    ? ` · Total ${formatMinorUnits(
                        campaign.totalBudgetMinor,
                        campaign.currencyCode
                      )}`
                    : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdvertiseShell>
  );
}
