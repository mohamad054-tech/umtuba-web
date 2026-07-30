-- =============================================================================
-- UMTUBA Commerce — Seller Digital Product Asset Upload V1
-- Migration: 20260879_store_seller_digital_product_asset_upload_v1.sql
-- Local file only — do NOT remote-apply without explicit approval.
-- =============================================================================
-- Expands private store-product-media MIME allow-list so sellers can upload
-- digital deliverables under the owned .../digital/{uuid}.{ext} path contract.
-- Does not change public bucket flag, size limit (10 MB), or table RLS grants.
-- Asset pointer writes remain service-role app-layer after editor authorization.

update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/epub+zip',
    'audio/mpeg',
    'video/mp4',
    'video/webm',
    'text/plain'
  ]
where id = 'store-product-media';

comment on table public.store_digital_product_assets is
  'Primary digital deliverable pointer per product. Seller attach is app-authorized; buyer access is entitlement-gated. Not a CDN.';
