import Link from "next/link";
import { redirect } from "next/navigation";
import CartView from "../../components/store/CartView";
import StoreErrorState from "../../components/store/StoreErrorState";
import StorePageHeader from "../../components/store/StorePageHeader";
import StoreShell from "../../components/store/StoreShell";
import { APP_ROUTES } from "../../lib/nav";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";
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

  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const result = await getCartSummary(supabase, user.id);
  const commerceGate = await loadCommerceConfirmGate(supabase);

  return (
    <StoreShell title={t("store.cart.navTitle")} subtitle={t("store.cart.navSubtitle")} wide>
      <StorePageHeader
        eyebrow={t("store.cart.eyebrow")}
        title={t("store.cart.title")}
        description={t("store.cart.description")}
      >
        <Link
          href={APP_ROUTES.storeOrders}
          className="mt-3 inline-flex text-sm font-semibold text-[var(--sf-accent-strong)] underline-offset-2 hover:underline"
        >
          {t("store.cart.viewOrders")}
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
