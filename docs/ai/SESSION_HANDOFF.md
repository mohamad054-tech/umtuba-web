# Session Handoff — Settlement ↔ Payout Reconciliation Read V1

**Updated:** 2026-07-31

## Active milestone

Capability: `commerce.settlement.payout_reconciliation_read_v1` (**APPROVED**)
Branch: `office/commerce-settlement-payout-reconciliation-read-v1`
Worktree: `C:\Users\Admin\Desktop\umtuba\umtuba-web-non-ai-next-milestone-gate-v1`
Base tip: `af1eedd2eadd06fa7ad8beba76ce90d91d5d3b40`
Status: **PASS + STAGED** — no commit / push / remote apply yet

## What landed locally

- SQL migration `20260883` — list + summary reconciliation RPCs
- TS pure reconcile + parsers + RPC wrappers
- Vitest contracts covering mismatch classes, pagination, auth surface, migration text
- Commerce + AI SSOT docs updated

## Closed tips (do not reopen)

| Track | Tip |
| --- | --- |
| Payout Balance Visibility V1 | `af1eedd` |
| Seller Payout Read Model V1 | `66a8bed` |
| Seller Payout Foundation V1 | `aa99592` + handoff `032ac77` |

## Coordination

- Desktop owns Dashboard / Admin UI / AI Platform / Providers / Runtime / Gemini / Tutor — leave alone
- This worktree = Commerce only

## Do not

- Commit / push / remote-apply unless asked
- Touch Dashboard / Admin / AI
- Enable bank rails or invent the next Commerce feature without SSOT GO
