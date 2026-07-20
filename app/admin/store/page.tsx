import Link from "next/link";
import { adminStoreQueueCounts } from "../../../lib/store/adminQueries";
import { APP_ROUTES } from "../../lib/nav";
import AdminStoreShell from "./AdminStoreShell";
import { requireAdminStoreSession } from "./requireAdminStore";

export const metadata = {
  title: "Store Admin | UMTUBA",
};

export default async function AdminStoreOverviewPage() {
  const { supabase } = await requireAdminStoreSession();
  const counts = await adminStoreQueueCounts(supabase);

  return (
    <AdminStoreShell title="Store admin">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-2xl font-black tracking-tight">
          Moderation queue overview
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Internal console for seller applications and product review. Checkout,
          payments, and shipping remain outside this slice.
        </p>
      </section>

      {!counts.ok ? (
        <p role="alert" className="mt-4 text-sm text-red-100">
          {counts.message}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              label: "Seller applications pending",
              value: counts.counts.seller_applications_pending,
              href: `${APP_ROUTES.adminStoreSellers}?status=pending`,
            },
            {
              label: "Products awaiting moderation",
              value: counts.counts.products_pending,
              href: `${APP_ROUTES.adminStoreProducts}?status=pending`,
            },
            {
              label: "Inventory reservations",
              value: "Ops",
              href: APP_ROUTES.adminStoreReservations,
            },
          ].map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="watch-focus-ring rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:bg-white/5"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-black">{card.value}</p>
            </Link>
          ))}
        </div>
      )}
    </AdminStoreShell>
  );
}
