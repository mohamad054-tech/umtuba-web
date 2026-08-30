import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../components/AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../lib/nav";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { getOwnedOrMemberStore } from "../../lib/store/sellerStore";
import { getLatestSellerApplication } from "../../lib/store/sellerApplications";

export const metadata = {
  title: "Seller | UMTUBA",
};

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  draft: {
    title: "Store setup in progress",
    body: "Your store setup draft is saved. Resume the wizard whenever you are ready, then submit for operator approval.",
  },
  pending: {
    title: "Store setup under review",
    body: "An operator is reviewing your store setup. This usually takes a short while — check back soon.",
  },
  rejected: {
    title: "Store setup not approved",
    body: "Your last store setup was not approved. You can revise the details and submit again.",
  },
  suspended: {
    title: "Seller account suspended",
    body: "Your seller account is currently suspended. Contact support for more information.",
  },
};

type SellerHubPageProps = {
  searchParams?:
 Promise<{ submitted?: string; applied?: string }>;
};

export default async function SellerHubPage({ searchParams }: SellerHubPageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.seller)}`);
  }

  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const [membership, application] = await Promise.all([
    getOwnedOrMemberStore(supabase, user.id),
    getLatestSellerApplication(supabase, user.id),
  ]);

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <AppTopNav title="Seller" subtitle="UMTUBA Marketplace" />

        {params.submitted === "1" || params.applied === "1" ? (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          >
            Store setup submitted for operator review.
          </p>
        ) : null}

        {membership ? (
          <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
              @{membership.store.slug}
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              {membership.store.name}
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Role: {membership.role} · Verification:{" "}
              {membership.store.verification_status}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={APP_ROUTES.sellerStore}
                className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
              >
                Store dashboard
              </Link>
              <Link
                href={APP_ROUTES.sellerProducts}
                className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80"
              >
                Manage products
              </Link>
              <Link
                href={APP_ROUTES.sellerOrders}
                className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80"
              >
                Orders
              </Link>
              <Link
                href={`/store/${membership.store.slug}`}
                className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80"
              >
                View public store
              </Link>
            </div>
          </section>
        ) : application && STATUS_COPY[application.status] ? (
          <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
              @{application.proposed_store_slug}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">
              {STATUS_COPY[application.status].title}
            </h1>
            <p className="mt-2 text-sm text-white/50">
              {STATUS_COPY[application.status].body}
            </p>
            {application.review_note ? (
              <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
                Reviewer note: {application.review_note}
              </p>
            ) : null}
            {application.status === "draft" ? (
              <Link
                href={APP_ROUTES.sellerSetup}
                className="watch-focus-ring mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
              >
                Resume store setup
              </Link>
            ) : null}
            {application.status === "rejected" ? (
              <Link
                href={APP_ROUTES.sellerSetup}
                className="watch-focus-ring mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
              >
                Revise store setup
              </Link>
            ) : null}
          </section>
        ) : (
          <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
              Sell on UMTUBA
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              Set up your store
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Complete the store setup wizard, save a draft anytime, then submit
              for operator approval. Catalog management unlocks after
              verification.
            </p>
            <Link
              href={APP_ROUTES.sellerSetup}
              className="watch-focus-ring mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
            >
              Start store setup
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
