# CENTRAL COORDINATOR HANDOFF

**Authority:** The central server/coordinator is the sole task-allocation and migration-reservation authority for UMTUBA workstreams.

**Desktop local progression:** **PAUSED** after this Commerce checkpoint. Agents must not self-start the next milestone or self-select migration versions.

---

## Current Commerce milestone

| Field | Value |
| --- | --- |
| Milestone | **Commerce Partial Refund Provider Money Execution V1** |
| State | **`P6R_BLOCKED_NO_TEST_CONFIG`** â€” checkpointed, **not CLOSED** |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-provider-money-execution-v1` |
| Branch | `office/commerce-partial-refund-provider-money-execution-v1` |
| Base SHA | `b8be33469f35c5ccb394925d666a5812f4c70c70` |
| Project | `umtuba` / `tgucwnjwoyeqoxqaxmew` |
| Remote migration | **`20260915`** `store_partial_refund_provider_money_execution_v1` â€” **APPLIED + VERIFIED** |
| Local validation | **235** tests / **18** files PASS; `tsc --noEmit` PASS |
| Final commit SHA | `(see branch tip / git rev-parse HEAD)` |

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
| `20260910`â€“`20260914` | Translation (through `translation_studio_memory_identity_contract_align_v1`) |
| `20260915` | Commerce `store_partial_refund_provider_money_execution_v1` |

**CRITICAL RULE:** Remote absence (`schema_migrations` count = 0) does **NOT** mean a version is free. Active origin branches, Desktop worktrees, uncommitted drafts, and CURRENT_TASK/handoff reservations **MUST** be checked before allocation.

---

## Commerce P6 blocker

- No Stripe TEST configuration in local Desktop environments
- No safe isolated test PaymentIntent
- No committed test ledger fixture
- Shared primary project is not approved for artificial money fixtures without explicit authorization

## Exact next Commerce task (DO NOT START until coordinator assigns)

**`P6R2 â€” isolated Stripe TEST fixture/environment preparation`**

Then, only after a filled safe fixture manifest: re-issue **P6** test-mode dry-run under temporary gates with mandatory post-run OFF.

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
| workstream | Learning / Translation / Commerce / â€¦ |
| milestone | name |
| agent/device | owner |
| branch | office/â€¦ |
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
| final commit SHA | `(see branch tip / git rev-parse HEAD)` |
| milestone | Commerce Partial Refund Provider Money Execution V1 |
| milestone state | `P6R_BLOCKED_NO_TEST_CONFIG` (checkpointed, not CLOSED) |
| remote migration | `20260915` APPLIED |
| blocked next task | P6R2 (coordinator-assigned only) |
| gates | OFF / execution mode `off` |
| this document | `docs/ai/CENTRAL_COORDINATOR_HANDOFF.md` |

Desktop did **not** assign or start the next task.
