# Current Task

## Task title

Commerce Trading Domain Alignment & Integrity V1

## Status

`complete`

## Branch

`office/commerce-trading-domain-alignment-integrity-v1`

## Base

Trusted dashboard commit `fa2aedfe5aa0a401c04c8ac3712727de5bc16ef4`
Parent branch: `office/commerce-premium-seller-dashboard-insights-v1`

## Deliverable

Code-level alignment of the Commerce trading path:

Catalog Price → Cart Snapshot → Checkout Quote → Order Confirmation → Order Money Snapshots → Payment State

Shared contract helpers in `lib/store/tradingContracts.ts`; consumers hardened for compare-at integrity, client money rejection, mixed-currency fail-closed, quote money without cart fallback, single exclusive-tax grand-total path, and unified payment-state classification. No payment provider. No Warehouse/Shipping Network. No frozen Commerce architecture edits. No migrations.

## Next after this task

Settlement/payout visibility when trusted financial ledger is connected — still no payment provider / Shipping Network / Warehouse execution unless requested. Optional: payment-provider integration only if explicitly authorized.
