import Link from "next/link";
import { redirect } from "next/navigation";
import {
  archiveCampaignAction,
  pauseCampaignAction,
  saveCampaignTargetingAction,
  submitCampaignForReviewAction,
  submitCreativeForReviewAction,
  deleteDraftCreativeAction,
} from "../../../actions/ads";
import { AD_PLACEMENTS, SAFE_INTERESTS } from "../../../../lib/ads/constants";
import { loadCampaignWorkspace } from "../../../../lib/ads/queries";
import { formatMinorUnits } from "../../../../lib/store/money";
import {
  APP_ROUTES,
  advertiseCampaignDetail,
} from "../../../lib/nav";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import AdvertiseShell from "../../AdvertiseShell";

export const metadata = {
  title: "Campaign | UMTUBA Ads",
};

type PageProps = {
  params: Promise<{ campaignId: string }> | { campaignId: string };
  searchParams?:
    | Promise<{ error?: string; created?: string; submitted?: string; targeting?: string }>
    | { error?: string; created?: string; submitted?: string; targeting?: string };
};

export default async function CampaignDetailPage({
  params,
  searchParams,
}: PageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseCampaigns)}`
    );
  }

  const { campaignId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const supabase = await createClient();
  const workspace = await loadCampaignWorkspace(supabase, campaignId);

  if (!workspace.ok) {
    return (
      <AdvertiseShell title="Campaign">
        <p role="alert" className="text-sm text-red-100">
          {workspace.message}
        </p>
        <Link
          href={APP_ROUTES.advertiseCampaigns}
          className="mt-4 inline-block text-sm text-white/60 underline"
        >
          Back to campaigns
        </Link>
      </AdvertiseShell>
    );
  }

  const { campaign, adSets, creatives, metrics } = workspace;
  const adSet = adSets[0] ?? null;

  return (
    <AdvertiseShell title={campaign.name}>
      {query.error ? (
        <p role="alert" className="mb-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {query.error}
        </p>
      ) : null}
      {query.created || query.submitted || query.targeting ? (
        <p className="mb-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {query.submitted
            ? "Campaign submitted for review."
            : query.targeting
              ? "Targeting saved."
              : "Campaign saved."}
        </p>
      ) : null}

      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
              {campaign.objective.replace(/_/g, " ")}
            </p>
            <h1 className="mt-1 text-2xl font-black">{campaign.name}</h1>
            <p className="mt-1 text-sm text-white/50">
              Status: {campaign.status} · Spent{" "}
              {formatMinorUnits(campaign.spentMinor, campaign.currencyCode)}{" "}
              (not billed in V1)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(campaign.status === "draft" || campaign.status === "rejected") && (
              <form action={submitCampaignForReviewAction}>
                <input type="hidden" name="campaignId" value={campaign.id} />
                <button
                  type="submit"
                  className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
                >
                  Submit for review
                </button>
              </form>
            )}
            {(campaign.status === "active" || campaign.status === "approved") && (
              <form action={pauseCampaignAction}>
                <input type="hidden" name="campaignId" value={campaign.id} />
                <button
                  type="submit"
                  className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80"
                >
                  Pause
                </button>
              </form>
            )}
            {campaign.status !== "archived" && (
              <form action={archiveCampaignAction}>
                <input type="hidden" name="campaignId" value={campaign.id} />
                <button
                  type="submit"
                  className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/60"
                >
                  Archive
                </button>
              </form>
            )}
          </div>
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-white/40">Daily budget</dt>
            <dd className="font-bold">
              {campaign.dailyBudgetMinor != null
                ? formatMinorUnits(
                    campaign.dailyBudgetMinor,
                    campaign.currencyCode
                  )
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-white/40">Total budget</dt>
            <dd className="font-bold">
              {campaign.totalBudgetMinor != null
                ? formatMinorUnits(
                    campaign.totalBudgetMinor,
                    campaign.currencyCode
                  )
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-white/40">Schedule</dt>
            <dd className="font-bold">
              {campaign.startAt ?? "—"} → {campaign.endAt ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-white/40">Metrics (recorded only)</dt>
            <dd className="font-bold">
              {metrics.impressions} impr · {metrics.clicks} clicks
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-white/40">{metrics.note}</p>
      </section>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-6">
        <h2 className="text-lg font-black">Review summary</h2>
        <ul className="mt-3 space-y-1 text-sm text-white/60">
          <li>Campaign status: {campaign.status}</li>
          <li>Ad sets: {adSets.length}</li>
          <li>
            Creatives: {creatives.length} (
            {creatives.filter((c) => c.status === "approved").length} approved)
          </li>
          <li>Placements selected: contracts only — no live delivery in V1</li>
        </ul>
      </section>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-6">
        <h2 className="text-lg font-black">Targeting</h2>
        <form action={saveCampaignTargetingAction} className="mt-4 space-y-3">
          <input type="hidden" name="campaignId" value={campaign.id} />
          {adSet ? (
            <input type="hidden" name="adSetId" value={adSet.id} />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs">
              <span className="font-bold uppercase tracking-[0.14em] text-white/45">
                Countries
              </span>
              <input
                name="countries"
                defaultValue={adSet?.targeting.countries.join(", ") ?? ""}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-bold uppercase tracking-[0.14em] text-white/45">
                Exclude countries
              </span>
              <input
                name="excludeCountries"
                defaultValue={adSet?.targeting.excludeCountries.join(", ") ?? ""}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-bold uppercase tracking-[0.14em] text-white/45">
                Languages
              </span>
              <input
                name="languages"
                defaultValue={adSet?.targeting.languages.join(", ") ?? ""}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-bold uppercase tracking-[0.14em] text-white/45">
                Interests ({SAFE_INTERESTS.slice(0, 3).join(", ")}…)
              </span>
              <input
                name="interests"
                defaultValue={adSet?.targeting.interests.join(", ") ?? ""}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-bold uppercase tracking-[0.14em] text-white/45">
                Age min
              </span>
              <input
                name="ageMin"
                type="number"
                min={13}
                max={65}
                defaultValue={adSet?.targeting.ageMin ?? 13}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-bold uppercase tracking-[0.14em] text-white/45">
                Age max
              </span>
              <input
                name="ageMax"
                type="number"
                min={13}
                max={65}
                defaultValue={adSet?.targeting.ageMax ?? 65}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
              />
            </label>
          </div>
          <label className="block space-y-1 text-xs">
            <span className="font-bold uppercase tracking-[0.14em] text-white/45">
              Placements
            </span>
            <input
              name="placements"
              defaultValue={
                adSet?.targeting.placements.join(", ") ||
                AD_PLACEMENTS.join(", ")
              }
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
            />
          </label>
          <button
            type="submit"
            className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold"
          >
            Save targeting
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">Creatives</h2>
          <Link
            href={`${APP_ROUTES.advertiseCreativesNew}?campaignId=${campaign.id}`}
            className="text-sm font-bold text-white/70 underline-offset-4 hover:underline"
          >
            Add creative
          </Link>
        </div>
        {creatives.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">No creatives yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {creatives.map((creative) => (
              <li
                key={creative.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{creative.headline}</p>
                    <p className="text-xs text-white/45">
                      {creative.creativeType} · {creative.status} ·{" "}
                      {creative.callToAction}
                    </p>
                    <p className="mt-1 break-all text-xs text-white/35">
                      {creative.destinationUrl}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(creative.status === "draft" ||
                      creative.status === "rejected") && (
                      <form action={submitCreativeForReviewAction}>
                        <input
                          type="hidden"
                          name="creativeId"
                          value={creative.id}
                        />
                        <input
                          type="hidden"
                          name="campaignId"
                          value={campaign.id}
                        />
                        <button
                          type="submit"
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-black"
                        >
                          Submit
                        </button>
                      </form>
                    )}
                    {creative.status === "draft" && (
                      <form action={deleteDraftCreativeAction}>
                        <input
                          type="hidden"
                          name="creativeId"
                          value={creative.id}
                        />
                        <input
                          type="hidden"
                          name="campaignId"
                          value={campaign.id}
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/60"
                        >
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-4 text-center text-xs text-white/30">
        Workspace: {advertiseCampaignDetail(campaign.id)}
      </p>
    </AdvertiseShell>
  );
}
