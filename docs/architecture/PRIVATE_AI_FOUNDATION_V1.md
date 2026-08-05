# Private AI Foundation V1

## Status

Implemented on `office/platform-private-ai-foundation-v1`
(base AI Data Platform Workflow `2344c1b`). No training. No fine-tuning. No
inference. No model weights. Migration `20260879` created locally only — **not
remote-applied**.

## Goal

Architecture for UMTUBA to eventually own and operate a private AI ecosystem —
registries and contracts only.

## Architecture

```
Private AI Registry
  ├─ Models (private / external / local / experimental / archived)
  ├─ Capabilities (translation, coding, learning, …)
  ├─ Model families (foundation, specialized, adapter, …)
  ├─ Hardware contracts (CPU/GPU/RAM/VRAM/container — no provisioning)
  ├─ Deployment profiles (dev / internal / testing / production / offline / air-gapped)
  ├─ Routing contracts (external / local / private / fallback — no runtime router)
  ├─ Permissions (model / capability / dataset / experiment / audit)
  └─ Lifecycle metadata (draft → … → production → archived)
```

## Runtime

`data/private-ai/registry.json` via `lib/privateAi/**`

## Admin UI (read-only)

`/admin/private-ai` · models · capabilities · deployments · hardware ·
routing · lifecycle
