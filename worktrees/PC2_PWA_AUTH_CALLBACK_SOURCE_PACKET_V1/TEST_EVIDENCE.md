# TEST_EVIDENCE.md — PC2_PWA_AUTH_CALLBACK_SOURCE_PACKET_V1

```text
SOURCE_SHA = 1c5ae0bd0266029f264cab866744c7fcde25cc2e
PATCH_STATUS = UNCOMMITTED
SECRET_VALUES_PRINTED = NO
AUTH_CALLBACK_CORRECTED = YES
AUTH_GATE_REGRESSION = NO
```

## Commands (this delivery turn)

```text
npx vitest run \
  lib/site/siteUrl.test.ts \
  lib/supabase/authSession.harden.test.ts \
  lib/supabase/passwordReset.test.ts \
  lib/env/supabasePublic.test.ts

npx tsc --noEmit

git diff --check -- \
  app/auth/callback/route.ts \
  lib/site/siteUrl.ts \
  lib/site/siteUrl.test.ts \
  lib/supabase/authSession.harden.test.ts
```

## Results

```text
VITEST =
  Test Files  4 passed (4)
  Tests       47 passed (47)
  Duration    ~900ms
  EXIT        0

TSC =
  npx tsc --noEmit → PASS (exit 0)
  NOTE: Local packet file mirrors under worktrees/ use *.ts.source so they
  are not typechecked as project sources. Application integration files only.

GIT_DIFF_CHECK =
  PASS (exit 0) on FILES_INCLUDED

PWA_TESTS = PASS (47/47)
PWA_TSC = PASS
AUTH_GATE_REGRESSION = NO
DEV_LOCALHOST_PRESERVED = YES (covered by siteUrl tests)
```

## Scope check

```text
DIFF_SCOPE_CHECK = PASS
UNRELATED_BUNDLING = NO
FILES_IN_DIFF =
  app/auth/callback/route.ts
  lib/site/siteUrl.ts
  lib/site/siteUrl.test.ts
  lib/supabase/authSession.harden.test.ts

git diff --stat (integration files only):
 app/auth/callback/route.ts              |  5 +++-
 lib/site/siteUrl.test.ts                | 46 +++++++++++++++++++++++++++++++
 lib/site/siteUrl.ts                     | 49 +++++++++++++++++++++++++++++++++
 lib/supabase/authSession.harden.test.ts |  2 ++
 4 files changed, 101 insertions(+), 1 deletion(-)
```

## Live production (context only — not claimed fixed by this packet)

```text
LIVE_PRODUCTION_AUTH_CALLBACK_LOCALHOST = YES (undeployed; source-level only)
POST_DEPLOY_AUTH_SMOKE = PENDING_OPERATOR_DEPLOY
OPERATOR_DEPLOY_REQUIRED_FOR_LIVE_AUTH_CALLBACK = YES
```

No secrets, tokens, passwords, or `.env` contents included in this evidence.

END TEST_EVIDENCE
