# History drift verification probes (read-only)

SELECT-only evidence for `20260822` / `20260823` history registration safety against linked project `tgucwnjwoyeqoxqaxmew`.

```bash
npx supabase db query --linked -f scripts/remote-preflight/history-drift/<file>.sql -o json
```

Never run `migration repair`, `db push`, or DDL/DML from this folder in this milestone.
