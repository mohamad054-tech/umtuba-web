"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslation } from "../i18n";
import { APP_ROUTES } from "../../lib/nav";
import type { TranslationKey } from "../../../lib/i18n/messages/types";

const LINKS: Array<{
  href: string;
  labelKey: TranslationKey;
  match: "exact" | "prefix";
}> = [
  { href: APP_ROUTES.store, labelKey: "store.chrome.shop", match: "exact" },
  { href: APP_ROUTES.storeSearch, labelKey: "store.chrome.catalog", match: "prefix" },
  { href: APP_ROUTES.storeWishlist, labelKey: "store.chrome.favorites", match: "prefix" },
  { href: APP_ROUTES.storeOrders, labelKey: "store.chrome.orders", match: "prefix" },
];

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StoreChrome() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const onSearch = pathname === APP_ROUTES.storeSearch;

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
          {t("store.chrome.searchSubmit")}
        </button>
      </form>
      <nav className="sf-chrome__nav" aria-label={t("store.chrome.navAria")}>
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href, link.match);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`sf-chip ${active ? "is-active" : ""}`}
            >
              {t(link.labelKey)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
