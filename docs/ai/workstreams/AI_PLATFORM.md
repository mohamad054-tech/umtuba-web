# AI Platform Workstream (Desktop-owned)

**Branch:** `office/ai-core-platform-foundation-v1`

**Ownership:** Desktop owns Shared AI Core, service boundary, providers, persistence, domain capabilities without UI.

**Laptop owns:** all user-facing AI presentation/integration, Home, Navigation, Creator, App Shell, shared UI.

## Status

Shared AI Core Foundation V1 implemented and aligned to cross-device ownership boundaries.

## Public service boundary

```
UI → typed contract (lib/ai/contracts/public.ts)
  → aiService.runCapability (lib/ai/services/aiService.ts)
  → Shared AI Core gateway
  → Provider adapter
```

UI may receive only: capability id, validated input, bounded context refs, typed result, stable error codes, run id, retryability.

UI must not receive: provider secrets, raw prompts, routing internals, tool executors, private traces, raw provider responses.

## Shared AI Core layout

```
lib/ai/
  contracts/     public + internal types/errors
  services/      aiService.runCapability
  gateway/       executeAiGateway
  providers/     OpenAI-compatible + stub adapters
  models/        provider/model registry
  routing/       deterministic router
  prompts/       versioned prompt registry
  context/       trusted context envelope
  tools/         permission-aware tool registry
  runs/          run lifecycle
  usage/         usage/cost accounting
  tracing/       redacted trace events
  safety/        pre/post policy hooks
  sessions/      session boundary
  memory/        memory policy/interface
  evaluations/   evaluation hooks
  capabilities/  domain AI (commerce, admin) — no React/UI
```

Empty domain folders are intentionally omitted until needed.

## Reference capability

`commerce.product_draft_assistant` — server-side only, read-oriented suggestions, never mutates price/inventory/publish, never auto-saves. No seller editor UI in this Desktop task.

## Diagnostics

Isolated privileged route `/admin/ai` (platform admin DB gate). Does not modify Navigation, App Shell, or global styles. Admin Store shell left untouched.

## Persistence

Migration `20260871_ai_core_platform_foundation_v1.sql` — local only, not remote-applied.

## Config (variable names only)

`UMTUBA_AI_MODE`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `UMTUBA_AI_ALLOW_STUB`, `UMTUBA_AI_TIMEOUT_MS`, `UMTUBA_AI_MAX_INPUT_CHARS`, `UMTUBA_AI_MAX_CONTEXT_CHARS`, `UMTUBA_AI_RATE_LIMIT_PER_MINUTE`

## Architecture enforcement

Domain AI modules do not import other Domain AI trees. Architecture tests enforce this.

## Next backend AI capability

Wire Learning AI Tutor stubs to `aiService.runCapability` with a versioned Learning prompt (still no UI work on Desktop).
