# Current Task

> Local Supabase on PC2 is recovered. Do not repeat completed UM Life / Comms / Rich Profile implementation. Do not touch production.

## Task

```text
TASK_ID = PC2_UMTUBA_LOCAL_SUPABASE_RUNTIME_ENVIRONMENT_V1
STATUS = LOCAL_STACK_RECOVERED
PRIMARY_TARGET = LOCAL
PRODUCTION = STRICTLY_FORBIDDEN
RESUME_DATE = 2026-08-31
YESTERDAY_CHECKPOINT = docs/ai/PC2_2026_08_30_END_OF_DAY_PRESERVATION.md
COMMS_WEB_BRANCH = pc2/umtuba-communications-v1-part1b-identity-discovery
COMMS_WEB_HEAD = d354fd2fa2a3f16f134acf8038f84b627840498d
COMMUNICATIONS_WEB_CANDIDATE_SHA = 866749ed76ac1975deeceeb73dfa42c333ed05bd
UM_LIFE_FINAL_WEB_SHA = 09155b158228df7b5523d2388a53a02481f98726
UM_LIFE_WEB_DOCS_TIP = ab3f7b03dcafe8bc70d96b4641e4cdc3188b5bcf
UM_LIFE_FINAL_MOBILE_SHA = 4d07bd6c0eca5514a2e4df139203d929c9943b68
COMMUNICATIONS_MOBILE_CANDIDATE_SHA = a660e196bb7f1c1276f8a94f69783632c32d3658
MOBILE_AUTHORITATIVE_BASE = 09e94f80775855d7e2036fa7d83d63b9202fb8a4
RICH_PROFILE_FINAL_CANDIDATE_SHA = 455fdca8805b39cc5716861583109a4ab6600dbe
BIOS_VTX = ENABLED
WSL2 = READY
DOCKER_ENGINE = RUNNING
LOCAL_SUPABASE_STARTED = YES
LOCAL_API = http://127.0.0.1:54321
LOCAL_DB = 127.0.0.1:54322
LOCAL_STUDIO = http://127.0.0.1:54323
COMMUNICATIONS_RLS_GATE = PASS
RICH_PROFILE_RLS_GATE = PASS
HP_MODEL = HP Z440 Workstation
```

## Product / goal

Isolated **local** Supabase runtime on PC2 (WSL2 + Docker Desktop WSL2 backend + `npx supabase start` inside Ubuntu) so Communications 1B and Rich Profile 2B can be validated without touching production.

Environment report: `docs/ai/PC2_UMTUBA_LOCAL_SUPABASE_RUNTIME_ENVIRONMENT_V1.md`

## Allowed scope

- Local-only environment: WSL2, Docker Desktop WSL2 backend, `supabase start` on this comms checkout
- Local apply of existing migrations `20260915` and `20260916` only after local stack is up
- Local synthetic test users and authenticated RLS/runtime gates
- Docs for this environment slice (`CURRENT_TASK`, `CURSOR_REPORT`, local-Supabase / resume checkpoints)
- Minimal local-bootstrap source repair (posts precursor, unique short-date filenames, `20260916` ON CONFLICT ambiguity) — not production apply

## Forbidden scope

- No new product features
- Do not repeat completed UM Life / Comms / Rich Profile implementation
- No production apply, reset, seed, auth, or data changes
- No merge to Central / `alpha-0.2`
- No deploy, Play, App Store, force push, destructive git
- Do not delete worktrees, unattributed dirty files, or stashes
- Do not run `supabase link`, `db push`, or `--linked` against the hosted project
