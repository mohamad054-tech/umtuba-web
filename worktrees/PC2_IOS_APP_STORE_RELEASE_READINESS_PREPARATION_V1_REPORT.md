# PC2 — iOS / App Store Release Readiness Preparation V1

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_READINESS_PRIMARY
TASK_ID = PC2_IOS_APP_STORE_RELEASE_READINESS_PREPARATION_V1
CENTRAL_COORDINATOR = SERVER
TIMESTAMP_LOCAL = 2026-08-13 ~19:25 +03
MODE = AUDIT + SAFE IMPLEMENTATION + TEST + PREPARE + REPORT
COMMIT_CREATED = NO
PUSHED = NO
APP_STORE_UPLOAD = NOT_ATTEMPTED
TESTFLIGHT_SUBMIT = NOT_ATTEMPTED
APPLE_PRODUCTION_CREDENTIALS_USED = NO
SECRET_VALUES_PRINTED = NO
DESKTOP_ANDROID_OVERWRITTEN = NO
COMPETING_ACCOUNT_DELETION_BACKEND = NO
```

## CENTRAL FIELDS

```text
AUTHORITATIVE_MOBILE_SHA = fe14a34e7d5d10f8fd6fe2f1845e3bd81ffe2f99
BRANCH = master
WORKTREE_STATUS = CLEAN_AT_CLONE; LOCAL_UNCOMMITTED_SAFE_FIXES
IOS_BUNDLE_ID_STATUS = PRESENT_IN_REPO com.umtuba.app (not invented)
IOS_VERSION_STATUS = 1.0.0
IOS_BUILD_NUMBER_STATUS = 1
EAS_IOS_CONFIG_STATUS = PRESENT (eas.json development/preview/production; extra.eas.projectId present; production autoIncrement; development ios.simulator=true)
IOS_RUNTIME_COMPATIBILITY = PARTIAL_SAFE_FIXES_APPLIED
IOS_AUTH_QA = EMAIL_PASSWORD_PLUS_RECOVERY_PRESENT; SIGNUP_EMAIL_REDIRECT_FIXED_IN_SOURCE
IOS_DEEP_LINK_READINESS = SCHEME_READY; UNIVERSAL_LINKS_BLOCKED_NO_TEAM_ID_AASA
SIGN_IN_WITH_APPLE_REQUIRED = NO
IOS_PERMISSION_AUDIT = FAIL
APP_STORE_PRIVACY_READINESS = OPERATOR_MAPPING_READY_NOT_DECLARED
IOS_UGC_READINESS = PARTIAL (publish ack added; report/block still missing)
IOS_ACCOUNT_DELETION_READINESS = MOBILE_LINK_PREPARED; WEB_LIVE_404
APP_STORE_METADATA_READINESS = OPERATOR_PACKET_READY_NOT_PUBLISHED
SCREENSHOT_PLAN_READY = YES
IOS_BUILD_READINESS = NO_LOCAL_IOS_TOOLCHAIN_ON_WINDOWS
SHARED_ANDROID_REGRESSION_RISK = LOW (shared additive fixes; Android permissions array unchanged)
SAFE_FIXES_IMPLEMENTED = YES
FILES_CHANGED = SEE_BELOW
TEST_RESULTS = MOBILE_VITEST 371_PASS 1_PREEXISTING_LOCALE_FAIL; FOCUSED_AUTH_UGC 34_PASS; WEB_AASA 2_PASS
TYPECHECK = MOBILE_TSC_PASS
BUILD_CHECK = IOS_NATIVE_BUILD_NOT_RUN (Windows; no Apple creds; no EAS submit)
APPLE_OPERATOR_ACTIONS_REQUIRED = SEE_BELOW
BLOCKERS = SEE_BELOW
IOS_APP_STORE_READY_FOR_BUILD = NO
CENTRAL_ACTION_REQUIRED = YES
NEXT_ACTION_REQUIRED = OPERATOR_APPLE_TEAM_ID_AND_AASA_DEPLOY + LIVE_ACCOUNT_DELETION_PAGE + EAS_APPLE_CREDENTIALS + DEVICE_QA
```

---

## 1. Mobile SoT

| Item | Value |
| --- | --- |
| GitHub | `https://github.com/mohamad054-tech/umtuba-mobile` |
| Local clone (PC2-owned) | `C:\Users\Giga store\Desktop\umtuba\umtuba-mobile` |
| Default branch | `master` only |
| HEAD at fetch | `fe14a34e7d5d10f8fd6fe2f1845e3bd81ffe2f99` |
| Last remote push | 2026-07-27 |
| Worktree at clone | clean, tracking `origin/master` |
| Sibling search | No other `umtuba-mobile` under Desktop/umtuba, D:, E:. P: share down. |
| Prior PC2 Android audits | Native tree was absent on PC2 until this clone from GitHub |

