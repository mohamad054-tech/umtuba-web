# UM Core — Compliance Engine Foundation P3

**Status:** Implemented (pure assessment)  
**Branch:** `office/um-core-platform-compliance-engine-p3`  
**Base:** `office/um-core-platform-manifest-validation-p2` @ `99300de`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1

## Goal

Determine whether a platform is compliant with Core specification and
engineering standards using **deterministic analysis only**.

P3 **assesses**. It does **not** register, persist, execute, or network.

## Engine

- `assessPlatformCompliance` / `createComplianceEngine`
- Consumes manifest (+ optional upstream validation/admission results)
- If validation/admission omitted, runs P2 validators in-process (pure)

## Output model

| Field | Meaning |
| --- | --- |
| `score` | Integer 0–100 |
| `status` | `compliant` / `partially_compliant` / `non_compliant` |
| `maturityOk` | Maturity declaration consistent with standards |
| `certificationStatus` | Eligibility for each certification kind |
| `criticalViolations` / `warnings` / `information` | Severity buckets |
| `missingRequiredEvidence` | Evidence gaps with required-for certs |
| `failedStandards` | Distinct `standardRef` values from active findings |
| `waivers` / `waivedFindingCodes` | Active waivers and suppressed codes |
| `recommendation` | Machine + human next-step guidance |

## Certification kinds

- `core_certified`
- `production_certified`
- `enterprise_certified`
- `long_term_supported`

## Scoring (deterministic)

- Start at 100
- Critical finding: −20
- Warning finding: −5
- Unrepresented evidence gap: −10
- Clamp to `[0, 100]`

Status:

- no critical and score ≥ 90 → `compliant`
- no critical and score ≥ 70 → `partially_compliant`
- otherwise → `non_compliant` (critical always forces non_compliant)

## Diagnostics

Findings are deterministic:

1. severity (`critical` → `warning` → `info`)
2. `code`
3. `path`

Each finding includes human-readable `message` and `standardRef`.

## Non-goals

- Registry / runtime / event bus / flag engine / health engine / SDK behavior
- Persistence / networking / product-platform integration
- Database / migrations
- Granting live certificates (eligibility only)

## Proposed commit subject

`feat(core): add UM Core compliance engine foundation P3`
