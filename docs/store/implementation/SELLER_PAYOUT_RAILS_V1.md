# Commerce Seller Payout Rails V1

Capability: `commerce.settlement.seller_payout_rails_v1`  
Module: `lib/store/sellerPayoutRails/`  
Admin: `/admin/store/payouts`

## Audit

Existing ledger booking (`sellerPayoutFoundation`, settlement release, seller eligibility/history read models) remains the money-path source of truth. This slice adds **rails abstraction contracts** and **mock execution** only.

## Guarantees

- No Stripe Connect / Wise / PayPal / bank API
- No live fund movement (`supportsLiveTransfer: false`, `bankRailsEnabled: false`)
- Mock execution records success/failure locally
- Does not modify commission, notifications, or Stripe payment config

## Surfaces

- Admin diagnostics: requests, batches, providers, executions, failures
- Seller read model: available/blocked balance, pending payouts, history
