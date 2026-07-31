# CURSOR_REPORT — Commerce Seller Payout Read Model V1

## Summary

**PASS** — Approved milestone `commerce.settlement.seller_payout_read_model_v1` implemented locally on dedicated branch. Trusted seller payout eligibility, per-currency balance summary, and newest-first history/status over Settlement RELEASED + Payout Foundation states. No bank rails. No Dashboard/AI. Migration `20260882` local only.

## Exact selected milestone

`commerce.settlement.seller_payout_read_model_v1`

## SSOT approval

Gate proposal converted to active APPROVED implementation after Product GO. Prior tip: Seller Payout Foundation closed @ `aa99592` / handoff `032ac77`.

## Exact files changed

- `supabase/migrations/20260882_store_seller_payout_read_model_v1.sql` (new)
- `lib/store/sellerPayoutReadModel.ts` (new)
- `lib/store/sellerPayoutReadModel.test.ts` (new)
- `docs/store/implementation/SELLER_PAYOUT_READ_MODEL_V1.md` (new)
- `docs/store/implementation/SELLER_PAYOUT_FOUNDATION_V1.md` (cross-link)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/SESSION_HANDOFF.md`

## Migrations created

`20260882_store_seller_payout_read_model_v1.sql` — **local only, not applied**

## Security review

- Owner/manager membership required; fail closed on auth/ownership
- Store-scoped projection; cross-store returns null / excluded
- No client money totals; per-currency buckets only
- Omits fingerprints, journals, metadata, rails, bank fields
- `bank_payouts_enabled` always false

## Tests / TypeScript / Build

See Final Verification Report.

## Open issues

- Await commit / push GO
- Await remote apply GO for `20260882`
- Broad seller payout UI still out of scope
