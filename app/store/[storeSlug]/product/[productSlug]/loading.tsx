import StoreShell from "../../../../components/store/StoreShell";
import { ProductGridSkeleton } from "../../../../components/store/StoreSkeleton";
import { createTranslator } from "../../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../../lib/i18n/server";

export default async function ProductDetailLoading() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  return (
    <StoreShell title={t("store.product.viewTitle")} subtitle={t("store.shell.loading")}>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="aspect-square animate-pulse rounded-[28px] bg-white/5" />
        <div className="space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-white/5" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-white/5" />
          <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
          <ProductGridSkeleton count={2} />
        </div>
      </div>
    </StoreShell>
  );
}
