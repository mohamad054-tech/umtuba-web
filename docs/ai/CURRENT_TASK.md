# Current Task

> Rich personal profile PART 2B remains implemented and preserved on `pc2/um-life-rich-personal-profile-v1-part2b` (`3d6ed0eb` / tip `455fdca8`). Part 1B-A social home remains at `4d4953d8` / `8ab99fba`. This file is now the Communications Part 1B identity task. The 2B report is archived at `docs/ai/PC2_UMTUBA_RICH_PERSONAL_PROFILE_V1_PART2B_REPORT.md`.

## Task

```text
TASK_ID = PC2_UMTUBA_COMMUNICATIONS_V1_PART1B_IDENTITY_DISCOVERY
ROLE = IDENTITY + DISCOVERY + PRIVACY + CONVERSATION_ENTRY
STATUS = IMPLEMENTED
MODE = IMPLEMENT
AUDIT_SOURCE_SHA = 455fdca8805b39cc5716861583109a4ab6600dbe
WEB_BASE_SHA = 455fdca8805b39cc5716861583109a4ab6600dbe
PART1B_A_IMPLEMENTATION_SHA = 4d4953d8314d8cbcb5b2e173786198fe7586d13e
PART1B_A_CANDIDATE_SHA = 8ab99fba6c02267c7efc576dd6ff79d131b52b5f
PART2B_CANDIDATE_SHA = 3d6ed0eb982f59b43df4a86ab1cecf3c86f9612e
COMMS_BRANCH = pc2/umtuba-communications-v1-part1b-identity-discovery
AUTHORIZED_MIGRATION_SCOPE = COMMUNICATIONS_IDENTITY_DISCOVERY_ONLY
PLATFORMS = WEB + ANDROID + IOS
ARCHITECTURE = ONE_SHARED_COMMUNICATIONS_DOMAIN
DEPLOYED = NO
DATABASE_CHANGED = NO
```

## Product / goal

First-class Communications entry: username, email, phone identity, personal link/QR, discovery privacy, and conversation open — all reusing the existing messenger (`get_or_create_direct_conversation`). No second messenger. No calls. No phone/email on `public.profiles`.

## Allowed scope

- Additive comms identity / privacy / safe discovery RPCs (separate from `20260915_rich_personal_profile_foundation_v1.sql`)
- Web `/messages` start-conversation + `/settings` communications privacy
- Personal contact link + QR of that link only
- Tests, i18n EN/AR on touched surfaces
- Isolated comms branch from current web HEAD
- Mobile only if an isolated worktree can be cut without merging the divergent mobile tree
- Local/dev migration only — never remote production

## Forbidden scope

- No voice/video/CallKit/LiveKit DM calling/TURN
- No groups, message-media, voice notes, friends, communities
- No Store / Learning / Profile 2B schema changes
- No phone/email columns on `public.profiles`
- No copying `auth.users.email` to a public table
- No full address-book upload
- No auto SMS/email invites, no auto-created accounts
- No production apply, no deploy, no Play/App Store, no Central merge
- Do not reset rich profile or Part 1B-A branches
