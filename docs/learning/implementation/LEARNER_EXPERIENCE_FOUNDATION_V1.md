# UM Learning — Learner Experience Foundation V1

Status: **Slice 2 implemented** (Next/Previous Lesson Navigation)

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

## Slice 2 — Next/Previous Lesson Navigation

### Goal

Surface previous/next published lesson links on the lesson viewer.
No migrations. No completion mutation on navigate.

### Behavior

| Concern | Strategy |
| --- | --- |
| Order | Published sections → published lessons by position |
| Resolver | `resolveAdjacentLessonTargets(current, ordered_ids)` |
| Delivery | `previous_lesson` / `next_lesson` on `LearningLearnerLessonDelivery` |
| Ends | First: previous null; last: next null; no wrap |
| Unknown | Current id missing from ordered list → both null |
| Fail closed | Nav load errors leave neighbors null; lesson still loads |
| UI | Previous / Next links in `LessonViewer`; hide unavailable |

### Files

- `lib/learning/learnerDelivery.ts`
- `lib/learning/learnerDelivery.test.ts`
- `app/components/learning/LessonViewer.tsx`

### Out of scope (later slices)

Activity type routing, learner dashboard extras, migrations, instructor
changes, complete-on-next mutations.
