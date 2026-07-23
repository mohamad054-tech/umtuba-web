# Ads Candidate Provenance Foundation V1

## Purpose

Structured, bounded, deterministic identity continuity for Ads candidates across:

- Inventory Bridge
- Candidate Selection → Render Adapter
- Canonical Stack (selection → measurement/billing handoff diagnostics)
- Admin Diagnostic Runner

This foundation replaces the fragile pipe-joined `bindingToken` that overflowed
`ADS_DELIVERY_MAX_ID_LENGTH` (128) on UUID-dense inventory.

## Authority

| Concern | Rule |
| --- | --- |
| Authoritative identity | Structured provenance fields |
| `bindingToken` / fingerprint | Non-authoritative compatibility digest |
| Issuance | Only `buildAdsCandidateProvenanceBinding` (WeakSet) |
| Caller reconstruction | Fail closed (`isAdsIssuedProvenanceBinding`) |
| Production / delivery / billing | Always false / disabled |

Sole decision engine remains `runAdsCanonicalStackV1`.

## Structured contract

Issued binding (`AdsCandidateProvenanceBinding`) includes:

- `contractVersion` (`v1`)
- `advertiserRef` (advertiser account id)
- `campaignRef`, `adSetRef`, `creativeRef`, `adRef` (deliverable/ad id)
- `domainPlacement` + canonical `placementId`
- `candidateId`
- `inventorySourceId` + `inventoryRevision`
- `moderationSnapshotRef`
- `selectionRequestId` (correlation)
- `provenanceFingerprint` (deterministic digest)
- `bindingToken` (compatibility alias of fingerprint)
- `bindingTokenAuthoritative: false`
- `productionEnabled: false`

Bridge-carried identity (`AdsBridgeCandidateProvenanceV1`) mirrors binding
identity without request-scoped correlation and is attached to selection
candidates as `provenanceIdentity`.

## Deterministic fingerprint

```
ap1: + sha256_hex(
  v1 \0 advertiser \0 campaign \0 adSet \0 creative \0 ad \0
  domainPlacement \0 canonicalPlacement \0 candidateId
)
```

Properties:

- Stable for the same authoritative binding + placement
- Different when binding or placement differs
- Independent of `selectionRequestId` / inventory source overrides
- Always ≤ 128 characters
- No network dependency (`node:crypto` sha256)
- Never pipe-joins raw UUID identity fields into `bindingToken`

## Inventory Bridge

Every eligible selection candidate receives validated `provenanceIdentity`.
Candidates are excluded when provenance IDs are missing/malformed, placement
mapping disagrees, or `candidateId !== adId:placementId`.

## Canonical Stack

Provenance is issued in the selection→render adapter from inventory identity
(plus bridge identity when present), then continuity-checked through render,
execution, delivery, and measurement handoff diagnostics. Forged plain objects
cannot satisfy WeakSet issuance.

## Compatibility

Contracts that still read `bindingToken` receive the fingerprint digest.
`bindingTokenAuthoritative` is always `false`.

## Explicit non-goals

- No live delivery or billing
- No event ingestion
- No alternate decision pipeline
- No database schema migration
