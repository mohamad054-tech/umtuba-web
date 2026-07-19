import { adminListReviewEvents } from "../../../../lib/ads/adminQueries";
import AdminAdsShell, { FlashMessages, StatusChip } from "../AdminAdsShell";
import { requireAdminAdsSession } from "../requireAdminAds";

export const metadata = {
  title: "Review Audit | UMTUBA Admin",
};

type PageProps = {
  searchParams?:
    | Promise<{
        entityType?: string;
        action?: string;
        reviewer?: string;
        error?: string;
      }>
    | {
        entityType?: string;
        action?: string;
        reviewer?: string;
        error?: string;
      };
};

export default async function AdminAdsReviewsPage({ searchParams }: PageProps) {
  const { supabase } = await requireAdminAdsSession();
  const params = await Promise.resolve(searchParams ?? {});
  const events = await adminListReviewEvents(supabase, {
    entityType: params.entityType || null,
    action: params.action || null,
    reviewerId: params.reviewer || null,
  });

  return (
    <AdminAdsShell title="Reviews">
      <FlashMessages error={params.error} />

      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-6">
        <h1 className="text-2xl font-black tracking-tight">Audit trail</h1>
        <p className="mt-2 text-sm text-white/50">
          Immutable review history. Admins cannot edit or delete past events.
        </p>

        <form className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1 text-xs">
            <span className="font-bold uppercase tracking-[0.14em] text-white/45">
              Entity
            </span>
            <select
              name="entityType"
              defaultValue={params.entityType ?? ""}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
            >
              <option value="">Any</option>
              <option value="advertiser">Advertiser</option>
              <option value="campaign">Campaign</option>
              <option value="creative">Creative</option>
            </select>
          </label>
          <label className="block space-y-1 text-xs">
            <span className="font-bold uppercase tracking-[0.14em] text-white/45">
              Action
            </span>
            <select
              name="action"
              defaultValue={params.action ?? ""}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
            >
              <option value="">Any</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
              <option value="restored">Restored</option>
            </select>
          </label>
          <label className="block space-y-1 text-xs">
            <span className="font-bold uppercase tracking-[0.14em] text-white/45">
              Reviewer id
            </span>
            <input
              name="reviewer"
              defaultValue={params.reviewer ?? ""}
              placeholder="uuid"
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
            />
          </label>
          <button
            type="submit"
            className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black sm:col-span-3 sm:w-fit"
          >
            Apply filters
          </button>
        </form>
      </section>

      <section className="mt-6">
        {!events.ok ? (
          <p role="alert" className="text-sm text-red-100">
            {events.message}
          </p>
        ) : events.rows.length === 0 ? (
          <p className="text-sm text-white/45">No review events match.</p>
        ) : (
          <ul className="space-y-2">
            {events.rows.map((event) => (
              <li
                key={event.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold">
                    {event.entity_type} · {event.entity_id.slice(0, 8)}…
                  </p>
                  <StatusChip status={event.action} />
                </div>
                <p className="mt-1 text-xs text-white/45">
                  {new Date(event.created_at).toLocaleString()}
                  {event.reviewer_id
                    ? ` · reviewer ${event.reviewer_id}`
                    : " · no reviewer (legacy/system)"}
                </p>
                {event.reason ? (
                  <p className="mt-2 text-sm text-white/65">{event.reason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminAdsShell>
  );
}
