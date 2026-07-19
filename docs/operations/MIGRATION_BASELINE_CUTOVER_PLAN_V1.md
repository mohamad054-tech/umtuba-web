# UMTUBA Migration Baseline Cutover Plan V1

**Status:** Draft for review — **not an execution authorization**  
**Branch at review:** `alpha-0.2`  
**Git commit at review:** `5bd2106`  
**Linked project (name / ref):** `umtuba` / `tgucwnjwoyeqoxqaxmew`  
**CLI used in readiness review:** Supabase CLI `2.109.1` (via `npx`)  
**Document owner role:** Laptop integration device  
**Audience:** Engineering leads, laptop integrator, office desktop contributor

> This document converts the Migration Governance / Remote History Readiness findings into an auditable operating plan.  
> **Do not execute cutover steps from this file until an approved maintenance window and Review Gate are recorded.**

---

## 1. Executive Summary

Production (`umtuba`) already contains a large set of schema objects that were applied historically and/or manually. Those objects are **not fully represented** as rows in `supabase_migrations.schema_migrations`.

The local `supabase/migrations/` tree therefore **must not** be treated as a complete, pushable chronology of production. Many local files have versions **older than** the remote tip and lack remote history rows. Under that condition, Supabase CLI behavior pressures operators toward `--include-all`, which is a **direct production hazard**.

**`supabase db push --include-all` is a direct production risk** and is forbidden under this plan.

**Target end state**

1. Capture production public schema reality as a single **baseline** migration.  
2. Archive or otherwise remove absorbed historical migration files from the *active* migrations path.  
3. Align remote migration history to the baseline tip once, under an approved window.  
4. From that point forward: **forward-only** migrations only.  
5. Re-issue **Push Tokens** as a **new post-baseline** migration (do not rely on replaying orphaned `20260805` through a blind push).

---

## 2. Confirmed Current State

Evidence sources (read-only): `git fetch` / status, `npx supabase migration list --linked`, `npx supabase db query --linked` against `schema_migrations` and object probes, project list for link confirmation.

| Item | Confirmed value |
|------|-----------------|
| Linked project name | `umtuba` |
| Linked project ref | `tgucwnjwoyeqoxqaxmew` |
| Region (non-secret) | West EU (Ireland) |
| Branch | `alpha-0.2` |
| HEAD / origin at review | `5bd2106` (ahead/behind `0/0`) |
| CLI version in review | `2.109.1` |
| Local-only unrelated work | `M supabase/README.md` (out of cutover doc scope) |

### Remote `schema_migrations` (complete list at review)

| version | name |
|---------|------|
| `20260728` | `store_product_foundation_v1` |
| `20260729` | `store_cart_foundation_v1` |
| `20260801` | `video_commerce_shelf_v1` |
| `20260802` | `store_marketplace_foundation_v1` |
| `20260803` | `stories_foundation_v1` |
| `20260804` | `global_search_foundation_v1` |
| `20260806` | `ads_admin_review_foundation_v1` |
| `20260808` | `live_started_insert_notification_fix` |

No remote-only versions were found that lack a corresponding local file prefix.

### Duplicate local version timestamps (active path)

| Version prefix | Local sibling count |
|----------------|---------------------|
| `20260713` | 5 |
| `20260714` | 4 |
| `20260728` | 2 |
| `20260729` | 2 |

### Spotlight object vs history reality

| Topic | Local file(s) | Remote history | Objects on remote (probe) |
|-------|---------------|----------------|---------------------------|
| Push Tokens | `20260805_push_tokens_foundation_v1.sql` | **Missing** | **Absent** (`push_tokens`, `register_push_token`) |
| Ads platform | `20260807_ads_platform_foundation_v1.sql` | **Missing** | **Present** (`ad_campaigns`, `advertiser_accounts`, …) |
| Live started INSERT fix | `20260808_live_started_insert_notification_fix.sql` | **Present** | **Consistent** (trigger fires on INSERT) |
| Messenger Production Phase 2 | `20260729_messenger_production_phase2.sql` | History for `20260729` names **cart** only | **Present** (`message_reactions`, `message_hides`, edit RPC, …) |
| Ads admin review | `20260806_…` | Present | Present (`platform_admins`, …) |

### CLI implication

Local files with versions **less than** the remote tip (and missing remote rows) cause “insert before last migration” pressure. That is the mechanical reason `--include-all` appears attractive — and why it must be refused.

---

