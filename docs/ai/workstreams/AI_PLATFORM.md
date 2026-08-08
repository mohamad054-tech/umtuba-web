# AI Platform Workstream (Desktop-owned)

## SAVE POINT — 2026-08-08 (Desktop)

**Machine:** Desktop
**Active work:** AI Streaming Foundation Port to Creator Tip V1

| Item | Value |
| --- | --- |
| Active branch | `office/platform-ai-streaming-port-to-creator-v1` |
| Base | Creator Studio tip `aaccac3` |
| Streaming source | `origin/office/ai-core-provider-streaming-foundation-v1` @ `0a04d59` |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-ai-streaming-port-to-creator-v1` |

**Lineage:** Streaming Foundation V1 already existed on the prior AI-core lineage. This milestone ports it onto the Creator Studio tip (integration only — no second streaming architecture). Older docs that said “streaming next” after Creator Studio were stale.

**Done on this tip:**
1. Opt-in `adapter.stream()` (SSE deltas) for stub / OpenAI / Gemini / Anthropic / Local
2. `UMTUBA_AI_STREAMING` gate (default OFF)
3. Registry `streamingSupport` mirrors the gate
4. Mocked streaming tests; `execute()` path unchanged when flag OFF

**NOT done / do not touch by mistake:**
- Gateway HTTP SSE product surface / streaming UI
- Structured-output streaming
- Live provider activation
- Alpha merge
- Remote migration apply without explicit GO

---

**Ownership:** Desktop owns Shared AI Core + Learning Tutor backend + AI Hub (gated).
**Laptop:** do not continue AI Platform work unless ownership reassigned.

## Status

Shared AI Core Foundation V1 closed.
Learning AI Tutor Backend (7 capabilities) + Integration + Server Actions closed.
Thread Persistence Bridge V1 + Thread Metadata Read V1 closed on Tutor tip.
AI Core Platform Provider Foundation V1 + Hub Experience closed on Provider tip.
**Reconciliation V1:** combined tips staged on this branch.

## Provider Foundation (V1)

```
Capability / aiService
  → gateway.execute
  → createProviderFoundation(config)
  → resolveRoute(request)  // fail-closed + deterministic routeModel
  → requireAdapter(providerId)
  → adapter.execute(...)
```

| Piece | Role |
| --- | --- |
| `AiProviderFoundation` | Central provider + model + adapter registries |
| Typed model descriptors | provider id, model id, capabilities/modalities, enabled/available, context/output limits |
| Selection layer | Capabilities never hardcode provider/model names |
| Gemini | Adapter registered when `GEMINI_API_KEY` present; otherwise listed unavailable |
| Anthropic | Adapter registered when `ANTHROPIC_API_KEY` present; otherwise listed unavailable |
| Local | Adapter registered when both `LOCAL_AI_BASE_URL` and `LOCAL_AI_MODEL` present; otherwise listed unavailable / empty catalog |

**Fail-closed when:** unknown provider, unknown model, disabled/unavailable model, unsupported capability/modality, unregistered adapter.

**Client exposure:** unchanged — server actions / integration still strip provider/model internals from UI payloads.

## Public service boundary

```
Future Learning UI
  → named server actions (app/actions/learningTutor.ts)
  → learningTutorServerActions core
  → learningTutorIntegration.run (action-discriminated)
  → aiService.runCapability
  → tutorRunner + contracts/safety/wrong-answer
  → Shared AI Core gateway
  → Provider Foundation (registry + selection)
  → Provider adapter
