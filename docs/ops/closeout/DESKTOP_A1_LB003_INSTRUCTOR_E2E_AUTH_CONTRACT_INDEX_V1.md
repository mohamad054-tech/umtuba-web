# LB-003 Learning Instructor E2E — Non-Secret Auth / Fixture Contract Index

| Field | Value |
| --- | --- |
| TASK_ID | `DESKTOP_LB003_INSTRUCTOR_E2E_HANDOFF_RECOVERY_V1` |
| AGENT_ID | DESKTOP-A1 |
| Generated | 2026-08-12 |
| SECRET_VALUES_RECOVERED | **NO** |
| Companion recovery | `DESKTOP_A1_LB003_INSTRUCTOR_E2E_HANDOFF_RECOVERY_V1.md` |

## Authoritative ownership handoff

| Item | Value |
| --- | --- |
| Artifact | `DESKTOP_A3_CROSS_DEVICE_LEARNING_INSTRUCTOR_E2E_HANDOFF_V1.md` |
| SHA256 | `37E73BCD9A1A208ACC3AA46155FA538816155136BEFC0D8EF00A396B38FDB4CF` |
| Wave / task origin | `DESKTOP_FINAL_LOCAL_CLOSEOUT_WAVE_3_V1` / DESKTOP-A3 |
| Expected execution owner | Laptop Learning owner + Central integrator |

## Roles

| Role | How expressed | Notes |
| --- | --- | --- |
| Instructor (teacher) | Auth user via `LEARNING_E2E_INSTRUCTOR_EMAIL` (+ password ref) | Falls back to learner pair when instructor vars unset |
| Learner | Auth user via `LEARNING_E2E_EMAIL` (+ password ref) | Enrolled via provisioner (`admin_assignment`) |
| Anonymous | Fresh browser context | Instructor hub must redirect to `/login` |

## Learner fixture requirements (non-secret)

- Isolated Auth user (Admin API; never SQL insert into `auth.users`)
- Enrolled in fixture course (`create_learning_enrollment`, active)
- Needs open lesson UUID + locked lesson UUID (differing UUIDs)
- Namespace / slugs: `UMTUBA_LEARNING_E2E_V1` / `umtuba-learning-e2e-v1-*`

## Teacher / instructor fixture requirements (non-secret)

- Isolated Auth user (may share learner pair by provisioner default)
- Owns Space → Program → Course → Section → 2 lessons under fixture namespace
- Instructor browser runner uses owned `COURSE_ID` + `LESSON_ID`
- Optional `ACTIVITY_ID` for assessment/assignment happy paths (not seeded by current provisioner)

## Env / reference variable NAMES only

### Instructor browser run (`resolveInstructorLearningE2eEnv`)

- `LEARNING_E2E_BASE_URL`
- `LEARNING_E2E_INSTRUCTOR_EMAIL`
- `LEARNING_E2E_INSTRUCTOR_PASSWORD` → `LEARNER_PASSWORD_REF` sibling: use name only; **no value recovered**
- Fallback: `LEARNING_E2E_EMAIL` / `LEARNING_E2E_PASSWORD`
- `LEARNING_E2E_COURSE_ID` (UUID)
- `LEARNING_E2E_LESSON_ID` (UUID)
- Optional: `LEARNING_E2E_ACTIVITY_ID` (UUID)

### Learner browser run (`resolveLearningE2eEnv`)

- `LEARNING_E2E_BASE_URL`
- `LEARNING_E2E_EMAIL`
- `LEARNING_E2E_PASSWORD` → `LEARNER_PASSWORD_REF = LEARNING_E2E_PASSWORD`
- `LEARNING_E2E_COURSE_ID`
- `LEARNING_E2E_LESSON_ID`
- `LEARNING_E2E_LOCKED_LESSON_ID`

### Provisioner (`resolveProvisionEnv`) — owner device only

- `LEARNING_E2E_SUPABASE_URL` \| `NEXT_PUBLIC_SUPABASE_URL`
- `LEARNING_E2E_SUPABASE_SERVICE_ROLE_KEY` \| `SUPABASE_SERVICE_ROLE_KEY`
- `LEARNING_E2E_SUPABASE_ANON_KEY` \| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` \| `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `LEARNING_E2E_ENV` (`local` \| `test` \| `prod`)
- `LEARNING_E2E_ALLOW_PROD` (must be `1` to allow prod mutation)

Password refs (names only):

- `LEARNER_PASSWORD_REF = LEARNING_E2E_PASSWORD`
- `INSTRUCTOR_PASSWORD_REF = LEARNING_E2E_INSTRUCTOR_PASSWORD` (fallback `LEARNING_E2E_PASSWORD`)

## Project ref

No non-secret Supabase project ref / project id string is recorded in the handoff or foundation docs. Consume via URL env names above on the Learning owner device. **PROJECT_REF_FOUND = NO.**

## Secure credential consumption mechanism

1. Load from process env and optional local `.env.local` (`loadDotEnvLocal`) — never hardcoded.
2. Scripts must not log passwords, service-role keys, or tokens.
3. Browser auth via existing `/login` UI (`scripts/learning-e2e/auth.mjs`); instructor `next=/learning/instructor`.
4. Missing/invalid env → `SKIPPED_ENV` / `BLOCKED_ENV` (not silent PASS).
5. Instructor runner does **not** provision or mutate fixtures; provisioner is separate and fail-closed on prod unless `LEARNING_E2E_ALLOW_PROD=1`.

## Prerequisites

- Worktree preserved: `umtuba-web-learning-instructor-browser-e2e-foundation-v1` @ `525c046…` (dirty ACTIVE_VALID_WIP; no upstream).
- Running app at `LEARNING_E2E_BASE_URL`.
- Isolated test credentials supplied by Learning owner (not present on Desktop WT: `.env.local` absent).
- Desktop must not continue Learning implementation (Learning V1 frozen on Desktop).

## Validation / acceptance (high level)

| Check | Expectation |
| --- | --- |
| `npm run test:learning-e2e:instructor` / `run-instructor-foundation.mjs` | PASS when env ready; SKIPPED_ENV when not |
| Anonymous instructor hub | Redirect `/login` |
| Instructor dashboard / course / lesson shells | Reachable for fixture owner |
| Assessment/assignment happy path | Blocked until `LEARNING_E2E_ACTIVITY_ID` seeded |
| Secrets in logs/handoffs | None |

## Commands (owner device)

```bash
npx vitest run lib/learning/instructorBrowserE2eFoundation.test.ts
npm run test:learning-e2e:instructor
# related learner:
npm run test:learning-e2e
# provision (owner only; needs service-role env):
node scripts/learning-e2e/provision-fixtures.mjs
```
