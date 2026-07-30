-- =============================================================================
-- UMTUBA Commerce — Marketplace Listing Provenance Hardening V1
-- Migration: 20260875_store_marketplace_listing_provenance_hardening_v1.sql
--
-- Persists optional seller_listing_id on wishlist rows so favorites reload can
-- resolve the reseller storefront PDP instead of silently falling back to the
-- supplier-owned store. No checkout/payment/shipping/commission changes.
-- Local file only — do NOT remote-apply without explicit approval.
-- =============================================================================

alter table public.store_wishlist_items
  add column if not exists seller_listing_id uuid
  references public.store_seller_listings (id) on delete set null;

comment on column public.store_wishlist_items.seller_listing_id is
  'Optional marketplace listing provenance for wishlist→PDP. When set, reload must resolve the seller storefront listing path; never invent a different listing.';

create index if not exists store_wishlist_items_seller_listing_id_idx
  on public.store_wishlist_items (seller_listing_id)
  where seller_listing_id is not null;
