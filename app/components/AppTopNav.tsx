"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { desktopNavLabelKey } from "../../lib/i18n";
import { APP_NAV_ITEMS, APP_ROUTES, isNavActive } from "../lib/nav";
import ActivityTierIndicator from "./activity-tiers/ActivityTierIndicator";
import { useTranslation } from "./i18n";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";
import WalletBalanceIndicator from "./wallet/WalletBalanceIndicator";

type AppTopNavProps = {
  title: string;
  badge?: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  /** Sticky chrome (default). Pass false for surfaces that manage their own sticky wrapper. */
  sticky?: boolean;
  /**
   * Visual treatment only. `store` keeps the same routes, auth, and account
   * chrome while aligning contrast with the storefront gold identity.
   */
  appearance?: "default" | "store";
  /** Skip inner max-width/padding when a parent already frames the chrome. */
  embedded?: boolean;
};

export default function AppTopNav({
  title,
  badge,
  subtitle,
  actions,
  sticky = true,
  appearance = "default",
  embedded = false,
}: AppTopNavProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const store = appearance === "store";
  const searchActive =
    pathname === APP_ROUTES.search ||
    pathname.startsWith(`${APP_ROUTES.search}/`);

  const focusRing = store
    ? "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(232,215,181,0.7)]"
    : "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300/60";

  return (
    <header
      className={`relative z-50 border-b backdrop-blur-xl ${
        store
          ? "border-b-0 bg-transparent"
          : "border-white/10 bg-[#050510]/90"
      } ${sticky ? "sticky top-0" : ""}`}
    >
      <div
        className={`flex min-h-16 items-center justify-between gap-2 md:gap-4 ${
          store ? "h-auto min-h-16 py-1.5" : "h-16"
        } ${
          embedded
            ? "w-full min-w-0 px-0"
            : "mx-auto max-w-[1400px] px-3 md:px-6"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <Link
            href={APP_ROUTES.home}
            aria-label={t("nav.homeAria")}
            className={`watch-focus-ring shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${focusRing} ${
              store
                ? "border-[rgba(214,196,161,0.28)] bg-[rgba(214,196,161,0.08)] text-[var(--sf-accent-strong,#e8d7b5)] hover:bg-[rgba(214,196,161,0.16)]"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            UMTUBA
          </Link>
          <div className={`min-w-0 ${store ? "hidden sm:block" : ""}`}>
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.3em] ${
                store ? "text-[var(--sf-accent,#d6c4a1)]" : "text-blue-300"
              }`}
            >
              UMTUBA
            </p>
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-black tracking-tight">
                {title}
              </h1>
              {badge}
            </div>
          </div>
        </div>

        <nav
          aria-label={t("nav.primary")}
          className={`hidden min-w-0 items-center gap-0.5 ${
            store ? "lg:flex lg:gap-1.5" : "sm:flex md:gap-1.5"
          }`}
        >
          {APP_NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href);
            const label = t(desktopNavLabelKey(item.href));
            const ariaLabel =
              item.href === APP_ROUTES.home ? t("nav.umLifeAria") : label;

            return (
              <Link
                key={`${item.label}:${item.href}`}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={ariaLabel}
                className={`watch-focus-ring whitespace-nowrap rounded-full px-1.5 py-1.5 text-[10px] font-bold transition sm:px-2 sm:text-[11px] md:px-2.5 md:text-xs ${focusRing} ${
                  active
                    ? store
                      ? "border border-[rgba(214,196,161,0.35)] bg-[rgba(214,196,161,0.12)] text-[var(--sf-accent-strong,#e8d7b5)]"
                      : "border border-blue-400/30 bg-blue-500/15 text-blue-100"
                    : store
                      ? "border border-transparent text-white/50 hover:border-[rgba(214,196,161,0.2)] hover:bg-white/5 hover:text-[var(--sf-ink,#f4f1ea)]"
                      : "border border-transparent text-white/45 hover:border-white/10 hover:bg-white/5 hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {actions}
          {subtitle ? (
            <p className="hidden text-xs font-medium text-white/40 xl:block">
              {subtitle}
            </p>
          ) : null}
          <Link
            href={APP_ROUTES.search}
            aria-label={t("actions.search")}
            aria-current={searchActive ? "page" : undefined}
            className={`watch-focus-ring rounded-full border px-2.5 py-1.5 text-xs font-bold transition ${focusRing} ${
              store ? "hidden md:inline-flex" : ""
            } ${
              searchActive
                ? store
                  ? "border-[rgba(214,196,161,0.4)] bg-[rgba(214,196,161,0.14)] text-[var(--sf-accent-strong,#e8d7b5)]"
                  : "border-sky-400/35 bg-sky-500/15 text-sky-50"
                : store
                  ? "border-[rgba(214,196,161,0.18)] bg-white/5 text-white/65 hover:bg-white/10 hover:text-[var(--sf-ink,#f4f1ea)]"
                  : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {t("nav.search")}
          </Link>
          <span className={store ? "hidden sm:contents" : undefined}>
            <ActivityTierIndicator />
            <WalletBalanceIndicator />
          </span>
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
