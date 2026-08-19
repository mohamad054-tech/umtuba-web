import StoreShell from "../../components/store/StoreShell";
import { StoreHomeSkeleton } from "../../components/store/StoreSkeleton";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";

export default async function StoreCheckoutLoading() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  return (
    <StoreShell title={t("store.checkout.navTitle")} subtitle={t("store.shell.loading")}>
      <StoreHomeSkeleton />
    </StoreShell>
  );
}
