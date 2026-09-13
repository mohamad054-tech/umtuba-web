# CURSOR_REPORT — DESKTOP_UMTUBA_PRODUCTION_HOME_SUPABASE_ENV_P0_RELEASE_V1

## Summary

Central authorized same-SHA production rebuild. Live source `b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c` was rebuilt with `/etc/umtuba/production/umtuba.env` sourced **before** `npm run build`. Client-chunk inlining was proven **before** switch. `current` now points at `/opt/umtuba/production/releases/b2c0bbd1-20260829074010`. Home stays loaded after hydration; the `Supabase URL is not configured.` throw is gone. Watch, Welcome, Learning, and Store are reachable. No source/code change. Brand candidate not deployed. Previous release `b2c0bbd1-20260825100900` kept for rollback.

```
TASK_ID = DESKTOP_UMTUBA_PRODUCTION_HOME_SUPABASE_ENV_P0_RELEASE_V1
STATUS = COMPLETE
SOURCE_SHA = b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c
SOURCE_SHA_VERIFIED = YES
PRODUCTION_PUBLIC_ENV_PRESENT_AT_BUILD = YES
NEXT_PUBLIC_SUPABASE_URL_PRESENT = YES
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_PRESENT = YES
NEXT_PUBLIC_SUPABASE_ANON_KEY_PRESENT = NO
PUBLIC_URL_INLINED_IN_CLIENT_BUNDLE = YES
INLINED_URL_ASSIGN = YES
HTTPS_SUPABASE_HOST_IN_CHUNKS = YES
INLINED_PUBLISHABLE_KEY_ASSIGN = YES
BUILD = PASS
BUILD_ID = lf7DzFya-5ZZaNA70KL-T
PRODUCTION_DEPLOYED = YES
LIVE_RELEASE = /opt/umtuba/production/releases/b2c0bbd1-20260829074010
LIVE_SOURCE_SHA = b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c
ROLLBACK_TARGET = /opt/umtuba/production/releases/b2c0bbd1-20260825100900
POST_DEPLOY_HOME = PASS
NEXT_ERROR_GONE = YES
WATCH_SMOKE = PASS
WELCOME_SMOKE = PASS
LEARNING_SMOKE = PASS
STORE_SMOKE = PASS
BRAND_CANDIDATE_DEPLOYED = NO
BRAND_CANDIDATE_UNCHANGED = YES
CODE_CHANGED = NO
GLOBE_CHANGED = NO
POST_VIDEO_BEHAVIOR_CHANGED = NO
DATABASE_TOUCHED = NO
PAYMENTS_TOUCHED = NO
BLOCKERS = NONE
NOTES = ANON_KEY absent as before; house key is PUBLISHABLE_KEY and was inlined. Watch showed a pre-existing minified React #418 hydration warning; no Supabase throw; page rendered. Welcome still shows Alpha 0.2 (brand not live).
```

## Release execution (2026-08-29)

Followed `docs/DEVELOPMENT_WORKFLOW.md` plus the existing host analog (`host-build-release.sh` / `host-switch-release.sh`). No invented process. No product files changed.

1. Verified live `current` was `b2c0bbd1-20260825100900` / `GIT_SHA=b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c`.
2. Copied that exact tree to `b2c0bbd1-20260829074010` excluding `.next`.
3. `npm ci --include=dev` PASS.
4. Sourced `umtuba.env` (values never printed). URL PRESENT=YES. PUBLISHABLE_KEY PRESENT=YES. ANON_KEY PRESENT=NO. Did not invent ANON_KEY.
5. `npm run build` PASS. `BUILD_ID=lf7DzFya-5ZZaNA70KL-T`. Logs: `/opt/umtuba/production/logs/npm-ci-b2c0bbd1-20260829074010.log`, `npm-build-b2c0bbd1-20260829074010.log`.
6. Pre-switch inline gate: `INLINED_URL_ASSIGN=YES`, `HTTPS_SUPABASE_HOST_IN_CHUNKS=YES`, `INLINED_PUBLISHABLE_KEY_ASSIGN=YES`. Host redacted as `*.supabase.co`.
7. Re-checked inline gate, then `ln -sfn` + `systemctl restart umtuba-production`. `healthz` 200 `umtuba-production-ok`.
8. Playwright post-deploy: `/` and `/?hl=en` stay on the Home feed after ~5s; no `__next_error__`; no `Supabase URL is not configured.` `/watch`, `/welcome`, `/learning`, `/store` HTTP 200 and rendered.
9. Live SHA reconfirmed `b2c0bbd`. Brand worktree still `b5fbeff`. Parent still `office/profile-hero-completeness-v1` @ `380a366`.

