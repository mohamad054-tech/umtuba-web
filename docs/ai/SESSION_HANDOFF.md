# Session Handoff — Settlement ↔ Payout Reconciliation Surface V1

**Updated:** 2026-07-31

## Active milestone

Capability: `commerce.settlement.payout_reconciliation_surface_v1` (**APPROVED**)
Branch: `office/commerce-settlement-payout-reconciliation-surface-v1`
Worktree: `C:\Users\Admin\Desktop\umtuba\umtuba-web-non-ai-next-milestone-gate-v1`
Base tip: `747f1d51ed7052b6627be74c05b1e1ec41f02383`
Status: **PASS + STAGED** — no commit / push yet

## What landed locally

- Pure recon surface view-model + Vitest contracts
- Seller store section (aligned / issues_detected / unavailable + load older)
- Owner/manager fetch of recon list (issues-only) + summary
- Commerce + SSOT docs updated; **no migration**
- Existing payout history + balance visibility preserved

## Closed tips (do not reopen)

| Track | Tip |
| --- | --- |
| Seller Payout History Surface V1 | `747f1d5` |
| Settlement ↔ Payout Reconciliation Read V1 | `6b21075` |
| Payout Balance Visibility V1 | `af1eedd` |
| Seller Payout Read Model V1 | `66a8bed` |
| Seller Payout Foundation V1 | `aa99592` + handoff `032ac77` |

## Coordination

- Desktop owns Dashboard / Admin UI / AI Platform / Providers / Runtime / Gemini / Tutor — leave alone
- This worktree = Commerce seller-store only

## Do not

- Commit / push unless asked
- Touch Dashboard / Admin / AI
- Enable bank rails or invent the next Commerce feature without SSOT GO
