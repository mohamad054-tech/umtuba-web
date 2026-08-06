# Learning Browser E2E Foundation V1

Capability: `learning.ops.browser_e2e_foundation_v1`
Base tip: Learning SoT (`31ea770`)
Branch: `office/learning-browser-e2e-foundation-v1`

## Purpose

Establish a **real Playwright browser E2E harness** for Learning and prove one
narrow learner access journey only. Not full Learning coverage.

## Existing support audited

- No repo `e2e/` tree and no Playwright test config on SoT before this milestone
- `playwright` already present (used by LiveKit verification scripts)
- No Learning-specific test-auth helper; login uses existing `/login` UI
- Production smoke gate remains inventory/typecheck only (no browser runners)

## Journey covered

1. Open My Learning hub (`/learning`)
2. Open accessible course outline
3. Open accessible published lesson and verify content renders
4. Verify locked lesson fails closed (no protected content)
5. Verify Resume / Prev / Next hrefs are lesson routes and never the locked fixture

## Environment requirements

All required (missing → `SKIPPED_ENV`, exit 0 — not FAIL):

| Variable | Purpose |
|---|---|
| `LEARNING_E2E_BASE_URL` | Running app origin (`http://localhost:3000` etc.) |
| `LEARNING_E2E_EMAIL` | Isolated test learner email (from env only) |
| `LEARNING_E2E_PASSWORD` | Isolated test learner password (never logged) |
| `LEARNING_E2E_COURSE_ID` | Accessible course UUID |
| `LEARNING_E2E_LESSON_ID` | Accessible published unlocked lesson UUID |
| `LEARNING_E2E_LOCKED_LESSON_ID` | Locked lesson UUID (same course entitlement, locked content) |

Optional: values may also load from `.env.local` if not already in the process env.

## Commands

```bash
# Harness contract (always runnable)
npx vitest run lib/learning/browserE2eFoundation.test.ts

# Browser journey (SKIPPED_ENV when fixtures missing)
node scripts/learning-e2e/run-foundation.mjs
# or:
npm run test:learning-e2e
```

## Out of scope

- Full Learning suite / instructor / assessments / AI Tutor
- Commerce / Collaboration / AI Platform / Mobile / Guardian
- Migration apply
- Live third-party providers
- Broad UI redesign / access-gate weakening

## Safety

- Fail closed on assertion failures (`FAIL`, exit 1)
- Missing env is `SKIPPED_ENV` (exit 0), never silent pass of journey
- No hardcoded credentials; secrets never printed
- No production data mutation in this foundation path
