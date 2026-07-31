# Private AI Inference Request Contracts V1

## Status

Implemented on `office/platform-private-ai-inference-request-contracts-v1`
(base `517cff5` Runtime Operations & Failover). **Contracts only** — no model
execution, weights, training, fine-tuning, WebSocket/SSE, or provider calls.

## Adds

- Inference request record (ids, capability, runtime, provider, tenant, etc.)
- Fail-closed validation + authorization against Permission model
- Request lifecycle (pending → … → completed/failed/cancelled/rejected/timed_out)
- Structured output + streaming **metadata** contracts
- Metrics / audit linkage
- Admin list at `/admin/private-ai/inference`

## Storage

`registry.json` schemaVersion **5** adds `inferenceRequests[]`. No SQL migration.