Evidence: `docs/ops/production-home-supabase-env-p0-v1/post-deploy-smoke.json`, `screenshots-post-deploy/`.

---

# PRIOR — DESKTOP_UMTUBA_PRODUCTION_HOME_SUPABASE_ENV_P0_V1 (diagnosis)

## Summary

Diagnose + prepare exact P0 remediation. At diagnosis time: no deploy. No push. No remote migrations. No product code change. Parent dirty checkout and frozen brand candidate left untouched. Superceded as LAST ASSIGNED by the release GO above.

Live Home SSR is 200, then the browser throws `Error: Supabase URL is not configured.` (`requireSupabasePublicEnv` → `createClient` → `DiscoverActionRail` `post-counters` `useEffect`). `/welcome` does not throw. The live client bundle has **no** inlined `NEXT_PUBLIC_SUPABASE_URL`. Host runtime env **does** have the public key **names** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) via systemd `EnvironmentFile`, so Node/`next start` can SSR. Almost every prior host release inlined the public URL at build time. Live `b2c0bbd` did not, and it has **no** `npm-build-b2c0bbd*` log.

Smallest correct fix: **same-SHA production rebuild with `umtuba.env` sourced before `npm run build`**, then verify inlining before switching `current`. Do **not** change Discover/Home behavior. Do **not** use `tryCreateClient` as the primary fix. Do **not** rotate credentials. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is not required; the host already has the canonical publishable key name.

```
TASK_ID = DESKTOP_UMTUBA_PRODUCTION_HOME_SUPABASE_ENV_P0_V1
STATUS = COMPLETE_REMEDIATION_PREPARED
ERROR_REPRODUCED = YES
NEXT_ERROR_DIGEST = NONE_CLIENT_THROW
ROOT_CAUSE_CONFIRMED = YES
ROOT_CAUSE = LIVE_B2C0BBD_CLIENT_BUNDLE_BUILT_WITHOUT_INLINED_NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_URL_BUILD_TIME_PRESENT = NO
NEXT_PUBLIC_SUPABASE_ANON_KEY_BUILD_TIME_PRESENT = NO
PRODUCTION_ENV_SOURCE = /etc/umtuba/production/umtuba.env (systemd EnvironmentFile for next start; documented build path sources the same file before npm run build; live b2c0bbd has no npm-build log)
SECRET_EXPOSURE_FOUND = NO
LAST_KNOWN_GOOD_COMPARISON = Prior host releases db1b6bad / 92992786 / a29a329d / 6d1a2b45 INLINED_URL_ASSIGN=YES; live b2c0bbd INLINED_URL_ASSIGN=NO
CODE_CHANGE_REQUIRED = NO
ENV_REBUILD_ONLY_REQUIRED = YES
MINIMAL_REMEDIATION = Same-SHA host rebuild of b2c0bbd with umtuba.env sourced at next build; verify client-chunk URL inlining; then switch current. No Discover behavior change. No credential rotation.
REMEDIATION_PREPARED = YES
REMEDIATION_SHA = NONE
TYPECHECK = NOT_RUN_NO_CODE_CHANGE
FOCUSED_TESTS = NOT_RUN_NO_CODE_CHANGE
BUILD = NOT_RUN_NO_CODE_CHANGE
BRAND_CANDIDATE_UNCHANGED = YES
GLOBE_CHANGED = NO
POST_VIDEO_BEHAVIOR_CHANGED = NO
DATABASE_TOUCHED = NO
PAYMENTS_TOUCHED = NO
DEPLOYED = NO
SAFE_FOR_CENTRAL_P0_RELEASE_GO = YES
BLOCKERS = NO_DEPLOY_AUTHORIZED; CURRENT_RELEASE_HAS_NO_HOST_BUILD_LOG
WORKTREE = C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-UMTUBA-PRODUCTION-HOME-SUPABASE-ENV-P0-V1
BRANCH = desktop/umtuba-production-home-supabase-env-p0-v1
```

