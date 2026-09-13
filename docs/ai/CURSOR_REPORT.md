# Cursor report — UMTUBA_OWNER_FULL_AUDIT_REPORT_V1

## Summary

Read-only owner audit completed from checkout `pc2/umtuba-communications-v1-part1b-identity-discovery`. Application source, catalog, secrets, deploy, commit, and push were not touched. Findings are written for the owner to upload elsewhere and prioritize fixes.

Primary deliverable: `docs/AUDIT_REPORT.md` (sections 1–7) and `docs/AUDIT_REPORT_2.md` (sections 8–14 + appendix). No secret/token values were copied from `.env.local` or other env files.

## Exact files changed

- `docs/ai/CURRENT_TASK.md` — task id set to this audit
- `docs/AUDIT_REPORT.md` — created
- `docs/AUDIT_REPORT_2.md` — created
- `docs/ai/CURSOR_REPORT.md` — this file

## Migrations created

None.

## Security review

- Did not read `.env.local` / `.env.local.hosted.bak`.
- Report lists **env names only**.
- Flagged: public `USING (true)` RLS, service-role in media workers (server scripts), npm audit production vulns, live vs repo drift, missing legal routes, CJ rotation note (name only).

## Tests

Not run (read-only audit; out of allowed scope to change code). Existing tree: 340 Vitest files; no CI job runs them.

## TypeScript

Not run (`tsc --noEmit`). `tsconfig.json` has `strict: true`; `noUncheckedIndexedAccess` absent.

## Build

`npm run build` **not completed** in the audit window. Status: UNKNOWN.

## git diff --check

Not required for docs-only report; no commit.

## git status --short

Working tree was already dirty (**272** paths before this report). This task added/updated only the four docs files above.

## Open issues

See `docs/AUDIT_REPORT_2.md` Section 13 (top 20) and Section 14 (open questions). Highest: production ≠ this checkout; npm audit critical/high; legal surface gaps; empty video captions; hardcoded Worldwide; demo Learning covers on live site.
