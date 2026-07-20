# UMTUBA Store — Reservation Operations V1
## 02 · Commerce Enablement Checklist

**Document type:** Go / No-Go checklist before `checkout_confirm_enabled = true`
**Status:** Commerce gate defaults **OFF**. Do not enable until all **Blocking** gates pass.
**Toggle RPCs:** `admin_set_store_commerce_checkout_enabled(true|false)` (platform admin)
**Emergency override:** `STORE_COMMERCE_EMERGENCY_DISABLE=1` (forces app OFF; cannot enable)

---

## 1. Preconditions (always true before review)

- [ ] Live payment provider is **not** required for this checklist, but stakeholders understand orders will be **pending payment** only.
- [ ] Settlement/payout systems are **not** required to turn confirm ON (finance remains deferred).
- [ ] Browse/cart/quote remain available when gate is OFF (Commerce Safety design).

---

## 2. Blocking gates

| # | Gate | Evidence required | Owner |
|---|------|-------------------|-------|
| G1 | Migration `20260819_store_commerce_safety_inventory_v1.sql` applied successfully on target DB | Migrate log / schema verify (tables, RPCs, trigger) | Database operator |
| G2 | Reservation tables + indexes verified | `inventory_reservations`, `inventory_reservation_events`, unique `reservation_token`, `order_item_id` unique, active expiry index | Database operator |
| G3 | Gate defaults OFF after migrate | `store_commerce_settings.id=1`, `checkout_confirm_enabled=false` | Commerce operator |
| G4 | Expire RPC tested (staging + prod shadow) | Manual/service-role call returns count; expired rows + reserved decrement verified | Commerce operator + DBA |
| G5 | Scheduler configured **and observed** (≥1h healthy ticks) | Job logs with `expired_count`, no sustained errors | Commerce operator |
| G6 | Monitoring + alerts configured | Dashboards/alerts for backlog, drift, job errors, gate state (`03`) | Commerce operator + Platform |
| G7 | Buyer cancellation path tested | Cancel (where product allows) or equivalent release path; reserved drops | QA / Commerce |
| G8 | Seller/admin cancellation releases stock | `update_store_order_status` → cancelled → reservations `released` | QA / Commerce |
| G9 | Multi-store atomic confirm tested | Failure mid multi-store leaves no partial orders/reservations | QA |
| G10 | Concurrency / oversell test completed | Parallel confirms on low stock → no oversell beyond on_hand rules | QA / Eng |
| G11 | Operational owner assigned | Named primary + backup on-call | Eng Manager |
| G12 | Rollback procedure tested | Kill switch and/or DB gate OFF verified end-to-end (`08`) | Commerce + Platform |
| G13 | No pending critical incidents | Incident board clear for Store/DB/Auth | On-call |
| G14 | Support messaging prepared | Macros: pending payment, out of stock, confirm disabled | Support lead |

---

## 3. Strongly recommended (non-blocking but expected)

| # | Item | Evidence |
|---|------|----------|
| R1 | Idempotency retry test | Same key → same order; reserved not doubled |
| R2 | Seller cannot mutate `reserved` | Direct update rejected / preserved |
| R3 | Env kill switch drill | `STORE_COMMERCE_EMERGENCY_DISABLE=1` blocks confirm |
| R4 | Quote-still-works when gate OFF | Checkout quote succeeds; place order blocked |
| R5 | Expiry does not cancel orders | Order remains after reservation expired |

---

## 4. Sign-off matrix (maker-checker)

Enabling commerce in production requires **two distinct humans**:

| Role | Sign-off meaning |
|------|------------------|
| **Commerce operator (maker)** | Checklist complete; evidence linked |
| **Platform admin or Eng manager (checker)** | Independent review; approve toggle |
| **Database operator** | Schema/migrate evidence (G1–G2) |
| **Support lead** | Messaging ready (G14) |

Record: ticket id, environment, timestamp, evidence URLs, actors.

**Forbidden:** Single person migrates, schedules, and enables alone.

---

## 5. Enablement sequence (after sign-off)

1. Confirm `STORE_COMMERCE_EMERGENCY_DISABLE` is **unset** in production app env.
2. Confirm scheduler healthy.
3. Maker+checker: `admin_set_store_commerce_checkout_enabled(true)`.
4. Verify `get_store_commerce_checkout_enabled()` → true.
5. Smoke: one controlled test order (pending payment); reservation created; cancel/expire path OK.
6. Watch metrics 30–60 minutes before broader announce.

---

## 6. Explicit non-claims

This checklist does **not** assert:

- Live card capture exists
- Reservation **consumption** (on_hand decrement on paid) is automated
- Finance/settlement payouts are ready
- A scheduler exists until G5 evidence is attached

---

## 7. Related docs

- `01_EXPIRY_JOB_RUNBOOK.md`
- `03_MONITORING_AND_ALERTS.md`
- `08_ROLLOUT_AND_ROLLBACK_PLAN.md`
- `docs/store/implementation/COMMERCE_SAFETY_INVENTORY_V1.md`
