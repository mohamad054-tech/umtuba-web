# Current Task

```text
TASK_ID = UMTUBA_LEGAL_PUBLIC_SURFACES_V1
STATUS = IMPLEMENTED_UNCOMMITTED
BRANCH = fix/legal-public-surfaces
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-legal
BASE = origin/alpha-0.2 @ 9080b79c
NEXT_ACTION = OWNER_SUPPLY_LEGAL_MD_OR_REVIEW_THEN_COMMIT
```

## Allowed scope

- Existing routes: `/privacy`, `/terms`, `/account-deletion`, `/support`
- New routes: `/cookies`, `/community-guidelines`, `/copyright`, `/about`, `/data-export`
- i18n keys in `lib/i18n/messages/types.ts` and all 13 catalogs
- Shared footer via AppChrome
- Additive migration `20260940_data_export_requests_v1.sql` (not applied)
- `docs/ai/CURRENT_TASK.md`, `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- `/legal/*` routes
- Commit / push (unless owner asks)
- `supabase db push` / production DB
- Inventing a registered address or CRN
- Changing existing i18n key meanings
- Dependency upgrades
- Merge into alpha or any other branch
