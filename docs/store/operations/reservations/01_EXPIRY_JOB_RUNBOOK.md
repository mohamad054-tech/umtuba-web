# UMTUBA Store — Reservation Operations V1
## 01 · Expiry Job Runbook

**Document type:** Operational runbook (documentation only)
**Status:** Scheduler **not active**. This runbook prepares Ops before commerce confirm enablement.
**Canonical RPC:** `public.expire_store_inventory_reservations(p_limit integer default 500)`
**Canonical TTL setting:** `store_commerce_settings.reservation_ttl_minutes` (implementation default **45** minutes)
**Related:** Commerce Safety & Inventory Reservation V1 (`docs/store/implementation/COMMERCE_SAFETY_INVENTORY_V1.md`)

> Do **not** claim that a cron/GitHub Action/worker is already running. Expiry scheduling is **operationally pending**.

---

## 1. Purpose

`expire_store_inventory_reservations`:

1. Selects up to `p_limit` rows where `inventory_reservations.status = 'active'` and `expires_at <= now()`
2. For each row (under row locks): marks reservation **`expired`**, decrements `product_inventory.reserved`, writes an audit event
3. **MUST NOT** cancel, delete, or mutate `orders`

Goal: return sellable capacity after abandoned unpaid pending-payment holds without inventing payment finality.

---

## 2. Contract facts (implementation)

| Topic | Reality |
|-------|---------|
| EXECUTE grant | `service_role` only |
| Default batch | `p_limit = 500` (clamped conceptually 1…5000 in SQL) |
| Concurrency | `FOR UPDATE SKIP LOCKED` — overlapping runs skip locked rows |
| Orders | Untouched by expiry |
| Live payments | Not required for expiry; deferred payment stubs are unrelated |
| Gate | Expiry works whether commerce gate is ON or OFF |

---

## 3. Recommended invocation frequency

| Environment | Proposal (starting point) | Rationale |
|-------------|---------------------------|-----------|
| Staging | Every **1–2 minutes** | Fast feedback while testing |
| Production (pre-enable / shadow) | Every **2–5 minutes** | Observe lag vs 45m TTL |
| Production (commerce ON) | Every **1–2 minutes** | Keep expired→released lag low |

**Rule of thumb:** cadence ≪ TTL. With TTL 45m, a 1–5 minute job is sufficient; do not rely on hourly runs.

*(If product later changes TTL to 30m via settings, keep cadence ≪ TTL; do not hardcode minutes in the worker.)*

---

## 4. Batch sizing

| `p_limit` | When |
|-----------|------|
| 100–200 | First production shadow / low pool |
| **500** (default) | Normal steady state |
| 1000–2000 | Catch-up after outage (monitor duration/locks) |
| Avoid >5000 | SQL clamps; prefer multiple invocations |

Prefer many small bounded calls over one huge call.

---

## 5. Bounded retries

Worker/wrapper SHOULD:

1. Call RPC once per tick
2. On transient DB errors: retry **≤3** with exponential backoff (e.g. 1s, 3s, 10s)
3. On logical success (`expired_count` returned): no retry of same batch
4. Never infinite-loop on permanent errors (permissions, missing function)

Record attempt count + last error code in ops logs.

---

## 6. Service-role execution boundary

| Allowed | Forbidden |
|---------|-----------|
| Backend job with `service_role` key in vault | Browser / seller / buyer clients |
| Break-glass DB operator session using service role (audited) | Embedding service_role in Next.js public env |
| CI secret store → runner only | Sharing key in chat/tickets |

Expiry helpers that mutate `reserved` rely on SECURITY DEFINER + transaction-local GUC; clients cannot call the expire RPC.

---

## 7. Timeout behavior

- Set statement/command timeout above expected p95 batch duration (start with **30s**, tune).
- If timeout fires mid-batch: committed rows stay expired; remaining active rows retry next tick (`SKIP LOCKED` safe).
- Do not lower DB `statement_timeout` globally without DBA review.

---

## 8. Overlapping-run prevention

