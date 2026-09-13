# PC2 — 31 August checkpoint still holds (2026-09-02 reconfirm)

```text
TASK_ID = PC2_2026_08_31_CHECKPOINT_STILL_HOLDS_V1
AUTHORITY = docs/ai/PC2_2026_08_31_END_OF_DAY_PRESERVATION.md
SEP_1_IS_AUTHORITY = NO
UM_STREAK_ACTIVE = NO
DATE = 2026-09-02
PRODUCTION_TOUCHED = NO
PUSH = NO
MERGE = NO
APPLY = NO
SQL_FILES_CREATED = NO
```

Owner asked to continue the **31 August** save. This file is the safe leftover from that day: identities reconfirmed, source-package inventory listed, next write/merge still blocked on an explicit GO.

---

## Quoted 31 August stop

```text
TASK_ID = CENTRAL_UMTUBA_SOCIAL_COMM_PROFILE_INTEGRATION_REVIEW_V1
STATUS = SOURCE_PASS_MIGRATION_HOLD
PC2_CANDIDATE_SHA = 814226776ced7325b174665f773906e163efcb2d
LOCAL_REVIEW_FIX_SHA = 75b3896c6a3852258f4e303c4cb54c17d1da5836
AUTHORITATIVE_BASE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
SOURCE_REVIEW = PASS
MIGRATION_20260915_DECISION = AMEND_FIRST
MIGRATION_20260916_DECISION = AMEND_FIRST
READY_FOR_SOURCE_MERGE = NO
READY_FOR_MIGRATION_APPLICATION = NO
READY_FOR_PRODUCTION_DEPLOY = NO
NEXT_REQUIRED_GATE = CENTRAL_MIGRATION_VERSION_REALLOCATION_THEN_SOURCE_MERGE_GO
```

`PC2_2026_08_31_RESUME.md` is morning-of-31-Aug VTx/Docker only. Already done. Do not redo BIOS.

---

## Reconfirm 2026-09-02 (read-only)

| Identity | 31 Aug saved | Live now | Match |
| --- | --- | --- | --- |
| `origin/alpha-0.2` | `b5fbeff29cb0f308481b38c06500c572cd44a9c4` | same | YES — `BASE_MOVED = NO` |
| Candidate product | `81422677` | same parent of live HEAD | YES |
| Candidate live HEAD | `75b3896c6a3852258f4e303c4cb54c17d1da5836` | same | YES |
| Candidate branch | `pc2/umtuba-social-comm-profile-central-integration-candidate-v1` | same, no upstream | YES |
| Primary checkout | `196a0358` on comms, ahead 3 | same | YES |
| UM Life worktree | detached `09155b15` | same | YES |
| `0f89d449` ancestor of candidate | NO | still NO | YES |
| Rich-profile SQL SHA256 | `A0826222…` | `A08262223A97D911FED9E8A486800AC35F8B167F4DA2EA04A75097805BA4AD30` | YES |
| Comms-identity SQL SHA256 | `CBA53172…` (`ON CONFLICT (user_id)`) | `CBA53172DB9EFA57B194636589C346297C5D9DDB7A511BE7BBE3C4BC63F13721` | YES |

Candidate extra vs `b5fbeff2` including the welcome-nav fix: **66 files, +9736 / −164**.

No `20260935` / `20260936` files exist on the candidate or the primary checkout.

---

## Source package to keep (later GO only)

Include:

- Candidate commit `81422677`
- Local review fix `75b3896c` (LandingHero + nav contract tests)

Exclude:

- `0f89d449` (posts precursor + filename uniquify)
- `d84dbda5` (XOR loser vs `b67a7b33`)
- `196a0358` (comms-checkout Messages wrap; already in candidate)
- UM Streak isolated commit `70b51f77`

Do **not** ship colliding filenames `20260915` / `20260916` onto `alpha-0.2`. When a later write-GO exists, add **new** unique versions after a verified remote tip. Keep these bodies.

Welcome-nav fix files in `75b3896c`:

- `app/components/landing/LandingHero.tsx`
- `app/lib/nav/mobileNav.test.ts`
- `app/lib/nav/shellCoherence.test.ts`
- `app/lib/nav/umLifeHomeEntry.test.ts`

Untracked on candidate (leave): `scripts/_pc2_central_integration_candidate_gate.mjs`

---

## Still blocked (31 Aug rule)

The next named gate is `CENTRAL_MIGRATION_VERSION_REALLOCATION_THEN_SOURCE_MERGE_GO`. 31 August did **not** authorize write / merge / apply / deploy.

Need an explicit later token, for example `PC2_RENUMBER_THEN_SOURCE_MERGE_GO`, before:

1. Writing new additive SQL (proposed pair only after a current hosted tip check)
2. Source-merge
3. Hosted apply
4. Deploy

Do not steal `20260935` / `20260936` for another feature.

---

## UM Streak (stopped — not this checkpoint)

Isolated only. Not mixed into this package.

```text
WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-um-streak-social-camera-v1
BRANCH = pc2/umtuba-um-streak-social-camera-foundation-v1
SHA = 70b51f7719ce2111c1a09710efcbcdc072ff0d93
MIGRATION = 20260937 (isolated, not applied)
PUSH = NO
```

Primary checkout has only a pointer doc plus overwritten task docs (now restored away from UM Streak).
