# Store remote E2E sandbox V1

Namespace: `UMTUBA_E2E_20260721`  
Linked project: `tgucwnjwoyeqoxqaxmew`  
Scripts: `scripts/store-e2e/`

## Final remote validation status

**PASS WITH NOTES**

Verified against linked project after Store migrations **20260809–20260821** were applied remotely (additive SQL via `db query --linked`; not `db push`).

| Area | Result |
|------|--------|
| Quote / coupon / shipping fee | Pass |
| Order create + items + fulfillment | Pass |
| Deferred payment (`provider=none`, `method_kind=deferred`) | Pass |
| Reservations + event ledger | Pass |
| B1 idempotent replay | Pass |
| Different idempotency identity | Pass |
| Buyer cancellation + single release | Pass |
| Reservation expiry + idempotent replay | Pass |
| Seller cannot `UPDATE orders.payment_status` as `authenticated` (`42501`) | Pass |
| Buyer / seller / admin / anon authorization probes | Pass |
| Inventory reconciled to `reserved = 0` for all sandbox SKUs | Pass |
| Active sandbox reservations | **0** |
| Commerce gate final | **`commerce_confirm_enabled = 0` / OFF** |
| Real payment provider / charge | **Not used** |
| Personal (non-E2E) accounts | **Not used** |

Immutable sandbox evidence rows (orders / payment_attempts / reservation events) may remain as audit markers. Do not truncate.

### Concurrency note (non-blocking)

**CONCURRENCY_NOT_PROVEN** — not a proven database oversell defect.

True dual-success concurrent PostgreSQL sessions were not fully demonstrated because one Supabase CLI temp-role connection repeatedly failed under parallel `db query` load. Observed behavior when one connection succeeded: stock locked correctly, no oversell, failed follow-on attempts raised insufficient inventory without partial artifacts. Treat full dual-connection concurrency as an open tooling/harness note for a future rerun with two reliable DB clients.

## Account requirements

**Do not reuse personal gmails.**  
**Do not `INSERT INTO auth.users` from SQL.**  
Seed aborts with `ACCOUNT_BLOCKER` unless session GUCs point at dedicated Auth test users.

Suggested emails (create via Auth UI or Admin API only):

| Role | Example email |
|------|----------------|
| Seller | `e2e-seller+20260721@…` |
| Buyer | `e2e-buyer+20260721@…` |
| Buyer2 (optional) | `e2e-buyer2+20260721@…` |
| Admin | `e2e-admin+20260721@…` |

After creation, copy UUIDs into `scripts/store-e2e/config.local.sql` (**gitignored**). Start from `config.example.sql` (placeholders only).

Required session GUCs:

- `umtuba.e2e_seller_user_id`
- `umtuba.e2e_buyer_user_id`
- `umtuba.e2e_admin_user_id`
- optional: `umtuba.e2e_buyer2_user_id`

## Fixed sandbox identifiers

| Entity | UUID |
|--------|------|
| Store | `e2e02107-2026-4001-8000-000000000001` |
| Seller application | `e2e02107-2026-4001-8000-000000000002` |
| Products | `…000011` simple, `…000012` variant tee, `…000013` low stock |
| Variants | `…000021` simple, `…000022` tee S, `…000023` tee L, `…000024` low |
| Shipping | `…000031` standard, `…000032` pickup |
| Coupon | `…000041` code `E2E20260721` (10%) |

SKU marker: `UMTUBA_E2E_20260721-*`

Expected inventory after a clean seed / post-reconcile:

| SKU | on_hand | reserved |
|-----|---------|----------|
| `UMTUBA_E2E_20260721-LOW` | 2 | 0 |
| `UMTUBA_E2E_20260721-MUG` | 100 | 0 |
| `UMTUBA_E2E_20260721-TEE-L` | 50 | 0 |
| `UMTUBA_E2E_20260721-TEE-S` | 50 | 0 |

## Platform admin grant

Seed inserts `platform_admins` for `umtuba.e2e_admin_user_id` (`on conflict do nothing`).

Manual alternative (service_role):

