# PC2_A1 — Learning Expected-Set Correction V1

TASK_ID = PC2_LB001_CORRECTED_POST_REPROBE_GO · A1
REPORT_TYPE = INDEPENDENT_LEARNING_EXPECTED_SET_CORRECTION
MUTATION = NO
GIT_FETCH_PRUNE = YES

## Stamps

| Field | Value |
| --- | --- |
| EVIDENCE_STAMP | 2026-08-12T14:00:13+03:00 |
| WORKSPACE | `c:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1` |
| BRANCH | `office/platform-translation-trunk-port-v1` |
| HEAD_SHA | `1c5ae0bd0266029f264cab866744c7fcde25cc2e` |
| ALPHA_TIP | `origin/alpha-0.2` = `e84475a769c731bb7e1ad511b3543ee714d2feea` |
| LEARNING_SOT | `C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-sot` |
| SOT_HEAD_AT_PROBE | `0999fc1d5f1ec5a7db0c3c2e614bd10e67bc87a2` (behind origin/alpha-0.2 by 58; same 34 `*learning_*` files) |
| HEAD_vs_ALPHA_LEARNING_SET | EQUAL (34/34 identical filenames) |
| DOMAIN_CONTRACT | filename glob `*learning_*` under `supabase/migrations/` |

## Verdict

```
EXPECTED_SET_INDEPENDENT_VERDICT=PASS
LEARNING_EXPECTED_COUNT=34
NON_LEARNING_MIGRATIONS_EXCLUDED=YES
CENTRAL_EXPECTED_39_AS_LEARNING_COUNT=REJECTED
CORRECTED_CLOSURE_PATH=CONTINUE (42/46/47 are NOT Learning-owned)
TRIO_42_46_47_LEARNING_OWNED=NO
```

### Why Central EXPECTED=39 is not Learning

Arithmetic identity (the prior incorrect construction):

- Version window `20260828`–`20260866` inclusive = `66 - 28 + 1 = 39` **version slots**
- That window is **not** a Learning ownership set
- Inside the same window, tip files matching `*learning_*` = **34**
- Non-Learning / missing slots in that window:
  - `20260842` ADS
  - `20260843` MISSING (no migration file on tip)
  - `20260846` GAMES
  - `20260847` GAMES
  - `20260865` OTHER (Articles teaser)
- Check: `39 - 5 = 34` matches `*learning_*` tip count

Central claim `EXPECTED=39 Learning` therefore **fails** independent validation against the `*learning_*` domain contract. Correct Learning expected count on release tips = **34**.

## Explicit trio classification (mandatory)

| MIGRATION_ID | CLASS | SOURCE_EVIDENCE |
| --- | --- | --- |
| 20260842 | **ADS** | Filename `20260842_ads_deliverable_binding_database_authority_v1.sql`; SQL header Ads Deliverable Binding Database Authority Hardening V1; mutates `public.ads` / `ads_*` RPCs; zero `learning_` tokens in SQL (rg count 0); git intro `d84b880 feat(ads): bridge persisted deliverables to canonical inventory`; not `*learning_*`. |
| 20260846 | **GAMES** | Filename `20260846_games_platform_foundation_v1.sql`; SQL header UM Games Platform Foundation V1; creates `public.games` + game_* tables; comment renumbered from 20260842 to avoid Ads collision and sits after Learning 20260841; zero `learning_` tokens; git `a98f4f8 chore(games): renumber games migrations`; `lib/games/gamesFoundation.test.ts` asserts Games owns 20260846 after Learning 20260841. |
| 20260847 | **GAMES** | Filename `20260847_games_catalog_foundation_v1.sql`; SQL header UM Games Catalog Foundation V1; extends `public.games` catalog metadata; comment renumbered from 20260843 after Ads claimed 20260842; zero `learning_` tokens; same Games renumber commit `a98f4f8`. |

**Gate:** Because none of 42/46/47 is Learning-owned or mandatory for Learning release acceptance, corrected closure path is **not** stopped by this trio.

## Domain contract verification

