"use client";

import { useTranslation } from "../i18n";

export default function StoreSkipLink() {
  const { t } = useTranslation();
  return (
    <a href="#store-main" className="sf-skip-link watch-focus-ring">
      {t("store.skipToContent")}
    </a>
  );
}
