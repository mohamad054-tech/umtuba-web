import { redirect } from "next/navigation";
import {
  inviteOrAddAdvertiserMemberAction,
  updateAdvertiserAccountAction,
} from "../../actions/ads";
import { ADVERTISER_ROLES } from "../../../lib/ads/constants";
import { resolvePrimaryAdvertiserAccount } from "../../../lib/ads/queries";
import { canManageAccount } from "../../../lib/ads/permissions";
import { APP_ROUTES } from "../../lib/nav";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import AdvertiseShell from "../AdvertiseShell";

export const metadata = {
  title: "Advertise Settings | UMTUBA",
};

type PageProps = {
  searchParams?:
 Promise<{ error?: string; saved?: string; member?: string }>;
};

export default async function AdvertiseSettingsPage({
  searchParams,
}: PageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseSettings)}`
    );
  }

  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const primary = await resolvePrimaryAdvertiserAccount(supabase, user.id);
  if (!primary.ok || !primary.account) {
    redirect(APP_ROUTES.advertiseApply);
  }

  const account = primary.account;
  const canManage = canManageAccount(account.myRole);

  return (
    <AdvertiseShell title="Settings">
      {params.error ? (
        <p role="alert" className="mb-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {params.error}
        </p>
      ) : null}
      {params.saved || params.member ? (
        <p className="mb-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {params.member ? "Member added." : "Settings saved."}
        </p>
      ) : null}

      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-2xl font-black tracking-tight">
          Advertiser profile
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Contact details stay inside the advertiser workspace. Status:{" "}
          <span className="text-white/80">{account.status}</span>
        </p>

        <form action={updateAdvertiserAccountAction} className="mt-6 space-y-4">
          <input type="hidden" name="accountId" value={account.id} />
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Business name
            </span>
            <input
              name="businessName"
              required
              defaultValue={account.businessName}
              disabled={!canManage}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40 disabled:opacity-50"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Legal name
            </span>
            <input
              name="legalName"
              defaultValue={account.legalName ?? ""}
              disabled={!canManage}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40 disabled:opacity-50"
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
                defaultValue={account.contactEmail}
                disabled={!canManage}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40 disabled:opacity-50"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Contact phone
              </span>
              <input
                name="contactPhone"
                defaultValue={account.contactPhone ?? ""}
                disabled={!canManage}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40 disabled:opacity-50"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Website
              </span>
              <input
                name="websiteUrl"
                defaultValue={account.websiteUrl ?? ""}
                disabled={!canManage}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40 disabled:opacity-50"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Country
              </span>
              <input
                name="countryCode"
                required
                maxLength={2}
                defaultValue={account.countryCode}
                disabled={!canManage}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40 disabled:opacity-50"
              />
            </label>
          </div>
          {canManage ? (
            <button
              type="submit"
              className="watch-focus-ring w-full rounded-2xl bg-white py-4 font-black text-black"
            >
              Save settings
            </button>
          ) : (
            <p className="text-sm text-white/45">
              Only owners and admins can edit account settings.
            </p>
          )}
        </form>
      </section>

      {canManage ? (
        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">Add team member</h2>
          <p className="mt-1 text-sm text-white/50">
            Provide an existing UMTUBA user id. Invite-by-email is not in V1.
          </p>
          <form
            action={inviteOrAddAdvertiserMemberAction}
            className="mt-4 space-y-3"
          >
            <input type="hidden" name="accountId" value={account.id} />
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                User id
              </span>
              <input
                name="memberUserId"
                required
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Role
              </span>
              <select
                name="role"
                defaultValue="viewer"
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              >
                {ADVERTISER_ROLES.filter((role) => role !== "owner").map(
                  (role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  )
                )}
              </select>
            </label>
            <button
              type="submit"
              className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold"
            >
              Add member
            </button>
          </form>
        </section>
      ) : null}
    </AdvertiseShell>
  );
}
