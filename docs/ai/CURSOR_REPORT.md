# Cursor Report — dependency patch + CSP report-only

## Summary

Same-major security dependency patch plus `Content-Security-Policy-Report-Only` on `chore/deps-csp-v1` from `origin/release/v1` @ `899635099b58a04fc6c648c163926f16cd49fee7`. Next 16.2.11 → 16.3.5 (latest 16.x; no 16.2.x patched release exists). Transitive `nanoid`, `postcss`, and `sharp` moved to patched same-major versions. Proxy (`proxy.ts`) emits report-only CSP with a per-request nonce, `report-uri`, `Report-To`, and `Reporting-Endpoints`. `/api/csp-report` accepts POSTs, is rate-limited and size-capped, logs a compact line, returns 204, and never writes to the DB. No enforcing `Content-Security-Policy`. No SQL. Not deployed.

## Exact files changed

- `package.json`
- `package-lock.json`
- `proxy.ts`
- `lib/security/actionRateLimit.ts`
- `lib/security/actionRateLimit.test.ts`
- `lib/security/cspPolicy.ts` (new)
- `lib/security/cspPolicy.test.ts` (new)
- `lib/security/cspReport.ts` (new)
- `lib/security/cspReport.test.ts` (new)
- `app/api/csp-report/route.ts` (new)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

none

## Security review

