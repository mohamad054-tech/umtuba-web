# UM Learning — Architecture Audit (Beta Readiness)

Status: **audit complete** (hardening migration Git-only, **not applied**)

Branch: `office/learning-beta-readiness-v1`

Companion report: `LEARNING_BETA_READINESS_REPORT_V1.md`

Hardening migration: `20260860_learning_beta_readiness_auth_alignment_v1.sql`

---

## 1. Stack map

Learning is a DB-authoritative vertical under Spaces → Programs → Courses → Sections → Lessons → Activities, with enrollments, progress, assessments, assignments, completion/transcript, instructor surfaces, community, and live calendar layered additively.

```text
Space / Membership
  └─ Program
       └─ Course (+ staff)
            ├─ Section → Lesson → Activity
            │     ├─ Content blocks
            │     ├─ Questions / Attempts / Scoring / Assessment wrappers
            │     └─ Assignment specs / submissions / reviews
            ├─ Progress (lesson + course rollup)
            ├─ Completion → Certificates + Transcript
            ├─ Community (discussions / Q&A / announcements)
            └─ Live sessions + calendar + attendance
```

App adapters live in `lib/learning/*` (RPC-only). UI under `app/learning/**`. Mutations via SECURITY DEFINER RPCs; tables FORCE RLS; authenticated DML revoked.

---

## 2. Foundation inventory (apply order)

| Migration | Domain |
|---|---|
| `20260828` | Spaces & membership |
| `20260829` | Programs |
| `20260830` | Courses |
| `20260831` | Sections |
| `20260832` | Lessons |
| `20260833` | Activities |
| `20260834` | Enrollments |
| `20260835` | Progress |
| `20260836` | Lesson content blocks |
| `20260837` | Questions |
| `20260838` | Attempts |
| `20260839` | Scoring |
| `20260840` | Read-model hardening |
| `20260841` | Learner result delivery |
| `20260844` | Result policy completion |
| `20260845` | Progress mutations |
| `20260848`–`20260854` | Assessment delivery → progress integration |
| `20260855` | Completion / certificates / transcript |
| `20260856` | Instructor experience |
| `20260857` | Assignments & coursework |
| `20260858` | Discussions & community |
| `20260859` | Live learning & calendar |
| `20260860` | Beta readiness auth alignment |

Numeric gaps (`42–43`, `46–47`) are non-Learning migrations (Ads/Games) — expected.

---

## 3. Duplication findings

### Authorization helpers
Near-identical manage/access wrappers across domains:

- `learning_assignment_assert_manage`
- `learning_instructor_assert_course_manage`
- `learning_community_assert_staff` / `learning_community_assert_access`
- `learning_live_assert_manage` / `learning_live_assert_access`

**Release issue fixed in `20260860`:** community access previously omitted `is_learning_course_staff` while live included it (TA asymmetry). Community assert now matches live.

### Course → space helpers
`learning_community_course_space_id` and `learning_live_course_space_id` were duplicate bodies. `20260860` introduces shared `learning_course_space_id` with thin aliases.

### Notification type check
Each learning notification migration re-declares the full allowlist (cumulative). Current tip (`20260859`) matches `lib/supabase/notifications.ts`. Fragile for future authors; correct today.

### TypeScript DTOs / Result / UUID
~14 foundation adapters each copy UUID regex + Result shape. Behavior-identical; safe future extract to `lib/learning/shared.ts` — deferred (not a beta blocker).

### RPC redefines
Intentional `CREATE OR REPLACE` refinements (`score_learning_attempt`, `submit_learning_attempt`, etc.) keep matching signatures — no overload conflicts found.

---

## 4. Security posture (sampled)

Across spaces, courses, enrollments, assignments, community, live:

- SECURITY DEFINER + `search_path = public` on table-touching RPCs
- FORCE RLS on Learning tables
- revoke PUBLIC/anon; grant execute to `authenticated` (+ service_role for ops)
- `auth.uid()` captured in mutating RPCs; fail closed on null
- **No** `service_role` usage from `lib/learning` application code (asserted in tests)

---

## 5. Flow integrity

| Flow | Status |
|---|---|
| Progress | Lesson/course RPCs + DB percent; auto-complete from scored attempts / assignments via application ledger |
| Grading | Objective scoring + manual review + progress integration |
| Completion / certificates / transcript | `20260855` metadata certificates + learner transcript RPCs |
| Assignments vs assessments | Separate tables/RPCs; shared activities + progress only |
| Community | Wired UI + RPCs + notifications |
| Live | Join gate (DB) → attendance → optional LiveKit mint in app |

---

## 6. Schema notes

- Lifecycle enums consistent (`draft|published|suspended|archived` for content)
- Soft refs only where intentional (enrollment payment attribution)
- Assessment **due dates** do not exist (calendar flags `assessment_due_supported: false`)

---

## 7. Build graph

- ~32 `lib/learning/*.ts` adapters, ~31 matching tests (+ `betaReadiness.test.ts`)
- Gap: `contentBlockRender.ts` lacks dedicated tests
- LiveKit mint stays server-side via foundation + actions

---

## 8. Recommended future cleanups (post-beta)

1. Single shared `learning_assert_course_access` / `learning_assert_course_manage`
2. `lib/learning/shared.ts` for UUID/Result/sanitize
3. Additive notification enum strategy (or generated allowlist check)
4. Explicit `server-only` guard on LiveKit mint module (add dependency if adopted)
5. Minimal Space/Program/Course bootstrap UI or ops seed tooling
