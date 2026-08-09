# Partial Refund Provider Money — Terminal State & Replay Invariants V1

**Task:** `COMMERCE_REFUND_PROVIDER_TERMINAL_STATE_AND_REPLAY_INVARIANTS_V1`
**Module:** `lib/store/partialRefundProviderMoneyExecution/refundProviderTerminalStateReplayInvariants.ts`
**Constraints:** `STRIPE_CALLS=0` · `MONEY_MOVEMENT=0` · `DB_WRITES=0` · `PROVIDER_GATES=OFF`

## Purpose

Pure, fail-closed decision boundary that proves terminal-state + replay invariants from durable local facts **before** any provider money submit.

Deterministic decisions (where supported):

| Field | Meaning |
|------|---------|
| `EXECUTION_ALLOWED` | First-time provider submit may proceed (gates/ACK still required at runtime) |
| `EXECUTION_BLOCKED` | Provider submit must not run |
| `RECONCILIATION_REQUIRED` | Local/provider state needs reconciliation / recovery lookup |
| `RECOVERY_REQUIRED` | Explicit recovery path required (lookup or stuck-committing recovery) |
| `OPERATOR_REVIEW_REQUIRED` | Human review required; never auto second money |

Also emits `retrySafe` (always `false` for `uncertain` / unknown class without new evidence).

## Actual state names (from SoT contracts — do not invent)

| Domain | Actual names |
|--------|----------------|
| Provider execution | `planned`, `executing`, `succeeded`, `failed`, `uncertain` |
| Provider terminal | `succeeded`, `failed` (`isTerminalProviderExecutionStatus`) |
| Provider unknown class | `uncertain` (task vocabulary UNKNOWN) |
| Ledger | `planned`, `committing`, `committed`, `failed`, `compensated` |
| Stuck committing | operational class on ledger `committing` → `partialRefundStuckCommittingRecovery` |
| Reconciled | **not** a durable status; terminal class = `succeeded`/`failed` after recovery/reconciliation claim |

Task vocabulary aliases (`SUCCESS`→`succeeded`, `FAILED`→`failed`, `UNKNOWN`→`uncertain`, `STUCK_COMMITTING`→`committing`, `RECONCILED`→null) are documentation-only via `TERMINAL_INVARIANT_TASK_ALIAS_MAP`.

## Proven invariants

1. Successful money execution (`succeeded`) cannot execute again
2. Compensated ledger cannot silently replay provider money
3. Reconciled terminal class (`succeeded`/`failed` after recovery claim) cannot silently replay
4. `uncertain` cannot become `retrySafe` without evidence
5. Stuck `committing` requires explicit recovery path (`RECOVERY_REQUIRED`)
6. Duplicate command cannot create second provider execution
7. Stale UI/action cannot bypass terminal-state protection
8. Repeated recovery action is idempotent (`classifyRepeatedRecoveryAction`)

## Out of scope

- Stripe API calls / invented provider truth
- Migrations / DB writes / gate activation
- Rewriting Central-review branches (`df10121`, `7681a01`, `b9d4348`)
- A2 Stripe TEST activation state machine files
- Canonical / alpha merge
