"use client";

import Link from "next/link";
import { useState } from "react";
import type { AppLocale } from "../../../../lib/i18n";
import { SANDBOX_COMMERCIAL_MODEL } from "../../../../lib/sandbox/fixtures/commercial";
import { PROSPECTIVE_COMMERCE_PARTNERS } from "../../../../lib/sandbox/fixtures/partners";
import { SANDBOX_STORE_ACTORS } from "../../../../lib/sandbox/fixtures/store";
import { effectiveRights } from "../../../../lib/sandbox/fixtures/types";
import { sandboxHref } from "../../../../lib/sandbox/paths";
import {
  listingsForActor,
  PROVIDER_MODEL_NOTES,
  STORE_LISTING_VIEWS,
} from "../../../../lib/sandbox/store/listings";
import { storeT } from "../../../../lib/sandbox/store/messages";
import { useStoreSession } from "./StoreSessionContext";
import { formatMinorUnits } from "../../../../lib/store/money";

function SellerNav({ locale }: { locale: AppLocale }) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  return (
    <nav className="sx-nav mb-4" aria-label={t("seller")}>
      <Link href={sandboxHref("store/seller")}>{t("sellerDashboard")}</Link>
      <Link href={sandboxHref("store/seller/products")}>{t("sellerProducts")}</Link>
      <Link href={sandboxHref("store/seller/analytics")}>{t("sellerAnalytics")}</Link>
      <Link href={sandboxHref("store/seller/finance")}>{t("sellerFinance")}</Link>
    </nav>
  );
}

