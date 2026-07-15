"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { APP_NAV_ITEMS, APP_ROUTES, isNavActive } from "../lib/nav";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";
import WalletBalanceIndicator from "./wallet/WalletBalanceIndicator";

type AppTopNavProps = {
  title: string;
  badge?: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
};

export default function AppTopNav({
  title,
  badge,
  subtitle,
  actions,
}: AppTopNavProps) {
  const pathname = usePathname();

  return (
    <header className="relative z-50 border-b border-white/10 bg-[#050510]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-2 px-3 md:gap-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <Link
            href={APP_ROUTES.home}
            className="watch-focus-ring shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            UMTUBA
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-300">
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
          aria-label="Primary"
          className="hidden items-center gap-1 sm:flex sm:gap-2 md:gap-2"
        >
          {APP_NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`watch-focus-ring rounded-full px-2.5 py-1.5 text-[11px] font-bold transition sm:px-3 sm:text-xs ${
                  active
                    ? "border border-blue-400/30 bg-blue-500/15 text-blue-100"
                    : "border border-transparent text-white/45 hover:border-white/10 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
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
          <WalletBalanceIndicator />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

