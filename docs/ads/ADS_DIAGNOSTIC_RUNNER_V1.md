# Ads Diagnostic Runner V1

## Purpose

Internal developer/operator tool that executes the canonical Ads decision stack
against persisted inventory for **inspection only**.

This is **not**:

- a production serving path
- a user-facing ad renderer
- a second decision pipeline
- a measurement ingestion or billing trigger

## Authority

| Concern | Authority |
| --- | --- |
| Inventory source | Inventory Bridge only (`loadAdsInventoryBridgeForAdvertiser`) |
| Decision engine | `runAdsCanonicalStackV1` only |
| Admin access | DB `assertPlatformAdminDb` inside `executeAdsDiagnosticRunnerV1` |
| Production acceptance | Always `false` |
| Delivery / billing | Always disabled |

## Authorization boundary

Public execution entrypoint (server-only):

`lib/ads/diagnosticRunnerServer.ts` → `executeAdsDiagnosticRunnerV1`

Before any inventory load it:

1. Validates `adminUserId` as a UUID
2. Confirms `supabase.auth.getUser()` matches `adminUserId`
3. Calls **`assertPlatformAdminDb`** (SECURITY DEFINER RPC / `platform_admins`)
4. Only then parses the request and loads the Inventory Bridge

There is **no** public gate constructor and **no** trust of caller-supplied
`platformAdminVerified: true` objects. Those fields are forbidden on the request.

`lib/ads/index.ts` flat-exports contracts/helpers only — not the server
execution entrypoint.

## Request contract

Server-authoritative `AdsDiagnosticRequestV1`:

- `advertiserAccountId` (required UUID)
- `placement` (required; domain or canonical; resolved server-side)
- optional `campaignId` / `adSetId` (UUID when provided)
- optional `candidateLimit` (1–64)
- optional `correlationId` (`[A-Za-z0-9_.:-]`, max 128) or server-generated
- `currentTimestamp` (injected by server)

Unknown and forgeable auth/inventory fields fail closed.

## Execution flow

1. DB-backed platform-admin authorization
2. Parse request
3. Load bridge inventory for advertiser (read-only)
4. Scope `selectionInventory` by placement / campaign / ad set / limit
5. Build diagnostic scaffolding (ranking/budget/pacing/frequency/IVT/pricing)
6. Execute `runAdsCanonicalStackV1`
7. Emit structured `AdsDiagnosticReportV1`

## Report contents

- request + correlation identifiers
- loaded candidates + bridge exclusions
- eligibility decisions
- ranking / auction inputs
- fraud/IVT decision
- render eligibility
- delivery gate
- measurement handoff (package presence only; ingestion never triggered)
- billing handoff (eligibility diagnostic only; charging never triggered)
- final canonical decision + decision trace + provenance
- rejection reasons

## Operator UI

Route: `/admin/ads/diagnostics` (admin-only, under `/admin` protection)

- Form to run diagnostics
- Calls only `executeAdsDiagnosticRunnerV1`
- Inspect decision trace, candidates, rejection reasons, provenance
- Client-side filters for candidates / reasons (display only)
- Explicit “diagnostics only” banner — no production render

## Export quarantine

| Surface | Exposed |
| --- | --- |
| `lib/ads/index.ts` | Contracts/helpers only (`parseAdsDiagnosticRequestV1`, types, authority constants) |
| `lib/ads/diagnosticRunner.ts` | Pure parse/scope/report helpers — **no** execution entrypoint, **no** gate constructor |
| `lib/ads/diagnosticRunnerServer.ts` | `server-only` → `executeAdsDiagnosticRunnerV1` (DB-authorized) |

Advertiser/public actions must not import `diagnosticRunnerServer`. The admin page
imports that module directly.

## Explicit non-goals

- No Games / Learning / Store / World product wiring
- No live delivery or live billing
- No advertiser access
- No public route
- No database mutations from the runner
- No event ingestion / UEOS charging

## Provenance

Diagnostics consume Candidate Provenance Foundation V1:

- Bridge candidates carry structured `provenanceIdentity`
- Canonical stack issues WeakSet provenance with a bounded fingerprint
- `bindingToken` is a non-authoritative digest alias (`ap1:` + sha256)
- UUID-dense inventory is supported
- Admin UI can filter/search structured provenance fields

See `docs/ads/ADS_CANDIDATE_PROVENANCE_FOUNDATION_V1.md`.
