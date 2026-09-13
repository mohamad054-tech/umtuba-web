# DESKTOP-A3 — Dirty WIP / Cross-Device Final Disposition V1

| Field | Value |
| --- | --- |
| AGENT_ID | DESKTOP-A3 |
| WAVE_ID | `DESKTOP_FINAL_LOCAL_CLOSEOUT_WAVE_3_V1` |
| TASK_ID | `DESKTOP_A3_DIRTY_WIP_FINAL_DISPOSITION_V1` |
| DEVICE | DESKTOP |
| Generated | 2026-08-12 13:54–14:05 +03:00 |
| Workspace | `C:\Users\1\Desktop\umtuba\umtuba-web` |
| Method | Live rediscovery after `git fetch --all --prune` (web); Mobile fetch+probe; porcelain dirty recount; non-destructive classify + handoff packets only |
| Baseline | `DESKTOP_CLOSEOUT_WAVE_2_V1.md` + `DESKTOP_A3_STATE_DRIFT_ORPHAN_TRIAGE_CLOSEOUT_V1.md` |
| Safety | No discard / force-push / reset / clean / WT deletion; no Learning/Collaboration feature work; no Mobile sync executed; `_port_extract` **UNTOUCHED** |

## Live inventory (Wave 3 recalculated)

| Metric | Wave 2 | Wave 3 live | Delta |
| --- | --- | --- | --- |
| Checkouts | 121 | **121** | 0 |
| Dirty (status `--porcelain`) | 13 | **13** | 0 (same set) |
| Detached HEADs | 23 | **23** | 0 |
| Branched, no upstream | 11 | **11** | 0 |
| Ahead of configured upstream | 0 | **0** | 0 |
| Behind configured upstream | 3 | **3** | 0 |
| `origin/alpha-0.2` | `e84475a…` | `e84475a769c731bb7e1ad511b3543ee714d2feea` | unchanged |
| Primary HEAD | `7ed9159…` | `7ed9159f62d6a82d1999b19ef9d1df9a63c09de9` | unchanged (0/0 vs feature origin) |

Supporting artifacts:

- `DESKTOP_A3_W3_worktree_list_porcelain.txt`
- `DESKTOP_A3_W3_inventory_summary.json`
- `DESKTOP_A3_W3_dirty.json`
- `DESKTOP_A3_W3_detached.json`
- `DESKTOP_A3_W3_behind.json` / `DESKTOP_A3_W3_no_upstream.json` (from probe pass)

**Note:** A content-diff-only recount briefly reported dirty=12 because smoke WT shows `M .gitignore` in porcelain with **empty** `git diff` (CRLF/index ghost). Porcelain is authoritative → **13**.

---

## Disposition legend (exact classes)

`ACTIVE_VALID_WIP` · `COMPLETE_NEEDS_COMMIT` · `COMPLETE_NEEDS_PUSH` · `COMPLETE_NEEDS_CENTRAL_INTEGRATION` · `SUPERSEDED` · `DUPLICATE` · `WRONG_UPSTREAM` · `PROTECTED` · `NEEDS_OPERATOR_DECISION`

Primary class listed first; secondary tags in Notes when multiple apply.

---

## Dirty worktrees (13) — final disposition matrix