## Exact files changed

Isolated P0 worktree only. Parent `office/profile-hero-completeness-v1` @ `380a366` not reset, cleaned, stashed, or edited. Brand worktree `CENTRAL-UMTUBA-BRAND-REBASE-SAFETY-V1` @ `b5fbeff` not modified.

- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md` (this packet)
- `docs/ops/production-home-supabase-env-p0-v1/` (inspect scripts, Playwright capture, screenshots, operator steps, host compare flags)

No product/runtime source changed.

## Migrations created

None.

## Security review

- Production env **values** were not printed. Host inspect listed key **names** and nonempty/length-bucket flags only.
- Canonical public names present in `umtuba.env` and in the running `next start` process: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` name is **absent** from `umtuba.env`. That is expected: `.env.example` treats it as an optional alias.
- No service-role key name was printed from the env file listing used for this GO. Service-role values were never requested.
- Live JS chunks were classified with booleans only; downloaded chunk/HTML copies were deleted after classification.
- SSH was read-only. `_port_extract` not touched. Windows Desktop not used as artifact destination.

## Tests

Not run. No product code changed.

## TypeScript

Not run. No product TypeScript changed.

## Build

Not run. No UI/entry implementation. Remediation is host env/rebuild of the already-live SHA.

## git diff --check

Not applicable for product diffs. Worktree has docs-only uncommitted changes.

## git status --short

Parent (untouched): remains dirty `office/profile-hero-completeness-v1` @ `380a36646d4de8a37c39a56ac3ccd449f6d8b20d`.

P0 worktree `desktop/umtuba-production-home-supabase-env-p0-v1` @ `b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c`:

```
 M docs/ai/CURRENT_TASK.md
 M docs/ai/CURSOR_REPORT.md
?? docs/ops/production-home-supabase-env-p0-v1/
```

No commit. No push.

## Open issues

1. **Do not deploy from this GO.** Operator steps are prepared only.
2. Brand SHA `b5fbeff29cb0f308481b38c06500c572cd44a9c4` is **not** live and was **not** touched. Live `/welcome` still shows “Alpha 0.2 · Built for a new generation”. Brand did not cause this.
3. Unused later host dir `a1dc8fe3-20260825122639` has `INLINED_URL_ASSIGN=YES` but is **not** current. Do not switch to it without Central identifying that tree’s source SHA.
4. `tryCreateClient` remains the documented fail-closed helper for some public chrome (`AppMobileBottomNav` already catches). It is **not** the authorized primary fix while the live artifact simply lacks build-time public env.

---

## Live reproduction (re-proved 2026-08-29)

Playwright (parent `playwright`) against live HTTPS. Cursor browser MCP could not keep a tab.

| URL | HTTP | After ~4.5s | pageerror |
| --- | --- | --- | --- |
| `https://umtuba.com/` | 200 | `__next_error__` “This page couldn’t load” | `Supabase URL is not configured.` |
| `https://umtuba.com/welcome` | 200 | Welcome remains | none |
| `https://umtuba.com/?hl=en` | 200 | same error UI | same throw |
| `https://umtuba.com/?hl=ar` | 200 | same error UI | same throw |
| `https://umtuba.com/healthz` | 200 | `umtuba-production-ok` | n/a |

`NEXT_ERROR_DIGEST` is absent because this is a **browser throw**, not a server digest.

Browser stack (live chunks, same as prior P0 diagnosis):

```
Error: Supabase URL is not configured.
    at sa (…/_next/static/chunks/0ztghknfw-iyv.js)   // requireSupabasePublicEnv
    at so (…/_next/static/chunks/0ztghknfw-iyv.js)   // createClient
    at …/_next/static/chunks/14r5yx8u_5qpq.js        // DiscoverActionRail post-counters
```

Caller chunk contains `post-counters`. That is `app/discover/components/DiscoverActionRail.tsx` `useEffect` → strict `createClient()`.

