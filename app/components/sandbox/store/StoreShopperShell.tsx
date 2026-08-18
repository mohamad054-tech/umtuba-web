"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { AppLocale } from "../../../../lib/i18n";
import { sandboxDirection } from "../../../../lib/sandbox/i18n";
import { SANDBOX_PATH, sandboxHref } from "../../../../lib/sandbox/paths";
import { storeT } from "../../../../lib/sandbox/store/messages";
import { cartQuantity } from "../../../../lib/sandbox/store/session";
import { useStoreSession } from "./StoreSessionContext";

type Props = {
  locale: AppLocale;
  pathname: string;
  children: ReactNode;
};

const PRIMARY: { href: string; key: Parameters<typeof storeT>[1] }[] = [
  { href: sandboxHref("store"), key: "home" },
  { href: sandboxHref("store/catalog"), key: "catalog" },
  { href: sandboxHref("store/orders"), key: "orders" },
  { href: sandboxHref("store/favorites"), key: "favorites" },
];

const MORE: { href: string; key: Parameters<typeof storeT>[1] }[] = [
  { href: sandboxHref("store/seller"), key: "seller" },
  { href: sandboxHref("store/admin"), key: "admin" },
  { href: sandboxHref("store/providers"), key: "providers" },
  { href: sandboxHref("store/partners"), key: "partners" },
  { href: sandboxHref("store/economics"), key: "economics" },
  { href: sandboxHref("store/returns"), key: "returns" },
];

export default function StoreShopperShell({ locale, pathname, children }: Props) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  const { state } = useStoreSession();
  const count = cartQuantity(state);

  return (
    <main className="sandbox-preview store-market min-h-screen" dir={sandboxDirection(locale)} lang={locale}>
      <div className="sx-shell mx-auto px-[var(--sx-pad,1rem)] pb-16 pt-4 sm:px-6 md:px-8">
        <header className="sx-shop-head">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href={sandboxHref("store")} className="sx-shop-brand">
              {t("storeName")}
            </Link>
            <p className="sx-sandbox-one" role="status">
              <span className="sx-badge">{t("sandboxPill")}</span>
              <span>{t("sandboxHint")}</span>
            </p>
          </div>
          <form className="sx-search" action={sandboxHref("store/catalog")} method="get">
            <label className="sr-only" htmlFor="sandbox-store-q">
              {t("search")}
            </label>
            <input
              id="sandbox-store-q"
              name="q"
              type="search"
              placeholder={t("searchPlaceholder")}
            />
            <button type="submit">{t("search")}</button>
          </form>
          <nav className="sx-nav" aria-label={t("storeName")}>
            {PRIMARY.map((item) => {
              const current =
                item.href === sandboxHref("store")
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined}>
                  {t(item.key)}
                </Link>
              );
            })}
            <Link href={sandboxHref("store/cart")} aria-current={pathname.includes("/cart") ? "page" : undefined}>
              {t("cart")}
              {count > 0 ? <span className="sx-count">{count}</span> : null}
            </Link>
          </nav>
        </header>
        <div className="mt-8">{children}</div>
        <footer className="sx-shop-foot">
          <nav className="sx-nav" aria-label={t("admin")}>
            {MORE.map((item) => (
              <Link key={item.href} href={item.href}>
                {t(item.key)}
              </Link>
            ))}
            <Link href={SANDBOX_PATH}>{t("backHub")}</Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