| # | Path (short) | Branch / HEAD | Dirty shape | **Class** | Owner | Notes |
| --- | --- | --- | ---: | --- | --- | --- |
| 1 | `umtuba-web` (primary) | `office/profile-hero-completeness-v1` @ `7ed9159` | 0S / 4U / closeout UT | **ACTIVE_VALID_WIP** | Desktop closeout → Central for residual | Dirty = Wave2/3 handoff docs under `docs/ai/*` + `docs/ops/closeout/` (+ nested `worktrees/` listing). Feature tip itself **pushed 0/0**. Product `3b88b01` already on alpha; residual `7ed9159` workflow rule → **COMPLETE_NEEDS_CENTRAL_INTEGRATION** (see Profile Hero packet; SAFE_MERGE). |
| 2 | `…-collaboration-learning-link-unlink-local-e2e-v1` | `office/collaboration-learning-link-unlink-local-e2e-desktop-v1` @ `be5d836` | ~106U + mass D + UT harness | **WRONG_UPSTREAM** + **ACTIVE_VALID_WIP** + **NEEDS_OPERATOR_DECISION** | Laptop / Collaboration | Upstream mis-pointed to `origin/office/collaboration-workspace-settings-lifecycle-ui-v1` (**0/16**); **no** `origin/…-desktop-v1`. Mass `supabase/migrations` deletes + local e2e stubs/backup + debug login scripts. **Do not develop on Desktop.** → handoff packet. |
| 3 | `…-collaboration-login-nav-reverif-v1` | `office/collaboration-local-link-unlink-fixture-rpc-browser-e2e-followup-v1` @ `188423d` | 1U + `test-results/` | **NEEDS_OPERATOR_DECISION** | Laptop / Collaboration | Artifact-only (`CURSOR_REPORT` + Playwright `test-results/`). No product WIP signal. Preserve; no Desktop cleanup. |
| 4 | `…-commerce-partial-refund-provider-money-execution-v1` | `office/commerce-partial-refund-provider-money-execution-v1` @ `4291bdb` | **3 staged** `_port_extract/*` | **PROTECTED** | Desktop freeze / Central aware | Staged: `streaming-feature.patch`, `streaming.test.ts`, `streaming.ts`. Also **0/17** behind own origin. **Never unstage/clean.** `PORT_EXTRACT_TOUCHED=NO`. |
| 5 | `…-learning-collaboration-smoke-e2e-readiness-v1` | `office/learning-collaboration-smoke-e2e-readiness-v1` @ `616d4f7` | porcelain `M .gitignore` only | **NEEDS_OPERATOR_DECISION** | Laptop / Learning | Empty content diff (line-ending ghost). Not real feature WIP. |
| 6 | `…-learning-…-activity-timeline-foundation-v1` | `office/learning-collaboration-workspace-activity-timeline-foundation-v1` @ `9478258` | 12 UT smoke/e2e | **COMPLETE_NEEDS_COMMIT** | Laptop / Learning | Untracked `lib/learning/*Smoke*` + `scripts/learning-e2e|smoke`. Branch synced 0/0 with origin; WIP not committed. Not on this branch HEAD / not verified on alpha. → Learning handoff. |
| 7 | `…-learning-…-attachments-foundation-v1` | `office/learning-collaboration-workspace-attachments-foundation-v1` @ `67cf30f` | 2 junk UT filenames | **NEEDS_OPERATOR_DECISION** | Laptop / Learning | Accidental shell-fragment filenames (`tatus -sb`, truncated “pace attachments…”). Not product WIP. |
| 8 | `…-learning-instructor-browser-e2e-foundation-v1` | `office/learning-instructor-browser-e2e-foundation-v1` @ `525c046` | 14U + 4UT | **ACTIVE_VALID_WIP** | Laptop / Learning | Substantial instructor browser e2e (app instructor pages, scripts, e2e journey, docs). **No upstream** (origin same-name missing). Tip **25/188** vs alpha. → handoff packet. |
| 9 | `…-private-ai-workflow-lifecycle-v1` | **detached** `db6f52a` | **19 staged** | **SUPERSEDED** | Central / AI | Lifecycle **already ported on alpha** as `6219633` (`feat(ai): port private AI workflow lifecycle onto alpha lineage`). Staged migration blob ≠ alpha (`fd67ab5` vs `199cbb5`); treat staged index as regressive orphan. Aligns with A2 Wave 3. Preserve; do not commit/reset on Desktop. |
| 10 | `…-shared-ai-surface-integration-v1` | **detached** `db6f52a` | **28 staged** | **DUPLICATE** + **SUPERSEDED** (private portion) + **NEEDS_OPERATOR_DECISION** | Central / AI | Twin of #11. Private-lifecycle subset superseded by alpha `6219633`. Shared-AI lineage also advanced on alpha (`e84475a` reconcile). Residual staged-only paths (e.g. `sharedAiSurfaceIntegration.test.ts` absent from alpha tip) need Central audit — not Desktop WIP. |
| 11 | `…-shared-ai-surface-integration-v1-clean` | **detached** `db6f52a` | **28 staged** | **DUPLICATE** of #10 | Central / AI | `git write-tree` identical to #10 (`d4e6a8e…`). |
| 12 | `umtuba-web/worktrees/DESKTOP-A2` | `office/commerce-buyer-cart-wishlist-search-a11y-ui-contract-v1` @ `9227cc3` | 5U + 1UT | **ACTIVE_VALID_WIP** | Desktop Commerce (A1/A2 lane) | Buyer cart/wishlist/search a11y contract. No upstream. Base tip `9227cc3` = Commerce Stripe fixture tip (**not** on alpha). Preserve. |
| 13 | `worktrees/DESKTOP-A3` | `office/desktop-a3-commerce-seller-ops-filter-status-a11y-contract-v1` @ `9227cc3` | 8U + 1UT | **ACTIVE_VALID_WIP** | Desktop Commerce (A3 lane) | Seller ops filter/status a11y contract. No upstream. Same Commerce base. Preserve. |

