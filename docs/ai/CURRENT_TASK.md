# Current Task

## Task title

UM Learning — Lesson Bookmarks / Saved Lessons V1

## Status

`implementation-complete` — local commit pending push / remote apply; **no remote apply**.

## Milestone

`learning.learner.lesson_bookmarks_v1`

## Migration

`supabase/migrations/20260914_learning_lesson_bookmarks_v1.sql`

## Scope landed

- Private `learning_lesson_bookmarks` table + RLS
- save / delete / state / list RPCs
- Lesson Viewer Save lesson / Remove from saved control (`canRender` only)
- Saved Lessons hub `/learning/saved` + Learning hub nav link
- Adapter, server actions, docs, focused tests

## Branch / worktree

`office/learning-lesson-bookmarks-v1`  
`D:\umtuba-central\repos\umtuba-web-learning-lesson-bookmarks-v1`  
Base: `2c3b97f258b315ae4bc42af4b3ae11fc0ec20a49`

## Explicitly out of scope

- Remote apply / migration repair / `db push`
- Social `/saved` / Store Favorites
- Personal Notes / Resume / progress semantics
- Instructor browse-all
- Folders / tags / sharing / AI
- Commerce / Translation / Collaboration / Billing / UEOS / Guardian

## Recommended next

Feature branch push + SoT FF when validation PASS; remote apply of `20260914` only on explicit GO.
