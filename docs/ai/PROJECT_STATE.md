# UMTUBA Project State (AI Handoff)

## Last freeze

- **2026-08-20** — UM Life Phase 1 candidate on `central/um-life-phase1-v1` from production `b398dc02`. Routes `/life` and `/life?post=`. No SQL. No deploy. No FF of `alpha-0.2`. Report: `D:\umtuba-central\reports\UMTUBA_CENTRAL_UM_LIFE_PHASE1_IMPLEMENTATION_V1.md`.
- Live web remains `b398dc02-20260820230003` / SHA `b398dc02`. `20260931` HOLD.

## Active feature

- **Branch:** `office/ai-core-private-ai-deployment-runtime-onto-alpha-v1`
- **Task:** Private AI Deployment & Runtime onto Alpha V1
- **Worktree:** `D:\umtuba-central\repos\umtuba-web-ai-core-private-ai-deployment-runtime-onto-alpha-v1`

## Lineage tip chain (awaiting alpha GO)

1. `4690bb7` providers on alpha (merged)
2. … streaming → private AI → data platform → KA → workflow → lifecycle `6219633`
3. (this) private AI deployment runtime

## Safety

- No live provider / real deployment
- No alpha merge without GO
- No Commerce / Learning / Collaboration / Mobile / Guardian
- Migrations local-only (none new this milestone)
