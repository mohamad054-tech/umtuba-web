# Stripe TEST External Prerequisite Operator Packet V1

**TASK_ID:** `COMMERCE_STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_V1`  
**Module:** `lib/store/partialRefundProviderMoneyExecution/stripeTestExternalPrerequisiteOperatorPacket.ts`  
**Status:** SAFE operator packet for **B3/B4 only** — **NO STRIPE EXECUTION**

## Purpose

Define the SAFE operator packet that clears external prerequisites:

| Blocker | Meaning |
| --- | --- |
| **B3** | Stripe TEST credentials absent on operator host |
| **B4** | Controlled TEST money fixture inputs unavailable |

This packet **does not** obtain/create secrets, call Stripe, enable provider gates,
move money, write production DB, or authorize controlled Stripe TEST execution.

## Final required flags

| Flag | Value |
| --- | --- |
| `OPERATOR_PACKET_READY` | **YES** (contract defined + fail-closed) |
| `CENTRAL_INTEGRATION_STILL_REQUIRED` | **YES** |
| `STRIPE_EXECUTION_AUTHORIZED` | **NO** |

Central still owns SoT integration of:

- SM + dry-run lineage (not on Commerce SoT tip)
- Env-readiness `386b382…` (not on Commerce SoT tip)

## REQUIRED_TEST_CONFIGURATION_NAMES (B3)

Place **TEST-only** values in isolated worktree `.env.local` (never commit):

| Env name | TEST-only rule |
| --- | --- |
| `STRIPE_MODE` | exactly `test` |
| `STRIPE_SECRET_KEY` | TEST secret prefix only |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | TEST publishable prefix only |
| `STRIPE_WEBHOOK_SECRET` | webhook signing secret prefix |
| `NEXT_PUBLIC_APP_URL` | local/test app origin |

Optional aliases (same TEST rules): `STRIPE_PUBLISHABLE_KEY`, `APP_ORIGIN`, `NEXT_PUBLIC_SITE_URL`.

## REQUIRED_FIXTURE_FIELDS (B4)

Operator attestation booleans only (never fabricate identifiers into git):

1. `capturedTestPaymentIntentReady`
2. `matchingPaymentAttemptCaptureFactsReady`
3. `committedPartialRefundLedgerReady`
4. `zeroProviderExecutionRowsForLedger`
5. `isolatedSupabaseOrExplicitMoneyFixtureGo`

Code-side NON-SECRET fixture pack definitions remain available on SoT via
`stripeTestFixturePack.ts` and do **not** replace operator money fixtures.

## TEST_ONLY_VALIDATION

- Mode must be `test`
- Secret / publishable must use TEST prefixes
- Webhook secret must use signing prefix
- App origin must be non-empty local/test origin
- Presence + prefix mode only in reports — **never values**

## LIVE_CREDENTIAL_REJECTION

Fail closed when any of:

- `STRIPE_MODE=live`
- LIVE secret / publishable prefixes
- Production exec ACK present
- Mixed TEST/LIVE key modes

## SECRET_REDACTION_RULES

Allowed in reports/logs/git: env **names**, presence booleans, prefix-mode labels, reason codes.  
Forbidden: secret values, key-material substrings in report bodies, committing `.env` / `.env.local`.  
Never ask the operator to commit credentials.

## FIXTURE_VALIDATION_RULES

- Captured TEST PaymentIntent (operator-owned; do not invent IDs in git)
- Matching payment_attempt + capture facts for that PI
- Committed partial-refund ledger; amount > 0; currency match; ≤ captured
- Zero provider-execution rows for that ledger before first submit
- Isolated Supabase/test project **or** explicit written money-fixture GO
- Code fixture pack remains NON-SECRET / non-production labeled

## SAFE_STORAGE_INJECTION_BOUNDARY

| Rule | Value |
| --- | --- |
| Allowed location | `.env.local` on isolated local worktree host only |
| Forbidden | git-tracked env files, report bodies, CI logs, chat transcripts, production secret stores for this prep |
| Injection side effects | Does **not** enable provider gates; does **not** authorize Stripe execution |

## PRE_EXECUTION_CHECKLIST

Emitted by `buildExternalPrerequisitePreExecutionChecklist()` — B3/B4 clearance only.
Stops before any gate enablement / Stripe GO window. Wait for Central SoT integration
+ separate coordinator GO.

## POST_TEST_CLEANUP_REQUIREMENTS

Emitted by `buildExternalPrerequisitePostTestCleanupRequirements()` for use **after**
any future separately authorized TEST window (not executed by this task):

- Remove/rotate temporary local TEST credential values
- Confirm `.env.local` never staged/committed
- Gate/ACK/execution mode OFF; production exec ACK absent
- Reset activation SM if used under a separate GO
- Redact operator notes to names/booleans/reason codes only
- No retry without a new written GO

## How to probe (offline)

```ts
buildStripeTestExternalPrerequisiteOperatorPacketReport({
  env: /* local host env map — values never echoed */,
  operatorFixtures: { /* booleans only */ },
});
```

Expected contract verdict with safe host defaults:

`OPERATOR_PACKET_CONTRACT_READY_B3_B4_CLEARANCE_PENDING`

`b3CredentialsCleared` / `b4FixturesCleared` become true only after operator injection
+ fixture attestation. Even then:

- `centralIntegrationStillRequired = true`
- `stripeExecutionAuthorized = false`

## Explicit non-actions

- No Stripe API / activation / money movement
- No provider gate / execution mode enablement
- No production DB write / migration apply
- No secret creation, exposure, or commit
- No canonical / alpha merge / `_port_extract`
- No Central SM+dry-run / env-readiness SoT integration (Central owns)