## 3. Risk Classification

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Blind push risk** (`db push` / `--include-all`) | Critical | Forbid until baseline cutover complete; require explicit Review Gate; laptop-only execution |
| **Duplicate version risk** | High | Archive siblings out of active path; never rename casually mid-flight; baseline absorbs current reality |
| **History repair risk** | High | Repair only inside approved Phase 5; one version/tip alignment at a time; never mass-repair unreviewed lists |
| **Schema drift risk** | High | Schema-only dump + static review before history changes; object probes after every mutating step |
| **Rollback risk** | High | External dump + documented restore owner; no “reset production”; abort if dump missing |
| **Multi-device workflow risk** | High | Freeze office desktop migration work; fetch + ff-only discipline; single integrator (laptop) |

---

## 4. Preconditions

**Cutover must not start** until all of the following are true:

1. **Schema-only dump** of production `public` (and any other agreed schemas) stored **outside Git**, with size & SHA256 recorded.  
2. **Export / snapshot of remote migration history** (read-only query results) stored with the dump.  
3. **Maintenance window** agreed (start/end, timezone, who is on call).  
4. **No parallel deploy or migration work** from office desktop or a second laptop session.  
5. **Branch/commit confirmation** immediately before Phase 0: `alpha-0.2`, fetch, ahead/behind `0/0` (or documented intentional tip).  
6. **Review Gate:** second person review **or** explicit written owner self-certification recorded in the window ticket.  
7. **Named execution owner** (default: laptop integration device operator).  
8. **Rollback plan** accepted (see Phase notes): restore from dump / stop forward applies / do not invent ad-hoc DDL.

---

## 5. Exact Cutover Phases

> Phases below are **planning steps only**. Nothing in this section authorizes running mutating commands without a separate GO decision.

### Phase 0 — Freeze

| | |
|--|--|
| **Goal** | Stop migration-number and history churn during cutover. |
| **Inputs** | Agreed window; device roles; current HEAD. |
| **Steps** | Announce freeze; office desktop stops creating migrations; laptop becomes sole integrator; no feature migrations land until Unfreeze. |
| **Success** | Both devices acknowledge freeze; no new migration commits on `origin/alpha-0.2` during window. |
| **Stop** | Origin moves unexpectedly → re-fetch, reassess, do not continue. |
| **Rollback** | Cancel window; resume normal development without history changes. |

### Phase 1 — Evidence Capture

| | |
|--|--|
| **Goal** | Immutable evidence pack outside Git. |
| **Inputs** | Linked project; CLI; empty external directory. |
| **Steps** | Schema-only dump; save `schema_migrations` listing; save `migration list --linked` output; record SHA256; copy relevant verify scripts list (do not apply). |
| **Success** | Dump size &gt; 0; hashes recorded; no secrets printed into tickets. |
| **Stop** | Dump fails (e.g. Docker missing); secrets appear in console → stop and scrub. |
| **Rollback** | Discard incomplete evidence; do not touch remote. |

### Phase 2 — Generate Baseline from Remote Reality

| | |
|--|--|
| **Goal** | Produce baseline SQL that matches production public schema reality. |
| **Inputs** | Approved dump from Phase 1. |
| **Steps** | Derive baseline migration content from dump (or reviewed dump file); choose a **new timestamp version strictly after** the agreed tip naming scheme; keep baseline **schema-only** (no user row data). |
| **Success** | Baseline file reviewed statically for critical domains (Store/Cart/Marketplace, Stories/Search, Ads, Live/Messenger, Notifications/Rewards/Referrals, RLS/functions/triggers). |
| **Stop** | Dump contains secrets / user data / unexpected schemas → stop. |
| **Rollback** | Delete uncommitted baseline draft only; remote untouched. |

### Phase 3 — Review Baseline

| | |
|--|--|
| **Goal** | Human + checklist acceptance of baseline before Git/history mutation. |
| **Inputs** | Baseline draft; verification matrix (Section 8). |
| **Steps** | Diff against known foundations; confirm Push Tokens **absent** in baseline if still absent remotely; confirm Ads/Messenger objects present; confirm no invented grants. |
| **Success** | Written APPROVE on baseline artifact. |
| **Stop** | Any High/Critical checklist failure. |
| **Rollback** | Revise baseline draft; do not align history yet. |

### Phase 4 — Archive Historical Local Migrations

| | |
|--|--|
| **Goal** | Active `supabase/migrations/` contains only baseline (+ later forward files). |
| **Inputs** | Approved baseline; inventory of absorbed files. |
| **Steps** | Move (Git move) pre-baseline historical files to an archive path **outside** the active migrations directory (exact folder name chosen at execution PR); leave verify scripts discoverable; **do not rewrite** historical file contents. |
| **Success** | Active path has no duplicate-prefix chaos and no versions older than baseline except intentional forward chain. |
| **Stop** | Unclear which files are absorbed vs still needed as real applies. |
| **Rollback** | `git` revert the archive move commit; remote still unchanged until Phase 5. |

### Phase 5 — Align Migration History

