# CENTRAL SERVER — Multi-Agent Assignment Plan V1

**Document ID:** `CENTRAL_SERVER_MULTI_AGENT_ASSIGNMENT_PLAN_V1`  
**Authority:** Central Server (sole task allocator / migration reservation authority)  
**Created:** 2026-08-07  
**Shared Supabase:** `umtuba` / `tgucwnjwoyeqoxqaxmew`  
**Planning branch:** `office/central-server-multi-agent-assignment-plan-v1`  
**Mode:** Audit + assignment plan only — **no merges, no migration apply, no implementation started by this document alone**

---

## 1. Central execution rules (adopted)

1. Server is the **sole** task allocator.  
2. One agent = one owned branch/task.  
3. Agents **cannot** self-select the next milestone or migration version.  
4. Migration numbers are reserved **centrally** after: origin fetch + Git scan + remote `schema_migrations` scan + registry write.  
5. Shared Supabase writes (DDL/DML/repair) require explicit **server GO**.  
6. Every completed milestone ends with **push + report**; server reviews before next assignment.  
7. No hidden local-only completed work.  
8. Remote `schema_migrations` count = 0 is **not** sufficient proof a version is free.

---

## 2. Device / branch inventory (audited 2026-08-07)

| Device | Agent | Platform | Branch | HEAD | Subject (tip) | Status | Pushed | Expected next (if assigned) | Migration ownership |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Server | Agent 1 | Learning | `office/learning-resume-accessible-target-hardening-v1` (SoT) + twin `office/learning-lesson-bookmarks-v1` | `da676abda659b8de6caae8a7ddf4c3835c0c79ea` | reallocate lesson bookmarks → 20260916 | Bookmarks **Git landed**; remote apply **pending** | YES 0/0 | Remote-apply **gate** then apply GO | `20260916` Learning pending |
| Desktop (Computer 1) | Agent 2 | Commerce / Store | `office/commerce-partial-refund-provider-money-execution-v1` | `8c6a53e710a3d75814f1cfb5830eeb204a0c4a9c` | checkpoint provider money execution | **BLOCKED** `P6R_BLOCKED_NO_TEST_CONFIG` (not CLOSED) | YES | P6R2 TEST env requirements audit | `20260915` APPLIED |
| Computer 2 | Agent 3 | Translation | `office/platform-translation-trunk-port-v1` | `35246dd387ee53b72450fa3db8eefcb4e7432314` | Computer 2 central server handoff v1 | **FROZEN** independent work | YES | Only if assigned: limited shadow observation retry | `20260910`–`20260914` APPLIED; TI `20260902` |
| Laptop | Agent 4 | UM Core | `office/um-core-platform-event-publisher-foundation-p16` | `3120432f2cd84a30498192838b2ca58794308352` | event publisher P16 | **P16 CLOSED** | YES 0/0 | P17 **UNASSIGNED** (HOLD) | none |
| Laptop | Agent 4 (stream) | Collaboration | `office/collaboration-workspace-settings-lifecycle-ui-v1` | `6ea06344cbd956e1b626fc4abfe71d4e2d012765` | settings lifecycle reboot handoff | Feature SoT tip verified | YES | Product milestone UNASSIGNED; `20260898` apply **blocked** | Git file `20260898_collaboration_*` **collides** with remote Commerce name |
| Laptop / Server ops | — | Collaboration OPS | `office/collaboration-smoke-e2e-on-settings-tip-v1` | `850421d83bd7de099b26321372837bfb9ebc1922` | smoke e2e on settings tip | Readiness descendant | YES | Not feature SoT | carries `20260898` file |
| Laptop / Server ops | — | Collaboration OPS | `office/collaboration-platform-gate-keepalive-v1` | `807550ef29be72bf345568617b5611cbe427a016` | platform gate keepalive | Keepalive **≠** feature SoT | YES | Do not assign product work here | carries `20260898` file |
| — | — | Collaboration (superseded) | `office/collaboration-settings-lifecycle-ui-v1` | `f5ab724eb3f7803848765a9efaee163c01b38f23` | settings lifecycle ui v1 | **SUPERSEDED_DIVERGENT** | YES | Do not use unless explicitly assigned | no `20260898` on tip |
| Server | Coordinator | Planning | `office/central-server-multi-agent-assignment-plan-v1` | *(this branch)* | this plan | Planning only | push this doc | N/A | none |

### Handoff docs verified (newest per stream)

