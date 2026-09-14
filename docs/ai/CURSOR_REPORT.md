# CURSOR_REPORT — PC2_UM_STREAK_HOSTED_BACKEND_MIGRATION_APPLY_V1

## Summary

Owner-explicit production apply succeeded on hosted Supabase project `tgucwnjwoyeqoxqaxmew` (`umtuba`). Exact existing files were applied in order: `20260937` then `20260938`. SHA256 matched the prior read-only audit. Remote tip moved from `20260936` to `20260938`.

`db push` was not used. The UM Streak worktree still has other local-only files (notably `20260934` and older unregistered locals). Official targeted method was `npx supabase db query --linked --project-ref tgucwnjwoyeqoxqaxmew --file <exact.sql>`, then `npx supabase migration repair --status applied <version> --project-ref tgucwnjwoyeqoxqaxmew --yes` after object verification.

Hosted now has visual-message columns, UM Streak tables/functions, private `message-media` bucket, and upload/read/delete storage policies. No product source change. No EAS. No Play. No git push. No production test users or messages. Owner can retry the already-installed Fold6 APK.

## Exact files changed

Isolated UM Streak worktree docs only:

- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

Local CLI state (gitignored, not product source):

- `supabase/.temp/linked-project.json` now records ref `tgucwnjwoyeqoxqaxmew` / name `umtuba` after `--linked --project-ref` targeting. No secrets.

Preserved untouched:

- UM Streak product source
- Migration SQL bytes (`20260937` / `20260938` not rewritten)
- Communications / translation-trunk product source
- Play / EAS / app install / git remotes

## Migrations created

None. Existing files applied only:

1. `supabase/migrations/20260937_um_streak_social_camera_foundation_v1.sql`
   SHA256 `EA31E38D71656CDCA22BD1F39C2B5842D0463DB8CDC6C4B597F7CB60F52EC7B0`
   APPLY = SUCCESS, history repaired to `applied`
2. `supabase/migrations/20260938_um_streak_final_completion_v1.sql`
   SHA256 `50F9A9AB0234AFD88D9AC3FEB059D8F80A3AC37E4183562A9375B73094C2FFCD`
   APPLY = SUCCESS, history repaired to `applied`

## Security review

- Project list showed a single accessible project: `tgucwnjwoyeqoxqaxmew` / `umtuba` / `ACTIVE_HEALTHY`. CLI was not aimed at a different ref.
- `--linked` was never used blindly. Every write used `--project-ref tgucwnjwoyeqoxqaxmew`.
- Pre-apply hosted dependencies all present: `public.messages`, `public.message_attachments`, `public.conversation_participants`, `public.is_conversation_participant`, `public.ugc_users_are_blocked`, `storage.objects`, `storage.buckets`.
- `db push` skipped because many local versions are not remote (including `20260934`). Only the two authorized files were executed.
- History registration was named-version `migration repair` only (`20260937`, then `20260938`) after object checks.
- No service-role keys, DB passwords, or `.env` contents printed.
- `message-media` remains `public=false`. Upload / participant-read / owner-delete policies exist.
- No fake production users and no automatic production test message.

## Tests

Not a product-source task. Hosted schema verification only (read queries after each apply):

```text
messages.visual_opened_at / visual_expires_at / visual_expiration_policy = present
um_streaks / um_streak_events / um_streak_badges = present
send_um_visual_message / open_um_visual_message / get_um_streak_for_conversation = present
um_streak_apply_visual_event / um_streak_derive_state = present
um_streaks_streak_state_check = present
storage.buckets message-media exists, public=false
policies: Owners upload message media / Participants read unopened message media / Owners delete own message media
schema_migrations: 20260936, 20260937, 20260938
MAX(version) = 20260938
migration list remote: 20260937=yes, 20260938=yes
```

## TypeScript

Not run. No TypeScript / product source change.

## Build

Not run. EAS not started. No APK/AAB. Existing Fold6 APK retest is owner-side.

## git diff --check

Docs-only handoff in this isolated worktree. See Tests/status below after write.

## git status --short

Expected dirty in this isolated worktree: `docs/ai/CURRENT_TASK.md`, `docs/ai/CURSOR_REPORT.md`. Not pushed.

## Open issues

- Hosted backend is ready. Device proof is not done in this task.
- NEXT_ACTION: owner retries the already-installed Fold6 APK against live backend. No new EAS/build.
- Local worktree still contains unapplied `20260934` and other older local-only files. Do not `db push`.
- Docs not committed unless owner asks. Git push remains forbidden.
