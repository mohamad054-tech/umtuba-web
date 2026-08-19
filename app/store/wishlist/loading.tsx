import StoreShell from "../../components/store/StoreShell";
import { ProductGridSkeleton } from "../../components/store/StoreSkeleton";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";

export default async function StoreWishlistLoading() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  return (
    <StoreShell title={t("store.wishlist.navTitle")} subtitle={t("store.shell.loading")}>
      <div className="mt-6">
        <ProductGridSkeleton count={6} />
      </div>
    </StoreShell>
  );
}
