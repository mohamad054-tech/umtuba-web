import { redirect } from "next/navigation";
import CheckoutClient from "../../components/store/CheckoutClient";
import StoreErrorState from "../../components/store/StoreErrorState";
import StorePageHeader from "../../components/store/StorePageHeader";
import StoreShell from "../../components/store/StoreShell";
import { APP_ROUTES } from "../../lib/nav";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { getCartSummary } from "../../../lib/store/cart";
import {
  listBuyerAddresses,
  listShippingMethodsForStores,
} from "../../../lib/store/checkout";
import { loadCommerceConfirmGate } from "../../../lib/store/commerceSafetyQueries";

export const dynamic = "force-dynamic";

import { storeCheckoutMetadata } from "../../../lib/site/routeMetadata";

export const metadata = storeCheckoutMetadata;

export default async function StoreCheckoutPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.storeCheckout)}`
    );
  }

  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const cart = await getCartSummary(supabase, user.id);
  if (!cart.ok) {
    return (
      <StoreShell title={t("store.checkout.navTitle")} subtitle={t("store.checkout.navSubtitle")} wide>
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
    <StoreShell title={t("store.checkout.navTitle")} subtitle={t("store.checkout.navSubtitle")} wide>
      <StorePageHeader
        eyebrow={t("store.checkout.eyebrow")}
        title={t("store.checkout.title")}
        description={t("store.checkout.description")}
      >
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
            {t("store.checkout.blocking")}
          </p>
        ) : null}
      </StorePageHeader>

      {!addresses.ok || !shipping.ok ? (
        <div className="mt-6">
          <StoreErrorState
            message={
              (!addresses.ok && addresses.message) ||
              (!shipping.ok && shipping.message) ||
              t("store.checkout.unavailable")
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
              ? t("store.checkout.resolveIssues")
              : commerceGate.message
          }
        />
      )}
    </StoreShell>
  );
}
