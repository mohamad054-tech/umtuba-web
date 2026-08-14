# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2`

## Coordinator resume pointer (20260814)

Web platform declare **PRODUCTION_READY** retained (do not reopen Learning cert).

**CENTRAL_IOS_PREBUILD_ENGINEERING_BLOCKERS_CLOSEOUT_V1 (20260814) — DONE · STOP:**
- Phase 1 `/support` **SKIPPED** (owned by `CENTRAL_AUTH_LOCALE_P1_AND_IOS_PREBUILD_CLOSEOUT_V1`); production poll still **404**; this lane did not deploy support
- Phase 2 UGC `20260928` source parity **YES** on alpha @ `98819e33` (blob exact Desktop `380a366`); **DB NOT re-applied**
- Phase 3 iOS UGC binding **NEW SHA** `eb0267a` (ancestor `64a2fdd` retained; not amended/re-pushed)
- `IOS_ENGINEERING_READY_FOR_BUILD=YES` · `IOS_BUILD_GO=NO_OPERATOR_CREDENTIALS` · EAS READY **not** invented
- Canonical: `D:\umtuba-central\reports\UMTUBA_CENTRAL_IOS_PREBUILD_ENGINEERING_BLOCKERS_CLOSEOUT_V1.md`

**SERVER_ULTIMATE_CLOSEOUT_V5 (20260814) — DONE · STOP (retained):**
- A1 Android v5 deposit accept **REJECT** · `DESKTOP_V5_BUILD_GO=NO`
- A2 iOS prior tip `64a2fdd` ALREADY_INTEGRATED (superseded as build source by `eb0267a` binding only)
- A3 Laptop/UAF-04/AUTH · `UAF04_STATUS=BLOCKED_TRANSPORT` · `CENTRAL_AUTH_ENV_READY=NO`

**Open Central decisions (remaining — operator tracks):**

- Auth-locale sibling: ship `/support` → 200 + Login/Signup locale P1
- Operator secure Expo + Apple signing + public Supabase mobile env → `CENTRAL_GO_IOS_EAS_AUTH_COMPLETE_V1`
- Operator deposit real Desktop Android v5 packet bytes
- Operator AUTH_ENV Path A/B
- Operator Laptop evacuation packet
- Store Premium `dad5eb5` cherry-pick-or-leave
- World migrations 20260825–27 + flag (**HOLD**)

**Production tip (live):**

- `origin/alpha-0.2` tip = `98819e337217df92abfb15d52d5eda4c47cba849` (UGC migration source parity)
- Prior Search fix `c6a75212` retained as ancestor
- World migrations **20260825–20260827** remain not applied
- Guest Search **FIXED_VERIFIED** (do not reopen)

**Android:** UGC backend **APPLIED** · source now on alpha · v4 **REJECTED** · `NEW_AAB_REQUIRED=YES` · Play NON_BINARY not ready

**iOS:** `origin/master` = `eb0267a` (UGC bind) · prep base `64a2fdd` ancestor · `IOS_BUILD_GO=NO_OPERATOR_CREDENTIALS` · AASA **LIVE_200** · not submitted

**NEXT:** Auth-locale `/support` + operator EAS/signing/env deposits. No Search reopen. No EAS build without separate GO. No secrets. No wipe Laptop.

See `docs/ai/CURRENT_TASK.md`.

## Learning chapter status

**Learning V1 is officially APPROVED and FROZEN** (2026-07-27).

## Active academy priority

Default: Consolidation complete. Commerce beta-ready on dedicated branches (not merged).

## Source of truth

- **GitHub origin** is the source of truth for the repository.
- Always synchronize with origin before starting work.

## Machines

| Machine | Role |
| --- | --- |
| **Laptop** | Primary development and integration machine (**retirement NOT approved**) |
| **Desktop** | May perform isolated review / testing tasks only |
| **Server / Central** | Production integration authority |

## Multi-machine rules

1. Always run before starting: `git fetch --prune` then `git pull --ff-only` when behind.
2. Never let two machines modify the **same feature** simultaneously.
3. If `origin` has diverged and fast-forward is impossible: **stop**.

## Safety defaults

- **No commit** without explicit approval in the user request.
- **No push** without explicit approval in the user request.
- **No remote Supabase migration apply** without explicit approval.
- Follow `docs/DEVELOPMENT_WORKFLOW.md` and `docs/ai/CURRENT_TASK.md`.
- Write execution results to `docs/ai/CURSOR_REPORT.md`.
