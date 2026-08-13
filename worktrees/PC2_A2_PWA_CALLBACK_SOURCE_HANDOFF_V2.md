# PC2-A2 — PWA_CALLBACK_SOURCE_HANDOFF_V2

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = INDEPENDENT_RELEASE_QA / PLATFORM_CORE
AGENT_ID = PC2-A2
WAVE_ID = PC2_FINAL_EXECUTION_STANDBY_MOBILE_V3
TASK_ID = PC2_PWA_CALLBACK_SOURCE_HANDOFF_V2
REPORT_TYPE = PWA_CALLBACK_SOURCE_HANDOFF
TIMESTAMP_LOCAL = 2026-08-12 16:12 +03
FEATURE_DEVELOPMENT = FORBIDDEN (honored)
COMMIT_CREATED = NO
PUSHED = NO
SECRET_VALUES_PRINTED = NO
PRODUCTION_DEPLOY = NOT_ATTEMPTED
MOBILE_BLOCKS_CURRENT_WEB_PLATFORM_RELEASE = NO
LB003_SWITCH = NOT_TRIGGERED
```

Prior closeout lead (revalidated this turn): `worktrees/PC2_PWA_AUTH_CALLBACK_PRODUCTION_CLOSEOUT_V1.md`  
Canonical narrative companion: `docs/ai/CURSOR_REPORT.md` (updated for this handoff).

---

## Machine stamps (return contract)

```text
PWA_FIX_WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1
PWA_FIX_BRANCH = office/platform-translation-trunk-port-v1
PWA_FIX_BASE_SHA = 1c5ae0bd0266029f264cab866744c7fcde25cc2e
PWA_FIX_CURRENT_HEAD = 1c5ae0bd0266029f264cab866744c7fcde25cc2e
PWA_FIX_COMMITTED = NO
PWA_FIX_COMMIT_SHA = N/A
PWA_FIX_PUSHED = NO
PWA_SOURCE_HANDOFF_READY = YES
PWA_FIX_STILL_CLEAN = YES
PWA_TESTS = PASS (47/47)
PWA_TSC = PASS
AUTH_CALLBACK_CORRECTED = YES
AUTH_GATE_REGRESSION = NO
LIVE_PRODUCTION_AUTH_CALLBACK_LOCALHOST = YES (undeployed; source-level only)
POST_DEPLOY_AUTH_SMOKE = PENDING_OPERATOR_DEPLOY
```

Notes:
- `BASE_SHA` == `CURRENT_HEAD` because the correction is **uncommitted working-tree** on a branch that tracks remote at `0 ahead / 0 behind`.
- Commit/push intentionally withheld (UMTUBA PC2 hard prohibition; not clearly authorized in this task message).

---

## Working-state inventory

| Field | Value |
| --- | --- |
| Worktree | `C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1` |
| Branch | `office/platform-translation-trunk-port-v1` |
| Upstream | `origin/office/platform-translation-trunk-port-v1` (ff-only sync: `0	0`) |
| Base / HEAD SHA | `1c5ae0bd0266029f264cab866744c7fcde25cc2e` |
| `git fetch --prune` | OK (this turn) |
| Fix form | Uncommitted source correction + tests (not a tip commit) |

### Exact files for Central integration (code only)

```text
INTEGRATION_FILES = [
  app/auth/callback/route.ts,
  lib/site/siteUrl.ts,
  lib/site/siteUrl.test.ts,
  lib/supabase/authSession.harden.test.ts
]
```

### Supporting PC2 evidence (do **not** require Central product merge)

```text
EVIDENCE_ONLY = [
  docs/ai/CURSOR_REPORT.md,
  worktrees/PC2_PWA_AUTH_CALLBACK_PRODUCTION_CLOSEOUT_V1.md,
  worktrees/PC2_A2_PWA_CALLBACK_SOURCE_HANDOFF_V2.md
]
```

### Explicitly excluded from this handoff bundle

Workspace also contains unrelated untracked logs/scripts/other worktree artifacts (`_a2_*`, `_pc2_a1_*`, `_lb002_*`, other `worktrees/PC2_*` reports). **Do not stage or cherry-pick those** with this callback fix.

---

## Diff summary (legitimate closeout only)

```text
DIFF_SCOPE_CHECK = PASS
UNRELATED_BUNDLING = NO

git diff --stat (integration files only):
 app/auth/callback/route.ts              |  5 +++-
 lib/site/siteUrl.test.ts                | 46 +++++++++++++++++++++++++++++++
 lib/site/siteUrl.ts                     | 49 +++++++++++++++++++++++++++++++++
 lib/supabase/authSession.harden.test.ts |  2 ++
 4 files changed, 101 insertions(+), 1 deletion(-)

