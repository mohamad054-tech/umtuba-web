"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  VISUAL_CATEGORIES,
  VISUAL_DEMO_FINANCIAL,
  VISUAL_DEMO_NOTICE,
  VISUAL_ORDERS,
  VISUAL_PRODUCTS,
  VISUAL_REVIEWS,
  VISUAL_SELLERS,
  discountPct,
  findProduct,
  findSeller,
  formatUsd,
  productsForSeller,
  type VisualProduct,
} from "../../../lib/store/visualDemo/data";
import {
  parseVisualDemoRoute,
  visualDemoHref,
  withLocale,
  type VisualDemoRoute,
  type VisualSurfaceLabel,
} from "../../../lib/store/visualDemo/paths";
import { VisualArt } from "./VisualArt";

function labelFor(route: VisualDemoRoute): VisualSurfaceLabel {
  if (route.kind === "returns" || route.kind === "reviews" || route.kind === "analytics") {
    return "FUNCTIONAL_WIRING_PENDING";
  }
  return "VISUAL_DEMO";
}

const COPY = {
  en: {
    notice: VISUAL_DEMO_NOTICE,
    search: "Search Harbor Pulse, jackets, notebooks…",
    marketplace: "UMTUBA Marketplace",
    add: "Add to cart",
    checkout: "Continue to checkout",
    pay: "Record order — no charge",
    pending: "Wiring pending — visual spec only",
  },
  ar: {
    notice: "عرض بصري محلي — ليس مخزوناً حقيقياً ولا دفعاً حياً ولا بائعاً معتمداً.",
    search: "ابحث عن المنتجات والعلامات…",
    marketplace: "سوق أمتوبا",
    add: "أضف إلى السلة",
    checkout: "متابعة إلى الدفع",
    pay: "تسجيل الطلب — بدون تحصيل",
    pending: "مواصفات بصرية فقط — الربط الوظيفي معلّق",
  },
};

export function VisualDemoApp({
  segments,
  hl,
}: {
  segments?: string[];
  hl: "en" | "ar";
}) {
  const route = parseVisualDemoRoute(segments);
  const t = COPY[hl];
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({ "aurora-buds": 1 });
  const [sheet, setSheet] = useState<string | null>(null);
  const [payNote, setPayNote] = useState("");

  const href = (path: string) => withLocale(path, hl);
  const add = (slug: string) =>
    setCart((c) => ({ ...c, [slug]: (c[slug] ?? 0) + 1 }));

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([slug, qty]) => {
          const product = findProduct(slug);
          return product ? { product, qty } : null;
        })
        .filter((row): row is { product: VisualProduct; qty: number } => Boolean(row)),
    [cart]
  );
  const cartTotal = cartItems.reduce((sum, row) => sum + row.product.priceMinor * row.qty, 0);

  return (
    <div className="vd-shell">
      <div className="vd-banner">
        <div>
          <span
            className={`vd-chip ${
              labelFor(route) === "FUNCTIONAL_WIRING_PENDING" ? "vd-chip-pending" : "vd-chip-demo"
            }`}
          >
            {labelFor(route)}
          </span>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--vd-muted)]">{t.notice}</p>
        </div>
        <Link className="vd-btn" href={href(visualDemoHref.cart)}>
          Cart · {cartItems.reduce((n, r) => n + r.qty, 0)}
        </Link>
      </div>

      <nav className="vd-nav" aria-label="Visual demo">
        <Link href={href(visualDemoHref.home)}>Home</Link>
        <Link href={href(visualDemoHref.watch)}>Watch</Link>
        <Link href={href(visualDemoHref.becomeSeller)}>Become a Seller</Link>
        <Link href={href(visualDemoHref.sellerCenter)}>Seller Center</Link>
        <Link href={href(visualDemoHref.orders)}>Orders</Link>
        <Link href={href(visualDemoHref.returns)}>Returns</Link>
        <Link href={href(visualDemoHref.reviews)}>Reviews</Link>
        <Link href={href(visualDemoHref.analytics)}>Analytics</Link>
        <Link href={hl === "ar" ? visualDemoHref.home : `${visualDemoHref.home}?hl=ar`}>
          العربية
        </Link>
        <Link href={visualDemoHref.home}>EN</Link>
      </nav>

      {route.kind === "home" ? (
        <Home hl={hl} query={query} setQuery={setQuery} href={href} />
      ) : null}
      {route.kind === "product" ? (
        <Pdp slug={route.slug} t={t} href={href} onAdd={add} />
      ) : null}
      {route.kind === "cart" ? (
        <Cart rows={cartItems} total={cartTotal} href={href} t={t} />
      ) : null}
      {route.kind === "checkout" ? (
        <Checkout total={cartTotal} t={t} payNote={payNote} setPayNote={setPayNote} />
      ) : null}
      {route.kind === "sellerStore" ? <SellerStore slug={route.slug} href={href} /> : null}
      {route.kind === "becomeSeller" ? <BecomeSeller /> : null}
      {route.kind === "sellerCenter" ? <SellerCenter href={href} /> : null}
      {route.kind === "addProduct" ? <AddProduct /> : null}
      {route.kind === "orders" ? <Orders /> : null}
      {route.kind === "returns" ? <Returns t={t} /> : null}
      {route.kind === "reviews" ? <Reviews t={t} /> : null}
      {route.kind === "analytics" ? <Analytics t={t} /> : null}
      {route.kind === "watch" ? (
        <Watch href={href} t={t} sheet={sheet} setSheet={setSheet} onAdd={add} />
      ) : null}
      {route.kind === "unknown" ? (
        <p className="mt-8 text-sm text-[var(--vd-muted)]">Unknown visual-demo surface.</p>
      ) : null}
    </div>
  );
}

