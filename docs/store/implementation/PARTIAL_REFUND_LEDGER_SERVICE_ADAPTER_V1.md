# Commerce Partial Refund Ledger Service-Role Adapter & Reservation Orchestration V1

Capability: `commerce.payments.partial_refund_ledger_service_adapter_v1`  
Module: `lib/store/partialRefundLedger/` (`serviceRoleRepository.ts`, `rpcClient.ts`, `reservationOrchestrator.ts`)  
Version: `commerce-partial-refund-ledger-service-adapter-v1`

## Status

**CLOSED** (`PARTIAL_REFUND_SERVICE_ADAPTER_V1_CLOSED`).

Migrations `20260899` and `20260900` are **remotely applied** (tip `20260900`).  
This milestone adds a **service-role repository adapter** and **reservation-only orchestration**.  
No real refund was executed. No provider was called. No money moved.
No restock, entitlement, settlement, commission, payout, or compensation occurred.
No UI execution wiring. Provider execution requires a later separate GO.

## Purpose

1. Implement `PartialRefundLedgerRepository` against privileged RPCs via an **injected** service-role RPC port.
2. Orchestrate: calculate → ensure → plan → begin → complete as a **durable reservation**.
3. Keep `committed` = reservation only (not money moved).

## Ownership

| Flag | Value |
| --- | --- |
| ledgerRepository | **true** |
| reservationOrchestration | **true** |
| providerRefundExecution | **false** |
| moneyMovement | **false** |
| partialRestock | **false** |
| partialEntitlement | **false** |
| partialSettlement | **false** |
| partialCommission | **false** |
| compensation | **false** |
| public/admin/seller execution wiring | **false** (deferred) |

## Sequence

`reservePartialRefundLedgerCommit(repo, input)`:

1. Reject client money bags on intent
2. `calculatePartialRefundPlan` from trusted facts + qty intents
3. `ensureCaptureAccounting`
4. `planPartialRefundLedgerCommit` (idempotent fingerprint)
5. `beginPartialRefundLedgerCommit` (quantity + version checks)
6. `completePartialRefundLedgerCommit` (reservation only)

Post-begin failure: invoke `failPartialRefundLedgerCommit` when complete fails.

## Security

- Injected `PartialRefundLedgerRpcPort` only (no browser/anon client factory in adapter)
- No `NEXT_PUBLIC` service-role usage
- No credential logging
- No RPC grant changes
- No direct table writes (RPCs own the boundary)

## Deferred (separate GO)

- Provider / Sync money execution
- Admin/seller/buyer execution UI wiring
- Restock / entitlement / settlement / commission unwind
- Compensation for committed reservations

## Related

- Schema: `PARTIAL_REFUND_LEDGER_COMMIT_BOUNDARY_V1.md`
- RPCs: `PARTIAL_REFUND_LEDGER_RPC_REMOTE_APPLY_READINESS_V1.md`
- Calculation: `PARTIAL_REFUND_PATH_V1.md`
