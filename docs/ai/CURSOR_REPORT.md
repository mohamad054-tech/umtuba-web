# CURSOR_REPORT — AI Unified Capability Execution V1

## Summary

Unified Capability Execution Engine under `lib/ai/execution/` chains catalog → policy → quota → orchestration → routing → adapter → invocation planning. `aiService.runCapability` enters only via `executeUnifiedCapability`. Admin `/admin/ai/execution-pipeline`. No live inference.

## Migrations

None.

## Security

Server-side only; admin gated; no secrets/prompts; no provider calls in unified layer.

## Open issues

- Domain runners after readiness may still use gateway stubs (unchanged Learning/Commerce modules)
- Adapter/Invocation are planned, not executed
