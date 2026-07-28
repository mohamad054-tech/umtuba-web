# Current Task

## Task title

Creator Space Hero Completeness V1

## Status

`synced-with-alpha` — Feature commit `3b88b01036269b60410d41830fd24b2af85af091` merged with latest `origin/alpha-0.2` @ `6061a6a` (docs conflicts only)

## Branch

`office/profile-hero-completeness-v1`

## Alpha tip

`origin/alpha-0.2` @ `6061a6ae22eb8a323e51af63ecdcf9b655177d37` (includes Wave 3.5 Revenue + Commerce + Shared AI, lightbox, creator all timeline)

## Feature commit

`3b88b01036269b60410d41830fd24b2af85af091` — feat(web): add creator hero completeness v1

## Done

- Bio clamp/more + specialty chips (max 3, conditional)
- Helpers + tests; mock `lina.creates` long bio for preview
- Synced feature onto latest alpha via merge (no rebase / no force)

## Prior alpha checkpoint (Wave 3.5)

- Status: `complete` on `alpha-0.2`
- Branch: `integration/w3-alpha-final`
- Base progression:
  1. Started from `origin/alpha-0.2` @ `769039d` (creator photos lightbox)
  2. Merged `origin/integration/w3-ai` @ `d4bbddc` (Revenue + Commerce + AI)
  3. Re-merged newer `origin/alpha-0.2` @ `4fdbf30` (creator all timeline contract) before landing on alpha
- Scope: Land Revenue + Commerce + Shared AI on alpha. Preserve latest alpha Home/Navigation/profile contracts. AI flags default OFF. No World / Games / Ads. No live providers.

## Gates (unchanged)

- `HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false`
- `HOME_LOCK_ACTIVE = true`

## Out of scope

New features beyond the merged tips, Gemini/OpenAI live activation, force-push, Worktree cleanup. Merge into `alpha-0.2` not in this sync step.
