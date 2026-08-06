# Session Handoff

## Active milestone

Commerce Partial Refund In-Flight Committing Visibility V1

Verdict: **`COMMERCE_PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_V1_CLOSED`**

## Source of truth

- Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-in-flight-committing-visibility-v1`
- Branch: `office/commerce-partial-refund-in-flight-committing-visibility-v1`
- Base: `8e16c8c108d418457ccdcbeb2ed542cca4d30472`
- Doc: `docs/store/implementation/PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_V1.md`

## Facts

- Privileged read-only RPC: `list_store_partial_refund_ledger_committing`
- Local migration **`20260901`** — **not** remote-applied
- Remote tip remains **`20260900`** until a separate apply GO
- Admin visibility only; recovery remains separate explicit action
- Stuck-committing recovery V1 remains **CLOSED** @ `8e16c8c`

## Next

Separate GO required to remote-apply `20260901`. Do not auto-start money/provider/compensation milestones.
