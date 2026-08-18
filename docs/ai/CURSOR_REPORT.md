# CURSOR_REPORT — Pre-Company Owned Content Pilot V1

```text
SOURCE_DEVICE = CENTRAL / WIN-MJRKAKK2MEH
DEVICE_ROLE = SOURCE_AUTHORITY
TASK_ID = PRECOMPANY_OWNED_CONTENT_PILOT_V1
REPORT_TYPE = IMPLEMENTATION
TIMESTAMP_LOCAL = 2026-08-18 ~13:30 +03
SECRET_VALUES_PRINTED = NO
FORCE_PUSH = NO
PUSH = NO
PRODUCTION_MUTATED = NO
SECRETS_EXPOSED = NO
REMOTE_MIGRATION_APPLIED = NO
ALPHA_MERGE = NO
MOBILE_RELEASE_TRAIN_DISTURBED = NO
REAL_PARTNER_PRODUCTS = 0
REAL_PARTNER_COURSES = 0
REAL_PARTNERSHIPS_ACTIVE = 0
OUTREACH_SENT = 0
```

## Summary

Re-verified foundation `5eeb0fbd` on a clean worktree tip that already contained content start `7b594475`. P0 invariants still hold. Deepened the same three UMTUBA Originals to the stricter quality contract (full description, prerequisites, pass threshold, progress rules, provider type, draft publish state) and rewrote Platform Essentials so it only documents supported web surfaces. Added Learning E2E (catalog/search/filters, next/previous, draft protection, owned AI allow vs partner AI deny). Locked DEMO products to PRODUCTION_SELLABLE=NO and neutral placeholders. Re-ran negative rights. Added internal placeholder targets that must not appear as public partners. SQL `20260929` stays unapplied. No push. No deploy. Mobile untouched.

## Exact files changed

- `lib/learning/originals/pilot/types.ts` — quality-contract fields
- `lib/learning/originals/pilot/platformEssentials.ts` — honest supported-surface rewrite
- `lib/learning/originals/pilot/digitalSafety.ts` — MFA, scams, device/privacy, reporting
- `lib/learning/originals/pilot/aiFundamentals.ts` — ML, generative/LM, everyday/work, safe tools
- `lib/learning/originals/pilot/assemble.ts` — overview + pass threshold
- `lib/learning/originals/pilot/learnerSurface.ts` — Learning E2E surface
- `lib/learning/originals/pilot/index.ts` — export surface
- `lib/learning/originals/pilot/pilot.test.ts` — quality + E2E + AI gates
- `lib/store/demo/types.ts`, `catalog.ts`, `surface.ts`, `catalog.test.ts` — PRODUCTION_SELLABLE + image policy
- `lib/partners/internalPlaceholders.ts` — internal-only named targets
- `lib/partners/negativeRights.e2e.test.ts` — P4 re-run after content
- `lib/partners/index.ts` — export placeholders
- `docs/partners/precompany/INTERNAL_PLACEHOLDER_TARGETS.md` + README
- `docs/learning/implementation/PRECOMPANY_CONTENT_START_V1.md`
- `docs/store/implementation/PRECOMPANY_CONTENT_START_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None. `20260929_store_learning_precompany_foundation_v2.sql` remains local and unapplied.

## Security review

- Unknown rights DENY; REAL_PARTNER_DATA cannot ACTIVE; MOCK/DEMO cannot become production-purchasable
- AI_USAGE_ALLOWED default FALSE; owned originals opt in; ingest still requires publish
- Partner AI ingest remains denied; tests prove owned allow after publish and partner deny
- Certificates represent UMTUBA only; issuance waits for publish
- Named companies are internal placeholders; public partnership claim is false
- No third-party catalogs, no fabricated instructors, no outbound mail
- SQL not applied remotely

## Tests

Focused vitest on originals, demo catalog, mock A/B, V2 foundation, and P4 negative-rights E2E — PASS (36)

## TypeScript

`npx tsc --noEmit` — PASS

## Lint

`npx eslint` on changed Store/Learning/partner modules — PASS (0 errors)

## Build

Not run (no app UI/entry-point change)

## git diff --check

PASS

## git status --short

See commit on `central/store-learning-precompany-foundation-v2`

## Open issues

- SQL `20260929` still unapplied (intentional)
- Originals remain draft; AI ingest / certificate issuance wait for an explicit publish GO
- DEMO catalog is in-domain; existing `store_products` UI is not bound to these rows
- Partner admin still has no new chrome page
- Partnership pack is internal only; legal placeholders remain
- Push destination was not given, so PUSHED=NO