| Check | Result |
| --- | --- |
| Glob `supabase/migrations/*learning*.sql` on HEAD | 34 |
| Same glob on `origin/alpha-0.2` | 34 (identical set) |
| Same glob on Learning SoT worktree | 34 |
| All Learning tip files contain `_learning_` in name | YES |
| Sample SQL creates `learning_*` tables/RPCs | YES (e.g. `20260828` -> `learning_spaces`) |
| `docs/learning/implementation/*` cite these migration paths | YES |
| `lib/learning/*.test.ts` bind to these SQL files | YES |
| Range `20260828-20260866` equals Learning ownership | NO (interleaved Ads/Games/Articles + missing 43) |

## Out-of-tip Learning note (not in release expected set)

Additional `*learning_*` SQL exists on **unmerged** office/agent branches (not on `origin/alpha-0.2` / HEAD tip). Examples: `20260872-20260876` AI tutor thread chain, `20260901` lesson notes, `20260906/08/09` due-dates/notes hub/followthrough, bookmarks/import variants. These are **not** part of the tip Learning acceptance inventory because they are absent from the authoritative release tip trees inspected here. Remote history docs may mention `20260901+` as Learning-owned versions; ownership is not tip expected-set membership.

## LEARNING_EXPECTED_MIGRATIONS (authoritative tip set)

LEARNING_EXPECTED_COUNT = 34

