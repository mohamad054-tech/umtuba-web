# DESKTOP_FINAL_DEVICE_STATE_COMPLETE_INVENTORY_V1

| Field | Value |
| --- | --- |
| TASK_ID | `DESKTOP_FINAL_DEVICE_STATE_COMPLETE_INVENTORY_V1` |
| DEVICE | DESKTOP |
| DEVICE_ROLE | FINAL_STATE_REPORTER / ANDROID_GOOGLE_PLAY_PRIMARY |
| CENTRAL_COORDINATOR | SERVER |
| MODE | READ_ONLY_AUDIT |
| REPORT_TIMESTAMP | 2026-08-14 14:18:33 +03:00 |
| WORKSPACE | `C:\Users\1\Desktop\umtuba\umtuba-web` |
| ALSO_SEARCHED | `C:\Users\1\Desktop\umtuba\` (siblings, worktrees, archives) |
| PRODUCT_CODE_CHANGED | **NO** |
| COMMIT_PERFORMED | **NO** |
| PUSH_PERFORMED | **NO** |
| AAB_BUILT | **NO** (this task) |
| GOOGLE_PLAY_MUTATED | **NO** |
| PRODUCTION_MUTATED | **NO** |
| MIGRATION_APPLIED | **NO** |
| `_port_extract` | **UNTOUCHED** |
| WINDOWS_DESKTOP_WRITES | **NO** (inventory under `docs/ops/closeout/`) |
| NEXT_DESKTOP_WAVE | **NONE — STOP. Wait for Central reconciliation.** |

This packet is a complete final-state inventory for UMTUBA on DESKTOP. It will be combined with SERVER, LAPTOP, and PC2 inventories for `UMTUBA_WHOLE_PLATFORM_FINAL_RECONCILIATION_AND_AUDIT_V1`.

**Do not treat any single column as DONE.** Classifications stay separate: `CODE_READY` / `BACKEND_READY` / `BUILT_IN_AAB` / `DEVICE_RUNTIME_VERIFIED` / `GOOGLE_PLAY_CONFIGURED` / `PRODUCTION_RELEASE_READY`.

Machine-readable worktree matrix (this session):

- `docs/ops/closeout/_final_worktree_matrix.json`
- `docs/ops/closeout/_final_worktree_matrix.tsv`

---

## Executive verdict (do not collapse)

| Gate | Result | Evidence |
| --- | --- | --- |
| CODE_READY (Android UGC client) | **YES** (uncommitted on mobile `3b33561` + WIP) | Play-policy packet + live dirty tree |
| BACKEND_READY (UGC SQL) | **NO** | `20260928` on feature branch only; not on `origin/alpha-0.2`; Central apply not found |
| BUILT_IN_AAB (v4) | **YES** | `37dde25f` SHA256 verified this session |
| DEVICE_RUNTIME_VERIFIED (v4) | **NO** | Device QA was versionCode **3** |
| DEVICE_RUNTIME_VERIFIED (v3 CORE) | **YES** | Internal Testing CORE closeout 2026-08-13 |
| GOOGLE_PLAY_CONFIGURED | **PARTIAL** | Data Safety / App access / ages SAVED; listing / IARC / ads / opted-in / v4 upload incomplete |
| PRODUCTION_RELEASE_READY | **NO** | Multiple blockers below |
| ANDROID_PRODUCTION_RELEASE_READY | **NO** | |
| GOOGLE_PLAY_V4_UPLOAD_SAFE | **NO** | Until Central applies `20260928` + runtime PASS + new GO |
| CENTRAL_STORE_AUTH_ENV_READY | **NO** | Desktop file PRESENT; Central load NO |
| LIVE | **OUT_OF_SCOPE / FAIL_CLOSED** | Source hard-returns `false` |
| VERDICT | **INVENTORY_COMPLETE / WAIT_CENTRAL_RECONCILIATION** | This task |

---

## Known-context verification (do not assume)

| Claim | Verified this session? | Result |
| --- | --- | --- |
| Production Central tip `f8e142d8` | **YES** | `origin/alpha-0.2` = `f8e142d8cf7faab9646f127c1995e351be94fb37` after `git fetch --prune`. Desktop did **not** deploy. Local branch `alpha-0.2` is **stale** at `32fb3629cd98c5661b2ef98644685de51f414dee` (not FF'd; primary tree dirty). |
| Account deletion URL live | **YES** | `https://umtuba.com/account-deletion` fetched READ-ONLY; dedicated deletion-request page rendered (sign-in required to submit; queued, not immediate `deleteUser`). |
| UGC candidate `20260928` at `380a36646d4de8a37c39a56ac3ccd449f6d8b20d` | **YES** | HEAD + `origin/office/profile-hero-completeness-v1`. File SHA256 `BFDB6F879A213746E38E768859ED6043C566E6AC861A14B5D1B372BD40B09693`. **Not** on `origin/alpha-0.2`. Contained only by that origin tip. |
| Rejected IDs `20260873` (Learning) / `20260922` (knowledge_acquisition) | **YES** | `20260873_learning_ai_tutor_thread_metadata_read_v1.sql` on Learning remotes (e.g. instructor-ui-contract). `20260876_knowledge_acquisition_foundation_v1.sql` on `origin/alpha-0.2`. No UGC file at `20260922` on HEAD / profile-hero / alpha. |
| v4 AAB `37dde25f` SHA256 `C2CD78E0…8283E6` | **YES** | Rehashed this session. Match. |
| v3 AAB `26a60f53` | **YES** | Present. SHA256 `61DAC1C62D9CCF85FBAD824B853F28DF24EFD7C2F4DDA3ADBCC0B470522ED70A`. |
| Play Internal Testing CORE closed on v3 | **DOCS_ONLY** | `DESKTOP_ANDROID_INTERNAL_TEST_FINAL_CLOSEOUT_V1.md`. Not re-opened in Console. |
| Data Safety complete | **DOCS_ONLY** | Operator-complete 2026-08-13. Do not reopen. |
| App access complete | **DOCS_ONLY** | Same. |
| Target ages 13–15 / 16–17 / 18+ | **DOCS_ONLY** | Same. |
| Reviewer `google-play-review@umtuba.com` | **DOCS_ONLY** | Provisioned. Password **not** printed. |
| Closed testing emails ≥17; opted-in UNKNOWN | **DOCS_ONLY** | Opted-in still **UNKNOWN**. |
| Live OUT_OF_SCOPE fail-closed | **YES** | `isLiveLobbySourceConfigured()` hard-returns `false`. |
| AUTH_ENV Desktop present, Central load NO | **YES** | `.env.store-qa.local` PRESENT (415 B). Central load not proven. |
| Own-content delete PARTIAL (UAF-12 on `origin/master`, not in v4 tree) | **YES** | Android: `deletePostForOwner` on `origin/master` `45f0dbc` only. Web UAF-12 is **separately** on `origin/alpha-0.2` `6e494df` (not on this profile-hero HEAD). |

Older AUTH_ENV packet observation of production dir `76598e7-20260813172814` is **superseded as current tip** by later Central/Desktop notes of `f8e142d`. Desktop still did not deploy.

---

# PHASE 1 — GIT / REPOSITORY INVENTORY

