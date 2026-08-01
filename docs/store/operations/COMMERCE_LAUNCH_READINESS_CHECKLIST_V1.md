# Commerce Launch Readiness V1 â€” Production Checklist

Capability: `commerce.ops.launch_readiness_v1`
Branch: `office/commerce-launch-readiness-v1`
Base: `be87fb30c2c7ba15d66f8540e5e6c57e181649f6`
Machine split: **Laptop** = audit / tests / docs / readiness. **Desktop** = Supabase migration apply + commission/refund-sensitive ops.

Status legend: `[ ]` pending Â· `[x]` done Â· `N/A` not this phase

---

## A. Pre-deploy (Laptop + Deploy owner)

- [ ] Tip deployed includes capture â†’ allocate â†’ commission apply â†’ entitlement grant â†’ release â†’ refund â†’ revoke
- [ ] `package.json` / lockfile unchanged from approved tip
- [ ] Focused Commerce + refund/entitlement/commission tests PASS on tip
- [ ] `npx tsc --noEmit` PASS
- [ ] `npm run build` PASS
- [ ] Physical live Stripe path confirmed rejected (`20260876` digital-only)
- [ ] Digital publish readiness gate confirmed (active owned asset required)
- [ ] Confirm gate remains **OFF** until controlled probe (`commerce_confirm_enabled = 0`)
- [ ] Kill switch rehearsed: `STORE_COMMERCE_CONFIRM_KILL_SWITCH` + `admin_set_commerce_confirm_enabled(false)`
- [ ] No secrets committed; env names documented only

## B. Migration apply (Desktop / ops only â€” do NOT apply from laptop)

Apply **commerce store migrations only** (skip Learning/World/Ads). Forward-only; no renumber.

### B1. Money foundations (if not already remote)

1. `20260822_ueos_foundation_v1.sql`
2. `20260823_store_payment_outcome_sync_v1.sql`
3. `20260824_store_merchant_settlement_foundation_v1.sql`

### B2. Catalog / listing / digital product load

4. `20260869_store_marketplace_supplier_seller_foundation_v1.sql`
5. `20260870_store_marketplace_listing_checkout_alignment_v1.sql`
6. `20260875_store_marketplace_listing_provenance_hardening_v1.sql`
7. `20260878_store_digital_access_delivery_v1.sql`
8. `20260879_store_seller_digital_product_asset_upload_v1.sql`
9. `20260885_store_catalog_category_taxonomy_seed_v1.sql`
10. `20260886_store_supplier_listing_create_hardening_v1.sql`

### B3. Capture â†’ entitle â†’ settle â†’ commission â†’ refund

11. `20260876_store_live_payment_capture_adapter_v1.sql`
12. `20260877_store_digital_entitlement_grant_v1.sql`
13. `20260880_store_digital_product_versioning_update_delivery_v1.sql` (optional but recommended after 79)
14. `20260881_store_seller_payout_foundation_v1.sql`
15. `20260882_store_seller_payout_read_model_v1.sql`
16. `20260883_store_settlement_payout_reconciliation_read_v1.sql`
17. `20260884_store_commission_policy_foundation_v1.sql`
18. `20260887_store_commerce_transactional_notifications_v1.sql`
19. `20260888_store_refund_operations_surface_v1.sql`
20. `20260889_store_digital_entitlement_revoke_on_refund_v1.sql`
21. `20260890_store_commission_decomposition_bridge_apply_v1.sql`
22. `20260891_store_commission_policy_activation_v1.sql`

Post-apply verify:

- [ ] Each file recorded in `supabase_migrations.schema_migrations` (or project equivalent)
- [ ] RPC execute grants remain service_role-only for money mutations
- [ ] Private digital storage bucket present and non-public
- [ ] `commerce_confirm_enabled` still `0` unless probe GO issued

## C. Stripe / webhook setup (Ops)

Names only â€” never paste secrets into tickets/docs.

