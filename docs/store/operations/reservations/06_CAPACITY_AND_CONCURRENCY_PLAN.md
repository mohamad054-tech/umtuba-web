# UMTUBA Store — Reservation Operations V1
## 06 · Capacity and Concurrency Plan

**Document type:** Capacity / performance planning
**Status:** Guidance for beta → growth; not a load-test report

---

## 1. Expected locking behavior

| Path | Locks |
|------|-------|
| Confirm / order create + reserve | Inventory rows `FOR UPDATE`; order/quote rows as designed |
| Cancel release | Order row; active reservations; inventory |
| Expire | Reservation rows `FOR UPDATE SKIP LOCKED`; then inventory |

Checkout confirm is **atomic across stores** in a quote: lock duration spans all store groups in one transaction—keep carts bounded.

---

## 2. Hot variants

High-demand SKUs concentrate locks on one `product_inventory` row (`warehouse_key=default`).

**Mitigations (ops/product):**

- Avoid artificially tiny `on_hand` during launches without rate limits
- Prefer shorter TTL only via settings change with sign-off (default **45m**)
- Watch lock wait + insufficient-stock rate (`03`)
- Future: multiple warehouses (out of current V1 scope)

---

## 3. Multi-store checkout lock duration

- Longer transactions under multi-store carts
- Encourage reasonable cart sizes in UX copy
- Monitor confirm p95 latency when gate ON

---

## 4. Batch expiry contention

- `SKIP LOCKED` reduces blocker risk with confirms
- Large `p_limit` increases transaction time → keep batches moderate (`01`)
- During catch-up, prefer parallel **invocations** only if pool allows; usually serial ticks are enough

---

## 5. Index usage expectations

Expect planners to use:

- Active reservations by `expires_at` (partial active index)
- Reservations by `order_id` / `variant_id`
- Unique `reservation_token`, unique `order_item_id`

Verify with `EXPLAIN` in staging after migrate—not in this doc as live proof.

---

## 6. Safe `p_limit` sizing

| Phase | `p_limit` |
|-------|-----------|
| Shadow | 100–200 |
| Steady | 500 |
| Incident catch-up | 1000–2000 with duration watch |
| Avoid | Multi-thousand if duration → timeout |

---

## 7. Connection-pool considerations

- Expiry worker: **1–2** dedicated connections preferred
- Do not run expire on every web request
- Separate pool from user traffic when possible
- Service-role usage must not starve authenticated pool

---

## 8. Retry / backoff

- Worker: ≤3 retries on transient errors (`01`)
- Clients: rely on idempotency keys; backoff on 5xx
- Avoid thundering herd confirm storms after outage—feature flag / gate helps

---

## 9. Deadlock monitoring

- Alert on deadlock rate increases involving `product_inventory` / `inventory_reservations`
- Capture failing SQL fingerprints
- Escalate to DBA; consider gate OFF if confirms fail widely

---

## 10. Load-test scenarios (staging)

1. Parallel confirms same variant (stock=1..N)
2. Confirm vs expire race on near-expiry reservation
3. Multi-store confirm success/fail atomicity
4. Cancel storm releasing many lines
5. Expiry catch-up of 10k expired-active rows in batches
6. Idempotent confirm replay

Pass criteria: no oversell beyond rules; no double reserve on retry; backlog drains.

---

## 11. Scaling toward millions of reservations

| Lever | Direction |
|-------|-----------|
| Partitioning / archival | Archive terminal reservations after retention (future) |
| TTL | Shorter TTL reduces active set (product OD) |
| Expiry cadence | Keep ≪ TTL |
| Read replicas | Metrics/reporting only; expire on primary |
| Sharding | Not required for beta |

Beta may hold 10^4–10^5 active rows; millions lifetime rows need archival design before full scale.

---

## 12. Open decisions

| ID | Topic |
|----|--------|
| OD-RO06 | Archival retention for terminal reservations |
| OD-RO07 | Target confirm p95 under load |
