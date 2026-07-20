import { redirect } from "next/navigation";
import AppTopNav from "../../../components/AppTopNav";
import SellerAnalyticsClient from "../../../components/store/SellerAnalyticsClient";
import {
  APP_ROUTES,
  MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS,
} from "../../../lib/nav";
import {
  buildAnalyticsDateRange,
  getSellerAnalyticsBundle,
  resolveAnalyticsPeriod,
} from "../../../../lib/store/analyticsFinance";
import { canManageStoreSettings } from "../../../../lib/store/permissions";
import { getOwnedOrMemberStore } from "../../../../lib/store/sellerStore";
import { createClient, getServerUser } from "../../../../lib/supabase/server";

export const metadata = {
  title: "Analytics | UMTUBA Seller",
};

type PageProps = {
  searchParams?:
    | Promise<{ period?: string }>
    | { period?: string };
};

export default async function SellerStoreAnalyticsPage({
  searchParams,
}: PageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerAnalytics)}`
    );
  }

  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership) {
    redirect(APP_ROUTES.sellerStore);
  }
  if (!canManageStoreSettings(membership.role)) {
    redirect(APP_ROUTES.sellerStore);
  }

  const params = await Promise.resolve(searchParams ?? {});
  const periodKey = resolveAnalyticsPeriod(params.period);
  const range = buildAnalyticsDateRange(periodKey);
  const result = await getSellerAnalyticsBundle(
    supabase,
    membership.store.id,
    range
  );

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <AppTopNav title="Analytics" subtitle={membership.store.name} />
        <p className="mt-4 text-sm text-white/45">
          Reporting and accounting groundwork only — not tax advice, payouts, or
          gateway settlement.
        </p>
        <SellerAnalyticsClient
          bundle={result.ok ? result.bundle : null}
          periodKey={periodKey}
          unavailable={!result.ok && Boolean(result.unavailable)}
          errorMessage={!result.ok && !result.unavailable ? result.message : null}
        />
      </div>
    </main>
  );
}
