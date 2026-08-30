# Current Task

> **PC2 UM Life social experience V1 — PART 1B-A OWNER REVIEW GATE. Preserve candidate. No migrate/deploy. PART 1B-B not authorized.**

## Task

```text
TASK_ID = PC2_UMTUBA_UM_LIFE_SOCIAL_EXPERIENCE_V1_PART1B_A_OWNER_REVIEW_GATE
ROLE = OWNER REVIEW GATE — PRESERVE CANDIDATE, LOCAL PREVIEW, AUTHENTICATED UI CHECK
STATUS = GO
SOURCE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
BASE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
AUTHORITATIVE_SOURCE = this workspace office/platform-translation-trunk-port-v1
CANDIDATE_BRANCH = pc2/um-life-part1b-a-social-home-candidate
NO_DATABASE_MIGRATIONS = YES
DEPLOYED = NO
DATABASE_CHANGED = NO
MIGRATIONS_CREATED = NO
PART1B_B = NOT_AUTHORIZED
```

## Product / goal

Preserve the PART 1B-A social Home candidate (Share on UM, latest-post overlay, comments/mentions, share-to-messages, save). Run a local preview so the owner can review Home `/` live. Perform an authenticated functional check. Do not start PART 1B-B.

## Allowed scope (PART 1B-A owner review gate)

- Commit the existing PART 1B-A implementation on a dedicated local candidate branch.
- Start or reuse the local Next.js preview for Home `/`.
- Authenticated UI checks (publish, like, comment, mention, save, share, send-in-messages, profile return, feed position).
- Small implementation-only feed-position fix if it is safe and in PART 1B-A (no schema).
- Update CURRENT_TASK.md and CURSOR_REPORT.md for this gate.

## Forbidden scope

- Do not start PART 1B-B.
- Do not create migrations or change the database.
- Do not deploy.
- Do not merge to Central.
- Do not reset/discard the current implementation.
- Do not push unless the only way to preserve the candidate (default: local only).
- No parent_id, nested replies, comment edit schema, post_reactions, visibility, post_intent, Learning/Store/Event linking schema.

## Next

Owner visual + functional review on LOCAL_PREVIEW_URL. PART 1B-B remains a separate GO.
