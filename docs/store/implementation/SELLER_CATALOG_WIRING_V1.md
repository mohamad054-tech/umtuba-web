# Seller Catalog Wiring V1

Capability: `commerce.seller.catalog_wiring_v1`
Branch: `office/seller-catalog-wiring-v1`
Base: `3a4d1c4679b2e364c153e5327ed4d682f0b051f4`

## Scope

Wire Seller Experience Foundation to **real** catalog reads (media, prices, digital assets, inventory presence, physical metadata flags). No new analytics system. No migrations.

## Module

`lib/store/sellerCatalogWiring.ts` → `loadSellerCatalogHealthFacts`

Page: `app/seller/store/page.tsx` passes real `productFacts`, profile completeness, and payout visibility when available.

## Explicit non-goals

Physical engine, inventory engine redesign, shipping, refund, commission, settlement, Stripe, migrations.