- No SQL, no `supabase db push`, no deploy, no secrets/`.env` reads or writes.
- No enforcing `Content-Security-Policy` header. Response helper deletes that header if present and sets `Content-Security-Policy-Report-Only` only.
- Request-only `Content-Security-Policy` + `x-nonce` is set so Next can stamp script nonces. That header is stripped from the browser response.
- CSP report endpoint: `consumeNamedActionRateLimit("cspReport")`, 8 KiB body cap, 204, console log of directive / blocked host / page path only (no query strings, no DB).
- Report endpoint itself does not receive report-only headers.
- External origins are derived at runtime from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_LIVEKIT_URL` / `LIVEKIT_URL` (origin only). This worktree had no public env, so the measured local header has `'self'` only for connect/img/media extras.
- `next/font/google` (Geist) is self-hosted at build time; Google Fonts CDN was not added.
- `mapbox-gl` and `react-globe.gl` are unused in app source; not added.
- Earth textures and create-flow previews use `'self'` / `blob:`.
- `frame-ancestors 'none'` (report-only). Live nginx still has `X-Frame-Options: SAMEORIGIN`.

## Tests

Related vitest (PASS):

- `lib/security/actionRateLimit.test.ts` (6)
- `lib/security/cspPolicy.test.ts` (11)
- `lib/security/cspReport.test.ts` (7)

## TypeScript

`npx tsc --noEmit` — PASS

## Build

`npm run build` — PASS (Next.js 16.3.5)

## git diff --check

PASS (no whitespace errors)

## git status --short

See commit on `chore/deps-csp-v1` after this report is committed.

## ESLint (edited files)

`npx eslint` on `proxy.ts`, `lib/security/cspPolicy.ts`, `lib/security/cspReport.ts`, `lib/security/actionRateLimit.ts`, `app/api/csp-report/route.ts`, and their tests — PASS, 0 findings. No new issues; no pre-existing findings on these files.

## npm audit --omit=dev

### Before (16.2.11)

| Severity | Package | Advisory |
| --- | --- | --- |
| critical | next 16.2.11 | Windows-host RCE; Image Optimization AVIF RCE (GHSA-p293-qw3h-jr36, GHSA-2xp9-vwfh-vxw4). Production is Linux. |
| high | nanoid <=3.3.17 | Non-secure / custom generator infinite loop |
| high | postcss <=8.5.22 | CSS stringify XSS / sourceMappingURL file read (nested 8.4.31 under next) |
| high | sharp <=0.35.4-rc.0 | libvips / libheif (0.34.5) |
| moderate | baseline-browser-mapping | DoS on invalid input |
| moderate | fflate 0.6.x (three-stdlib) | ZIP64 unzip loop |

### After (16.3.5)

| Severity | Package | Status / reason |
| --- | --- | --- |
| critical | next | **Gone.** 16.3.5 is outside the vulnerable range (through 16.3.2). |
| high | nanoid / postcss / sharp | **Gone.** 3.3.19 / 8.5.23 / 0.35.4. |
| moderate | baseline-browser-mapping >=2.0.0 <2.11.0 | Left in place. Not high/critical. Transitive. Same-major fix is 2.11.0 via `npm audit fix` (not applied). |
| moderate | fflate 0.6.0–0.6.10 | Left in place. Nested under `three-stdlib`. Not high/critical. |

Full `npm audit` (includes dev) still lists high on `brace-expansion`, `browserslist`, `js-yaml`, `playwright`. Those are **devDependencies** and do not appear in `--omit=dev`. Vitest 5 would be a major bump; not done.

No remaining high/critical `--omit=dev` advisory requires a major bump.

## Package version deltas

Direct:

| Package | Before | After |
| --- | --- | --- |
| next | 16.2.11 | 16.3.5 |
| eslint-config-next | 16.2.11 | 16.3.5 |

Transitive (security-relevant):

| Package | Before | After |
| --- | --- | --- |
| nanoid | 3.3.15 | 3.3.19 |
| postcss (top-level) | 8.5.16 | 8.5.23 |
| next/node_modules/postcss | 8.4.31 | removed (next uses patched postcss) |
| sharp | 0.34.5 | 0.35.4 |

16.2.11 → 16.3.5 is a same-major minor. Required: advisory range is `9.3.4-canary.0 – 16.3.2`; 16.2.12 remains vulnerable.

## Local production header check

`next start` on `127.0.0.1:50469` (stopped after measurement). All five routes returned HTML 200 with report-only CSP and **no** enforcing CSP.

| Route | Status | HTML | Report-Only | Enforcing CSP |
| --- | --- | --- | --- | --- |
| `/` | 200 | yes (49645) | yes | none |
| `/watch` | 200 | yes (30417) | yes | none |
| `/life` | 200 | yes (42179) | yes | none |
| `/learning` | 200 | yes (226358) | yes | none |
| `/store` | 200 | yes (78567) | yes | none |

Exact `Content-Security-Policy-Report-Only` from local prod `GET /` (nonce is per-request; this is the captured value):

```
default-src 'self'; script-src 'self' 'nonce-Zjg1MTRlMGItMDVlYS00ZjZhLTljOWItYzc5YjRhMzFjM2Vm' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; report-uri /api/csp-report; report-to csp-endpoint
```

Also on that response:

- `Reporting-Endpoints: csp-endpoint="/api/csp-report"`
- `Report-To: {"group":"csp-endpoint","max_age":10886400,"endpoints":[{"url":"http://localhost:50469/api/csp-report"}]}`

A follow-up `GET /` HTML included the matching `nonce` on 23 script tags. `POST /api/csp-report` returned 204 with neither CSP header.

## Uncertainties

- This worktree had no `.env.local` / `NEXT_PUBLIC_SUPABASE_URL`. The measured header therefore has no Supabase or LiveKit origins. Runtime derivation is implemented; production `next start` will add `https://<project>` and `wss://<project>` when those public vars are set. Origins are never logged.
- `style-src` allows `'unsafe-inline'` because the app uses React `style={{}}` attributes. Script policy uses nonce + `'strict-dynamic'`.
- `Report-To` uses the incoming request origin. Behind nginx, that should be the public host if `Host` is forwarded.
- Live nginx still owns HSTS / XFO / nosniff / Referrer-Policy / Permissions-Policy. This change only adds report-only CSP from Next.
- Remaining `--omit=dev` moderates were not patched.

## Open issues

- Flip report-only to enforcing CSP only after production report noise is reviewed.
- Optional same-major follow-up for `baseline-browser-mapping` 2.11+ and nested `fflate`.
- Dev-only highs (playwright, js-yaml, browserslist, brace-expansion) are outside `--omit=dev`.
