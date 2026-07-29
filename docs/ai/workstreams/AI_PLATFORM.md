# AI Platform Workstream (Desktop-owned)

## SAVE POINT — 2026-07-29 (Desktop)

**Machine:** Desktop  
**Active work:** AI Core Platform Provider Foundation V1

| Item | Value |
| --- | --- |
| Active branch | `office/learning-ai-tutor-backend-foundation-v1` |
| Base HEAD (AI) | `a8010c5` — learning tutor server actions |
| Remote | Synced; local may be ahead with unrelated UI commit; **no commit/push until verification GO** |
| Do not merge / no PR unless asked | Yes |

**Done this session (Desktop):**
1. Provider Foundation types + central registries (`foundationTypes.ts`, `foundation.ts`)
2. Gateway selection wired through `createProviderFoundation` / `resolveRoute` / `requireAdapter`
3. Fail-closed unknown/disabled/unregistered provider-model paths
4. Future provider placeholders (gemini/anthropic/local) registered disabled, no adapters/keys
5. Foundation tests + docs

**NOT done / do not touch by mistake:**
- Learning UI / Home / Navigation / Creator / App Shell / Shared UI (Laptop)
- Unrelated local dirty Learning/Nexus/`globals.css` files — leave unstaged
- Real OpenAI/Gemini/Anthropic live provider expansion beyond existing stub/OpenAI adapters
- Do not remote-apply `20260871` without explicit approval
- No new migration for this layer

---

**Ownership:** Desktop owns Shared AI Core + Learning Tutor backend capabilities/integration/server actions (no UI pages/components).
**Laptop owns:** user-facing AI presentation wiring, Home, Navigation, Creator, App Shell, shared UI.

## Status

Shared AI Core Foundation V1 closed.
Learning AI Tutor Backend Foundation V1 closed (five capabilities).
Learning AI Tutor Backend Integration Foundation V1 closed.
Learning AI Tutor Server Actions Foundation V1 closed.
AI Core Platform Provider Foundation V1 implemented (server-side Shared AI Core only).

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
| Placeholders | `gemini` / `anthropic` / `local` registered disabled, no adapters |

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
- No App Router pages / React components in this deliverable

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
| Migration (local only) | `20260872_learning_ai_tutor_thread_persistence_bridge_v1.sql` |
| RPC | `append_my_learning_ai_tutor_exchange(p_thread_id, p_kind, p_user_content, p_assistant_content)` |
| Stub RPC | `append_my_learning_ai_tutor_message` preserved (stub assistant text) |
| Bridge module | `lib/ai/capabilities/learning/threadPersistenceBridge.ts` |
| Wiring | Optional `threadId` on `answer_question` / `explain_again` / `give_hint` → validate thread/lesson → AI → exchange RPC |
| Kind map | `answer_question→ask_question`, `explain_again→explain_again`, `give_hint→hint` |
| Unsupported actions | No guessed kinds; `threadId` rejected on other actions |
| Fail closed | Missing/unowned thread, lesson mismatch, entitlement, persistence error (no silent success) |
| App path | Authenticated RPC only — no `service_role` from application code |

### Accepted V1 follow-ups (not in this milestone)

- SQL-level lesson binding (`p_lesson_id` on exchange RPC)
- Lean thread metadata read RPC (avoid full message history for validation)
- Trusted-producer transcript integrity (prevent owner-forged assistant rows via direct RPC)
- Structured oversize serialization (reject/rebuild instead of mid-JSON clamp)

## Migration status

- Shared AI Core: `20260871` (local only, not remote-applied)
- Tutor exchange RPC: `20260872` (local only, not remote-applied)

## Next (after commit approval)

`code_review` remains **blocked** pending a trusted code-input contract. Optional: Provider Foundation restoration (separate). Do not merge Tutor work into alpha from the Tutor laptop.
