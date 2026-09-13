# Learning Instructor Browser E2E Foundation V1

Capability: `learning.ops.instructor_browser_e2e_foundation_v1`  
Base tip: Learning SoT (`525c046`)  
Branch: `office/learning-instructor-browser-e2e-foundation-v1`

## Purpose

First reliable **browser-level** E2E foundation for the Learning **instructor**
experience. Validates navigation, route ownership, authorization boundaries,
visible states, and safe form absence of Commerce/money controls.

Not a feature expansion. No redesign. No migrations. No remote DB mutation from
the instructor runner.

## Framework discovered

| Item | Value |
| --- | --- |
| Tool | Playwright (`playwright` already in `devDependencies`) |
| Pattern | Custom Node runners under `scripts/learning-e2e/` (not `playwright.config`) |
| Existing learner journey | `e2e/learning/learner-access-journey.mjs` + `npm run test:learning-e2e` |
| Fixture provisioner | `npm run test:learning-e2e:provision` (instructor+learner users, course, lessons) |
| CI | No dedicated instructor browser CI job in this milestone |

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `LEARNING_E2E_BASE_URL` | yes | Running app origin (`http://localhost:3000`) |
| `LEARNING_E2E_INSTRUCTOR_EMAIL` | yes* | Test-only instructor identity |
| `LEARNING_E2E_INSTRUCTOR_PASSWORD` | yes* | Test-only instructor password (never logged) |
| `LEARNING_E2E_COURSE_ID` | yes | Owned/manageable course UUID |
| `LEARNING_E2E_LESSON_ID` | yes | Owned lesson UUID |
| `LEARNING_E2E_ACTIVITY_ID` | optional | Enables assessment/assignment happy paths |
| `LEARNING_E2E_EMAIL` / `PASSWORD` | fallback | Used when instructor vars unset (matches provisioner) |

\*Falls back to learner email/password pair when instructor-specific vars are unset.

Missing/invalid env → `SKIPPED_ENV` (exit 0), never silent journey PASS.

## Auth strategy

- Login through existing `/login` UI (`scripts/learning-e2e/auth.mjs`)
- Instructor session `next=/learning/instructor`
- Anonymous fail-closed: fresh browser context → instructor hub must redirect to `/login`
- No hardcoded credentials; no personal accounts; no production credentials

## Data strategy

- Prefer IDs from existing `UMTUBA_LEARNING_E2E_V1` fixture provisioner
- Instructor runner **does not** provision or mutate fixtures
- Does **not** click Publish / Create / Save against live data
- Unknown UUIDs used only for fail-closed unavailable surfaces
- Assessment/assignment happy paths require `LEARNING_E2E_ACTIVITY_ID` (not seeded by current provisioner)

## Commands

```bash
# Harness / discovery (always runnable)
npx vitest run lib/learning/instructorBrowserE2eFoundation.test.ts

# Browser instructor journey (SKIPPED_ENV when fixtures missing)
npm run test:learning-e2e:instructor
# or:
node scripts/learning-e2e/run-instructor-foundation.mjs

# Related learner browser foundation
npm run test:learning-e2e
```

## Scenarios

| Scenario | Classification when env ready | Notes |
| --- | --- | --- |
| Anonymous instructor hub → login | RUNNABLE_AND_PASSING | No credentials required beyond `BASE_URL` (gated with full instructor env) |
| Instructor dashboard + nav | RUNNABLE_AND_PASSING | |
| Course authoring shell | RUNNABLE_AND_PASSING | |
| Unknown course fail-closed | RUNNABLE_AND_PASSING | |
| Lesson content-block editor | RUNNABLE_AND_PASSING | Asserts reserved types absent |
| Unknown lesson fail-closed | RUNNABLE_AND_PASSING | |
| Assessment happy path | IMPLEMENTED_BUT_ENV_BLOCKED | Needs `LEARNING_E2E_ACTIVITY_ID` |
| Assessment unavailable fail-closed | RUNNABLE_AND_PASSING | Uses unknown activity UUID |
| Assignment happy path | IMPLEMENTED_BUT_ENV_BLOCKED | Needs `LEARNING_E2E_ACTIVITY_ID` |
| Assignment unavailable fail-closed | RUNNABLE_AND_PASSING | |
| Review queue | RUNNABLE_AND_PASSING | Empty queue is valid |
| Instructor nav route ownership | RUNNABLE_AND_PASSING | |
| Save/publish against remote | OUT_OF_SCOPE | Safety boundary |
| Learner attempt players in authoring | OUT_OF_SCOPE / asserted absent | |
| Commerce/payout inputs | OUT_OF_SCOPE / asserted absent | |

## Safety boundaries

- No production credentials
- No remote Supabase mutation from instructor runner
- No email sending / payment / provider calls
- No destructive deletes
- No hardcoded secrets
- Fail closed on assertion failures (`FAIL`, exit 1)
- Missing env is `SKIPPED_ENV` (exit 0), documented — not claimed as runtime PASS

## UI hooks added (behavior-preserving)

Optional `testId` on `LearningShell` plus stable `data-testid`s on instructor
dashboard/course/lesson/review/assessment/assignment surfaces. No visual redesign.

## Recommended next E2E milestone

Extend fixture provisioner to seed a deterministic assessment + assignment
activity (`LEARNING_E2E_ACTIVITY_ID`), then un-block assessment/assignment
happy-path browser scenarios and optionally add instructor publish/reorder
smoke against **local** fixtures only.
