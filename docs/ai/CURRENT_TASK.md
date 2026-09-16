# Current Task

## Task title

MERGE_VIDEO_VIEW_COUNT_INTO_RELEASE_V1

## Status

Merge `origin/release/v1` (`b5146049`, docs-only 20260948 applied record) into `feat/video-view-count-v1` (`63828f11`, already deployed and user-tested). Docs conflicts only. No SQL. Not deployed from this merge.

```
TASK_ID = MERGE_VIDEO_VIEW_COUNT_INTO_RELEASE_V1
STATUS = COMPLETE
DATE = 2026-09-16
BRANCH = feat/video-view-count-v1
FEATURE = origin/feat/video-view-count-v1 @ 63828f11
RELEASE = origin/release/v1 @ b5146049
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
DEPLOY = FORBIDDEN
```

---

## Prior task — FEAT_VIDEO_VIEW_COUNT_V1

Show `posts.views` on Home, Watch, and UM Life video surfaces. Feature already deployed and user-tested OK. SQL not applied from that worktree.

```
TASK_ID = FEAT_VIDEO_VIEW_COUNT_V1
STATUS = COMPLETE
DATE = 2026-09-16
BRANCH = feat/video-view-count-v1
BASE = af28f5eac638efe7c7e6bde082ffc03873ad479d
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
DEPLOY = FORBIDDEN
```

Note: `origin/release/v1` had moved to `b5146049` (docs-only 20260948 record) when this branch was created. Work started from the requested SHA `af28f5ea`.

### Allowed scope

- Select/map `views` on the shared video/post model used by Home, Watch, and UM Life (no extra queries per video).
- Eye icon + compact count on Home and Watch action rails directly under Share (not a button).
- Eye icon + compact count on UM Life **video** cards next to existing counts.
- Reuse `formatInteractionCount`; show `0` as `"0"`; visible to everyone.
- In-place count update when `record_post_view` returns `counted=true` (returned `views` only, no refetch).
- i18n `video.views.label` written in `en` and `ar`; other locales fall back to English.
- Related tests and handoff docs.

### Forbidden scope

- Do not deploy.
- Do not apply Supabase migrations or run `supabase db push`.
- Do not change like / comment / share behaviour.
- Do not change profile stats unless required (not required).
- Do not commit onto `release/v1`, `chore/record-20260948-applied`, or `feat/life-more-menu-v1`.

---

## Prior task — CHORE_RECORD_20260948_APPLIED

Record that `20260948_abuse_limits_v1` was applied manually on production 2026-09-16. Docs/comments/tests only. SQL body unchanged. Not deployed. No SQL applied from this machine.

```
TASK_ID = CHORE_RECORD_20260948_APPLIED
STATUS = COMPLETE
DATE = 2026-09-16
BRANCH = chore/record-20260948-applied
BASE = origin/release/v1 @ af28f5ea
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
DEPLOY = FORBIDDEN
```

### Allowed scope

- Header comment on `supabase/migrations/20260948_abuse_limits_v1.sql` only (not the SQL body).
- `docs/audit/PROD_SECURITY_SQL_2026-09-15.md` applied-list + cleanup note.
- Tests that asserted `20260948` said `NOT APPLIED`.
- Handoff docs.

### Forbidden scope

- Do not change application code.
- Do not change the SQL body of 20260948.
- Do not deploy.
- Do not apply Supabase migrations or run `supabase db push`.
