# First Supplier Runbook

Operational only. No feature development.  
Companion: `COMMERCE_PRODUCTION_ROLLOUT.md` · `FIRST_PRODUCT_RUNBOOK.md`

**Goal:** Onboard the first real supplier store safely with commerce confirm **OFF**.

---

## Preconditions

- [ ] Deploy tip includes `ca157d7` (or later) on production app
- [ ] Wave A migrations applied (`20260869`…`20260886`) **or** supplier-only path deferred until listing needed
- [ ] For digital catalog: `20260878`+`20260879`+`20260885` applied
- [ ] Bucket `store-product-media` private
- [ ] `commerce_confirm_enabled = 0`
- [ ] Platform admin account ready (`is_platform_admin`)
- [ ] Dedicated real supplier identity (not E2E sandbox emails for production)

---

## Steps

### 1. Create Auth user

Create supplier user via Auth UI/Admin API only.  
**Do not** `INSERT INTO auth.users` from SQL.

### 2. Seller application

1. Sign in as supplier.
2. Open `/seller/setup` (or seller entry).
3. Complete wizard: identity, city/country, currency, policies, contacts.
4. Submit → RPC `submit_my_seller_application` (draft→pending).

**Validate:** Application status `pending`; seller cannot self-approve.

### 3. Admin approve seller

1. Platform admin opens `/admin/store/sellers`.
2. Review checklist completeness.
3. Approve via `admin_approve_seller_application`.

**Validate:**
```sql
-- replace ids
select id, status, verification_status, marketplace_supplier_enabled
from stores
where id = '<store_id>';
-- expect: status=active, verification_status=verified
```

### 4. Membership check

Confirm supplier user is `owner` (or intended role) on `store_members` with `status=active`.

### 5. Supplier marketplace flag (only if this store supplies other sellers)

```sql
-- intentional ops update only after Product approval
-- marketplace_supplier_enabled = true for THIS store only
```

If the first store only sells owned products (not wholesale supply), leave flag **false**.

### 6. Access smoke

- [ ] `/seller` loads
- [ ] Can open new product form
- [ ] Categories appear in picker (`listActiveCategories` non-empty)
- [ ] Cannot turn on commerce confirm (buyer JWT / non-admin)

---

## Do / Don’t

| Do | Don’t |
| --- | --- |
| Approve one pilot supplier | Mass-enable `marketplace_supplier_enabled` |
| Keep confirm OFF | Enable live Stripe or bank rails |
| Use production Auth users | Reuse E2E sandbox GUCs for real people |
| Document store UUID | Share service role keys |

---

## Rollback

- Reject or suspend via admin RPCs
- Soft-disable catalog (hide products) if already created
- Leave migrations in place; do not DOWN

---

## Exit criteria

- [ ] Seller approved  
- [ ] Store active + verified  
- [ ] Owner/manager can manage catalog  
- [ ] Confirm gate still `0`  
- [ ] Ready for `FIRST_PRODUCT_RUNBOOK.md`
