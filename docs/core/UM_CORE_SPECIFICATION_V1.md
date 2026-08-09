# UM Core Specification V1

**Status:** Normative Spec capture for landed UM Core on `origin/alpha-0.2`
**Canonical file:** `docs/core/UM_CORE_SPECIFICATION_V1.md`
**Cited as:** `UM_CORE_SPECIFICATION_V1`
**Companion:** `docs/core/UM_CORE_ENGINEERING_STANDARDS_V1.md`
**Release umbrella:** `docs/core/UM_CORE_PLATFORM_RELEASE_CONTRACT_V1.md`
**Public barrel:** `platforms/core/index.ts`

This file closes the production-readiness packaging gap for the Spec name referenced throughout `platforms/core`. It records **existing** contracts only — it does not invent runtime semantics or redesign APIs.

## 1. What UM Core is

UM Core (`um.core`) is an in-process, in-memory platform foundation library providing:

- Identity / manifest / maturity contracts
- Fail-closed validators and compliance assessment
- Specialized registries and a seven-slot aggregate facade
- Catalog-backed evaluators (flags, capability assertion, event publish admission)
- Health declaration, observation, diagnostics join, fleet aggregation, bounded history
- Optional dependency-requirement validation (P19)
- Optional capability-compatibility evaluation (P24)
- Local (non-root-public) lifecycle readiness (P23)

UM Core is **not** a networked control plane, product SDK runtime, or persistence layer.

## 2. Public API law

1. **Root-public** = symbols reachable from `platforms/core/index.ts`.
2. Sub-barrels are public only to the extent the root re-exports them.
3. Deep imports of non-exported modules are unsupported consumer contract.
4. Practical backward-compat floor = `platforms/core/test/publicApiBackwardCompatibility.fixture.json`.

## 3. Integrated phase map (tip reality)

| Phase | Responsibility | Root-public |
| --- | --- | --- |
| P1–P18 | Identity → diagnostics join (see phase docs) | Yes |
| P19 | Dependency requirement validator (`dependency.validator.*`) | Yes · **UNUSED_BY_DEFAULT** |
| P20–P22 | Fleet aggregation, SDK factory, bounded health history | Yes |
| RI | Cross-catalog referential integrity (`referential.*`) | Yes |
| P23 | Lifecycle readiness (`readiness.*`) | **No** (local barrel only) |
| P24 | Capability compatibility (`capability.compat.*`) | Yes |

Detailed export inventory and readiness columns: `UM_CORE_PUBLIC_API_CONTRACT_MATRIX_V1.md` (see release contract for packaging rules: P19 unused-by-default, P23 not root-public).

## 4. Behavioral specification (landed)

### 4.1 Failure model

- Dominant: result-returning fail-closed (`ok` / findings / codes).
- Documented outlier: P21 SDK factory may throw on invalid factory deps / identity construction; port delegation remains result-returning.

### 4.2 Determinism

Equal inputs + equal injected catalog snapshots ⇒ equal verdicts and stably ordered findings for pure validators and pure evaluate paths.

### 4.3 Health vs readiness

- Health observation tokens: `ready` | `degraded` | `unavailable`.
- Lifecycle readiness verdicts (`READY` / `NOT_READY`) are a distinct P23 concept and are **not** root-public on this tip.
- Observation `ready` alone never authorizes product “lifecycle ready” claims via the root barrel.

### 4.4 Dependency validation split

| Surface | Namespace | Role |
| --- | --- | --- |
| P2 | `manifest.requires.*` | Structural requires[] rules inside one manifest |
| P9 | `dependency.registry.*` | Edge catalog admission |
| P13 | `dependency.validation.*` | Post-admission completeness / stale / drift |
| P19 | `dependency.validator.*` | Candidate requires[] review (optional) |
| RI | `referential.*` | Cross-catalog missing references |

## 5. Unsupported (Spec non-goals)

Network probes, DB/migrations, product-domain wiring, DI/installers/version solvers, silent P19 auto-wire, treating P23 as root-public without a wiring closeout, alpha merge authority.

## 6. Normative references

- Release contract: `docs/core/UM_CORE_PLATFORM_RELEASE_CONTRACT_V1.md`
- Engineering standards: `docs/core/UM_CORE_ENGINEERING_STANDARDS_V1.md`
- Public API matrix: `docs/core/UM_CORE_PUBLIC_API_CONTRACT_MATRIX_V1.md`
- P19 foundation: `docs/core/UM_CORE_PLATFORM_DEPENDENCY_VALIDATOR_FOUNDATION_P19.md`
- P23 foundation: `docs/core/UM_CORE_PLATFORM_LIFECYCLE_READINESS_FOUNDATION_V1.md`
