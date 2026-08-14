# DESKTOP_ANDROID_UGC_MIGRATION_RENUMBER_PLAY_COMPLIANCE_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_RELEASE_OPERATOR / UGC_SOURCE_OWNER  
**CENTRAL_COORDINATOR:** SERVER  
**PRIORITY:** RELEASE_CRITICAL  
**DATE:** 2026-08-14  
**PRIMARY_TASK_ID:** DESKTOP_ANDROID_UGC_MIGRATION_RENUMBER_PLAY_COMPLIANCE_V1  
**SUBSET_TASK_ID:** DESKTOP_ANDROID_UGC_MIGRATION_COLLISION_RENUMBER_V1  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1`  
**MOBILE:** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `3b33561` + uncommitted UGC / versionCode 4 AAB  

This packet resolves the `20260873` UGC vs Learning migration collision, re-audits Play UGC capabilities, and hands Central a unique targeted apply. Desktop did **not** apply the migration, upload Play, rebuild v5, or start another wave.

---

## Verdict

| Field | Result |
|------|--------|
| COLLISION_CONFIRMED | **YES** |
| OLD_UGC_MIGRATION_ID | `20260873` |
| NEW_UGC_MIGRATION_ID | `20260922` |
| NEW_MIGRATION_FILENAME | `supabase/migrations/20260922_ugc_safety_reports_blocks_v1.sql` |
| LEARNING_MIGRATION_PRESERVED | **YES** |
| LEARNING_MIGRATION_UNCHANGED | **YES** |
| MIGRATION_CONTENT_SEMANTIC_CHANGE | **NO** (SHA256 identical `46DEDDC98EBD621253871F520229915995345937D263F8FF755BF3D80212D938`) |
| MIGRATION_NAMESPACE_COLLISION | **NO** |
| UGC_APPLIED_STATUS | **NO** (untracked local file; Central did not apply) |
| LEARNING_APPLIED_STATUS | **UNKNOWN** from Desktop (no production `schema_migrations` read this session). Prior commerce preflight recorded remote-only `20260871`–`20260873` (AI/learning). Treat Learning ID as reserved. Treat UGC as unapplied. |
| UGC_REPORT_CAPABILITY | **YES** (client; backend pending Central apply) |
| UGC_BLOCK_CAPABILITY | **YES** (client; backend pending Central apply) |
| UGC_TERMS_ACCEPTANCE | **YES** |
| MOBILE_ACCOUNT_DELETION_ENTRY | **YES** → `https://umtuba.com/account-deletion` |
| MOBILE_OWN_CONTENT_DELETE | **PARTIAL** — existing UAF-12 owner-delete lives on `origin/master` (`45f0dbc`) via `deletePostForOwner`. Not merged into the v4 UGC working tree (Watch overlap; ff refused). Failed-publish storage cleanup exists. No second delete backend created. |
| MIGRATION_TARGETED_APPLY_READY | **YES** |
| ANDROID_V4_REBUILD_REQUIRED | **NO** |
| EXISTING_V4_AAB_STILL_VALID | **YES** |
| NEW_AAB_REQUIRED | **YES** (distribution beyond v3; v4 AAB already built — do not rebuild v5) |
| NEXT_VERSION_CODE_IF_REQUIRED | **4** |
| GOOGLE_PLAY_MUTATED | **NO** |
| PRODUCTION_MUTATED | **NO** |
| SERVICE_ROLE_EXPOSED | **NO** |
| ANDROID_PRODUCTION_RELEASE_READY | **NO** |
| BACKEND_POLICY_READY | **NO** until Central applies `20260922` |
| GOOGLE_PLAY_V4_UPLOAD_SAFE | **NO** until Central apply + runtime PASS |
| VERDICT | **COLLISION_RESOLVED / UGC_CLIENT_READY / AAB_V4_VALID / WAIT_CENTRAL_APPLY** |

---

## Phase 1 — Source of truth

