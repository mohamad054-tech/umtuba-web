import Link from "next/link";
import {
  approveAdvertiserAction,
  rejectAdvertiserAction,
  restoreAdvertiserAction,
  suspendAdvertiserAction,
} from "../../../actions/adsAdmin";
import {
  adminGetAdvertiser,
  adminListAdvertisers,
  adminListReviewEvents,
} from "../../../../lib/ads/adminQueries";
import { APP_ROUTES } from "../../../lib/nav";
import AdminAdsShell, { FlashMessages, StatusChip } from "../AdminAdsShell";
import ReviewActionForms, { ReviewTimeline } from "../ReviewActionForms";
import { requireAdminAdsSession } from "../requireAdminAds";

export const metadata = {
  title: "Advertiser Review | UMTUBA Admin",
};

type PageProps = {
  searchParams?:
    | Promise<{
        status?: string;
        country?: string;
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
        country?: string;
        q?: string;
        id?: string;
        error?: string;
        approved?: string;
        rejected?: string;
        suspended?: string;
        restored?: string;
      };
};

export default async function AdminAdsAdvertisersPage({
  searchParams,
}: PageProps) {
  const { supabase } = await requireAdminAdsSession();
  const params = await Promise.resolve(searchParams ?? {});
  const status = params.status || "pending_review";
  const list = await adminListAdvertisers(supabase, {
    status: status === "all" ? null : status,
    country: params.country || null,
    query: params.q || null,
  });

  const selectedId = params.id;
  const detail = selectedId
    ? await adminGetAdvertiser(supabase, selectedId)
    : null;
  const timeline =
    selectedId && detail?.ok
      ? await adminListReviewEvents(supabase, {
          entityType: "advertiser",
          entityId: selectedId,
        })
      : null;

  const okMsg = params.approved
    ? "Advertiser approved."
    : params.rejected
      ? "Advertiser rejected."
      : params.suspended
        ? "Advertiser suspended."
        : params.restored
          ? "Advertiser restored."
          : undefined;

  return (
    <AdminAdsShell title="Advertisers">
      <FlashMessages error={params.error} ok={okMsg} />

      <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-4">
        <label className="block space-y-1 text-xs sm:col-span-2">
          <span className="font-bold uppercase tracking-[0.14em] text-white/45">
            Search
          </span>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Business name or email"
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
        <label className="block space-y-1 text-xs">
          <span className="font-bold uppercase tracking-[0.14em] text-white/45">
            Country
          </span>
          <input
            name="country"
            defaultValue={params.country ?? ""}
            maxLength={2}
            placeholder="US"
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
          />
        </label>
        <button
          type="submit"
          className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black sm:col-span-4 sm:w-fit"
        >
          Apply filters
        </button>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section>
          <h2 className="text-lg font-black">Queue</h2>
          {!list.ok ? (
            <p role="alert" className="mt-3 text-sm text-red-100">
              {list.message}
            </p>
          ) : list.rows.length === 0 ? (
            <p className="mt-3 text-sm text-white/45">No advertisers match.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {list.rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`${APP_ROUTES.adminAdsAdvertisers}?status=${encodeURIComponent(
                      status
                    )}&id=${row.id}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}`}
                    className="watch-focus-ring block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:bg-white/5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold">{row.business_name}</p>
                      <StatusChip status={row.status} />
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      {row.contact_email} · {row.country_code}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          {!selectedId ? (
            <p className="text-sm text-white/45">
              Select an advertiser to review details, contact data, and audit
              history.
            </p>
          ) : !detail?.ok ? (
            <p role="alert" className="text-sm text-red-100">
              {detail?.message ?? "Not found"}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-black">
                    {detail.account.business_name}
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    {detail.account.legal_name || "No legal name"}
                  </p>
                </div>
                <StatusChip status={detail.account.status} />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-white/40">Contact email</dt>
                  <dd className="font-bold">{detail.account.contact_email}</dd>
                </div>
                <div>
                  <dt className="text-white/40">Phone</dt>
                  <dd className="font-bold">
                    {detail.account.contact_phone || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/40">Website</dt>
                  <dd className="break-all font-bold">
                    {detail.account.website_url || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/40">Country</dt>
                  <dd className="font-bold">{detail.account.country_code}</dd>
                </div>
              </dl>
              {detail.account.review_note ? (
                <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
                  Moderation notes: {detail.account.review_note}
                </p>
              ) : null}

              <ReviewActionForms
                idField={{ kind: "account", id: detail.account.id }}
                returnTo={`${APP_ROUTES.adminAdsAdvertisers}?status=${status}&id=${detail.account.id}`}
                status={detail.account.status}
                approveAction={approveAdvertiserAction}
                rejectAction={rejectAdvertiserAction}
                suspendAction={suspendAdvertiserAction}
                restoreAction={restoreAdvertiserAction}
              />

              <h3 className="mt-6 text-sm font-black">Audit timeline</h3>
              <ReviewTimeline
                events={timeline?.ok ? timeline.rows : []}
              />
            </>
          )}
        </section>
      </div>
    </AdminAdsShell>
  );
}