- [ ] `STRIPE_SECRET_KEY` + matching `STRIPE_MODE` (`test` first)
- [ ] `STRIPE_WEBHOOK_SECRET` (`whsec_â€¦`)
- [ ] Publishable key (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` or `STRIPE_PUBLISHABLE_KEY`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- [ ] HTTPS app origin (`NEXT_PUBLIC_APP_URL` / `APP_ORIGIN` / `NEXT_PUBLIC_SITE_URL`)
- [ ] Webhook endpoint: `/api/store/payments/stripe/webhook`
- [ ] Accepted events configured: `checkout.session.completed`, `checkout.session.async_payment_succeeded`
- [ ] Live only when Production Gate complete: `STRIPE_LIVE_PAYMENTS_ENABLED`, `STRIPE_PRODUCTION_GATE_ACK`, live keys, HTTPS, production env
- [ ] `STORE_COMMERCE_CONFIRM_KILL_SWITCH` unset except emergency

## D. Smoke testing (controlled)

Keep confirm **OFF** until step D4.

- [ ] D1 Seller onboard + verified store
- [ ] D2 Create **digital** product + upload asset + publish readiness PASS
- [ ] D3 Admin approve + create listing (owner/manager RPC)
- [ ] D4 Confirm gate ON for probe window only
- [ ] D5 Cart â†’ checkout â†’ Stripe **test** capture
- [ ] D6 Verify Sync `captured` + allocate + entitlement grant + release
- [ ] D7 Buyer digital access mint/list works for `active` only
- [ ] D8 Admin full-order refund â†’ entitlement revoke (zero `active` left)
- [ ] D9 Seller reconciliation read shows expected settlement/payout posture
- [ ] D10 Confirm gate OFF after probe **or** leave ON only with monitoring owner assigned

## E. Launch

- [ ] Product GO recorded (who / when / tip SHA)
- [ ] Desktop confirms migrations B1â€“B3 applied
- [ ] Stripe mode decision recorded (test soak vs live gate)
- [ ] At least one commission policy activated per launch currency **if** commercial split required (else expect `not_configured` soft path)
- [ ] Physical products remain non-sellable via live Stripe
- [ ] Support / ops ownership named for payments, refunds, entitlements

## F. Post-launch monitoring

- [ ] Watch Sync captured vs allocate/entitle/release soft-fail (webhook may still 200)
- [ ] Stripe Dashboard vs `payment_attempts` / outcome drift
- [ ] Webhook 4xx/5xx rate (sig / config / Stripe fetch)
- [ ] Refund ops `failed` + revoke fail-closed events
- [ ] Commission `not_configured` rate
- [ ] Confirm-gate left ON unexpectedly

## G. Rollback / forward-fix

- [ ] Immediate: `admin_set_commerce_confirm_enabled(false)` + verify `0`
- [ ] Optional: set `STORE_COMMERCE_CONFIRM_KILL_SWITCH=1`
- [ ] Redeploy prior known-good artifact if app regression
- [ ] Do **not** rewrite applied migrations; stop further applies; restore from backup only under ops plan
- [ ] Soft: hide listings / return products / suspend seller

## H. Incident response (first 15 minutes)

1. Kill confirm (DB and/or env kill switch)
2. Pause Stripe webhook endpoint or disable live flag if money incorrectly moving
3. Capture: Stripe event id, `payment_attempt_id`, `event_key`, correlation id, admin user
4. Classify: capture vs allocate vs entitlement vs refund/revoke vs config
5. Prefer forward-fix (replay Sync / revoke with same keys) over DB surgery
6. Escalate Desktop for migration/RPC anomalies; Laptop for app/test reproduction

---

## Launch blockers (as of this tip)

1. Remote apply of Wave A+C through `20260891` (Desktop)
2. Stripe env + webhook (Ops)
3. Controlled confirm-gate GO (Ops)
4. Commission policy activation if commercial split required (Desktop/ops; sensitive â€” no laptop code change)

## Explicitly out of launch scope

Physical warehouse/shipping, bank payout rails, partial refunds, Stripe refund adapter, dispute/chargeback handlers, Learning/World/Ads migrations, auto-seed commercial rates.
