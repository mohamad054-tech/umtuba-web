# UMTUBA Store — Reservation Operations V1
## 05 · Manual Recovery Procedures

**Document type:** Safe operator procedures (documentation only)
**Status:** Prefer approved RPCs and read-only inspection
**Hard rule:** **No unsafe direct `UPDATE` instructions for production reservation/inventory tables in this runbook.**

---

## 1. Principles

1. **Preserve history** — do not delete `inventory_reservations` or events.
2. **Forward-fix** — expire/release via RPC; fix code; compensate.
3. **Least privilege** — service_role only for expire; admin for gate.
4. **Dual control** in production for anything beyond read-only.
5. **Orders stay** — expiry never cancels orders; payment ambiguity escalates to payments/finance owners (there is **no** live capture today).

---

## 2. Inspecting stuck reservations (read-only)

Conceptually identify:

- `status = 'active'` AND `expires_at <= now()` → expiry backlog
- `status = 'active'` AND `expires_at < now() - grace` → stuck
- `orders.status = 'cancelled'` AND reservation still `active` → release bug

Record: `reservation_token`, `order_id`, `variant_id`, quantities, timestamps.

Do **not** paste buyer PII into tickets.

---

## 3. Invoking expiry in bounded batches

Approved path only:

1. Change ticket + approver
2. Service-role channel from vault
3. Call `expire_store_inventory_reservations(p_limit)` with small `p_limit` (e.g. 100)
4. Repeat while backlog remains and error-free
5. Log each `expired_count`

See `01_EXPIRY_JOB_RUNBOOK.md` §13–14.

---

## 4. Confirming order / payment eligibility (conceptual)

When deciding whether a hold should still exist:

| Observation | Interpretation |
|-------------|----------------|
| Order pending payment + reservation active + not expired | Expected pre-expiry |
| Order pending payment + reservation expired | Expected after TTL; order may still exist unpaid |
| Order cancelled + reservation active | Abnormal → release investigation |
| “Paid” claim without live provider | **Escalate** — deferred attempts are not capture |

There is **no** automated reservation **consumption** on paid today. Do not invent stock deductions manually.

---

## 5. Validating reserved counters (read-only)

For a variant + `warehouse_key = 'default'`:

- Let `R` = `product_inventory.reserved`
- Let `A` = sum of `quantity` for `active` reservations
- Expect `R = A` (Commerce Safety invariant under normal ops)

If `R ≠ A`, treat as drift incident (`04` Scenario D). Do **not** “fix” by seller UI edits to `reserved` (blocked by design).

---

## 6. Cancelled orders with active reservations

1. Confirm order status is cancelled via order management path.
2. Prefer re-driving release through **approved status RPC** if safe/idempotent.
3. If reservation past `expires_at`, bounded expire RPC will release inventory (status becomes `expired`, which is acceptable if cancel release missed—document in ticket).
4. If not expired and cancel cannot release: escalate to Eng for forward-fix; do not hand-edit rows.

---

## 7. Pointer / event divergence

Check conceptually:

- Reservation status terminal but missing matching `inventory_reservation_events` row
- Event exists but status still `active`

**Actions:** Preserve rows; open Eng ticket; do not delete events to “sync.” Forward-fix may insert compensating audit via controlled migration/RPC later—not ad-hoc SQL in prod from this doc.

---

## 8. Financial / payment-state ambiguity

If operators disagree whether an order “should” keep stock:

1. Check payment_attempts / payment_status (foundation may be deferred-only).
2. Escalate to **payments owner** + Commerce — do not treat deferred stub as paid.
3. Inventory decision: expire-by-TTL or cancel-release only.
4. Never create settlement/payout actions from reservation state (see settlements architecture docs; not live).

---

## 9. Forbidden actions

- Direct `UPDATE product_inventory SET reserved = …` in prod without security-reviewed maintenance window and GUC-controlled path
- `DELETE FROM inventory_reservations`
- Editing audit events
- Destructive migration rollback that drops ledgers with live data
- Using seller catalog forms to “zero reserved” as a repair (should fail or be ignored)

---

## 10. Compensating / forward-fix mindset

| Problem | Prefer |
|---------|--------|
| Bug in release | Patch RPC; retest; expire backlog |
| Drift | Controlled rebuild procedure designed by Eng (future), dual-approved |
| Bad enablement | Gate OFF / kill switch |
| Bad orders | Cancel via product RPCs; support comms |

---

## 11. Evidence to attach to recovery tickets

- Reservation tokens
- Before/after active counts
- Expire RPC return values
- Gate state
- Whether kill switch was used
