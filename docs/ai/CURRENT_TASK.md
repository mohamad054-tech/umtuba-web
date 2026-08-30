# Current Task

> **PC2 UM Life rich personal profile V1 — PART 2B AUTHORIZED. Schema + real data + editor. PART 1B-A preserved. PART 1B-B not started.**

## Task

```text
TASK_ID = PC2_UMTUBA_RICH_PERSONAL_PROFILE_V1_PART2B
ROLE = RICH_PROFILE_SCHEMA + RLS + EDITOR + PUBLIC_RENDER
STATUS = AUTHORIZED
MODE = IMPLEMENT
SOURCE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
BASE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
PART1B_A_CANDIDATE_SHA = 8ab99fba6c02267c7efc576dd6ff79d131b52b5f
PART1B_A_IMPLEMENTATION_SHA = 4d4953d8314d8cbcb5b2e173786198fe7586d13e
PART2A_COMMIT_SHA = c4f0fbfc810eb39bfd48b13e933a41374df2df93
PART2A_BRANCH = pc2/um-life-rich-personal-profile-v1-part2a
PART2B_BRANCH = pc2/um-life-rich-personal-profile-v1-part2b
AUTHORIZED_MIGRATION_SCOPE = RICH_PROFILE_ONLY
DEPLOYED = NO
DATABASE_CHANGED = NO
PART1B_B = NOT_AUTHORIZED
```

## Product / goal

Minimum real database foundation for a rich personal UMTUBA profile: keep `public.profiles`, add `bio_long` / `cover_url` / `website_url`, plus six normalized tables with visibility + RLS. Wire Settings editor CRUD and public `/profile/[username]` render from real data.

## Allowed scope

- Additive profile schema only (profiles scalars + 6 tables + indexes/checks/RLS + cover storage)
- Settings editor inside existing `/settings`
- Public profile render of real rich-profile data
- Tests, i18n (EN/AR required; preserve other locales), docs
- Local/dev migration only — never remote production

## Forbidden scope

- No PART 1B-B
- No Store / Learning backends, Watch architecture, Stories DB, Android/iOS, payments
- No production apply, no deploy, no Central merge
- Do not replace `public.profiles`
- Do not collect phone, private email, street address, government ID, financial, live location, pronouns
- Do not reuse `user_interest_profiles`

## Next

Implement Part 2B on top of the Part 2A commit. Do not start Part 1B-B.
