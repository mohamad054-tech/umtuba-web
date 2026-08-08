# Computer 2 — Central Server Handoff V1

**Device:** Computer 2 (Translation & Internationalization)  
**Generated:** 2026-08-07  
**Purpose:** Freeze independent Computer-2 milestone work and hand control to the central server for cross-agent orchestration.  
**Contains:** No secrets, tokens, cookies, or runtime payloads.

---

## A. Device / worktree inventory

Shared git repository: `https://github.com/mohamad054-tech/umtuba-web.git`  
Linked Supabase (shared): `umtuba` / `tgucwnjwoyeqoxqaxmew` (eu-west-1) — **not** Translation-isolated.

| Worktree path | Branch | HEAD | Upstream | Sync | Tree | Ownership |
| --- | --- | --- | --- | --- | --- | --- |
| `C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1` | `office/platform-translation-trunk-port-v1` | `0958533963832de6677b35258413cc7ca90994eb` | `origin/office/platform-translation-trunk-port-v1` | **0/0** | **clean** | **Translation** (primary) |
| `C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-sot` | `alpha-0.2` | `62c6c5d04f962b9615c1fb8037bae6b76d7f8e36` | `origin/alpha-0.2` | **0/0** | **clean** | **SoT / Alpha checkout** (read baseline; not active Translation milestone work) |

