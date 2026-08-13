# PC2_A2 — LB-001 Corrected POST Remote Reprobe V1

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = INDEPENDENT_RELEASE_QA / PLATFORM_CORE
AGENT_ID = PC2-A2
TASK_ID = PC2_LB001_CORRECTED_POST_REPROBE_GO
STREAM = A2 — SAME-PROJECT REMOTE REPROBE
REPORT_TYPE = LB001_CORRECTED_POST_INDEPENDENT_REPROBE
TIMESTAMP_LOCAL = 2026-08-12 14:06 +03
MODE = READ_ONLY_INDEPENDENT_QA
FEATURE_DEVELOPMENT = FORBIDDEN
MIGRATION_MUTATION = FORBIDDEN
PRODUCTION_MUTATION = NO
LB002_FINAL_STATUS = CLOSED (DO_NOT_REOPEN)
UM_CORE_FINAL_CLOSED = YES
TRANSLATION_V1_CLOSED = YES
A1_GATE_ARTIFACT = worktrees/PC2_A1_LEARNING_EXPECTED_SET_CORRECTION_V1.md
A1_EXPECTED_SET_INDEPENDENT_VERDICT = PASS
```

---

## ★★★ LB001_CORRECTED_POST_VERDICT = PASS ★★★

```text
LB001_CORRECTED_POST_VERDICT = PASS
LB001_FINAL_VERIFIED_CLOSED = YES
LB001_CORRECTED_POST_EXPECTED = 34
LB001_CORRECTED_POST_APPLIED_AND_REGISTERED = 34
LB001_CORRECTED_POST_MISMATCH = 0
LB001_CORRECTED_POST_MISSING = 0
LEARNING_METRIC = 34/34/0/0
A3_AUTHORIZATION = EXECUTE_LB003_IMMEDIATELY
```

**Sibling A3 MUST execute LB-003 immediately — no new GO, no prep wave.**

---

## Pins

| Pin | Value |
| --- | --- |
| Worktree | `umtuba-web-translation-trunk-port-v1` |
| Branch | `office/platform-translation-trunk-port-v1` |
| HEAD | `1c5ae0bd0266029f264cab866744c7fcde25cc2e` |
| Linked project ref | `tgucwnjwoyeqoxqaxmew` |
| PROJECT_REF_VERIFIED | **YES** (`supabase/.temp/project-ref` + linked CLI probe) |
| Linked CLI | supabase **2.113.0** |
| Mutation this run | **NONE** |
| LB-002 reopened | **NO** |

---

## A1 expected-set dependency (authoritative; not Central)

```text
EXPECTED_SET_INDEPENDENT_VERDICT = PASS
LEARNING_EXPECTED_COUNT = 34
CENTRAL_CLAIMED_EXPECTED = 39
CENTRAL_EXPECTED_39_AS_LEARNING_COUNT = REJECTED (A1; false window 20260828–20260866)
A2_EXPECTED_SOURCE = A1 *learning_* tip inventory (34)
A2_DID_NOT_SUBSTITUTE_CENTRAL_39 = YES
NON_LEARNING_MIGRATIONS_EXCLUDED = YES
```

### LEARNING_EXPECTED_MIGRATIONS (from A1; used as EXPECTED)

```text
[
20260828, 20260829, 20260830, 20260831, 20260832, 20260833, 20260834, 20260835,
20260836, 20260837, 20260838, 20260839, 20260840, 20260841, 20260844, 20260845,
20260848, 20260849, 20260850, 20260851, 20260852, 20260853, 20260854, 20260855,
20260856, 20260857, 20260858, 20260859, 20260860, 20260861, 20260862, 20260863,
20260864, 20260866
]
```

---

## Fresh same-project remote probe

```text
LB001_CORRECTED_POST_HISTORY_COMMAND = npx supabase migration list --linked
LB001_CORRECTED_POST_HISTORY_EXIT = 0
LB001_CORRECTED_POST_HISTORY_CAPTURED_AT = 2026-08-12 14:06:48 +03:00
LB001_CORRECTED_POST_PROJECT_REF = tgucwnjwoyeqoxqaxmew
LB001_CORRECTED_POST_PROJECT_REF_VERIFIED = YES
LB001_CORRECTED_POST_HISTORY_FRESHNESS = FRESH_THIS_RUN
```

### Metrics (Learning-only)

| Metric | Value |
| --- | ---: |
| LEARNING_EXPECTED | **34** |
| LEARNING_APPLIED_AND_REGISTERED | **34** |
| LEARNING_MISMATCH | **0** |
| LEARNING_MISSING | **0** |
| LEARNING_REMOTE_ONLY | **0** |
| LEARNING_LOCAL_ONLY | **0** |

Acceptance rule used: `AAR = EXPECTED(=34)`, `MISMATCH = 0`, `MISSING = 0`  
Central's claimed 39 is reported for contrast only and is **not** the Learning acceptance denominator.

```text
LB001_CORRECTED_POST_EXPECTED = 34
LB001_CORRECTED_POST_APPLIED_AND_REGISTERED = 34
LB001_CORRECTED_POST_MISMATCH = 0
LB001_CORRECTED_POST_MISSING = 0
```

### Per-ID Learning classification (all AAR)

All 34 Learning expected versions have **local ∧ remote** on linked project `tgucwnjwoyeqoxqaxmew`:

`20260828`…`20260841`, `20260844`, `20260845`, `20260848`…`20260864`, `20260866` → **AAR**.

Evidence table: `worktrees/_PC2_A2_LB001_CORRECTED_POST_learning_table.txt`

---

## Excluded non-Learning (do NOT affect Learning acceptance)

| Version | A1 domain | Linked status | In Learning EXPECTED? | Affects Learning metric? |
| --- | --- | --- | --- | --- |
| 20260842 | ADS | LOCAL_ONLY | NO | **NO** |
| 20260846 | GAMES | LOCAL_ONLY | NO | **NO** |
| 20260847 | GAMES | LOCAL_ONLY | NO | **NO** |

Prior false PRE mismatch trio (`42/46/47`) remains Ads/Games Git-only / history hygiene outside Learning acceptance. They are excluded from Learning EXPECTED and **do not** prevent Learning 34/34/0/0.

---

## ALL_REPOSITORY_MIGRATIONS vs LEARNING_RELEASE_MIGRATIONS

| Scope | Count / note |
| --- | --- |
| ALL_REPOSITORY_MIGRATIONS (list rows this probe) | 153 rows |
| ALL_REPOSITORY_LOCAL_VERSIONS (unique) | 101 |
| ALL_REPOSITORY_REMOTE_VERSIONS (unique) | 103 |
| LEARNING_RELEASE_MIGRATIONS (A1 tip `*learning_*`) | **34** |
| Learning acceptance metric | **only** the 34 Learning IDs |

This distinction is the corrected counting contract: repository-wide / numeric-window inventory must not be used as Learning EXPECTED.

---

## Evidence

```text
LB001_CORRECTED_POST_EVIDENCE = [
  "worktrees/PC2_A1_LEARNING_EXPECTED_SET_CORRECTION_V1.md",
  "worktrees/_PC2_A2_LB001_CORRECTED_POST_migration_list_linked.txt",
  "worktrees/_PC2_A2_LB001_CORRECTED_POST_learning_table.txt",
  "worktrees/_PC2_A2_LB001_CORRECTED_POST_metrics.json",
  "supabase/.temp/project-ref => tgucwnjwoyeqoxqaxmew"
]
```

---

## Final stamps (machine-readable)

```text
LB001_CORRECTED_POST_EXPECTED = 34
LB001_CORRECTED_POST_APPLIED_AND_REGISTERED = 34
LB001_CORRECTED_POST_MISMATCH = 0
LB001_CORRECTED_POST_MISSING = 0
LB001_CORRECTED_POST_EVIDENCE = [
  "worktrees/PC2_A1_LEARNING_EXPECTED_SET_CORRECTION_V1.md",
  "worktrees/_PC2_A2_LB001_CORRECTED_POST_migration_list_linked.txt",
  "worktrees/_PC2_A2_LB001_CORRECTED_POST_learning_table.txt",
  "worktrees/_PC2_A2_LB001_CORRECTED_POST_metrics.json"
]
LB001_CORRECTED_POST_VERDICT = PASS
LB001_FINAL_VERIFIED_CLOSED = YES
MIGRATION_FINAL_LEARNING_STATE = LEARNING_34_AAR_ALIGNED_ON_tgucwnjwoyeqoxqaxmew
A3_MUST_EXECUTE_LB003_NOW = YES
```

---

## Open issues (non-blocking for Learning LB-001)

- Ads/Games LOCAL_ONLY trio `20260842/46/47` remains outside Learning metric (not a Learning acceptance failure).
- Broader repository local/remote drift outside Learning tip set is out of LB-001 Learning scope for this corrected reprobe.
- LB-002 remains CLOSED; not reopened.

---
END PC2_A2_LB001_CORRECTED_POST_REPROBE_V1

**PASS — A3: EXECUTE LB-003 IMMEDIATELY**
