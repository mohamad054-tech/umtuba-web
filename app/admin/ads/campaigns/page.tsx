import Link from "next/link";
import {
  approveCampaignAction,
  pauseCampaignAdminAction,
  rejectCampaignAction,
  restoreCampaignAction,
} from "../../../actions/adsAdmin";
import {
  adminGetCampaignWorkspace,
  adminListCampaigns,
  adminListReviewEvents,
} from "../../../../lib/ads/adminQueries";
import { formatMinorUnits } from "../../../../lib/store/money";
import { CAMPAIGN_OBJECTIVES } from "../../../../lib/ads/constants";
import { APP_ROUTES } from "../../../lib/nav";
import AdminAdsShell, { FlashMessages, StatusChip } from "../AdminAdsShell";
import ReviewActionForms, { ReviewTimeline } from "../ReviewActionForms";
import { requireAdminAdsSession } from "../requireAdminAds";

export const metadata = {
  title: "Campaign Review | UMTUBA Admin",
};

type PageProps = {
  searchParams?:
 Promise<{
        status?: string;
        objective?: string;
        q?: string;
        id?: string;
        error?: string;
        approved?: string;
        rejected?: string;
        paused?: string;
        restored?: string;
      }>;
};

export default async function AdminAdsCampaignsPage({
  searchParams,
}: PageProps) {
  const { supabase } = await requireAdminAdsSession();
  const params = (await searchParams) ?? {};
  const status = params.status || "pending_review";
  const list = await adminListCampaigns(supabase, {
    status: status === "all" ? null : status,
    objective: params.objective || null,
    query: params.q || null,
  });

  const workspace = params.id
    ? await adminGetCampaignWorkspace(supabase, params.id)
    : null;
  const campaign = workspace?.ok
    ? (workspace.data.campaign as Record<string, unknown>)
    : null;
  const advertiser = workspace?.ok
    ? (workspace.data.advertiser as Record<string, unknown>)
    : null;
  const adSets = workspace?.ok
    ? ((workspace.data.ad_sets as Record<string, unknown>[]) ?? [])
    : [];
  const timeline =
    params.id && campaign
      ? await adminListReviewEvents(supabase, {
          entityType: "campaign",
          entityId: params.id,
        })
      : null;

  const okMsg = params.approved
    ? "Campaign approved."
    : params.rejected
      ? "Campaign rejected."
      : params.paused
        ? "Campaign paused."
        : params.restored
          ? "Campaign restored."
          : undefined;

  return (
    <AdminAdsShell title="Campaigns">
      <FlashMessages error={params.error} ok={okMsg} />

      <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-4">
        <label className="block space-y-1 text-xs sm:col-span-2">
          <span className="font-bold uppercase tracking-[0.14em] text-white/45">
            Search
          </span>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Campaign or advertiser"
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
          />
        </label>
        <label className="block space-y-1 text-xs">
          <span className="font-bold uppercase tracking-[0.14em] text-white/45">
            Status
          </span>
          <select
            name="status"
            defaultValue={status}
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
          >
            <option value="pending_review">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="suspended">Suspended</option>
            <option value="all">All</option>
          </select>
        </label>
        <label className="block space-y-1 text-xs">
          <span className="font-bold uppercase tracking-[0.14em] text-white/45">
            Objective
          </span>
          <select
            name="objective"
            defaultValue={params.objective ?? ""}
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
          >
            <option value="">Any</option>
            {CAMPAIGN_OBJECTIVES.map((objective) => (
              <option key={objective} value={objective}>
                {objective.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black sm:col-span-4 sm:w-fit"
        >
          Apply filters
        </button>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section>
          <h2 className="text-lg font-black">Queue</h2>
          {!list.ok ? (
            <p role="alert" className="mt-3 text-sm text-red-100">
              {list.message}
            </p>
          ) : list.rows.length === 0 ? (
            <p className="mt-3 text-sm text-white/45">No campaigns match.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {list.rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`${APP_ROUTES.adminAdsCampaigns}?status=${encodeURIComponent(
                      status
                    )}&id=${row.id}`}
                    className="watch-focus-ring block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:bg-white/5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold">{row.name}</p>
                      <StatusChip status={row.status} />
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      {row.business_name} · {row.objective.replace(/_/g, " ")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          {!params.id ? (
            <p className="text-sm text-white/45">
              Select a campaign to inspect budget, schedule, targeting, and
              placements.
            </p>
          ) : !workspace?.ok || !campaign ? (
            <p role="alert" className="text-sm text-red-100">
              {workspace && !workspace.ok ? workspace.message : "Not found"}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-black">{String(campaign.name)}</h2>
                  <p className="mt-1 text-sm text-white/50">
                    {String(advertiser?.business_name ?? "")} ·{" "}
                    {String(campaign.objective).replace(/_/g, " ")}
                  </p>
                </div>
                <StatusChip status={String(campaign.status)} />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-white/40">Daily budget</dt>
                  <dd className="font-bold">
                    {campaign.daily_budget_minor != null
                      ? formatMinorUnits(
                          Number(campaign.daily_budget_minor),
                          String(campaign.currency_code)
                        )
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/40">Total budget</dt>
                  <dd className="font-bold">
                    {campaign.total_budget_minor != null
                      ? formatMinorUnits(
                          Number(campaign.total_budget_minor),
                          String(campaign.currency_code)
                        )
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/40">Schedule</dt>
                  <dd className="font-bold">
                    {String(campaign.start_at ?? "—")} →{" "}
                    {String(campaign.end_at ?? "—")}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/40">Spent (read-only)</dt>
                  <dd className="font-bold">
                    {formatMinorUnits(
                      Number(campaign.spent_minor ?? 0),
                      String(campaign.currency_code)
                    )}
                  </dd>
                </div>
              </dl>

              <div className="mt-4">
                <h3 className="text-sm font-black">Targeting / placements</h3>
                {adSets.length === 0 ? (
                  <p className="mt-2 text-xs text-white/45">No ad sets.</p>
                ) : (
                  <ul className="mt-2 space-y-2 text-xs text-white/65">
                    {adSets.map((set) => (
                      <li
                        key={String(set.id)}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3"
                      >
                        <p className="font-bold text-white/80">
                          {String(set.name)}
                        </p>
                        <p className="mt-1">
                          Ages {String(set.age_min)}–{String(set.age_max)} ·
                          Countries{" "}
                          {Array.isArray(set.countries)
                            ? set.countries.join(", ") || "—"
                            : "—"}
                        </p>
                        <p className="mt-1">
                          Placements{" "}
                          {Array.isArray(set.placements)
                            ? set.placements.join(", ") || "—"
                            : "—"}
                        </p>
                        <p className="mt-1">
                          Interests{" "}
                          {Array.isArray(set.interests)
                            ? set.interests.join(", ") || "—"
                            : "—"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <ReviewActionForms
                idField={{ kind: "campaign", id: String(campaign.id) }}
                returnTo={`${APP_ROUTES.adminAdsCampaigns}?status=${status}&id=${String(campaign.id)}`}
                status={String(campaign.status)}
                approveAction={approveCampaignAction}
                rejectAction={rejectCampaignAction}
                pauseAction={pauseCampaignAdminAction}
                restoreAction={restoreCampaignAction}
              />

              <h3 className="mt-6 text-sm font-black">Audit timeline</h3>
              <ReviewTimeline events={timeline?.ok ? timeline.rows : []} />
            </>
          )}
        </section>
      </div>
    </AdminAdsShell>
  );
}