| Layer | Behavior |
|-------|----------|
| SQL | `SKIP LOCKED` → second runner skips in-progress rows |
| Worker | Prefer single active schedule (one queue consumer) |
| Optional | Advisory lock / lease key in worker (not implemented today) |

Overlaps are **safe but wasteful**; design for at-most-one preferred, tolerate overlap.

---

## 9. Lock / SKIP LOCKED expectations

- Expiry locks reservation rows then inventory rows for decrement.
- Checkout confirm locks inventory for reserve.
- Contention on **hot variants** may delay expiry or confirm briefly; neither should corrupt counters if contracts hold.
- Monitor lock wait / deadlocks (see `03`, `06`).

---

## 10. Failure handling

| Failure | Action |
|---------|--------|
| RPC missing / migration not applied | Page Commerce Ops; **do not enable gate** |
| Permission denied | Rotate/fix service_role grants; halt job |
| Elevated error rate | Alert; keep gate OFF or turn OFF if commerce already on |
| Partial batch | Next tick continues; verify with read queries (`05`) |

---

## 11. Logging requirements

Each invocation SHOULD log (structured):

- `job_id` / `run_id`
- `p_limit`
- `expired_count`
- duration_ms
- error (if any)
- environment (`staging`/`production`)
- git/migration revision if available

Do not log buyer PII or full order payloads.

---

## 12. Dry-run / read-only verification (no expire call)

Before enabling a scheduler, operators SHOULD run **read-only** checks:

1. Count `active` reservations with `expires_at <= now()` (backlog).
2. Count `active` with `expires_at > now()` (healthy holds).
3. Spot-check: for sample variants, compare `product_inventory.reserved` vs sum of `active` reservation quantities (drift screen).
4. Confirm RPC exists and EXECUTE is service_role-only (catalog/grants review).

There is **no** built-in dry-run flag on the RPC today—do not invent writes for “preview.”

---

## 13. Manual invocation procedure (controlled)

**Preconditions:** Migration `20260819` applied; change ticket; dual control if production.

1. Authenticate as approved service-role channel (vault-backed).
2. Invoke `expire_store_inventory_reservations(100)` (small batch).
3. Record returned integer count.
4. Re-run read-only backlog query; expect decrease.
5. For one expired `reservation_token`, confirm status `expired`, `released_at` set, event `expired` present, and variant `reserved` decreased consistently.
6. Escalate if count is 0 while backlog > 0 (locks, wrong DB, clock skew).

---

## 14. Confirming reserved counters released correctly

For a known expired reservation:

- Status is `expired` (not still `active`)
- Matching `inventory_reservation_events.event_type = 'expired'`
- `product_inventory.reserved` equals sum of remaining **active** quantities for that variant/warehouse (within known holds)
- Order row **still exists** (expiry must not cancel orders)

---

## 15. Scheduler options (compare — do not implement here)

| Option | Pros | Cons | Fit |
|--------|------|------|-----|
| **GitHub Actions** scheduled workflow | Familiar; audited YAML; easy secrets | Not a hard realtime SLA; runner cold starts | Good for staging / early prod if ≤2–5 min OK |
| **Supabase scheduled jobs / `pg_cron`** (if approved) | In-DB proximity; low latency | Needs platform approval; blast radius in DB | Strong prod candidate **if** org allows |
| **External worker** (Fly/Cloud Run/K8s) | Full control, metrics, leases | More ops surface | Best at scale |
| **Manual operator** | Simple | Does not meet enablement bar alone | Break-glass / staging only |

### Recommendation

- **Staging:** GitHub Actions every 2 minutes **or** approved `pg_cron`.
- **Production:** Prefer **approved in-platform scheduler (`pg_cron` / Supabase cron) or a small external worker** with metrics; keep GitHub Actions as backup/failover.
- **Manual-only is insufficient** for commerce ON.

**Do not implement any scheduler in this documentation task.**

---

## 16. Open decisions

| ID | Topic |
|----|--------|
| OD-RO01 | Production scheduler platform (GHA vs pg_cron vs worker) |
| OD-RO02 | Whether TTL stays 45m or product moves to 30m via settings |
| OD-RO03 | Max catch-up `p_limit` under incident |