```

## Learning Tutor server actions (V1)

| Server action export | Integration action |
| --- | --- |
| `explainLessonLearningTutorAction` | `explain_lesson` |
| `summarizeLessonLearningTutorAction` | `summarize_lesson` |
| `answerQuestionLearningTutorAction` | `answer_question` |
| `generatePracticeLearningTutorAction` | `generate_practice` |
| `explainWrongAnswerLearningTutorAction` | `explain_wrong_answer` |
| `giveHintLearningTutorAction` | `give_hint` |
| `explainAgainLearningTutorAction` | `explain_again` |

**Guarantees:**
- Named functions only — no free-form action/capability string dispatcher
- Calls `learningTutorIntegration` only (never `aiService` directly)
- Auth via `getServerUser` + existing Learning access chain inside integration/capabilities
- Strips `modelId` / `promptVersion` / provider fields from UI-facing success payloads
- Safe error envelope with optional `requiresAuth`
- No App Router Learning UI pages in Tutor deliverables

## Learning capabilities implemented

| Capability | Status |
| --- | --- |
| `learning.tutor.explain_lesson@1.0.0` | Implemented |
| `learning.tutor.summarize_lesson@1.0.0` | Implemented |
| `learning.tutor.answer_question@1.0.0` | Implemented |
| `learning.tutor.generate_practice@1.0.0` | Implemented |
| `learning.tutor.explain_wrong_answer@1.0.0` | Implemented |
| `learning.tutor.give_hint@1.0.0` | Implemented |
| `learning.tutor.explain_again@1.0.0` | Implemented |

Cross-capability `revealsAnswerKey` flag parity for `explain_again` is deferred; leakage remains fail-closed via banned fields.

## Thread Persistence Bridge V1

Milestone: `learning.tutor.thread_persistence_bridge@1.0.0`

| Piece | Detail |
| --- | --- |
| Migration | `20260872_learning_ai_tutor_thread_persistence_bridge_v1.sql` |
| RPC | `append_my_learning_ai_tutor_exchange(p_thread_id, p_kind, p_user_content, p_assistant_content)` |
| Stub RPC | `append_my_learning_ai_tutor_message` preserved (stub assistant text) |
| Bridge module | `lib/ai/capabilities/learning/threadPersistenceBridge.ts` |
| Wiring | Optional `threadId` on `answer_question` / `explain_again` / `give_hint` → validate thread/lesson → AI → exchange RPC |
| Kind map | `answer_question→ask_question`, `explain_again→explain_again`, `give_hint→hint` |
| Unsupported actions | No guessed kinds; `threadId` rejected on other actions |
| Fail closed | Missing/unowned thread, lesson mismatch, entitlement, persistence error (no silent success) |
| App path | Authenticated RPC only — no `service_role` from application code |

## Thread Metadata Read V1

Milestone: `learning.tutor.thread_metadata_read_v1`

| Piece | Detail |
| --- | --- |
| Migration | `20260873_learning_ai_tutor_thread_metadata_read_v1.sql` |
| RPC | `get_my_learning_ai_tutor_thread(p_thread_id)` |
| Return | `thread_id`, `course_id`, `lesson_id`, `title`, `created_at`, `updated_at` only |
| Bridge change | `validateThreadForPersistence` uses lean metadata RPC (no full message history fetch) |
| Preserved | Full `get_my_learning_ai_tutor_thread_messages` for consumers that need messages |

## AI Hub Experience (`/ai-hub`)

| Item | Value |
| --- | --- |
| Flag | `UMTUBA_AI_HUB` (`1`/`true` only) |
| OFF | Routes return `notFound()` |
| ON | Authenticated users see Hub Home / Assistant Entry |
| Shell | `AiHubShell` — Hub-local only |
| Data | `loadAiHubSnapshot` via `app/actions/aiHub.ts` |

### Screens
- `/ai-hub` — AI Home
- `/ai-hub/assistant` — Assistant Entry only

## Prior foundations (Provider tip)

- AI Hub Foundation (`lib/ai/hub/`)
- Assistant Runtime (`UMTUBA_AI_ASSISTANT_RUNTIME`)
- Knowledge / memory / video personalization modules

## Migration status

- Shared AI Core: `20260871` — **applied** on linked remote
- Tutor exchange RPC: `20260872` — **applied** on linked remote
- Tutor lean thread metadata: `20260873` — treat remote apply status as operator-known; do not re-apply without GO
- Provider / Hub path: no new migration in this reconciliation

## Next (after this port)

1. Optional: gateway/HTTP SSE product surface (explicit GO) — do **not** redesign provider streaming contracts
2. Optional live smoke against operator-hosted OpenAI-compatible endpoint
3. Alpha merge only with explicit GO
4. Do not re-implement Streaming Foundation V1 from the old AI-core branch
