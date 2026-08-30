# Current Task

> End-of-day preservation complete. Do not start new product work tonight. Tomorrow starts at BIOS VTx, then local Supabase — do not repeat completed UM Life / Comms / Rich Profile implementation.

## Task

```text
TASK_ID = PC2_UMTUBA_2026_08_30_END_OF_DAY_PRESERVATION
STATUS = PRESERVED
PRIMARY_TARGET = LOCAL
PRODUCTION = STRICTLY_FORBIDDEN
UM_LIFE_FINAL_WEB_SHA = 09155b158228df7b5523d2388a53a02481f98726
UM_LIFE_WEB_DOCS_TIP = ab3f7b03dcafe8bc70d96b4641e4cdc3188b5bcf
UM_LIFE_FINAL_MOBILE_SHA = 4d07bd6c0eca5514a2e4df139203d929c9943b68
COMMUNICATIONS_WEB_CANDIDATE_SHA = 866749ed76ac1975deeceeb73dfa42c333ed05bd
COMMUNICATIONS_MOBILE_CANDIDATE_SHA = a660e196bb7f1c1276f8a94f69783632c32d3658
MOBILE_AUTHORITATIVE_BASE = 09e94f80775855d7e2036fa7d83d63b9202fb8a4
RICH_PROFILE_FINAL_CANDIDATE_SHA = 455fdca8805b39cc5716861583109a4ab6600dbe
BIOS_VTX_TOMORROW = REQUIRED
REBOOT_INITIATED = NO
HP_MODEL = HP Z440 Workstation
```

## Product / goal

Preserve today’s completed candidates and resume tomorrow at the firmware gate. Checkpoint: `docs/ai/PC2_2026_08_30_END_OF_DAY_PRESERVATION.md`.

## Tomorrow FIRST TASK

```text
Restart → F10 BIOS → Security → System Security → Virtualization Technology (VTx) → Enabled → Save → boot Windows → continue WSL2 → Docker Desktop → Local Supabase → Communications runtime/RLS → Rich Profile runtime/RLS
```

Do not repeat completed audits or completed implementation. Continue from `docs/ai/PC2_UMTUBA_LOCAL_SUPABASE_RUNTIME_ENVIRONMENT_V1.md` after VTx is Enabled.

## Allowed scope (tonight)

- This preservation checkpoint and safe remote backup of dedicated task branches
- Stop disposable `npm run dev` on :3000 after backup

## Forbidden scope

- No new product work
- No production apply, reset, seed, auth, or data changes
- No merge to Central / `alpha-0.2`
- No deploy, Play, App Store, force push, destructive git
- Do not delete worktrees, unattributed dirty files, or stashes
- Do not reboot tonight
