# CURSOR REPORT — CENTRAL_13_LANGUAGE_DEEP_LINGUISTIC_QA_FINAL_V1

## Summary

Deep linguistic QA on live `618526c9` (13 locales). Watch is now a translated surface label in all 13 languages (fr Regarder, es Ver, de Ansehen, pt Assistir) — not leftover English. Hello City stays the branded English feature name everywhere. Portuguese is consistently **pt-BR**. Arabic no longer transliterates UMTUBA. Follow/Following wired through dictionaries (never Unfollow). Hardcoded English chrome fixed on Follow, Profile stats, AuthStatus, Search empty states, and Store Watch eyebrow. Landing hero copy that had leaked English in fr/es/de/pt is localized.

## Exact files changed

- `lib/i18n/messages/{en,ar,fr,es,de,pt,id,hi,ru,tr,zh-CN,ja,ko}.ts`
- `lib/i18n/messages/types.ts`, `storeCatalogs.ts`
- `lib/i18n/linguisticQa.v1.test.ts` (new)
- `lib/i18n/professional13Catalog.test.ts`, `appShellTranslation.test.ts`
- `lib/sandbox/i18n.ts`, `lib/sandbox/store/messages.ts`
- `app/components/social/FollowButton.tsx`, `AuthStatus.tsx`
- `app/profile/components/ProfileStats.tsx`
- `app/search/SearchExperience.tsx`, `app/store/page.tsx`
- `app/components/landing/JoinBetaLink.tsx`, `joinCta.contract.test.ts`
- `app/lib/nav/userReportedFinalBlockersV2.contract.test.ts`
- `docs/i18n/TERMINOLOGY.md`, `docs/ai/CURRENT_TASK.md`

## Migrations created

None.

## Security review

No secrets printed or committed. Arabic brand strings now keep Latin UMTUBA. UGC, authored lessons, and seller descriptions untouched. Store/Learning restrictions unchanged. Sandbox still private. Host build must source `/etc/umtuba/production/umtuba.env`. Rollback `618526c9-20260819175541`. Never restore `0b6d35bd-20260819011723`.

## Tests

`vitest` i18n/registry/completeness/linguistic QA: **70 passed** (9 files).

## TypeScript

`tsc --noEmit` **PASS**

## Build

Local `npm run build` **PASS**

## git diff --check

PASS (no whitespace errors)

## git status --short

See worktree after commit.

## Open issues

- Search tab labels (`SEARCH_TAB_LABELS`) and notification type chips remain English contract constants.
- Some Portuguese store long-form sentences still mix *encomenda* / European phrasing; core chrome is pt-BR.
- AuthStatus error fallbacks can still surface English if a server message is unsanitized.
- OpenAI/Gemini not available on this Windows process — second pass was human professional review.
