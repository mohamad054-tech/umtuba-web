# Learning E2E Fixture Provisioning & Live Run V1

Capability: `learning.ops.e2e_fixture_provisioning_live_run_v1`
Base tip: Browser E2E foundation (`88de13b`)
Branch: `office/learning-e2e-fixture-provisioning-v1`

## Purpose

Provision an **isolated** Learning E2E fixture set and execute the browser
learner-access journey live.

## Fixture strategy

Namespace: `UMTUBA_LEARNING_E2E_V1` (slug-prefixed, idempotent reuse)

1. Ensure dedicated Auth users via Admin API (never SQL `INSERT INTO auth.users`)
2. Instructor session creates Space → Program → Course → Section → 2 lessons
3. Open lesson: published + rich_text content block
4. Locked lesson: published + `set_learning_lesson_point_cost` enabled (fail-closed)
5. Learner enrolled via `create_learning_enrollment` (`admin_assignment`, active)
6. Print fixture IDs only — never credentials

## Environment

| Variable | Required | Notes |
|---|---|---|
| `LEARNING_E2E_BASE_URL` | yes | Running app origin |
| `LEARNING_E2E_EMAIL` / `LEARNING_E2E_PASSWORD` | yes | Isolated learner |
| `LEARNING_E2E_INSTRUCTOR_EMAIL` / `LEARNING_E2E_INSTRUCTOR_PASSWORD` | optional | Defaults to learner pair |
| `LEARNING_E2E_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` | yes | Provision target |
| `LEARNING_E2E_SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | yes | Auth admin only in this script |
| `LEARNING_E2E_SUPABASE_ANON_KEY` or publishable/anon key | yes | Instructor/learner RPC sessions |
| `LEARNING_E2E_ENV` | recommended | `local` \| `test` \| `prod` |
| `LEARNING_E2E_ALLOW_PROD` | prod only | Must be `1` to allow production mutation |

Production mutation is **refused** unless `LEARNING_E2E_ALLOW_PROD=1`.

## Commands

```bash
node scripts/learning-e2e/provision-fixtures.mjs
node scripts/learning-e2e/provision-and-run.mjs
# or after IDs are exported:
npm run test:learning-e2e
```

Exit codes: `0` PASS · `2` BLOCKED_ENV/BLOCKED_PROD · `1` FAIL

## Live run status

**Deferred.** This foundation closes without a live browser PASS.
Remaining requirement: isolated local/test credentials + running
`LEARNING_E2E_BASE_URL`, then `npm run test:learning-e2e:live`.

## Safety

- Fail closed on missing env
- No secret logging
- No Commerce / Collaboration / AI Platform / migrations
- Prefer local/test; prod requires explicit allow
- No production mutation in this tooling close