| | |
|--|--|
| **Goal** | Remote history tip matches baseline; no pending “insert before last”. |
| **Inputs** | Merged archive+baseline PR; maintenance window live. |
| **Steps** | Under window only: apply baseline registration strategy agreed in the execution ticket (mark baseline applied / insert baseline row — **exact CLI chosen at GO time**). |
| **Success** | `migration list --linked` shows no local versions &lt; remote tip missing from remote; tip = baseline. |
| **Stop** | Any unexpected DDL; mismatch between objects and baseline. |
| **Rollback** | **DO NOT RUN WITHOUT APPROVED CUTOVER WINDOW** — history repair reversal only with owner + second approval; prefer abort forward work over improvisation. |

> **DO NOT RUN WITHOUT APPROVED CUTOVER WINDOW**  
> Any `migration repair`, history INSERT, or baseline apply to the linked project belongs exclusively in Phase 5 after GO.

### Phase 6 — Validate Fresh Local Environment

| | |
|--|--|
| **Goal** | Prove a new environment can bootstrap from baseline forward-only. |
| **Inputs** | Post-cutover Git tree. |
| **Steps** | Local (non-production) reset/apply against baseline chain only; run contract tests; never point local reset at production. |
| **Success** | Fresh local DB reaches expected objects without `--include-all`. |
| **Stop** | Local bootstrap requires historical absorbed files. |
| **Rollback** | Fix baseline/archive in Git; do not “fix” by pushing history noise to prod. |

### Phase 7 — Apply Forward-only Migration for Push Tokens

| | |
|--|--|
| **Goal** | Introduce Push Tokens **after** baseline as a real DDL migration. |
| **Inputs** | Green Phase 6; content of former `20260805` reviewed. |
| **Steps** | Create **new** post-baseline version (new timestamp — do not reuse `20260805` as the active tip dependency); targeted apply; run `supabase/verify/20260805_push_tokens_foundation_v1.verify.sql` adapted to the new version if needed. |
| **Success** | Table + RPCs present; history row present; grants/RLS match design. |
| **Stop** | Objects collide or verify fails. |
| **Rollback** | Compensating migration or controlled drop **only** if designed; otherwise abort and leave prod without tokens rather than half-state. |

### Phase 8 — Production Verification

| | |
|--|--|
| **Goal** | Confirm app-critical surfaces after cutover. |
| **Inputs** | Verification matrix. |
| **Steps** | Run probes for Live started notifications, Messenger P2, Ads platform, Store/Stories/Search, Push Tokens (if applied), history list, smoke login/discover/live/messages as agreed. |
| **Success** | Matrix rows pass or documented waivers. |
| **Stop** | Regression on Live notifications, Messenger, or auth. |
| **Rollback** | Follow incident process; do not mass-reapply archives. |

### Phase 9 — Unfreeze

| | |
|--|--|
| **Goal** | Resume multi-device feature work under forward-only rules. |
| **Inputs** | Phase 8 pass. |
| **Steps** | Announce unfreeze; update workflow docs if needed (separate PR); both devices fetch before new migrations. |
| **Success** | Next migration is strictly after baseline tip; no `--include-all`. |
| **Stop** | Office desktop still has divergent migration drafts — reconcile before unfreeze. |
| **Rollback** | Extend freeze. |

---

## 6. File Strategy

| Rule | Detail |
|------|--------|
| Do **not** modify or re-run absorbed historical migrations | Messenger P2, ads platform (`20260807`), and most pre-store orphans stay archaeology. |
| Create a **new baseline** with a **new timestamp** after the agreed tip | Do not overwrite `20260808` or reuse an old version number for baseline. |
| Move old active migrations to an **archive path** outside CLI active migrations | Exact directory name decided in the execution PR (e.g. `supabase/migrations_archive/` or `docs/migrations_history/`). |
| **Re-issue Push Tokens** as a **post-baseline** migration | Do not depend on blind apply of legacy `20260805` through push. |
| Do **not** re-apply `20260807` or Messenger P2 | Objects already exist. |
| Do **not** rename files in this planning PR | Strategy only; renames/moves happen in cutover execution PRs. |

---

## 7. Safe Command Checklist

### Read-only allowed (anytime with normal caution)

- `git fetch origin`
- `git status` / `git log` / `git rev-list --left-right --count …`
- `npx supabase --version`
- `npx supabase projects list`
- `npx supabase migration list --linked`
- `npx supabase db query --linked` with **SELECT-only** SQL
- Schema dump **only when** explicitly approved as evidence capture (still avoid printing secrets)

### Allowed only during approved cutover

> **DO NOT RUN WITHOUT APPROVED CUTOVER WINDOW**

