# UM Learning — Result Policy Completion V1

Status: **implemented locally** (migration **NOT APPLIED** remotely)

Migration: `supabase/migrations/20260844_learning_result_policy_completion_v1.sql`

Constants: `lib/learning/learnerResultPolicy.ts`  
Delivery constants updated: `lib/learning/learnerResultDelivery.ts`

Depends on: Activities `show_result_policy`, Scoring results, Learner Result
Delivery V1 (`get_my_learning_attempt_result`).

---

## Purpose

Complete deferred `show_result_policy` gates:

| Policy | Unlock condition |
| --- | --- |
| `never` | fail-closed (unchanged) |
| `immediately` / `after_submit` | unchanged (submitted + scored path) |
| `after_close` | `now() >= results_available_at` |
| `manual` | `learning_attempt_result_releases` row exists |

Aggregate learner payload is **exactly** Result Delivery V1 (no keys /
per-question / `scored_by`).

## `results_available_at`

Authoritative **result availability** timestamp for `after_close` only.

It is **not** a general activity lifecycle `closes_at` field.

Immutability: once `now() >= results_available_at`, the value cannot be cleared
or postponed. Before that, authorized staff may change it (audited).

## Manual release

Table `learning_attempt_result_releases` — insert-once per attempt.

- Scope (`activity_id`, `course_id`, `space_id`, `learner_user_id`) derived from
  the attempt row — never from client.
- Idempotent: `ON CONFLICT DO NOTHING`; replay returns original
  `released_at` / `released_by`.
- No unrelease RPC in V1; UPDATE/DELETE blocked by immutable trigger.

## RPCs

| RPC | Auth |
| --- | --- |
| `set_learning_activity_results_available_at` | course manage / platform admin |
| `release_learning_attempt_result` | course manage / platform admin |
| `get_my_learning_attempt_result` (REPLACE) | attempt owner + course access |

Both staff RPCs write `learning_audit_write` events.

## Visibility rules

1. Non-`submitted` → always `hidden` (close time / release cannot unlock).
2. Policy gate locked → `hidden`.
3. Gate unlocked + no scored result → `pending_score`.
4. Gate unlocked + scored → `available` (aggregate only).

## Out of scope

Progress mutations, grading, analytics UI, certificates, assignments,
Games / Ads / UM Points, unrelease, per-question results.

## Migration apply status

**NOT APPLIED** to remote Supabase.
