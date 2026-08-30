import Link from "next/link";
import { adminListSellerApplications } from "../../../../lib/store/adminQueries";
import { APP_ROUTES } from "../../../lib/nav";
import AdminStoreShell, { FlashMessages, StatusChip } from "../AdminStoreShell";
import SellerReviewActions from "../SellerReviewActions";
import { requireAdminStoreSession } from "../requireAdminStore";

export const metadata = {
  title: "Seller Applications | UMTUBA Admin",
};

type PageProps = {
  searchParams?:
 Promise<{
        status?: string;
        id?: string;
        error?: string;
        approved?: string;
        rejected?: string;
        suspended?: string;
      }>;
};

function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default async function AdminStoreSellersPage({ searchParams }: PageProps) {
  const { supabase } = await requireAdminStoreSession();
  const params = (await searchParams) ?? {};
  const status = params.status || "pending";
  const list = await adminListSellerApplications(supabase, {
    status: status === "all" ? "all" : status,
  });

  const selectedId = params.id;
  const selected =
    list.ok && selectedId
      ? list.rows.find((row) => row.id === selectedId) ?? null
      : list.ok
        ? list.rows[0] ?? null
        : null;

  const okMsg = params.approved
    ? "Seller application approved. Store provisioned as verified."
    : params.rejected
      ? "Seller application rejected."
      : params.suspended
        ? "Seller application suspended."
        : undefined;

  const returnTo = `${APP_ROUTES.adminStoreSellers}?status=${encodeURIComponent(status)}${
    selected ? `&id=${selected.id}` : ""
  }`;

  return (
    <AdminStoreShell title="Seller applications">
      <FlashMessages error={params.error} ok={okMsg} />

      <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3">
        <label className="block space-y-1 text-xs sm:col-span-2">
          <span className="font-bold uppercase tracking-[0.14em] text-white/45">
            Status
          </span>
          <select
            name="status"
            defaultValue={status}
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
            <option value="all">All recent</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="watch-focus-ring w-full rounded-full border border-white/15 px-4 py-2.5 text-sm font-bold"
          >
            Apply filter
          </button>
        </div>
      </form>

      {!list.ok ? (
        <p role="alert" className="mt-4 text-sm text-red-100">
          {list.message}
        </p>
      ) : list.rows.length === 0 ? (
        <p className="mt-6 text-sm text-white/50" role="status">
          No seller applications in this queue.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <ul className="space-y-2" aria-label="Seller application queue">
            {list.rows.map((row) => {
              const active = selected?.id === row.id;
              return (
                <li key={row.id}>
                  <Link
                    href={`${APP_ROUTES.adminStoreSellers}?status=${encodeURIComponent(status)}&id=${row.id}`}
                    className={`watch-focus-ring block rounded-2xl border px-4 py-3 transition ${
                      active
                        ? "border-violet-400/40 bg-violet-500/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/5"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold">{row.proposed_store_name}</p>
                      <StatusChip status={row.status} />
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      /{row.proposed_store_slug} · {formatWhen(row.created_at)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>

          {selected ? (
            <article className="rounded-2xl border border-white/10 bg-[#080816]/80 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">
                    {selected.proposed_store_name}
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    Slug: {selected.proposed_store_slug}
                  </p>
                </div>
                <StatusChip status={selected.status} />
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Applicant
                  </dt>
                  <dd className="mt-1">
                    {selected.applicant_display_name ||
                      selected.applicant_username ||
                      "Profile unavailable"}
                    {selected.applicant_username
                      ? ` (@${selected.applicant_username})`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Location
                  </dt>
                  <dd className="mt-1">
                    {[selected.city, selected.country_code]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Contact email
                  </dt>
                  <dd className="mt-1 break-all">
                    {selected.public_contact_email || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Contact phone
                  </dt>
                  <dd className="mt-1">
                    {selected.public_contact_phone || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Currency
                  </dt>
                  <dd className="mt-1">{selected.default_currency}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Submitted
                  </dt>
                  <dd className="mt-1">{formatWhen(selected.created_at)}</dd>
                </div>
              </dl>

              {selected.review_note ? (
                <p className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/70">
                  <span className="font-bold text-white/50">Review note: </span>
                  {selected.review_note}
                </p>
              ) : null}

              <SellerReviewActions
                applicationId={selected.id}
                status={selected.status}
                returnTo={returnTo}
              />
            </article>
          ) : null}
        </div>
      )}
    </AdminStoreShell>
  );
}
