# Current Task

## Task title

Arabic + English App Shell Translation V1

## Status

`implementation-complete` — App Shell multilingual surface staged for manual commit (no trailers). Not pushed.

## Resume here (next session / next GO)

1. Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-platform-app-shell-translation-v1`
2. Branch: `office/platform-app-shell-translation-v1` (from I18n Foundation tip `6528202`)
3. Manual commit (no Co-authored-by / Signed-off-by / trailers)
4. Push when approved; confirm `0 0`
5. Do **not** merge into alpha without explicit GO

## Branch

`office/platform-app-shell-translation-v1`

## Exact refs

| Ref | Hash / path |
|-----|-------------|
| Base | `6528202c349e6a5a41040a7d9287e4c7f97c1873` (I18n Foundation V1) |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-platform-app-shell-translation-v1` |

## Allowed scope

- App Shell + Settings language wiring on top of `lib/i18n`
- Shared product empty/error/loading defaults
- Focused tests + handoff docs

## Forbidden scope

- Learning / Commerce / Creator / Live / Games / World / Articles / UGC translation
- DB migrations / locale URL prefixes / AI provider changes
- Unrelated redesign
- Commit/push without GO

## Done

- `LanguageSelector` wired into Settings → Language section (`?section=language`)
- Cookie persistence + immediate `html lang`/`dir` update on change
- Arabic RTL / English LTR via foundation
- Desktop + mobile nav, UserMenu, Settings chrome, generic actions/status/dialogs/empty/error
- Tests + `tsc` + build

## Out of scope / next

FR/ES/DE/PT App Shell copy pass, full product surfaces, alpha merge.
