# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2`

## Learning chapter status

**Learning V1 is officially APPROVED and FROZEN** (2026-07-27).

Official close-out document: `docs/learning/UMTUBA_LEARNING_V1_FINAL.md`
Session continuity: `docs/ai/SESSION_HANDOFF.md`

Frozen baselines (extend, do not replace):

- Wave A production baseline (JA-01 / JA-02 / JA-03)
- Nexus Learning Architecture
- Nexus Design System
- Nexus V2 Premium Experience
- Portfolio / Certification / AI Assistant integration models

## Active academy priority

**Save point 2026-07-28 (Cursor Pro → Ultra restart).** Full state: `docs/ai/SESSION_HANDOFF.md`.

| Track | Status |
| --- | --- |
| Wave B content | CLOSED |
| Learning UX / Nexus | FROZEN |
| Course Import & E2E V1 | PAUSED |
| Commerce Research V1.1 | APPROVED |
| Commerce Experience Architecture V1.1 | FROZEN |
| Commerce Visual Design Foundation V1 | FROZEN |
| Commerce Information Architecture V1 | FROZEN |
| Commerce Design System Foundation V1 | FROZEN |
| Commerce Product Architecture Foundation V1 | FROZEN |
| Commerce Business Architecture Foundation V1 | **FROZEN** |
| Commerce Domain Model Foundation V1 | **FROZEN** |
| Commerce Technical Architecture Foundation V1 | **FROZEN** |
| Commerce Data Architecture Foundation V1 | **FROZEN** |
| Commerce Application Architecture Foundation V1 | **FROZEN** |
| Commerce Integration Architecture Foundation V1 | **FROZEN** |
| Commerce Security Architecture Foundation V1 | **FROZEN** |
| Commerce Operational Architecture Foundation V1 | **FROZEN** |
| Commerce Platform Architecture Foundation V1 | **FROZEN** |
| Commerce Enterprise Architecture Foundation V1 | **FROZEN** |
| Commerce Reference Architecture Foundation V1 | **FROZEN** |
| Commerce Architecture Manifesto V1 | **FROZEN** |
| Commerce Architecture Program | **COMPLETE** |
| Physical Commerce Inventory Solution Architecture V1 | **FROZEN** |
| Physical Commerce Warehouse & Fulfillment Solution Architecture V1 | **FROZEN** |
| Physical Commerce Order Fulfillment Solution Architecture V1 | **FROZEN** |
| Commerce Consolidation Report V1 | **COMPLETE** |
| Commerce Premium Storefront Experience Foundation V1 | **COMPLETE** (branch `office/commerce-premium-storefront-experience-foundation-v1`) |
| Commerce Premium Cart and Checkout Experience V1 | **COMPLETE** (branch `office/commerce-premium-cart-checkout-experience-v1`) |
| Commerce Premium Buyer Orders Experience V1 | **COMPLETE** (branch `office/commerce-premium-buyer-orders-experience-v1`) |
| Commerce Premium Seller Orders Operations Experience V1 | **COMPLETE** (branch `office/commerce-premium-seller-orders-operations-v1`) |
| Commerce Premium Seller Catalog & Product Management V1 | **COMPLETE** (branch `office/commerce-premium-seller-catalog-product-management-v1`) |
| Commerce Premium Seller Inventory & Reservation Visibility V1 | **COMPLETE** (branch `office/commerce-premium-seller-inventory-reservation-visibility-v1`) |
| Commerce Premium Seller Dashboard & Operational Insights V1 | **COMPLETE** (branch `office/commerce-premium-seller-dashboard-insights-v1`) |
| Commerce Trading Domain Alignment & Integrity V1 | **COMPLETE** (branch `office/commerce-trading-domain-alignment-integrity-v1`) |
| Commerce Revenue Ledger Bridge Foundation V1 | **COMPLETE** (branch `office/commerce-revenue-ledger-bridge-foundation-v1`) |
| Commerce Marketplace Supplier-to-Seller Foundation V1 | **COMPLETE** (branch `office/commerce-marketplace-supplier-seller-foundation-v1`) |
| Commerce Marketplace Eligibility & Listing Storefront Resolution V1 | **COMPLETE** (branch `office/commerce-marketplace-eligibility-listing-storefront-v1`) |
| Commerce End-to-End Beta Readiness V1 | **COMPLETE** (branch `office/commerce-end-to-end-beta-readiness-v1`) — **Ready for Beta** @ 90% implemented scope |
| Commerce Digital Entitlement Revoke on Refund V1 | **COMPLETE** — migration `20260889` remote-applied |
| Commerce Commission Decomposition Bridge Apply V1 | **COMPLETE** — migration `20260890` remote-applied |
| Commerce Commission Policy Activation V1 | **COMPLETE** — migration `20260891` remote-applied |
| Commerce SoT Unification + Stock Drift V1 | **COMPLETE** — branch `office/commerce-sot-unification-stock-drift-v1` @ base `91e90e4`; remote stock/Wave A/money chain applied |
| Commerce Wave A Remainder Remote Apply | **COMPLETE** — `20260885–88` remote |
| Commerce Commission Policy Seed + Activate V1 | **COMPLETE** — `umtuba_launch_usd_v1` v1 active USD 15%/85% |
| Commerce Stripe Production Gate Readiness Audit V1 | **COMPLETE** — code READY; host live env **NOT_READY_FOR_STRIPE_LIVE_TEST** |
| Commerce Final Handoff Documentation + Push V1 | **COMPLETE** — `docs/store/operations/COMMERCE_CURRENT_STATE_2026-08-02.md` |
| Commerce Chain Verification & Migration Apply Readiness V1 | **COMPLETE** (branch `office/commerce-chain-migration-apply-readiness-v1-current`) — repository `READY_FOR_SEPARATE_REMOTE_APPLY_GO` @ `c473630` |
| Commerce Chain Remote Migration Preflight V1 | **COMPLETE** (branch `office/commerce-remote-migration-preflight-v1-current` @ `2dc6dfd`) — historical preflight; superseded by applied remote chain |
| Commerce Remote Migration Blocker Remediation Planning V1 | **COMPLETE** (branch `office/commerce-remote-migration-blocker-remediation-v1` @ `ac49585`) — historical |
| Commerce Migration History Drift Verification V1 | **COMPLETE historically** — `20260822`+`20260823` registered remotely |

