# UM Core Platform — Operational & Error Contract V1

```
TASK_ID=UM_CORE_PLATFORM_OPERATIONAL_ERROR_AND_RELEASE_SIGNOFF_CLOSEOUT_V1
AGENT_ID=PC2-A3
SOURCE_DEVICE=PC2
MODE=DOCS / EVIDENCE CONSOLIDATION
PRODUCT_SEMANTICS_CHANGED=NO
UNIVERSAL_ERROR_FRAMEWORK=NO
```

**Status:** Closed as operational/error evidence freeze (docs + lock tests).  
**Base tip at authorship:** `origin/alpha-0.2` @ `a93f52235fee11e73ad9953993e109a894f99aac`
**Does not reopen:** `UM_CORE_PLATFORM_API_STABILITY_AND_ERROR_CONTRACT_HARDENING_V1` (`NO_CHANGE_REQUIRED`).

This document consolidates (1) the operational readiness boundary and (2) the
throw-vs-result / diagnostic failure law already proven on alpha. It is **not**
a new universal error framework and invents **no** runtime semantics.

---

## 1. Operational readiness boundary

### In scope (UM Core foundation)

| Surface | Boundary |
| --- | --- |
| In-memory catalogs & validators (P1–P22) | Deterministic, fail-closed, pure/local stores |
| P19 dependency validator | Explicit opt-in only; unused-by-default |
| P23 lifecycle readiness | Implemented + local barrel; **not** root-exported on current alpha tip |
| P24 capability compatibility | Root-reachable via `capability` barrel |
| Public contract inventory / BC / production-contract / golden-path / coherence / property / hot-path suites | Regression evidence (integration line may lag office tips) |

### Explicit non-goals (ops successor layer — out of Core)

- Probe execution, polling, schedulers, alerting, telemetry exporters
- Network I/O, remote health checks, DB / migrations / persistence
- Event bus transport beyond in-memory P16 admission
- Product-domain wiring (Translation / Commerce / Learning / Collaboration / Mobile / Guardian)
- Silent automatic P19 admission into P2 / P4 / P9 / P13 / RI / SDK / readiness
- Universal diagnostic findings normalizer (declined: `NO_CHANGE_REQUIRED`)
- Dependency Graph / Configuration Validation foundations (declined / `NOT_REQUIRED`)

**Law:** UM Core PRODUCTION_READY (library/foundation freeze) does **not** require
an ops control plane. Successor ops systems may compose Core ports; they must
not redefine Core result shapes or invent automatic P19 consumers without a
dedicated Central GO.

---

## 2. Error / result families (frozen)

Source audit: `UM_CORE_PLATFORM_API_STABILITY_AND_ERROR_CONTRACT_HARDENING_V1`
→ **VERDICT=`NO_CHANGE_REQUIRED`** (no P0/P1 inconsistency proven). Re-verified
against current tip throw sites: production throws remain SDK factory
construction only.

### A. Registration catalogs — `{ ok, findings[], … }`

- Surfaces: P4–P10 registries (platform/capability/event/routing/flag/dependency/health).
- `ok === true` iff no finding with `severity === "error"` (warnings/info allowed).
- Findings sorted (severity rank → code → path). Namespaced codes per domain.
- Unknown platform on write → typed `ok:false` (fail-closed); does not throw.

### B. Admission / mutation validators — `{ ok, findings[] }`

- Surfaces: P16 publish, P17 report, P22 history create/record, P20 fleet bag.
- Dominant rule: `ok === (findings.length === 0)` where the surface uses
  non-severity findings.
- Invalid capacity / unknown platform → Result, not throw.

### C. Validation / review engines — Result-returning

| Surface | Shape notes |
| --- | --- |
| P2 manifest / admission | `UmValidationResult`; severity-aware `ok` |
| P13 dependency completeness/drift | `dependency.validation.*` |
| P19 candidate `requires[]` | `dependency.validator.*`; `ok === findings.length === 0`; **never throws** |
| RI | `referential.*`; read-only |
| P3 compliance | Rich status/score/findings (domain-specific, not a global Result type) |

### D. Evaluation / assertion — `{ enabled, reasonCode, … }`

- P14 flag evaluator / P15 capability asserter.
- Unknown → `enabled:false` + namespaced reason; **no throws**.

