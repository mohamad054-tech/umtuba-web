# UM Learning — Learner Experience Foundation V1

Status: **Slice 1 implemented** (Hub Progress + Continue Learning)

Branch: `office/learning-learner-experience-foundation-v1`

## Slice 1 — Hub Progress + Continue Learning

### Goal

Enrich My Learning hub with existing course progress and a resume target.
No migrations. No new RPCs.

### Behavior

| Concern | Strategy |
| --- | --- |
| Hub courses | `LearningLearnerHubCourse.progress` from `get_learning_course_progress` |
| Continue target | `resolveContinueLearningTarget(last_lesson_id, first_lesson_id)` |
| First lesson | First published lesson by section then lesson position |
| Fail closed | `continue_href` is null when neither lesson id exists |
| UI | Continue Learning card + per-course percent + Resume |

### Files

- `lib/learning/learnerDelivery.ts`
- `lib/learning/learnerDelivery.test.ts`
- `app/components/learning/LearningHub.tsx`

### Out of scope (later slices)

Next/prev lesson navigation, activity type routing, learner dashboard extras,
migrations, instructor changes.
