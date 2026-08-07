# CURRENT_TASK

## Task

Commerce Partial Refund In-Flight Committing Visibility — controlled targeted apply of **`20260905`**.

## Status

**CLOSED** — remote apply + history registration of `20260905` succeeded; push pending/complete in this GO.

## Facts

- Branch: `office/commerce-partial-refund-in-flight-committing-visibility-v1`
- Corrective commit: `ddfc0130d12323d2549eca01527cc0d309c30bd6`
- Migration: `supabase/migrations/20260905_store_partial_refund_ledger_list_committing_v1.sql`
- Method: `npx supabase db query --linked -f` + single-version `schema_migrations` INSERT
- Learning `20260901` untouched
- No `db push`; Translation versions not applied by this operation

## Next

No further Commerce visibility apply work on this branch unless a new GO opens.
