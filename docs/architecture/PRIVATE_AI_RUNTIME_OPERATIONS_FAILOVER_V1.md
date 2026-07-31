# Private AI Runtime Operations & Failover V1

## Status

Implemented on `office/platform-private-ai-runtime-operations-failover-v1`
(base `cf3de8d` Deployment & Runtime). Pure contracts + service operations —
**no** live pings, cron, workers, training, fine-tuning, or inference.

## Adds

- Heartbeat recording (source, latency, consecutive counters)
- Failure detection policy (missed HB, failure thresholds)
- Failover with cooldown / anti-oscillation / no-fallback
- Recovery with healthy observation threshold + grace period
- Maintenance enter/exit (blocks routing)
- Operational incidents history
- Ops permissions + Admin UI actions

## Storage

`registry.json` schemaVersion **4**: `runtimeIncidents[]`, `runtimeOpsPolicy`,
per-runtime `ops`. No SQL migration (file SoT).
