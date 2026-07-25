# UM Learning — Learner Experience Foundation V1

Status: **Slice 3 implemented** (Learner Activity Routing)

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

## Slice 3 — Learner Activity Routing

### Goal

Open the correct learner experience from activity links and deep links.
No migrations. No instructor or engine changes.

### Behavior

| Concern | Strategy |
| --- | --- |
| Resolver | `resolveLearnerActivityTarget({ activity_id, type })` |
| quiz | → `/learning/activities/{id}/assessment` (`experience: assessment`) |
| assignment | → `/learning/activities/{id}/assignment` (`experience: assignment`) |
| other / unknown / empty type | → `/learning/activities/{id}` (`experience: generic`) |
| Missing id | → `null` (fail closed) |
| List links | `ActivityList` uses resolver href |
| Deep links | Generic activity gate redirects quiz/assignment away |
| Back links | Assessment / assignment return to lesson (not gate) to avoid loops |

### Files

- `lib/learning/learnerDelivery.ts`
- `lib/learning/learnerDelivery.test.ts`
- `app/components/learning/ActivityList.tsx`
- `app/learning/activities/[activityId]/page.tsx`
- `app/learning/activities/[activityId]/assessment/page.tsx` (back links)
- `app/learning/activities/[activityId]/assignment/page.tsx` (back links)

### Out of scope (later)

Learner dashboard extras, migrations, instructor changes, completion
mutations, assessment/assignment engine changes.
