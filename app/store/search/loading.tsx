import StoreShell from "../../components/store/StoreShell";
import { ProductGridSkeleton } from "../../components/store/StoreSkeleton";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";

export default async function StoreSearchLoading() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  return (
    <StoreShell title={t("store.search.navTitle")} subtitle={t("store.shell.loading")}>
      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="h-72 animate-pulse rounded-[24px] bg-white/5" />
        <ProductGridSkeleton count={6} />
      </div>
    </StoreShell>
  );
}
