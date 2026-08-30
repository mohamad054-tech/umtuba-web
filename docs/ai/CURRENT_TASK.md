# Current Task

> **PC2 UM Life social experience V1 — PART 1B-A OWNER REVIEW GATE. Candidate preserved locally. Preview live. PART 1B-B not authorized.**

## Task

```text
TASK_ID = PC2_UMTUBA_UM_LIFE_SOCIAL_EXPERIENCE_V1_PART1B_A_OWNER_REVIEW_GATE
ROLE = OWNER REVIEW GATE — PRESERVE CANDIDATE, LOCAL PREVIEW, AUTHENTICATED UI CHECK
STATUS = OWNER_REVIEW_UI_READY
SOURCE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
BASE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
CANDIDATE_BRANCH = pc2/um-life-part1b-a-social-home-candidate
NO_DATABASE_MIGRATIONS = YES
DEPLOYED = NO
DATABASE_CHANGED = NO
MIGRATIONS_CREATED = NO
PART1B_B = NOT_AUTHORIZED
READY_FOR_OWNER_VISUAL_REVIEW = YES
READY_FOR_PART1B_B_AUTHORIZATION = NO
```

## Product / goal

PART 1B-A candidate is committed on a local branch. Home `/` is live for the owner at http://localhost:3000/. Authenticated publish/like/comment/mention/save/share/send checks could not be completed in this gate because the browser MCP could not keep a tab and no existing signed-in session was available to this agent. Do not start PART 1B-B until the owner finishes the live review.

## Allowed scope (this gate)

Preserve/commit the PART 1B-A candidate. Local preview. Authenticated UI check if a real session exists. Document feed-position remainder. Update CURRENT_TASK.md and CURSOR_REPORT.md.

## Forbidden scope

Still in force: no PART 1B-B; no migrations; no deploy; no Central merge; no discard/reset of the candidate; no push (local branch only).

## Next

Owner opens http://localhost:3000/ while signed in and completes the visual + functional checklist. PART 1B-B remains a separate GO.
