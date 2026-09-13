# CROSS-DEVICE HANDOFF — Learning Instructor Browser E2E (Desktop → Laptop/Central)

| Field | Value |
| --- | --- |
| FROM | DESKTOP-A3 / `DESKTOP_FINAL_LOCAL_CLOSEOUT_WAVE_3_V1` |
| TO | Laptop Learning owner + Central integrator |
| DEVICE_ORIGIN | DESKTOP |
| Generated | 2026-08-12 |
| Priority | High (unique uncommitted Learning test WIP; Desktop must not continue) |

## Why this is not Desktop work

Learning V1 is **APPROVED and FROZEN** on Desktop product tracks. Wave 3 forbids Learning development on Desktop. This checkout holds **ACTIVE_VALID_WIP** that belongs to the Learning device/owner.

## Location

| Item | Value |
| --- | --- |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-learning-instructor-browser-e2e-foundation-v1` |
| Branch | `office/learning-instructor-browser-e2e-foundation-v1` |
| HEAD | `525c046661c456e3b3170f52b4b568a8ea214058` |
| Upstream | **none** (`origin/office/learning-instructor-browser-e2e-foundation-v1` missing) |
| vs `origin/alpha-0.2` | **25 ahead / 188 behind** (tip not on alpha) |
| Dirty | 14 modified + 4 untracked |

## Dirty inventory (preserve)

Modified (sample):

- `app/components/learning/LearningShell.tsx`
- Multiple `app/learning/instructor/**` pages (courses, lessons, assignment, questions, review)
- `scripts/learning-e2e/auth.mjs`, `env.mjs`
- `package.json`
- `docs/ai/*` handoff twins

Untracked:

- `docs/learning/implementation/LEARNING_INSTRUCTOR_BROWSER_E2E_FOUNDATION_V1.md`
- `e2e/learning/instructor-authoring-journey.mjs`
- `lib/learning/instructorBrowserE2eFoundation.test.ts`
- `scripts/learning-e2e/run-instructor-foundation.mjs`

## Classification

**ACTIVE_VALID_WIP** (+ missing upstream → also needs push/remote branch create when Laptop owns it)

## Related Desktop Learning dirties (same owner — do not implement on Desktop)

| WT | Class | Note |
| --- | --- | --- |
| `…-activity-timeline-foundation-v1` @ `9478258` | COMPLETE_NEEDS_COMMIT | 12 UT learning smoke/e2e scripts+tests |
| `…-attachments-foundation-v1` @ `67cf30f` | NEEDS_OPERATOR_DECISION | Accidental junk filenames only |
| `…-smoke-e2e-readiness-v1` @ `616d4f7` | NEEDS_OPERATOR_DECISION | Ghost `.gitignore` porcelain dirty |

## Requested Laptop / Central actions

1. Take ownership of instructor e2e WT; create correct upstream branch name when ready.
2. Decide commit vs reshape vs port onto current Learning SoT (tip is **188 behind** alpha — rebase/port likely required; Desktop will not do it).
3. Optionally absorb activity-timeline UT smoke files in the same Learning pass.
4. Do **not** ask Desktop to continue Learning implementation.

## Desktop guarantees

- No Learning code edits in Wave 3
- No discard/clean of this WT
- `_port_extract` unrelated / untouched
