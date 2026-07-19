import Link from "next/link";
import {
  approveCreativeAction,
  rejectCreativeAction,
  restoreCreativeAction,
  suspendCreativeAction,
} from "../../../actions/adsAdmin";
import {
  adminGetCreativeWorkspace,
  adminListCreatives,
  adminListReviewEvents,
  adminSignedCreativeUrl,
} from "../../../../lib/ads/adminQueries";
import { APP_ROUTES } from "../../../lib/nav";
import AdminAdsShell, { FlashMessages, StatusChip } from "../AdminAdsShell";
import ReviewActionForms, { ReviewTimeline } from "../ReviewActionForms";
import { requireAdminAdsSession } from "../requireAdminAds";

export const metadata = {
  title: "Creative Review | UMTUBA Admin",
};

type PageProps = {
  searchParams?:
    | Promise<{
        status?: string;
        q?: string;
        id?: string;
        error?: string;
        approved?: string;
        rejected?: string;
        suspended?: string;
        restored?: string;
      }>
    | {
        status?: string;
        q?: string;
        id?: string;
        error?: string;
        approved?: string;
        rejected?: string;
        suspended?: string;
        restored?: string;
      };
};

export default async function AdminAdsCreativesPage({
  searchParams,
}: PageProps) {
  const { supabase } = await requireAdminAdsSession();
  const params = await Promise.resolve(searchParams ?? {});
  const status = params.status || "pending_review";
  const list = await adminListCreatives(supabase, {
    status: status === "all" ? null : status,
    query: params.q || null,
  });

  const workspace = params.id
    ? await adminGetCreativeWorkspace(supabase, params.id)
    : null;
  const creative = workspace?.ok
    ? (workspace.data.creative as Record<string, unknown>)
    : null;
  const advertiser = workspace?.ok
    ? (workspace.data.advertiser as Record<string, unknown>)
    : null;
  const campaign = workspace?.ok
    ? (workspace.data.campaign as Record<string, unknown> | null)
    : null;

  let previewUrl: string | null = null;
  if (creative?.media_path) {
    const signed = await adminSignedCreativeUrl(
      supabase,
      String(creative.media_path)
    );
    if (signed.ok) previewUrl = signed.url;
  }

  const timeline =
    params.id && creative
      ? await adminListReviewEvents(supabase, {
          entityType: "creative",
          entityId: params.id,
        })
      : null;

  const okMsg = params.approved
    ? "Creative approved."
    : params.rejected
      ? "Creative rejected."
      : params.suspended
        ? "Creative suspended."
        : params.restored
          ? "Creative restored to draft."
          : undefined;

  const creativeType = creative ? String(creative.creative_type) : "";

  return (
    <AdminAdsShell title="Creatives">
      <FlashMessages error={params.error} ok={okMsg} />

      <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3">
        <label className="block space-y-1 text-xs sm:col-span-2">
          <span className="font-bold uppercase tracking-[0.14em] text-white/45">
            Search
          </span>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Headline, advertiser, or URL"
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
            <option value="suspended">Suspended</option>
            <option value="draft">Draft</option>
            <option value="all">All</option>
          </select>
        </label>
        <button
          type="submit"
          className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black sm:col-span-3 sm:w-fit"
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
            <p className="mt-3 text-sm text-white/45">No creatives match.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {list.rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`${APP_ROUTES.adminAdsCreatives}?status=${encodeURIComponent(
                      status
                    )}&id=${row.id}`}
                    className="watch-focus-ring block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:bg-white/5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold">{row.headline}</p>
                      <StatusChip status={row.status} />
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      {row.business_name} · {row.creative_type}
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
              Select a creative to preview media, CTA, destination, and
              moderation notes.
            </p>
          ) : !workspace?.ok || !creative ? (
            <p role="alert" className="text-sm text-red-100">
              {workspace && !workspace.ok ? workspace.message : "Not found"}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-black">
                    {String(creative.headline)}
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    {String(advertiser?.business_name ?? "")}
                    {campaign?.name ? ` · ${String(campaign.name)}` : ""}
                  </p>
                </div>
                <StatusChip status={String(creative.status)} />
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                {previewUrl ? (
                  creativeType === "video" || creativeType === "story" ? (
                    <video
                      src={previewUrl}
                      controls
                      className="max-h-80 w-full object-contain"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={String(creative.headline)}
                      className="max-h-80 w-full object-contain"
                    />
                  )
                ) : (
                  <p className="px-4 py-10 text-center text-sm text-white/45">
                    Preview unavailable (signed URL failed or media missing).
                  </p>
                )}
              </div>

              <dl className="mt-4 grid gap-3 text-sm">
                <div>
                  <dt className="text-white/40">CTA</dt>
                  <dd className="font-bold">
                    {String(creative.call_to_action).replace(/_/g, " ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/40">Destination</dt>
                  <dd className="break-all font-bold">
                    {(() => {
                      const raw = String(creative.destination_url ?? "");
                      try {
                        const u = new URL(raw);
                        if (u.protocol !== "https:") return raw;
                        return (
                          <a
                            href={u.toString()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-300 underline-offset-2 hover:underline"
                          >
                            {u.toString()}
                          </a>
                        );
                      } catch {
                        return raw;
                      }
                    })()}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/40">Body</dt>
                  <dd className="font-bold">
                    {String(creative.body_text ?? "—")}
                  </dd>
                </div>
              </dl>
              {creative.moderation_notes ? (
                <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
                  Moderation notes: {String(creative.moderation_notes)}
                </p>
              ) : null}

              <ReviewActionForms
                idField={{ kind: "creative", id: String(creative.id) }}
                returnTo={`${APP_ROUTES.adminAdsCreatives}?status=${status}&id=${String(creative.id)}`}
                status={String(creative.status)}
                approveAction={approveCreativeAction}
                rejectAction={rejectCreativeAction}
                suspendAction={suspendCreativeAction}
                restoreAction={restoreCreativeAction}
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
