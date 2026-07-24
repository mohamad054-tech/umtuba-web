# UM Learning — Beta Readiness Report V1

Status: **release-readiness sprint complete** (not committed / not pushed)

Branch: `office/learning-beta-readiness-v1`

Architecture audit: `LEARNING_ARCHITECTURE_AUDIT_BETA_V1.md`

Hardening: `supabase/migrations/20260860_learning_beta_readiness_auth_alignment_v1.sql` (**not applied**)

---

## Beta readiness percentage

**~70%** ready for an **internal** instructor + enrolled-learner beta.

| Layer | Estimate | Notes |
|---|---|---|
| Schema / RPC / security | ~90% | Consistent patterns; auth asymmetry fixed in 60860 |
| App / UI surfaces | ~85% | Learner + instructor trees present end-to-end |
| Operability / apply / seed | ~35% | Migrations documented as not applied; no product bootstrap for Space/Program/Course |

Raised from ~65% by shipping auth alignment + documented plans; remaining drag is remote apply + bootstrap ops.

---

## Release blockers (must clear before Beta)

1. **Confirm and apply Learning migrations** on the target Supabase project (Git-only today). Use ordered list below — never blanket `db push` without approval.
2. **Bootstrap first Space → Program → Course** (and staff + enrollments) via approved ops/RPC — there is no in-app create-space/program UI.
3. **Apply `20260860`** so community access includes course staff (matches live).
4. **Configure LiveKit env** if live class media join is in Beta scope; otherwise join readiness works but token issuance stays fail-closed.
5. **Smoke-test content block rendering** before inviting learners (`contentBlockRender.ts` has no dedicated tests).

---

## Critical issues

| ID | Issue | Severity |
|---|---|---|
| C1 | Remote Learning schema may be unapplied | Blocker |
| C2 | No UI path to create Space/Program/Course | Blocker for self-serve onboarding |
| C3 | Community vs live staff access asymmetry | Fixed in Git via 60860; still needs apply |
| C4 | Live media depends on LiveKit configuration | Blocker only if live video is in Beta scope |

---

## Medium issues

| ID | Issue |
|---|---|
| M1 | Duplicated per-domain assert/manage helpers (maintenance risk) |
| M2 | Full notification allowlist re-declared each migration (omit risk) |
| M3 | Assessment due dates absent from calendar |
| M4 | `contentBlockRender.ts` untested |
| M5 | Untracked leftover `AssignmentFileUploadField.tsx` on branch — confirm ownership |

---

## Low-priority cleanup

| ID | Item |
|---|---|
| L1 | Extract `lib/learning/shared.ts` (UUID/Result/sanitize) |
| L2 | Collapse assert helpers into shared Learning auth helpers |
| L3 | Add `server-only` package + guard on LiveKit mint |
| L4 | Docs: mark foundations “applied” only after real project verification |
| L5 | Optional global `/learning/calendar` hub (course-scoped calendars already exist) |

---

## Recommended merge order

Merge / land foundations in dependency order (already reflected on this branch tip through live + readiness):

1. Spaces → Programs → Courses → Sections → Lessons → Activities
2. Enrollments → Progress → Content blocks
3. Questions → Attempts → Scoring → Read model → Result delivery → Policy → Progress mutations
4. Assessment chain (`848`–`854`)
5. Completion (`855`) → Instructor experience (`856`)
6. Assignments (`857`) — can parallel assessment chain after progress mutations
7. Community (`858`) → Live (`859`) → Beta auth alignment (`860`)

Do **not** reorder notification-altering migrations (`855` → `858` → `859`).

---

## Recommended migration apply order

```
20260828_learning_spaces_membership_foundation_v1.sql
20260829_learning_programs_foundation_v1.sql
20260830_learning_courses_foundation_v1.sql
20260831_learning_sections_foundation_v1.sql
20260832_learning_lessons_foundation_v1.sql
20260833_learning_activities_foundation_v1.sql
20260834_learning_enrollments_foundation_v1.sql
20260835_learning_progress_foundation_v1.sql
20260836_learning_lesson_content_blocks_foundation_v1.sql
20260837_learning_questions_foundation_v1.sql
20260838_learning_attempts_foundation_v1.sql
20260839_learning_scoring_foundation_v1.sql
20260840_learning_read_model_hardening_v1.sql
20260841_learning_learner_result_delivery_v1.sql
20260844_learning_result_policy_completion_v1.sql
20260845_learning_progress_mutations_v1.sql
20260848_learning_assessment_delivery_minimal_v1.sql
20260849_learning_assessment_attempt_foundation_v1.sql
20260850_learning_assessment_answer_persistence_v1.sql
20260851_learning_assessment_submission_foundation_v1.sql
20260852_learning_assessment_objective_grading_foundation_v1.sql
20260853_learning_assessment_manual_review_foundation_v1.sql
20260854_learning_assessment_progress_integration_v1.sql
20260855_learning_completion_foundation_v1.sql
20260856_learning_instructor_experience_foundation_v1.sql
20260857_learning_assignments_coursework_foundation_v1.sql
20260858_learning_discussions_community_foundation_v1.sql
20260859_learning_live_calendar_foundation_v1.sql
20260860_learning_beta_readiness_auth_alignment_v1.sql
```

Apply only with explicit human approval per `docs/DEVELOPMENT_WORKFLOW.md`.

---

## Recommended end-to-end Beta test plan

### Prep (ops)
1. Apply migrations through `20260860` on Beta project.
2. Seed: Space → Program → Course → Section → Lesson → Activity (quiz + assignment).
3. Add instructor staff + enroll 2–3 learners.
4. Publish course tree content.

### Instructor
5. Author questions; publish activity.
6. Create assignment with due date; review a submission.
7. Schedule a live session; cancel one; complete one.
8. Post announcement; moderate a discussion.
9. Open instructor calendar; confirm live + assignment dues.
10. Review manual-review queue if subjective items present.

### Learner
11. Open `/learning` hub → course outline → lesson → activity.
12. Start/submit assessment; view result per policy.
13. Submit assignment; view review outcome.
14. Participate in community (thread + Q&A).
15. Join live session inside window; confirm attendance; leave.
16. Complete required lessons; finalize completion; open transcript/certificates.

### Security smoke
17. Second user without enrollment: expect fail-closed on course/community/live.
18. Learner cannot call manage/review RPCs.
19. Cancelled live session not joinable.
20. Notification types render for announcement / live schedule / completion.

---

## What this sprint intentionally did not build

No new product features beyond release-hardening (`20260860`). No Space bootstrap UI. No external calendar sync. No email/push. No redesign of assessments or live media.
