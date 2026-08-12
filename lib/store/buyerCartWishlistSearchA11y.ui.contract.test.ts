/**
 * Buyer Cart / Wishlist / Search a11y + empty-state UI contracts.
 * Source-level contracts — no Stripe/money/migrations.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const CART = "app/components/store/CartView.tsx";
const WISHLIST_PAGE = "app/store/wishlist/page.tsx";
const WISHLIST_BUTTON = "app/components/store/WishlistButton.tsx";
const SEARCH_FILTERS = "app/components/store/SearchFilters.tsx";
const EMPTY = "app/components/store/StoreEmptyState.tsx";

describe("buyer cart a11y contracts", () => {
  it("labels remove/clear actions and announces status updates", () => {
    const src = read(CART);
    expect(src).toMatch(
      /aria-label=\{`Remove \$\{item\.productTitle\} from cart`\}/
    );
    expect(src).toMatch(/aria-label="Clear entire cart"/);
    expect(src).toMatch(/aria-label="Cart summary"/);
    expect(src).toMatch(/role="status"[\s\S]*aria-live="polite"/);
    expect(src).toMatch(
      /aria-label=\{`Decrease quantity for \$\{item\.productTitle\}`\}/
    );
    expect(src).toMatch(
      /aria-label=\{`Increase quantity for \$\{item\.productTitle\}`\}/
    );
    expect(src).toMatch(/htmlFor=\{`qty-\$\{item\.id\}`\}/);
    expect(src).toMatch(/aria-busy=\{pending \|\| undefined\}/);
  });

  it("keeps cart empty CTA to continue shopping", () => {
    const src = read(CART);
    expect(src).toMatch(/Your cart is empty/);
    expect(src).toMatch(/actionHref=\{APP_ROUTES\.store\}/);
    expect(src).toMatch(/actionLabel="Continue shopping"/);
  });
});

describe("buyer wishlist a11y + empty contracts", () => {
  it("exposes browse CTA when favorites are empty", () => {
    const page = read(WISHLIST_PAGE);
    const empty = read(EMPTY);
    expect(empty).toMatch(/actionHref\?:/);
    expect(page).toMatch(/No favorites yet/);
    expect(page).toMatch(/actionHref=\{APP_ROUTES\.store\}/);
    expect(page).toMatch(/actionLabel="Browse the Store"/);
  });

  it("lists favorites in an accessible region", () => {
    const page = read(WISHLIST_PAGE);
    expect(page).toMatch(/aria-label="Saved favorites"/);
    expect(page).toMatch(/<ul className="grid list-none/);
    expect(page).toMatch(/<li key=\{entry\.wishlistItemId\}/);
  });

  it("announces wishlist toggle outcome to assistive tech", () => {
    const btn = read(WISHLIST_BUTTON);
    expect(btn).toMatch(/aria-pressed=\{wishlisted\}/);
    expect(btn).toMatch(/aria-busy=\{pending \|\| undefined\}/);
    expect(btn).toMatch(/aria-label=\{wishlisted \? "Remove from favorites"/);
    expect(btn).toMatch(/role="status"/);
    expect(btn).toMatch(/aria-live="polite"/);
    expect(btn).toMatch(/Saved to favorites/);
    expect(btn).toMatch(/Removed from favorites/);
    expect(btn).toMatch(/role="alert"/);
  });
});

describe("buyer search filters a11y contracts", () => {
  it("wires mobile filter disclosure and live result counts", () => {
    const src = read(SEARCH_FILTERS);
    expect(src).toMatch(/aria-label="Search filters"/);
    expect(src).toMatch(/aria-busy=\{pending \|\| undefined\}/);
    expect(src).toMatch(/aria-controls="store-search-filters-panel"/);
    expect(src).toMatch(/id="store-search-filters-panel"/);
    expect(src).toMatch(/aria-expanded=\{mobileOpen\}/);
    expect(src).toMatch(/role="status"/);
    expect(src).toMatch(/aria-live="polite"/);
    expect(src).toMatch(/htmlFor="store-search-q"/);
    expect(src).toMatch(/htmlFor="store-sort"/);
    expect(src).toMatch(/aria-pressed=\{selected\}/);
  });
});

describe("buyer PDP availability announcement contract", () => {
  it("announces stock state changes politely", () => {
    const src = read(
      "app/store/[storeSlug]/product/[productSlug]/ProductDetailClient.tsx"
    );
    expect(src).toMatch(/role="status"/);
    expect(src).toMatch(/aria-live="polite"/);
    expect(src).toMatch(/Out of stock/);
    expect(src).toMatch(/aria-label="Quantity"/);
    expect(src).toMatch(/aria-label="Product gallery"/);
  });
});