Desktop remains Android/Play primary. This clone is PC2 iOS readiness only. Unpushed Desktop Android WIP (if any) was not present on `origin/master` and was not discarded.

---

## 2. iOS config (as found, not invented)

| Field | Evidence |
| --- | --- |
| App name | `UMTUBA` (`app.config.ts`) |
| Slug / owner | `umtuba-mobile` / `umtuba` |
| Bundle ID | `com.umtuba.app` |
| Version | `1.0.0` |
| iOS buildNumber | `1` |
| Android versionCode | `1` (unchanged) |
| Scheme | `umtuba` |
| Orientation | portrait |
| Tablet | `supportsTablet: true` (iPad screenshots required if this stays) |
| Associated domains | `applinks:umtuba.com`, `applinks:www.umtuba.com` |
| Encryption | `usesNonExemptEncryption: false` |
| Icons / splash | `assets/images/icon.png`, `splash-icon.png` present |
| EAS projectId | `d2593b45-8f18-4c57-9d71-0419193cfd77` (already in repo) |
| Team ID / Service ID / keys | **ABSENT** — not invented |

---

## 3. Safe fixes implemented

### Mobile (`umtuba-mobile`, uncommitted)

1. **Unused media-location / save-library plugin removed** — `expo-media-library` was not imported by app code; `isAccessMediaLocationEnabled: true` would have pulled photo-EXIF location. Create uses `expo-image-picker` only. Android `android.permissions` array left unchanged.
2. **Purpose strings tightened** to current Create / Live-session wording. Added `NSUserNotificationsUsageDescription`. Added `CFBundleDisplayName`.
3. **iOS privacy manifest foundation** — `NSPrivacyTracking: false` + required-reason API categories used by Expo/RN (UserDefaults, file timestamp, boot time, disk space). No invented collected-data claims.
4. **Signup email confirm deep link** — `emailRedirectTo` now `umtuba://auth/callback`. Recovery no longer steals missing-type token links. Email-confirm session exchange added.
5. **Account deletion Settings row** — opens Central web contract `https://umtuba.com/account-deletion`. No new backend.
6. **UGC publish acknowledgment** — Create requires Terms ack before Publish. Links existing `https://umtuba.com/terms`.

### Web (this workspace, uncommitted; Store WIP untouched)

1. AASA builder + `GET /.well-known/apple-app-site-association` — **404 until operator sets real `APPLE_TEAM_ID`**. Bundle ID `com.umtuba.app` only.
2. Proxy matcher excludes `/.well-known/` so Applebot is not session-gated.
3. `.env.example` documents `APPLE_TEAM_ID` (empty).
4. Vitest include for `lib/ios/**/*.test.ts`.

---

## 4. Sign in with Apple

**SIGN_IN_WITH_APPLE_REQUIRED = NO**

Login/signup are email + password only. No Google / Facebook / other third-party social login in mobile or this web login surface. Apple Pay in web Store is **disabled** and is a payment method, not a login. No Sign in with Apple foundation was added (not required; would need Apple Service ID / keys).

