import Link from "next/link";
import { redirect } from "next/navigation";
import CartView from "../../components/store/CartView";
import StoreErrorState from "../../components/store/StoreErrorState";
import StoreShell from "../../components/store/StoreShell";
import { APP_ROUTES } from "../../lib/nav";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { getCartSummary } from "../../../lib/store/cart";

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

  return (
    <StoreShell title="Cart" subtitle="Store" wide>
      <header className="mt-6 rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <p className="sf-eyebrow">Bag</p>
        <h1 className="sf-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Your cart
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--sf-muted)]">
          Prices are snapshotted server-side when items are added. Live
          availability and price changes are verified before checkout. Tax,
          delivery, and discounts appear only from trusted checkout quotes.{" "}
          <Link
            href={APP_ROUTES.storeOrders}
            className="font-semibold text-[var(--sf-accent-strong)] underline-offset-2 hover:underline"
          >
            View my orders
          </Link>
        </p>
      </header>

      {!result.ok ? (
        <div className="mt-6">
          <StoreErrorState message={result.message} />
        </div>
      ) : (
        <CartView initialSummary={result.data} />
      )}
    </StoreShell>
  );
}
