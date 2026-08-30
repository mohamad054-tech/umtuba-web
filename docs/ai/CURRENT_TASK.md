# Current Task

> **PC2 UM Life rich personal profile V1 — PART 2A complete (no commit). Schema designed, not migrated. PART 1B-A preserved. PART 1B-B not started.**

## Task

```text
TASK_ID = PC2_UMTUBA_UM_LIFE_RICH_PERSONAL_PROFILE_V1_PART2A
ROLE = SOURCE_FIRST + PROFILE_PRODUCTIZATION + SCHEMA_DESIGN + IMPLEMENT_WHAT_REQUIRES_NO_MIGRATION
STATUS = IMPLEMENTED_UNCOMMITTED
MODE = SOURCE_FIRST + PROFILE_PRODUCTIZATION + SCHEMA_DESIGN + IMPLEMENT_WHAT_REQUIRES_NO_MIGRATION
SOURCE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
BASE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
CANDIDATE_SHA = 8ab99fba6c02267c7efc576dd6ff79d131b52b5f
IMPLEMENTATION_SHA = 4d4953d8314d8cbcb5b2e173786198fe7586d13e
FINAL_SHA = 8ab99fba6c02267c7efc576dd6ff79d131b52b5f
PART1B_A_BRANCH = pc2/um-life-part1b-a-social-home-candidate
PART2A_BRANCH = pc2/um-life-rich-personal-profile-v1-part2a
NO_DATABASE_MIGRATIONS = YES
DEPLOYED = NO
DATABASE_CHANGED = NO
MIGRATIONS_CREATED = NO
PART1B_B = NOT_AUTHORIZED
```

## Product / goal

One UMTUBA identity (Person + Social + Creator + Teacher + Seller). Visitors can understand who a person is from existing public fields. Repeatable life data (education, work, places beyond city/country, milestones, skills, cover, social links, field privacy) is designed only — no migration this part.

## Allowed scope (done)

Inspected actual profile routes, components, settings, migrations (read-only), RLS, post→profile navigation. Implemented no-migration UX. Designed minimum proposed schema. Tests + tsc + git diff --check. Public profile verified via local HTTP (browser MCP tab could not be kept).

## Forbidden scope (held)

No migrations. No production DB. No deploy. No PART 1B-B. No commit. PART 1B-A candidate branch left intact at `8ab99fba`.

## Next

Owner visual review of `/profile/mohamad` and `/profile/lina.creates`. Separate GO required for rich-profile schema/migrations. PART 1B-B remains a separate GO.
