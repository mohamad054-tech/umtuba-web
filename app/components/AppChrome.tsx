"use client";

import type { ReactNode } from "react";
import AppMobileBottomNav from "./AppMobileBottomNav";
import { useTranslation } from "./i18n";
import ReferralClaimBootstrap from "./ReferralClaimBootstrap";

/**
 * Global chrome that mounts mobile primary navigation without duplicating
 * AppTopNav's desktop primary links.
 */
export default function AppChrome({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <>
      <a href="#main-content" className="skip-link watch-focus-ring">
        {t("nav.skipToContent")}
      </a>
      <ReferralClaimBootstrap />
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <AppMobileBottomNav />
    </>
  );
}
