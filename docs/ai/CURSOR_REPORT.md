# CURSOR_REPORT — UMTUBA AI Core Platform Foundation V1

## Summary

Implemented the shared **AI Core Platform Foundation V1** on branch `office/ai-core-platform-foundation-v1`. One server-side gateway, provider/model registry, deterministic router, versioned prompts, trusted context envelope, permission-aware read-only tools, run lifecycle, usage/cost accounting, tracing, safety hooks, session/memory/evaluation foundations, admin diagnostics at `/admin/ai`, and Product Draft Assistant reference consumer on the seller product editor. No broad agents. No frozen Commerce/Learning architecture doc edits. Migration `20260871` local only (not remote-applied).

## Exact files changed

### Created
- `lib/ai/**` (types, config, errors, context, router, gateway, lifecycle, usage, tracing, safety, session, memory, evaluation, diagnostics, productDraftAssistant, prompts, providers, tools, tests, README)
- `supabase/migrations/20260871_ai_core_platform_foundation_v1.sql`
- `app/actions/aiProductDraft.ts`
- `app/components/store/ProductDraftAssistantPanel.tsx`
- `app/admin/ai/page.tsx`

### Modified
- `app/seller/store/products/[productId]/edit/page.tsx`
- `app/admin/store/AdminStoreShell.tsx`
- `app/lib/nav/routes.ts`
- `.env.example`
- `vitest.config.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/SESSION_HANDOFF.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

- `20260871_ai_core_platform_foundation_v1.sql` — `ai_sessions`, `ai_runs`, `ai_run_events`, `ai_usage_records`, `ai_evaluations`, `ai_memory_records` with FORCE RLS, owner select, admin select via `is_platform_admin` when present, no authenticated writes.
- **Remote apply: NOT performed** (requires explicit approval).

## Security review

- All execution server-side through gateway.
- Provider keys server-only (`OPENAI_API_KEY`, never `NEXT_PUBLIC_*`).
- Client cannot set system prompts, arbitrary tools, or elevate roles.
- Mutating tools denied in V1.
- Trace redaction for secrets / confidential fields.
- Admin diagnostics gated by `assertPlatformAdminDb`.
- Product draft suggestions never auto-save; cannot alter price/inventory/publish.

## Tests

- `lib/ai/aiPlatformFoundation.test.ts` — **31 passed**
- Existing AI tutor + seller catalog + nav smoke — **passed**
- `npx tsc --noEmit` — **pass**
- `npm run build` — **pass**

## TypeScript

pass

## Build

pass (`BUILD_OK`), includes `/admin/ai` and seller product edit consumer.

## git diff --check

pass on task files

## Open issues / limitations

- Live provider requires `OPENAI_API_KEY` + `UMTUBA_AI_MODE=live`
- Stub mode only when explicitly allowed / test
- DB persistence tables not yet wired as primary sink (in-process buffers + migration ready)
- Learning AI Tutor remains a separate stub RPC conversation UX — future work should consume this gateway
- No streaming, no autonomous agents, no customer AI billing
