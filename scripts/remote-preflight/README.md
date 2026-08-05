# Remote preflight SQL (read-only)

SELECT-only probes for Commerce chain migration apply readiness against the linked Supabase project.

```bash
npx supabase db query --linked -f scripts/remote-preflight/<file>.sql -o json
```

Never use these files for DDL/DML. Never run `db push` from this folder.
