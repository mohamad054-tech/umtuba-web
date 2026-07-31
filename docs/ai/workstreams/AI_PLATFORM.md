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

## Thread Metadata Read V1

Milestone: `learning.tutor.thread_metadata_read_v1`

| Piece | Detail |
| --- | --- |
| Migration (local only) | `20260873_learning_ai_tutor_thread_metadata_read_v1.sql` |
| RPC | `get_my_learning_ai_tutor_thread(p_thread_id)` |
| Return | `thread_id`, `course_id`, `lesson_id`, `title`, `created_at`, `updated_at` only |
| Bridge change | `validateThreadForPersistence` uses lean metadata RPC (no full message history fetch) |
| Preserved | Full `get_my_learning_ai_tutor_thread_messages` for consumers that need messages |

## Thread Lesson Binding Hardening V1

Milestone: `learning.tutor.thread_lesson_binding_hardening_v1` — **CLOSED** @ `b85081b`

| Piece | Detail |
| --- | --- |
| Migration (local only until apply GO) | `20260874_learning_ai_tutor_thread_lesson_binding_v1.sql` |
| RPC | `append_my_learning_ai_tutor_exchange(p_thread_id, p_lesson_id, p_kind, p_user_content, p_assistant_content)` |
| Dropped | 4-arg exchange overload |

## Thread Resume / History Read Foundation V1

Milestone: `learning.tutor.thread_resume_history_read_v1`

Implements documented follow-up **Trusted-producer transcript integrity** after lesson binding:

| Piece | Detail |
| --- | --- |
| Migration (local only) | `20260875_learning_ai_tutor_thread_resume_history_read_v1.sql` |
| RPC | `resume_my_learning_ai_tutor_thread(p_thread_id, p_course_id, p_lesson_id, p_limit)` |
| Dropped | Unbounded `get_my_learning_ai_tutor_thread_messages(uuid)` |
| Foundation | `resumeMyAiTutorThread` (+ bounded limits) |
| Bridge | `resumeLearningTutorThread` |
| Guarantees | auth.uid ownership, live entitlement, exact course+lesson match, lesson∈course, deterministic order, limit default 50 / max 100, lean fields (no user_id / provider internals) |

### Remaining follow-ups

- Conversation history summarization (deferred)
- Thread Lifecycle Foundation is **not** specified in this SSOT; do not invent it without an explicit milestone update

## Structured Oversize Serialization V1

Milestone: `learning.tutor.structured_oversize_serialization_v1`

| Piece | Detail |
| --- | --- |
| Module | `serializeJsonObjectWithinLimit` in `threadPersistenceBridge.ts` |
| Behavior | Persist assistant JSON within 20k bound without mid-slicing; drop secondary fields then shrink strings; fail closed if unfittable |
| Compatibility | Persistence / lesson binding / resume history unchanged |

## Migration status

- Shared AI Core: `20260871` — **applied** on linked remote
- Tutor exchange RPC: `20260872` — **applied** on linked remote
- Tutor lean thread metadata: `20260873` — local only, **not** remote-applied
- Tutor lesson binding: `20260874` — closed in Git; remote apply only with GO
- Tutor resume/history: `20260875` — closed in Git; remote apply only with GO

## Next (after commit approval)

Apply pending Tutor migrations only with explicit GO. `code_review` remains **blocked**. Do not merge Tutor work into alpha from the Tutor laptop.
