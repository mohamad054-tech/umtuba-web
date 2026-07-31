# Session Handoff — Seller Payout History Surface V1

**Updated:** 2026-07-31

## Active milestone

Capability: `commerce.settlement.seller_payout_history_surface_v1` (**APPROVED**)
Branch: `office/commerce-settlement-seller-payout-history-surface-v1`
Worktree: `C:\Users\Admin\Desktop\umtuba\umtuba-web-non-ai-next-milestone-gate-v1`
Base tip: `6b210755925bbf4e0f1be753e080fc409896c6a0`
Status: **PASS + STAGED** — no commit / push yet

## What landed locally

- Pure history view-model + Vitest contracts
- Seller store section (empty / unavailable / ready + load older)
- Wired owner/manager fetch of `get_my_seller_payouts`
- Commerce + SSOT docs updated; **no migration**

## Closed tips (do not reopen)

| Track | Tip |
| --- | --- |
| Settlement ↔ Payout Reconciliation Read V1 | `6b21075` |
| Payout Balance Visibility V1 | `af1eedd` |
| Seller Payout Read Model V1 | `66a8bed` |
| Seller Payout Foundation V1 | `aa99592` + handoff `032ac77` |

## Coordination

- Desktop owns Dashboard / Admin UI / AI Platform / Providers / Runtime / Gemini / Tutor — leave alone
- This worktree = Commerce seller-facing only

## Do not

- Commit / push unless asked
- Touch Dashboard / Admin / AI
- Enable bank rails or invent the next Commerce feature without SSOT GO
