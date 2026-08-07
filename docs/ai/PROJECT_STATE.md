# UMTUBA Project State (AI Handoff)

## CURRENT LAPTOP SOURCE OF TRUTH (2026-08-03 reboot save)

| Item | Value |
| --- | --- |
| Branch | `office/collaboration-workspace-settings-lifecycle-ui-v1` |
| Remote | `origin/office/collaboration-workspace-settings-lifecycle-ui-v1` |
| Commit | `6b60205dfb01168552ff6344523ec3e8b22eb70e` |
| Worktree | `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1` |

### Closed on laptop

- Learning AI Tutor Learner UI Integration V1 — `c3168ef`
- Collaboration Workspace Spine Foundation V1 — `321e7e8` (remote `20260896`)
- Collaboration Workspace Membership Runtime V1 — `c3bf87e` (remote `20260897`)
- Collaboration Workspace UI Foundation V1 — `cfd8a28` (flag default=false)
- Collaboration Workspace Settings & Lifecycle UI V1 — `6b60205` (migration `20260917` in git; **remote DB NOT APPLIED**)

### Next on laptop

Human GO: apply `20260917` **or** gate next Collaboration milestone (TBD).

### Commerce on laptop

**Owned by desktop — do not touch.**

See also: `docs/ai/CURRENT_TASK.md`, `docs/ai/SESSION_HANDOFF.md`, `docs/ai/CURSOR_REPORT.md`, `docs/ai/LAPTOP_REBOOT_SAVEPOINT.md`.

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`office/collaboration-workspace-settings-lifecycle-ui-v1` (laptop SoT; historical note: `alpha-0.2` remains a long-lived integration branch)

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
| **Laptop** | Primary development and integration machine |
| **Desktop** | May perform isolated review / testing tasks only |

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