- `git fetch --prune` on web. Branch `office/profile-hero-completeness-v1` was even with `origin` at `5f0b6f151100401af3fab2d06ccaa5255540dbcd` before this commit.
- `origin/alpha-0.2` advanced `76598e7` → `4e075f9` (observed; Desktop did not merge/rebase onto it).
- Unrelated web closeout WIP and Android UGC / v4 AAB tree **preserved**. No stash/reset/ff on mobile (still behind `origin/master` by 2 iOS commits that overlap Watch).

---

## Phase 2 — Collision

| Side | File | Location |
|------|------|----------|
| UGC (unapplied, this machine) | `20260873_ugc_safety_reports_blocks_v1.sql` | local untracked only; **renamed** |
| Learning (authoritative) | `20260873_learning_ai_tutor_thread_metadata_read_v1.sql` | many origin Learning/collab tips; blob `7c98c962572c11db2d92471be019e88fd9abdaac`. **Not** on this worktree. **Not** on `origin/alpha-0.2` tip (alpha jumps `20260872` → `20260876`). |

Hardcoded `20260873` in Android/mobile source: **none**. SQL body had no version string. Historical Play closeout still mentions the old ID; this packet is the Central ID of record.

### Next unique ID

Scanned local `supabase/migrations` plus all `origin/*` tips. Highest reserved version observed: **`20260921`** (`20260921_learning_certification_persistence_v1.sql` on `origin/office/learning-ai-tutor-learner-ui-integration-v1`). `20260922` did not exist in git history or locally.

`origin/alpha-0.2` max file is `20260914`. Using `20260922` stays after every reserved sibling, including Learning/collab IDs `20260915`–`20260921`.

Rename: byte-copy to `20260922_ugc_safety_reports_blocks_v1.sql`, delete untracked `20260873` UGC file. Learning file never touched.

---

## Phase 3 — UGC capability audit (no redesign)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Report content | **YES** | Watch `UgcSafetySheet` → `report_ugc_content` |
| Report user | **YES** | Watch + Messages → `report_ugc_user` |
| Block / unblock | **YES** | Watch / Messages / Settings → Blocked users; `block_ugc_user` / `unblock_ugc_user` / list RPCs |
| Block effects | **YES** | Watch/Discover filter; Messages inbox hide; insert trigger `ugc_reject_blocked_message` |
| Terms before publish | **YES** | Create `canPublishWithUgcAck`; signup Terms checkbox |
| Account deletion entry | **YES** | Settings → Delete account → allowlisted `https://umtuba.com/account-deletion` (existing web flow; no Auth admin) |
| Own-content delete | **PARTIAL** | `origin/master` `45f0dbc` consumes existing UAF-12 `deletePostForOwner`. Current v4 tree has only failed-publish `deleteOwnedVideoObject`. Not ported (Watch overlap; would force a new AAB). |

No second delete backend. No web account-deletion recreation.

---

## Phase 4 — Authorization / safety

- RPCs: `SECURITY DEFINER` + `set search_path = public` + `auth.uid()`; anon/public execute revoked.
- Unauthenticated → `Authentication required`.
- Cannot report/block self. Cannot delete others' content via these RPCs (no owner-delete in this SQL).
- Report abuse resistance: reason allowlist, 1000-char detail, 20 open reports / 24h, duplicate open-report unique indexes.
- RLS + FORCE RLS on `user_blocks` / `ugc_reports`. Authenticated insert/select scoped to `auth.uid()`.
- Mobile env rejects service-role keys (`src/lib/env.ts`).
- `SERVICE_ROLE_EXPOSED = NO`.

---

## Phase 5 — Mobile UX

Usable report/block/terms/account-deletion settings remain on the v4 working tree. No broad redesign. Watch delete-own control is on unmerged `origin/master` only.

---

## Phase 6 — Tests

| Check | Result |
|-------|--------|
| Android targeted UGC/safety/watch/discover/messenger/supportLinks | **37/37 PASS** |
| Web TypeScript | **N/A** (SQL + docs only) |
| Web `npm run build` | **N/A** (no app UI/entry change) |
| `git diff --check` (this packet) | **PASS** |
| Remote apply | **NOT RUN** |

