# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2` — integration Wave 3.5 landing Revenue + Commerce + AI (verify tip after push)

## Active feature (this machine — Desktop)

- **Branch:** `integration/w3-alpha-final` (from `origin/alpha-0.2` @ `769039d`)
- **Worktree:** `C:\Users\1\Desktop\umtuba\umtuba-web-integration-w3-alpha-final`
- **Task:** Integration Program V1 — Wave 3.5 Alpha Integration
- **Incoming:** `origin/integration/w3-ai` @ `d4bbddc`
- **See:** `docs/ai/CURSOR_REPORT.md`

## Closed on alpha-0.2 (do not reopen)

- Home Circular Arc Navigation Foundation V1
- Home Circular Arc Preview & Polish V1
- Home Left Action Rail Arc Alignment V1
- Home Assembly V1 (`6fac440`)
- Arc design locked: 7 circles, arc `[0,-6,-11,-14,-11,-6,0]`, host `left-[5px]`
- Creator Space Photos Lightbox V1 (`769039d`)
- Integration W1 Revenue / W2 Commerce / W3 AI (via Wave 3.5)

## Gates (unchanged)

- `HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false`
- `HOME_LOCK_ACTIVE = true`
- Preview via existing `shouldMountHomeCircularArc()` only
- AI product flags default OFF (`UMTUBA_AI_HUB`, `UMTUBA_AI_ASSISTANT_RUNTIME`, `UMTUBA_AI_VIDEO_PERSONALIZATION`)

## Learning chapter status

**Learning V1 is officially APPROVED and FROZEN** (2026-07-27).

Official close-out document: `docs/learning/UMTUBA_LEARNING_V1_FINAL.md`
Session continuity: `docs/ai/SESSION_HANDOFF.md`

Frozen baselines (extend, do not replace):

- Wave A production baseline (JA-01 / JA-02 / JA-03)
- Nexus Learning Architecture
- Nexus Design System
- Nexus V2 Premium Experience
- Portfolio / Certification / AI Assistant integration models

## Active academy priority

**Save point 2026-07-28 (Cursor Pro → Ultra restart).** Full state: `docs/ai/SESSION_HANDOFF.md`.

| Track | Status |
| --- | --- |
| Wave B content | CLOSED |
| Learning UX / Nexus | FROZEN |
| Course Import & E2E V1 | PAUSED |
| Commerce Architecture Program | COMPLETE (frozen docs) |
| Commerce End-to-End Beta Readiness | COMPLETE — merged via Integration W2/W3.5 |
| Unified Revenue Platform Foundation | COMPLETE — merged via Integration W1/W3.5 |
| Shared AI Core / Hub / Assistant | COMPLETE — merged via Integration W3/W3.5 (flags OFF) |

Default: Do not modify frozen Commerce architecture documents. Do not delete Store docs.

### Autonomy (standing)

Routine in-scope create/update/run/mirror/report work may proceed without per-step approval **only inside the explicitly active phase**.
Paused phases must not auto-resume. Still ask before: destructive data loss, destructive prod DB, push/force-push, merge/delete branches, system-wide installs, credentials/payments, irreversible out-of-scope actions.

## Source of truth

- **GitHub origin** is the source of truth for the repository.
- Always synchronize with origin before starting work.
- Learning curriculum packages: Bootcamp / Jinn Wave path + dist importers (see Learning V1 final doc).
- Learner runtime state: UMTUBA Learning DB.

## Machines

| Machine | Role |
| --- | --- |
| **Laptop** | Primary development and integration machine |
| **Desktop** | Isolated feature / integration worktrees |

## Safety defaults

- **No commit** without explicit approval in the user request.
- **No push** without explicit approval in the user request.
- **No remote Supabase migration apply** without explicit approval.
- **No destructive Git actions** without explicit approval.
- Follow `docs/DEVELOPMENT_WORKFLOW.md`.
- Follow `docs/ai/CURRENT_TASK.md` for active handoff scope when applicable.
- Write execution results to `docs/ai/CURSOR_REPORT.md`.
- Prefer `docs/ai/SESSION_HANDOFF.md` for Learning continuity after V1 close-out.
