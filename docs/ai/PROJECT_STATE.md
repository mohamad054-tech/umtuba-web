# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2`

## Coordinator resume pointer (20260814)

Web platform declare **PRODUCTION_READY** retained (do not reopen Learning cert).

**CENTRAL_ANDROID_V5_DEPOSIT_ACCEPTANCE_AND_BUILD_GO_V2 (20260814) — DONE · STOP · REJECT:**
- Approved intakes rechecked only · all three still **scaffold-only** (`DEPOSIT_HERE_README.txt`)
- `DESKTOP_V5_DEPOSIT_FOUND=NO` · `CENTRAL_RECEIVED=NO` · `SOURCE_ACCEPTANCE=FAIL`
- `V5_ACCEPTED_SOURCE_SHA=ABSENT` · `DESKTOP_V5_BUILD_GO=NO` · GO packet **NOT_ISSUED**
- `UGC_BACKEND_20260928_READY=YES` (prior APPLIED; not re-applied)
- Canonical: `D:\umtuba-central\reports\UMTUBA_CENTRAL_ANDROID_V5_DEPOSIT_ACCEPTANCE_AND_BUILD_GO_V2.md`

**SERVER_A2_IOS_BUILD_PREREQUISITES_OPERATOR_HANDOFF_V1 (20260814) — DONE · STOP:**
- Engineering source **READY** @ exact `64a2fdd` · AASA **LIVE_200** · PC2 prep READY retained
- `EAS_AUTH_PRESENT=NO` · `APPLE_SIGNING_PRESENT=NO` · `SUPABASE_PUBLIC_ENV_PRESENT=NO`
- `IOS_BUILD_PREREQUISITES_READY=NO` · `FIRST_REAL_IOS_EAS_BUILD_GO_RECOMMENDED=NO` · `OPERATOR_DEPOSITS_REQUIRED=YES`
- Live `/support` **404** · UGC `20260928` DB **APPLIED** · alpha source-parity **NO** · iOS UGC bind **UNBOUND_FAIL_CLOSED**
- No EAS build · no modify/`repush` `64a2fdd` · Android A1 not duplicated
- Canonical: `D:\umtuba-central\reports\UMTUBA_CENTRAL_SERVER_A2_IOS_BUILD_PREREQUISITES_OPERATOR_HANDOFF_V1.md`

**SERVER_ULTIMATE_CLOSEOUT_V5 (20260814) — DONE · STOP (retained):**
- A1 Android v5 deposit accept **REJECT** (superseded by V2 recheck above — still REJECT)
- A2 iOS source/build gate **ALREADY_INTEGRATED** @ exact `64a2fdd` · `EAS_AUTH_READY=NO` · `FIRST_REAL_IOS_EAS_BUILD_GO=NO`
- A3 Laptop/UAF-04/AUTH · `UAF04_STATUS=BLOCKED_TRANSPORT` · `CENTRAL_AUTH_ENV_READY=NO` · `LAPTOP_RETIREMENT_APPROVED=NO`
- Canonical rollup: `D:\umtuba-central\reports\UMTUBA_CENTRAL_SERVER_ULTIMATE_CLOSEOUT_V5_ROLLUP.md`

**CENTRAL_PC2_IOS_V5_PREP_HANDOFF_AND_EAS_BUILD_GO_DECISION_V1 (20260814) — retained:**
- Prep **INGESTED** · `FIRST_REAL_IOS_EAS_BUILD_GO=NO` · next still `CENTRAL_GO_IOS_EAS_AUTH_COMPLETE_V1`

**SERVER_FROM_DESKTOP_V5_INTAKE_PATH_READY_V1 (20260814) — retained:**
- Intake paths **READY/writable** · packet bytes still absent (scaffold ≠ deposit)

**CENTRAL_SEARCH_GUEST_P1_REGRESSION_CLOSEOUT_V1 (20260814) — DONE · FIXED_VERIFIED · STOP:** retained

**AUTH_ENV (retained):** `CENTRAL_AUTH_ENV_READY=NO` — Path A/B ABSENT; do not invent PASS

**Open Central decisions (remaining — operator tracks):**

- Operator deposit real Desktop Android v5 packet bytes (blocks BUILD_GO)
- Operator secure Expo + Apple signing → `CENTRAL_GO_IOS_EAS_AUTH_COMPLETE_V1` (blocks first iOS EAS build)
- Operator AUTH_ENV Path A/B (UAF-11/12 + signed-in Create + Store auth QA)
- Operator copy of `EVACUATION_LAPTOP_2026-08-14` → preferred archive (blocks UAF-04 + Laptop retirement)
- Store Premium `dad5eb5` cherry-pick-or-leave
- World migrations 20260825–27 + flag (**HOLD**)
- iOS `64a2fdd` **ALREADY_INTEGRATED** — no further integrate

**Transport (honest):** Desktop Android v5 packet still undelivered (scaffold ≠ deposit). UAF-04 = `BLOCKED_TRANSPORT`. Do not invent PASS.

