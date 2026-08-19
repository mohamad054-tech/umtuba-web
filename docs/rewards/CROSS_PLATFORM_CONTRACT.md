# UMTUBA Rewards — Cross-Platform Contract V1

**TASK_ID** = `CENTRAL_UMTUBA_REWARDS_REFERRAL_ENGINE_V1`  
**AUTHORITY** = one server-side engine (Web repo + Supabase)  
**CLIENTS** = Web + iOS + Android display and request only  
**POLICY** = `launch_v1`  
**LAUNCH_GROWTH_MODE** = `3_MONTHS`  
**POINT_VALUES_CONFIGURED** = YES  
**MOBILE_SOURCE_CHANGED** = NO

There is no `IOS_POINTS_ENGINE`, `ANDROID_POINTS_ENGINE`, or `WEB_POINTS_ENGINE`.

## Pipeline

`QUALIFIED_EVENT → REWARD_POLICY → ANTI_DUPLICATE/ABUSE → LEDGER → BALANCE → USER FEEDBACK`

Clients must not calculate, grant, deduct, or authoritatively attribute rewards.

## Shared read model

| Field | Meaning |
| --- | --- |
| `UM_BALANCE` | `availableBalance` (confirmed). Existing `um_point_balances.balance`. |
| `pendingBalance` | Delayed / pending credits. |
| `lifetimeEarned` / `lifetimeSpent` | Snapshot columns; reconcile never overwrites spendable balance. |
| `REWARD_HISTORY` | Ledger rows with original awarded values. |
| `REFERRAL_CODE` / `REFERRAL_LINK` | Opaque code. Canonical share URL: `/join?ref=<code>`. Alias: `/invite/<code>`. |
| `REWARD_STATUS` | `PENDING` / `QUALIFIED` / `REJECTED` / `REVERSED`. |

## RPCs (same for every client)

| Purpose | RPC | Notes |
| --- | --- | --- |
| Snapshot | `get_my_rewards_snapshot` | Wallet + join link |
| History | `get_my_rewards_history` | Own rows only |
| Referral profile | `get_my_referral_profile` | Code + `/join?ref=` |
| Referral dashboard | `get_my_referral_dashboard` | Success / pending / points |
| Event request | `process_reward_event` | **No amount argument**; source must verify |
| Qualify referral | `qualify_my_referral_signup` | First-touch + inviter credit |
| Daily check-in | `claim_daily_engagement` | Once per UTC day |
| Admin confirm/reject | `admin_confirm_reward_qualification` / `admin_reject_reward_qualification` | Platform admin |
| Analytics | `admin_rewards_launch_analytics` | Aggregates only |

Forbidden request keys: `amount`, `points`, `pointsAmount`, `clientAmount`, `p_points`.

Trusted mint path `ingest_verified_reward_event` is **not** granted to clients.

## iOS / Android

- Consume the RPCs above after `20260933` apply.
- Reuse existing wallet **display**.
- Do **not** add a local points engine.
- Frozen mobile SHA `f66f15c` is not modified by this wave. P0 owns editor-exit.

## Web

- Domain: `lib/rewards/engine`
- Dashboard: `/rewards`
- Join: `/join?ref=`
- Invite alias: `/invite/{code}`

## Policy

`launch_v1` now. `post_launch_v2` later. Old ledger rows keep the awarded value.
Containment: `unified_rewards_engine_authoritative = 0`.
