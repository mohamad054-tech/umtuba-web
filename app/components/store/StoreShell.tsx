import "./storefront.css";
import { Suspense, type ReactNode } from "react";
import AppTopNav from "../AppTopNav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import CartIconButton from "./CartIconButton";
import StoreChrome from "./StoreChrome";

type StoreShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
};

export default function StoreShell({
  title,
  subtitle,
  actions,
  children,
  wide = true,
}: StoreShellProps) {
  return (
    <main
      className={`storefront-premium relative min-h-screen bg-[var(--sf-bg)] text-[var(--sf-ink)] ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <a href="#store-main" className="sf-skip-link watch-focus-ring">
        Skip to store content
      </a>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(214,196,161,0.08),_transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="sf-masthead sticky top-0 z-50">
        <div
          className={`relative z-10 mx-auto px-4 sm:px-5 md:px-8 ${
            wide ? "max-w-7xl" : "max-w-3xl"
          }`}
        >
          <AppTopNav
            sticky={false}
            embedded
            appearance="store"
            title={title}
            subtitle={subtitle}
            actions={
              <>
                {actions}
                <CartIconButton />
              </>
            }
          />
          <Suspense
            fallback={
              <div className="sf-chrome mb-2 h-14 animate-pulse" aria-hidden />
            }
          >
            <div className="pb-2">
              <StoreChrome />
            </div>
          </Suspense>
        </div>
      </div>

      <div
        className={`relative z-10 mx-auto px-4 pb-6 sm:px-5 md:px-8 ${
          wide ? "max-w-7xl" : "max-w-3xl"
        }`}
      >
        <div id="store-main" className="sf-enter" tabIndex={-1}>
          {children}
        </div>
      </div>
    </main>
  );
}
