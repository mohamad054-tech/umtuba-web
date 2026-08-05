# Current Task

## Task title

UM Learning — Learner Lesson Delivery Defense-in-Depth V1

## Status

`implementation-complete` — awaiting commit GO.

## Milestone

`learning.learner.lesson_delivery_defense_in_depth_v1`

## What landed

- Engine-first sequencing on `/learning/lessons/[lessonId]`
- Split `loadLessonDeliveryMetadata` vs `loadLessonDeliveryProtected`
- `loadLessonDeliveryForAccess` gates protected SELECTs + progress mutations
- Discriminated delivery types (`metadata_only` | `verified_full`)
- AI Tutor uses metadata-only after existing unlock gate
- LessonViewer typed to shell only (engine remains content authority)

## Branch / HEAD base

`office/learning-ai-tutor-learner-ui-integration-v1` (base `9628557`)

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-learning-ai-tutor-learner-ui-integration-v1`

## Next

Await commit GO. Do not push.
