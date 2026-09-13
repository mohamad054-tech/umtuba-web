"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { AppLocale } from "../../../lib/i18n/locales";
import { createTranslator } from "../../../lib/i18n/translate";
import { APP_ROUTES } from "../../lib/nav";
import { useTranslation } from "../i18n";

type StoreChromeProps = {
  /** Preview override so `?dir=rtl` can force Arabic chrome without the cookie. */
  locale?: AppLocale;
};

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StoreChrome({ locale: localeOverride }: StoreChromeProps) {
  const pathname = usePathname();
  const params = useSearchParams();
  const i18n = useTranslation();
  const locale = localeOverride ?? i18n.locale;
  const t = createTranslator(locale);
  const q = params.get("q") ?? "";
  const onSearch = pathname === APP_ROUTES.storeSearch;
  const links = [
    { href: APP_ROUTES.store, label: t("store.chrome.shop"), match: "exact" as const },
    { href: APP_ROUTES.storeSearch, label: t("store.chrome.catalog"), match: "prefix" as const },
    { href: APP_ROUTES.storeWishlist, label: t("store.chrome.favorites"), match: "prefix" as const },
    { href: APP_ROUTES.storeOrders, label: t("store.chrome.orders"), match: "prefix" as const },
  ];

  return (
    <div className="sf-chrome">
      <form
        action={APP_ROUTES.storeSearch}
        method="get"
        role="search"
        className="sf-chrome__search"
      >
        <label htmlFor="store-chrome-q" className="sr-only">
          {t("store.chrome.searchLabel")}
        </label>
        <input
          id="store-chrome-q"
          name="q"
          type="search"
          defaultValue={onSearch ? q : ""}
          placeholder={t("store.chrome.searchPlaceholder")}
          className="sf-input"
          autoComplete="off"
          enterKeyHint="search"
        />
        <button type="submit" className="sf-btn sf-btn-primary shrink-0 px-3 sm:px-4">
          {t("store.chrome.search")}
        </button>
      </form>
      <nav className="sf-chrome__nav" aria-label={t("store.chrome.navAria")}>
        {links.map((link) => {
          const active = isActive(pathname, link.href, link.match);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`sf-chip ${active ? "is-active" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
