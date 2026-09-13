# Current Task

## Task title

UM Learning - Instructor Browser E2E Foundation V1

## Status

`ready_for_review` — foundation implemented; browser runtime depends on local fixtures + running app.

## Milestone

`learning.ops.instructor_browser_e2e_foundation_v1`

## Scope landed

- Playwright instructor journey + runner (`npm run test:learning-e2e:instructor`)
- Harness contracts (`lib/learning/instructorBrowserE2eFoundation.test.ts`)
- Minimal instructor `data-testid` hooks (no redesign)
- Docs: `LEARNING_INSTRUCTOR_BROWSER_E2E_FOUNDATION_V1.md`

## Branch / HEAD base

`office/learning-instructor-browser-e2e-foundation-v1`
Base: `origin/office/learning-resume-accessible-target-hardening-v1` @ `525c046`

## Worktree

`C:\Users\1\Desktop\umtuba\umtuba-web-learning-instructor-browser-e2e-foundation-v1`

## Recommended next

Seed `LEARNING_E2E_ACTIVITY_ID` in fixture provisioner, then un-block assessment/assignment happy-path browser scenarios (local fixtures only).
