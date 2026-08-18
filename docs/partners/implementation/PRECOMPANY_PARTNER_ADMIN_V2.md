# Partner Admin Foundation V2 (pre-company)

Shared Store + Learning onboarding. Domain: `lib/partners`.

## Lifecycle

`DRAFT → LEGAL_REVIEW → APPROVED → INTEGRATION → QA → ACTIVE → SUSPENDED → TERMINATED`

ACTIVE requires granted rights, legal APPROVED, and contract SIGNED.
`REAL_PARTNER_DATA` cannot be ACTIVE (SQL check + TS gate).
No outbound partnership messages. No claimed real partnerships.

## Credentials

Presence / rotation / revocation + opaque `vault_ref` only. Never plaintext.

## Commercial placeholders

Markets, currencies, languages, commission/revenue-share bps, VAT/tax
classification placeholders, payout ledger (`PLACEHOLDER|ACCRUED|VOID`).
Not payable. Not collectable.
