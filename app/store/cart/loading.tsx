import StoreShell from "../../components/store/StoreShell";
import { ProductGridSkeleton } from "../../components/store/StoreSkeleton";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";

export default async function CartLoading() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  return (
    <StoreShell title={t("store.cart.navTitle")} subtitle={t("store.shell.loading")}>
      <div className="mt-6">
        <ProductGridSkeleton count={2} />
      </div>
    </StoreShell>
  );
}
