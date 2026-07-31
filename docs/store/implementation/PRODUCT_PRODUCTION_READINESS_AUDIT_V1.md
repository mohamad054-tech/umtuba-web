# Product Production Readiness Audit V1

Capability: `commerce.product.production_readiness_audit_v1`
Status: implemented locally (no migration — composes existing SSOTs)

## Purpose

One trusted **server-side** evaluation that answers:

- **READY** — product is genuinely ready for production, or
- **NOT_READY** — plus an **ordered checklist of blockers**

No client trust. Deterministic. Fail closed. No UI redesign. No Dashboard/AI.

## TS SSOT

`lib/store/productProductionReadinessAudit.ts`

- `evaluateProductProductionReadiness(facts)`
- `rejectClientProductionReadinessFields(bag)`

Callers must load facts from the server (store, product, category, price, inventory, digital asset, commerce confirm, optional listing). Never accept client `verdict` / stock / confirm / ownership claims.

## Reused (no duplicate systems)

| Concern | Reuse |
| --- | --- |
| Category | `assertPrimaryCategoryEligibleForReview` |
| Digital publish readiness | `evaluateDigitalProductPublishReadiness` |
| Inventory model | `resolveTrustedInventoryAvailability` |
| Marketplace / supplier | `evaluateMarketplaceEligibility` |
| Physical launch gate | `decideCommerceConfirmAllowed` |
| Settlement / commission notes | `buildMarketplaceRevenueBridgeProvenance`, `commissionDoesNotAlterSettlementAmount`, `commissionDoesNotEnablePayoutExecution`, `supplierListingCreateCompatibility` |

## Checks covered

Seller verified · store active · ownership · category valid/active · publish readiness · inventory valid · pricing valid · moderation · product active · physical gate · marketplace eligibility · supplier integrity · listing integrity · duplicate listing · settlement/payout/commission compatibility

## Physical vs digital

- **Digital:** confirm gate may stay OFF; asset must be ready.
- **Physical:** `commerce_confirm_enabled` must allow confirm (else `physical_gate`).

## Migration

**None.**

## Out of scope

New product features, UI redesign, Dashboard, Admin console, AI, remote apply, inventing commission/settlement amounts.