| # | MIGRATION_ID | MIGRATION_NAME | DOMAIN_OWNER | WHY_INCLUDED_IN_LEARNING_ACCEPTANCE | INTRO_COMMIT | SHA256_16 |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | 20260828 | `learning_spaces_membership_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `6031ec2 / 2026-07-22 12:00:38 +0300 / feat(learning): add spaces and membership foundation` | `53d2a7e65ce3f84c` |
| 2 | 20260829 | `learning_programs_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `a22ec6e / 2026-07-22 13:19:44 +0300 / feat(learning): add programs foundation v1` | `c928d685cdecd26b` |
| 3 | 20260830 | `learning_courses_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `785d958 / 2026-07-22 15:02:48 +0300 / feat(learning): add courses foundation v1` | `e5f1125df9d33efb` |
| 4 | 20260831 | `learning_sections_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `887f2c2 / 2026-07-22 16:56:38 +0300 / feat(learning): add sections foundation v1` | `c2a2c9244209919d` |
| 5 | 20260832 | `learning_lessons_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `734e782 / 2026-07-22 17:44:39 +0300 / feat(learning): add lessons foundation v1` | `50fcf8b9d56ce295` |
| 6 | 20260833 | `learning_activities_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `d397b02 / 2026-07-22 19:40:35 +0300 / feat(learning): add activities foundation v1` | `fbb0f4aad6b52514` |
| 7 | 20260834 | `learning_enrollments_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `9d3c2ac / 2026-07-22 23:46:37 +0300 / feat(learning): add enrollments foundation v1` | `f9876078f854e157` |
| 8 | 20260835 | `learning_progress_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `ad0a1e1 / 2026-07-22 21:46:32 +0300 / feat(learning): add progress foundation v1` | `b87c6bc0bd188b69` |
| 9 | 20260836 | `learning_lesson_content_blocks_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `9dac656 / 2026-07-22 22:35:58 +0300 / feat(learning): add lesson content blocks foundation v1` | `c5144ce182fe59a1` |
| 10 | 20260837 | `learning_questions_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `bdf6de2 / 2026-07-22 23:33:32 +0300 / feat(learning): add questions foundation v1` | `e90779d468e46279` |
| 11 | 20260838 | `learning_attempts_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `0a36adc / 2026-07-23 10:21:34 +0300 / feat(learning): add attempts foundation v1` | `2646d92d036eb66d` |
| 12 | 20260839 | `learning_scoring_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `23f2728 / 2026-07-23 13:03:05 +0300 / feat(learning): add scoring foundation v1` | `6076d00e25ce4409` |
| 13 | 20260840 | `learning_read_model_hardening_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `de40a5d / 2026-07-23 13:50:05 +0300 / feat(learning): harden learner read model v1` | `babfe43d21aebdc2` |
| 14 | 20260841 | `learning_learner_result_delivery_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `9cf3e3d / 2026-07-23 20:52:09 +0300 / feat(learning): add learner result delivery v1` | `4ba74853e3b36129` |
| 15 | 20260844 | `learning_result_policy_completion_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `1c82b71 / 2026-07-24 14:43:28 +0300 / feat(learning): complete learner result release policies` | `e7fb4223348e9a23` |
| 16 | 20260845 | `learning_progress_mutations_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `7de94be / 2026-07-24 14:43:29 +0300 / feat(learning): apply progress from scored attempts` | `8f3d66d01e06562c` |
| 17 | 20260848 | `learning_assessment_delivery_minimal_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `32efed4 / 2026-07-24 14:43:29 +0300 / feat(learning): add assessment delivery minimal v1` | `7b4df7a09220202c` |
| 18 | 20260849 | `learning_assessment_attempt_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `f4ecbad / 2026-07-24 14:43:29 +0300 / feat(learning): add assessment attempt foundation v1` | `f06d0bfd88c041aa` |
| 19 | 20260850 | `learning_assessment_answer_persistence_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `1c02728 / 2026-07-24 14:43:29 +0300 / feat(learning): add assessment answer persistence v1` | `2f7f0fdc05e915e0` |
| 20 | 20260851 | `learning_assessment_submission_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `b5d29e0 / 2026-07-24 14:43:30 +0300 / feat(learning): add assessment submission foundation v1` | `d4c73cf623bd26ac` |
| 21 | 20260852 | `learning_assessment_objective_grading_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `caf96aa / 2026-07-24 14:43:30 +0300 / feat(learning): add assessment objective grading foundation v1` | `1219b785ff0fe6c6` |
| 22 | 20260853 | `learning_assessment_manual_review_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `7911199 / 2026-07-24 14:43:30 +0300 / feat(learning): add assessment manual review foundation v1` | `9375b4f4d68c8ec0` |
| 23 | 20260854 | `learning_assessment_progress_integration_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `5762092 / 2026-07-24 14:43:30 +0300 / feat(learning): integrate graded assessments with progress` | `6b6f6159454077b8` |
| 24 | 20260855 | `learning_completion_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `e16435b / 2026-07-24 14:43:30 +0300 / feat(learning): add completion foundation v1` | `4bf6b72f37226d28` |
| 25 | 20260856 | `learning_instructor_experience_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `fae27fb / 2026-07-24 14:43:30 +0300 / feat(learning): add instructor experience foundation v1` | `8a882f0ff0717a38` |
| 26 | 20260857 | `learning_assignments_coursework_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `b68e0bd / 2026-07-24 14:43:31 +0300 / feat(learning): add assignments coursework foundation v1` | `1dd4588f40dab20f` |
| 27 | 20260858 | `learning_discussions_community_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `51f8477 / 2026-07-24 14:43:31 +0300 / feat(learning): add discussions community foundation v1` | `55ecec04e3705fc5` |
| 28 | 20260859 | `learning_live_calendar_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `b25431f / 2026-07-24 14:43:31 +0300 / feat(learning): add live calendar foundation v1` | `d9e2922ea28535da` |
| 29 | 20260860 | `learning_beta_readiness_auth_alignment_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `0debf03 / 2026-07-24 14:43:31 +0300 / chore(learning): harden beta readiness v1` | `2db9f270756f5910` |
| 30 | 20260861 | `learning_instructor_course_tree_read_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `7d7fa23 / 2026-07-25 17:41:58 +0300 / feat(learning): add instructor course tree read RPC` | `656c8c8585dd4400` |
| 31 | 20260862 | `learning_instructor_lesson_blocks_read_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `f92dd39 / 2026-07-25 18:21:07 +0300 / feat(learning): add instructor lesson blocks read RPC` | `6d9b022d5cb4faf1` |
| 32 | 20260863 | `learning_first_course_readiness_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `6a2897f / 2026-07-26 16:18:29 +0300 / ي╗┐feat(learning): first-course readiness engine, progress, projects, labs` | `02f555da099a0596` |
| 33 | 20260864 | `learning_project_instructor_review_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `cf04a0c / 2026-07-26 17:39:12 +0300 / fix(learning): enforce unlock gating and add project review queue` | `b1d01b2ad40f7065` |
| 34 | 20260866 | `learning_public_course_preview_foundation_v1` | LEARNING | Filename matches `*learning_*`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | `d7c6669 / 2026-07-27 14:39:29 +0300 / feat(learning): add public catalog and course preview foundation v1` | `c97d1e1805c2f178` |

### Flat list (machine-friendly)

