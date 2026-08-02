# Blocker remediation probes (read-only)

SELECT-only evidence for Commerce remote migration blocker remediation planning against linked project `tgucwnjwoyeqoxqaxmew`.

```bash
npx supabase db query --linked -f scripts/remote-preflight/blocker-remediation/<file>.sql -o json
```

Never run repair/apply/DDL from this folder.
