import Link from "next/link";
import { availableUnits } from "../../../../lib/store/inventory";
import { formatMinorUnits } from "../../../../lib/store/money";
import { adminListStoreProductsForModeration } from "../../../../lib/store/adminQueries";
import { APP_ROUTES } from "../../../lib/nav";
import AdminStoreShell, { FlashMessages, StatusChip } from "../AdminStoreShell";
import ProductReviewActions from "../ProductReviewActions";
import { requireAdminStoreSession } from "../requireAdminStore";

export const metadata = {
  title: "Product Review | UMTUBA Admin",
};

type PageProps = {
  searchParams?:
    | Promise<{
        status?: string;
        id?: string;
        error?: string;
        approved?: string;
      }>
    | {
        status?: string;
        id?: string;
        error?: string;
        approved?: string;
      };
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

export default async function AdminStoreProductsPage({ searchParams }: PageProps) {
  const { supabase } = await requireAdminStoreSession();
  const params = await Promise.resolve(searchParams ?? {});
  const status = params.status || "pending";
  const list = await adminListStoreProductsForModeration(supabase, {
    status: status === "all" ? "all" : status,
  });

  const selectedId = params.id;
  const selected =
    list.ok && selectedId
      ? list.rows.find((row) => row.id === selectedId) ?? null
      : list.ok
        ? list.rows[0] ?? null
        : null;

  const okMsg = params.approved ? "Product approved and published." : undefined;
  const returnTo = `${APP_ROUTES.adminStoreProducts}?status=${encodeURIComponent(status)}${
    selected ? `&id=${selected.id}` : ""
  }`;

  return (
    <AdminStoreShell title="Product review">
      <FlashMessages error={params.error} ok={okMsg} />

      <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3">
        <label className="block space-y-1 text-xs sm:col-span-2">
          <span className="font-bold uppercase tracking-[0.14em] text-white/45">
            Moderation status
          </span>
          <select
            name="status"
            defaultValue={status}
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
          >
            <option value="pending">Awaiting review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
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
          No products in this moderation queue.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <ul className="space-y-2" aria-label="Product moderation queue">
            {list.rows.map((row) => {
              const active = selected?.id === row.id;
              return (
                <li key={row.id}>
                  <Link
                    href={`${APP_ROUTES.adminStoreProducts}?status=${encodeURIComponent(status)}&id=${row.id}`}
                    className={`watch-focus-ring block rounded-2xl border px-4 py-3 transition ${
                      active
                        ? "border-violet-400/40 bg-violet-500/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/5"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold">{row.title}</p>
                      <StatusChip status={row.moderation_status} />
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      {row.store_name} · {formatWhen(row.updated_at)}
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
                  <h2 className="text-xl font-black">{selected.title}</h2>
                  <p className="mt-1 text-sm text-white/50">
                    Store: {selected.store_name} (/{selected.store_slug})
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusChip status={selected.status} />
                  <StatusChip status={selected.moderation_status} />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-black/30 px-4 py-6 text-center text-sm text-white/45">
                Media preview unavailable — Storage upload is not in this slice.
                {selected.media_path ? (
                  <span className="mt-2 block break-all text-xs text-white/35">
                    Path on record: {selected.media_path}
                  </span>
                ) : (
                  <span className="mt-2 block text-xs text-white/35">
                    No media path attached.
                  </span>
                )}
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Price
                  </dt>
                  <dd className="mt-1">
                    {selected.amount_minor != null && selected.currency
                      ? formatMinorUnits(
                          Number(selected.amount_minor),
                          selected.currency
                        )
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Stock
                  </dt>
                  <dd className="mt-1">
                    {selected.on_hand == null
                      ? "—"
                      : `${availableUnits({
                          onHand: selected.on_hand,
                          reserved: selected.reserved ?? 0,
                          safetyStock: selected.safety_stock ?? 0,
                        })} available${
                          selected.allow_backorder ? " (backorder ok)" : ""
                        }`}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Category
                  </dt>
                  <dd className="mt-1">{selected.category_name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Owner / creator ref
                  </dt>
                  <dd className="mt-1 break-all text-xs text-white/70">
                    owner {selected.owner_user_id}
                    <br />
                    created_by {selected.created_by}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Updated
                  </dt>
                  <dd className="mt-1">{formatWhen(selected.updated_at)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Submitted
                  </dt>
                  <dd className="mt-1">{formatWhen(selected.created_at)}</dd>
                </div>
              </dl>

              <ProductReviewActions
                productId={selected.id}
                status={selected.status}
                moderationStatus={selected.moderation_status}
                returnTo={returnTo}
              />
            </article>
          ) : null}
        </div>
      )}
    </AdminStoreShell>
  );
}