| Stream | Doc | On tip |
| --- | --- | --- |
| Translation / Computer 2 | `docs/ai/COMPUTER_2_CENTRAL_SERVER_HANDOFF_V1.md` | `35246dd…` **VERIFIED** (note: body inventory table still lists prior tip `0958533`; tip is the handoff commit) |
| Commerce / Desktop | `docs/ai/CENTRAL_COORDINATOR_HANDOFF.md` | `8c6a53e…` **VERIFIED** |
| Learning | SoT + bookmarks at `da676ab…`; control registries under `D:\umtuba-central\control\` | server-side |
| UM Core / Collaboration | Laptop intake `UMTUBA_LAPTOP_INTAKE_UM_CORE_COLLABORATION.md` in control | server-side |

---

## 3. Branch ownership map

| Platform | Branch | Owner agent/device | Status | Dependency | Merge readiness | Next allowed action |
| --- | --- | --- | --- | --- | --- | --- |
| Learning | `…learning-resume-accessible-target-hardening-v1` | Agent 1 / Server | WAITING_DEPENDENCY | Final collision gate before apply | **NOT ready to merge** to alpha | Assigned: apply **gate** (read-only) |
| Learning | `…learning-lesson-bookmarks-v1` | Agent 1 / Server (same tip) | twin of SoT | same | NOT merge | No parallel second Learning agent |
| Commerce | `…provider-money-execution-v1` | Agent 2 / Desktop | BLOCKED | Stripe TEST fixture | NOT merge (checkpoint) | Assigned: P6R2 requirements audit |
| Translation | `…platform-translation-trunk-port-v1` | Agent 3 / Computer 2 | **FROZEN** | Admin browser for shadow | NOT merge | Remain frozen this wave (see §8) |
| UM Core | `…event-publisher-foundation-p16` | Agent 4 / Laptop | CLOSED | — | implementation-only / review later | No P17 until GO |
| Collaboration feature | `…workspace-settings-lifecycle-ui-v1` | Agent 4 / Laptop | SoT tip held | `20260898` collision | NOT merge | Assigned: collision reallocation **audit** only |
| Collab smoke / keepalive | smoke + keepalive | OPS only | descendants | — | NOT merge as feature | Do not assign product milestones |
| Collab divergent | `…settings-lifecycle-ui-v1` | none | superseded | — | NOT merge | Forbidden default base |

**Flags:** No duplicate active ownership of the same feature among the four agents. Abandoned/superseded: divergent Collaboration remote. Do not place two agents on Learning SoT + bookmarks as separate owners.

---

## 4. Migration ownership ledger (≥ 20260901)

| Version | Migration name | Domain | Source branch (canonical) | Applied remote? | Registered history? | Current owner | Immutable/reserved? |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 20260901 | learning_lesson_notes_foundation_v1 | Learning | Learning lineage | YES | YES | Learning | IMMUTABLE |
| 20260902 | translation_intelligence_foundation_v1 | Translation | Translation trunk | YES | YES | Translation | IMMUTABLE |
| 20260903–04 | *(stale Git only on reallocation branch)* | — | `translation-migration-version-reallocation-v1` | NO | NO | HISTORICAL_STALE | Do not reuse as live |
| 20260905 | store_partial_refund_ledger_list_committing_v1 | Store | Commerce | YES | YES | Store | IMMUTABLE |
| 20260906 | learning_assessment_due_dates_calendar_v1 | Learning | Learning | YES | YES | Learning | IMMUTABLE |
| 20260907 | store_partial_refund_ledger_compensate_committed_v1 | Store | Commerce compensation tip | YES | YES | Store | IMMUTABLE |
| 20260908 | learning_personal_notes_hub_v1 | Learning | Learning | YES | YES | Learning | IMMUTABLE |
| 20260909 | learning_assessment_due_ux_followthrough_v1 | Learning | Learning | YES | YES | Learning | IMMUTABLE |
| 20260910–14 | translation_studio_* chain | Translation | Translation trunk | YES | YES | Translation | IMMUTABLE |
| 20260915 | store_partial_refund_provider_money_execution_v1 | Store | Commerce provider-money tip | YES | YES | Store | IMMUTABLE |
| 20260916 | learning_lesson_bookmarks_v1 | Learning | Learning SoT/bookmarks | **NO** | **NO** | Learning | **RESERVED** `GIT_LANDED_PENDING_REMOTE` |
| ≥20260917 | — | — | — | NO | NO | — | **FREE candidates** — re-scan before any allocation |

### Related collision outside 609xx band

| Version | Git Collaboration filename | Remote name | Rule |
| ---: | --- | --- | --- |
| 20260898 | `20260898_collaboration_workspace_settings_lifecycle_ui_v1.sql` | **Commerce** `store_seller_live_payout_provider_v1` | **APPLY_BLOCKED** — do not apply Collaboration file as 20260898; do not renumber without central GO |

**Proposed next free versions (planning only, not allocated):** `20260917+` after fresh triple-scan. Do **not** allocate in this plan commit.

---

## 5. Supabase object conflict map

| Object family | Current owner | Active/future touch this wave | Concurrent write risk |
| --- | --- | --- | --- |
| `learning_lesson_bookmarks` + Learning bookmark RPCs | Learning | Agent 1 may apply `20260916` **only after gate GO** | Conflict if any other agent mutates Learning bookmark schema — **none assigned** |
| Translation Studio tables + `translation_studio_upsert_snapshot` / `read_snapshot` | Translation | Frozen this wave (no Cycle 2 / dual_read / db_primary) | Shadow observation would dual-write Studio — **not assigned this wave** → no conflict with Learning apply |
| Translation Intelligence | Translation | Frozen | none |
| Store partial-refund / provider-money execution | Commerce | Audit only — gates OFF; no Stripe; no money | No DDL this wave |
| Collaboration workspace settings schema (intended `20260898` file) | **Blocked** | Audit reallocation only | Must not apply under 20260898 |
| UM Core | No DB in P16 | P17 HOLD | none |
| Shared auth/admin/platform | Shared | Shadow needs platform-admin session — deferred | Avoid concurrent admin mutation experiments |

**Flagged pairs:** Learning apply ‖ Translation shadow would both need careful admin/session discipline — **avoided** by freezing Translation this wave. Commerce money path ⛔ any shared primary artificial money fixtures without GO.

---

## 6. Dependency graph

```
Learning_20260916_GATE → Learning_20260916_APPLY_GO (future; not this plan’s start)
Commerce_P6R2_AUDIT → Commerce_P6_TEST_DRY_RUN (future; blocked on fixture)
Collab_20260898_COLLISION_AUDIT → Collab_REALLOCATION_GO → Collab_APPLY (future)
Translation_FROZEN  (no edge this wave)
UM_Core_P16_CLOSED → P17 (HOLD / unassigned)

