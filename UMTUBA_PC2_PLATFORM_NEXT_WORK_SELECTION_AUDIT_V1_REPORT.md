# UMTUBA_PC2_PLATFORM_NEXT_WORK_SELECTION_AUDIT_V1_REPORT

**Agent:** PC2-A1  
**Device:** PC2  
**Worktree:** `C:\Users\Giga store\Desktop\umtuba\worktrees\PC2-A1`  
**Branch:** `office/pc2-a1-ready`  
**Generated:** 2026-08-09  
**Mode:** Audit only — no product coding, no alpha modification, no merge/push

---

## Verdict

**Best next PC2 platform/core work is UM Core continuation, gated by landing the already-built P1–P16 stack onto current `alpha-0.2`.**

On `origin/alpha-0.2` @ `bc09e1379da595a08e27b3146ff00f3bca5fcb01` there is **no** `platforms/core/**` tree and **no** UM Core code. Remote lineage `office/um-core-platform-foundation-p1` … `office/um-core-platform-event-publisher-foundation-p16` exists and is closed through **Event Publisher P16**, but is based on older alpha tip `62c6c5d` and is **44 commits behind** current alpha. Merge-tree dry-run shows conflicts only in shared AI handoff docs + `vitest.config.ts`.

Therefore:
1. **Immediate priority:** `UM_CORE_PLATFORM_ONTO_ALPHA_PORT_V1` (rebase/port P1–P16 onto alpha tip).
2. **Then sequential runtime ports:** Health Reporter → Dependency Validator → SDK Client/Factory (P16 closeout already names Health Reporter next).
3. **Do not** reopen Translation V1, start Translation V2, or enter Commerce / Learning / Collaboration.

**Recommended PC2 Wave:** **1 worker** (PC2-A1). Keep PC2-A2/A3 READY / UNASSIGNED until the onto-alpha port lands (or Central Coordinator explicitly partitions a later wave).

---

## Actual alpha SHA

| Item | Value |
| --- | --- |
| Expected SHA | `bc09e1379da595a08e27b3146ff00f3bca5fcb01` |
| Actual `origin/alpha-0.2` | `bc09e1379da595a08e27b3146ff00f3bca5fcb01` |
| Match | **YES** |
| Subject | `fix(ai): preserve routing policy boundary for translation hints` |
| Worktree HEAD | `bc09e1379da595a08e27b3146ff00f3bca5fcb01` |
| Worktree vs alpha | `0 ahead / 0 behind` |
| Alpha modified by this audit | **NO** |

`git fetch --all --prune` completed successfully before verification.

---

## Platform/core inventory

### Inspected sources (evidence)

| Source | Finding |
| --- | --- |
| `docs/ai/PROJECT_STATE.md` (worktree @ alpha) | Stale AI-core private-AI handoff text; not UM Core status. |
| `docs/ai/CURRENT_TASK.md` (worktree @ alpha) | Translation Studio V1 **PRODUCTION_ACCEPTED** / complete; forbids V2 start. |
| `docs/ai/COMPUTER_2_CENTRAL_SERVER_HANDOFF_V1.md` | Explicitly: Core/UM-Core “do not claim completion”; remote `office/um-core-*` visible. |
| `git branch -r` | Full UM Core series P1–P16 present on origin. |
| `git ls-tree origin/alpha-0.2` | **No** `platforms/` directory. |
| Grep `lib/**` for um-core symbols on alpha | **No matches**. |
| `packages/` | **Absent** on this repo tip. |
| Domain “platform” docs under `docs/architecture`, `docs/ads`, `docs/games`, etc. | Product/domain foundations (Ads/Games/AI Data/i18n/Nav/Revenue) — **not** UM Core control plane. |
| Observability on alpha | Domain-local only: `lib/ai/tracing/events.ts`, `lib/ads/metrics.ts`, `lib/media/processing/metrics.ts`, `lib/translationStudio/.../observability.ts`. No shared platform observability package. |

