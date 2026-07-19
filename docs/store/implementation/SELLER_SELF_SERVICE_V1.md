# Seller Self-Service V1 — Store Setup Wizard

Status: implemented in `umtuba-web`  
Migration: `supabase/migrations/20260810_store_seller_self_service_v1.sql`  
Branch: `office/store-marketplace-v2`

## Scope

First seller experience after the Operator Moderation Console:

1. Multi-step Store Setup Wizard
2. Store identity / information / template / contact / policies
3. Completion checklist
4. Draft save / resume
5. Validation (app + database)
6. Responsive UI + accessibility

**Out of scope:** payments, checkout, shipping rates, orders, Storage media
upload.

## Security model (fail-closed)

### Draft-only client creation

Authenticated clients may **only** insert/update their own rows with
`status = 'draft'`.

- Direct insert with `status = 'pending'` is rejected by RLS.
- Direct update that changes status away from `draft` is rejected by RLS.
- Pending / approved / rejected / suspended rows are not seller-updatable.

### Dedicated atomic submit RPC

`submit_my_seller_application()` (SECURITY DEFINER, `authenticated` +
`service_role`):

1. Requires `auth.uid()`
2. Locks the caller’s current `draft` (`FOR UPDATE`) — **no application id
   parameter**, so another user’s draft cannot be targeted
3. Verifies ownership + `status = 'draft'`
4. Runs `assert_seller_application_ready_for_review(app)` (DB checklist)
5. Atomically sets `status = 'pending'`, `wizard_step = 6`
6. If already pending / no draft → raises a clear exception (safe double-submit)

### DB checklist enforcement

`assert_seller_application_ready_for_review` validates:

- name (2–80) + slug format
- description ≥ 20 chars
- city + country (`^[A-Z]{2}$`)
- currency (`^[A-Z]{3}$`)
- template allow-list
- email **or** phone present; email/phone/url format rules
- return + shipping policies ≥ 20 chars (≤ 5000)

Used by:

- `submit_my_seller_application`
- `approve_seller_application` (service_role)
- `admin_approve_seller_application` (platform admin)

### Legacy path behavior

| Surface | Behavior |
| --- | --- |
| `/seller/apply` | Redirects to `/seller/setup` |
| `applySellerAction` | Redirects to `/seller/setup` with error |
| `applyToBecomeSeller` | Always `{ ok: false }` pointing at `/seller/setup` |

There is **one** submission security model: draft writes + submit RPC.

### URL / email / phone validation

| Field | Rules |
| --- | --- |
| URL | empty allowed; otherwise `http:` / `https:` only; reject `javascript:`, `data:`, `file:`, whitespace, malformed |
| Email | trim + lowercase; practical `\S+@\S+\.\S+`; max 160 |
| Phone | trim; digits/spaces/`+`/`-`/`()`/`.` only; ≥7 digits; max 40 |

Enforced in app (`lib/store/sellerSetup.ts`) and mirrored in DB checks / assert.

## Architecture

```
/seller/setup
  → StoreSetupWizard
  → saveStoreSetupDraftAction (draft insert/update)
  → submitStoreSetupAction
       → save draft values
       → rpc submit_my_seller_application()
  → operator approves via /admin/store
  → approve RPC (completeness + provision store)
```

## Seller lifecycle

1. Start `/seller/setup` → `seller_applications.status = 'draft'`
2. Resume anytime while draft
3. Submit → RPC → `pending`
4. Operator approves → verified store + owner membership
5. Catalog at `/seller/store`

## Routes

| Route | Purpose |
| --- | --- |
| `/seller/setup` | Wizard |
| `/seller/apply` | Redirect → setup |
| `/seller` | Hub (draft / pending / rejected) |

## Tests

`lib/store/sellerSetup.test.ts` includes **migration contract tests** (and
unit validation tests) for:

- draft-only insert / update RLS
- pending not insertable/updatable by clients
- submit RPC ownership + checklist + double-submit messages
- wizard_step CHECK
- unique open-application + slug indexes
- approve incompleteness guard
- URL scheme rejection
- legacy path disablement

These are **not** live RLS integration tests against a running Postgres.
Full DB e2e still depends on local/remote Supabase apply.

## Known limitations

1. Migration must be applied before draft persistence / submit RPC work.
2. Template is metadata only — no distinct public layouts yet.
3. Open slug uniqueness does not reserve against existing `stores.slug`
   (approve fails closed on conflict).
4. Email validation is practical, not ownership proof.
5. Live RLS/RPC integration tests are not in CI without a database.

## Manual QA

1. Signed-out `/seller/setup` → login with `next=`.
2. Save draft on step 1; resume from `/seller`.
3. Incomplete checklist cannot submit (UI + server + RPC).
4. Direct client `insert status=pending` fails (after migration apply).
5. Double submit after pending → clear error; no second open row.
6. `/seller/apply` lands on wizard.
7. Operator queue excludes drafts; approve of incomplete pending fails.

## Rollback strategy

Do **not** delete merchant data blindly.

1. **Drop new submit / assert helpers**
   ```sql
   drop function if exists public.submit_my_seller_application();
   drop function if exists public.assert_seller_application_ready_for_review(public.seller_applications);
   ```

2. **Restore prior RLS** (from `20260802_store_marketplace_foundation_v1.sql`):
   - Drop Self-Service draft insert/update policies
   - Recreate:
     - insert `status = 'pending'`
     - update using/with check `status = 'pending'`
   - Note: this re-opens the old incomplete-pending client path — only do this
     as a temporary emergency rollback.

3. **Restore approve function bodies** from
   `20260809_store_admin_moderation_foundation_v1.sql` /
   `20260802_...` (without `assert_seller_application_ready_for_review`).

4. **Status / check constraints**
   - Prefer leaving `draft` in the status CHECK if any `draft` rows exist.
   - To remove `draft` from the CHECK, first transition or close draft rows
     deliberately (e.g. set to `rejected` with an ops note) — never `DELETE`
     merchant applications without an explicit ops decision.
   - Drop Self-Service column CHECKs only after confirming no dependent data
     needs the tighter URL/phone rules.

5. **Existing draft / pending records**
   - `pending`: leave for operators to approve/reject.
   - `draft`: either leave (harmless if UI retired) or mark `rejected` with a
     system note after product sign-off.
   - Do **not** bulk-delete `seller_applications` or linked profile data.

6. **Indexes**
   - Recreate foundation slug/open indexes if Self-Service indexes are dropped:
     - `seller_applications_one_open_per_user_uidx` (without `draft` if drafts gone)
     - `seller_applications_pending_slug_uidx` (pending-only) as in 20260802
