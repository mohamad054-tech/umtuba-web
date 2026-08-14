# Learning Lesson Engine o_course RPC Hotfix V1

## Problem

Live learner RPCs failed with:

`missing FROM-clause entry for table "o_course"`

Root cause: callers do `SELECT * INTO v_ctx` (generic `record`) from helpers
that return **composite** OUT columns (`o_course`, `o_lesson`, …). PL/pgSQL
then rejects nested access `v_ctx.o_course.id` (middle name parsed as a table).
Scalar OUT fields such as `v_ctx.o_space_id` remain valid.

Confirmed broken on production before this hotfix:

- `get_my_learning_lesson_engine`
- `get_my_learning_lesson_unlock_state`
- `start_learning_lesson`
- and other progress / lab / assignment / project callers using the same pattern

## Fix

Migration `20260920_learning_lesson_engine_o_course_rpc_hotfix_v1.sql`:

1. Adds `learning_composite_id` / `learning_composite_text` (immutable SQL helpers).
2. Rewrites all affected SECURITY DEFINER RPCs to read composites via
   `to_jsonb(v_ctx)` helpers instead of `v_ctx.o_*.*`.

## Preserved

- RPC signatures
- `auth.uid()` / `has_learning_course_access` / manager checks
- Unlock / UM Points semantics
- Grants (helpers: authenticated + service_role only; anon revoked)
- No table / RLS / content / enrollment changes

## Tests

`lib/learning/lessonEngineOCourseRpcHotfix.test.ts`