### UM Core remote lineage (NOT on alpha)

Merge-base with alpha: `62c6c5d04f962b9615c1fb8037bae6b76d7f8e36`  
P16 tip: `3120432f2cd84a30498192838b2ca58794308352`  
All P1–P16: `NOT_IN_ALPHA`, each **behind=44**, ahead=1…16 along a linear chain.

| Phase | Branch | Tip subject (short) | In alpha? |
| --- | --- | --- | --- |
| P1 | `office/um-core-platform-foundation-p1` | platform foundation | NO |
| P2 | `…-manifest-validation-p2` | manifest validation | NO |
| P3 | `…-compliance-engine-p3` | compliance engine | NO |
| P4 | `…-registry-foundation-p4` | platform registry | NO |
| P5 | `…-capability-registry-foundation-p5` | capability registry | NO |
| P6 | `…-event-type-registry-foundation-p6` | event type registry | NO |
| P7 | `…-event-routing-foundation-p7` | event routing catalog | NO |
| P8 | `…-feature-flag-registry-foundation-p8` | feature flag registry | NO |
| P9 | `…-dependency-registry-foundation-p9` | dependency registry | NO |
| P10 | `…-health-declaration-catalog-foundation-p10` | health declaration catalog | NO |
| P11 | `…-naming-registry-foundation-p11` | naming registry | NO |
| P12 | `…-aggregate-registry-facade-foundation-p12` | aggregate registry facade | NO |
| P13 | `…-validator-composition-foundation-p13` | validator composition | NO |
| P14 | `…-flag-evaluator-foundation-p14` | flag evaluator | NO |
| P15 | `…-capability-asserter-foundation-p15` | capability asserter | NO |
| P16 | `…-event-publisher-foundation-p16` | event publisher admission | NO |

**Code home:** `platforms/core/**` (+ `docs/core/UM_CORE_PLATFORM_*.md`).  
**Shared non-core touch in lineage:** `vitest.config.ts` (+1 include), `docs/ai/CURRENT_TASK.md`, `docs/ai/CURSOR_REPORT.md`.  
**Not touched by lineage:** `package.json`, `app/layout.tsx`, `lib/ai/**`, `supabase/migrations/**`.  
**Migrations in lineage:** none (confirmed by docs + file list).  
**Tests claimed at P16 close:** `npx vitest run platforms/core` — 162 PASS (per tip `CURSOR_REPORT`).

### Alpha-side related platform foundations (context only; not PC2 next)

| Area | Alpha state (evidence) |
| --- | --- |
| Translation Studio V1 | PRODUCTION_ACCEPTED / integrated into alpha tip chain — **closed; do not reopen** |
| I18n foundation | Documented closed; App Shell / Translation follow-ons already on alpha |
| Platform nav contracts | Frozen (`app/lib/nav/platformNavContract.ts`) |
| AI / Private AI / AI Data Platform | Present under `lib/ai`, `lib/privateAi`, `lib/aiDataPlatform` — **avoid** (AI ownership / collision with `lib/ai/**`) |
| Ads / Games / Revenue / Content / Media | Domain platforms — not UM Core; content foundation still architecture-heavy |
| Shared observability infra | **Missing** as a cross-platform package |

---

## Completed milestone map

### On alpha (relevant)

- Translation Studio V1 lineage through production acceptance docs + race-safe dual-read (tip includes translation closeout commits).
- Many domain platform foundations (Ads, Games, AI Data, Private AI runtime contracts, i18n, nav).
- **UM Core P1–P16: NOT completed on alpha** (exist only as unmerged office branches).

### Completed off-alpha (UM Core control plane + early runtime ports)