`git worktree list` on this device shows **only** the two worktrees above.  
Under `Desktop\umtuba\` only those two directories exist. No other local UMTUBA worktrees were found on Computer 2 for this handoff.

Latest subjects:

- Translation: `fix(translation): align Studio reconciliation representation semantics`
- SoT / alpha-0.2: `feat(ai): port private AI deployment runtime onto alpha lineage`

---

## B. Branch inventory (Computer-2 local)

| Branch | Final SHA | Upstream | Sync | Clean/Dirty | Ownership | Push needed |
| --- | --- | --- | --- | --- | --- | --- |
| `office/platform-translation-trunk-port-v1` | `0958533963832de6677b35258413cc7ca90994eb` | `origin/office/platform-translation-trunk-port-v1` | 0/0 | clean | Translation | **No** (already pushed) |
| `alpha-0.2` (checked out in SoT worktree) | `62c6c5d04f962b9615c1fb8037bae6b76d7f8e36` | `origin/alpha-0.2` | 0/0 | clean | SoT / Alpha | **No** |

No other local branches exist on this Computer-2 clone beyond the above.

### Dirty-state classification

Both worktrees: **clean** (no tracked modifications, no untracked product files).

Local-only (present but gitignored — classification **C/E**, must not sync via Git):

| Path | Class | Notes |
| --- | --- | --- |
| `.env.local` | E secrets/env | Exists; ignored by `.env*`; **not tracked** |
| `data/translation-studio/shadow-reconciliation-v1.jsonl` | C runtime | Exists; ignored via `/data/translation-studio/`; baseline sync journal only |
| `data/translation-studio/store.json` | C runtime | **Absent** |
| `data/translation-studio/shadow-smoke-v1.json` | C runtime | **Absent** |

No class A (uncommitted completed work) or B (in-progress dirty work) found.

---

## C. Translation status

### Completed milestone chain (committed + pushed through HEAD `0958533`)

Includes (non-exhaustive evidence via `git log`):

- I18n + App Shell catalogs + Studio foundation / persistence workflow
- Migration reallocation off Learning-reserved numbers
- Remote apply + history close for early Studio/TI migrations
- Persistence port + JSON mode gate
- `20260911` stable identity schema
- `20260912` write RPC
- DB persistence adapter
- Shadow dual-write composition
- Isolated shadow smoke path
- Reconciliation foundation
- `20260913` read snapshot RPC
- Deterministic baseline stabilization
- `20260914` memory identity DB contract align
- Successful controlled real baseline sync (operational; remote populated)
- Representation-alignment comparator (`0958533`)

### Architecture (current)

| Concern | State |
| --- | --- |
| Authoritative runtime | **JSON** (accepted) |
| Persistent shadow mode | Executable via `UMTUBA_TRANSLATION_STUDIO_PERSISTENCE_MODE=shadow_dual_write` |
| `dual_read` observe | **ACCEPTED ON** operationally (`UMTUBA_TRANSLATION_STUDIO_DUAL_READ_OBSERVE=1`) under shadow composition. JSON-only observe refused. |
| `db_primary_json_fallback` | unsupported / **deferred** (fail closed) — not accepted |
| Request transport | authenticated Supabase client; **no service_role** |
| Write path | JSON first; shadow via `translation_studio_upsert_snapshot` (platform admin) |
| Read path | `translation_studio_read_snapshot` (platform admin) |
| Persistence acceptance | `TRANSLATION_STUDIO_PERSISTENCE_V1` = **ACCEPTED** (JSON-authoritative + shadow + observe) |

### Dual-read observe rollback

1. Unset `UMTUBA_TRANSLATION_STUDIO_DUAL_READ_OBSERVE` (or set `0`/`false`)
2. Optionally set `UMTUBA_TRANSLATION_STUDIO_PERSISTENCE_MODE=json`
3. Restart process (clears breaker) **or** explicit admin breaker reset
4. JSON file store unchanged (authority never moved)

Zero-write preflight: `npm run translation:dual-read-preflight`

### Remote migrations (Translation Studio)

| Version | Name | History |
| --- | --- | --- |
| 20260910 | `translation_studio_persistence_workflow_v1` | applied + registered |
| 20260911 | `translation_studio_stable_identity_schema_v1` | applied + registered |
| 20260912 | `translation_studio_write_rpc_v1` | applied + registered |
| 20260913 | `translation_studio_read_snapshot_rpc_v1` | applied + registered |
| 20260914 | `translation_studio_memory_identity_contract_align_v1` | applied + registered |

Also on shared remote (Translation Intelligence):

| Version | Name |
| --- | --- |
| 20260902 | `translation_intelligence_foundation_v1` |

Global remote tip at handoff time: **20260915** (`store_partial_refund_provider_money_execution_v1`) — **Store/Commerce**, unrelated; **do not repair/reorder/touch**.

### RPCs

- `translation_studio_upsert_snapshot` — EXECUTE for `authenticated` only (anon/public not granted)
- `translation_studio_read_snapshot` — EXECUTE for `authenticated` only

### Baseline / reconciliation (last verified)

- Canonical App Shell baseline synchronized remotely (controlled baseline sync succeeded earlier)
- Known controlled smoke residue remains (`__shadow_smoke_v1__*` extras + smoke audit); shared `en` is not smoke-only
- Last PASS-eligible recon shape: `missing_remote=0`, `field_mismatch=0`, `audit_missing=0`, smoke extras only, harmless representation differences understood
- Approximate remote entity shape after baseline: languages 6, namespaces 11, keys 89, values 529, memory 88, terminology 16, audit 2 (plus smoke extras in ns/keys/values/audit)

### Shadow / observation

- `TRANSLATION_STUDIO_LIMITED_SHADOW_OBSERVATION_V1` = **SUCCESS**
- `TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ACTIVATION_V1` = **ACTIVATION_PASS**
- `TRANSLATION_STUDIO_DUAL_READ_OBSERVE_STABILITY_WINDOW_V1` = **STABILITY_PASS** (6/6 IN_SYNC)
- `TRANSLATION_STUDIO_PERSISTENCE_V1` = **ACCEPTED** (JSON-authoritative; observe ON; DB-primary deferred)

### Exact current blocker / next decision

**Blocker for DB-primary:** none claimed ready — authority cutover remains **out of scope** until a dedicated future GO.

**Next Translation recommendation:** operational soak / Studio workflow productization under accepted JSON + shadow + observe. Do **not** auto-start DB-primary.

---

## D. Other Computer-2 platform work

| Domain | Local evidence on Computer 2 | Status claim |
| --- | --- | --- |
| Learning | No local Learning worktree; remote has Learning migrations/branches visible via `origin` | **Do not claim completion** — not owned here |
| Collaboration | No local Collaboration worktree; remote branches exist on `origin` | **Do not claim completion** |
| Commerce / Store | No local Commerce worktree; remote tip includes Store `20260915` | **Do not claim completion**; do not touch |
| Core / UM-Core | No local Core worktree; remote `office/um-core-*` branches visible after fetch | **Do not claim completion** |
| AI Core | SoT worktree sits on `alpha-0.2` with prior AI deployment runtime commit subject; not active Computer-2 Translation work | Treat as SoT checkout only |

Computer 2’s **active ownership** for this handoff is **Translation** on `office/platform-translation-trunk-port-v1`.

---

## E. Remote / Supabase ownership warning

- One shared project: **umtuba** / `tgucwnjwoyeqoxqaxmew`
- No isolated Translation database
- Migration versions are a global namespace — **one owner per version**
- Concurrent remote history already interleaves Translation, Learning, and Store

### Recent migration ownership map (remote `schema_migrations`, ≥ 20260901)

| Version | Name | Domain (inferred) |
| --- | --- | --- |
| 20260901 | `learning_lesson_notes_foundation_v1` | Learning |
| 20260902 | `translation_intelligence_foundation_v1` | Translation (TI) |
| 20260905 | `store_partial_refund_ledger_list_committing_v1` | Store/Commerce |
| 20260906 | `learning_assessment_due_dates_calendar_v1` | Learning |
| 20260907 | `store_partial_refund_ledger_compensate_committed_v1` | Store/Commerce |
| 20260908 | `learning_personal_notes_hub_v1` | Learning |
| 20260909 | `learning_assessment_due_ux_followthrough_v1` | Learning |
| 20260910–20260914 | Translation Studio chain (see §C) | Translation |
| 20260915 | `store_partial_refund_provider_money_execution_v1` | Store/Commerce |

**Collision note:** Persistence was reallocated away from Learning-reserved `20260901`; Translation Studio uses `20260910+`. Do not reuse occupied versions.

---

## F. Local-only files (MUST NOT sync via Git)

- `.env.local` (and any `.env*` except tracked `.env.example`)
- `data/translation-studio/**` (store, journals, smoke JSON)
- Session cookies / access tokens / service_role keys (never present in Git; never copy into docs)
- Local Next/dev logs

Ignore coverage verified: `.env*` and `/data/translation-studio/` in `.gitignore`; none of the secret/runtime paths are tracked.

---

## G. Proposed central-server agent coordination rules

1. **One owner per branch/worktree** — no parallel writers on the same branch.
2. **One owner per migration version** — allocate next free version centrally before any agent authors SQL.
3. **No simultaneous writes** to the same Supabase objects/RPCs/tables across agents.
4. **Explicit dependency order** — e.g. schema → RPC → adapter → shadow → observation.
5. **Review before merge** — server audits SHAs; do not merge Translation into SoT/`alpha-0.2` until assigned.
6. **No agent starts the next Translation milestone** until the server assigns it.
7. **Shared Supabase caution** — treat tip movement by other platforms as expected; never repair unrelated history.

---

## H. Next Translation recommendation (assignment only)

| Item | Value |
| --- | --- |
| Recommended assignment | `TRANSLATION_STUDIO_LIMITED_SHADOW_OBSERVATION_V1` (retry) |
| Why | Prior attempt **NOT_READY** — no normal mutation; JSON restored; shadow disabled |
| Prerequisites | Platform-admin browser session controllable for one Save-draft; shadow enabled **temporarily** only for that cycle; then disable again |
| Do not assign yet without server GO | `…_CYCLE_2`, `…_SHADOW_OPERATIONAL_READINESS_V1` |

---

## I. Branches the server must NOT merge yet

- `office/platform-translation-trunk-port-v1` — **do not merge** into `alpha-0.2` / SoT until central review + GO
- Do not fast-forward SoT from Computer-2 Translation tip without orchestration
- Do not treat remote Store/Learning branches as Computer-2 deliverables

---

## J. Server fetch / audit instructions (exact)

```bash
# On central server clone of umtuba-web
git fetch --all --prune

# Verify Computer-2 Translation tip is visible
git rev-parse origin/office/platform-translation-trunk-port-v1
# expect: 0958533963832de6677b35258413cc7ca90994eb

git log -1 --oneline origin/office/platform-translation-trunk-port-v1
# expect: 0958533 fix(translation): align Studio reconciliation representation semantics

# Read this handoff (after this docs commit is on the branch)
git show origin/office/platform-translation-trunk-port-v1:docs/ai/COMPUTER_2_CENTRAL_SERVER_HANDOFF_V1.md

# Optional: inspect SoT tip (unchanged by Translation work)
git rev-parse origin/alpha-0.2
# expect: 62c6c5d04f962b9615c1fb8037bae6b76d7f8e36

# DO NOT merge yet
# Next: build a 4-agent assignment plan from this handoff + migration map
```

Suggested central task name: **`CENTRAL_SERVER_COMPUTER_2_HANDOFF_AUDIT_AND_ASSIGNMENT_PLAN_V1`**

---

## K. Computer-2 freeze confirmation

As of this handoff:

- No new Translation milestone started on Computer 2
- Worktrees left intact
- Local env/runtime files left intact (not committed)
- Persistence mode: **JSON default**
- Persistent shadow: **DISABLED**
- Independent Computer-2 milestone development: **STOPPED** pending central orchestration
