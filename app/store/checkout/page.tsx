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

  return (
    <StoreShell title="Checkout" subtitle="Store" wide>
      <header className="mt-6 rounded-[28px] border border-violet-400/20 bg-[#080816]/80 p-5 md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-300/70">
          Checkout
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Review & place order</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Totals are calculated server-side. Payment collection is not enabled
          yet — placing an order creates a pending-payment order only.
        </p>
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
        />
      )}
    </StoreShell>
  );
}
