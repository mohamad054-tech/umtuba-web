# UMTUBA AI Hub & AI Operations Architecture V1

**Status:** Architecture reference (docs only)
**Branch:** `office/ai-core-provider-foundation-v1`
**Base:** `0dc551f` — knowledge and memory foundation
**Date:** 2026-07-29

This document is the official reference that unifies UMTUBA AI surfaces.
It does **not** implement UI, providers, migrations, or behavioral changes.

---

## 1. Purpose

UMTUBA AI is not a single assistant feature. It is a platform of shared capabilities consumed by many products. This architecture defines:

1. **UMTUBA AI Hub** — product-facing AI entry map for end users / domain surfaces.
2. **AI Operations Console** — operator-facing control plane for Shared AI Core.
3. How both relate to **Shared AI Core**, **Domain consumers**, and request lifecycle.

---

## 2. Architecture diagram

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         UMTUBA Product Surfaces                          │
│  Video · Discover · Learning · Commerce · Creator · Ads · World · …     │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         UMTUBA AI Hub (product map)                      │
│  Assistant · Learning · Creator · Commerce · Marketing · Ads · Search    │
│  World · Games · Settings · My AI                                        │
│  (UX / navigation / product contracts — Laptop-owned presentation)       │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ typed Domain AI adapters / server actions
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    Domain AI Capabilities (server)                       │
│  learning.tutor · commerce.product_draft · future domain modules         │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ aiService.runCapability only
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         Shared AI Core (Desktop)                         │
│  Gateway · Providers · Model Registry · Routing Policies                 │
│  Usage/Cost · Personalization · Knowledge/Memory · Safety · Prompts      │
│  Sessions · Runs · Tracing · Tools · Evaluations                         │
└───────────────┬───────────────────────────────┬──────────────────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────┐     ┌────────────────────────────────────────┐
│  Provider adapters        │     │  AI Operations Console (ops map)       │
│  stub / openai / future   │     │  Providers · Models · Routing · Usage  │
│                           │     │  Cost · Quotas · Knowledge · Memory    │
│                           │     │  Personalization · Recommendations     │
│                           │     │  Observability · Flags · Prompts       │
│                           │     │  Model versions · Safety · Audit       │
│                           │     │  Experiments                           │
│                           │     │  (admin UI later — not built in V1)    │
└───────────────────────────┘     └────────────────────────────────────────┘
```

### Relationship summary

| Layer | Role |
| --- | --- |
| **Shared AI Core** | Canonical execution + registries + policies. Single source of truth. |
| **AI Hub** | Product taxonomy / user-facing AI destinations. Does not own providers. |
| **AI Operations Console** | Operator taxonomy for configuring/observing Core. Does not own product UX. |
| **Consumers** | Domain capabilities + product UIs that call Core via stable boundaries. |

**Rule:** Hub and Ops Console are **maps and ownership contracts**. Implementation of their UIs is out of scope for this document.

---

## 3. UMTUBA AI Hub (product modules)

AI Hub is the official catalog of AI product areas. Each module may later have its own UX, but all AI execution must flow through Shared AI Core.

| Hub module | Intent | Primary consumers (later) | Core dependencies |
| --- | --- | --- | --- |
| **AI Assistant** | Cross-product conversational help | Home, global shell | Gateway, Knowledge/Memory, Safety, Sessions |
| **AI Learning** | Tutor, practice, explanations | Learning | Learning capabilities, Knowledge (course), Memory, Safety |
| **AI Creator** | Creator tooling assistance | Creator studio | Gateway, Knowledge (creator), Prompts |
| **AI Commerce** | Seller/buyer AI aids | Commerce storefront/ops | Commerce capabilities, Knowledge (commerce) |
| **AI Marketing** | Campaign/copy assistance | Marketing surfaces | Gateway, Prompts, Safety |
| **AI Ads** | Ad creative / targeting aids | Ads | Gateway, Personalization hooks, Safety |
| **AI Search** | Query understanding / ranking aids | Search | Personalization, Knowledge retrieval contracts |
| **AI World** | World/map contextual AI | World | Knowledge (world), Memory |
| **AI Games** | Game assistant / generation aids | Games | Gateway, Safety |
| **AI Settings** | User AI preferences / controls | Account settings | Preference memory, Feature flags (ops) |
| **My AI** | Personal AI space (history, prefs, artifacts) | Profile / My AI | Memory, Sessions, Usage (user-safe views only) |

### Hub boundaries

- Hub modules **must not** call provider SDKs or hold API keys.
- Hub modules **must not** select models by hardcoding provider/model ids.
- Hub UI (when built) talks only to **named server actions / Domain AI adapters**.
- Hub does not replace Learning/Commerce domain ownership of product rules.

---

## 4. AI Operations Console (ops modules)

Ops Console is the official catalog of operator concerns over Shared AI Core. V1 defines the map only — no admin UI in this phase.

| Ops module | Intent | Backed by Core area (today / planned) |
| --- | --- | --- |
| **Providers** | Register/enable provider adapters | Provider Foundation |
| **Models** | Catalog, enable/disable, limits | Model Registry |
| **Routing** | Preferred/fallback/deterministic policies | Routing Policy Engine |
| **Usage** | Request-level usage records | Usage Tracker |
| **Cost** | Estimated/reported cost | Cost Tracker |
| **Quotas** | Rate/budget limits (future enforcement) | Usage hooks + config |
| **Knowledge** | Knowledge catalog ops | Knowledge Registry |
| **Memory** | Memory kind policies / inspection | Memory Registry + `memory/policy.ts` |
| **Personalization** | Profiles / signals / ranking contracts | Personalization Foundation |
| **Recommendations** | Candidate sources / diversity / scoring | Personalization Engine |
| **Observability** | Runs, traces, diagnostics | Runs / Tracing / Admin diagnostics |
| **Feature Flags** | Kill-switches / gradual rollout | Config + future flags store |
| **Prompt Versions** | Prompt registry lifecycle | Prompt registry |
| **Model Versions** | Model descriptor versions / rollout | Model Registry metadata (future) |
| **Safety** | Pre/post policy, redaction | Safety hooks |
| **Audit** | Who changed what / run audit trail | Tracing + future audit log |
| **Experiments** | A/B routing/prompt experiments | Evaluations + future experiment layer |

### Ops boundaries

- Ops Console may read Core diagnostics and configuration surfaces.
- Ops Console must not become a second AI runtime.
- Ops Console must not expose provider secrets to browsers (`NEXT_PUBLIC_*` forbidden for keys).
- Product Hub and Ops Console stay separate IA trees.

---

## 5. Shared AI Core (already landed — do not redesign here)

Canonical server-side stack (Desktop-owned):

1. Provider Foundation
2. Model Registry
3. Routing Policies
4. Usage & Cost Tracking
5. Personalization & Recommendation Foundation
6. Knowledge & Memory Foundation
7. Existing: Gateway, Prompts, Safety, Sessions, Runs, Tools, Evaluations, Domain capabilities

This architecture **extends by composition**, not by forking Core per product.

---

## 6. AI request lifecycle (canonical)

```text
1. User / system intent
2. AI Hub surface (or Domain surface) captures intent
3. Named server action / Domain adapter authenticates + authorizes
4. Domain capability builds trusted context (no raw client model/prompt override)
5. aiService.runCapability
6. Gateway validates prompt, context, safety (pre)
7. Routing Policy selects model via Model Registry + Provider Foundation
8. Optional Knowledge/Memory retrieve + context assembly (when capability opts in)
9. Optional Personalization signals/candidates (when capability opts in)
10. Provider adapter executes
11. Safety (post) + structured validation
12. Usage/Cost recorded after execution
13. Run/trace finalized
14. Domain maps result to product-safe payload (strip provider internals for UI)
15. Ops Console may observe aggregates/audit (not on the hot user path)
```

### Fail-closed principles

- Unknown capability / provider / model / signal / knowledge kind → reject.
- Unauthenticated or unauthorized → reject before execution.
- Disabled model / missing adapter → reject (or policy-controlled fallback only inside Routing Policy).
- Client-supplied model/prompt/provider fields are not trusted.

---

## 7. Ownership

| Layer | Owner | Notes |
| --- | --- | --- |
| Shared AI Core | **Desktop** | Foundations, gateway, registries, policies, Domain AI backends |
| AI Operations Console (architecture + future admin) | **Desktop** (Core) + product design input | No secrets in client |
| AI Hub IA / UX presentation | **Laptop** | App shell, navigation, pages, components |
| Learning / Commerce / Creator product rules | Domain owners | Domain AI capabilities live under `lib/ai/capabilities/*` but product UX is Laptop/domain |
| Provider credentials / env | Platform ops | Server-only env; never UI |

### Machine split (standing)

- **Desktop:** Shared AI Core + Learning Tutor backend + AI architecture docs.
- **Laptop:** Home, Navigation, Creator, App Shell, shared UI, future Hub presentation wiring.

---

## 8. Module boundaries

| Module | May depend on | Must not depend on |
| --- | --- | --- |
| Shared AI Core | Server libs, Supabase server clients, config | React, App Router pages, Hub UI |
| Domain AI capabilities | Shared AI Core public/server APIs | Other Domain AI trees, React, provider SDKs directly |
| AI Hub UI (future) | Named server actions / typed contracts | `lib/ai/gateway`, providers, prompts, routing internals |
| AI Ops UI (future) | Admin server diagnostics contracts | Product Hub pages, end-user My AI data without authz |
| Personalization / Knowledge | Core contracts only | Video/Learning/Commerce UI modules |

---

## 9. Dependency rules

1. **One Core:** No parallel AI stacks per product.
2. **Downward only:** UI → server actions → Domain AI → `aiService` → Gateway → Core foundations → adapters.
3. **No upward imports:** Core must not import `app/` UI.
4. **No cross-domain capability imports.**
5. **No provider leakage to clients.**
6. **Hub is not Ops; Ops is not Hub.**
7. **Personalization / Knowledge are shared platforms**, not video-only or learning-only engines.
8. **Extensions plug into registries/hooks**; they do not fork gateway.
9. **Usage/cost recorded after execution only.**
10. **Migrations** for AI persistence require explicit approval; none in this architecture phase.

---

## 10. Naming standards

| Kind | Pattern | Examples |
| --- | --- | --- |
| Capability id | `{domain}.{area}.{action}` | `learning.tutor.explain_lesson` |
| Prompt id | same as capability (versioned) | `commerce.product_draft_assistant@1.0.0` |
| Provider id | lowercase token | `stub`, `openai`, `gemini` |
| Model id | provider-native string | `gpt-4o-mini`, `stub-structured-v1` |
| Hub module | `AI {Name}` product label | `AI Learning`, `My AI` |
| Ops module | noun phrase | `Routing`, `Feature Flags` |
| Foundation packages | `lib/ai/{area}/` | `lib/ai/personalization/`, `lib/ai/knowledge/` |
| Server actions | `{verb}{Domain}{Thing}Action` | `explainLessonLearningTutorAction` |
| Docs | `docs/ai/workstreams/*` | this file |

Avoid: product-specific names inside Shared Core (`VideoRecommenderEngine` as Core type). Prefer generic (`AiPersonalizationEngine`).

---

## 11. Extension strategy

Future work plugs into existing hooks/registries without redesigning Hub/Ops maps:

| Extension | Plug point | Notes |
| --- | --- | --- |
| New provider | Provider Foundation registration | Adapter + models; Ops → Providers/Models |
| Cost/latency/region/tenant routing | Routing Policy extension hooks | Keep fail-closed defaults |
| Billing / quotas | Usage/Cost tracking hooks | Ops → Quotas/Cost |
| Embeddings / vector / RAG | Knowledge/Memory hooks | Ops → Knowledge/Memory; no bypass of assembly contracts |
| Recommendation models / RL | Personalization hooks | Ops → Personalization/Recommendations |
| Experiments | Evaluations + routing/prompt variants | Ops → Experiments |
| Hub UI modules | Laptop presentation over named actions | One module at a time |
| Ops Console UI | Admin-only app over diagnostics contracts | After authz model defined |
| Video personalization integration | `lib/ai/integrations/video/` (flag-gated) | Signals/candidates/ranking boundary; **does not** change chronological feed order unless explicitly enabled later |
| Video signals wiring | Server actions → `wireWatchSignalToPersonalization` / social wiring | Maps existing watch/social events to ingest only; ranking stays off |
| AI Assistant Foundation | `lib/ai/assistant/` (contracts, skills, tools catalog, routing, assembly) | Cross-product gateway surface; no Chat UI; skills must not bind providers/models |
| AI Assistant Runtime | `lib/ai/assistant/runtime/` + capability `assistant.runtime_turn` | Flag `UMTUBA_AI_ASSISTANT_RUNTIME` (default OFF); full Core cycle; no skill/tool execution; no Chat UI |

**Non-goals for immediate next steps unless separately tasked:** building Hub UI, Ops UI, new providers, DB persistence, real RAG.

---

### Extension note — Assistant as Core consumer

Assistant Foundation is the first **named cross-product** consumer surface for Shared AI Core (not Learning-only). Runtime Integration adds a flag-gated server pipeline through `aiService` without Chat UI. Hub modules later present Assistant capabilities; Core remains server-side. Future Chat UI must call Assistant Runtime → Core, never providers directly.

---

## 12. Consumers

| Consumer | Access path |
| --- | --- |
| Learning Tutor | Named server actions → integration → `aiService` → Core |
| Commerce Product Draft | Domain capability → gateway/Core |
| AI Assistant Foundation | `lib/ai/assistant/` → Shared AI Core (skills/routing/assembly; no UI yet) |
| AI Assistant Runtime | `runAssistantRuntime` → `aiService` (`assistant.runtime_turn`); flag-gated |
| Future Search / Ads / World / Games Hub modules | Domain capability + Hub module → Assistant Runtime / Core path |
| Ops operators | Future Ops Console → Core diagnostics/config APIs |
| End users | Hub modules only (never Core internals) |

---

## 13. Out of scope (this phase)

- Any TypeScript / API / behavior change
- UI pages or components
- New providers or migrations
- Commit / Push / PR / Merge

---

## 14. Acceptance for V1 architecture

- Hub module list is complete and stable as the product AI map.
- Ops module list is complete and stable as the operator AI map.
- Lifecycle, ownership, dependency, naming, and extension rules are documented.
- Shared AI Core remains the single execution plane.
