"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, type ReactNode } from "react";
import { APP_ROUTES } from "../lib/nav";
import UmtubaStackedLogo from "./brand/UmtubaStackedLogo";
import { useTranslation } from "./i18n";
import UserMenu from "./UserMenu";
import WalletBalanceIndicator from "./wallet/WalletBalanceIndicator";

type AppTopNavProps = {
  title: string;
  badge?: ReactNode;
  subtitle?: string;
  subtitleHelp?: string;
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
  subtitleHelp,
  actions,
  sticky = true,
  appearance = "default",
  embedded = false,
}: AppTopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const store = appearance === "store";
  const searchActive =
    pathname === APP_ROUTES.search ||
    pathname.startsWith(`${APP_ROUTES.search}/`);

  const focusRing =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0a93b]";

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const query = String(data.get("q") ?? "").trim();
    const href = query
      ? `${APP_ROUTES.search}?q=${encodeURIComponent(query)}`
      : APP_ROUTES.search;
    router.push(href);
  }

  return (
    <header
      className={`relative z-50 border-b border-white/10 backdrop-blur-xl ${
        store ? "bg-transparent" : "bg-[#050510]/80"
      } ${sticky ? "sticky top-0" : ""}`}
    >
      <div
        className={`flex min-h-14 items-center gap-2 py-2 md:gap-3 ${
          embedded ? "w-full min-w-0 px-0" : "mx-auto w-full px-3 md:px-4"
        }`}
      >
        <Link
          href={APP_ROUTES.home}
          aria-label={t("nav.homeAria")}
          className={`watch-focus-ring shrink-0 rounded-md ${focusRing}`}
        >
            <span className="inline-flex h-9 items-center sm:hidden">
              <UmtubaStackedLogo size="nav" priority className="!h-9 !w-auto" />
            </span>
            <span className="hidden sm:inline-block">
              <UmtubaStackedLogo size="header" priority />
            </span>
        </Link>
        <h1 className="sr-only">{title}</h1>
        {badge ? <div className="hidden min-w-0 sm:block">{badge}</div> : null}
        {subtitle ? (
          <p
            className="app-top-nav-subtitle hidden max-w-[10rem] truncate text-xs font-medium sm:block"
            title={subtitleHelp}
          >
            {subtitle}
          </p>
        ) : null}

        <form
          role="search"
          onSubmit={onSearch}
          className="mx-auto hidden min-w-0 max-w-xl flex-1 sm:block"
        >
          <label className="sr-only" htmlFor="umtuba-header-search">
            {t("actions.search")}
          </label>
          <input
            id="umtuba-header-search"
            name="q"
            type="search"
            placeholder={t("actions.search")}
            className="h-10 w-full rounded-full border border-white/15 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-[var(--app-ink-placeholder)] focus:border-[#f0a93b]/70"
          />
        </form>

        <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {actions}
          <WalletBalanceIndicator tone="gold" guestShowsZero celebrateIncrease />
          <Link
            href={APP_ROUTES.createVideo}
            className={`watch-focus-ring hidden rounded-full bg-[#f0a93b] px-3 py-1.5 text-xs font-black text-[#0c1842] sm:inline-flex ${focusRing}`}
          >
            {t("home.upload")}
          </Link>
          <Link
            href={APP_ROUTES.search}
            aria-label={t("actions.search")}
            aria-current={searchActive ? "page" : undefined}
            className={`watch-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#f0a93b]/40 text-[#f0a93b] sm:hidden ${focusRing}`}
          >
            <span aria-hidden>⌕</span>
          </Link>
          <span className="hidden sm:contents">
            <UserMenu />
          </span>
        </div>
      </div>
    </header>
  );
}
