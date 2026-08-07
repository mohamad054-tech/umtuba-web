# Professional Translation Generation and Review V1

## Purpose

Turn the professional quality + AI review foundation into a **usable Studio
product flow** for real keys:

source → professional generation → deterministic QA → independent review →
quality decision → pending suggestion → human review surface

AI **cannot** approve or publish. Human authority is unchanged.

## Generation lifecycle

1. Admin clicks **Professional generate + review** on a key/locale value
2. Server resolves source, namespace, context pack, glossary, style guide, TM,
   and quality profile (**not** client-injected)
3. Provider selection (server-only): live AI Core if configured, else offline
   glossary-aware generator + heuristic reviewer
4. `runProfessionalGenerateAndReview`
5. Create a normal Studio suggestion with `professional_quality_v1` metadata
6. **Current translation value text and status are not replaced**

## Independent review

Reviewer is a separate contract/kind from the generator. Suggested revisions are
re-QA’d once; blockers reject the revision. Reviewer results never approve.

## Human authority

Existing Approve / Reject / Save / Submit controls remain the only approval path.
Professional UI informs the decision (score, findings, recommendation badge).

## Inputs

- Glossary: official UMTUBA terminology seed + policy
- Style guides: ar / en / fr / es / de / pt (locale-specific, never English-blind)
- Context packs: global / commerce / learning / collaboration / admin
- Profiles: resolved from namespace/domain (client cannot downgrade)

## Provider boundary

| Mode | When |
|------|------|
| `heuristic_offline` | Default when live AI not configured |
| `live_ai_service` | `UMTUBA_AI_MODE=live` + provider keys |
| `unavailable` | Explicit fail — no broken suggestion created |

Required env **names** (no values in docs): `UMTUBA_AI_MODE`, `OPENAI_API_KEY`,
`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `LOCAL_AI_BASE_URL`, `LOCAL_AI_MODEL`,
`UMTUBA_AI_ALLOW_STUB`, `UMTUBA_AI_TIMEOUT_MS`.

## Failure behavior

Provider unavailable / timeout / invalid response → action error query param;
no suggestion created. QA blockers → suggestion may exist as `BLOCK` evidence
but never PASS for approval shortcut. Failures never presented as approved.

## Offline / live modes

- **OFFLINE_PIPELINE_READY** with injectable/heuristic providers
- **LIVE_PROVIDER_NOT_CONFIGURED** until AI env is set (separate readiness milestone)

## What prevents AI auto-publication

- `PROFESSIONAL_AI_AUTHORITY` all false
- Suggestion status `pending_review` only
- Professional create path does not mutate value text/status to approved
- Publish catalog still requires human-ready statuses
- No automatic approve action in professional pipeline

## Code map

- `lib/translationStudio/professionalQuality/productWorkflow.ts`
- `lib/translationStudio/professionalQuality/providerSelection.ts`
- `lib/translationStudio/professionalQuality/glossaryAwareGenerator.ts`
- `app/actions/translationStudioProfessionalGeneration.ts`
- `app/admin/translation-studio/ProfessionalSuggestionPanel.tsx`
- Key detail page actions + panel
