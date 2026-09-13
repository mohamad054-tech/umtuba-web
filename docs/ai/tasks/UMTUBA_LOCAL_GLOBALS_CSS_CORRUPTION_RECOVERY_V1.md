# UMTUBA_LOCAL_GLOBALS_CSS_CORRUPTION_RECOVERY_V1

Status: **LOCAL_PREVIEW_RESTORED** — CSS compile failure cleared. Owner Arabic visual QA is **not** claimed.

## Goal

Repair only the local source/scan corruption that made `http://localhost:3000/sandbox/store/cj-localization-qa?dir=rtl` fail with `Parsing CSS source code failed` on `./app/globals.css`. Restore existing Store / CJ / UM Points / localization work without reset, redesign, or production changes.

## Root cause

`app/globals.css` **source was not HTML-contaminated**. HEAD vs working tree shows only legitimate additions (brand-mark CSS already present; this task added a Tailwind exclusion).

The Next overlay line (~4828 / ~4858) was **generated PostCSS/Tailwind output**, not a 4800-line source file. Tailwind v4 auto-scans the repo. Untracked `.local/cj-launch-*.html` dumps (saved Next error/Flight HTML, ~6.5KB each) contain split class fragments such as:

`var(--sf-a"])</script><script>self.__next_f.push([1,"ccent-strong)`

Those fragments were emitted as invalid CSS under `app/globals.css`. Re-curling the broken page back into `.local/*.html` kept the loop alive.

No `self.__next_f` / `</script>` / `<!DOCTYPE` / `<html` was found in `app/globals.css` or in app `.css` / `.ts` / `.tsx` (excluding `node_modules` / `.next`).

## Repair (minimal)

- Added `@source not "../.local";` immediately after `@import "tailwindcss"` so Tailwind does not scan local HTML dumps.
- Added `.local/*.html` to `.gitignore` (kept the existing uncommitted `.local/cj/` token-cache ignore).
- Did **not** delete the HTML dumps, regenerate `globals.css`, or edit Store styling / localization product copy.
- Preserved the already-present `.umtuba-brand-frame*` CSS.

## Verification

| Check | Result |
| --- | --- |
| CSS / `npm run build` | PASS |
| `npx tsc --noEmit` | PASS |
| Store / CJ / localization tests | PASS (43) |
| Secret scan of this task’s files | PASS |
| `/sandbox/store/cj-launch` | HTTP 200 |
| `/sandbox/store/cj-localization-qa` | HTTP 200 |
| `/sandbox/store/cj-localization-qa?dir=rtl` | HTTP 200 |
| UM Points banner on CJ launch | present |
| Approved 59 products | 59 / 59 |
| Localization QA sample | 20 / 20 |

Local Next on `127.0.0.1:3000` left running for owner inspection.

## Safety

- No commit / push / deploy / production DB
- No worktree reset / clean / revert
- No secrets printed
- Arabic localization owner visual PASS is **not** claimed
