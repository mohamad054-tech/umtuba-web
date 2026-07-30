# AI Data Platform & Model Registry Foundation V1

## Status

Implemented on `office/platform-ai-data-platform-foundation-v1`
(base Knowledge Acquisition `4484144`). No training. No fine-tuning. No
inference changes. Migration `20260877` created locally only — **not
remote-applied**.

## Goal

Internal backbone for every future UMTUBA AI model: register datasets,
versions, evaluation sets, experiments, models, and promotion gates — without
executing training or changing runtime inference.

## Pipeline

```
AI Data Platform
  → Dataset Registry
  → Dataset Builder (contracts)
  → Evaluation Sets (contracts)
  → Experiment Registry (records only)
  → Model Registry
  → Promotion Gates (never automatic)
  → Production Models (lifecycle metadata)
```

## Runtime

`data/ai-data-platform/registry.json` via `lib/aiDataPlatform/**`

## Admin UI (read-only, platform-admin)

`/admin/ai-data` · datasets · versions · experiments · models ·
evaluation-sets · promotion

## Rights integration

Uses Knowledge Acquisition rights + eligibility. Unknown/restricted datasets
cannot enter experiments (`assertDatasetEligibleForExperiment`).

## Promotion checklist (all required)

dataset · rights · quality · evaluation · human

## Migration note

`20260877_ai_data_platform_foundation_v1.sql` adds `ai_*` tables with FORCE
RLS and admin-select policies. Does not alter prior migrations.

## Follow-on

Workflow & Dataset Approval V1 (`office/platform-ai-data-platform-workflow-v1`)
adds governed approval lifecycle, audit trail, and candidate contracts on top
of this foundation. See `AI_DATA_PLATFORM_WORKFLOW_APPROVAL_V1.md`.
