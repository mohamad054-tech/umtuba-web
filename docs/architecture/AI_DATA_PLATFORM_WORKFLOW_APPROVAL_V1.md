# AI Data Platform Workflow & Dataset Approval V1

## Status

Implemented on `office/platform-ai-data-platform-workflow-v1`
(base AI Data Platform Foundation `b33054fa`; note: requested `3b3054fa` was a
typo). No training. No fine-tuning. No inference. No benchmark execution.
Migration `20260878` created locally only — **not remote-applied**.

## Goal

Prove the AI data ecosystem works end-to-end as a governed Dataset lifecycle
without performing any model training.

## Workflow

```
Knowledge Sources → Knowledge Acquisition → Rights → Privacy → Quality
  → Eligibility → Dataset Builder → Dataset Version → Approval
  → Model Registry Candidate → Experiment Candidate (no training)
```

## Runtime

- Foundation registry: `data/ai-data-platform/registry.json`
- Workflow store: `data/ai-data-platform/workflow.json`
- Code: `lib/aiDataPlatform/workflow/**`

## Approval states

`draft` → `review` → `needs_changes` | `approved` | `rejected` → `archived`

Never automatic. Every transition audited.

## Admin UI

`/admin/ai-data/review` · `/admin/ai-data/audit` (+ existing registry pages)

## Validation gates for Approved

- Quality minimum
- Required metadata
- No critical privacy blockers
- No critical rights blockers (unknown / restricted / expired / unapproved assets)
- Eligibility valid
- All workflow checks recorded as pass
