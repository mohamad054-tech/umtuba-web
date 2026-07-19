import { redirect } from "next/navigation";
import { createAdvertiserAccountAction } from "../../actions/ads";
import { APP_ROUTES } from "../../lib/nav";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { listMyAdvertiserAccounts } from "../../../lib/ads/advertiserAccounts";
import AdvertiseShell from "../AdvertiseShell";

export const metadata = {
  title: "Apply to Advertise | UMTUBA",
};

type ApplyPageProps = {
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function AdvertiseApplyPage({
  searchParams,
}: ApplyPageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseApply)}`
    );
  }

  const params = await Promise.resolve(searchParams ?? {});
  const supabase = await createClient();
  const accounts = await listMyAdvertiserAccounts(supabase, user.id);
  if (accounts.ok && accounts.accounts.length > 0) {
    redirect(APP_ROUTES.advertiseDashboard);
  }

  return (
    <AdvertiseShell title="Apply" subtitle="Advertiser account" showNav={false}>
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
        <h1 className="text-2xl font-black tracking-tight">
          Create your advertiser account
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Submit business details for review. You can draft campaigns after
          creating the account; ads will not deliver until approvals and a later
          delivery release.
        </p>

        {params.error ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          >
            {params.error}
          </p>
        ) : null}

        <form action={createAdvertiserAccountAction} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Business name
            </span>
            <input
              name="businessName"
              required
              minLength={2}
              maxLength={120}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Legal name (optional)
            </span>
            <input
              name="legalName"
              maxLength={160}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Contact email
              </span>
              <input
                name="contactEmail"
                type="email"
                required
                maxLength={160}
                defaultValue={user.email ?? ""}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Contact phone (optional)
              </span>
              <input
                name="contactPhone"
                maxLength={40}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Website (optional)
              </span>
              <input
                name="websiteUrl"
                type="url"
                placeholder="https://"
                maxLength={500}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Country code
              </span>
              <input
                name="countryCode"
                required
                placeholder="US"
                maxLength={2}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
          </div>
          <button
            type="submit"
            className="watch-focus-ring w-full rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90"
          >
            Create account
          </button>
        </form>
      </section>
    </AdvertiseShell>
  );
}
