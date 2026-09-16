# Current Task

## Task title

CHORE_DEPS_CSP_V1

## Status

Implement UMTUBA dependency security patch (same-major only) plus Content-Security-Policy-Report-Only. No SQL. Not deployed.

```
TASK_ID = CHORE_DEPS_CSP_V1
STATUS = COMPLETE
DATE = 2026-09-16
BRANCH = chore/deps-csp-v1
WORKTREE = D:\umtuba-central\repos\umtuba-web-deps-csp-v1
BASE = origin/release/v1 @ 899635099b58a04fc6c648c163926f16cd49fee7
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
DEPLOY = FORBIDDEN
```

Audit source: `docs/audit/SITE_AUDIT_2026-09-15.md` SEC-01 / SEC-16 / SEC-06 (file lives on docs/site-audit branch; findings copied into this task).

### Findings to fix

- **SEC-01:** Next.js critical advisory (only exploitable on Windows hosts with the AVIF image optimizer; production is Linux). Patch Next 16.x to latest same-major patch if available.
- **SEC-16:** high advisories in nanoid, postcss, sharp. Patch within the same major only.
- **SEC-06:** no Content-Security-Policy header (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy already present). Add report-only CSP only — never an enforcing `Content-Security-Policy`.

### Allowed scope

- Same-major dependency patches via `npm install` (keep `package-lock.json`; no lockfile delete).
- CSP Report-Only header on HTML routes via existing security-header path (middleware / proxy / next.config).
- `/api/csp-report` (or equivalent) rate-limited with `actionRateLimit`, size-capped, 204, no DB writes.
- Related tests and handoff docs (`CURRENT_TASK.md`, `CURSOR_REPORT.md`).

### Forbidden scope

- Do not apply SQL or run `supabase db push`.
- Do not deploy.
- Do not force-push, rebase, hard-reset.
- Do not expose secrets / `.env`.
- Do not add an enforcing `Content-Security-Policy` header.
- Do not bump any package major version.
- Do not commit onto `release/v1`.
- Do not reuse dirty sibling worktrees.
- Do not junction `node_modules`.
- Do not delete `package-lock.json`.
