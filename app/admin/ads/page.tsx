import Link from "next/link";
import { adminQueueCounts } from "../../../lib/ads/adminQueries";
import { APP_ROUTES } from "../../lib/nav";
import AdminAdsShell from "./AdminAdsShell";
import { requireAdminAdsSession } from "./requireAdminAds";

export const metadata = {
  title: "Ads Admin | UMTUBA",
};

export default async function AdminAdsOverviewPage() {
  const { supabase } = await requireAdminAdsSession();
  const counts = await adminQueueCounts(supabase);

  return (
    <AdminAdsShell title="Ads admin">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-2xl font-black tracking-tight">
          Review queue overview
        </h2>
        <p className="mt-2 text-sm text-white/50">
          Internal console for advertiser, campaign, and creative moderation.
          Delivery remains disabled in V1.
        </p>
      </section>

      {!counts.ok ? (
        <p role="alert" className="mt-4 text-sm text-red-100">
          {counts.message}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: "Advertisers pending",
              value: counts.counts.advertisers_pending,
              href: `${APP_ROUTES.adminAdsAdvertisers}?status=pending_review`,
            },
            {
              label: "Campaigns pending",
              value: counts.counts.campaigns_pending,
              href: `${APP_ROUTES.adminAdsCampaigns}?status=pending_review`,
            },
            {
              label: "Creatives pending",
              value: counts.counts.creatives_pending,
              href: `${APP_ROUTES.adminAdsCreatives}?status=pending_review`,
            },
            {
              label: "Advertisers suspended",
              value: counts.counts.advertisers_suspended,
              href: `${APP_ROUTES.adminAdsAdvertisers}?status=suspended`,
            },
            {
              label: "Campaigns suspended",
              value: counts.counts.campaigns_suspended,
              href: `${APP_ROUTES.adminAdsCampaigns}?status=suspended`,
            },
          ].map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="watch-focus-ring rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:bg-white/5"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-black">{card.value}</p>
            </Link>
          ))}
        </div>
      )}
    </AdminAdsShell>
  );
}
