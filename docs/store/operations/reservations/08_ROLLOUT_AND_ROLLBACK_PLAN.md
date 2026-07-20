# UMTUBA Store — Reservation Operations V1
## 08 · Rollout and Rollback Plan

**Document type:** Release sequencing
**Status:** Commerce confirm remains **OFF** until checklist `02` is fully signed
**Consistency:** Aligns with Store Hardening, Commerce Safety, Checkout, Payments (deferred), Fulfillment, Analytics/Finance placeholders

---

## 1. Rollout stages

| Stage | Gate OFF? | Activities | Exit criteria | Owner |
|-------|-----------|------------|---------------|-------|
| **S0 Local verification** | N/A | Unit/contract tests; no remote migrate | CI green for Commerce Safety suites | Eng |
| **S1 Staging migration** | OFF | Apply `20260819`; verify schema | G1–G3 on staging | DBA |
| **S2 Staging concurrency** | ON in staging only | Load tests (`06`); cancel/expire drills | G7–G10 staging evidence | QA/Eng |
| **S3 Production migration** | **OFF** | Apply `20260819` to prod; verify defaults OFF | G1–G3 prod | DBA + checker |
| **S4 Scheduler shadow** | OFF | Configure expire job; observe ≥1h | G4–G5 | Commerce op |
| **S5 Manual test orders** | Brief ON for allowlisted testers **or** stay OFF with RPC-only drills | Controlled confirms; cancel; expire | Smoke OK; then OFF if not entering beta | Commerce + Admin |
| **S6 Limited beta enablement** | ON for cohort | Checklist `02` complete; support ready | Sign-off; metrics stable 24–72h | Maker+checker |
| **S7 Expanded rollout** | ON | Raise cohort / remove allowlist | Error rates within thresholds | Commerce |
| **S8 Full enablement** | ON | Announce broadly | SEV board clear; docs updated | Eng manager |

**Note:** Stages S5–S8 assume product accepts **pending-payment** orders without live capture. Do not market as “paid checkout.”

---

## 2. Rollback priority (normative)

When anything goes wrong after enablement:

1. **Environment kill switch** — `STORE_COMMERCE_EMERGENCY_DISABLE=1`
2. **Database commerce gate OFF** — `admin_set_store_commerce_checkout_enabled(false)`
3. **Stop confirmations** — verify UI + RPC failures are clear
4. **Keep browse/cart available** — do not take down Store catalog
5. **Preserve reservation history** — no deletes
6. **Release eligible abandoned reservations** — bounded `expire_store_inventory_reservations`
7. **Forward-fix** — patch/migrate forward; **do not** destructive down-migrate live reservation data

Order of 1 vs 2: either first is fine; doing **both** is strongest containment.

---

## 3. Decision owners

| Decision | Owner |
|----------|-------|
| Apply prod migration | Database operator + Eng checker |
| Start scheduler | Commerce operator |
| Enable gate | Maker (Commerce) + Checker (Admin/EM) |
| Declare SEV-1 rollback | On-call / IC |
| Re-enable after incident | Same maker-checker as `02` |

---

## 4. Release evidence pack

Attach to the enablement ticket:

- Migration apply logs (staging + prod)
- Schema verification notes
- Scheduler screenshots/logs (≥1h)
- Monitoring dashboard links
- Concurrency test summary
- Rollback drill note (kill switch and/or gate OFF proven)
- Support macro IDs
- Sign-off names/timestamps

---

## 5. What this rollout does **not** include

- Enabling live Stripe/PayPal/etc.
- Settlement/payout go-live
- Automated reservation **consumption** on paid
- Claiming a scheduler exists before S4 evidence
- Changing Store Hardening, checkout foundations, or Commerce Safety code in this ops docs task

---

## 6. Relationship to other Store docs

| Package | Relationship |
|---------|--------------|
| Store Hardening V1 | Browse media/moderation; independent; keep gated merchandising flags |
| Commerce Safety V1 | Source of gate, TTL, expire RPC contracts |
| Checkout Foundation | Quote/confirm paths; confirm blocked when gate OFF |
| Payments Foundation | Deferred attempts only; pending-payment honesty |
| Fulfillment | Unaffected by expiry (orders remain) |
| Analytics & Finance | Placeholders; not a go-live dependency for confirm ON |
| Settlements architecture | Future; not required for reservation ops |

---

## 7. Open decisions

| ID | Topic |
|----|--------|
| OD-RO08 | Whether S5 uses temporary prod ON for staff only |
| OD-RO09 | Beta cohort definition (stores / countries / %) |
