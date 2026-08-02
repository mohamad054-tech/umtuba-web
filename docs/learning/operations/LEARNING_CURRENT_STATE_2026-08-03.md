# Learning Current State — 2026-08-03

Checkpoint for Desktop Learning workstation before shutdown.
Documentation only. No feature work. No migrations. No remote mutation in this handoff.

=====================================
LEARNING SOURCE OF TRUTH
=====================================

| Field | Value |
| --- | --- |
| Current worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-learning-collaboration-workspace-activity-timeline-foundation-v1` |
| Current branch | `office/learning-collaboration-workspace-activity-timeline-foundation-v1` |
| Current HEAD | tip of `office/learning-collaboration-workspace-activity-timeline-foundation-v1` after handoff commit (`docs(learning): persist learning session handoff v1`) |
| Sync | `0 / 0` with origin after push |
| Project ref | `tgucwnjwoyeqoxqaxmew` |

=====================================
COMPLETED FOUNDATIONS
=====================================

Product foundations (Git tip + remote where noted):

- Learning Core
- Assessments
- Assignments
- Projects
- Community
- Live
- AI Tutor
- Workspace Spine
- Workspace Attachments
- Workspace Activity Timeline

Remote migrations completed:

- `20260828`–`20260864` (Learning foundations through project instructor review)
- `20260866` (public course preview)
- `20260872`–`20260874` (AI Tutor persistence / metadata / lesson binding)
- `20260896` (AI Tutor resume / history read)
- `20260897` (AI Tutor thread lifecycle foundation)

History repairs (objects already present; history registered):

- `20260861` — `learning_instructor_course_tree_read_v1`
- `20260862` — `learning_instructor_lesson_blocks_read_v1`

Commerce migrations `20260875` / `20260876` remain store-owned and untouched by Learning renumber (`20260896` / `20260897`).

=====================================
CURRENT LEARNING STATUS
=====================================

| Metric | Value | Source |
| --- | --- | --- |
| Learning completion (cats 1–11) | **82%** | Production Readiness Audit V2 |
| Launch readiness | **52%** | Production Readiness Audit V2 |
| Production launch gate | **FAIL** | Same audit — blocker class = unproven journeys |

=====================================
CURRENT LAUNCH BLOCKERS
=====================================

1. Learning E2E (primary) — no Playwright/critical-path browser suite proven with isolated identities
2. Content block smoke — renderer coverage not yet landed/proven as a gate
3. LiveKit environment — unset; live video join fail-closed until configured or scoped out
4. Catalog performance merge — `origin/office/perf-learning-catalog-optimization-v1` @ `1bc60e0` not ancestor of tip
5. Beta activity seed — skeleton data exists; cohort activity thin (discussions/live/assignments/tutor)

=====================================
NEXT MILESTONE
=====================================

**Learning Production Smoke & E2E Gate V1**
Capability: `learning.ops.production_smoke_e2e_gate_v1`

Build and run production-like smoke/E2E for the critical learner path (catalog → access → lesson → blocks → progress → assessment → assignment/project → AI Tutor → community → workspace → live fail-closed). Prefer Playwright + isolated test users. No new product features in that milestone.

=====================================
STOP CONDITIONS
=====================================

- No new Learning features before Smoke Gate.
- No realtime / shared docs / shared AI memory.
- No LiveKit setup yet (fail-closed is acceptable until launch scope decides).
- No commit to Commerce.
- Commerce remains frozen on Desktop.
- No migrations / no remote DB mutation unless a separate explicit GO.

## Related audits

- Canvas: Learning Production Readiness Audit V2 (Cursor canvases)
- Prior tip chain: spine `70e00e3` → attachments `67cf30f` → timeline `4f38310` → AI Tutor renumber/align `6e4e789` / `7e83cd2`
