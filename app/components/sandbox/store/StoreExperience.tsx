"use client";

import type { AppLocale } from "../../../../lib/i18n";
import { getStoreListingView } from "../../../../lib/sandbox/store/listings";
import type { SandboxSection } from "../../../../lib/sandbox/paths";
import { StoreFavorites, StoreCatalog, StoreHome, StorePdp } from "./StoreBrowse";
import {
  StoreCart,
  StoreCheckout,
  StoreOrderDetail,
  StoreOrders,
  StoreReturns,
} from "./StoreCheckoutFlow";
import { StoreAdmin, StoreEconomics, StorePartners, StoreProviders, StoreSeller } from "./StoreOps";
import { StoreSessionProvider } from "./StoreSessionContext";
import StoreShopperShell from "./StoreShopperShell";

export type StoreRoute =
  | { kind: "section"; section: SandboxSection }
  | { kind: "product"; slug: string }
  | { kind: "order"; id: string };

export default function StoreExperience({
  locale,
  pathname,
  route,
  catalogQuery,
}: {
  locale: AppLocale;
  pathname: string;
  route: StoreRoute;
  catalogQuery?: { q?: string; category?: string; sort?: string };
}) {
  let body;
  if (route.kind === "product") {
    const listing = getStoreListingView(route.slug);
    body = listing ? <StorePdp locale={locale} listing={listing} /> : <p>Unknown sandbox product.</p>;
  } else if (route.kind === "order") {
    body = <StoreOrderDetail locale={locale} orderId={route.id} />;
  } else {
    switch (route.section) {
      case "store":
        body = <StoreHome locale={locale} />;
        break;
      case "store/catalog":
        body = (
          <StoreCatalog
            locale={locale}
            initialQ={catalogQuery?.q}
            initialCategory={catalogQuery?.category}
            initialSort={catalogQuery?.sort}
          />
        );
        break;
      case "store/favorites":
        body = <StoreFavorites locale={locale} />;
        break;
      case "store/cart":
        body = <StoreCart locale={locale} />;
        break;
      case "store/checkout":
        body = <StoreCheckout locale={locale} />;
        break;
      case "store/orders":
        body = <StoreOrders locale={locale} />;
        break;
      case "store/returns":
        body = <StoreReturns locale={locale} />;
        break;
      case "store/seller":
        body = <StoreSeller locale={locale} pane="dashboard" />;
        break;
      case "store/seller/products":
        body = <StoreSeller locale={locale} pane="products" />;
        break;
      case "store/seller/analytics":
        body = <StoreSeller locale={locale} pane="analytics" />;
        break;
      case "store/seller/finance":
        body = <StoreSeller locale={locale} pane="finance" />;
        break;
      case "store/admin":
        body = <StoreAdmin locale={locale} />;
        break;
      case "store/partners":
        body = <StorePartners locale={locale} />;
        break;
      case "store/providers":
        body = <StoreProviders locale={locale} />;
        break;
      case "store/economics":
        body = <StoreEconomics locale={locale} />;
        break;
      default:
        body = <StoreHome locale={locale} />;
    }
  }

  return (
    <StoreSessionProvider>
      <StoreShopperShell locale={locale} pathname={pathname}>
        {body}
      </StoreShopperShell>
    </StoreSessionProvider>
  );
}
