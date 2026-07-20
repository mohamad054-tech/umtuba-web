# UMTUBA Store — Reservation Operations V1
## 03 · Monitoring and Alerts

**Document type:** Ops monitoring design
**Status:** Proposed instrumentation — not claimed as live dashboards
**Related:** `01_EXPIRY_JOB_RUNBOOK.md`, `04_INCIDENT_RESPONSE.md`

---

## 1. Metric catalog

| Metric | Description | Source ideas |
|--------|-------------|--------------|
| `reservations_active` | Count `status=active` | DB gauge |
| `reservations_expired_unreleased_backlog` | Active with `expires_at <= now()` | DB gauge (expiry lag) |
| `reservations_stuck` | Active older than TTL + grace (e.g. TTL+15m still active) | DB gauge |
| `reserved_counter_drift` | Per-variant abs(`reserved` − sum(active qty)) > 0 | Periodic job |
| `cancel_release_failures` | Cancel RPC errors / mismatches after cancel | App + DB |
| `expiry_batch_duration_ms` | Expire RPC wall time | Worker |
| `expiry_rows_processed` | Returned `expired_count` | Worker |
| `expiry_errors` | Failed invocations | Worker |
| `commerce_gate_enabled` | DB `checkout_confirm_enabled` | DB / admin poll |
| `commerce_emergency_disable` | Env kill switch effective | App config probe |
| `confirm_failure_rate` | Failed confirms / attempts | App |
| `insufficient_stock_rate` | Inventory/reservation insufficient errors | App |
| `idempotency_conflicts` | Same-key confirm replays vs new creates | App/DB |

Optional: confirmation success count, multi-store confirm latency, lock wait time.

---

## 2. Proposed starting thresholds

**Label: proposed starting thresholds — tune after baseline; not proven production SLOs.**

| Metric | Warning | Critical |
|--------|---------|----------|
| Expiry backlog (`expired_unreleased`) | > 50 for 10m | > 200 for 10m **or** any growth while job erroring |
| Stuck reservations | > 10 | > 50 |
| Expiry errors | > 1 in 15m | > 3 consecutive job failures |
| Expiry duration | p95 > 10s | p95 > 25s |
| Reserved drift variants | > 0 for 30m | > 5 variants or any drift on SKU with sales |
| Confirm failure rate | > 5% (10m) | > 15% (10m) with gate ON |
| Insufficient-stock rate | Spike > 3× baseline | Sustained spike + oversell reports |
| Gate unexpectedly ON | N/A | ON outside change window |
| Emergency disable unexpectedly ON | N/A | ON outside incident |

When gate is OFF, treat confirm failure rate as informational only.

---

## 3. Dashboards (recommended panels)

1. **Gate panel** — DB enabled + emergency env
2. **Reservation health** — active, backlog, stuck
3. **Expiry job** — runs, duration, rows, errors
4. **Inventory integrity** — drift heatmap by variant
5. **Checkout safety** — confirm errors, stock errors, idempotent replays

---

## 4. Alert routing

| Severity | Route |
|----------|-------|
| Warning | Commerce operator Slack/email |
| Critical | On-call + page; consider gate OFF (`04`) |

Every critical alert SHOULD link to the matching playbook scenario in `04_INCIDENT_RESPONSE.md`.

---

## 5. What not to alert on (yet)

- Payment capture rates (no live provider)
- Settlement/payout failures (not implemented)
- Reservation **consumed** transitions (future settle path)

---

## 6. Open decisions

| ID | Topic |
|----|--------|
| OD-RO04 | Metrics backend (Datadog / Grafana / Supabase metrics) |
| OD-RO05 | Exact backlog thresholds after 2 weeks baseline |
