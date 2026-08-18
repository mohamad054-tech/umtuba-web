"use client";

import { useTranslation } from "../i18n";

export default function StoreTrustStrip() {
  const { t } = useTranslation();
  return (
    <ul className="sf-trust">
      <li>
        <strong>{t("store.trust.catalogPrices")}</strong>
        {t("store.trust.catalogPricesBody")}
      </li>
      <li>
        <strong>{t("store.trust.quotedAtCheckout")}</strong>
        {t("store.trust.quotedAtCheckoutBody")}
      </li>
      <li>
        <strong>{t("store.trust.oneSeller")}</strong>
        {t("store.trust.oneSellerBody")}
      </li>
    </ul>
  );
}