BEHAVIOR:
- route.ts: origin = resolveAuthRedirectOrigin(requestOrigin) instead of raw request.url origin
- siteUrl.ts: add resolveAuthRedirectOrigin + isLoopbackHostname
  * public Host → keep request origin
  * loopback Host + public getSiteUrl() → public origin (prod/staging behind nginx→localhost)
  * loopback Host + loopback getSiteUrl() → keep request origin (dev ports)
- tests: prod loopback→public; staging public preserved; intentional local loopback preserved;
  harden contract asserts helper wired and no localhost:3001 literal in callback route
```

`git diff --check` on integration + report files: **PASS** (exit 0).

---

## Revalidation this turn

```text
TEST_COMMANDS =
  npx vitest run lib/site/siteUrl.test.ts lib/supabase/authSession.harden.test.ts lib/supabase/passwordReset.test.ts lib/env/supabasePublic.test.ts
  npx tsc --noEmit
  git diff --check -- <integration files + CURSOR_REPORT>

TEST_RESULTS =
  vitest: 4 files / 47 tests PASSED
  tsc --noEmit: PASS (exit 0)
  git diff --check: PASS (exit 0)

PWA_FIX_STILL_CLEAN = YES
AUTH_GATE_REGRESSION = NO
DEV_LOCALHOST_PRESERVED = YES
```

---

## Central integration instruction

```text
INTEGRATION_MODE = SOURCE_HANDOFF (uncommitted clean patchset)
DO_NOT_COMMIT_FROM_PC2 = YES (already honored)
DO_NOT_PUSH_FROM_PC2 = YES (already honored)
DO_NOT_DEPLOY_FROM_PC2 = YES

RECOMMENDED_CENTRAL_STEPS =
  1. Take INTEGRATION_FILES only from this worktree at BASE_SHA 1c5ae0b + working-tree diffs above
     (or cherry-pick equivalent patch onto the authorized release branch).
  2. Exclude EVIDENCE_ONLY docs/artifacts and all unrelated untracked PC2 artifacts.
  3. On Central branch: re-run the same vitest set + tsc --noEmit.
  4. Commit/push ONLY from authorized Central/operator flow (not PC2).
  5. Operator deploy to production (and staging if desired).
  6. Run POST_DEPLOY verification below; stamp smoke PASS only when live Location is non-loopback.
```

Patch intent one-liner for Central commit message (if Central authorizes commit):

> fix(auth): resolve auth-callback redirect origin when proxy Host is loopback

---

## Post-deploy verification (operator)

After production deploy of the four integration files:

```text
PROBES =
  GET https://umtuba.com/auth/callback
  GET https://umtuba.com/auth/callback?code=probe
  (optional) GET https://staging.umtuba.com/auth/callback

PASS_CRITERIA =
  LIVE_PRODUCTION_AUTH_CALLBACK_LOCALHOST = NO
  → Location host must NOT be localhost / 127.0.0.1 / ::1
  → Expected public hosts: umtuba.com (prod) / staging.umtuba.com (staging)
  POST_DEPLOY_AUTH_SMOKE = PASS only when both prod probes redirect to public origin login/forgot paths

CURRENT_LIVE_PRE_DEPLOY (prior closeout, still expected until deploy) =
  LIVE_PRODUCTION_AUTH_CALLBACK_LOCALHOST = YES
  (307 → https://localhost:3001/login?…)
```

PC2 does **not** perform production deploy in this task.

---

## LB003 watch (checkpoint)

```text
AUTHORIZED_FIXTURES_CURRENTLY_AVAILABLE = NO (A1 fixture check: PRIORITY_SWITCH_FIRED=NO)
LB003_SWITCH = NOT_TRIGGERED
LB003_EXECUTED = NO
ACTION = continue handoff completion; no priority stop required
```

---

## Final stamps

```text
PWA_FIX_COMMITTED = NO
PWA_FIX_COMMIT_SHA = N/A
PWA_FIX_PUSHED = NO
PWA_SOURCE_HANDOFF_READY = YES
PWA_FIX_STILL_CLEAN = YES
WHOLE_PROJECT_PRODUCTION_READY = NO
PWA_PRODUCTION_READY = NO
MOBILE_BLOCKS_CURRENT_WEB_PLATFORM_RELEASE = NO
OPERATOR_DEPLOY_REQUIRED_FOR_LIVE_AUTH_CALLBACK = YES
```

END PC2_A2_PWA_CALLBACK_SOURCE_HANDOFF_V2
