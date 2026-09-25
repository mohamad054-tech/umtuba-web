"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { shouldShowMobileBottomNav } from "../lib/nav";
import AppMobileBottomNav from "./AppMobileBottomNav";
import DesktopSideNav from "./chrome/DesktopSideNav";
import ReferralClaimBootstrap from "./ReferralClaimBootstrap";
import SiteFooter from "./site/SiteFooter";
import { FeedMuteProvider } from "./video/FeedMuteProvider";

/**
 * Shared chrome: desktop side menu from the small-screen breakpoint up,
 * mobile bottom bar below it. Home hides the site footer.
 */
export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const showSide = shouldShowMobileBottomNav(pathname);

  return (
    <FeedMuteProvider>
      <ReferralClaimBootstrap />
      {showSide ? <DesktopSideNav /> : null}
      <div className={showSide ? "sm:ps-[5.25rem]" : ""}>{children}</div>
      <SiteFooter />
      <AppMobileBottomNav />
    </FeedMuteProvider>
  );
}
