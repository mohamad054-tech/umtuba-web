# Current Task

## Task title

UM Learning - Personal Notes Hub V1

## Status

`implementation-complete` — local commit pending validation; migration **not** applied remotely.

## Milestone

`learning.learner.personal_notes_hub_v1`

## Scope landed

- Migration `20260907_learning_personal_notes_hub_v1.sql`
  - Index `learning_lesson_notes_user_updated_idx`
  - RPC `list_my_learning_notes_hub`
- Adapter hub list in `lib/learning/lessonNotesFoundation.ts`
- Learner route `/learning/notes` + hub nav link
- Docs: `LEARNING_PERSONAL_NOTES_HUB_V1.md`

## Branch / worktree

`office/learning-personal-notes-hub-v1`  
`D:\umtuba-central\repos\umtuba-web-learning-personal-notes-hub-v1`  
Base: `ad71442469bdf1506cb2fa4fcebc4b4caefe4389`

## Explicitly out of scope

- Remote migration apply
- Instructor/admin note browsing
- Sharing / collaboration / AI
- Bookmarks
- DB free-text search
- Commerce / Translation / Collaboration / Billing / UEOS / Guardian

## Recommended next

Optional remote apply GO for `20260907` after SoT FF merge.