`git fetch --prune` executed on `umtuba-web` and `umtuba-mobile`. No pull / merge / rebase / reset / stash / force.

## 1.1 Primary web repo (authoritative Desktop working tree)

| Field | Value |
| --- | --- |
| Path | `C:\Users\1\Desktop\umtuba\umtuba-web` |
| Repo | `umtuba-web` (GitHub origin = SoT) |
| Branch | `office/profile-hero-completeness-v1` |
| Full SHA | `380a36646d4de8a37c39a56ac3ccd449f6d8b20d` |
| Upstream | `origin/office/profile-hero-completeness-v1` |
| Ahead / behind | **0 / 0** |
| Clean / dirty | **DIRTY** (docs only) |
| Staged / unstaged / untracked | 0 / 5 / 97+ (closeouts + `worktrees/`) |
| Local-only / unpushed commits | **NO** (tip pushed) |
| Merge-base `origin/alpha-0.2` | `03fe5e7e78cf4239317551671c7c33206523def7` |
| Merge-base `origin/master` | `c96e4c68880f6decb8c70b58830ab63f71b1f8f7` (= `origin/master`) |
| `origin/alpha-0.2` | `f8e142d8cf7faab9646f127c1995e351be94fb37` |
| `origin/master` (web) | `c96e4c68880f6decb8c70b58830ab63f71b1f8f7` |
| `380a366` ancestor of alpha? | **NO** |
| `f8e142d` ancestor of HEAD? | **NO** |
| Stale vs production | Feature branch **diverged**; not the deploy source |
| Authoritative? | **YES** for Desktop UGC SQL `20260928` + account-deletion *this* SHA. **NO** for production deploy. |
| Originating task | Profile Hero + later account-deletion `5f0b6f15` + UGC renumber `380a366` |

Recent commits on this tip:

1. `380a366` fix(migrations): renumber UGC safety migration off 20260922
2. `c708fb1` fix(migrations): renumber Android UGC policy migration
3. `5f0b6f1` feat(account): add web account deletion request flow
4. `7ed9159` chore(workflow): keep UMTUBA artifacts off Windows Desktop

## 1.2 Mobile repo (Android / Expo — Desktop Play primary)

| Field | Value |
| --- | --- |
| Path | `C:\Users\1\Desktop\umtuba\umtuba-mobile` |
| Repo | `umtuba-mobile` (separate GitHub repo) |
| Branch | `master` |
| Full SHA | `3b335610ced48aa2595fe49eef5b97511c7f4cb5` |
| Upstream | `origin/master` = `db7f927467eb2a5416b612c330bfa8440bcf50f0` |
| Ahead / behind | **0 / 2** |
| Clean / dirty | **DIRTY** |
| Staged / unstaged / untracked | 0 / 12 modified / 4 untracked groups |
| Local-only commits | **NO** |
| Merge-base `origin/master` | `3b335610ced48aa2595fe49eef5b97511c7f4cb5` |
| Commits on origin not in HEAD | `45f0dbc` UAF-12 + hide unfinished Live; `db7f927` docs SHA |
| Stale? | **YES** vs origin/master (intentional; do not FF over UGC WIP) |
| Authoritative? | **YES** for v4 AAB + uncommitted UGC client. **NO** for UAF-12 / iOS operator mode. |
| Originating task | Android Play policy / UGC / v4 AAB |

Uncommitted (keep; do not discard): see Phase 3.

## 1.3 Linked worktrees (umtuba-web common dir)

**121** checkouts (same count as A3 2026-08-12). Live recount 2026-08-14 14:02:

| Metric | 2026-08-12 A3 | 2026-08-14 this inventory |
| --- | ---: | ---: |
| Checkouts | 121 | **121** |
| Dirty | 13 | **11** |
| Clean | 108 | **110** |
| Detached HEAD | 23 | **23** |
| No upstream (incl. detached) | 23+11 | **32** |
| Ahead of upstream | 0 | **0** |
| Behind upstream | 3 | **3** |
| Has unpushed vs configured upstream | 0 | **0** |

Full per-worktree rows: `_final_worktree_matrix.tsv` (path, SHA, branch, upstream, ahead/behind, dirty, staged/unstaged/untracked).

### Behind upstream (3)

| Path | Branch | HEAD | Upstream | Ahead/Behind | Dirty | Class |
| --- | --- | --- | --- | ---: | --- | --- |
| `…\umtuba-web-collaboration-learning-link-unlink-local-e2e-v1` | `office/collaboration-learning-link-unlink-local-e2e-desktop-v1` | `be5d836aae2697790432bfec7b5e799802ac2498` | `origin/office/collaboration-workspace-settings-lifecycle-ui-v1` (**wrong**) | 0 / 16 | DIRTY 0/106/11 | WRONG_UPSTREAM / Laptop / do not develop |
| `…\umtuba-web-commerce-completion-audit-v1` | `office/commerce-completion-audit-v1` | `ca157d716348ba107f546e453602eae7c48ec989` | `origin/office/commerce-marketplace-supplier-listing-create-hardening-v1` | 0 / 1 | CLEAN | HISTORICAL / mis-pointed upstream |
| `…\umtuba-web-commerce-partial-refund-provider-money-execution-v1` | same name | `4291bdbfb395b00a9c9cc5aa0d05d560a1e672ab` | own origin | 0 / 19 | DIRTY **3 staged** `_port_extract` | PROTECTED |

### Named Desktop agent worktrees (now CLEAN)

| Path | Branch | HEAD | Upstream | Dirty | Authoritative? |
| --- | --- | --- | --- | --- | --- |
| `C:\Users\1\Desktop\umtuba\umtuba-web\worktrees\DESKTOP-A2` | `office/commerce-buyer-cart-wishlist-search-a11y-ui-contract-v1` | `716bf4740e55b000e5615f8e3a95ab06dd8d8267` | origin same | CLEAN 0/0 | Historical Commerce a11y; **not** alpha |
| `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A1` | `office/desktop-a1-jinn-video-pilot-ingest-precheck-automation-v1` | `d4beda578999a290f364ecc9c8773b5790db3bef` | origin same | CLEAN | Jinn precheck; ingest **not** ready |
| `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A1-AI-SHARED-CORE-VALIDATION-V1` | `office/desktop-a1-ai-shared-core-branch-validation-v1` | `540494ab30bfcb6e33ae42c1859d187f293cee80` | NO_UPSTREAM | CLEAN | Local-only branch name |
| `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A2` | `office/desktop-a2-games-hub-safe-components-v1` | `ee457c44fde57ca401e618773e2ffb67eefa4c27` | origin same | CLEAN | Games hub |
| `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A2-REGRESSION` | `office/desktop-a2-stripe-test-fixture-pack-regression-v1` | `df4766803cb28af541ca6af13301e8faeb51db44` | origin same | CLEAN | Stripe fixture |
| `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A3` | `office/desktop-a3-commerce-seller-ops-filter-status-a11y-contract-v1` | `42ae9baf7326f92bf277581126b43182df375e73` | origin same | CLEAN | Seller a11y; was dirty 2026-08-12 |
| `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-GAMES-PAGE-COMPOSITION-V1` | `office/desktop-games-page-composition-implementation-v1` | `b07ada08710eb1221cde7bae5976d9bf563eacd0` | origin same | CLEAN | Games page |

