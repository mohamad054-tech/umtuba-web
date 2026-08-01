# Commerce Launch Readiness V1

Capability: `commerce.ops.launch_readiness_v1`
Branch: `office/commerce-launch-readiness-v1`
Base: `be87fb30c2c7ba15d66f8540e5e6c57e181649f6`
Type: audit + launch packaging (not a product feature)

## Machine split

| Laptop | Desktop |
| --- | --- |
| Audit, tests, docs, readiness report | Supabase migration apply |
| Reproduce app failures | Commission / refund sensitive repairs |
| No remote migration apply | No renumber / no casual DB surgery |

## Verdict (code tip)

**Code path for digital sell â†’ settle â†’ refund â†’ revoke: READY in repo.**
**Production launch: NO-GO until Desktop applies migrations through `20260891`, Stripe/webhook configured, and confirm-gate probe GO.**

## E2E readiness (summary)

| Step | Code | Production |
| --- | --- | --- |
| Product create | READY | PARTIAL (Wave A) |
| Digital asset | READY | BLOCKED (mig) |
| Publish readiness | READY | READY (TS gate) |
| Listing | READY | BLOCKED (mig) |
| Cart / checkout | PARTIAL | Confirm OFF blocks confirm |
| Payment capture | READY | BLOCKED (mig + env + gate) |
| Settlement allocate | READY | BLOCKED (mig) |
| Commission decomposition | READY | PARTIAL (policy seed/activate) |
| Seller payable (release) | READY | BLOCKED (mig) |
| Entitlement grant | READY | BLOCKED (mig) |
| Refund | READY | BLOCKED (mig) |
| Entitlement revoke | READY | BLOCKED (mig) |
| Reconciliation / audit | PARTIAL | Reads exist; ops alerting thin |

Post-capture wire: Sync capture â†’ allocate â†’ commission apply (soft) â†’ entitlement grant â†’ release.

## Physical vs digital

- Live Stripe attempt RPC **rejects physical lines** (`20260876`: `Live Stripe capture is limited to digital checkout orders`).
- Inventory foundation marks `physicalLaunchGated: true` for physical facts.
- Digital is the enabled launch sell path.

## Artifacts produced this pass

- `docs/store/operations/COMMERCE_LAUNCH_READINESS_CHECKLIST_V1.md`
- `docs/store/operations/COMMERCE_LAUNCH_ROLLBACK_RUNBOOK_V1.md`
- `docs/store/operations/COMMERCE_LAUNCH_READINESS_V1.md` (this file)
- `lib/store/commerceLaunchReadiness.test.ts` (static audit)

Sensitive modules (`commissionPolicy*`, `commissionDecomposition*`, `fullOrderRefundPath*`, migrations `20260889â€“91`) audited for consistency â€” **no confirmed code defect; not modified**.

## Monitoring gaps (recommend only)

1. Alert when Sync `captured` but allocate / entitlement / release â‰  success (webhook can still 200).
2. Stripe Dashboard â†” attempt/outcome drift.
3. Webhook signature / 502 / 503 rates.
4. Refund ops failed + revoke fail-closed counters.
5. Dispute / `charge.refunded` (explicitly deferred â€” not handled).
6. Commission `not_configured` after go-live.
7. Confirm-gate left ON after probe.

## Go / No-Go

**No-Go for production money** until Desktop Â§ migration apply + Stripe + confirm probe succeed.
**Go for laptop readiness packaging** when verification suite on this tip is PASS + STAGED.
