# UM Core Engineering Standards V1

**Status:** Normative engineering standards capture for landed UM Core
**Canonical file:** `docs/core/UM_CORE_ENGINEERING_STANDARDS_V1.md`
**Cited as:** `UM_CORE_ENGINEERING_STANDARDS_V1`
**Companion:** `docs/core/UM_CORE_SPECIFICATION_V1.md`
**Release umbrella:** `docs/core/UM_CORE_PLATFORM_RELEASE_CONTRACT_V1.md`

Standards below are distilled from existing foundations, the public API matrix, the BC guard fixture, and coherence evidence. No new runtime rules are invented here.

## §1 Isolation

- `platforms/core` must not import product platforms.
- Product platforms may depend on Core; Core must not reverse-depend.
- Foundations remain in-memory / in-process unless a future dedicated task says otherwise.

## §2 Naming

- Machine IDs use Core naming predicates (`isUmMachineId`, scoped-under-platform rules).
- Public package id is `um.core`.
- Finding code namespaces are surface-owned and must remain disjoint across P13 / P19 / RI / readiness / capability-compat.

## §3 Manifest & admission

- P2 validates structure; admission may additionally enforce maturity gates.
- Free functions and factory ports exposing the same semantics are intentional duplicates.

## §4 Capability

- Capability registry admits catalog rows; execution is out of scope.
- Capability assertion (P15) composes catalog + flag evaluation; fail-closed.
- Capability compatibility (P24) is a separate pure evaluator (`capability.compat.*`).

## §5 Events

- Event type registry catalogs types; it does not deliver events.
- Routing catalog is declarative; publisher performs admission only (no bus).

## §7 Dependencies

- P9 materializes declared edges; P13 reviews completeness/drift; P19 optionally reviews candidate `requires[]`.
- **P19 = UNUSED_BY_DEFAULT** relative to P14–P17 and P21 SDK — explicit composition only.
- Dependency validation is not dependency resolution.

## §14 Flags

- P8 is catalog; P14 evaluates catalog defaults only (unknown ⇒ fail-closed unknown source).
- No cohorts/overrides/kill-switch runtime in Core foundations.

## §15 Registration

- P4 registers only after validation/compliance gates as implemented by the registry.
- P12 facade borrows seven specialized slots; it does not mega-wire validators/SDK.

## §16 SDK

- P21 factory borrows exact injected port refs; thin frozen client facade.
- Invalid factory deps / identity may throw (documented outlier); delegated port calls remain result-oriented.

## §18 Health

- Declaration (P10) ≠ observation (P17) ≠ diagnostics join (P18) ≠ fleet rollup (P20) ≠ history (P22).
- Status taxonomy: `ready` | `degraded` | `unavailable` only.
- Absence of observation is not coerced to `unavailable` by fleet/history rules already landed.
- Lifecycle readiness (P23) is a distinct vocabulary and is **not root-public** on this tip.

## §D Determinism

- Pure validators / evaluate paths: stable ordering of findings and deterministic id helpers.
- No clocks, RNG, network, or filesystem in foundation logic.

## §E Error / API stability

- BC-frozen code tables in `publicApiBackwardCompatibility.fixture.json` are the compatibility floor for string values.
- Additive code keys/namespaces are allowed; changing frozen strings is breaking.
- Do not freeze private implementation details or unexported helpers.

## §I Immutability & state

- Do not mutate caller-owned input objects.
- Pure paths must not write stores.
- Stateful components mutate only through documented write APIs; `clear()` is a test/dev helper retained for compatibility.
- Returned views/findings are snapshots.

## §C Change control

| Action | Standard |
| --- | --- |
| Docs packaging / evidence | Allowed without runtime changes |
| Additive root export | Allowed; sync matrix/BC in inventory-owning task |
| Remove/rename BC-frozen symbol or code | Breaking — dedicated task |
| Wire P23 to root | Magnet/wiring closeout only (A1) |
| Auto-wire P19 | Forbidden without Central consumer GO |

## Cross-links

- Spec: `docs/core/UM_CORE_SPECIFICATION_V1.md`
- Release contract: `docs/core/UM_CORE_PLATFORM_RELEASE_CONTRACT_V1.md`
- Matrix: `docs/core/UM_CORE_PUBLIC_API_CONTRACT_MATRIX_V1.md`