```
LEARNING_EXPECTED_MIGRATIONS=[
20260828, 20260829, 20260830, 20260831, 20260832, 20260833, 20260834, 20260835, 20260836, 20260837, 20260838, 20260839, 20260840, 20260841, 20260844, 20260845, 20260848, 20260849, 20260850, 20260851, 20260852, 20260853, 20260854, 20260855, 20260856, 20260857, 20260858, 20260859, 20260860, 20260861, 20260862, 20260863, 20260864, 20260866
]
LEARNING_EXPECTED_FILES=[
  20260828_learning_spaces_membership_foundation_v1.sql
  20260829_learning_programs_foundation_v1.sql
  20260830_learning_courses_foundation_v1.sql
  20260831_learning_sections_foundation_v1.sql
  20260832_learning_lessons_foundation_v1.sql
  20260833_learning_activities_foundation_v1.sql
  20260834_learning_enrollments_foundation_v1.sql
  20260835_learning_progress_foundation_v1.sql
  20260836_learning_lesson_content_blocks_foundation_v1.sql
  20260837_learning_questions_foundation_v1.sql
  20260838_learning_attempts_foundation_v1.sql
  20260839_learning_scoring_foundation_v1.sql
  20260840_learning_read_model_hardening_v1.sql
  20260841_learning_learner_result_delivery_v1.sql
  20260844_learning_result_policy_completion_v1.sql
  20260845_learning_progress_mutations_v1.sql
  20260848_learning_assessment_delivery_minimal_v1.sql
  20260849_learning_assessment_attempt_foundation_v1.sql
  20260850_learning_assessment_answer_persistence_v1.sql
  20260851_learning_assessment_submission_foundation_v1.sql
  20260852_learning_assessment_objective_grading_foundation_v1.sql
  20260853_learning_assessment_manual_review_foundation_v1.sql
  20260854_learning_assessment_progress_integration_v1.sql
  20260855_learning_completion_foundation_v1.sql
  20260856_learning_instructor_experience_foundation_v1.sql
  20260857_learning_assignments_coursework_foundation_v1.sql
  20260858_learning_discussions_community_foundation_v1.sql
  20260859_learning_live_calendar_foundation_v1.sql
  20260860_learning_beta_readiness_auth_alignment_v1.sql
  20260861_learning_instructor_course_tree_read_v1.sql
  20260862_learning_instructor_lesson_blocks_read_v1.sql
  20260863_learning_first_course_readiness_v1.sql
  20260864_learning_project_instructor_review_v1.sql
  20260866_learning_public_course_preview_foundation_v1.sql
]
```

## NON_LEARNING exclusions inside prior false window 20260828-20260866

| MIGRATION_ID | MIGRATION_NAME | DOMAIN_OWNER | WHY_EXCLUDED |
| --- | --- | --- | --- |
| 20260842 | ads_deliverable_binding_database_authority_v1 | ADS | Ads SQL + filename; not `*learning_*` |
| 20260843 | (no file) | OTHER/MISSING | No migration file on tip; cannot be Learning acceptance member |
| 20260846 | games_platform_foundation_v1 | GAMES | Games foundation SQL + filename; not `*learning_*` |
| 20260847 | games_catalog_foundation_v1 | GAMES | Games catalog SQL + filename; not `*learning_*` |
| 20260865 | articles_teaser_foundation_v1 | OTHER | Articles teaser foundation; header says does not alter Learning; not `*learning_*` |

NON_LEARNING_MIGRATIONS_EXCLUDED=YES

## Method (independent)

1. `git fetch --prune` on workspace
2. Enumerate `supabase/migrations/*.sql` on HEAD and `origin/alpha-0.2`
3. Apply domain contract: include iff filename matches `*learning_*`
4. Cross-check SQL content tokens / headers / created objects
5. Cross-check Learning docs + `lib/learning` + Games tests for ownership assertions
6. Cross-check Learning SoT worktree file set
7. Explicitly classify 42/46/47 with filename + SQL + git evidence
8. Reject arbitrary numeric range construction `20260828-20260866 => 39`

## Open issues / follow-ons (non-blocking for this correction artifact)

- Prior LB-001 POST used false EXPECTED=39 against linked project history; re-probe must use EXPECTED=34 `*learning_*` tip set.
- Trio 42/46/47 alignment is an Ads/Games (or shared history) concern, **not** Learning expected-set membership.
- Learning SoT worktree is behind `origin/alpha-0.2` by 58 commits; inventory parity for `*learning_*` still holds at 34.

---
END PC2_A1_LEARNING_EXPECTED_SET_CORRECTION_V1