If a later wave adds Google/Facebook login, SIWA becomes required.

---

## 5. Permissions (IOS_PERMISSION_AUDIT = FAIL)

| Permission | Declared? | Used in current UI? | Verdict |
| --- | --- | --- | --- |
| Photo library | Yes | Yes — Create video picker | Required; strings updated |
| Notifications | Yes (plugin + new purpose string) | Push bridge present | Required if push ships |
| Camera | Yes (expo-camera plugin) | Live join **not wired** | Unused capability — review risk |
| Microphone | Yes (via camera plugin) | Live join **not wired** | Unused capability — review risk |
| Photo library add / media location | Removed this task | Not used | Cleared |
| Location / tracking / contacts | Not declared | World `view_precise_location` is fail-closed | Do not add |

FAIL because camera/mic remain in Info.plist via `expo-camera` while Live join is “not available yet”. Plugin was kept so Desktop Android / future Live is not stripped. Central may later remove the plugin or wire Live before submission.

---

## 6. App Store privacy mapping (evidence-based)

Declare in App Store Connect from **actual** behavior. Do not copy this as a legal attestation.

| Data type | Collected? | Linked to identity? | Used for tracking? | Evidence |
| --- | --- | --- | --- | --- |
| Email / account | Yes | Yes | No | Email/password auth, profile |
| User ID | Yes | Yes | No | Supabase `auth.users` / profiles |
| User content (video, caption) | Yes | Yes | No | Create → Watch publish |
| Photos/videos (device library) | Yes (user-selected) | Yes when published | No | ImagePicker Create |
| Messages | Yes if user messages | Yes | No | Messages tab |
| Diagnostics / crash-ish logs | Possible console / infra | Uncertain | No | No third-party analytics SDK found |
| Purchases | Not in mobile | — | — | Store Apple Pay **disabled** on web |
| Precise location | No | — | — | World precise location granted=false; media location plugin removed |
| Advertising data | No ATT / no tracker | — | No | `NSPrivacyTracking: false` |
| AI provider transfer | Not evidenced in mobile client | — | — | Do not declare unless a later AI feature ships on iOS |

Privacy policy live: `https://umtuba.com/privacy` (200). Terms live: `https://umtuba.com/terms` (200).

---

## 7. UGC / safety

| Control | Mobile now | Shared vs platform | Handoff |
| --- | --- | --- | --- |
| Create / upload | Yes | Shared | — |
| Terms before publish | **Added this task** | Shared | — |
| Delete own failed/orphan upload | Yes (`deleteOwnedVideoObject`) | Shared | Not the same as delete published Watch post |
| Report objectionable content | **Missing** (Watch has like/save only) | Shared gap | Desktop/Central — do not invent a competing report backend |
| Block users | Settings: “Not available yet” | Shared gap | Same |
| In-app moderation tools | Absent | Shared | Central |
| Safety / contact | Settings → Contact → `https://umtuba.com` | Weak (no `/support` page) | Operator support URL |

**IOS_UGC_READINESS = PARTIAL.** Guideline 1.2 report/block still blocks honest App Store submission.

---

## 8. Account deletion

- Apple 5.1.1(v) needs an in-app deletion path.
- Central/Desktop web contract: `https://umtuba.com/account-deletion`.
- **Live probe this run: 404.**
- Mobile Settings now has **Delete account** opening that URL (shared; also helps Play).
- No competing deletion backend created.
- If Desktop is also editing `app/settings.tsx` for Android, merge carefully — this row is additive.

**IOS_ACCOUNT_DELETION_READINESS = MOBILE_LINK_PREPARED; WEB_LIVE_404.**

---

## 9. App Store metadata (operator packet — do not publish)