Welcome stays up because it does not mount that rail. `AppMobileBottomNav` wraps `createClient()` in try/catch.

Screenshots: `docs/ops/production-home-supabase-env-p0-v1/screenshots/`.

## Root cause

Classification of live env chunk `0ztghknfw-iyv.js`:

- `INLINED_NEXT_PUBLIC_SUPABASE_URL = NO`
- `INLINED_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = NO`
- `INLINED_NEXT_PUBLIC_SUPABASE_ANON_KEY = NO`
- `PROCESS_ENV_RUNTIME_SHAPE = YES`
- `httpsSupabaseHostLiteralCount = 0`

So the browser compiles `getSupabasePublicEnvResult()` as a runtime `process.env` read. In the client bundle that is empty → `missing_url` → throw.

This is **not** “runtime env missing on the host”:

- systemd `EnvironmentFile=/etc/umtuba/production/umtuba.env` (mode 600)
- Running `next start` process has names `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Those names are nonempty (length bucket ≥ 20). Values not printed.

This is **build-time public env absent from the live `.next` artifact**. `NEXT_PUBLIC_*` must be present at `next build` to be inlined. Runtime `EnvironmentFile` is enough for SSR (Home first paint / RSC 200) and not enough for this client factory.

Current release has **no** `.env`, `.env.local`, or `.env.production` inside the tree. It has **no** `npm-build-b2c0bbd*` log. The documented host build analog sources `umtuba.env` before `npm run build`; that path was not used for the live artifact (or the env was not in the build environment).

Code does **not** incorrectly require `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Canonical names in `lib/env/supabasePublic.ts` / `.env.example` are `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Last known-good comparison

Host `/opt/umtuba/production/releases/*` client chunks were scanned for an inlined `NEXT_PUBLIC_SUPABASE_URL:"https` assignment (matches counted/flagged only; values not printed).

- **Almost all prior releases = YES**, including documented Learning/Store-era builds `db1b6bad`, `92992786`, `a29a329d`, `6d1a2b45`.
- **Live `b2c0bbd1-20260825100900` = NO.**
- Only other `NO` hits found: `0b6d35bd-20260819011723`, `5ed6cc85-20260817135500` (historical, not current).
- Unused later dir `a1dc8fe3-20260825122639` = YES, **not current**. Do not switch to it from this GO.

Conclusion: this codebase + Turbopack **does** inline the public URL when the env is present at build. Live `b2c0bbd` is the production outlier. Env/rebuild-alone can make Home safe. A fail-closed `tryCreateClient` change is **not** required and is **not** authorized as the primary fix.

## Production path (Hetzner, not Vercel)

- Public host: nginx → `umtuba-production.service` → `npx next start --hostname 127.0.0.1 --port 3001`
- `WorkingDirectory=/opt/umtuba/production/current`
- `EnvironmentFile=/etc/umtuba/production/umtuba.env`
- Current: `/opt/umtuba/production/releases/b2c0bbd1-20260825100900`
- `GIT_SHA` / `LIVE_SOURCE_SHA` = `b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c`
- `.next/BUILD_ID` = `ABYwFtdYx3j36zI0JpEvW`
- Documented build analog: `docs/ops/learning-staged-production-deploy-v1/host-build-release.sh` (source `umtuba.env`, then `npm run build`)

## Minimal remediation (prepared, not applied)

See `docs/ops/production-home-supabase-env-p0-v1/OPERATOR_SAME_SHA_ENV_REBUILD.md`.

1. New release directory from exact SHA `b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c`.
2. `npm ci --include=dev`.
3. Source `/etc/umtuba/production/umtuba.env` (do not print).
4. `NODE_ENV=production npm run build`.
5. Gate: `INLINED_URL_ASSIGN=YES` on the **new** tree’s client chunks. If NO, stop.
6. Only then `ln -sfn` + `systemctl restart umtuba-production`.
7. Keep `b2c0bbd1-20260825100900` for rollback.
8. Retest `/`, `/?hl=en`, `/?hl=ar`, `/welcome`, `/healthz`.

Do not change Discover counters, Globe, posts/videos, Learning, Store, auth, DB, or payments. Do not rebuild/switch brand `b5fbeff`.
