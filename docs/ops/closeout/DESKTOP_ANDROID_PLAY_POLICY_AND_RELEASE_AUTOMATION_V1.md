# DESKTOP_ANDROID_PLAY_POLICY_AND_RELEASE_AUTOMATION_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_RELEASE_OPERATOR / MOBILE_POLICY_IMPLEMENTATION_PRIMARY  
**PRIORITY:** RELEASE_CRITICAL  
**MODE:** IMPLEMENT / TEST / BUILD / OPERATOR HANDOFF  
**DATE:** 2026-08-14  
**TASK_ID:** DESKTOP_ANDROID_PLAY_POLICY_AND_RELEASE_AUTOMATION_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**VERSION_CODE:** `4`  
**EAS_BUILD_ID:** `37dde25f-5cb8-4245-ab25-4e357217f6f7`  
**MOBILE:** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `3b33561` + uncommitted UGC policy (working tree; **behind origin/master by 2 iOS commits**)  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1` @ `5f0b6f1`

This packet implements Play-compliant UGC controls on Android, builds/verifies versionCode 4, and reduces operator Console work to genuine human-only steps. It does **not** upload to Play, submit review, roll out Production, enable Live, or commit.

---

## Verdict

| Field | Result |
|------|--------|
| UGC_IMPLEMENTED | **YES** |
| REPORT_CONTENT_READY | **YES** |
| REPORT_USER_READY | **YES** |
| BLOCK_USER_READY | **YES** |
| TERMS_BEFORE_PUBLISH_READY | **YES** |
| ACCOUNT_DELETION_IN_APP_REQUIRED | **YES** |
| ACCOUNT_DELETION_IN_APP_READY | **YES** |
| BACKEND_POLICY_READY | **PENDING_MIGRATION** |
| TESTS | **PASS** (UGC + related; 37/37). Full suite: 383 pass + 1 pre-existing wallet locale flake |
| ANDROID_REGRESSION | **PASS** (Watch/Discover/Create/Messages unit surfaces) |
| NEW_BUILD_REQUIRED | **YES** (done) |
| NEW_AAB_CREATED | **YES** |
| VERSION_CODE | **4** |
| AAB_PATH | `C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-37dde25f.aab` |
| AAB_SHA256 | `C2CD78E0C14B46D02BECDA0C5CBC364F40B8A161832B85FF9FFCEE7E418283E6` |
| PLAY_STORE_ASSETS_READY | **PARTIAL** |
| STORE_LISTING_PACKET_READY | **YES** |
| CONTENT_RATING_PACKET_READY | **YES** |
| UGC_DECLARATION_PACKET_READY | **YES** |
| CLOSED_TESTER_EMAIL_COUNT | **>=17** |
| CLOSED_TESTING_OPTED_IN_COUNT | **UNKNOWN** |
| PRODUCTION_ACCESS_READY | **NO** |
| ANDROID_PRODUCTION_RELEASE_READY | **NO** |
| PRODUCT_CODE_CHANGED | **YES** |
| GOOGLE_PLAY_MUTATED | **NO** |
| SERVICE_ROLE_EXPOSED | **NO** |
| VERDICT | **UGC_CODE_READY / AAB_V4_READY / MIGRATION_UNAPPLIED / CONSOLE_OPERATOR_REMAINS** |

**Do not submit or roll out Production.**  
**Do not upload this AAB until Central applies `20260873` and you give an explicit GO.**  
**Do not invent an opted-in tester count.**

---

## What shipped in the client (versionCode 4)

| Control | Where | Backend |
|---------|--------|---------|
| Report content | Watch → ⚑ Report → Report video → reason → Submit | `report_ugc_content` |
| Report user | Watch safety sheet + Messages thread → Report account | `report_ugc_user` |
| Block user | Watch / Messages → Block account. Settings → Blocked users (list/unblock) | `block_ugc_user` / `unblock_ugc_user` / `list_my_blocked_users` / `list_ugc_block_ids` |
| Block effects | Watch + Discover hide blocked authors; Messages inbox hides peers; new DM refused; message insert trigger rejects blocked pairs | `ugc_users_are_blocked` + `ugc_reject_blocked_message` |
| Terms before publish | Create checkbox required (`canPublishWithUgcAck`). Signup also requires Terms | Client gate (no new publish RPC) |
| Account deletion in-app | Settings → Delete account → `Linking.openURL(https://umtuba.com/account-deletion)` | Existing web flow only. No Auth admin / service-role |

Duplicate reports return a confirmation, not a crash. Self-report / self-block refused. Rate limit: 20 open reports / 24h (SQL).

---

## Backend contract (unapplied)

**File:** `umtuba-web/supabase/migrations/20260873_ugc_safety_reports_blocks_v1.sql`  
**Do NOT apply from Desktop.** Central must apply per `docs/DEVELOPMENT_WORKFLOW.md`.

Until applied, the v4 AAB UI works but report/block RPCs will fail closed with retry/error copy.  
`BACKEND_POLICY_READY = PENDING_MIGRATION`.

No service-role in the mobile client. User JWT + RLS / SECURITY DEFINER `auth.uid()` only.

---

## Tests

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **PASS** |
| `vitest` safety + ugcSafety + watchFeed map + supportLinks + messenger foundation + discover | **37/37 PASS** |
| Full `vitest run` (prior session) | 383 PASS; 1 FAIL `src/lib/wallet/format.test.ts` locale grouping (`١٬٢٣٤`) — **pre-existing**, not this change |
| `git diff --check` (mobile product + web migration/docs) | **PASS** |

---

## AAB (verified, not uploaded)

Prior session started EAS production after tests. First GraphQL request failed **after** remote `versionCode` incremented 3 → 4. Retry used remote 4 without a second increment.

| Field | Value |
|-------|--------|
| Command | `npx eas-cli build --platform android --profile production --non-interactive` |
| BUILD_ID | `37dde25f-5cb8-4245-ab25-4e357217f6f7` |
| Status | **finished** |
| Profile | production / STORE |
| versionName | 1.0.0 |
| versionCode | **4** |
| Package | `com.umtuba.app` |
| Keystore | existing `p6De1DDtE_` (default). SIGNING_CREDENTIALS_CHANGED = NO |
| Artifact URL | https://expo.dev/artifacts/eas/E30A6TXW29yo0u4eZ88budjsXkpSfzAlAcpf8XosOXM.aab |
| Logs | https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/37dde25f-5cb8-4245-ab25-4e357217f6f7 |
| Local path | `umtuba-mobile/release-artifacts/umtuba-android-production-37dde25f.aab` |
| Size | 102255810 bytes |
| SHA256 | `C2CD78E0C14B46D02BECDA0C5CBC364F40B8A161832B85FF9FFCEE7E418283E6` |
| Zip check | App Bundle (`BUNDLE-METADATA/...`) |
| Play upload | **NO** |

This resume **verified and downloaded** the existing v4 AAB. It did **not** rebuild.

---

## Operator packets (not uploaded)

Directory: `umtuba-mobile/release-artifacts/store-listing/`

| Packet | File |
|--------|------|
| Main listing text | `MAIN_STORE_LISTING.txt` |
| Category | `CATEGORY.txt` |
| IARC / content rating | `CONTENT_RATING_IARC.txt` |
| Ads = No | `ADS_DECLARATION.txt` |
| Target audience remaining | `TARGET_AUDIENCE.txt` |
| UGC declaration (honest YES for v4) | `UGC_DECLARATION.txt` |
| Account deletion | `ACCOUNT_DELETION.txt` |
| Reviewer instructions | `REVIEWER_INSTRUCTIONS.txt` (password stays in `.env.play-review.local`) |
| Release notes v4 | `RELEASE_NOTES_VERSIONCODE_4.txt` |
| Closed testing procedure | `CLOSED_TESTING_OPERATOR.txt` |
| Graphics status | `GRAPHICS_STATUS.txt` |
| Feature graphic 1024×500 | `feature-graphic-1024x500.png` (from existing icon) |

`STORE_GRAPHICS_OPERATOR_REQUIRED` = **YES** for phone screenshots. Do not invent them.

---

## Closed testing (opt-in ≠ email list)

`CLOSED_TESTING_OPTED_IN_COUNT = UNKNOWN`

1. Play Console → Test and release → Testing → Closed testing → Testers  
2. Copy opt-in URL (`https://play.google.com/apps/testing/com.umtuba.app`)  
3. Testers must open it on the listed Google account and tap Become a tester  
4. Read **Opted-in**, not email-list count  
5. 14-day clock (personal accounts after 13 Nov 2023) starts only after ≥12 stay opted in: https://support.google.com/googleplay/android-developer/answer/14151465  

---

## Remaining operator-only actions

1. **Closed testing Testers** — record opted-in count. If <12, send the opt-in link.  
2. **Central** — apply `20260873_ugc_safety_reports_blocks_v1.sql` to production Supabase (targeted; not `db push`).  
3. **Upload AAB** versionCode 4 to Internal or Closed testing (not Production) **after** migration is applied.  
4. Save paste-ready cards: Ads = No; IARC; listing text; UGC YES for v4; TA remaining App details → Summary.  
5. Upload icon + feature graphic + **real device screenshots**.  
6. Confirm Play App Signing enrollment (read-only).  
7. Do **not** Apply for production / submit review without a new explicit GO.

Do **not** reopen Data Safety, App access, or target ages.

---

## NEXT_SINGLE_OPERATOR_ACTION

Play Console → Closed testing → Testers → record the **opted-in** count (not the email-list count).

---

## Mobile sync note (do not ff blindly)

`origin/master` is **2 commits ahead** (`45f0dbc`, `db7f927`) — iOS UAF-12 delete-own + hide unfinished Live. Those commits touch `watch.tsx` and `WatchVideoCard.tsx` (same files as this UGC work). Fast-forward was **not** performed so the verified v4 AAB and uncommitted UGC tree stay intact. A later GO can integrate delete-own (would be a new AAB).

---

## Files changed

### umtuba-mobile (uncommitted; do not discard)

- `app.config.ts` — versionCode 4  
- `eas.json` — production `environment: production` (autoIncrement true; remote already at 4)  
- `app/(auth)/signup.tsx` — Terms checkbox  
- `app/(tabs)/watch.tsx` — safety sheet  
- `app/_layout.tsx` — Blocked users screen  
- `app/messages/[id].tsx` — report/block  
- `app/settings.tsx` — Blocked users link (Delete account already from iOS readiness)  
- `app/blocked-users.tsx` — **new**  
- `components/WatchVideoCard.tsx` — Report action  
- `components/UgcSafetySheet.tsx` — **new**  
- `src/lib/feed/watchFeed.ts` — filter blocked authors  
- `src/lib/messenger/api.ts` — filter / refuse blocked peers  
- `src/lib/video/ugcSafety.ts` + test  
- `src/lib/safety/*` — **new** policy/report/block + tests  
- `release-artifacts/` — v4 AAB + store packets  

### umtuba-web (uncommitted)

- `supabase/migrations/20260873_ugc_safety_reports_blocks_v1.sql` — **new, unapplied**  
- `docs/ops/closeout/DESKTOP_ANDROID_PLAY_POLICY_AND_RELEASE_AUTOMATION_V1.md`  
- `docs/ai/CURRENT_TASK.md`, `CURSOR_REPORT.md`, `PROJECT_STATE.md`, `SESSION_HANDOFF.md`  

**No commit. No push.**
