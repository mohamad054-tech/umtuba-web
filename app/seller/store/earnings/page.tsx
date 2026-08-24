import Link from "next/link";
import { redirect } from "next/navigation";
import "../../../components/store/storefront.css";
import AppTopNav from "../../../components/AppTopNav";
import {
  APP_ROUTES,
  MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS,
} from "../../../lib/nav";
import {
  COMMISSION_POLICY_ARCHITECTURE,
  DEFAULT_SELLER_PAYOUT_STATE,
  REAL_SELLER_PAYOUT,
  currentCommissionRateBps,
  deriveSellerPayoutState,
} from "../../../../lib/store/commerceReadiness";
import { getOwnedOrMemberStore } from "../../../../lib/store/sellerStore";
import { createClient, getServerUser } from "../../../../lib/supabase/server";

export const metadata = {
  title: "Earnings | UMTUBA Seller",
};

export default async function SellerEarningsPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerEarnings)}`
    );
  }

  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership) {
    redirect(APP_ROUTES.sellerSetup);
  }

  const payoutState = deriveSellerPayoutState();
  const rateBps = currentCommissionRateBps();

  return (
    <main
      className={`storefront-premium min-h-screen text-[var(--sf-ink)] ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <AppTopNav title="Earnings" subtitle={membership.store.name} />
        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            Payout state · {payoutState}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Earnings architecture
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/55">
            Seller payout is {REAL_SELLER_PAYOUT}. No balance, available payout,
            or settlement date is invented here. Default state is{" "}
            {DEFAULT_SELLER_PAYOUT_STATE}.
          </p>
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <dt className="text-white/40">Commission policy</dt>
              <dd className="mt-1 font-semibold">
                {COMMISSION_POLICY_ARCHITECTURE.status} v
                {COMMISSION_POLICY_ARCHITECTURE.version}
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <dt className="text-white/40">Commission rate</dt>
              <dd className="mt-1 font-semibold">
                {rateBps == null ? "Not configured" : `${rateBps} bps`}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-white/45">
            {COMMISSION_POLICY_ARCHITECTURE.notes}
          </p>
          <Link
            href={APP_ROUTES.sellerAnalytics}
            className="watch-focus-ring mt-6 inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/80"
          >
            View analytics
          </Link>
        </section>
      </div>
    </main>
  );
}
