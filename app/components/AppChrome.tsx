"use client";

import type { ReactNode } from "react";
import AppMobileBottomNav from "./AppMobileBottomNav";
import ReferralClaimBootstrap from "./ReferralClaimBootstrap";
import SiteFooter from "./site/SiteFooter";

/**
 * Global chrome that mounts mobile primary navigation without duplicating
 * AppTopNav's desktop primary links.
 */
export default function AppChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <ReferralClaimBootstrap />
      {children}
      <SiteFooter />
      <AppMobileBottomNav />
    </>
  );
}