ANDROID_REGRESSION = **PASS** (Watch/Discover/Messages unit surfaces unchanged; mobile source not edited this task). Prior v4 session tsc PASS still applies.

---

## Phase 7 — Central apply (targeted only)

**Do NOT `supabase db push`.**  
**Do NOT apply from Desktop.**  
**Do NOT apply `20260873` as UGC.** Learning owns that version.

Per `docs/DEVELOPMENT_WORKFLOW.md` (Migration Version Policy + Remote History Verification + targeted apply):

1. Fetch this branch/commit (SHA in DESKTOP REPORT / CURSOR_REPORT after push).
2. Verify `20260922` is unique in the integration tree and in remote `schema_migrations`.
3. Integrate the new file. Do not renumber or overwrite `20260873_learning_ai_tutor_thread_metadata_read_v1.sql`.
4. Apply **only** `20260922_ugc_safety_reports_blocks_v1.sql` with the targeted procedure.
5. Register history only after successful apply.
6. Runtime-test: report content, report user, block user, unauthorized mutation rejection, identity spoofing rejection.
7. Only after PASS: `BACKEND_POLICY_READY = YES`, `ANDROID_V4_BACKEND_READY = YES`, `GOOGLE_PLAY_V4_UPLOAD_SAFE = YES`.

---

## Phase 8 — AAB / Play

| Field | Value |
|-------|--------|
| Known uploaded/candidate on Play | versionCode **3** (do not treat as the UGC build) |
| Existing unuploaded AAB | versionCode **4** EAS `37dde25f` |
| Path | `C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-37dde25f.aab` |
| SHA256 | `C2CD78E0C14B46D02BECDA0C5CBC364F40B8A161832B85FF9FFCEE7E418283E6` |
| Rebuild v5 | **NO** (mobile source not changed this task) |
| Play upload | **NO** |

### Google Play readiness reassessment (no Console mutation)

| Gate | Status |
|------|--------|
| UGC in-app report/block/terms | Client **YES** on v4; backend **NO** until `20260922` apply |
| Account deletion URL | **LIVE** `https://umtuba.com/account-deletion`; Settings discovers it |
| Reviewer access | Provisioned `google-play-review@umtuba.com` (password operator-local) |
| Data Safety | Operator SAVED — do not reopen |
| Target audience | 13–15 / 16–17 / 18+ selected — do not reopen |
| App access | Entered — do not reopen |
| Closed testing emails | ≥17 |
| Closed testing opted-in / 12-of-14 | **UNKNOWN** |
| Production access / submit | **NO** |
| ANDROID_PRODUCTION_RELEASE_READY | **NO** |

---

## Central action required

1. Fetch the commit that adds `20260922_ugc_safety_reports_blocks_v1.sql`.
2. Confirm uniqueness vs Learning `20260873` and vs `schema_migrations`.
3. Integrate; targeted-apply **only** `20260922`.
4. Runtime-test report/block/auth negatives.
5. Flip backend/Play-upload-safe flags only after PASS.
6. Do not upload v4 from Desktop. Operator upload waits for those flags + a new GO.

---

## Blockers (non-fatal for this packet)

- Production `schema_migrations` row for Learning `20260873` not re-read this session (UNKNOWN).
- Closed testing opted-in count UNKNOWN.
- Watch own-content delete not in the v4 working tree (unmerged iOS UAF-12). Later integrate GO; would be a new AAB if ported.
- AUTH_ENV Central load still NO (`DESKTOP_CENTRAL_STORE_AUTH_ENV_SECURE_LANDING_V3`).

---

## Hard stops honored

No Learning overwrite. No reuse of `20260873` for UGC. No `db push`. No Play Console. No Live. No Stripe. No iOS. No secrets printed. No force push. No Desktop write. No `_port_extract`. No production apply. No v4 upload. No next Android wave.
