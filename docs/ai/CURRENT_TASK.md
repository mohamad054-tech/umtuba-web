# Current Task

## Task title

Translation Studio Foundation V1

## Status

`implementation-complete` — Internal Translation Studio foundation staged for manual commit (no trailers). Not pushed.

## Resume here (next session / next GO)

1. Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-translation-studio-foundation-v1`
2. Branch: `office/platform-translation-studio-foundation-v1` (from App Shell tip `0d181604`)
3. Manual commit (no Co-authored-by / Signed-off-by / trailers)
4. Push when approved; confirm `0 0`
5. Do **not** merge into alpha without explicit GO

## Branch

`office/platform-translation-studio-foundation-v1`

## Exact refs

| Ref | Hash / path |
|-----|-------------|
| Base | `0d181604e4caa474d6d29fc44d96c8c9fad0d7dd` (App Shell Translation V1) |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-translation-studio-foundation-v1` |

## Allowed scope

- `lib/translationStudio/**`
- Read-only `/admin/translation-studio/**` UI
- Minimal AI capability wiring for `platform.translation_suggest` (aiService + prompt + contracts only)
- Import/export contracts, architecture + handoff docs, focused tests

## Forbidden scope

- Public translation product
- Learning / Commerce / Creator translation
- DB migrations
- Route redesign / locale URL prefixes
- Provider adapter modifications
- Automatic publishing / editing workflows
- Commit/push without GO

## Done

- Domain model: languages, namespaces, keys, values, statuses
- Translation Memory + duplicate fingerprint reuse
- Terminology DB seeded with UMTUBA terms
- AI port → aiService (no provider-specific code)
- Suggestion pipeline (no auto-publish)
- Read-only Studio UI pages + status badges
- JSON/CSV/XLIFF contracts only
- Tests + tsc + build

## Out of scope / next

DB persistence, editing/approval UI, live AI smoke, XLIFF writers, alpha merge.
