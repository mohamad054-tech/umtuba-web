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
      <header className="mt-6 rounded-[28px] border border-violet-400/20 bg-[#080816]/80 p-5 md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-300/70">
          Bag
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Your cart</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Prices are snapshotted server-side when items are added. Checkout ships
          in a later phase.
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
