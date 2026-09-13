# UMTUBA_LEARNING_2026_09_09_TRANSFER_SOURCE_AUDIT_V1

Read-only source map for later PC2 transfer. Transfer was not performed.

## Required block

```text
TASK_ID = UMTUBA_LEARNING_2026_09_09_TRANSFER_SOURCE_AUDIT_V1
STATUS = AUDIT_COMPLETE
REPOSITORY = C:/Users/Giga store/Desktop/umtuba/umtuba-web-translation-trunk-port-v1 (origin https://github.com/mohamad054-tech/umtuba-web.git)
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-web-translation-trunk-port-v1
BRANCH = pc2/umtuba-communications-v1-part1b-identity-discovery
BASE_SHA = 196a035801ea8cc992693f261052ee83b9390780
CURRENT_HEAD_SHA = 196a035801ea8cc992693f261052ee83b9390780
LEARNING_COMMITS_2026_09_09 = NONE
REMOTE_BRANCH = NONE (Learning work is untracked; workspace tracks origin/pc2/umtuba-communications-v1-part1b-identity-discovery)
PUSHED_TO_ORIGIN = NO
UNCOMMITTED_LEARNING_CHANGES = YES
UNTRACKED_LEARNING_FILES = YES
LEARNING_FILES_CHANGED = 27 untracked partner-marketplace files dated 2026-09-09 14:15–14:24 local (see list below). No tracked Learning files were modified.
DATABASE_MIGRATIONS = NONE
DEPENDENCIES_CHANGED = NO
ENV_CHANGES_REQUIRED = NO
OTHER_REQUIRED_COMMITS = NONE
SAFE_TO_TRANSFER_TO_PC2 = NO
EXACT_TRANSFER_METHOD = Do not copy this worktree or this branch. On this machine, zip or path-copy ONLY the 27 Sep-9 files listed below. On PC2, apply them onto a NEW unused branch created from whatever Learning/alpha tip PC2 already has. Do not merge into PC2 Store work, do not checkout this comms branch, do not overwrite PC2 dirty files.
BLOCKERS = Dirty mixed tree (Store CJ/catalog, UM Points, brand, comms, iOS docs). Learning sits uncommitted on a Communications branch. No Learning commit and no remote branch. Naive copy/merge would overwrite or mix PC2 work. FETCH_HEAD absent; remotes not refreshed this audit.
```

## Sep 9 Learning files (local Israel DST UTC+3)

All `??` untracked. Last-write times from filesystem.

| Local mtime | Bytes | Path |
| --- | ---: | --- |
| 2026-09-09 14:15:07 | 5591 | `lib/learning/partners/types.ts` |
| 2026-09-09 14:15:26 | 11451 | `lib/learning/partners/taxonomy.ts` |
| 2026-09-09 14:15:39 | 5876 | `lib/learning/partners/certificateModel.ts` |
| 2026-09-09 14:15:47 | 4195 | `lib/learning/partners/affiliateFoundation.ts` |
| 2026-09-09 14:15:56 | 6145 | `lib/learning/partners/providerFacts.ts` |
| 2026-09-09 14:16:02 | 2618 | `lib/learning/partners/attribution.ts` |
| 2026-09-09 14:16:11 | 4663 | `lib/learning/partners/ranking.ts` |
| 2026-09-09 14:16:16 | 2718 | `lib/learning/partners/localization.ts` |
| 2026-09-09 14:16:25 | 5761 | `lib/learning/partners/search.ts` |
| 2026-09-09 14:16:27 | 807 | `lib/learning/partners/comparison.ts` |
| 2026-09-09 14:17:07 | 6451 | `lib/learning/partners/copy.ts` |
| 2026-09-09 14:17:09 | 403 | `lib/learning/partners/index.ts` |
| 2026-09-09 14:17:09 | 639 | `lib/learning/partners/savedCourses.ts` |
| 2026-09-09 14:19:26 | 7615 | `lib/learning/partners/learningPartners.test.ts` |
| 2026-09-09 14:19:27 | 270 | `lib/sandbox/learningPartners/copy.ts` |
| 2026-09-09 14:19:38 | 2764 | `app/components/learning/partners/CertificateDetailsPanel.tsx` |
| 2026-09-09 14:19:39 | 1390 | `app/components/learning/partners/SaveCourseButton.tsx` |
| 2026-09-09 14:19:49 | 5086 | `app/components/learning/partners/PartnerCourseCard.tsx` |
| 2026-09-09 14:19:51 | 837 | `app/sandbox/learning/partners/layout.tsx` |
| 2026-09-09 14:19:58 | 1835 | `lib/learning/partners/sandboxLinks.ts` |
| 2026-09-09 14:20:27 | 12029 | `app/sandbox/learning/partners/page.tsx` |
| 2026-09-09 14:20:43 | 4433 | `app/sandbox/learning/partners/[slug]/page.tsx` |
| 2026-09-09 14:20:49 | 2427 | `app/sandbox/learning/partners/compare/page.tsx` |
| 2026-09-09 14:21:44 | 63351 | `data/umtuba-learning-partner-pilot-v1.json` |
| 2026-09-09 14:22:00 | 2505 | `docs/ai/tasks/UMTUBA_LEARNING_PARTNER_MARKETPLACE_FOUNDATION_V1.md` |
| 2026-09-09 14:22:25 | 1145 | `lib/sandbox/learningPartners/learningPartners.ui.test.ts` |
| 2026-09-09 14:24:05 | 10592 | `lib/learning/partners/catalog.ts` |

Preview routes (local only): `/sandbox/learning/partners`, `?dir=rtl`, `/sandbox/learning/partners/compare?topic=python`.

## Do not transfer as yesterday's Learning

Older untracked Learning still in this dirty tree (2026-08-18): `docs/ai/PC2_LEARNING_*`, `docs/ai/pc2-learning-sandbox-qa/` (124 files), `lib/learning/learningProviderContracts.ts(+test)`, `docs/ai/PC2_PRECOMPANY_STORE_LEARNING_FOUNDATION.md`, partnership/commerce partner docs.

Store work from 2026-09-09 in the same tree is unrelated: CJ catalog/scripts, UM Points, `docs/ai/tasks/UMTUBA_STORE_*` / `UMTUBA_CJ_*`, `app/sandbox/store/**`.
