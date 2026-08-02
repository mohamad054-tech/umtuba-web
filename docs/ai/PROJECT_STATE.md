# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2`

## Learning chapter status

**Learning Desktop active (2026-08-03).** Curriculum V1 close-out remains approved; post-V1 foundations continue on office Learning branches.

- Session continuity: `docs/ai/SESSION_HANDOFF.md`
- Current snapshot: `docs/learning/operations/LEARNING_CURRENT_STATE_2026-08-03.md`
- SoT branch: `office/learning-collaboration-workspace-activity-timeline-foundation-v1`
- Completion **82%** · Launch readiness **52%** · Launch gate **FAIL**
- Next milestone: **Learning Production Smoke & E2E Gate V1** (no new features before gate)
- Remote Learning migrations through `20260897` applied/registered; AI Tutor chain closed
- Commerce remains **frozen** on Desktop

Frozen baselines (extend, do not replace):

- Wave A production baseline (JA-01 / JA-02 / JA-03)
- Nexus Learning Architecture
- Nexus Design System
- Nexus V2 Premium Experience
- Portfolio / Certification / AI Assistant integration models

## Active academy priority

**Save point 2026-08-03 (Learning handoff).** Full state: `docs/ai/SESSION_HANDOFF.md` + `docs/learning/operations/LEARNING_CURRENT_STATE_2026-08-03.md`.

| Track | Status |
| --- | --- |
| Wave B content | CLOSED |
| Learning UX / Nexus | FROZEN (baselines) |
| Learning post-V1 foundations (catalog→workspace→AI Tutor remote) | **ACTIVE on Desktop** |
| Learning Production Smoke & E2E Gate V1 | **NEXT** |
| Course Import & E2E V1 | PAUSED (superseded directionally by Smoke Gate) |
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
| UMTUBA AI Core Platform Foundation V1 | **COMPLETE** (branch `office/ai-core-platform-foundation-v1`) |

Default: Consolidation complete. Commerce beta-ready on dedicated branches (not merged). Shared AI Core Platform Foundation landed on `office/ai-core-platform-foundation-v1` (not merged). Do not modify frozen Commerce architecture documents. Do not delete Store docs.

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
| **Desktop** | Active Learning workstation (Commerce frozen here) |
| **Laptop** | Do not dual-write Learning unless reassigned |

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
