# CURSOR_REPORT

## Summary

PC2 local Supabase is recovered. Firmware/WSL/Docker work was already done. Fresh `npx supabase start` inside WSL Ubuntu failed first on missing `public.posts` (migration `20260712` ALTERs a dashboard-era table that was never created in git). Exhaustive search found no `CREATE TABLE public.posts` in this worktree, sibling Desktop/umtuba web checkouts, named SHAs (`d354fd2`, `866749ed`, `09155b15`, `455fdca8`), or dump/baseline artifacts. Authoritative pre-`user_id` columns were reconstructed from P0 commit `523117c7` (`supabase/README.md`, `lib/supabase/posts.ts`, `app/data/types/post.ts`) plus later bigint FKs.

A local-only precursor `20260711_local_bootstrap_posts_table_precursor_v1.sql` was added. CLI 2.116.0 then failed on duplicate short-date versions (`20260713`×5, `20260714`×4, `20260728`×2, `20260729`×2) and on ads admin review running before ads platform. Colliding filenames were uniquified; SQL contents were not rewritten. Remote-matching versions `20260728` store_product and `20260729` store_cart were left unchanged. `20260807` ads platform was renamed to `20260805000001` so it applies before `20260806`. Empty `supabase/seed.sql` satisfies `[db.seed]`. After that, start applied through `20260915` and `20260916`.

`discover_user_by_email` then failed locally with PostgreSQL `42702` (RETURNS TABLE `user_id` vs `ON CONFLICT (user_id)`). Those conflict targets in `20260916` were changed to named primary-key constraints and reapplied locally only.

Local Communications and Rich Profile RLS gates PASS with synthetic TEST_USER_A / TEST_USER_B. Production was not queried, linked-to, or migrated.

```text
TASK_ID = PC2_UMTUBA_LOCAL_SUPABASE_RUNTIME_ENVIRONMENT_V1
STATUS = LOCAL_STACK_RECOVERED
PRIMARY_TARGET = LOCAL
PRODUCTION = STRICTLY_FORBIDDEN
LOCAL_SUPABASE = http://127.0.0.1:54321
LOCAL_STUDIO = http://127.0.0.1:54323
COMMUNICATIONS_RLS_GATE = PASS
RICH_PROFILE_RLS_GATE = PASS
PRODUCTION_MIGRATIONS_APPLIED = NO
```

## Exact files changed

New:

- `supabase/migrations/20260711_local_bootstrap_posts_table_precursor_v1.sql`
- `supabase/seed.sql` (comment-only local placeholder)

Renamed (SQL contents unchanged; local CLI unique versions / apply order):

- `20260713_profiles_foundation_v1.sql` → `20260713000001_profiles_foundation_v1.sql`
- `20260713_video_posts_v1.sql` → `20260713000002_video_posts_v1.sql`
- `20260713_social_interactions_v1.sql` → `20260713000003_social_interactions_v1.sql`
- `20260713_messenger_v1_foundation.sql` → `20260713000004_messenger_v1_foundation.sql`
- `20260713_live_streaming_v1_foundation.sql` → `20260713000005_live_streaming_v1_foundation.sql`
- `20260714_live_streaming_v2_realtime.sql` → `20260714000001_live_streaming_v2_realtime.sql`
- `20260714_live_streaming_v3_realtime_hardening.sql` → `20260714000002_live_streaming_v3_realtime_hardening.sql`
- `20260714_live_media_v2_multi_guest.sql` → `20260714000003_live_media_v2_multi_guest.sql`
- `20260714_live_media_v2_host_stage_fix.sql` → `20260714000004_live_media_v2_host_stage_fix.sql`
- `20260728_complete_referral_signup_client_revoke.sql` → `20260727000001_complete_referral_signup_client_revoke.sql`
- `20260729_messenger_production_phase2.sql` → `20260728000001_messenger_production_phase2.sql`
- `20260807_ads_platform_foundation_v1.sql` → `20260805000001_ads_platform_foundation_v1.sql`

Modified:

- `supabase/migrations/20260916_communications_identity_discovery_v1.sql` (`ON CONFLICT` uses named PKs; RETURNS TABLE `user_id` no longer ambiguous)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/PC2_UMTUBA_LOCAL_SUPABASE_RUNTIME_ENVIRONMENT_V1.md`

Historical unattributed dirt left on disk. `.env` secrets not committed.

## Migrations created

`supabase/migrations/20260711_local_bootstrap_posts_table_precursor_v1.sql`

LOCAL BOOTSTRAP ONLY. Reconstructs the dashboard-era `public.posts` shape that `20260712` assumed. Not a production dump. Not applied to remote.

`20260915` and `20260916` applied **locally** by `supabase start`. Never applied to production.

## Security review

- No production database, auth.users, or comms/profile rows read or written
- No `supabase link`, `db push`, `--linked`, or remote migration apply
- Hosted project remains linked in CLI metadata (`umtuba` / `tgucwnjwoyeqoxqaxmew`) but was not used
- Local synthetic TEST_USER_A / TEST_USER_B only (`test_user_a@local.test`, `test_user_b@local.test`)
- Service-role / JWT / `.env` values not printed in this report
- FORCE RLS confirmed on `communication_privacy_settings`, `communication_phone_identities`, `profile_places`
- Anon discovery blocked; unverified phone not discoverable; email default nobody; cross-user profile writes blocked
- No force push, merge to Central/`alpha-0.2`, deploy, Play, or App Store

## Tests

Local runtime gates (not vitest):

- Communications: username discovery PASS; anon blocked; email nobody ≡ unknown empty; email everyone finds B; unverified phone empty; cross-user privacy PATCH does not change B’s row
- Rich Profile: owner insert PASS; B sees public only; followers visible after follow; `only_me` hidden; cross-user insert/update blocked

`npx tsc --noEmit` not run (no TypeScript product sources changed).

## TypeScript

Not run. No TypeScript sources changed.

## Build

Not run. No app UI/entry-point change. Local Studio `http://127.0.0.1:54323` HTTP 307. Local Auth settings HTTP 200. Postgres accepting connections. REST RPCs exercised by the gates.

## git diff --check

Exit 0 on authorized migration/docs paths.

## git status --short

See end-of-task git status. Pre-existing unattributed dirty/untracked files remain.

## Open issues

1. CLI is still **linked** to hosted `umtuba` (`tgucwnjwoyeqoxqaxmew`). Do not `db push` / `--linked`. Unlink is optional and was not done.
2. `npx supabase status -o env` logged `Stopped services: imgproxy, pooler` during gates. Core API/DB/Auth/Studio still served the gates. Residual: those sidecars may need a later `supabase start` if storage/pooler is required.
3. Filename uniquification is a local-CLI compatibility repair, not the unexecuted production baseline cutover (`docs/operations/MIGRATION_BASELINE_CUTOVER_PLAN_V1.md`). Do not treat renamed files as new production applies.
4. Unattributed historical dirty work remains on the comms web tree — preserved, not deleted.
5. Communications Part 2 and Rich Profile **production** gate remain unauthorized.
6. Push of this local-bootstrap source fix was not performed (renumbered historical filenames).