export function StoreSeller({
  locale,
  pane,
}: {
  locale: AppLocale;
  pane: "dashboard" | "products" | "analytics" | "finance";
}) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  const { state } = useStoreSession();
  const [actorId, setActorId] = useState("demo-marketplace-seller-c");
  const actor = SANDBOX_STORE_ACTORS.find((row) => row.id === actorId) ?? SANDBOX_STORE_ACTORS[0]!;
  const listings = listingsForActor(actor.id);
  const orders = state.orders.filter((order) => order.lines.some((line) => line.actorId === actor.id));

  return (
    <div>
      <SellerNav locale={locale} />
      <label className="sx-field">
        {t("sellerProfile")}
        <select value={actorId} onChange={(event) => setActorId(event.target.value)}>
          {SANDBOX_STORE_ACTORS.map((row) => (
            <option key={row.id} value={row.id}>
              {row.displayName} · {row.kind}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">
        {actor.displayName} · {t("syntheticPreview")} · {t("noPayout")}
      </p>
      {pane === "dashboard" ? (
        <div className="sx-grid mt-4">
          <article className="sx-card">
            <h3>{t("listingsLabel")}</h3>
            <p className="text-2xl">{listings.length}</p>
          </article>
          <article className="sx-card">
            <h3>{t("sellerOrders")}</h3>
            <p className="text-2xl">{orders.length}</p>
          </article>
          <article className="sx-card">
            <h3>{t("pendingPayout")}</h3>
            <p className="text-2xl">{formatMinorUnits(0, "USD")}</p>
            <p className="text-xs">{t("noPayout")}</p>
          </article>
        </div>
      ) : null}
      {pane === "products" ? (
        <div className="sx-grid mt-4">
          {listings.map((listing) => (
            <article key={listing.product.id} className="sx-card">
              <h3>{listing.product.title}</h3>
              <p className="text-sm text-[var(--sx-muted)]">
                {listing.commerceMode} · {listing.product.category}
              </p>
              <Link href={sandboxHref(`store/products/${listing.product.slug}`)}>{t("viewOrder")}</Link>
            </article>
          ))}
        </div>
      ) : null}
      {pane === "analytics" ? (
        <div className="sx-grid mt-4">
          <article className="sx-card">
            <h3>{t("viewsDemo")}</h3>
            <p className="text-2xl">{120 + listings.length * 7}</p>
          </article>
          <article className="sx-card">
            <h3>{t("clicksDemo")}</h3>
            <p className="text-2xl">{36 + listings.length * 3}</p>
          </article>
        </div>
      ) : null}
      {pane === "finance" ? (
        <article className="sx-card mt-4">
          <h3>{t("sellerFinance")}</h3>
          <p className="mt-2 text-sm">{SANDBOX_COMMERCIAL_MODEL.payouts.reason}</p>
          <p className="mt-2">{t("pendingPayout")}: {formatMinorUnits(0, "USD")}</p>
          <p className="text-sm text-[var(--sx-muted)]">{t("noPayout")}</p>
        </article>
      ) : null}
    </div>
  );
}

export function StoreAdmin({ locale }: { locale: AppLocale }) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  const [denied, setDenied] = useState<string | null>(null);
  return (
    <div>
      <h2 className="text-2xl font-semibold">{t("adminTitle")}</h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">{t("adminBody")}</p>
      <div className="sx-grid mt-4">
        {STORE_LISTING_VIEWS.map((listing) => (
          <article key={listing.product.id} className="sx-card">
            <h3>{listing.product.title}</h3>
            <p className="text-sm">
              {listing.commerceMode} · {listing.actor.displayName} · SOURCE_TYPE=DEMO
            </p>
          </article>
        ))}
      </div>
      <h3 className="sx-section-title">{t("prospectiveTitle")}</h3>
      <div className="space-y-3">
        {PROSPECTIVE_COMMERCE_PARTNERS.map((partner) => (
          <article key={partner.id} className="sx-card">
            <div className="flex flex-wrap items-center gap-2">
              <h3>{partner.displayName}</h3>
              <span className="sx-badge">{t("statusProspective")}</span>
              <span className="sx-badge">{t("notPartner")}</span>
            </div>
            <p className="mt-2 text-sm">{t("planningOnly")}</p>
            <button
              type="button"
              className="sx-ghost mt-3"
              onClick={() => setDenied(`${partner.displayName}: ${t("activateDenied")}`)}
            >
              {t("cannotActivate")}
            </button>
          </article>
        ))}
      </div>
      {denied ? (
        <p className="sx-card mt-4" role="status">
          {denied}
        </p>
      ) : null}
    </div>
  );
}

export function StorePartners({ locale }: { locale: AppLocale }) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  return (
    <div>
      <h2 className="text-2xl font-semibold">{t("prospectiveTitle")}</h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">{t("planningOnly")}</p>
      <div className="mt-4 space-y-3">
        {PROSPECTIVE_COMMERCE_PARTNERS.map((partner) => {
          const rights = effectiveRights(partner.rights);
          return (
            <article key={partner.id} className="sx-card">
              <div className="flex flex-wrap items-center gap-2">
                <h3>{partner.displayName}</h3>
                <span className="sx-badge">{t("statusProspective")}</span>
                <span className="sx-badge">{t("notPartner")}</span>
              </div>
              <p className="mt-2 text-sm">{partner.notes}</p>
              <p className="mt-2 text-xs">
                {t("noLogo")} · {t("noCatalogImport")} · {t("unknownDeny")}
              </p>
              <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                {Object.entries(rights).map(([flag, allowed]) => (
                  <li key={flag}>
                    {flag}: {partner.rights[flag as keyof typeof partner.rights]} →{" "}
                    {allowed ? "ALLOW" : "DENY"}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function StoreProviders({ locale }: { locale: AppLocale }) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  return (
    <div>
      <h2 className="text-2xl font-semibold">{t("providerModelsTitle")}</h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">{t("providerModelsBody")}</p>
      <div className="sx-grid mt-4">
        {(Object.keys(PROVIDER_MODEL_NOTES) as Array<keyof typeof PROVIDER_MODEL_NOTES>).map((mode) => {
          const note = PROVIDER_MODEL_NOTES[mode];
          const sample = STORE_LISTING_VIEWS.find((row) => row.commerceMode === mode);
          return (
            <article key={mode} className="sx-card">
              <h3>{mode === "UMTUBA_OWNED" ? t("ownedByUmtuba") : mode}</h3>
              <p className="mt-2 text-sm">{note.owner}</p>
              <p className="mt-1 text-sm text-[var(--sx-muted)]">{note.rights}</p>
              <p className="mt-1 text-sm text-[var(--sx-muted)]">{note.fulfillment}</p>
              {sample ? (
                <p className="mt-2 text-sm">
                  <Link href={sandboxHref(`store/products/${sample.product.slug}`)}>
                    {sample.product.title}
                  </Link>
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function StoreEconomics({ locale }: { locale: AppLocale }) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  return (
    <div>
      <h2 className="text-2xl font-semibold">{t("economicsTitle")}</h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">{t("economicsDisclaimer")}</p>
      <div className="sx-grid mt-4">
        {SANDBOX_COMMERCIAL_MODEL.store.map((row) => (
          <article key={row.mode} className="sx-card">
            <h3>{row.mode}</h3>
            <p className="mt-2 text-sm">
              UMTUBA {row.umtubaSharePercent}% · actor {row.actorSharePercent}%
            </p>
            <p className="mt-1 text-sm text-[var(--sx-muted)]">{row.note}</p>
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs">{SANDBOX_COMMERCIAL_MODEL.payouts.reason}</p>
    </div>
  );
}