Default: Commerce remote foundations closed through `20260895` + active USD commission. Next: external Stripe live env → gate audit → E2E → then consider confirm. Do not modify frozen Commerce architecture documents. Do not delete Store docs.

### Autonomy (standing)

Routine in-scope create/update/run/mirror/report work may proceed without per-step approval **only inside the explicitly active phase**.
Paused phases must not auto-resume. Still ask before: destructive data loss, destructive prod DB, push/force-push, merge/delete branches, system-wide installs, credentials/payments, irreversible out-of-scope actions.

## Commerce source of truth (desktop-only)

- **Worktree:** `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-sot-unification-stock-drift-v1`
- **Active Commerce branch:** `office/commerce-sot-unification-stock-drift-v1`
- **Base implementation HEAD:** `91e90e456971f498b7b8f9382dda9b609da7ef3d` (docs commit may be tip)
- **Unified from:** money tip `9fb7a05` + 20 inventory-only cherry-picks through `a06800f`
- Desktop is the **sole active Commerce workstation**. Laptop Commerce work is **stopped** (laptop → Learning)
- Remote project: `umtuba` / `tgucwnjwoyeqoxqaxmew`
- Remote migrations verified: `20260822/23/24/77/84–95`
- Active commission: `umtuba_launch_usd_v1` v1 · USD · 1500/8500 · merchandise_net
- Keep `commerce_confirm_enabled = 0` until Stripe E2E PASS + explicit GO
- Do **not** seed another commission policy without an explicit commercial GO
- Canonical checkpoint: `docs/store/operations/COMMERCE_CURRENT_STATE_2026-08-02.md`

## Source of truth

- **GitHub origin** is the source of truth for the repository.
- Always synchronize with origin before starting work.
- Learning curriculum packages: Bootcamp / Jinn Wave path + dist importers (see Learning V1 final doc).
- Learner runtime state: UMTUBA Learning DB.

## Machines

| Machine | Role |
| --- | --- |
| **Desktop** | Sole active Commerce workstation |
| **Laptop** | Learning only — Commerce work stopped |

## Multi-machine rules

1. Always run before starting:
   - `git fetch --prune`
   - `git pull --ff-only` (on the current branch when behind and fast-forward is possible)
2. Never let two machines modify the **same feature** simultaneously.
3. If `origin` has diverged and fast-forward is impossible: **stop** — do not merge, rebase, reset, stash, or force push without explicit human instructions.

## Safety defaults

- **No commit** without explicit approval in the user request.
- **No push** without explicit approval in the user request.
- **No remote Supabase migration apply** without explicit approval.
- **No destructive Git actions** (force push, hard reset, etc.) without explicit approval.
- Follow `docs/DEVELOPMENT_WORKFLOW.md` for Git, migrations, and push policy.
- Follow `docs/ai/CURRENT_TASK.md` for the active handoff scope.
- Write execution results to `docs/ai/CURSOR_REPORT.md`.
- Prefer `docs/ai/SESSION_HANDOFF.md` for Learning continuity after V1 close-out.
