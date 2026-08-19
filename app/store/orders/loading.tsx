import StoreShell from "../../components/store/StoreShell";
import { ProductGridSkeleton } from "../../components/store/StoreSkeleton";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";

export default async function OrdersLoading() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  return (
    <StoreShell title={t("store.orders.navTitle")} subtitle={t("store.shell.loading")}>
      <div className="mt-6 space-y-4" aria-busy="true" aria-label={t("store.shell.loading")}>
        <div className="h-40 animate-pulse rounded-[var(--sf-radius-lg)] bg-white/5" />
        <ProductGridSkeleton count={3} />
      </div>
    </StoreShell>
  );
}
