# Current Task

## Task title

FEAT_LIFE_MORE_MENU_V1

## Status

VideoMoreMenu on UM Life cards + `controlsList="nodownload"` on every native `<video controls>`. Not deployed. SQL not applied.

```
TASK_ID = FEAT_LIFE_MORE_MENU_V1
STATUS = COMPLETE
DATE = 2026-09-15
BRANCH = feat/life-more-menu-v1
BASE = origin/release/v1 @ fe2fe896
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
DEPLOY = FORBIDDEN
```

## Allowed scope

- UM Life post cards: reuse `VideoMoreMenu` (ownership, copy/edit/hide/report/delete).
- Hide current Life list card on "Not interested".
- `controlsList="nodownload"` on every native `<video controls>` (keep speed and PiP).
- Related Life / VideoMoreMenu tests and i18n reuse of `video.more.*`.

## Forbidden scope

- Do not deploy.
- Do not apply Supabase migrations or run `supabase db push`.
- Do not change home/watch custom players that have no native controls.
- Do not add new backend work for text/image menus.
