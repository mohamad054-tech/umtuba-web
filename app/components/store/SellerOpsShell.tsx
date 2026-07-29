import type { ReactNode } from "react";
import "../../components/store/storefront.css";
import AppTopNav from "../AppTopNav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";

type SellerOpsShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Wider canvas for catalog editor / dashboard. */
  wide?: boolean;
};

/** Seller-private operational shell using Commerce premium tokens (no buyer cart). */
export default function SellerOpsShell({
  title,
  subtitle,
  actions,
  children,
  wide = false,
}: SellerOpsShellProps) {
  return (
    <main
      className={`storefront-premium relative min-h-screen overflow-hidden bg-[var(--sf-bg)] text-[var(--sf-ink)] ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(214,196,161,0.07),_transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>
      <div
        className={`relative z-10 mx-auto px-4 py-6 sm:px-5 md:px-6 ${
          wide ? "max-w-5xl" : "max-w-3xl"
        }`}
      >
        <AppTopNav title={title} subtitle={subtitle} actions={actions} />
        <div className="sf-enter">{children}</div>
      </div>
    </main>
  );
}
