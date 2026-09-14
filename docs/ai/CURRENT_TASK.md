# Current Task

> 2026-09-05 PC2 UM Streak hosted backend migration apply. Owner-explicit production DB GO for two existing SQL files only. Product source / EAS / Play / git push remain forbidden.

## Task

```text
TASK_ID = PC2_UM_STREAK_HOSTED_BACKEND_MIGRATION_APPLY_V1
STATUS = SUCCESS
OWNER_EXPLICIT_APPROVAL = YES
PROJECT_REF = tgucwnjwoyeqoxqaxmew
PROJECT_NAME = umtuba
PREVIOUS_MIGRATION_TIP = 20260936
MIGRATION_20260937_FILE = supabase/migrations/20260937_um_streak_social_camera_foundation_v1.sql
MIGRATION_20260937_SHA256 = EA31E38D71656CDCA22BD1F39C2B5842D0463DB8CDC6C4B597F7CB60F52EC7B0
MIGRATION_20260937_APPLY = SUCCESS
MIGRATION_20260938_FILE = supabase/migrations/20260938_um_streak_final_completion_v1.sql
MIGRATION_20260938_SHA256 = 50F9A9AB0234AFD88D9AC3FEB059D8F80A3AC37E4183562A9375B73094C2FFCD
MIGRATION_20260938_APPLY = SUCCESS
FINAL_MIGRATION_TIP = 20260938
SEND_UM_VISUAL_MESSAGE_PRESENT = YES
OPEN_UM_VISUAL_MESSAGE_PRESENT = YES
GET_UM_STREAK_PRESENT = YES
UM_STREAK_TABLES_PRESENT = YES
MESSAGE_MEDIA_BUCKET_PRESENT = YES
MESSAGE_MEDIA_PRIVATE = YES
STORAGE_POLICIES_PRESENT = YES
SOURCE_CHANGED = NO
EAS_RUN = NO
PLAY_TOUCHED = NO
GIT_PUSHED = NO
READY_FOR_EXISTING_FOLD6_APK_RETEST = YES
COMPLETION_WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-um-streak-final-completion-v1
PUSH = NO
MERGE = NO
DEPLOY = NO
PLAY = NO
```

## Allowed scope

- Read-only pre-apply gate against hosted project `tgucwnjwoyeqoxqaxmew`
- Apply exact existing files `20260937` then `20260938` only
- Register those two versions in `supabase_migrations.schema_migrations` after successful apply
- Hosted post-apply object verification
- Update `docs/ai/CURRENT_TASK.md` and `docs/ai/CURSOR_REPORT.md` in this isolated worktree

## Forbidden scope

- Rewrite / regenerate / renumber SQL
- `supabase db push` of unrelated local-only migrations
- Product source changes
- EAS / APK / AAB
- Play
- Git push
- Fake production users / automatic production test messages
- Web deploy
