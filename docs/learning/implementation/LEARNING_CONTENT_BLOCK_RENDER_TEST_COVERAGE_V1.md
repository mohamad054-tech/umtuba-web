# Learning Content Block Render Test Coverage V1

Capability: `learning.learner.content_block_render_test_coverage_v1`
Base tip: Production smoke gate onto SoT (`e334f00`)
Branch: `office/learning-content-block-render-test-coverage-v1`

## Purpose

Add dedicated deterministic coverage for the existing Learning content-block
render helpers (`lib/learning/contentBlockRender.ts`) and the React renderer
contracts (`app/components/learning/ContentBlockRenderer.tsx`).

Tests-only / low-risk. No Learning business redesign. No migrations.

## Covered (current proven behavior)

- rich_text / heading / quote / callout / divider
- image / video / audio (http(s) URL gate)
- code_block / external_link
- transcript / pdf / downloadable_file
- unknown / reserved / deferred types fail closed
- missing fields, empty content, malformed values
- HTML/script escaping helpers (no `dangerouslySetInnerHTML`)
- deterministic helper outputs
- published creatable ordering by `position` before render

## Explicitly not invented

- `list`, `embed`, `html` (deferred / unsupported)
- assessment / activity reference block types (not part of content-block render)

## Gate commands

```bash
npx vitest run lib/learning/contentBlockRender.test.ts
npx vitest run lib/learning/learnerDelivery.test.ts lib/learning/lessonContentBlocksFoundation.test.ts
npx tsc --noEmit
```