function Home({
  query,
  setQuery,
  href,
}: {
  hl: "en" | "ar";
  query: string;
  setQuery: (v: string) => void;
  href: (path: string) => string;
}) {
  const filtered = VISUAL_PRODUCTS.filter((p) =>
    `${p.title} ${p.category} ${p.sellerSlug}`.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <>
      <section className="vd-hero">
        <div>
          <p className="vd-kicker">UMTUBA · Night Market</p>
          <h1 className="vd-title">Objects with a signal. Sellers with a name.</h1>
          <p className="max-w-xl text-sm leading-6 text-[var(--vd-muted)]">
            A premium marketplace prototype in navy, violet, and electric blue — fictional UMTUBA-native
            houses, not a clone of anyone else’s aisle.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link className="vd-btn vd-btn-primary" href={href(visualDemoHref.product("aurora-buds"))}>
              Open a featured piece
            </Link>
            <Link className="vd-btn" href={href(visualDemoHref.becomeSeller)}>
              Become a Seller
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-[1.3rem] border border-[var(--vd-line)]">
          <VisualArt hue={226} motif="orb" title="Featured" />
        </div>
      </section>
      <input
        className="vd-search mt-5"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Harbor Pulse, jackets, notebooks…"
      />
      <div className="vd-grid vd-cats mt-4">
        {VISUAL_CATEGORIES.map((c) => (
          <div key={c} className="vd-panel px-2 py-3 text-center text-[11px] font-bold">
            {c}
          </div>
        ))}
      </div>
      <h2 className="mt-7 text-xl font-black tracking-tight">In the room tonight</h2>
      <div className="vd-grid vd-products mt-3">
        {filtered.map((p) => (
          <ProductTile key={p.slug} product={p} href={href} />
        ))}
      </div>
    </>
  );
}

function ProductTile({
  product,
  href,
}: {
  product: VisualProduct;
  href: (path: string) => string;
}) {
  const seller = findSeller(product.sellerSlug);
  const off = discountPct(product);
  return (
    <Link className="vd-card" href={href(visualDemoHref.product(product.slug))}>
      <VisualArt hue={product.hue} motif={product.motif} title={product.title} />
      <div className="space-y-1 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--vd-faint)]">
          {seller?.name} · {product.category}
        </p>
        <h3 className="text-sm font-extrabold">{product.title}</h3>
        <p>
          <span className="vd-price">{formatUsd(product.priceMinor)}</span>
          {product.compareAtMinor ? (
            <span className="vd-compare">{formatUsd(product.compareAtMinor)}</span>
          ) : null}
          {off ? <span className="ms-2 text-xs text-[var(--vd-ok)]">−{off}%</span> : null}
        </p>
        <p className="text-xs text-[var(--vd-muted)]">
          {product.rating.toFixed(1)} · {product.reviewCount} reviews
        </p>
      </div>
    </Link>
  );
}