Parallel-safe this wave:
  Learning_GATE || Commerce_P6R2_AUDIT || Collab_COLLISION_AUDIT
  Translation_FROZEN || all of the above
  UM_Core idle || all of the above

Cannot concurrent:
  Learning_APPLY ⛔ Translation_SHADOW (admin/session + shared project noise) — both not dual-started
  Any_DDL ⛔ Any_other_DDL without server sequencing
  Collab_APPLY@20260898 ⛔ forever until reallocation (Commerce owns remote version)
```

---

## 7. Four-agent assignment plan (DO NOT START until per-agent GO)

### Agent 1 — Learning / Server

| Field | Value |
| --- | --- |
| Agent | Agent 1 |
| Device | Central Server |
| Platform | Learning |
| Branch / worktree | Branch: `office/learning-resume-accessible-target-hardening-v1` — Worktree: `D:\umtuba-central\repos\umtuba-web-learning-sot-ff-merge-v1` (feature twin OK at same SHA only) |
| Task | `LEARNING_LESSON_BOOKMARKS_20260916_CENTRAL_REMOTE_APPLY_GATE_V1` |
| Base SHA | `da676abda659b8de6caae8a7ddf4c3835c0c79ea` |
| Allowed scope | Read-only: fetch, reservation verify, remote history absence of `20260916`, object absence, origin collision scan, report GO/BLOCKED |
| Forbidden | Remote apply; repair; renumber; next Learning milestone; Commerce/Translation/Collab/Core edits |
| Migration rule | Use existing reservation `20260916` only; **no apply in gate** |
| DB writes | **NOT allowed** |
| Acceptance | Report states GO or BLOCKED with evidence; push not required if no file change |
| Required report | `LEARNING_LESSON_BOOKMARKS_20260916_CENTRAL_REMOTE_APPLY_GATE_V1_REPORT` |
| Dependencies | None to start gate |

### Agent 2 — Commerce / Desktop

| Field | Value |
| --- | --- |
| Agent | Agent 2 |
| Device | Desktop (Computer 1) |
| Platform | Commerce / Store |
| Branch / worktree | `office/commerce-partial-refund-provider-money-execution-v1` @ Desktop worktree from handoff |
| Task | `COMMERCE_P6R2_TEST_ENVIRONMENT_REQUIREMENTS_AND_OWNERSHIP_AUDIT_V1` |
| Base SHA | `8c6a53e710a3d75814f1cfb5830eeb204a0c4a9c` |
| Allowed scope | Read-only inventory of Stripe TEST config names, fixture needs, isolation boundary, whether schema changes needed, which env can host tests |
| Forbidden | Stripe calls; money movement; live keys; artificial money on shared primary; migration allocation; merge |
| Migration rule | **None** — no new version |
| DB writes | **NOT allowed** |
| Acceptance | Requirements manifest draft + blockers list; gates remain OFF |
| Required report | `COMMERCE_P6R2_TEST_ENVIRONMENT_REQUIREMENTS_AND_OWNERSHIP_AUDIT_V1_REPORT` |
| Dependencies | None to start audit |

### Agent 3 — Translation / Computer 2

| Field | Value |
| --- | --- |
| Agent | Agent 3 |
| Device | Computer 2 |
| Platform | Translation |
| Branch / worktree | `office/platform-translation-trunk-port-v1` @ Computer-2 trunk-port worktree |
| Task | **FROZEN** — no milestone this wave |
| Base SHA | `35246dd387ee53b72450fa3db8eefcb4e7432314` |
| Rationale | Higher priority: Learning apply path + Commerce unblock audit + Collaboration collision audit. Shadow observation remains the **only** justified Translation next task when thawed; needs platform-admin browser mutation. |
| Allowed | Idle / await assignment; maintain freeze |
| Forbidden | Cycle 2; dual_read; db_primary; prune; merge to SoT; self-start shadow |
| Migration rule | Do not touch `20260910`–`14` or allocate new |
| DB writes | **NOT allowed** |
| Required report | None this wave (freeze acknowledgment optional) |
| Future (not assigned now) | `TRANSLATION_STUDIO_LIMITED_SHADOW_OBSERVATION_V1` retry |

### Agent 4 — Laptop / Collaboration (+ Core HOLD)

| Field | Value |
| --- | --- |
| Agent | Agent 4 |
| Device | Laptop |
| Platform | Collaboration (primary this wave); UM Core **idle** |
| Branch / worktree | Feature SoT only: `office/collaboration-workspace-settings-lifecycle-ui-v1` — **not** keepalive, **not** smoke as owner tip, **not** divergent `…settings-lifecycle-ui-v1` |
| Task | `COLLABORATION_20260898_REMOTE_COLLISION_REALLOCATION_AUDIT_V1` |
| Base SHA | `6ea06344cbd956e1b626fc4abfe71d4e2d012765` |
| Allowed scope | Read-only: prove remote Commerce ownership of version `20260898`, Git Collaboration filename presence, propose **candidate** free versions after triple-scan (do not renumber), classify smoke/keepalive/divergent |
| Forbidden | Apply `20260898`; renumber in Git; P17; product milestone start; merge; delete branches/worktrees |
| Migration rule | No allocation commit; propose only |
| DB writes | **NOT allowed** |
| UM Core | P17 remains **UNASSIGNED** / HOLD |
| Acceptance | Audit report with collision proof + proposed free version list |
| Required report | `COLLABORATION_20260898_REMOTE_COLLISION_REALLOCATION_AUDIT_V1_REPORT` |

---

## 8. Frozen branches

| Branch | Reason |
| --- | --- |
| `office/platform-translation-trunk-port-v1` | Computer-2 independent work frozen; shadow not assigned this wave |
| All UM Core P17+ | Unassigned |
| Collaboration smoke / keepalive | OPS only — not feature owners |
| `office/collaboration-settings-lifecycle-ui-v1` | Superseded divergent |

---

## 9. Merge policy

| Class | Branches |
| --- | --- |
| Implementation-only / not merge now | Learning bookmarks/SoT; Commerce provider-money; Translation trunk; Collaboration feature tip |
| Ready for review | *(none declared this wave)* |
| Ready for integration | *(none — do not merge)* |
| Explicitly NOT ready to merge | All four active streams; smoke; keepalive; divergent Collaboration; this planning branch is docs-only (may merge later by separate GO) |

**Do not perform merges under this plan.**

---

## 10. Exact first execution order (when GOs issued)

1. **Parallel wave A (read-only):** Agent 1 gate ‖ Agent 2 P6R2 audit ‖ Agent 4 Collab collision audit  
2. Agent 3 remains frozen  
3. Server reviews three reports  
4. Only then consider sequenced GOs: Learning apply → Collab reallocation → Commerce fixture prep → Translation shadow thaw  

---

## 11. Next review checkpoint

After Agents 1, 2, and 4 return reports (or any BLOCKED):

- Update `D:\umtuba-central\control\UMTUBA_COORDINATION_STATUS.md`  
- Decide Learning apply GO / NO-GO  
- Decide whether to thaw Translation shadow  
- Decide Collaboration reallocation GO (new version)  
- Keep P17 unassigned until Core queue is explicitly opened  

---

## 12. Verdict of this plan document

**READY_WITH_BLOCKERS** — assignments defined; blockers remain (Commerce TEST env missing; Learning apply not yet gated+GO; Collaboration `20260898` remote collision; Translation frozen pending admin-session capability).
