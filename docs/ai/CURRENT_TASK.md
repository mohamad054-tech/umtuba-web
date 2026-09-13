# Current Task

## Task title

CENTRAL_UMTUBA_LEGAL_PAGES_V1

## Status

**LOCAL COMPLETE.** Routes replaced/created. Migration written, not applied.

```
TASK_ID = CENTRAL_UMTUBA_LEGAL_PAGES_V1
STATUS = LOCAL_COMPLETE
DATE = 2026-09-13
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
MIGRATION = supabase/migrations/20260940_data_export_requests_v1.sql
COMMIT = FORBIDDEN_UNLESS_USER_ASKS
LEGAL_I18N_KEYS = 322
```

## Allowed scope

- Legal i18n keys (types + all 13 catalogs).
- Replace `/privacy`, `/terms`, `/account-deletion`, `/support` content.
- Create `/cookies`, `/community-guidelines`, `/copyright`, `/about`, `/data-export`.
- Shared public footer via AppChrome.
- Additive migration `20260940` only (not applied).

## Forbidden scope

- Do not create `/legal/*`.
- Do not invent address, CRN, or legal prose.
- Do not connect to production or run `supabase db push`.
- Do not change existing i18n key meanings.
