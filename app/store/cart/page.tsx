import Link from "next/link";
import { redirect } from "next/navigation";
import CartView from "../../components/store/CartView";
import StoreErrorState from "../../components/store/StoreErrorState";
import StorePageHeader from "../../components/store/StorePageHeader";
import StoreShell from "../../components/store/StoreShell";
import { APP_ROUTES } from "../../lib/nav";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { getCartSummary } from "../../../lib/store/cart";
import { loadCommerceConfirmGate } from "../../../lib/store/commerceSafetyQueries";

export const metadata = {
  title: "Cart | UMTUBA Store",
  description: "Your UMTUBA Store cart.",
};

export default async function StoreCartPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.storeCart)}`
    );
  }

  const supabase = await createClient();
  const result = await getCartSummary(supabase, user.id);
  const commerceGate = await loadCommerceConfirmGate(supabase);

  return (
    <StoreShell title="Cart" subtitle="Store" wide>
      <StorePageHeader
        eyebrow="Bag"
        title="Your cart"
        description="Prices are snapshotted server-side when items are added. Live availability and price changes are verified before checkout. Tax, delivery, and discounts appear only from trusted checkout quotes."
      >
        <Link
          href={APP_ROUTES.storeOrders}
          className="mt-3 inline-flex text-sm font-semibold text-[var(--sf-accent-strong)] underline-offset-2 hover:underline"
        >
          View my orders
        </Link>
        {!commerceGate.purchasesAvailable ? (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            {commerceGate.message}
          </p>
        ) : null}
      </StorePageHeader>

      {!result.ok ? (
        <div className="mt-6">
          <StoreErrorState message={result.message} />
        </div>
      ) : (
        <CartView
          initialSummary={result.data}
          purchasesAvailable={commerceGate.purchasesAvailable}
          purchasesUnavailableMessage={commerceGate.message}
        />
      )}
    </StoreShell>
  );
}
