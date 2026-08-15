"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { APP_ROUTES } from "../../lib/nav";

const LINKS = [
  { href: APP_ROUTES.store, label: "Shop", match: "exact" as const },
  { href: APP_ROUTES.storeSearch, label: "Catalog", match: "prefix" as const },
  { href: APP_ROUTES.storeWishlist, label: "Favorites", match: "prefix" as const },
  { href: APP_ROUTES.storeOrders, label: "Orders", match: "prefix" as const },
];

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StoreChrome() {
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
          Search the store
        </label>
        <input
          id="store-chrome-q"
          name="q"
          type="search"
          defaultValue={onSearch ? q : ""}
          placeholder="Search products"
          className="sf-input"
          autoComplete="off"
          enterKeyHint="search"
        />
        <button type="submit" className="sf-btn sf-btn-primary shrink-0 px-3 sm:px-4">
          Search
        </button>
      </form>
      <nav className="sf-chrome__nav" aria-label="Store">
        {LINKS.map((link) => {
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
