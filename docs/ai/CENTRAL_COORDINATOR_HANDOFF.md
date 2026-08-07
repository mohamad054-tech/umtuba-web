# CENTRAL COORDINATOR HANDOFF

**Authority:** The central server/coordinator is the sole task-allocation and migration-reservation authority for UMTUBA workstreams.

**Desktop local progression:** **PAUSED**. Implementation milestone is CLOSED. Agents must **not** self-start activation or self-select migration versions.

---

## Current Commerce milestone

| Field | Value |
| --- | --- |
| Milestone | **Commerce Partial Refund Provider Money Execution V1** |
| State | **`PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_IMPLEMENTATION_CLOSED`** |
| Closeout decision | **`CLOSE_IMPLEMENTATION_DEFER_TEST_ACTIVATION`** |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-provider-money-execution-v1` |
| Branch | `office/commerce-partial-refund-provider-money-execution-v1` |
| Checkpoint SHA | `8c6a53e710a3d75814f1cfb5830eeb204a0c4a9c` |
| Final commit SHA | `(see branch tip after P8 push)` |
| Project | `umtuba` / `tgucwnjwoyeqoxqaxmew` |
| Remote migration | **`20260915`** `store_partial_refund_provider_money_execution_v1` — **APPLIED + VERIFIED** (Commerce-owned) |
| New migration requested | **NONE** |
| Production-enabled | **NO** |
| Stripe TEST refund executed | **NO** |
| Stripe LIVE refund executed | **NO** |
| Live readiness claimed | **NO** |

---

## Implementation complete (closed)

* Provider execution persistence deployed (`20260915`)
* Service-role repository complete
* Trusted PaymentIntent resolution complete
* Stable idempotency `prf-prov:{ledgerId}`
* First-submit orchestration complete
* Unknown outcome → uncertain / recovery
* Recovery LOOKUP ONLY
* No blind resubmit (P7 hardened)
* Admin execute / recovery surfaces complete
* Gates / execution mode fail-closed by default
* P7 hardening complete

## Deferred activation prerequisite

**`Stripe Test/Production Activation & Validation`**

Requires centrally assigned isolated TEST configuration/environment. The closed implementation milestone does **not** automatically transition into activation.

---

## Safety state (must remain)

- Dedicated provider-money gate: **OFF**
- Execution mode: **`off`**
- No live Stripe refund executed
- No test Stripe refund executed
- No production money movement
- Shared primary Supabase must **not** receive artificial money fixtures without separate coordinator authorization

---

## Remote migration ownership map (known now)

| Version | Owner |
| --- | --- |
| `20260908` | Learning `learning_personal_notes_hub_v1` |
| `20260909` | Learning `learning_assessment_due_ux_followthrough_v1` |
| `20260910`–`20260914` | Translation (through `translation_studio_memory_identity_contract_align_v1`) |
| `20260915` | Commerce `store_partial_refund_provider_money_execution_v1` (**APPLIED**) |

**CRITICAL RULE:** Remote absence (`schema_migrations` count = 0) does **NOT** mean a version is free. Active origin branches, Desktop worktrees, uncommitted drafts, and CURRENT_TASK/handoff reservations **MUST** be checked before allocation.

**Activation milestone:** currently requires **no new migration allocation** unless future design proves otherwise.

---

## Exact next Commerce task (DO NOT START until coordinator assigns)

| Field | Value |
| --- | --- |
| Milestone | **Commerce Partial Refund Provider Money Activation & Test Validation V1** |
| Status | **`WAITING_CENTRAL_COORDINATOR_ASSIGNMENT`** |
| Blocker | Stripe TEST credentials / isolated safe fixture environment absent |

Future activation task must separately own:

* isolated Stripe TEST configuration
* isolated safe fixture/environment
* TEST dry-run
* idempotency confirmation against Stripe
* recovery confirmation where applicable
* production enablement review
* explicit coordinator GO before any live activation

Desktop must **not** self-start this milestone.

---

## Central coordination rules (ALL agents / workstreams)

### Task allocation authority

Before any agent starts a new milestone or migration, the coordinator must allocate:

- workstream
- milestone
- device/agent owner
- base SHA
- branch name
- worktree
- migration version if required
- migration reservation status
- dependencies/blockers

**Agents MUST NOT self-select migration versions.**

### Migration reservation protocol

Before creating a migration, coordinator checks:

1. remote `schema_migrations`
2. origin branches
3. active local/worktree migrations
4. known uncommitted/reserved migrations
5. active CURRENT_TASK / handoff declarations

Then coordinator records a reservation **centrally BEFORE** implementation starts.

Minimal reservation fields:

| Field | Notes |
| --- | --- |
| version | e.g. `20260916` |
| workstream | Learning / Translation / Commerce / … |
| milestone | name |
| agent/device | owner |
| branch | office/… |
| status | `RESERVED` \| `LOCAL_DRAFT` \| `APPLIED` \| `RELEASED` |
| timestamp / update reference | |

An agent may create a migration **only after** receiving that reservation.

### Collision policy

If an allocated version becomes occupied:

1. agent **STOPS**
2. **no silent renumber**
3. coordinator reallocates
4. old reservation is explicitly superseded/released

### Four-agent scheduling rule

Do not allow two agents to independently own:

- same milestone
- same migration version
- same worktree
- same schema object mutation boundary

Parallel work is allowed only when the coordinator proves ownership boundaries do not overlap.

### Completion / reporting protocol

Every agent reports back:

- branch
- HEAD / final SHA
- migration reservation / apply state
- tests
- blockers
- next-task recommendation

**Coordinator decides the next task; the agent does not automatically continue.**

---

## Server visibility package (ingest)

| Key | Value |
| --- | --- |
| repository | `umtuba-web` |
| pushed branch | `office/commerce-partial-refund-provider-money-execution-v1` |
| final commit SHA | `(see branch tip after P8 push)` |
| milestone | Commerce Partial Refund Provider Money Execution V1 |
| milestone state | `PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_IMPLEMENTATION_CLOSED` |
| remote migration | `20260915` APPLIED (Commerce-owned) |
| new migration requested | NONE |
| next milestone | Commerce Partial Refund Provider Money Activation & Test Validation V1 |
| next status | `WAITING_CENTRAL_COORDINATOR_ASSIGNMENT` |
| activation blocker | Stripe TEST credentials / isolated fixture env |
| gates | OFF / execution mode `off` |
| this document | `docs/ai/CENTRAL_COORDINATOR_HANDOFF.md` |

Desktop did **not** assign or start the activation milestone.
