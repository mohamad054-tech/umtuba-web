# Current Task

## Milestone

Seller Live Payout Provider V1 — **Slice S7** (seller live payout UI)

## Status

`s7-closed` — seller destination form + request controls + eligibility/revenue bridge wiring + contract tests; **committed + pushed** on close; no migrations; S8 not started

## Branch / worktree

- Branch: `office/commerce-seller-live-payout-provider-v1`
- Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-seller-live-payout-provider-v1`
- S6 tip / S7 base: `253552fa58dd7c1a3bf660cfae5d7e630cc9fffb`

## S7 scope closed

Created:
- `app/components/store/SellerPayoutDestinationForm.tsx`
- `app/components/store/SellerPayoutRequestButton.tsx`

Modified:
- `app/components/store/SellerPayoutEligibility.tsx`
- `app/components/store/SellerDashboardInsights.tsx`
- `app/seller/store/page.tsx`
- `lib/store/sellerPayoutEligibilitySurface.ts`
- `lib/store/sellerPayoutEligibilitySurface.test.ts`
- `lib/store/commerceRevenueBridge.ts`
- `lib/store/commerceRevenueBridge.test.ts`
- `lib/store/sellerLivePayout/ui.contract.test.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Explicit non-actions

No S8 · no admin UI · no migrations · no remote apply · no Stripe payment / commerce_confirm / UEOS SQL changes · no server action changes

## Next (not this GO)

Slice S8 — docs/closeout (explicit GO only)