```sql
insert into public.platform_admins (user_id, note)
values ('<admin-uuid>', 'UMTUBA_E2E_20260721 sandbox admin')
on conflict (user_id) do nothing;
```

## Apply seed (transaction wrap)

```text
-- same session
\i scripts/store-e2e/config.local.sql
begin;
\i scripts/store-e2e/seed-store-sandbox.sql
-- inspect notices; abort on ACCOUNT_BLOCKER / SAFETY_ABORT / COLLISION
\i scripts/store-e2e/verify-store-sandbox.sql
commit;  -- or rollback;
```

Seed refuses to run if `commerce_confirm_enabled <> 0` (`SAFETY_ABORT`).  
Seed never enables commerce confirm. Seed never truncates non-sandbox rows.

## Payment simulation (DEFERRED_TEST mapping)

Schema has **no** `DEFERRED_TEST` enum.

| Label (docs/QA) | Actual columns |
|-----------------|----------------|
| `DEFERRED_TEST` | `payment_attempts.provider = 'none'` **and** `method_kind = 'deferred'` |

Confirm path uses **deferred / none** only.  
`cash_on_delivery` exists as a provider enum value but is **not** a real COD PSP in this sandbox — do not claim live COD capture.

## Gate-OFF test plan

1. Confirm `commerce_confirm_enabled = 0`.
2. Ensure seed applied (`verify-store-sandbox.sql` all `ok`).
3. Run `scripts/store-e2e/run-gate-off-checks.sql`:
   - Gate OFF assertion
   - Sandbox catalog present or `SEED_REQUIRED`
   - `assert_store_commerce_confirm_allowed()` must raise while gate OFF
4. Authenticated quote/confirm with **buyer JWT** is out-of-band (separate session). Expect confirm blocked while gate OFF.

## Gate-ON test plan (short, intentional)

Gate-ON is **operator documentation only** in this package (no committed Gate-ON runner). Always close the gate.

1. As platform admin (buyer JWT not enough): `select public.admin_set_commerce_confirm_enabled(true);`
2. Buyer session: quote → confirm → deferred payment attempt (`provider=none`, `method_kind=deferred`).
3. Verify inventory reservation / order rows for sandbox store only.
4. **Safety close immediately after probes (mandatory):**

```sql
select public.admin_set_commerce_confirm_enabled(false);
```

5. Verify `commerce_confirm_enabled = 0` from the database before ending the session.

Leave gate OFF when finished. If enable succeeds and later steps fail, still run the close RPC before exit.

## Future rerun

1. Ensure dedicated E2E Auth users + `config.local.sql` GUCs.
2. Confirm gate OFF; optionally re-seed only if catalog missing (`verify` → `SEED_REQUIRED`).
3. Run Gate-OFF script; exercise buyer quote/confirm out-of-band as needed.
4. For Gate-ON: enable → probes → **always** `admin_set_commerce_confirm_enabled(false)`.
5. Reconcile active reservations via approved buyer/seller cancel or `expire_inventory_reservations` — never direct `reserved` edits.
6. Optional dual-connection concurrency with two reliable Postgres clients (not flaky parallel CLI temp-role sessions).

## Cleanup recommendation

```text
\i scripts/store-e2e/config.local.sql   -- optional cleanup_admin flag
begin;
\i scripts/store-e2e/cleanup-store-sandbox.sql
commit;
```

Cleanup deletes **only** fixed store id / SKU marker / coupon / application id rows.  
If orders/`payment_attempts` refuse delete (immutability / FK), script raises `NOTICE` and leaves marked rows — **never truncate**.  
`platform_admins` are kept unless `umtuba.e2e_cleanup_admin=1`.

Leaving immutable evidence rows is acceptable after a successful validation pass.

## Operator checklist

- [ ] Dedicated Auth users created (not personal gmails)
- [ ] `config.local.sql` GUCs set (gitignored; never commit)
- [ ] Seed + verify under transaction
- [ ] Gate-OFF checks green
- [ ] Gate-ON only for short confirm probes
- [ ] `admin_set_commerce_confirm_enabled(false)` after Gate-ON
- [ ] Active reservations reconciled; sandbox `reserved = 0`
- [ ] Cleanup when sandbox catalog is no longer needed
