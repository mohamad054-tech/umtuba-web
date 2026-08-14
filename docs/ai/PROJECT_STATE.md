# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2`

## Coordinator resume pointer (20260814)

**CENTRAL_AUTH_LOCALE_P1_SUPPORT_CLOSEOUT_V2 (20260814) — DONE · STOP · FIXED_VERIFIED:**
- Login/Signup body locale **FIXED_VERIFIED** · `/support` **200** apex+www · App Store Support URL ready
- Search regression **PASS** (not reopened) · AASA/World not touched
- Production `3bc0b955` · release `3bc0b95-20260814203544` · rollback `c6a7521-20260814145703`
- Canonical: `D:\umtuba-central\reports\UMTUBA_CENTRAL_AUTH_LOCALE_P1_SUPPORT_CLOSEOUT_V2.md`

**CENTRAL_IOS_PREBUILD_ENGINEERING_BLOCKERS_CLOSEOUT_V1 (20260814) — DONE · STOP (retained):**
- UGC `20260928` source on alpha · iOS bind `eb0267a` · `IOS_BUILD_GO=NO_OPERATOR_CREDENTIALS`
- `/support` residual from that lane **closed by V2 above**

**Open Central decisions (remaining — operator tracks):**

- Operator secure Expo + Apple signing + public Supabase mobile env → `CENTRAL_GO_IOS_EAS_AUTH_COMPLETE_V1`
- Operator deposit real Desktop Android v5 packet bytes
- Operator AUTH_ENV Path A/B
- Operator Laptop evacuation packet
- Store Premium `dad5eb5` cherry-pick-or-leave
- World migrations 20260825–27 + flag (**HOLD**)

**Production tip (live):**

- `origin/alpha-0.2` tip = `3bc0b95554f7c59ed174903c448011632faaf4d9`
- **Production deployed** exact `3bc0b955` · release `3bc0b95-20260814203544`
- Guest Search **FIXED_VERIFIED** · `/support` **LIVE_200**

**NEXT:** `CENTRAL_NEXT=STOP` — this GO complete. No Search reopen. No EAS build without separate GO.

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