### `_port_extract`

| Item | Value |
| --- | --- |
| Location | `#4` commerce-partial-refund WT |
| State | 3 paths **staged**; frozen |
| Class | **PROTECTED** |
| Wave 3 actions | **none** |
| `PORT_EXTRACT_TOUCHED` | **NO** |

---

## Detached worktrees (23) — final disposition

| Path (leaf) | HEAD | Dirty | On alpha? | **Class** | Notes |
| --- | --- | --- | --- | --- | --- |
| `umtuba-staging-deploy-e84475a` | `e84475a` | 0 | YES | **SUPERSEDED** | Exact live alpha tip checkout; no unique work. |
| `umtuba-web-ai-audit-readonly` | `9e90448` | 0 | NO | **COMPLETE_NEEDS_CENTRAL_INTEGRATION** | AI audit tip; reachable from some learning remotes historically; not alpha. Preserve. |
| `umtuba-web-ai-usage-quotas-billing-foundation-v1` | `70dbc5f` | 0 | NO | **COMPLETE_NEEDS_CENTRAL_INTEGRATION** | AI billing foundation tip off alpha. |
| `umtuba-web-commerce-partial-refund-in-flight-committing-visibility-v1` | `556f82a` | 0 | NO | **SUPERSEDED** | Contained in later `origin/office/commerce-partial-refund-*` remotes. |
| `umtuba-web-commerce-partial-refund-ledger-commit-boundary-v1` | `6a332c4` | 0 | NO | **SUPERSEDED** | Same office refund chain (remote-contained). |
| `umtuba-web-commerce-partial-refund-ledger-service-adapter-v1` | `6a2420e` | 0 | NO | **SUPERSEDED** | Office refund chain. |
| `umtuba-web-commerce-partial-refund-path-v1` | `c902eb9` | 0 | NO | **SUPERSEDED** | Office refund chain. |
| `umtuba-web-commerce-partial-refund-reservation-accounting-audit-review-v1` | `1919241` | 0 | NO | **SUPERSEDED** | Office refund chain. |
| `umtuba-web-commerce-partial-refund-reservation-actions-wiring-v1` | `5d4bf18` | 0 | NO | **SUPERSEDED** | Office refund chain. |
| `umtuba-web-commerce-partial-refund-reservation-stuck-committing-recovery-v1` | `8e16c8c` | 0 | NO | **SUPERSEDED** | Office refund chain. |
| `umtuba-web-commerce-seller-live-payout-manual-ops-drill-v1` | `6b1dc29` | 0 | NO | **SUPERSEDED** | Contained under later commerce office remotes. |
| `umtuba-web-commerce-seller-payout-rails-v1` | `9a93fc9` | 0 | NO | **COMPLETE_NEEDS_CENTRAL_INTEGRATION** | On integration/office remotes; **not** alpha. Commerce integration train. |
| `umtuba-web-gemini-live-provider-v1` | `30bda6a` | 0 | NO | **COMPLETE_NEEDS_CENTRAL_INTEGRATION** | Gemini live provider tip off alpha. |
| `umtuba-web-private-ai-deployment-runtime-v1` | `cf3de8d` | 0 | NO | **SUPERSEDED** | Earlier private-AI chain vs later finals. |
| `umtuba-web-private-ai-inference-execution-boundary-v1` | `14ce7fd` | 0 | NO | **SUPERSEDED** | Earlier private-AI chain. |
| `umtuba-web-private-ai-inference-request-contracts-v1` | `ba0cca4` | 0 | NO | **SUPERSEDED** | Earlier private-AI chain. |
| `umtuba-web-private-ai-provider-routing-policy-v1` | `53637d8` | 0 | NO | **SUPERSEDED** | Earlier private-AI chain. |
| `umtuba-web-private-ai-runtime-operations-failover-v1` | `517cff5` | 0 | NO | **SUPERSEDED** | Earlier private-AI chain. |
| `umtuba-web-private-ai-workflow-lifecycle-v1` | `db6f52a` | 19 | NO | **SUPERSEDED** | Dirty staged (see dirty #9); alpha port `6219633` is SoT. |
| `umtuba-web-private-ai-workflow-lifecycle-v1-final` | `eb9e743` | 0 | NO | **SUPERSEDED** | Tip SHA itself not on alpha, but migration blob matches alpha/`6219633` (`199cbb5`). Historical final superseded by alpha port. |
| `umtuba-web-shared-ai-surface-integration-v1` | `db6f52a` | 28 | NO | **DUPLICATE** + **NEEDS_OPERATOR_DECISION** | Dirty #10. |
| `umtuba-web-shared-ai-surface-integration-v1-clean` | `db6f52a` | 28 | NO | **DUPLICATE** | Identical index tree to shared dirty. |
| `umtuba-web-shared-ai-surface-integration-v1-final` | `b0655bb` | 0 | NO | **SUPERSEDED** + **NEEDS_OPERATOR_DECISION** | Tip SHA not on alpha; shared AI core later reconciled on alpha (`e84475a`). Keep for Central audit of any unique residual vs tip. |

---

## Unpushed tips

| Branch | Tip | On any `origin/*`? | On alpha? | Unique vs alpha | **Disposition** |
| --- | --- | --- | --- | --- | --- |
| `backup/office-live-insert-96dfd1` | `96dffd1712699e841a4774a7a1a9e733a2ee4511` | **NO** | NO | 1 commit; live insert notify fix (4 files) | **SUPERSEDED** (intent landed on alpha as `e9c0454df7551b79a5732e6c912ba3de11cf9b86` same subject) + **NEEDS_OPERATOR_DECISION** only if patch-id delta must be audited (`patch-id` **differs**; file-level drift in test/lib/migration). **Do not push as new product** without Central audit. Keep backup branch. |
| `office/learning-spaces-membership-foundation-v1` | `8975352c4b2a157d30ed90c47ac6daa266c38266` | **NO** | NO | 1 commit; 5 files (+2163) spaces/membership foundation | **COMPLETE_NEEDS_PUSH** + **COMPLETE_NEEDS_CENTRAL_INTEGRATION** — **Laptop/Learning ownership**. Desktop must not expand Learning. → handoff packet. |

`UNPUSHED_TIPS_DISPOSITION` =
`96dffd1=SUPERSEDED_BY_ALPHA_e9c0454_PATCH_ID_DIFFERS_KEEP_BACKUP;`
`8975352=COMPLETE_NEEDS_PUSH_THEN_CENTRAL_LEARNING_INTEGRATION`

---

## Profile Hero residual (unchanged topology)

| Item | Value |
| --- | --- |
| Feature tip | `7ed9159` (pushed 0/0) |
| vs `origin/alpha-0.2` | **1 ahead / 131 behind** |
| Unique file | `.cursor/rules/umtuba-workflow.mdc` |
| Product `3b88b01` | Already ancestor of alpha |
| State | **SAFE_MERGE** / **COMPLETE_NEEDS_CENTRAL_INTEGRATION** |
| Packet | `DESKTOP_A3_PROFILE_HERO_INTEGRATION_PACKET_V1.md` (Wave 2; still valid) |

---

## Mobile (46 behind) — documentation only

| Probe | Result |
| --- | --- |
| Repo | `C:\Users\1\Desktop\umtuba\umtuba-mobile` |
| Local | `master` @ `e333c6d…` — **clean** |
| Remote | `origin/master` @ `fe14a34…` |
| Ahead/behind | **0 / 46** |
| Ancestor | local HEAD **is** ancestor of `origin/master` → ff-only safe |
| Unique local commits | **none** |
| Wave 3 action | **None executed** (investigate/classify + handoff only) |

**MOBILE_DISPOSITION** = `STALE_CHECKOUT + SAFE_FF_ONLY_CANDIDATE + EXTERNAL_OWNER_MOBILE_WORLD + NO_UNIQUE_LOCAL + NOT_EXECUTED_WAVE3`

See: `DESKTOP_A3_CROSS_DEVICE_MOBILE_STALE_CHECKOUT_HANDOFF_V1.md`

---

## Cross-device handoffs prepared

| Packet | Audience | Why |
| --- | --- | --- |
| `DESKTOP_A3_CROSS_DEVICE_LEARNING_INSTRUCTOR_E2E_HANDOFF_V1.md` | Laptop / Learning / Central | Instructor browser e2e ACTIVE_VALID_WIP; no upstream |
| `DESKTOP_A3_CROSS_DEVICE_LEARNING_SPACES_MEMBERSHIP_UNPUSHED_HANDOFF_V1.md` | Laptop / Learning / Central | Unpushed tip `8975352` |
| `DESKTOP_A3_CROSS_DEVICE_COLLABORATION_E2E_HANDOFF_V1.md` | Laptop / Collaboration / Central | Severe dirty + WRONG_UPSTREAM |
| `DESKTOP_A3_CROSS_DEVICE_PRIVATE_SHARED_AI_ORPHAN_HANDOFF_V1.md` | Central / AI | Detached finals + staged duplicate indexes |
| `DESKTOP_A3_CROSS_DEVICE_MOBILE_STALE_CHECKOUT_HANDOFF_V1.md` | Mobile owner / Central | Optional ff-only; not Desktop web blocker |
| (existing) `DESKTOP_A3_PROFILE_HERO_INTEGRATION_PACKET_V1.md` | Central | SAFE_MERGE residual `7ed9159` |

Learning activity-timeline UT (#6) and attachments junk (#7) are covered inside the Learning instructor / Learning spaces handoff notes (no separate Desktop implementation).

---

## What Wave 3 did **not** do

- No commits, pushes, merges, rebases, resets, cleans, discards, WT removals
- No Learning or Collaboration feature development
- No Mobile `pull --ff-only`
- No Profile Hero land onto alpha
- No `_port_extract` touch
- No force-push

---

## End metrics

```
DIRTY_WORKTREES_REMAINING = 13
DETACHED_WORKTREES_REMAINING = 23
UNPUSHED_TIPS_DISPOSITION = 96dffd1=SUPERSEDED_BY_ALPHA_e9c0454_PATCH_ID_DIFFERS_KEEP_BACKUP; 8975352=COMPLETE_NEEDS_PUSH_THEN_CENTRAL_LEARNING_INTEGRATION
MOBILE_DISPOSITION = STALE_CHECKOUT_SAFE_FF_ONLY_CANDIDATE_EXTERNAL_OWNER_NO_UNIQUE_LOCAL_NOT_EXECUTED
PORT_EXTRACT_TOUCHED = NO
DESTRUCTIVE_CLEANUP_PERFORMED = NO
CROSS_DEVICE_HANDOFFS_PREPARED = [DESKTOP_A3_CROSS_DEVICE_LEARNING_INSTRUCTOR_E2E_HANDOFF_V1.md, DESKTOP_A3_CROSS_DEVICE_LEARNING_SPACES_MEMBERSHIP_UNPUSHED_HANDOFF_V1.md, DESKTOP_A3_CROSS_DEVICE_COLLABORATION_E2E_HANDOFF_V1.md, DESKTOP_A3_CROSS_DEVICE_PRIVATE_SHARED_AI_ORPHAN_HANDOFF_V1.md, DESKTOP_A3_CROSS_DEVICE_MOBILE_STALE_CHECKOUT_HANDOFF_V1.md]
A3_READY_FOR_CENTRAL_HANDOFF = YES
```