A3 Wave 3 dirty #12/#13 (buyer + seller a11y WTs) are **now CLEAN** — likely committed/pushed after 2026-08-12. Do not delete.

### Staging / temp

| Path | HEAD | State | Class |
| --- | --- | --- | --- |
| `C:\Users\1\AppData\Local\Temp\umtuba-staging-deploy-e84475a` | `e84475a769c731bb7e1ad511b3543ee714d2feea` detached CLEAN | Historical alpha tip checkout | SUPERSEDED / SAFE_TO_IGNORE (do not delete this task) |

## 1.4 Non-git / sibling roots under `C:\Users\1\Desktop\umtuba`

| Path | Role | Git worktree? |
| --- | --- | --- |
| `umtuba-mobile` | Separate repo | Own repo |
| `agents` | Empty agent slot dirs (`desktop-commerce-agent-1/2/3`, `desktop-workers`) | NO |
| `worktrees\` | Linked Desktop agent WTs | YES (listed above) |
| `sanitation-backups` | Historical | NO |
| `wave0-work-protection-20260729-183124` + `.zip` | Wave 0 protection | NO |
| `_backup-shared-ai-mixed-20260731-141004` | Historical AI backup | NO |
| `_streaming_port_extract` | **PROTECTED** — not touched | NO |
| Loose `app.js` / `index.html` / `style.css` | Non-product static | NO |
| ~90 `umtuba-web-*` sibling dirs | Linked worktrees | YES |

## 1.5 Archives (not the web repo)

| Path | Role | Last write |
| --- | --- | --- |
| `C:\Users\1\Documents\UMTUBA\Desktop-Agent-Archive\` | Historical Desktop → Central copies (2026-08-10 / 12 / 13) | 2026-08-13 |
| `C:\Users\1\Documents\UMTUBA\Hetzner-Server\` | Server archive docs | 2026-08-12 |

Not mutated this task.

## 1.6 Local `alpha-0.2` branch (not a worktree)

| Field | Value |
| --- | --- |
| `refs/heads/alpha-0.2` | `32fb3629cd98c5661b2ef98644685de51f414dee` |
| `origin/alpha-0.2` | `f8e142d8cf7faab9646f127c1995e351be94fb37` |
| Class | **STALE local branch** — not FF'd (primary dirty; task forbids mixing WIP) |

---

# PHASE 2 — WORKTREE INVENTORY

Do **not** delete any of these.

| Class | Count / examples |
| --- | --- |
| ACTIVE | Primary `umtuba-web` (docs inventory); mobile UGC WIP (sibling repo, not a web WT) |
| STALE | Local `alpha-0.2` `32fb3629`; Temp staging `e84475a`; most detached private-AI / refund slices |
| COMPLETED | Integration w1–w4; alpha-beta `71dfec2`; Profile product on alpha; buyer/seller a11y WTs now CLEAN |
| ABANDONED / SUPERSEDED | Detached refund chain; private-AI lifecycle staged orphans; shared-AI twins; staging deploy WT |
| TEMPORARY | Temp staging; `wave0-work-protection`; sanitation-backups |
| UNIQUE / IMPORTANT UNINTEGRATED | `20260928` on profile-hero only; mobile UGC + v4 AAB; `_port_extract` staged freeze; Learning instructor e2e WT (no upstream) |
| SAFE_TO_IGNORE (do not delete) | Empty `agents\*` slots; nested `umtuba-web\worktrees\desktop-commerce-agent-*`; most CLEAN historical office WTs that are already on origin |
| IMPORTANT UNINTEGRATED | See Phase 3 + `20260928` vs alpha |

Dirty worktrees (11) — live 2026-08-14:

| # | Path (short) | HEAD | Dirty shape | Class now |
| ---: | --- | --- | --- | --- |
| 1 | `umtuba-web` | `380a366` | docs/ai + closeouts + `worktrees/` | ACTIVE docs / this inventory |
| 2 | collaboration-learning-link-unlink | `be5d836` | 0/106/11 + behind 16 | WRONG_UPSTREAM / Laptop |
| 3 | collaboration-login-nav-reverif | `188423d` | 0/1/1 | Artifact / NEEDS_OPERATOR_DECISION |
| 4 | commerce-partial-refund-provider-money | `4291bdb` | **3 staged** + behind 19 | **PROTECTED** `_port_extract` |
| 5 | learning-collaboration-smoke-e2e | `616d4f7` | 0/1/0 | Line-ending ghost |
| 6 | learning-…-activity-timeline | `9478258` | 0/0/8 | Laptop Learning untracked smokes |
| 7 | learning-…-attachments | `67cf30f` | 0/0/2 | Junk filenames |
| 8 | learning-instructor-browser-e2e | `525c046` | 0/14/4 NO_UPSTREAM | Laptop Learning ACTIVE |
| 9 | private-ai-workflow-lifecycle-v1 | detached `db6f52a` | 19 staged | SUPERSEDED vs alpha port |
| 10 | shared-ai-surface-integration-v1 | detached `db6f52a` | 28 staged | DUPLICATE / SUPERSEDED |
| 11 | shared-ai-surface-integration-v1-clean | detached `db6f52a` | 28 staged | DUPLICATE of #10 |

---

# PHASE 3 — UNCOMMITTED / LOCAL-ONLY

No tracked branch is ahead of its configured upstream. Uncommitted / local-only material:

| Item | Location | Class |
| --- | --- | --- |
| `docs/ai/*` handoff edits | web primary | IMPORTANT_UNINTEGRATED (docs; this task) |
| `docs/ops/closeout/*` Android/Play/UGC/AUTH packets | web primary untracked | IMPORTANT_UNINTEGRATED (evidence) + HISTORICAL A1/A2/A3 |
| `_final_worktree_matrix.*` | web closeout | GENERATED_ARTIFACT (this inventory) |
| A3/A1/A2 JSON/TSV/vitest logs | web closeout | GENERATED_ARTIFACT / HISTORICAL |
| `worktrees/` listing under web | untracked | HISTORICAL / SAFE_TO_IGNORE empty slots + linked DESKTOP-A2 |
| `.env.store-qa.local` | web gitignored | IMPORTANT (secret file PRESENT; do not commit) |
| `.env.local` | web gitignored | PRESENT (do not commit) |
| Mobile UGC / safety / settings / watch / messages | `umtuba-mobile` | **IMPORTANT_UNINTEGRATED** |
| Mobile `app.config.ts` versionCode 4 + `eas.json` | mobile | **IMPORTANT_UNINTEGRATED** |
| `release-artifacts/` incl. v4 AAB + store packets | mobile untracked | **GENERATED_ARTIFACT** / keep |
| `.env` / `.env.play-review.local` | mobile gitignored | PRESENT (do not commit) |
| origin/master +2 iOS commits | mobile | ALREADY_INTEGRATED on origin; **not** in this tree |
| `_port_extract` 3 staged files | commerce money WT | **PROTECTED** / UNIQUE local freeze |
| Staged private-AI / shared-AI indexes | detached WTs | SUPERSEDED |
| Learning untracked smokes / junk names | Learning WTs | UNCERTAIN / Laptop-owned |
| Account-deletion commit `5f0b6f15` | now ancestor of pushed `380a366` | ALREADY_INTEGRATED to feature origin; **not** the alpha SHA |
| `20260928` SQL | committed+pushed on feature | ALREADY_INTEGRATED to feature origin; **NOT** on alpha / **NOT** applied |
| Commerce / Jinn feature branches | many CLEAN WTs | HISTORICAL / post-release / still relevant as unmerged vs alpha |

---

# PHASE 4 — ANDROID AUTHORITATIVE STATE

Read from **current** `umtuba-mobile/app.config.ts` and `eas.json` + EAS JSON. Do **not** assume versionCode without files.

| Field | Value | Source |
| --- | --- | --- |
| package | `com.umtuba.app` | `app.config.ts` android.package |
| versionName | `1.0.0` | `app.config.ts` version |
| versionCode (working tree) | **4** | `app.config.ts` android.versionCode |
| iOS bundle | `com.umtuba.app` buildNumber `1` | same file (not this release) |
| EAS projectId | `d2593b45-8f18-4c57-9d71-0419193cfd77` | extra.eas |
| eas.json production | `autoIncrement: true`, `environment: production` | working tree (modified) |
| eas.json submit.android.track | `internal` | eas.json |
| appVersionSource | `remote` | eas.json cli |
| Mobile source SHA (committed) | `3b335610ced48aa2595fe49eef5b97511c7f4cb5` | HEAD |
| Branch | `master` behind origin by **2** | |
| EAS v4 build | `37dde25f-5cb8-4245-ab25-4e357217f6f7` | `eas-build-37dde25f.json` |
| v4 gitCommitHash recorded | `3b335610ced48aa2595fe49eef5b97511c7f4cb5` | same JSON |
| v4 versionCode recorded | **4** | same JSON |
| Supabase public config presence | **PRESENT** (names only) | mobile `.env` has `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, optional `EXPO_PUBLIC_LIVEKIT_URL`. Values not printed. v3 EAS env loaded those two public keys. |
| Service-role in mobile client | **REJECTED by code** | `src/lib/env.ts` |
| Signing | Existing EAS keystore `Build Credentials p6De1DDtE_ (default)`; `signingChanged: false` on v4 | eas-build-37dde25f.json |
| Release candidate | **versionCode 4 AAB `37dde25f`** | |
| Device-tested version | **versionCode 3** (`26a60f53`) Internal Testing CORE | closeout 2026-08-13 |
| Latest AAB | **v4 `37dde25f`** (newest mtime 2026-08-14 10:37:30) | Phase 5 |
| Play upload of v4 | **NO** | JSON `playUpload: false` |

v3 vs v4: working tree and v4 EAS JSON are versionCode **4**. Internal Testing CORE / Data Safety audits were versionCode **3**. Do not collapse them.

---

# PHASE 5 — AAB INVENTORY

Searched `umtuba-mobile\release-artifacts` (authoritative). Recursive `*.aab` under `C:\Users\1\Desktop\umtuba` excluding `_port_extract` / `_streaming_port_extract`. Three AABs found, all in release-artifacts. No AAB written to Windows Desktop.

| File | versionCode | EAS | Bytes | SHA256 (this session) | MTIME | Class |
| --- | ---: | --- | ---: | --- | --- | --- |
| `umtuba-android-production-37dde25f.aab` | **4** | `37dde25f-5cb8-4245-ab25-4e357217f6f7` | 102255810 | `C2CD78E0C14B46D02BECDA0C5CBC364F40B8A161832B85FF9FFCEE7E418283E6` | 2026-08-14 10:37:30 | **CURRENT CANDIDATE** |
| `umtuba-android-production-26a60f53.aab` | **3** | `26a60f53-5658-4182-bca4-c0424928b015` | 102242485 | `61DAC1C62D9CCF85FBAD824B853F28DF24EFD7C2F4DDA3ADBCC0B470522ED70A` | 2026-08-13 12:04:12 | HISTORICAL / Internal Testing CORE uploaded |
| `umtuba-android-production-86c0d773.aab` | **2** | `86c0d773-7072-4f0a-bf97-52349cde3f21` | 102242186 | `1C3D41006F8834DE09716049856589E5AAE5DFC1ED74712C74E28E5A187D4671` | 2026-08-13 00:57:29 | SUPERSEDED (first production AAB; autoIncrement 1→2) |

**Recommend ONE current AAB:**  
`C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-37dde25f.aab`  
SHA256 `C2CD78E0C14B46D02BECDA0C5CBC364F40B8A161832B85FF9FFCEE7E418283E6`

Do **not** build another. Do **not** upload until Central `20260928` apply + runtime PASS + explicit GO.

Also present: `store-listing\` paste packets; `pre-ff-backup\app.config.ts` + `eas.json` (pre-FF snapshot).

---

# PHASE 6 — ANDROID RUNTIME QA

Do **not** collapse columns. v3 = device CORE. v4 = code + AAB, not device-retested.

| Surface | CODE_READY | BUILT_IN_AAB | DEVICE_TESTED | BACKEND_READY | RUNTIME_VERIFIED |
| --- | --- | --- | --- | --- | --- |
| Launch / startup | YES (v3+v4 trees) | v3 YES / v4 YES | **v3 YES** | N/A | **v3 YES** / v4 **NO** |
| Auth / login | YES | v3+v4 | **v3 YES** (reviewer + device) | Supabase public config PRESENT | **v3 YES** / v4 **NO** |
| Watch | YES + v4 UGC sheet (uncommitted) | v3 no UGC tools / v4 includes UGC UI | **v3 YES** (feed/playback) | UGC RPCs **NO** (`20260928` unapplied) | v3 CORE YES / v4 UGC **NO** |
| Discover | YES | v3+v4 | **v3 YES** | block-filter needs `20260928` | v3 YES / v4 **NO** |
| Create UI | YES + v4 Terms checkbox | v3+v4 | **v3 YES** | Terms = client gate | v3 YES / v4 Terms **NO** device |
| Upload | YES | v3+v4 | **v3 YES** CREATE_REAL_UPLOAD | storage/RLS existing | **v3 YES** / v4 **NO** |
| Playback | YES | v3+v4 | **v3 YES** | existing | **v3 YES** / v4 **NO** |
| Messages | YES + v4 report/block | v3+v4 | **v3 YES** (inbox/thread) | block trigger **NO** until SQL | v3 YES / v4 UGC **NO** |
| Profile | YES | v3+v4 | **v3 PARTIAL** (CORE tabs) | N/A | v3 PARTIAL / v4 **NO** |
| Account deletion | Web URL READY; v4 Settings row CODE_READY | **v4 YES** / **v3 NO** | v3 **NO** in-app link; URL web **YES** | `20260872` on alpha git; remote apply **UNKNOWN** | Web URL **YES**; in-app v4 **NO** device |
| Own-content delete | Android UAF-12 on `origin/master` only | **v4 NO** / origin-master YES (not this AAB) | **NO** on v4; unknown on v3 | Web UAF-12 on alpha git | **PARTIAL** — see Phase 9 |
| Report content/user | v4 CODE_READY | **v4 YES** | **NO** | **NO** | **NO** |
| Block | v4 CODE_READY | **v4 YES** | **NO** | **NO** | **NO** |
| Terms before publish | v4 CODE_READY | **v4 YES** | **NO** | Client-only | **NO** |
| Navigation / tabs | YES | v3+v4 | **v3 YES** | N/A | **v3 YES** / v4 **NO** |
| Deep links | intentFilters + scheme in config | v3+v4 | **NOT proven** this inventory | N/A | **UNKNOWN** |
| Supabase | public keys PRESENT; service-role rejected | v3 EAS loaded public keys | **v3 YES** | backend UGC **NO** | v3 YES / v4 **NO** |
| Errors / fail-closed Live | YES | v3+v4 | **v3 YES** ("Live unavailable") | N/A | **v3 YES**; source still fail-closed |
| Live | INTENTIONALLY_UNAVAILABLE | same | **v3 YES** (unavailable UI) | no lobby contract | FAIL_CLOSED (non-blocking) |

---

# PHASE 7 — GOOGLE PLAY (docs / closeouts only)

**No Console mutation. OCR = OPERATOR_CONFIRMATION_REQUIRED. Reviewer password not printed.**

| Item | Status | Evidence class |
| --- | --- | --- |
| Package | `com.umtuba.app` | FILE |
| Internal Testing CORE | **CLOSED** on versionCode **3** | DOCS 2026-08-13 |
| Data Safety | **SAVED / complete** — do not reopen | OPERATOR + DOCS |
| App access | **Entered / complete** — do not reopen | OPERATOR + DOCS |
| Target ages | 13–15 / 16–17 / 18+ selected — do not change | OPERATOR + DOCS |
| Target audience remaining (App details / Ads / Store presence / Summary) | **PARTIAL / unconfirmed** | DOCS |
| Account deletion URL in Play | **DOCS: paste-ready; page LIVE.** Whether Console card saved = **OCR** if not already marked complete | URL fetch YES; Console card OCR |
| In-app deletion (v3) | **NO** | DOCS + v3 settings |
| In-app deletion link (v4 code) | **CODE_READY** uncommitted | FILE |
| Ads declaration | **NO** in last audit (draft: No ads) | DOCS |
| Store listing complete | **NO** (screenshots operator) | DOCS |
| Content rating / IARC | **NO** | DOCS |
| UGC declaration | v3 honest **NO** report/block; v4 would be YES **after** upload + backend | DOCS |
| App signing enrolled | **OCR** | DOCS |
| Closed testing emails | **≥17** | OPERATOR |
| Closed testing opted-in | **UNKNOWN** | DOCS |
| 14-day production-access clock | **UNKNOWN / NOT_PROVEN_STARTED** | DOCS |
| Production access | **NO** | DOCS |
| v4 uploaded | **NO** | FILE `playUpload: false` |
| Production submit | **NO** | DOCS |
| Reviewer account | `google-play-review@umtuba.com` PROVISIONED | DOCS; password not printed |
| Last readiness % | **45% (9/20)** on 2026-08-13 remaining-console audit (v3-era). **Not re-scored in Console this session.** v4 code exists but does not raise Play % until upload + honest UGC YES + remaining cards. | DOCS |

Account deletion URL fetch (READ-ONLY, this session): page title “Delete your UMTUBA account”; queued request; sign-in required. Treat as publicly reachable.

---

# PHASE 8 — UGC MIGRATION HISTORY

| ID | Filename / owner | Uniqueness | `is_platform_admin` | Tests | Central applied? |
| --- | --- | --- | --- | --- | --- |
| `20260873` | `20260873_learning_ai_tutor_thread_metadata_read_v1.sql` — **Learning** | Unique as Learning on remotes. **Absent** on this worktree. | N/A (not UGC) | N/A this task | **Do not apply as UGC.** Learning frozen. |
| `20260922` | Central registry: `knowledge_acquisition_foundation_v1`. Git file on remotes: `20260876_knowledge_acquisition_foundation_v1.sql`. Former Desktop UGC filename **renamed away**. | **TAKEN** — not unique for UGC | N/A | N/A | **Do not apply as UGC.** Collision confirmed. |
| `20260928` | `20260928_ugc_safety_reports_blocks_v1.sql` | **Unique** on HEAD / profile-hero origin. **Not** on `origin/alpha-0.2` (111 migrations there; this file only on HEAD among the two trees). No other origin tip contains `380a366`. | **YES** — section 0 ensure (table + SECURITY DEFINER + GRANT authenticated/service_role; policy uses explicit `auth.uid()`) | Mobile UGC/safety **13/13 PASS** (2026-08-14, source not re-edited this inventory) | **NOT applied** — no newer Central evidence than UGC renumber packet. Desktop did not apply. |

`20260923`–`20260927`: unused in remotes/local at last registry. Chosen ID remains `20260928`.

Do **not** apply from Desktop / `db push`. Do **not** apply `20260873` or `20260922` as UGC.

---

# PHASE 9 — OWN-CONTENT DELETE (Android vs Web UAF-12)

Keep **separate**.

## 9.1 Web UAF-12

| Field | Result |
| --- | --- |
| CODE_READY on `origin/alpha-0.2` | **YES** — `6e494df` “let owners delete their own posts and videos (UAF-12)”; `app/actions/deletePost.ts` `deletePostAction`; `lib/supabase/deleteOwnedPost.ts` `deletePostForOwner`. Tests commit `d7b6504`. |
| CODE_READY on this profile-hero HEAD | **NO** — `6e494df` is **not** an ancestor of `380a366`. No `app/actions/deletePost.ts` on HEAD. |
| BUILT_IN_AAB | N/A (web) |
| BACKEND_READY | Uses existing post/video ownership paths on alpha tree; remote apply of a *new* UAF-12 migration **not** claimed this session |
| DEVICE_RUNTIME_VERIFIED / production runtime | **UNKNOWN** from Desktop. If Central current release is `f8e142d` (contains `6e494df`), code is **in the production git tip**. Desktop did not runtime-test delete. |
| Class | **ON_ALPHA_TIP / NOT_ON_DESKTOP_FEATURE_HEAD / RUNTIME_UNVERIFIED_FROM_DESKTOP** |

## 9.2 Android UAF-12

| Field | Result |
| --- | --- |
| CODE_READY on `origin/master` | **YES** — `45f0dbc` `deletePostForOwner` in `src/lib/social/deleteOwnedPost.ts` + Watch UI |
| CODE_READY on v4 working tree `3b33561` + UGC WIP | **NO** — `git grep deletePostForOwner HEAD` empty. Only failed-publish `deleteOwnedVideoObject` |
| BUILT_IN_AAB v4 | **NO** |
| BUILT_IN_AAB v3 | **NO** (UAF-12 after `fe14a34` / `3b33561`) |
| DEVICE_TESTED | **NO** |
| BACKEND_READY | Consumes existing UAF-12 contract; no second Android delete backend created |
| Class | **PARTIAL** — on origin/master; not in v4 tree/AAB. FF refused (Watch overlap). Later GO = new AAB. |

---

# PHASE 10 — ACCOUNT DELETION

| Field | Result |
| --- | --- |
| Web implementation commit | `5f0b6f151100401af3fab2d06ccaa5255540dbcd` on profile-hero |
| Later commits | `c708fb1`, `380a366` (pushed). `5f0b6f15` **is** on `origin/office/profile-hero-completeness-v1` |
| `5f0b6f15` ancestor of `origin/alpha-0.2`? | **NO** |
| Account-deletion files on `origin/alpha-0.2`? | **YES** — `app/account-deletion/page.tsx`, `AccountDeletionExperience.tsx`, `20260872_account_deletion_requests_v1.sql` (Central integrated via a different SHA) |
| Production URL | `https://umtuba.com/account-deletion` |
| URL READY this session | **YES** (READ-ONLY fetch; dedicated page) |
| ANDROID_CODE_CHANGED for web page | **NO** required |
| Android Settings link | v4 uncommitted `settings.tsx` “Delete account” → `https://umtuba.com/account-deletion` via `supportLinks.ts`. v3 binary: **no** delete row (prior audit) |
| NEW_AAB_REQUIRED_FOR_WEB_DELETION | **NO** (Play web-resource half). In-app link needs v4 for Play in-app half |
| `20260872` on HEAD + alpha | **YES** both |
| `20260872` applied on production DB | **UNKNOWN** from Desktop (page live ≠ table proven) |
| Immediate `deleteUser` | **NO** — queues `account_deletion_requests` |

---

# PHASE 11 — UGC POLICY MATRIX

| Control | UI (v4 WIP) | Backend SQL `20260928` | RLS / RPC | In v4 AAB | Runtime | Play |
| --- | --- | --- | --- | --- | --- | --- |
| Report content | CODE_READY Watch sheet | FILE on feature origin | RPCs in SQL; **unapplied** | YES (client) | **NO** | v3 declaration must stay honest NO until v4 uploaded **and** backend works |
| Report user | CODE_READY Watch + Messages | same | same | YES | **NO** | same |
| Block + feed/message effects | CODE_READY | same | trigger/RPCs unapplied | YES | **NO** | same |
| Terms before publish | CODE_READY Create + signup | Client only | N/A | YES | **NO** device | v3 = NO; v4 client YES |
| Account deletion link | CODE_READY Settings | Web flow | `20260872` on alpha git | YES in v4 | Web URL YES; in-app v4 **NO** device | URL half READY; in-app half = v4 |
| Own-content delete | Android **not** in v4; Web on alpha | not this UGC SQL | Web UAF-12 on alpha | **NO** | PARTIAL | not a Play UGC-report substitute |
| `is_platform_admin` | N/A | Ensured in `20260928` | DEFINER; anon execute revoked | N/A | unapplied | N/A |

`BACKEND_POLICY_READY = NO`. `UGC_GOOGLE_PLAY_READY = NO` until apply + v4 upload + honest YES.

---

# PHASE 12 — LIVE FAIL-CLOSED

Verified in current mobile source (v4 tree, same as v3 contract):

- `src/lib/live/api.ts` — `isLiveLobbySourceConfigured()` **returns `false`**. `loadLiveLobby()` returns `unavailable: true` without RPC.
- LiveKit URL in env is **shape-only**; not a join contract (`DESKTOP_ANDROID_POST_INSTALL_QA_AND_LIVE_CREATE_GATE_V1`).
- Device v3 showed “Live unavailable” — INTENTIONALLY_UNAVAILABLE; **not** a CORE blocker.
- `origin/master` `45f0dbc` also “hide unfinished Live” — **not** in v4 tree; do not FF.

**LIVE_OUT_OF_SCOPE = YES. Do not enable.**

---

# PHASE 13 — iOS SHARED-CODE IMPACT

| Field | Result |
| --- | --- |
| iOS started on Desktop? | **NO** |
| Shared impact | `origin/master` +2 commits touch `watch.tsx`, `WatchVideoCard.tsx`, `live.tsx`, `_layout.tsx` — **same files as uncommitted UGC** |
| UAF-12 / hide Live | On origin/master only |
| AASA | Central/alpha has `4e075f9` Team-ID-gated stub — **not** this Desktop task |
| Recommendation | Do **not** FF mobile. Do **not** start iOS. Later integrate GO = new AAB if UAF-12 ported into UGC tree |

---

# PHASE 14 — COMMERCE / JINN / MEDIA (Desktop historical)

Do **not** restart.

| Stream | Class | Notes |
| --- | --- | --- |
| Commerce money / refund / Stripe SoT (`9227cc3` lineage) | **STILL_RELEVANT / UNINTEGRATED vs alpha** | A1: local ~81%; production **NO**; tip diverged from alpha (~103 / ~195 at 2026-08-12). Stripe TEST / live payments / `commerce_confirm` external. |
| Buyer/seller a11y WTs | **CLOSED_PUSHED** (now CLEAN) | Post-release residual vs alpha |
| Commerce completion-audit WT | HISTORICAL / behind 1 | |
| `_port_extract` | **UNIQUE LOCAL / PROTECTED** | Never touch |
| Jinn AI Academy corpus / pilot media | **BLOCKED** external gates | A2: local inventory complete; `PILOT_INGEST_PRECHECK = NOT_READY`; upload/ingest **NO** |
| AI product flags | Gated OFF | Do not enable |
| Shared/private AI detached staged | **SUPERSEDED** | Preserve; do not commit |
| Learning V1 | **FROZEN** | Do not pop/apply Learning stash |
| Profile Hero product | On live alpha; this branch residual is workflow + later UGC/deletion | Not SAFE_FF onto alpha |

---

# PHASE 15 — TEST INVENTORY

This inventory **did not** re-run tests.

| Suite | When | Result | Class |
| --- | --- | --- | --- |
| Mobile UGC/safety 4 files | 2026-08-14 UGC renumber | 13/13 PASS | **RECENT_VALID** |
| Mobile UGC + related (Play policy) | 2026-08-14 | 37/37 PASS; full suite 383 pass + 1 pre-existing wallet locale flake | **RECENT_VALID** (pre-renumber; mobile source unchanged since) |
| Web account-deletion | 2026-08-13 | 35/35 PASS | **RECENT_VALID** for that commit |
| Web tsc/build account-deletion | 2026-08-13 | PASS (`ƒ /account-deletion`) | **RECENT_VALID** |
| Commerce / Stripe vitest logs | 2026-08-12 | `_a1_*vitest*.txt` | **STALE** vs current `origin/alpha-0.2` `f8e142d` |
| Jinn precheck Vitest | 2026-08-12 Wave 3 | 11/11 | **STALE** but residual class unchanged |
| This inventory | 2026-08-14 | none | **CURRENT** = not executed |

---

# PHASE 16 — DESKTOP-OWNED MIGRATIONS (read-only)

| ID | File | On HEAD | On `origin/alpha-0.2` | Applied (Desktop evidence) | Action |
| --- | --- | --- | --- | --- | --- |
| `20260872` | `20260872_account_deletion_requests_v1.sql` | YES | YES | **UNKNOWN** (page live) | Do not re-apply from Desktop |
| `20260928` | `20260928_ugc_safety_reports_blocks_v1.sql` | YES | **NO** | **NO** | Central targeted-apply only |
| `20260873` | Learning | NO (this WT) | NO (alpha listing this session) | N/A | **Never as UGC** |
| `20260922` UGC | none | NO | NO | N/A | **Never as UGC** |
| `20260876` | knowledge_acquisition | NO (this WT) | YES | Central registry used `20260922` for that feature | Do not touch |

HEAD migration count **101** vs alpha **111**. Only-on-HEAD name: `20260928_ugc_safety_reports_blocks_v1.sql`.

---

# PHASE 17 — REMAINING HUMAN PLAY CONSOLE ACTIONS

Do **not** reopen Data Safety / App access / target ages.

1. **Closed testing → Testers → record Opted-in count** (not email-list). If &lt;12, send opt-in link. 14-day clock unproven. **OCR.**
2. Confirm whether Account deletion **card** is already marked complete (URL is live). If not, paste `https://umtuba.com/account-deletion` only. **OCR.**
3. Ads = No ads (if card still open).
4. Target audience remaining cards (App details → Summary) if incomplete — do not change ages.
5. Store listing: icon / feature graphic / **real device screenshots** (operator).
6. IARC content rating.
7. App signing enrollment confirm (read-only). **OCR.**
8. **Do not upload v4** until `BACKEND_POLICY_READY = YES` / `GOOGLE_PLAY_V4_UPLOAD_SAFE = YES` + new GO.
9. **Do not** Apply for production / submit review without explicit GO.
10. After v4 is on a test track: UGC declaration can become honest YES (report/block/terms). Not before.

`NEXT_SINGLE_OPERATOR_ACTION` (Play, human): Closed testing Testers → opted-in count.

---

# PHASE 18 — SECRETS (PRESENT / ABSENT / UNKNOWN only)

**No values printed.**

| Secret / file | Presence | Central access |
| --- | --- | --- |
| `umtuba-web/.env.store-qa.local` | **PRESENT** (keys: STORE_QA_EMAIL / USERNAME / PASSWORD / USER_ID / AUTH_HOST) | Central load **NO** |
| `umtuba-web/.env.local` | **PRESENT** (public Supabase + LiveKit + Twilio + `SUPABASE_SERVICE_ROLE_KEY` **name present** — value not printed; gitignored) | N/A this task |
| `umtuba-web/.env.example` | PRESENT (template) | N/A |
| `umtuba-mobile/.env` | **PRESENT** (EXPO_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY / LIVEKIT_URL names) | Used for v3 device; v4 EAS recorded public keys on v3 JSON |
| `umtuba-mobile/.env.play-review.local` | **PRESENT** (PLAY_LOGIN_USERNAME / PASSWORD names) | Play form fill **not** by agent |
| `umtuba-mobile/.env.example` | PRESENT | N/A |
| SSH `id_ed25519` / `.pub` | **PRESENT** (files exist; keys not printed) | Desktop BatchMode historically PASS; Central-side auth not claimed this inventory |
| `umtuba_hetzner_known_hosts` | PRESENT | N/A |
| AUTH_ENV on Central runtime | **ABSENT / NOT PROVEN** | `CENTRAL_STORE_AUTH_ENV_READY = NO` |
| Secret copied to SMB | **NO** (prior V3) | |
| Approved vault in docs | **NO** | |

---

# PHASE 19 — TRANSPORT

| Channel | This session | Notes |
| --- | --- | --- |
| TO-DESKTOP | No new Central GO packet file found on disk / SMB | UGC renumber executed from prompt + prior delta |
| FROM-DESKTOP | This inventory + prior closeouts under `docs/ops/closeout/` | Archive copies in `Documents\UMTUBA\Desktop-Agent-Archive\` (2026-08-10/12/13) |
| OUTBOX | Repo closeout dir is the live outbox | Central receipt **not** claimed |
| SHARE / SMB `192.168.88.11` | **UNREACHABLE** (umtuba / UMTUBA / share / inbox / root). `net use` empty | Prior V2: Central `.pub` landed in SMB **inbox** (not intake). Packet **names** only historically; no listing this session |
| Pushed branches pending Central | `origin/office/profile-hero-completeness-v1` @ `380a366` (`20260928`) | Not on alpha |
| Pending packets | AUTH_ENV V3 (blocked); UGC apply; Play opted-in; whole-platform reconciliation | |

---

# PHASE 20 — HIDDEN / ORPHAN WORK

Do **not** delete.

| Item | Class |
| --- | --- |
| 23 detached WTs | SUPERSEDED / historical slices |
| Staged AI indexes | SUPERSEDED orphans |
| `agents\` empty slots | SAFE_TO_IGNORE |
| `umtuba-web\worktrees\desktop-commerce-agent-*` + `desktop-workers` | Empty/historical slots (DESKTOP-A2 also linked here) |
| Temp staging `e84475a` | SUPERSEDED |
| `_streaming_port_extract` | **PROTECTED** |
| `_port_extract` (commerce WT) | **PROTECTED** |
| `sanitation-backups`, wave0 zip/dir, `_backup-shared-ai-mixed-*` | HISTORICAL |
| Loose `app.js` / `index.html` / `style.css` | HISTORICAL non-product |
| Local `alpha-0.2` `32fb3629` | STALE ref |
| Mobile `release-artifacts\pre-ff-backup` | Snapshot; keep |
| Documents archive | HISTORICAL copies |

---

# P0 / P1 / P2 / P3 OPEN ITEMS

## P0

1. Central targeted-apply **only** `20260928_ugc_safety_reports_blocks_v1.sql`. Never `db push`. Never `20260873` / `20260922` as UGC.
2. Do **not** upload v4 until apply + runtime PASS + new GO.
3. Preserve mobile UGC WIP + v4 AAB. Do not FF origin/master.
4. Preserve `_port_extract`. Do not clean/reset/delete worktrees.

## P1

1. Operator: Closed testing **opted-in** count (14-day clock unproven).
2. Central AUTH_ENV Path A/B — `CENTRAL_STORE_AUTH_ENV_READY` still **NO**.
3. After backend PASS: device-test v4 (report/block/terms/deletion link) before Play UGC YES.
4. Confirm `20260872` remote apply (page is live; table unproven from Desktop).

## P2

1. Remaining Play cards: ads, IARC, listing screenshots, TA summary, app signing OCR.
2. Later GO: port Android UAF-12 into UGC tree (new AAB) or ship without it (document PARTIAL).
3. Commerce / Jinn remain unintegrated vs alpha — Central schedule, not a Desktop wave.

## P3

1. Historical WT hygiene (detached/superseded) — Central decision only.
2. Stale local `alpha-0.2` ref — do not FF while primary dirty.
3. Learning/Collaboration dirty WTs — Laptop-owned.

---

# BLOCKER LISTS

## ANDROID_RELEASE_BLOCKERS

- `BACKEND_POLICY_READY = NO` (`20260928` unapplied)
- `GOOGLE_PLAY_V4_UPLOAD_SAFE = NO`
- v4 **not** DEVICE_RUNTIME_VERIFIED
- v4 **not** uploaded
- Closed testing opted-in **UNKNOWN** / 14-day **unproven**
- Production access **NO**
- Own-content delete **not** in v4 AAB

## GOOGLE_PLAY_BLOCKERS

- v4 not on any Play track
- UGC declaration cannot be honest YES until v4 is the reviewed binary **and** RPCs work
- Store listing / IARC / ads / TA remainder / app signing = incomplete or OCR
- Opted-in count UNKNOWN
- Do not submit Production

## DESKTOP_BLOCKERS

- AUTH_ENV Central load **NO** (operator-secure transfer still required)
- LAN SSH to `192.168.88.11` historically publickey-denied for AUTH_ENV landing; SMB down this session
- Cannot FF mobile; cannot apply SQL; cannot mutate Play (forbidden + unsafe)

## CENTRAL_ACTION_REQUIRED

1. Ingest this inventory into `UMTUBA_WHOLE_PLATFORM_FINAL_RECONCILIATION_AND_AUDIT_V1` with SERVER / LAPTOP / PC2.
2. Fetch `380a36646d4de8a37c39a56ac3ccd449f6d8b20d`. Verify `20260928` unique vs `schema_migrations`. Targeted-apply that file only.
3. Runtime-test report/block/unauthorized/spoof. Then set `BACKEND_POLICY_READY` / `GOOGLE_PLAY_V4_UPLOAD_SAFE`.
4. AUTH_ENV V3 Path A/B (Desktop will not deploy; do not copy secret to SMB/Git/chat).
5. Confirm production release dir vs `f8e142d` (Desktop did not deploy).
6. Do not ask Desktop to start another wave until reconciliation.

## RECOMMENDED_NEXT_ACTION

**STOP. Wait for Central reconciliation.** No next Desktop wave. No AAB. No Play mutation. No apply. No commit. No push. No cleanup.

Operator-only if they choose (not a Desktop agent wave): record Closed testing opted-in count.

---

# DESKTOP REPORT (machine fields)

```
TASK_ID = DESKTOP_FINAL_DEVICE_STATE_COMPLETE_INVENTORY_V1
DEVICE = DESKTOP
DEVICE_ROLE = FINAL_STATE_REPORTER / ANDROID_GOOGLE_PLAY_PRIMARY
CENTRAL_COORDINATOR = SERVER
MODE = READ_ONLY_AUDIT
REPORT_TIMESTAMP = 2026-08-14 14:18:33 +03:00
WEB_PATH = C:\Users\1\Desktop\umtuba\umtuba-web
WEB_BRANCH = office/profile-hero-completeness-v1
WEB_SHA = 380a36646d4de8a37c39a56ac3ccd449f6d8b20d
WEB_UPSTREAM = origin/office/profile-hero-completeness-v1
WEB_AHEAD_BEHIND = 0/0
WEB_DIRTY = YES (docs only)
ORIGIN_ALPHA_02 = f8e142d8cf7faab9646f127c1995e351be94fb37
LOCAL_ALPHA_02 = 32fb3629cd98c5661b2ef98644685de51f414dee (STALE; not FF)
ORIGIN_MASTER_WEB = c96e4c68880f6decb8c70b58830ab63f71b1f8f7
WORKTREES = 121
DIRTY_WORKTREES = 11
DETACHED = 23
NO_UPSTREAM = 32
AHEAD = 0
BEHIND = 3
MOBILE_PATH = C:\Users\1\Desktop\umtuba\umtuba-mobile
MOBILE_BRANCH = master
MOBILE_SHA = 3b335610ced48aa2595fe49eef5b97511c7f4cb5
MOBILE_UPSTREAM = origin/master
MOBILE_AHEAD_BEHIND = 0/2
MOBILE_DIRTY = YES (UGC + versionCode 4 + release-artifacts)
PACKAGE = com.umtuba.app
VERSION_NAME = 1.0.0
VERSION_CODE_WORKING_TREE = 4
VERSION_CODE_DEVICE_TESTED = 3
EAS_V4 = 37dde25f-5cb8-4245-ab25-4e357217f6f7
AAB_CURRENT = C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-37dde25f.aab
AAB_SHA256 = C2CD78E0C14B46D02BECDA0C5CBC364F40B8A161832B85FF9FFCEE7E418283E6
AAB_V3 = umtuba-android-production-26a60f53.aab
AAB_V2 = umtuba-android-production-86c0d773.aab
PLAY_UPLOAD_V4 = NO
CODE_READY_UGC = YES
BACKEND_READY = NO
BUILT_IN_AAB_V4 = YES
DEVICE_RUNTIME_VERIFIED_V4 = NO
DEVICE_RUNTIME_VERIFIED_V3_CORE = YES
GOOGLE_PLAY_CONFIGURED = PARTIAL
PRODUCTION_RELEASE_READY = NO
GOOGLE_PLAY_V4_UPLOAD_SAFE = NO
UGC_ID = 20260928
UGC_ON_ALPHA = NO
UGC_APPLIED = NO
REJECTED_UGC_IDS = 20260873 (Learning), 20260922 (knowledge_acquisition)
ACCOUNT_DELETION_URL = https://umtuba.com/account-deletion
ACCOUNT_DELETION_URL_LIVE = YES
ACCOUNT_DELETION_WEB_SHA = 5f0b6f151100401af3fab2d06ccaa5255540dbcd (on feature origin; not ancestor of alpha; alpha has files via other SHA)
ANDROID_SETTINGS_DELETE_LINK_V4 = YES (uncommitted)
ANDROID_SETTINGS_DELETE_LINK_V3 = NO
WEB_UAF12 = YES on origin/alpha-0.2 6e494df; NO on profile-hero HEAD
ANDROID_UAF12 = YES on origin/master 45f0dbc; NO in v4 tree/AAB
LIVE = OUT_OF_SCOPE / FAIL_CLOSED
AUTH_ENV_DESKTOP = PRESENT
AUTH_ENV_CENTRAL = NO
CLOSED_TESTING_EMAILS = >=17
CLOSED_TESTING_OPTED_IN = UNKNOWN
DATA_SAFETY = COMPLETE (do not reopen)
APP_ACCESS = COMPLETE (do not reopen)
TARGET_AGES = 13-15/16-17/18+ (do not change)
REVIEWER = google-play-review@umtuba.com
SMB_192_168_88_11 = UNREACHABLE
PORT_EXTRACT_TOUCHED = NO
PRODUCT_CODE_CHANGED = NO
COMMIT_PERFORMED = NO
PUSH_PERFORMED = NO
ANDROID_RELEASE_BLOCKERS = 20260928 unapplied; v4 not device-tested; v4 not uploaded; opted-in UNKNOWN; UAF-12 not in v4
GOOGLE_PLAY_BLOCKERS = v4 not on track; UGC YES unsafe; listing/IARC/ads/signing OCR; production access NO
DESKTOP_BLOCKERS = AUTH_ENV Central NO; SMB down; cannot FF mobile
CENTRAL_ACTION_REQUIRED = reconcile inventories; targeted-apply 20260928; AUTH_ENV Path A/B; confirm production tip
RECOMMENDED_NEXT_ACTION = STOP. Wait for UMTUBA_WHOLE_PLATFORM_FINAL_RECONCILIATION_AND_AUDIT_V1. No next Desktop wave.
VERDICT = INVENTORY_COMPLETE / WAIT_CENTRAL_RECONCILIATION
```

---

# Safety record

| Constraint | Honored |
| --- | --- |
| No product code changes | YES |
| No commit / push | YES |
| No new AAB / Play mutation | YES |
| No migrations / db push | YES |
| No Live / iOS / Store / Learning edits | YES |
| No clean/reset/delete | YES |
| No secrets printed | YES |
| No Desktop writes | YES |
| `_port_extract` untouched | YES |
| No next wave started | YES |
