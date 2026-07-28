import { redirect } from "next/navigation";
import CheckoutClient from "../../components/store/CheckoutClient";
import StoreErrorState from "../../components/store/StoreErrorState";
import StoreShell from "../../components/store/StoreShell";
import { APP_ROUTES } from "../../lib/nav";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { getCartSummary } from "../../../lib/store/cart";
import {
  listBuyerAddresses,
  listShippingMethodsForStores,
} from "../../../lib/store/checkout";
import { loadCommerceConfirmGate } from "../../../lib/store/commerceSafetyQueries";

export const metadata = {
  title: "Checkout | UMTUBA Store",
  description: "Secure UMTUBA Store checkout foundation (payment deferred).",
};

export default async function StoreCheckoutPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.storeCheckout)}`
    );
  }

  const supabase = await createClient();
  const cart = await getCartSummary(supabase, user.id);
  if (!cart.ok) {
    return (
      <StoreShell title="Checkout" subtitle="Store" wide>
        <div className="mt-6">
          <StoreErrorState message={cart.message} />
        </div>
      </StoreShell>
    );
  }

  const addresses = await listBuyerAddresses(supabase, user.id);
  const storeIds = cart.data.groups.map((g) => g.storeId);
  const shipping = await listShippingMethodsForStores(supabase, storeIds);
  const commerceGate = await loadCommerceConfirmGate(supabase);

  return (
    <StoreShell title="Checkout" subtitle="Store" wide>
      <header className="mt-6 rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <p className="sf-eyebrow">Checkout</p>
        <h1 className="sf-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Review & place order
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--sf-muted)]">
          Totals are calculated server-side. Payment collection is not enabled —
          placing an order creates a pending-payment order only. Multi-seller
          carts create one order per seller atomically.
        </p>
        {!commerceGate.purchasesAvailable ? (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            {commerceGate.message}
          </p>
        ) : null}
        {cart.data.hasBlockingIssues ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-[rgba(240,168,168,0.35)] bg-[rgba(240,168,168,0.08)] px-4 py-3 text-sm text-[var(--sf-danger)]"
          >
            Some cart items have price or availability issues. Return to the cart
            and resolve them before placing an order.
          </p>
        ) : null}
      </header>

      {!addresses.ok || !shipping.ok ? (
        <div className="mt-6">
          <StoreErrorState
            message={
              (!addresses.ok && addresses.message) ||
              (!shipping.ok && shipping.message) ||
              "Checkout unavailable."
            }
          />
        </div>
      ) : (
        <CheckoutClient
          cart={cart.data}
          addresses={addresses.data}
          shippingMethods={shipping.data}
          purchasesAvailable={
            commerceGate.purchasesAvailable && !cart.data.hasBlockingIssues
          }
          purchasesUnavailableMessage={
            cart.data.hasBlockingIssues
              ? "Resolve cart price or availability issues before placing an order."
              : commerceGate.message
          }
        />
      )}
    </StoreShell>
  );
}
