# Remote preflight SQL (read-only)

SELECT-only probes for Commerce chain migration apply readiness against the linked Supabase project.

```bash
npx supabase db query --linked -f scripts/remote-preflight/<file>.sql -o json
```

| File | Purpose |
| --- | --- |
| `07_commission_table.sql` | commission policies table presence |
| `07b_multi_active.sql` | soft multi-active gate (N/A if table missing) |
| `07b_multi_active_detail.sql` | multi-active rows (only after table exists) |
| `09_prereq_objects.sql` | settlement/commission/entitlement/outcome RPCs |
| `10_entitlement_cols.sql` | entitlement columns (incl. revoked_at absence) |
| `11_rls_existing.sql` | RLS on core store tables |
| `12_remote_tip.sql` | recent schema_migrations tip |
| `14_settlement_scan.sql` | settlement-named relations |
| `15_existing_rpc_grants.sql` | service_role execute expectations |
| `16_history_prereqs.sql` | history rows for prereq/target versions |
| `17_targets_and_history.sql` | target/prereq table presence |
| `18_target_rpcs.sql` | target + commission foundation RPCs |
| `19_target_history.sql` | history for 23/24/84/87–91 |
| `20_one_active_index.sql` | one-active unique index |

Never use these files for DDL/DML. Never run `db push` from this folder.
