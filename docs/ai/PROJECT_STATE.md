# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2` @ `6fac4409f217b6e7d28b2ff4c0a2dab453f45427`

## Active feature (this machine — Desktop)

- **Branch:** `integration/w2-commerce` (from `origin/integration/w1-revenue` @ `a1bde1f`)
- **Worktree:** `C:\Users\1\Desktop\umtuba\umtuba-web-integration-w2-commerce`
- **Task:** Integration Program V1 — Wave 2 Commerce
- **See:** `docs/ai/CURSOR_REPORT.md` · `docs/architecture/revenue/` · Commerce E2E tip `6cbe0f6`

## Closed on alpha-0.2 (do not reopen)

- Home Circular Arc Navigation Foundation V1
- Home Circular Arc Preview & Polish V1
- Home Left Action Rail Arc Alignment V1 (`302e32f`)
- Arc design locked: 7 circles, arc `[0,-6,-11,-14,-11,-6,0]`, host `left-[5px]`
- Home Assembly V1 landed on `alpha-0.2` (`6fac440`)

## Gates (unchanged)

- `HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false`
- `HOME_LOCK_ACTIVE = true`
- Preview via existing `shouldMountHomeCircularArc()` only
- Do not modify Home / Navigation / App Shell in this revenue phase
- Do not modify AI Core in this revenue phase

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

Default: Consolidation complete. Program is in **implementation**. Storefront through Marketplace Eligibility/PDP + Beta Readiness landed on dedicated branches (not merged). Do not modify frozen Commerce architecture documents. Do not delete Store docs.

### Autonomy (standing)

Routine in-scope create/update/run/mirror/report work may proceed without per-step approval **only inside the explicitly active phase**.
Paused phases must not auto-resume. Still ask before: destructive data loss, destructive prod DB, push/force-push, merge/delete branches, system-wide installs, credentials/payments, irreversible out-of-scope actions.

## Source of truth

- **GitHub origin** is the source of truth for the repository.
- Always synchronize with origin before starting work.
- Learning curriculum packages: Bootcamp / Jinn Wave path + dist importers (see Learning V1 final doc).
- Learner runtime state: UMTUBA Learning DB.

## Machines

| Machine | Role |
| --- | --- |
| **Laptop** | Primary development and integration machine |
| **Desktop** | Isolated feature worktrees (current: Revenue Platform Foundation) |

## Safety defaults

- **No commit** without explicit approval in the user request.
- **No push** without explicit approval in the user request.
- **No remote Supabase migration apply** without explicit approval.
- **No destructive Git actions** without explicit approval.
- Follow `docs/DEVELOPMENT_WORKFLOW.md`.
- Follow `docs/ai/CURRENT_TASK.md` for active handoff scope when applicable.
- Write execution results to `docs/ai/CURSOR_REPORT.md`.
- Prefer `docs/ai/SESSION_HANDOFF.md` for Learning continuity after V1 close-out.
