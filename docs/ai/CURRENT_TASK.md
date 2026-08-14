# CURRENT_TASK

## Task

LEARNING_LESSON_ENGINE_O_COURSE_RPC_HOTFIX_V1

## Status

`implementation-complete-remote-applied-smoke-pass`

## Branch

`office/learning-lesson-engine-o-course-rpc-hotfix-v1`

## Worktree

`D:\umtuba-central\repos\umtuba-web-learning-lesson-engine-o-course-rpc-hotfix-v1`

## Base

Learning SoT `office/learning-resume-accessible-target-hardening-v1` @ `9461b30a453ec9eb6a6a90683bb6913015ddc5bc`

## Migration

`20260920_learning_lesson_engine_o_course_rpc_hotfix_v1.sql`
**Remote applied.** History registered as `20260920` / `learning_lesson_engine_o_course_rpc_hotfix_v1`.

## Scope

- Fix PL/pgSQL nested composite `v_ctx.o_course.*` access bug
- Targeted remote apply + learner re-smoke

## Forbidden / not done

- Jinn content mutation / reimport
- Unrelated schema / RLS weakening
- Extra migrations / repair
- Commit/push unless explicitly requested
