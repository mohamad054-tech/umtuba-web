# Knowledge Acquisition Platform Foundation V1

## Status

Implemented on `office/platform-knowledge-acquisition-foundation-v1`
(base Learning Translation Studio `6a3cb3d`). No model training. Migration
`20260876` created locally only — **not remote-applied**.

## Goal

Long-term governed knowledge ecosystem: acquire, classify, evaluate, govern,
and reuse assets UMTUBA is legally allowed to use. Feeds future AI models as
**metadata and eligibility**, not as automatic training runs.

## Core principles

- Nothing becomes reusable automatically
- Everything passes governance
- Fail closed: unknown/restricted rights never training-eligible
- No scraping, no external dataset download, no third-party API acquisition
- No model training or fine-tuning in this milestone
- Runtime V1: `data/knowledge-acquisition/registry.json`

## Architecture

```
Knowledge Acquisition service
  ├─ Source registry (kinds: internal, partner, purchased, open, …)
  ├─ Rights engine (owner, license, training/customization/redistribution)
  ├─ Acquisition pipeline (discovered → … → dataset_eligible | rejected)
  ├─ Quality engine (deterministic V1 dimensions)
  ├─ Privacy layer (heuristic contracts)
  ├─ Classification (domains)
  ├─ Dataset registry (versioned, linked assets)
  ├─ Knowledge graph contracts (nodes/edges lineage)
  ├─ Acquisition history
  └─ registry.json file store

Admin UI (read-only, platform-admin gated):
  /admin/knowledge
  /admin/knowledge/sources
  /admin/knowledge/datasets
  /admin/knowledge/rights
  /admin/knowledge/quality
  /admin/knowledge/classification
  /admin/knowledge/eligibility
  /admin/knowledge/history
```

## Eligibility flags

`eligible_for_internal_reuse` · `eligible_for_model_customization` ·
`eligible_for_training` · `eligible_for_redistribution` ·
`dataset_eligible` · `ineligible`

## Pipeline stages

discovered → imported → validated → rights_checked → quality_checked →
privacy_checked → deduplicated → classified → approved → dataset_eligible
(| rejected)

## Migration note

`20260876_knowledge_acquisition_foundation_v1.sql` adds
`knowledge_*` tables with FORCE RLS and admin-select policies only.
Does not alter Translation Studio or AI Core tables.