- Targeted baseline registration / history alignment commands agreed in the GO ticket  
- Targeted apply of the **post-baseline Push Tokens** migration  
- `migration repair --status applied|reverted` for **named versions only**, after object verification  

Exact command strings must be copied from the **execution ticket**, not improvised from this plan.

### Forbidden now (and until Unfreeze + new policy)

- `supabase db push`
- `supabase db push --include-all` (**critical forbid**)
- `supabase db reset` against linked production
- `supabase migration up` against linked production
- Mass `migration repair` of unreviewed version lists
- Any DDL “to make CLI quiet” without object classification
- Force-push to `alpha-0.2`

---

## 8. Verification Matrix

| Area | What to verify | When |
|------|----------------|------|
| Schema objects | Critical tables/functions exist per domain | After baseline align; after Push Tokens |
| RLS | Expected tables have RLS enabled; no accidental public writes | Phase 3, 5, 8 |
| Functions / RPCs | Key RPCs exist with expected signatures | Phase 5, 7, 8 |
| Triggers | Including `live_rooms_notify_started` INSERT\|UPDATE | Phase 5, 8 |
| Grants | No excess EXECUTE to `anon`/`authenticated` on definer helpers | Phase 5, 7 |
| Migration history | Tip = baseline; no insert-before-last; Push Tokens row after apply | Phase 5, 7 |
| Fresh local reset | Bootstrap without historical archives | Phase 6 |
| App smoke | Login, Discover, Live, Messages, Notifications | Phase 8 |
| Push Tokens | Table + register/unregister/touch RPCs + verify script | Phase 7–8 |
| Live started notifications | INSERT-as-live path; no duplicate live→live | Phase 8 |
| Messenger Production Phase 2 | reactions/hides/edit/mute objects remain | Phase 5, 8 |
| Ads platform | campaigns/accounts remain; delivery still gated in app | Phase 5, 8 |
| Store / Stories / Search | Foundations remain | Phase 5, 8 |

---

## 9. Go / No-Go Gate

### GO (all required)

- [ ] Preconditions (Section 4) complete  
- [ ] Evidence pack stored outside Git with hashes  
- [ ] Baseline APPROVED  
- [ ] Freeze acknowledged by laptop + office desktop  
- [ ] Execution owner named  
- [ ] Rollback owner named  
- [ ] `origin/alpha-0.2` stable at start of window  

### NO-GO (do not start)

- Dump missing, empty, or secret-contaminated  
- Office desktop still pushing migrations  
- Unclassified High object gaps  
- Plan to use `--include-all` “just this once”  
- No Review Gate  

### ABORT (stop mid-flight)

- Origin moves mid-window  
- Unexpected DDL failure or object mismatch after a mutating step  
- Secrets printed to logs/tickets  
- Verify matrix Critical failure on Live notifications, auth, or Messenger  
- Disagreement between devices about tip commit  

---

## 10. Ownership and Device Discipline

| Role | Responsibility |
|------|----------------|
| **Laptop** | Primary integration device: cutover execution, migration numbering, controlled pushes, conflict resolution |
| **Office desktop** | Must **pause all migration work** for the freeze; sync with `fetch` + `pull --ff-only` only after Unfreeze |
| **Before every push** | `git fetch origin` then fast-forward only if possible; **never** force-push `alpha-0.2` |
| **Parallelism** | No simultaneous migration applies or history repairs from two devices |

`origin/alpha-0.2` remains source of truth. If local and origin diverge during cutover: **stop**, do not merge/rebase casually, escalate.

---

## Appendix A — Forbidden rationalizations

These are explicitly rejected:

1. “CLI asked for `--include-all`, so we should.”  
2. “Repair everything as applied without object checks.”  
3. “Re-run Messenger / ads platform migrations; they are idempotent enough.”  
4. “Push Tokens can wait inside a giant push with the orphans.”  
5. “Office desktop can finish one more Store migration during the window.”

---

## Appendix B — Related artifacts (reference only)

- `supabase/migrations/20260805_push_tokens_foundation_v1.sql` (legacy; re-issue post-baseline)  
- `supabase/verify/20260805_push_tokens_foundation_v1.verify.sql`  
- `supabase/migrations/20260807_ads_platform_foundation_v1.sql` (absorbed objects; do not re-apply)  
- `supabase/migrations/20260808_live_started_insert_notification_fix.sql` (already consistent)  
- `supabase/verify/20260808_live_started_insert_notification_fix.verify.sql`  
- `supabase/migrations/20260729_messenger_production_phase2.sql` (objects present; history incomplete)  
- `scripts/verify-messenger-production-phase2.sql`  

---

**End of UMTUBA Migration Baseline Cutover Plan V1**  
**Next action after review:** Review Gate → schedule window → Phase 0 Freeze (separate explicit authorization).
