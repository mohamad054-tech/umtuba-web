import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { getOwnedOrMemberStore } from "../../../lib/store/sellerStore";
import { getLatestSellerApplication } from "../../../lib/store/sellerApplications";
import { applySellerAction } from "../../actions/storeSeller";

export const metadata = {
  title: "Apply to Sell | UMTUBA",
};

type ApplyPageProps = {
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function SellerApplyPage({ searchParams }: ApplyPageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerApply)}`
    );
  }

  const params = await Promise.resolve(searchParams ?? {});
  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (membership) {
    redirect(APP_ROUTES.sellerStore);
  }

  const application = await getLatestSellerApplication(supabase, user.id);
  if (application && application.status !== "rejected") {
    redirect(APP_ROUTES.seller);
  }

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <AppTopNav title="Apply to sell" subtitle="Seller application" />

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
          <h1 className="text-2xl font-black tracking-tight">
            {application?.status === "rejected"
              ? "Apply again"
              : "Tell us about your store"}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            An operator reviews every application. Once approved, your store
            is created and verified automatically — checkout is not available
            in this phase.
          </p>

          {params.error ? (
            <p role="alert" className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {params.error}
            </p>
          ) : null}

          {application?.status === "rejected" && application.review_note ? (
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
              Previous reviewer note: {application.review_note}
            </p>
          ) : null}

          <form action={applySellerAction} className="mt-6 space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Store name
              </span>
              <input
                name="storeName"
                required
                minLength={2}
                maxLength={80}
                defaultValue={application?.proposed_store_name ?? ""}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Slug
              </span>
              <input
                name="slug"
                placeholder="my-store"
                pattern="[a-z0-9][a-z0-9-]{1,62}[a-z0-9]"
                defaultValue={application?.proposed_store_slug ?? ""}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Description
              </span>
              <textarea
                name="description"
                rows={4}
                defaultValue={application?.proposed_description ?? ""}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  City
                </span>
                <input
                  name="city"
                  maxLength={80}
                  defaultValue={application?.city ?? ""}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Country
                </span>
                <input
                  name="countryCode"
                  placeholder="US"
                  maxLength={2}
                  defaultValue={application?.country_code ?? ""}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Public contact email
                </span>
                <input
                  name="publicContactEmail"
                  type="email"
                  maxLength={160}
                  defaultValue={application?.public_contact_email ?? ""}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Public contact phone
                </span>
                <input
                  name="publicContactPhone"
                  maxLength={40}
                  defaultValue={application?.public_contact_phone ?? ""}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Default currency
              </span>
              <input
                name="defaultCurrency"
                defaultValue={application?.default_currency ?? "USD"}
                maxLength={3}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
            <button
              type="submit"
              className="watch-focus-ring rounded-full bg-white px-5 py-3 text-sm font-black text-black"
            >
              Submit application
            </button>
          </form>
        </section>

        <Link
          href={APP_ROUTES.seller}
          className="mt-8 inline-block text-sm font-bold text-white/50 hover:text-white/80"
        >
          ← Back to seller
        </Link>
      </div>
    </main>
  );
}
