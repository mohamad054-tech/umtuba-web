import Link from "next/link";
import { redirect } from "next/navigation";
import SellerInventoryWorkspace from "../../../components/store/SellerInventoryWorkspace";
import SellerOpsShell from "../../../components/store/SellerOpsShell";
import StoreErrorState from "../../../components/store/StoreErrorState";
import { APP_ROUTES } from "../../../lib/nav";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import {
  listSellerInventoryRows,
  listSellerStoreReservations,
} from "../../../../lib/store/sellerInventoryQueries";
import { getOwnedOrMemberStore } from "../../../../lib/store/sellerStore";

export const metadata = {
  title: "Store Inventory | UMTUBA Seller",
};

type PageProps = {
  searchParams?:
    | Promise<{ variant?: string }>
    | { variant?: string };
};

export default async function SellerStoreInventoryPage({
  searchParams,
}: PageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerInventory)}`
    );
  }

  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership) {
    redirect(APP_ROUTES.sellerStore);
  }

  if (membership.store.status !== "active") {
    return (
      <SellerOpsShell title="Inventory" subtitle={membership.store.name} wide>
        <div className="mt-6">
          <StoreErrorState message="This store is not active. Inventory visibility is unavailable." />
        </div>
      </SellerOpsShell>
    );
  }

  const params = await Promise.resolve(searchParams ?? {});
  const selectedVariantId =
    typeof params.variant === "string" && params.variant.trim()
      ? params.variant.trim()
      : null;

  const [inventoryResult, reservationResult] = await Promise.all([
    listSellerInventoryRows(supabase, membership.store.id, membership.role, {
      limit: 200,
    }),
    listSellerStoreReservations(
      supabase,
      membership.store.id,
      membership.role,
      { limit: 100 }
    ),
  ]);

  return (
    <SellerOpsShell title="Inventory" subtitle={membership.store.name} wide>
      <header className="mt-6 rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <p className="sf-eyebrow">@{membership.store.slug}</p>
        <h1 className="sf-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Inventory & reservations
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--sf-muted)]">
          Visibility into trusted on-hand, reserved, safety stock, and
          available-to-sell. This workspace does not edit authoritative stock
          counters and does not run warehouse or shipping execution. Role:{" "}
          {membership.role}.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link
            href={APP_ROUTES.sellerStore}
            className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
          >
            ← Store dashboard
          </Link>
          <Link
            href="/seller/store/products"
            className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
          >
            Products
          </Link>
          <Link
            href={APP_ROUTES.sellerOrders}
            className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
          >
            Orders
          </Link>
        </div>
      </header>

      <div className="mt-6">
        {!inventoryResult.ok ? (
          <StoreErrorState message={inventoryResult.message} />
        ) : !reservationResult.ok ? (
          <StoreErrorState message={reservationResult.message} />
        ) : (
          <SellerInventoryWorkspace
            rows={inventoryResult.data}
            reservations={reservationResult.data}
            canViewReservations={reservationResult.canViewReservations}
            selectedVariantId={selectedVariantId}
          />
        )}
      </div>
    </SellerOpsShell>
  );
}