| Field | Prepared value / source |
| --- | --- |
| Name | UMTUBA |
| Subtitle candidates | “Watch. Create. Belong.” / “Videos, live, and community” — operator picks; do not claim unshipped features |
| Description | Source from live Terms/Privacy + actual tabs: Watch, Discover, Create, Messages, Live (lobby only), Profile, World, Learning/Store as present |
| Category | Entertainment or Social Networking — operator choice |
| Keywords | operator; do not stuff competitor names |
| Support URL | Prefer a dedicated `/support` (currently 404). Interim: `https://umtuba.com` |
| Privacy | `https://umtuba.com/privacy` |
| Account deletion | `https://umtuba.com/account-deletion` (must be 200 before submit) |
| Marketing | `https://umtuba.com` |
| Age rating | UGC + social + possible mild mature themes — operator questionnaire; do not self-attest 4+ |
| UGC disclosure | Yes — users publish videos/captions |
| Reviewer instructions | Email/password test account required (operator creates). Password recovery uses `umtuba://` scheme. Universal Links will fail until AASA + Team ID. Live join is not available. |
| Reviewer account | Operator must supply a real test account — do not fabricate |

---

## 10. Screenshot plan (PLAN only — no fabricated shots)

`supportsTablet: true` → iPhone **and** iPad required unless Central sets `supportsTablet: false`.

**iPhone (portrait; 6.9" required for current App Store path):**

1. Watch / Home feed
2. Discover
3. Create (picker + Terms ack, no private data)
4. Messages list
5. Profile
6. Optional: Learning / Store / World if those are marketed

**iPad (13" if tablet stays on):** same surfaces, iPad layout.

**Do not capture:** login secrets, other users’ DMs, unpublished drafts, localhost.

Owner: Operator / Desktop device lab after an iOS build exists. PC2 Windows cannot capture iOS screenshots.

---

## 11. Build readiness

| Check | Result |
| --- | --- |
| Expo 57 / RN 0.86 / Expo Router | Present |
| `eas.json` iOS profiles | development (simulator), preview, production |
| Local iOS build on PC2 | **NO** — Windows, no Xcode |
| EAS cloud iOS | Possible later with Expo login + Apple creds — **not run** |
| TypeScript | `tsc --noEmit` **PASS** |
| Vitest | 371 pass; 1 pre-existing `formatWalletAmountExact` locale fail (`١٬٢٣٤` on this machine) — not caused by this task |
| Secrets | `.env.example` public keys only; no service-role |

**IOS_APP_STORE_READY_FOR_BUILD = NO**

---

## 12. Apple / Central operator actions

1. Confirm Apple Team ID and set `APPLE_TEAM_ID` on production web; deploy AASA until `https://umtuba.com/.well-known/apple-app-site-association` is 200 JSON.
2. Add Supabase Auth redirect allowlist: `umtuba://auth/update-password`, `umtuba://auth/callback`, `umtuba://**`, `https://umtuba.com/**`.
3. Ship live `https://umtuba.com/account-deletion` (Desktop/Central web — do not recreate).
4. Decide report/block UGC (shared; Desktop Android overlap).
5. Decide camera/mic: wire Live or remove `expo-camera` plugin before review.
6. EAS Apple credentials / App Store Connect app record (operator).
7. macOS/EAS iOS build → device QA → TestFlight.
8. Fix prod web `/auth/callback` host if still `localhost:3001` (shared PWA/Android/iOS).
9. Optional: `supportsTablet` product decision.
10. Dedicated support URL.

---

## BLOCKERS

```text
APPLE_TEAM_ID_ABSENT
AASA_LIVE_404
ACCOUNT_DELETION_WEB_404
UGC_REPORT_AND_BLOCK_ABSENT
CAMERA_MIC_DECLARED_LIVE_NOT_WIRED
NO_IOS_BUILD_TOOLCHAIN_ON_PC2
NO_APPLE_DISTRIBUTION_CREDENTIALS
PROD_AUTH_CALLBACK_HOST_HISTORICALLY_LOCALHOST
```
