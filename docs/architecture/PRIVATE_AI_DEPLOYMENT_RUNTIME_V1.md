# Private AI Deployment & Runtime V1

## Status

Implemented on `office/platform-private-ai-deployment-runtime-v1` (base
`eb9e743` Private AI Workflow & Lifecycle). Contracts only — **no** training,
fine-tuning, inference, weights, provisioning, or live host probes.

## What this adds

- Deployment state machine (`pending` → `provisioning` → `ready` …)
- Runtime records with health snapshots, availability, capability mapping
- Runtime readiness gate (lifecycle / capability / deployment / permission /
  hardware)
- Selection + failover policy (provider, capability, hardware, region, cost,
  priority)
- Admin diagnostics at `/admin/private-ai/runtime`

## Persistence

`data/private-ai/registry.json` schemaVersion **3** adds `runtimes[]`.
Legacy v1/v2 registries migrate with empty runtimes.