### E. Read models — absence ≠ error

- Registry `get`/`has`, health `getSnapshot` → `undefined`/`false`.
- P18 diagnostics join classifies orphans; does not invent admission failures.

### F. SDK factory (P21) — construction throws; ports return Results

| Call | Failure mode |
| --- | --- |
| `createInMemoryUmCoreSdkFactory(deps)` with missing/invalid ports | **throws** `Error` |
| `createClient(identity)` with invalid identity | **throws** `Error` |
| Client `register` / `publish` / `report` / evaluate / assert | Typed Results only (delegate to injected ports) |

This throw-vs-result split is intentional and matches declared TypeScript return
types. Unifying it into a universal Result envelope would be a breaking
framework invention — **forbidden**.

### G. Public error identifier stability

- Codes are frozen `as const` with **namespaced string values**.
- Cross-domain “unknown platform” uses API-local identifiers by design
  (not one global code).
- Hardening audit: no colliding identical code strings proven.

---

## 3. Diagnostic / negative contracts (must remain true)

| Negative | Law |
| --- | --- |
| P13 ≠ P19 | Completeness/drift vs candidate `requires[]`; namespaces split |
| P19 ≠ RI | Candidate review vs registered-catalog missing refs |
| Health observation `ready` ≠ lifecycle READY | P23 readiness is a separate gate vocabulary |
| Capability compatibility ≠ health / readiness | Distinct vocabularies |
| Pure validators do not mutate stores | Fingerprint-stable under review |
| Repeated validation is deterministic | Sorted findings; stable ids |
| P19 unused-by-default | Zero automatic production call sites on alpha |

Evidence locks live in golden-path, production-contract suite, coherence matrix,
RC pack (office tip), and `operationalErrorContract.lock.test.ts`.

---

## 4. Central consumer GO (P19) — current-release resolution

| Fact | Evidence |
| --- | --- |
| P19 on alpha | Phase `P19`; public via validation barrel |
| Unused-by-default | Boundary hardening: automatic consumers = **NONE** |
| Consumer audit | `NO_CONSUMER_APPROVED` — zero justified existing Core consumers |
| Forbidden | Inventing a consumer / silent auto-wire |

**Decision for current release (library/foundation freeze):**

```
CENTRAL_CONSUMER_GO_STATUS=NOT_REQUIRED_FOR_CURRENT_RELEASE
CENTRAL_CONSUMER_GO_NOT_REQUIRED_FOR_CURRENT_RELEASE=YES
```

Absence of a P19 (or SDK) production consumer is **not** a release blocker for
submitting UM Core to Central for foundation PRODUCTION_READY signoff, because:

1. Unused-by-default is the approved production boundary until a justified caller exists.
2. Consumer readiness audit rejected every existing Core boundary as a wire target.
3. Inventing a consumer would violate Central assignment rules and create dual SoT risk (esp. vs P9/P13/RI).

A **future** Central GO may approve exactly one explicit opt-in consumer pattern.
That wave must publish call-site ownership, failure propagation, and
non-duplication proof **before** any product edit. Until then, Core remains
callable via documented explicit construction only.

---

## 5. Secret / side-effect law

- No Core public API may log, return, or embed secrets, service-role keys, or `.env` material.
- No network / DB / migration side effects on validation or health paths.
- Failures are structured codes + messages suitable for deterministic tests.

---

## 6. Relationship to other normative docs

| Doc | Role |
| --- | --- |
| Per-phase `docs/core/UM_CORE_PLATFORM_*` | Foundation law |
| `UM_CORE_PUBLIC_API_CONTRACT_MATRIX_V1.md` | Public symbol inventory (may lag office sync tips) |
| `UM_CORE_SPECIFICATION_V1` / `UM_CORE_ENGINEERING_STANDARDS_V1` | Umbrella Spec/Standards (**owned by separate A2 closeout**; cited by barrel `@see`) |
| This file | Ops boundary + error/result freeze for release signoff |

---

## 7. Non-reopen list

- API stability / error contract hardening (`NO_CHANGE_REQUIRED`)
- Diagnostic findings normalization (`NO_CHANGE_REQUIRED`)
- P19 automatic consumer invention
- Universal error framework / global code rename
- Probe / network / DB / product-domain enablement without dedicated GO
