import { redirect } from "next/navigation";
import { createCampaignAction } from "../../../actions/ads";
import {
  AD_PLACEMENTS,
  CAMPAIGN_OBJECTIVES,
  SAFE_INTERESTS,
} from "../../../../lib/ads/constants";
import { resolvePrimaryAdvertiserAccount } from "../../../../lib/ads/queries";
import { APP_ROUTES } from "../../../lib/nav";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import AdvertiseShell from "../../AdvertiseShell";

export const metadata = {
  title: "New Campaign | UMTUBA Ads",
};

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function NewCampaignPage({ searchParams }: PageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseCampaignsNew)}`
    );
  }

  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const primary = await resolvePrimaryAdvertiserAccount(supabase, user.id);
  if (!primary.ok || !primary.account) {
    redirect(APP_ROUTES.advertiseApply);
  }

  return (
    <AdvertiseShell title="New campaign">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-2xl font-black tracking-tight">
          Create a campaign
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Budgets use integer minor units (e.g. 1000 = $10.00). Spend is not
          charged in V1 — figures are for planning only.
        </p>

        {params.error ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          >
            {params.error}
          </p>
        ) : null}

        <form action={createCampaignAction} className="mt-6 space-y-5">
          <input
            type="hidden"
            name="advertiserAccountId"
            value={primary.account.id}
          />

          <fieldset className="space-y-3">
            <legend className="text-sm font-black">1. Basics</legend>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Name
              </span>
              <input
                name="name"
                required
                minLength={2}
                maxLength={120}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Objective
              </span>
              <select
                name="objective"
                required
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                defaultValue="awareness"
              >
                {CAMPAIGN_OBJECTIVES.map((objective) => (
                  <option key={objective} value={objective}>
                    {objective.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-black">2. Budget & schedule</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Daily budget (minor)
                </span>
                <input
                  name="dailyBudgetMinor"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="1000"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Total budget (minor)
                </span>
                <input
                  name="totalBudgetMinor"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="10000"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Currency
                </span>
                <input
                  name="currencyCode"
                  defaultValue="USD"
                  maxLength={3}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Start
                </span>
                <input
                  name="startAt"
                  type="datetime-local"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  End
                </span>
                <input
                  name="endAt"
                  type="datetime-local"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-black">3. Targeting</legend>
            <p className="text-xs text-white/45">
              Ages 13+ only. No political, religious, health, or individual-user
              targeting. Use comma-separated lists.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Countries (include)
                </span>
                <input
                  name="countries"
                  placeholder="US, GB"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Countries (exclude)
                </span>
                <input
                  name="excludeCountries"
                  placeholder="XX"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Languages
                </span>
                <input
                  name="languages"
                  placeholder="en, ar"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Interests
                </span>
                <input
                  name="interests"
                  placeholder={SAFE_INTERESTS.slice(0, 4).join(", ")}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Age min
                </span>
                <input
                  name="ageMin"
                  type="number"
                  min={13}
                  max={65}
                  defaultValue={13}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Age max
                </span>
                <input
                  name="ageMax"
                  type="number"
                  min={13}
                  max={65}
                  defaultValue={65}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Placements (comma-separated)
              </span>
              <input
                name="placements"
                defaultValue={AD_PLACEMENTS.join(", ")}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
              <span className="text-[11px] text-white/35">
                Contracts only — not shown to users in V1.
              </span>
            </label>
          </fieldset>

          <button
            type="submit"
            className="watch-focus-ring w-full rounded-2xl bg-white py-4 font-black text-black"
          >
            Save draft campaign
          </button>
        </form>
      </section>
    </AdvertiseShell>
  );
}