function Pdp({
  slug,
  t,
  href,
  onAdd,
}: {
  slug: string;
  t: (typeof COPY)["en"];
  href: (path: string) => string;
  onAdd: (slug: string) => void;
}) {
  const product = findProduct(slug);
  if (!product) return <p className="mt-6">Unknown demo product.</p>;
  const seller = findSeller(product.sellerSlug);
  const reviews = VISUAL_REVIEWS.filter((r) => r.productSlug === slug);
  return (
    <section className="mt-4 grid gap-5 md:grid-cols-2">
      <div className="overflow-hidden rounded-[1.5rem] border border-[var(--vd-line)]">
        <VisualArt hue={product.hue} motif={product.motif} title={product.title} />
      </div>
      <div>
        <p className="vd-kicker">{product.category}</p>
        <h1 className="vd-title text-[2.2rem]">{product.title}</h1>
        <p className="text-sm text-[var(--vd-muted)]">{product.blurb}</p>
        <p className="mt-4">
          <span className="text-2xl vd-price">{formatUsd(product.priceMinor)}</span>
          {product.compareAtMinor ? (
            <span className="vd-compare text-base">{formatUsd(product.compareAtMinor)}</span>
          ) : null}
        </p>
        <p className="mt-2 text-sm">
          {product.rating.toFixed(1)} · {product.reviewCount} · {product.stock} in demo stock
        </p>
        {seller ? (
          <Link className="mt-3 inline-block text-sm font-bold text-[var(--vd-cyan)]" href={href(visualDemoHref.sellerStore(seller.slug))}>
            {seller.name} · {seller.trust}
          </Link>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="vd-btn vd-btn-primary" type="button" onClick={() => onAdd(product.slug)}>
            {t.add}
          </button>
          <Link className="vd-btn" href={href(visualDemoHref.cart)}>
            {t.checkout}
          </Link>
        </div>
        <div className="mt-6 space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="vd-panel text-sm">
              <p className="font-bold">
                {r.name} · {r.rating}.0
              </p>
              <p className="mt-1 text-[var(--vd-muted)]">{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cart({
  rows,
  total,
  href,
  t,
}: {
  rows: { product: VisualProduct; qty: number }[];
  total: number;
  href: (path: string) => string;
  t: (typeof COPY)["en"];
}) {
  return (
    <section className="mt-5 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-3">
        {rows.map(({ product, qty }) => (
          <div key={product.slug} className="vd-panel flex gap-3">
            <div className="w-28 overflow-hidden rounded-xl">
              <VisualArt hue={product.hue} motif={product.motif} title={product.title} />
            </div>
            <div>
              <h2 className="font-extrabold">{product.title}</h2>
              <p className="text-sm text-[var(--vd-muted)]">Qty {qty}</p>
              <p className="vd-price">{formatUsd(product.priceMinor * qty)}</p>
            </div>
          </div>
        ))}
      </div>
      <aside className="vd-panel h-fit">
        <p className="vd-kicker">Bag</p>
        <p className="mt-2 text-3xl font-black">{formatUsd(total)}</p>
        <Link className="vd-btn vd-btn-primary mt-4 w-full" href={href(visualDemoHref.checkout)}>
          {t.checkout}
        </Link>
      </aside>
    </section>
  );
}

function Checkout({
  total,
  t,
  payNote,
  setPayNote,
}: {
  total: number;
  t: (typeof COPY)["en"];
  payNote: string;
  setPayNote: (v: string) => void;
}) {
  return (
    <section className="mt-5 grid gap-4 md:grid-cols-2">
      <div className="vd-panel">
        <p className="vd-kicker">Ship to</p>
        <h2 className="mt-2 text-2xl font-black">Demo address book</h2>
        <p className="mt-2 text-sm text-[var(--vd-muted)]">
          18 Nile View · Alexandria · fictional buyer profile
        </p>
      </div>
      <div className="vd-panel">
        <p className="vd-kicker">Payment presentation</p>
        <p className="mt-2 text-xs text-[var(--vd-warn)]">
          {VISUAL_DEMO_FINANCIAL.REAL_PAYMENT_CAPTURE} · {VISUAL_DEMO_FINANCIAL.PAYMENT_PROVIDER_CONNECTED}
        </p>
        <div className="vd-pay mt-4">
          {["Visa / Mastercard", "Apple Pay", "Google Pay", "PayPal"].map((method) => (
            <button key={method} className="vd-btn w-full" type="button">
              <span>{method}</span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--vd-faint)]">
                Not connected
              </span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-2xl font-black vd-price">{formatUsd(total)}</p>
        <button
          className="vd-btn vd-btn-primary mt-3 w-full"
          type="button"
          onClick={() =>
            setPayNote("Order stays unpaid. Capture disabled. No provider charged.")
          }
        >
          {t.pay}
        </button>
        {payNote ? <p className="mt-3 text-sm text-[var(--vd-ok)]">{payNote}</p> : null}
      </div>
    </section>
  );
}

function SellerStore({
  slug,
  href,
}: {
  slug: string;
  href: (path: string) => string;
}) {
  const seller = findSeller(slug);
  if (!seller) return <p className="mt-6">Unknown demo seller.</p>;
  return (
    <section className="mt-4">
      <div className="vd-hero">
        <div>
          <p className="vd-kicker">{seller.city}, {seller.country}</p>
          <h1 className="vd-title">{seller.name}</h1>
          <p className="text-sm text-[var(--vd-muted)]">{seller.tagline}</p>
          <p className="mt-3 text-sm font-bold text-[var(--vd-cyan)]">{seller.trust}</p>
        </div>
        <VisualArt hue={seller.hue} motif="wave" title={seller.name} />
      </div>
      <div className="vd-grid vd-products mt-4">
        {productsForSeller(slug).map((p) => (
          <ProductTile key={p.slug} product={p} href={href} />
        ))}
      </div>
    </section>
  );
}

function BecomeSeller() {
  return (
    <section className="mx-auto mt-5 max-w-xl vd-panel">
      <p className="vd-kicker">Become a Seller</p>
      <h1 className="vd-title text-[2rem]">Open a house on UMTUBA</h1>
      <p className="text-sm text-[var(--vd-muted)]">
        Visual wizard only. Submitting here does not create a production application or fake approval.
      </p>
      <label className="mt-4 block text-xs font-bold">Store name</label>
      <input className="vd-search mt-1" defaultValue="Harbor Pulse Atelier" />
      <label className="mt-3 block text-xs font-bold">City</label>
      <input className="vd-search mt-1" defaultValue="Alexandria" />
      <button className="vd-btn vd-btn-primary mt-4" type="button">
        Save visual draft
      </button>
    </section>
  );
}

function SellerCenter({ href }: { href: (path: string) => string }) {
  return (
    <section className="mt-5">
      <p className="vd-kicker">Seller Center</p>
      <h1 className="vd-title text-[2.2rem]">Harbor Pulse desk</h1>
      <p className="text-sm text-[var(--vd-muted)]">
        Demo workspace. Not an approved production seller session.
      </p>
      <div className="vd-grid mt-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
        {[
          ["Tonight", "$412"],
          ["Open orders", "3"],
          ["Low stock", "2"],
          ["Payout", "DISABLED"],
        ].map(([k, v]) => (
          <div key={k} className="vd-panel">
            <p className="text-xs text-[var(--vd-faint)]">{k}</p>
            <p className="mt-1 text-2xl font-black">{v}</p>
          </div>
        ))}
      </div>
      <div className="vd-nav">
        <Link href={href(visualDemoHref.addProduct)}>Add product</Link>
        <Link href={href(visualDemoHref.orders)}>Orders</Link>
        <Link href={href(visualDemoHref.returns)}>Returns</Link>
        <Link href={href(visualDemoHref.reviews)}>Reviews</Link>
        <Link href={href(visualDemoHref.analytics)}>Analytics</Link>
      </div>
    </section>
  );
}

function AddProduct() {
  return (
    <section className="mx-auto mt-5 max-w-xl vd-panel">
      <p className="vd-kicker">Catalog</p>
      <h1 className="vd-title text-[2rem]">Add a piece</h1>
      <input className="vd-search mt-4" defaultValue="Aurora Buds Midnight" />
      <input className="vd-search mt-2" defaultValue="89.00" />
      <textarea
        className="vd-search mt-2 min-h-28 rounded-2xl py-3"
        defaultValue="Visual-only listing. Does not persist to Supabase."
      />
      <button className="vd-btn vd-btn-primary mt-4" type="button">
        Save visual listing
      </button>
    </section>
  );
}

function Orders() {
  return (
    <section className="mt-5 space-y-3">
      <h1 className="vd-title text-[2rem]">Seller orders</h1>
      {VISUAL_ORDERS.map((o) => (
        <div key={o.id} className="vd-panel flex justify-between gap-3">
          <div>
            <p className="font-black">{o.id}</p>
            <p className="text-sm text-[var(--vd-muted)]">
              {o.productTitle} · {o.buyer}
            </p>
          </div>
          <div className="text-end">
            <p className="text-xs uppercase tracking-widest">{o.status}</p>
            <p className="vd-price">{formatUsd(o.amountMinor)}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function Returns({ t }: { t: (typeof COPY)["en"] }) {
  return (
    <section className="mt-5 vd-panel">
      <span className="vd-chip vd-chip-pending">FUNCTIONAL_WIRING_PENDING</span>
      <h1 className="vd-title mt-3 text-[2rem]">Returns concept</h1>
      <p className="text-sm text-[var(--vd-muted)]">{t.pending}</p>
      <div className="mt-4 rounded-2xl border border-dashed border-[var(--vd-warn)] p-4">
        <p className="font-bold">VD-1021 · Margin Field Notebook</p>
        <p className="text-sm text-[var(--vd-muted)]">Reason: arrived with a bent corner. Refund not executed.</p>
        <button className="vd-btn mt-3" type="button">
          Approve return visually
        </button>
      </div>
    </section>
  );
}

function Reviews({ t }: { t: (typeof COPY)["en"] }) {
  return (
    <section className="mt-5 vd-panel">
      <span className="vd-chip vd-chip-pending">FUNCTIONAL_WIRING_PENDING</span>
      <h1 className="vd-title mt-3 text-[2rem]">Reviews concept</h1>
      <p className="text-sm text-[var(--vd-muted)]">{t.pending}</p>
      {VISUAL_REVIEWS.map((r) => (
        <div key={r.id} className="mt-3 rounded-2xl bg-white/5 p-3">
          <p className="font-bold">
            {r.name} · {r.rating}.0 · {r.productSlug}
          </p>
          <p className="text-sm text-[var(--vd-muted)]">{r.text}</p>
        </div>
      ))}
    </section>
  );
}

function Analytics({ t }: { t: (typeof COPY)["en"] }) {
  return (
    <section className="mt-5">
      <span className="vd-chip vd-chip-pending">FUNCTIONAL_WIRING_PENDING</span>
      <h1 className="vd-title mt-3 text-[2rem]">Analytics concept</h1>
      <p className="text-sm text-[var(--vd-muted)]">{t.pending} · payout {VISUAL_DEMO_FINANCIAL.REAL_SELLER_PAYOUT}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[["Views", "18.4k"], ["Conversion", "2.1%"], ["Demo GMV", "$4.2k"]].map(([k, v]) => (
          <div key={k} className="vd-panel">
            <p className="text-xs text-[var(--vd-faint)]">{k}</p>
            <p className="text-3xl font-black">{v}</p>
          </div>
        ))}
      </div>
      <div className="vd-panel mt-3 h-40 bg-[linear-gradient(180deg,rgba(106,76,255,0.25),transparent)]" />
    </section>
  );
}

function Watch({
  href,
  t,
  sheet,
  setSheet,
  onAdd,
}: {
  href: (path: string) => string;
  t: (typeof COPY)["en"];
  sheet: string | null;
  setSheet: (v: string | null) => void;
  onAdd: (slug: string) => void;
}) {
  const product = findProduct("aurora-buds")!;
  return (
    <section className="mx-auto mt-4 max-w-sm">
      <div
        className="vd-watch-stage"
        style={{
          background:
            "radial-gradient(circle at 40% 30%, rgba(106,76,255,0.55), transparent 42%), linear-gradient(180deg,#12224a,#061018)",
        }}
      >
        <p className="absolute start-4 top-4 text-xs font-bold">Watch · Harbor Pulse studio</p>
        <button
          className="vd-chip-float vd-btn vd-btn-primary"
          type="button"
          onClick={() => setSheet(product.slug)}
        >
          {product.title} · {formatUsd(product.priceMinor)}
        </button>
      </div>
      {sheet ? (
        <div className="vd-sheet">
          <p className="font-black">{product.title}</p>
          <p className="text-sm text-[var(--vd-muted)]">{product.blurb}</p>
          <div className="mt-3 flex gap-2">
            <Link className="vd-btn vd-btn-primary" href={href(visualDemoHref.product(product.slug))}>
              Open PDP
            </Link>
            <button className="vd-btn" type="button" onClick={() => onAdd(product.slug)}>
              {t.add}
            </button>
            <button className="vd-btn" type="button" onClick={() => setSheet(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