| Milestone | Status on remote branch | Runtime? |
| --- | --- | --- |
| P1 contracts skeleton | Closed | No |
| P2 manifest validation | Closed | Pure validators |
| P3 compliance engine | Closed | Pure assessment |
| P4 platform registry | Closed | In-memory catalog |
| P5 capability registry | Closed | In-memory catalog |
| P6 event type registry | Closed | In-memory catalog |
| P7 event routing registry | Closed | Catalog only (not delivery) |
| P8 feature flag registry | Closed | In-memory catalog |
| P9 dependency registry | Closed | In-memory catalog |
| P10 health declaration catalog | Closed | Declarations only (not monitoring) |
| P11 naming registry | Closed | Derived index |
| P12 aggregate registry facade | Closed | Facade only |
| P13 validator composition | Closed | Completeness/drift |
| P14 flag evaluator | Closed | Default-state only |
| P15 capability asserter | Closed | Catalog + flag compose |
| P16 event publisher | Closed | Admission only (not bus/delivery) |

P16 `CURSOR_REPORT` open issue: **“Recommended next: Health Reporter Foundation (or next approved runtime port). Do not start P17 from this close.”**

---

## Actual gaps

1. **Landing gap (critical):** Entire `platforms/core` stack absent from alpha; 44-commit drift; merge conflicts in `vitest.config.ts` + `docs/ai/{CURRENT_TASK,CURSOR_REPORT}.md`.
2. **Health runtime gap:** P10 catalog exists off-alpha; `UmHealthReporter` / snapshots / probes are interface-only — no reporter implementation.
3. **Dependency validator gap:** P13 does completeness/drift via `validateDependencies`; dedicated `UmDependencyValidator` (resolver-class concerns) still deferred.
4. **SDK gap:** `UmCoreSdkClient` / `UmCoreSdkFactory` interfaces only (`platforms/core/sdk/interfaces.ts` on P16 tip).
5. **Observability gap:** No shared platform observability/contracts package on alpha; only product-local metrics/tracing.
6. **Event delivery gap (later):** P7 routing catalog + P16 publish admission exist; bus/outbox/retry/DLQ explicitly deferred — **not** recommended as immediate next (larger, easy to over-scope).
7. **Spec docs gap:** Normative refs `UM_CORE_SPECIFICATION_V1` / `UM_CORE_ENGINEERING_STANDARDS_V1` are cited but not present as files in the P16 tree listing (external/normative assumption).

---

## Top 5 candidates

### 1) UM_CORE_PLATFORM_ONTO_ALPHA_PORT_V1  ★ PRIMARY

| Field | Value |
| --- | --- |
| **TASK_ID** | `UM_CORE_PLATFORM_ONTO_ALPHA_PORT_V1` |
| **Title** | Port UM Core P1–P16 onto current alpha-0.2 |
| **Domain** | UM Core Platform / platform foundations |
| **Exact recommended base SHA** | `bc09e1379da595a08e27b3146ff00f3bca5fcb01` (`origin/alpha-0.2`) |
| **Source tip to port** | `3120432f2cd84a30498192838b2ca58794308352` (P16) |
| **Goal** | Bring closed P1–P16 `platforms/core/**` + `docs/core/**` onto alpha tip with conflict resolution limited to `vitest.config.ts` include line and AI handoff docs; prove `vitest`/`tsc` green; **no product wiring**. |
| **Expected files/areas** | `platforms/core/**` (add), `docs/core/**` (add), `vitest.config.ts` (add include), optionally task/report docs under `docs/ai/` for the port milestone only |
| **Dependencies** | None product-side; requires Central GO if Server owns merge orchestration — PC2 can author the port branch |
| **Migration required** | **NO** |
| **DB write required** | **NO** |
| **Paid API required** | **NO** |
| **Collision risk** | **MEDIUM** on `vitest.config.ts` + `docs/ai/*` only; **LOW** elsewhere (`platforms/` greenfield on alpha). Avoid parallel writers on those three files. |
| **Why now** | Without this, further P17+ work stays stranded 44 commits behind alpha and cannot become the shared platform base for other devices. |