**Production tip (live):**

- `origin/alpha-0.2` tip = `c6a75212f749aa360ac61295d0314116677fedb5`
- **Production deployed** exact `c6a75212` · release `c6a7521-20260814145703`
- Rollback preserved: `f8e142d-20260814091101`
- World migrations **20260825–20260827** remain not applied
- `world_discovery_enabled` unchanged (gated / OFF)
- Guest Search **FIXED_VERIFIED**

**Android:** UGC backend **APPLIED** (`UGC_BACKEND_20260928_READY=YES`) · v4 **REJECTED** · `NEW_AAB_REQUIRED=YES` · `ANDROID_V5_SOURCE_ACCEPTED=NO` · `DESKTOP_V5_BUILD_GO=NO` · blocker = Desktop v5 packet not on intake · Play NON_BINARY not ready · PRODUCTION_ACCESS=NO

**iOS:** `origin/master` SoT = exact `64a2fdd` · `IOS_ENGINEERING_SOURCE_READY=YES` · `IOS_BUILD_PREREQUISITES_READY=NO` · `FIRST_REAL_IOS_EAS_BUILD_GO_RECOMMENDED=NO` · `IOS_EAS_AUTH_READY=NO` · `NEXT_IOS_EXECUTION_GATE=EAS_AUTH` · AASA **LIVE_200** · Universal Links **READY** · `/support` **404** · UGC bind **UNBOUND_FAIL_CLOSED** · not submitted

**UAF statuses (honest):** UAF-01 guest gate RUNTIME_VERIFIED / signed-in **BLOCKED** · UAF-11/12 **BLOCKED** (AUTH_ENV) · UAF-04 `BLOCKED_TRANSPORT`

**Devices:** PC2 **STOP** (awaiting EAS_AUTH then build GO) · Desktop **STOP** (deposit required before BUILD_GO) · Laptop **NOT retired**. `NO_NEW_PC2_CURSOR_WORK=YES`.

`CENTRAL_STORE_AUTH_ENV_READY=NO` · `WHOLE_PLATFORM_UX_READY=NO` · `WEB_PLATFORM_READY=YES`

**NEXT:** `CENTRAL_NEXT=STOP` — Android V5 BUILD_GO denied until real deposit; iOS prereq handoff closed (`GO_RECOMMENDED=NO`). Operator lanes: Desktop v5 deposit; Expo/ASC/Supabase-public deposit → `CENTRAL_GO_IOS_EAS_AUTH_COMPLETE_V1`; AUTH_ENV; Laptop evacuation; World HOLD; Store Premium. No Search reopen. No AAB/Play upload. No iOS EAS build without separate GO. No secrets. No wipe Laptop.

See `docs/ai/CURRENT_TASK.md`.

## Learning chapter status

**Learning V1 is officially APPROVED and FROZEN** (2026-07-27).

Official close-out document: `docs/learning/UMTUBA_LEARNING_V1_FINAL.md`

Session continuity: `docs/ai/SESSION_HANDOFF.md`

## Active academy priority

Default: Consolidation complete. Commerce beta-ready on dedicated branches (not merged). Do not modify frozen Commerce architecture documents. Do not delete Store docs.

### Autonomy (standing)

Routine in-scope create/update/run/mirror/report work may proceed without per-step approval **only inside the explicitly active phase**.

Paused phases must not auto-resume. Still ask before: destructive data loss, destructive prod DB, push/force-push, merge/delete branches, system-wide installs, credentials/payments, irreversible out-of-scope actions.

## Source of truth

- **GitHub origin** is the source of truth for the repository.
- Always synchronize with origin before starting work.
- Learning curriculum packages: Bootcamp / Jinn Wave path + dist importers (see Learning V1 final doc).
- Learner runtime state: UMTUBA Learning DB.

## Machines

| Machine | Role |
| --- | --- |
| **Laptop** | Primary development and integration machine (**retirement NOT approved** — retain until UAF-04 on Central) |
| **Desktop** | May perform isolated review / testing tasks only |
| **Server / Central** | Production integration authority |

## Multi-machine rules

1. Always run before starting:
   - `git fetch --prune`
   - `git pull --ff-only` (on the current branch when behind and fast-forward is possible)
2. Never let two machines modify the **same feature** simultaneously.
3. If `origin` has diverged and fast-forward is impossible: **stop** — do not merge, rebase, reset, stash, or force push without explicit human instructions.

## Safety defaults

- **No commit** without explicit approval in the user request.
- **No push** without explicit approval in the user request.
- **No remote Supabase migration apply** without explicit approval.
- **No destructive Git actions** (force push, hard reset, etc.) without explicit approval.
- Follow `docs/DEVELOPMENT_WORKFLOW.md` for Git, migrations, and push policy.
- Follow `docs/ai/CURRENT_TASK.md` for the active handoff scope.
- Write execution results to `docs/ai/CURSOR_REPORT.md`.
