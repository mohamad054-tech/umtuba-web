# SESSION_HANDOFF

## Closed milestone

**Commerce Partial Refund In-Flight Committing Visibility V1** — code + corrective renumber + controlled remote apply of **`20260905`**.

## Branch / commits

| Item | Value |
| --- | --- |
| Branch | `office/commerce-partial-refund-in-flight-committing-visibility-v1` |
| Feature tip | `a3c155be99722b5ef2734f33ba98676c140c2d7c` |
| Corrective renumber | `ddfc0130d12323d2549eca01527cc0d309c30bd6` |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-in-flight-committing-visibility-v1` |

## Remote after apply (2026-08-07)

| Version | Name | Notes |
| --- | --- | --- |
| 20260900 | `store_partial_refund_ledger_rpc_v1` | Commerce (prior) |
| 20260901 | `learning_lesson_notes_foundation_v1` | Learning — untouched |
| 20260902 | `translation_intelligence_foundation_v1` | Present after concurrent remote activity (not this op) |
| 20260905 | `store_partial_refund_ledger_list_committing_v1` | **This operation** |
| 20260910 | `translation_studio_persistence_workflow_v1` | Present after concurrent remote activity (not this op) |

## Execution

1. Phase 1 gate PASS against tip `20260901` (Learning).
2. Targeted SQL apply of `20260905` via `db query --linked -f` (`CREATE OR REPLACE` rebind of orphan RPC).
3. History register `20260905` only.
4. Verify: one history row, RPC signature/jsonb/SECURITY DEFINER/committing filter, grants service_role.

## Verdict

`COMMERCE_PARTIAL_REFUND_20260905_CONTROLLED_TARGETED_APPLY` → **CLOSED**
