# Current Task

## Task title

CENTRAL_UMTUBA_FEED_AUDIO_PERSISTENCE_V1

## Status

**IN PROGRESS → LOCAL COMPLETE after quality gates.** New branch off `4cb958c5`. Do not merge.

```
TASK_ID = CENTRAL_UMTUBA_FEED_AUDIO_PERSISTENCE_V1
STATUS = LOCAL_COMPLETE
DATE = 2026-09-14
BRANCH = fix/feed-audio-persistence
BASE_HEAD = 4cb958c5b1018f5c3ffdfc5364f19a6adf367c98
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
MIGRATION = NONE
MERGE = FORBIDDEN
```

## Allowed scope

- Persist Watch unmute across videos and page remounts.
- Autoplay `NotAllowedError` may mute the current element only; do not overwrite the stored preference.
- Home/Discover should start from the same preference.

## Forbidden scope

- Do not merge into `feat/legal-pages-v1`.
- Do not touch RLS, migrations, or visibility helpers.
- Do not commit or push unless the owner asks.