### 2) UM_CORE_PLATFORM_HEALTH_REPORTER_FOUNDATION_P17

| Field | Value |
| --- | --- |
| **TASK_ID** | `UM_CORE_PLATFORM_HEALTH_REPORTER_FOUNDATION_P17` |
| **Title** | UM Core Health Reporter Foundation P17 |
| **Domain** | UM Core / health runtime port |
| **Exact recommended base SHA** | Prefer **post-port tip** (unknown until #1 lands). Interim lineage tip if Coordinator allows stranded continue: `3120432f2cd84a30498192838b2ca58794308352` (**not preferred**) |
| **Goal** | Implement pure in-process `UmHealthReporter` over P10 declaration catalog + snapshot contracts; fail-closed; **no probe execution/networking/alerting**. |
| **Expected files/areas** | `platforms/core/health/**`, `platforms/core/sdk/interfaces.ts` (alignment only), `platforms/core/packageIdentity.ts`, `platforms/core/README.md`, `platforms/core/coreFoundationContracts.test.ts`, `docs/core/UM_CORE_PLATFORM_HEALTH_REPORTER_FOUNDATION_P17.md` |
| **Dependencies** | P10 + preferably onto-alpha port (#1) |
| **Migration required** | **NO** |
| **DB write required** | **NO** |
| **Paid API required** | **NO** |
| **Collision risk** | **HIGH** if parallelized with other P17+ on shared `packageIdentity` / `sdk/interfaces` / README / contracts test |
| **Why now** | Explicit next recommendation in P16 closeout; completes the health half of SDK surface (`health: UmHealthReporter`). |

### 3) UM_CORE_PLATFORM_DEPENDENCY_VALIDATOR_FOUNDATION_P18

| Field | Value |
| --- | --- |
| **TASK_ID** | `UM_CORE_PLATFORM_DEPENDENCY_VALIDATOR_FOUNDATION_P18` |
| **Title** | UM Core Dependency Validator Foundation P18 |
| **Domain** | UM Core / validation runtime port |
| **Exact recommended base SHA** | Post-P17 tip (preferred) or post-port tip if sequenced after #1 before #2 only by Coordinator exception |
| **Goal** | Add dedicated `UmDependencyValidator` port beyond P13 completeness/drift — still pure/deterministic, no DI container / startup orchestration / networking. |
| **Expected files/areas** | `platforms/core/validation/**`, possibly `platforms/core/dependency/types.ts`, `packageIdentity.ts`, README, contracts test, `docs/core/**` |
| **Dependencies** | P9 + P13; preferably after #1 and ideally after #2 to keep linear phase IDs |
| **Migration required** | **NO** |
| **DB write required** | **NO** |
| **Paid API required** | **NO** |
| **Collision risk** | **HIGH** with other core runtime ports on shared identity/export files |
| **Why now** | Repeatedly deferred across P13–P16; unblocks later startup/orchestration without product coupling. |

### 4) UM_CORE_PLATFORM_SDK_CLIENT_FACTORY_FOUNDATION_P19

| Field | Value |
| --- | --- |
| **TASK_ID** | `UM_CORE_PLATFORM_SDK_CLIENT_FACTORY_FOUNDATION_P19` |
| **Title** | UM Core SDK Client/Factory Foundation P19 |
| **Domain** | UM Core / shared platform contracts (SDK surface) |
| **Exact recommended base SHA** | Post-P17 tip minimum (needs Health Reporter + existing P14/P15/P16 ports) |
| **Goal** | Implement in-memory `UmCoreSdkFactory` / `UmCoreSdkClient` composing flag evaluator, event publisher, health reporter, capability asserter — still no networking/persistence/product wiring. |
| **Expected files/areas** | `platforms/core/sdk/**`, thin wiring helpers, `packageIdentity.ts`, README, contracts tests, `docs/core/**` |
| **Dependencies** | P14–P16 + Health Reporter (#2); Dependency Validator optional depending on SDK scope |
| **Migration required** | **NO** |
| **DB write required** | **NO** |
| **Paid API required** | **NO** |
| **Collision risk** | **HIGH** if parallel with #2/#3 (same SDK interfaces file) |
| **Why now** | Natural composition milestone after individual runtime ports; gives other platforms a single Core client contract later. |

### 5) UM_CORE_PLATFORM_OBSERVABILITY_CONTRACTS_FOUNDATION_P20

| Field | Value |
| --- | --- |
| **TASK_ID** | `UM_CORE_PLATFORM_OBSERVABILITY_CONTRACTS_FOUNDATION_P20` |
| **Title** | UM Core Observability Contracts Foundation P20 |
| **Domain** | Platform infrastructure / observability contracts |
| **Exact recommended base SHA** | Post-port tip (or post-P19 if Coordinator wants SDK-first) @ alpha-derived SHA |
| **Goal** | Add pure Core observability **contracts** (trace/metric/log correlation IDs, event envelope observability fields, health→signal mapping) under `platforms/core/` — **no** OTel exporter, no paid SaaS, no product dashboards. |
| **Expected files/areas** | New `platforms/core/observability/**` (proposed), types + tests + docs; avoid `lib/ai/tracing/**` |
| **Dependencies** | Onto-alpha port (#1); optionally Health Reporter for status taxonomy reuse |
| **Migration required** | **NO** |
| **DB write required** | **NO** |
| **Paid API required** | **NO** |
| **Collision risk** | **LOW–MEDIUM** if isolated to new subdirectory; rises if it edits shared `index.ts` / SDK interfaces in parallel with #2–#4 |
| **Why now** | Alpha has only domain-local metrics/tracing; a Core contract layer is independent of Commerce/Learning/Collaboration and prepares later infra without product coupling. |

**Rejected / deferred for this wave (not in top 5 as immediate PC2 starts):**
- Event bus / delivery / outbox (explicitly non-goal through P16; high scope risk).
- Unified Content Registry implementation (touches many domains; not pure Core).
- Anything under Translation / Commerce / Learning / Collaboration / `lib/ai/**`.

---

## Recommended PC2 Wave

**1 worker.**

Rationale:
- Critical path is a **single** onto-alpha port with shared-file conflict resolution.
- Post-port runtime ports (P17→P19) serialize on `packageIdentity.ts`, `sdk/interfaces.ts`, README, and contracts tests.
- Starting 2–3 workers on P17+/observability **before** landing creates stranded commits and multi-way conflicts on the same Core package.

Keep **PC2-A2** and **PC2-A3** in READY / UNASSIGNED until Central Coordinator issues GO after #1 closes.

---

## Worker→task mapping

| Worker | Assignment | Notes |
| --- | --- | --- |
| **PC2-A1** | `UM_CORE_PLATFORM_ONTO_ALPHA_PORT_V1` | Only active task for Wave 1 |
| **PC2-A2** | *unassigned / READY* | Do **not** start Health Reporter yet |
| **PC2-A3** | *unassigned / READY* | Do **not** start Dependency Validator / Observability yet |

### Optional Wave 2 mapping (ONLY after #1 lands + GO; still prefer serial)

If Coordinator insists on parallelization **after** port tip is known:

| Worker | Task | Partition rule |
| --- | --- | --- |
| PC2-A1 | `…_HEALTH_REPORTER_FOUNDATION_P17` | Own `platforms/core/health/**` + docs; **single owner** of `packageIdentity.ts` / contracts test updates |
| PC2-A2 | *idle* or doc-only audit | Avoid `platforms/core/**` shared exports |
| PC2-A3 | *idle* | — |

True 3-way parallel on P17/P18/P19 is **not safe** without a Coordinator-owned integration branch owning shared index/identity files.

---

## Exact base per task

| TASK_ID | Base SHA |
| --- | --- |
| `UM_CORE_PLATFORM_ONTO_ALPHA_PORT_V1` | `bc09e1379da595a08e27b3146ff00f3bca5fcb01` |
| `UM_CORE_PLATFORM_HEALTH_REPORTER_FOUNDATION_P17` | **TBD post-port tip**; interim (discouraged): `3120432f2cd84a30498192838b2ca58794308352` |
| `UM_CORE_PLATFORM_DEPENDENCY_VALIDATOR_FOUNDATION_P18` | Post-P17 tip |
| `UM_CORE_PLATFORM_SDK_CLIENT_FACTORY_FOUNDATION_P19` | Post-P17 tip (min); ideally post-P18 |
| `UM_CORE_PLATFORM_OBSERVABILITY_CONTRACTS_FOUNDATION_P20` | Post-port tip (or later) |

---

## Collision analysis

| Hot file / area | Port (#1) | P17 Health | P18 DepVal | P19 SDK | P20 Observ |
| --- | --- | --- | --- | --- | --- |
| `package.json` | No | No | No | No | No |
| `app/layout.tsx` | No | No | No | No | No |
| `lib/ai/**` | No | No | No | No | No (must stay out) |
| `supabase/migrations/**` | No | No | No | No | No |
| `vitest.config.ts` | **YES** (include) | No* | No* | No* | No* |
| `docs/ai/CURRENT_TASK.md` / `CURSOR_REPORT.md` | **YES** | YES | YES | YES | YES |
| `platforms/core/**` shared identity/exports | Add tree | **YES** | **YES** | **YES** | MED |
| Commerce / Learning / Collaboration | No | No | No | No | No |

\*Unless a new test glob path is needed beyond `platforms/core/**/*.test.ts` already added by port.

**Merge-tree evidence (alpha ← P16):** conflicts only in:
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `vitest.config.ts`

---

## Migration/DB/paid-AI requirements

| TASK_ID | Migration | DB write | Paid AI |
| --- | --- | --- | --- |
| ONTO_ALPHA_PORT_V1 | NO | NO | NO |
| HEALTH_REPORTER_P17 | NO | NO | NO |
| DEPENDENCY_VALIDATOR_P18 | NO | NO | NO |
| SDK_CLIENT_FACTORY_P19 | NO | NO | NO |
| OBSERVABILITY_CONTRACTS_P20 | NO | NO | NO |

All five candidates are pure TypeScript / docs / tests under Core isolation rules.

---

## Explicit flags

```
TRANSLATION_V1_REOPENED = NO
TRANSLATION_V2_STARTED = NO
COMMERCE_TOUCHED = NO
LEARNING_TOUCHED = NO
COLLABORATION_TOUCHED = NO
DATABASE_MUTATION = NO
ALPHA_CHANGED = NO
```

---

## STOP

No recommended task started. Awaiting Central Coordinator **GO**.

---

## Appendix — commands / paths inspected

- `git fetch --all --prune`
- `git rev-parse origin/alpha-0.2` / `HEAD` / P16 tip
- `git rev-list --left-right --count HEAD...origin/alpha-0.2` → `0 0`
- `git merge-base` / `git merge-tree` conflict preview
- `git ls-tree` for `platforms/` absence on alpha
- Remote branch inventory `origin/office/um-core-platform-*`
- Docs: `docs/ai/PROJECT_STATE.md`, `docs/ai/CURRENT_TASK.md`, `docs/ai/COMPUTER_2_CENTRAL_SERVER_HANDOFF_V1.md`, tip `docs/core/*`, tip `platforms/core/README.md`, tip P16 CURRENT_TASK/CURSOR_REPORT
- Alpha tree samples: `lib/*` platform-ish dirs, observability path search, `vitest.config.ts`, `tsconfig.json`, `package.json`
- Z:\TO-SERVER\ not mapped on this device (`Test-Path` → False)
