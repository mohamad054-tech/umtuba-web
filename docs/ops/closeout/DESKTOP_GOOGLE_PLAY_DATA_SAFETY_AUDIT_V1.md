# DESKTOP_GOOGLE_PLAY_DATA_SAFETY_AUDIT_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_RELEASE_OPERATOR  
**PRIORITY:** RELEASE_CRITICAL  
**MODE:** AUDIT_ONLY / EVIDENCE_BASED / NO_CONSOLE_MUTATION  
**DATE:** 2026-08-13  
**TASK_ID:** DESKTOP_GOOGLE_PLAY_DATA_SAFETY_AUDIT_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**VERSION_CODE:** `3`  
**TRACK (context):** CLOSED_TESTING_ALPHA_IN_PREPARATION  
**MOBILE:** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `fe14a34e7d5d10f8fd6fe2f1845e3bd81ffe2f99`  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1` @ `7ed9159f62d6a82d1999b19ef9d1df9a63c09de9`

This packet is an **audit only**. It produces an evidence-backed Google Play **Data safety** declaration for Android **versionCode 3**. It does **not** mutate Play Console, rebuild, bump versionCode, upload an AAB, change policies, mutate product code, create accounts, or invent an account-deletion URL.

No secrets. Reviewer / Store QA passwords are not in this file.

Official definitions used: [Play Data safety form for developers](https://support.google.com/googleplay/android-developer/answer/10787469) and [user-facing Data safety help](https://support.google.com/googleplay/answer/11416267).

- **Collected** = transmitted off the device (including to UMTUBA servers / service providers).
- **Shared** = transferred to a third party that is **not** a service provider processing on UMTUBA’s behalf, and **not** a user-initiated transfer the user reasonably expects (for example sending a DM or publishing a public video).
- **Ephemeral** = processed only in memory and not stored longer than needed to service a real-time request.
- User-generated content **is collected** if it is uploaded/stored.
- Permission present in the manifest **is not** collection unless the data is transmitted.

---

## Verdict

| Field | Result |
|------|--------|
| DATA_COLLECTED_OR_SHARED | **YES** (collected; not Play-“shared”) |
| DATA_ENCRYPTED_IN_TRANSIT | **YES** |
| INDEPENDENT_SECURITY_REVIEW | **NO** |
| ACCOUNT_CREATION_SUPPORTED | **YES** |
| ACCOUNT_CREATION_METHODS | Email address and password; Username |
| IN_APP_ACCOUNT_DELETION | **NO** |
| WEB_ACCOUNT_DELETION_AVAILABLE | **NO** |
| ACCOUNT_DELETION_URL | **NONE** |
| ACCOUNT_DELETION_URL_PUBLICLY_REACHABLE | **NO** |
| ACCOUNT_DELETION_PLAY_BLOCKER | **YES** |
| DATA_SAFETY_OPERATOR_ENTRY_READY | **NO** |
| DATA_SAFETY_FORM_CAN_BE_TRUTHFULLY_COMPLETED | **NO** (deletion-request URL cannot be filled; data-type matrix itself is complete) |
| DATA_SAFETY_RELEASE_BLOCKING | **YES** |
| ACCOUNT_DELETION_RELEASE_BLOCKING | **YES** |
| UGC_RELEASE_BLOCKING | **YES** (separate product policy; prior Target audience / UGC audit) |
| NEW_AAB_REQUIRED_FOR_DATA_SAFETY | **NO** |
| PRODUCT_CODE_CHANGED | **NO** |
| GOOGLE_PLAY_MUTATED | **NO** |
| VERDICT | **DATA_TYPE_MATRIX_READY / ACCOUNT_DELETION_URL_BLOCKING / UGC_STILL_BLOCKING** |

**Do not** paste `https://umtuba.com/privacy` or `https://umtuba.com` into the deletion-request URL field. Those pages are not account-deletion resources. Live checks: `/account/delete`, `/delete-account`, `/delete`, `/contact` all **404**.

---

## 0 — Repository state (pre-edit)

`git fetch --prune` on both repos. Already even with upstream. No merge / rebase / reset / stash / force.

### umtuba-web

- Branch: `office/profile-hero-completeness-v1` @ `7ed9159f62d6a82d1999b19ef9d1df9a63c09de9` = `origin/office/profile-hero-completeness-v1` (**0 ahead / 0 behind**)
- Dirty before this task: `docs/ai/*` from prior Android / SSH work + untracked `docs/ops/closeout/` and `worktrees/`
- This task: docs only

### umtuba-mobile

- Branch: `master` @ `fe14a34e7d5d10f8fd6fe2f1845e3bd81ffe2f99` = `origin/master` (**0 ahead / 0 behind**)
- Uncommitted (prior runtime-config rebuild; **kept, not modified this task**): `app.config.ts`, `eas.json`, untracked `release-artifacts/`
- PRODUCT_CODE_CHANGED = NO

Concurrent streams preserved: SSH/AUTH_ENV closeout, Play reviewer provision, Android WIP, prior UGC / production-gate / Internal Testing packets.

---

## Authoritative prior closeouts (weaker than primary v3 code + live privacy)

| Packet | Use here |
|--------|----------|
| `DESKTOP_GOOGLE_PLAY_TARGET_AUDIENCE_UGC_POLICY_AUDIT_V1` | UGC gaps: no in-app report, no block, no Android terms-before-publish, no in-app account deletion. Ages 13–15 / 16–17 / 18+ already declared. |
| `DESKTOP_ANDROID_PRODUCTION_RELEASE_GATE_AUDIT_V1` | Manifest may merge location + `SYSTEM_ALERT_WINDOW`; no Sentry/Crashlytics; Live out of production scope. Data safety was OPERATOR_CONFIRMATION_REQUIRED. |
| `DESKTOP_ANDROID_INTERNAL_TEST_FINAL_CLOSEOUT_V1` | Watch / Discover / Messages / Create + real upload PASS on versionCode 3. Live INTENTIONALLY_UNAVAILABLE. |
| `DESKTOP_ANDROID_POST_INSTALL_QA_AND_LIVE_CREATE_GATE_V1` | Live fail-closed; Create contract. |

ANDROID_INTERNAL_TEST_CORE = CLOSED/PASS (given). VERSION_CODE_3_PRODUCTION_CANDIDATE = YES. NEW_AAB_REQUIRED = NO for this declaration.

---

## Phase 1 — Android v3 data-flow inventory

Shipped tabs (`app/(tabs)/_layout.tsx`): **Watch, Discover, Create, Live, Messages**. Extra routes: World, Rewards, Profile, Settings, Notifications. Auth required for tabs (`Redirect` to login if no session).

Store checkout, Learning, Games, Stripe, and LiveKit **are not exposed as working Android v3 product flows**. Live lobby `isLiveLobbySourceConfigured()` = **false**; no LiveKit connect. Economy/payment adapters are contract-only (`src/lib/economy`).

### 1.1 Dependencies (`package.json`)

Direct runtime: Expo SDK 57, React Native 0.86, `@supabase/supabase-js`, `expo-camera`, `expo-image-picker`, `expo-media-library`, `expo-notifications`, `expo-video`, `expo-secure-store`, `expo-device`, `expo-web-browser`, `@maplibre/maplibre-react-native`, AsyncStorage, zod.

**Not present:** Sentry, Crashlytics, Firebase Analytics, Amplitude, Mixpanel, PostHog, Segment, AdMob, Stripe, LiveKit client SDK, Google/Apple Sign-In.

`package-lock.json` has no `@sentry`, `firebase`, `crashlytics`, `amplitude`, `mixpanel`, `posthog`, or `@react-native-firebase` app dependencies. Prior production-gate AAB string scan noted Firebase **messaging** init from `expo-notifications` (FCM path for Android push) — not an analytics SDK.

### 1.2 Config / permissions (`app.config.ts`)

Declared Android permissions: `CAMERA`, `RECORD_AUDIO`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `POST_NOTIFICATIONS`.

Plugins: `expo-camera` (`recordAudioAndroid: true`), `expo-image-picker`, `expo-media-library` (`isAccessMediaLocationEnabled: true`), `expo-notifications`, `expo-secure-store`, `expo-video`, `@maplibre/maplibre-react-native`.

Prior AAB merge (production-gate audit; this task did not unzip a new AAB): also `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_MEDIA_LOCATION`, `SYSTEM_ALERT_WINDOW`, biometric, FCM-related. **Permission ≠ collected.**

### 1.3 What v3 actually transmits

| Flow | Off-device? | Notes |
|------|-------------|--------|
| Signup | YES | Email, password, full name, username, optional referral → `supabase.auth.signUp` (`AuthContext.tsx`) |
| Login / password reset / change password | YES | Email + password / new password → Supabase Auth |
| Session | YES | Auth tokens to Supabase over HTTPS; stored in SecureStore |
| Profile read | YES | Reads `profiles` (may include city/country/bio/avatar set on **web**). Android **cannot edit profile** (`settings.tsx` “Not available yet”). Android v3 does **not** send city/country/GPS. |
| Watch feed | YES | Reads posts + signed video URLs from Supabase Storage |
| Like / save | YES | `toggle_post_like` / `toggle_post_save` RPCs (`watch.tsx` → `social/interactions.ts`) |
| View / share counters | **NO in v3 UI** | `recordPostView` / `recordPostShare` exist but are **not called** from Watch. Comments and Share buttons are **disabled** (“coming soon”). |
| Discover | YES | Loads cards from Supabase; search is **local** `filterDiscoverCards` (query not uploaded) |
| Create | YES | Gallery video + caption + media metadata (duration/width/height/mime/size) uploaded to Storage + `posts` insert |
| Messages | YES | Text body inserted into `messages`; list/read/typing RPCs |
| Push | YES if permission granted | Expo push token + `Device.modelId` / `osInternalBuildId` upserted to `push_tokens` |
| Live | NO | Fail-closed; no LiveKit transmission |
| World domain data | NO (foundation unconfigured) | `isWorldFoundationConfigured()` = false |
| World map tiles | **YES if user opens `/world`** | Runtime still binds MapLibre to `https://tiles.openfreemap.org/styles/liberty`. Default camera is lat 20 / lon 0 / zoom 1.8 — **not device GPS**. Tile requests are map imagery, not user location. |
| Rewards | YES (read) | Reads `um_point_balances` / tier progress — internal loyalty units, not Play “financial info” |
| Camera / mic capture | NO | `requestCameraPermission` / `requestMicrophonePermission` defined in `permissions/foundation.ts` and **never called** from screens. Create uses `ImagePicker.launchImageLibraryAsync` videos only. |
| Photos | NO | No photo/avatar upload on Android v3 |
| Analytics / crash SDKs | NO | `console.warn` only; no crash reporter |
| Ads / advertising ID | NO | No ads SDK |
| Payments | NO | No Stripe/PayPal/Google Pay in mobile v3 |

Supabase client (`src/lib/supabase/client.ts`) uses the **publishable** key only; service-role rejected by `getEnv()`.

Encryption in transit: `getEnv()` requires a valid `EXPO_PUBLIC_SUPABASE_URL`; production EAS v3 loaded that public URL (rebuild closeout). Supabase API is HTTPS/TLS. iOS `usesNonExemptEncryption: false` (standard HTTPS). World tile URLs are `https://`.

---

## Phase 2 — Google Play data-type matrix (versionCode 3)

Play names from [10787469](https://support.google.com/googleplay/android-developer/answer/10787469).

For every YES: evidence path. For every NO: brief reason.

### Location

| DATA_TYPE | COLLECTED | SHARED | EPHEMERAL | REQUIRED_OR_OPTIONAL | PURPOSES | Evidence / reason |
|-----------|-----------|--------|-----------|----------------------|----------|-------------------|
| Approximate location | **NO** | NO | NA | NA | — | No GPS API. Android signup does not collect city/country. `recordPostView` geo args unused. World tiles use a default world camera, not device location. Manifest location (MapLibre merge) ≠ collection. Privacy *mentions* IP “basic localization” for the **Service**; Android v3 has **no** evidenced IP-geolocation write path. Do not declare on a privacy sentence alone. |
| Precise location | **NO** | NO | NA | NA | — | `view_precise_location` defaults `granted: false`. No `ACCESS_FINE` usage in product code. Media-library EXIF flag is plugin config; picker does not read or upload GPS EXIF. |

### Personal info

| DATA_TYPE | COLLECTED | SHARED | EPHEMERAL | REQUIRED_OR_OPTIONAL | PURPOSES | Evidence / reason |
|-----------|-----------|--------|-----------|----------------------|----------|-------------------|
| Name | **YES** | **NO** | **NO** | **REQUIRED** | APP_FUNCTIONALITY, ACCOUNT_MANAGEMENT | Signup `fullName` → `user_metadata.full_name` / `display_name` (`signup.tsx`, `AuthContext.tsx`). Tabs require an account. |
| Email address | **YES** | **NO** | **NO** | **REQUIRED** | APP_FUNCTIONALITY, ACCOUNT_MANAGEMENT, FRAUD_PREVENTION_SECURITY_COMPLIANCE | Signup/login/forgot-password email → Supabase Auth. |
| User IDs | **YES** | **NO** | **NO** | **REQUIRED** | APP_FUNCTIONALITY, ACCOUNT_MANAGEMENT | Auth user UUID + required username (`signUp` metadata; profile `id` / `username`). |
| Address | **NO** | NO | NA | NA | — | Android cannot edit city/country. Not sent from Android signup. |
| Phone number | **NO** | NO | NA | NA | — | No phone field. |
| Race and ethnicity | **NO** | NO | NA | NA | — | Not collected. |
| Political or religious beliefs | **NO** | NO | NA | NA | — | Not collected. |
| Sexual orientation | **NO** | NO | NA | NA | — | Not collected. |
| Other info | **NO** | NO | NA | NA | — | No DOB/gender. Optional referral code is not Play “other personal info.” |

**Shared = NO** for name/email/user IDs: Supabase is a **service provider**. Public username/display name on Watch is a user-initiated publish the user reasonably expects — Play sharing exception.

### Financial info

All **NO**. UM Points are internal loyalty units (Terms/privacy). No payment SDK, no purchase history, no credit score. Rewards screen only **reads** point balance.

### Health and fitness

All **NO**. Not used.

### Messages

| DATA_TYPE | COLLECTED | SHARED | EPHEMERAL | REQUIRED_OR_OPTIONAL | PURPOSES | Evidence / reason |
|-----------|-----------|--------|-----------|----------------------|----------|-------------------|
| Emails | **NO** | NO | NA | NA | — | Auth emails are credentials/account, not the “Emails” message type (subject/sender/body of user email). |
| SMS or MMS | **NO** | NO | NA | NA | — | Not used. |
| Other in-app messages | **YES** | **NO** | **NO** | **OPTIONAL** | APP_FUNCTIONALITY | `sendTextMessage` inserts `messages.body` (`src/lib/messenger/api.ts`). User can use Watch without opening Messages. Other users receive DMs they expect — not Play “shared.” |

### Photos and videos

| DATA_TYPE | COLLECTED | SHARED | EPHEMERAL | REQUIRED_OR_OPTIONAL | PURPOSES | Evidence / reason |
|-----------|-----------|--------|-----------|----------------------|----------|-------------------|
| Photos | **NO** | NO | NA | NA | — | Create is video-only. Avatar edit unavailable. `image_url` inserted null. |
| Videos | **YES** | **NO** | **NO** | **OPTIONAL** | APP_FUNCTIONALITY | `uploadPostVideo` + `publishVideoPost` → Storage + `posts`. Public Watch is user-initiated expected publish — not Play “shared.” |

Do **not** also select Audio solely because videos contain sound. v3 does not collect standalone recordings.

### Audio files / Files and docs / Calendar / Contacts

All **NO**. Video files are declared under Videos, not Files and docs. No contacts/calendar APIs.

### App activity

| DATA_TYPE | COLLECTED | SHARED | EPHEMERAL | REQUIRED_OR_OPTIONAL | PURPOSES | Evidence / reason |
|-----------|-----------|--------|-----------|----------------------|----------|-------------------|
| App interactions | **NO** | NO | NA | NA | — | No analytics SDK. View recording helper unused. Feed fetch is content delivery, not interaction logging. |
| In-app search history | **NO** | NO | NA | NA | — | Discover/World search is local filter; query not uploaded. |
| Installed apps | **NO** | NO | NA | NA | — | Not collected. |
| Other user-generated content | **YES** | **NO** | **NO** | **OPTIONAL** | APP_FUNCTIONALITY | Video **captions** / hashtags stored on `posts.content`. Bios not writable on Android v3 — do not declare bios as Android-collected. |
| Other actions | **YES** | **NO** | **NO** | **OPTIONAL** | APP_FUNCTIONALITY | Likes and saves (`toggle_post_like` / `toggle_post_save`). Play’s example for this type includes likes. |

### Web browsing

**NO.** Support links open `https://umtuba.com/*` in the system browser; the app does not collect browsing history.

### App info and performance

All **NO**. No crash/diagnostics SDK. `expo-router` `ErrorBoundary` is on-device.

### Device or other IDs

| DATA_TYPE | COLLECTED | SHARED | EPHEMERAL | REQUIRED_OR_OPTIONAL | PURPOSES | Evidence / reason |
|-----------|-----------|--------|-----------|----------------------|----------|-------------------|
| Device or other IDs | **YES** | **NO** | **NO** | **OPTIONAL** | APP_FUNCTIONALITY | After notification permission, `getExpoPushTokenAsync` + upsert `token` and `device_id` (`Device.modelId` \|\| `osInternalBuildId`) to `push_tokens` (`src/lib/push/service.ts`). FCM is used as Expo’s Android push transport (service provider). User can deny notifications. No advertising ID SDK. |

---

## Phase 3 — Third-party / SDK audit

| SDK_OR_SERVICE | DATA | ROLE | PLAY_SHARED_CLASSIFICATION | EVIDENCE |
|----------------|------|------|----------------------------|----------|
| Supabase Auth / DB / Storage | Account, profile, posts, videos, messages, likes/saves, push token rows | SERVICE_PROVIDER | **NO** | Only backend; privacy lists Supabase as a processor. Publishable key only. |
| Expo (push token service) | Expo push token | SERVICE_PROVIDER | **NO** | `Notifications.getExpoPushTokenAsync({ projectId })` |
| Firebase Cloud Messaging (via expo-notifications) | Push delivery identifiers | SERVICE_PROVIDER | **NO** | No Firebase Analytics dependency; used to deliver app notifications |
| OpenFreeMap / OpenMapTiles / OSM (if user opens World) | Map style/tile HTTP (viewport), not device GPS | SERVICE_PROVIDER | **NO** | `streetMapSource.ts` `https://tiles.openfreemap.org/styles/liberty` |
| Esri ArcGIS tile servers (only if user switches World satellite/terrain) | Map tiles | SERVICE_PROVIDER | **NO** | `satelliteMapSource.ts` / `terrainMapSource.ts` |
| MapLibre demo tiles | Demo style URL (fallback) | SERVICE_PROVIDER | **NO** | `demoMapSource.ts` |
| LiveKit | — | N/A in v3 | **NO** | Env optional; lobby not configured; no client SDK; **do not declare** |
| Expo Camera / ImagePicker / MediaLibrary / SecureStore / Device / Video | On-device permissions/media/session | On-device / OS | **NO** | Collection only when Create/push actually uploads (covered above) |
| Sentry / Crashlytics / AdMob / Stripe / Google-Apple Sign-In | — | NOT SHIPPED | **NO** | Absent from `package.json` |

User-published Watch videos and DMs: **not** Play “shared” (user-initiated, reasonably expected).

---

## Phase 4 — Security questions

| Play question | Answer | Evidence |
|---------------|--------|----------|
| Does the app collect or share required user data types? | **YES** | Account + UGC + messages + device IDs as above |
| Is all collected user data encrypted in transit? | **YES** | HTTPS/TLS to Supabase; HTTPS map tiles |
| Independent security review (SOC / ISO-style of this app)? | **NO** | No evidenced review in mobile/web legal or ops packets. Default NO. |
| Account creation methods (v3 only) | **Email address and password**; **Username** | `login.tsx` / `signup.tsx`. No Google, Apple, phone, or OAuth. |
| Users can request that their data is deleted? (Play Data safety wording) | **NO** as a product/URL path | See Phase 5. Privacy describes contact rights; `/contact` is 404; homepage is not a deletion form. |

---

## Phase 5 — Account deletion

| Field | Result |
|-------|--------|
| ACCOUNT_CREATION_SUPPORTED | **YES** |
| IN_APP_ACCOUNT_DELETION | **NO** — Settings Account rows: Edit profile (unavailable), Change password, Sign out. No delete row (`app/settings.tsx`). |
| WEB_ACCOUNT_DELETION_AVAILABLE | **NO** — Web settings account section is “Saved, rewards, and sign out”; no delete-account UI. No `deleteUser` / `delete_account` API in `umtuba-web/lib`. |
| ACCOUNT_DELETION_URL | **NONE** |
| ACCOUNT_DELETION_URL_PUBLICLY_REACHABLE | **NO** |
| DELETE_ACCOUNT_AND_ASSOCIATED_DATA | **NO** — no deletion implementation to audit |
| USER_CAN_REQUEST_PARTIAL_DATA_DELETION | **NO** — no self-serve partial-delete UI. Privacy claims rights requests via “contact method provided on UMTUBA”; Android Contact opens `https://umtuba.com`; `/contact` **404**. That is not a Play deletion pathway. |
| ACCOUNT_DELETION_PLAY_BLOCKER | **YES** |

READ-ONLY URL checks (2026-08-13):

| URL | Result |
|-----|--------|
| `https://umtuba.com/privacy` | **200** — privacy policy (matches `lib/legal/legalDocuments.ts`) |
| `https://umtuba.com/account/delete` | **404** |
| `https://umtuba.com/delete-account` | **404** |
| `https://umtuba.com/delete` | **404** |
| `https://umtuba.com/contact` | **404** |
| `https://umtuba.com/settings` | Login wall; not a deletion page |

Terms: *“Where account deletion is available…”* — documents possible absence. Privacy retention: delete *where supported*; rights via contact.

Play User Data ([13327111](https://support.google.com/googleplay/android-developer/answer/13327111)): apps that allow in-app account creation must provide an **in-app** deletion path (or in-app link to a prominent web resource) **and** a **web** deletion resource. Homepage + vague contact line do not qualify.

### Smallest compliant implementation (DO NOT implement in this task)

1. **Public web page** at a dedicated URL (example shape only — **do not invent as live**): authenticated or identity-verified **account deletion request**, prominently titled, that starts deletion of the account and associated personal data, with documented legal/security retention exceptions.
2. **In-app Settings row** “Delete account” that performs deletion or opens that same URL (`Linking.openURL`).
3. **Backend** that actually deletes Auth user + associated rows/storage (no `deleteUser` path exists today).
4. Then, and only then, paste the **live** URL into Play Console.

A web page **alone** can fill the Console URL field without a new AAB. An in-app control requires a **new AAB**. This Data safety audit does **not** require versionCode 4.

---

## Phase 6 — Privacy policy consistency

Live `https://umtuba.com/privacy` matches `PRIVACY_SECTIONS` (last updated 19 July 2026).

**PRIVACY_POLICY_DATA_SAFETY_CONSISTENT = NO**

Covered for Android v3 collection: account/email, name/username, UGC videos/captions, messages, service providers (Supabase), retention, teens, IP/security logs at Service level.

Discrepancies:

1. Policy describes **LiveKit** live media; Android v3 does not transmit to LiveKit.
2. Policy describes **approximate location / nearby**; Android v3 does not collect location.
3. Policy lists **images, comments, stories, store/seller** data; Android v3 does not collect those.
4. Policy does **not** name Expo **push tokens** / `device_id` that Android v3 **does** collect when notifications are granted.
5. Policy deletion is contact-based; **no** dedicated deletion URL; `/contact` 404.
6. Policy mentions diagnostics/performance; Android v3 has no crash/analytics SDK.

Broader-than-app policy text is not a license to declare LiveKit/location/photos in Data safety. Missing push/device-ID language is the under-disclosure vs v3.

---

## Phase 7 — Exact Play Console entry guide

Operator is on **App content → Data safety → Step 2: Security and data collection**. Do not continue until the deletion-URL question is resolved honestly.

### STEP_2_SECURITY_AND_COLLECTION

```
collects_or_shares: YES
encrypted_in_transit: YES
independent_security_review: NO
account_creation_methods:
  - Email address and password
  - Username
  (do not select Google, Apple, phone, or other OAuth)
account_deletion_answer: Do NOT claim in-app deletion. Do NOT claim a web deletion URL.
account_deletion_url: NONE — leave empty; do not paste privacy or homepage
```

If Console **requires** a URL to proceed: **stop**. That field is the form blocker. Do not fabricate.

### STEP_3_DATA_TYPES_TO_SELECT

Select **only**:

1. Personal info → **Name**
2. Personal info → **Email address**
3. Personal info → **User IDs**
4. Messages → **Other in-app messages**
5. Photos and videos → **Videos**
6. App activity → **Other user-generated content**
7. App activity → **Other actions**
8. Device or other IDs → **Device or other IDs**

### Per selected type

| DATA_TYPE | COLLECTED | SHARED | EPHEMERAL | REQUIRED_OR_OPTIONAL | PURPOSES |
|-----------|-----------|--------|-----------|----------------------|----------|
| Name | YES | NO | NO | REQUIRED | App functionality; Account management |
| Email address | YES | NO | NO | REQUIRED | App functionality; Account management; Fraud prevention, security, and compliance |
| User IDs | YES | NO | NO | REQUIRED | App functionality; Account management |
| Other in-app messages | YES | NO | NO | OPTIONAL | App functionality |
| Videos | YES | NO | NO | OPTIONAL | App functionality |
| Other user-generated content | YES | NO | NO | OPTIONAL | App functionality |
| Other actions | YES | NO | NO | OPTIONAL | App functionality |
| Device or other IDs | YES | NO | NO | OPTIONAL | App functionality |

Play “required” = user cannot use the app’s primary features without providing it. v3 **requires sign-in**, so name/email/user IDs are required. Videos/messages/likes/push are optional.

### DATA_TYPES_DO_NOT_SELECT

Approximate location; Precise location; Address; Phone number; Race and ethnicity; Political or religious beliefs; Sexual orientation; Other info; User payment info; Purchase history; Credit score; Other financial info; Health info; Fitness info; Emails (message type); SMS or MMS; Photos; Voice or sound recordings; Music files; Other audio files; Files and docs; Calendar events; Contacts; App interactions; In-app search history; Installed apps; Web browsing history; Crash logs; Diagnostics; Other app performance data.

### STEP_4_DATA_USAGE_READY

**YES** — answers above are complete for the eight selected types.

### STEP_5_REVIEW_READY

**NO** — Step 2 deletion URL / account-deletion disclosure cannot be completed in a Play-compliant way.

### DATA_SAFETY_OPERATOR_ENTRY_READY

**NO** — blocking field: **account deletion-request URL** (and any Console control that requires claiming in-app or web deletion).

Data-type checkboxes may be filled from this packet as a **draft**. Do not **submit** Data safety as complete while claiming a deletion URL that does not exist.

---

## Phase 8 — Release blocker decision

| Class | Items |
|-------|--------|
| DATA_SAFETY_FORM_BLOCKERS | Account deletion-request URL absent. Cannot truthfully complete that Step 2 field. Independent security review = NO is answerable (select No). |
| ANDROID_PRODUCT_POLICY_BLOCKERS | No in-app report content; no in-app block user; no terms acceptance before Android publishing; no in-app account deletion (UGC + User Data). Unchanged from Target audience / UGC audit. |

| Decision | Value |
|----------|--------|
| DATA_SAFETY_FORM_CAN_BE_TRUTHFULLY_COMPLETED | **NO** |
| DATA_SAFETY_RELEASE_BLOCKING | **YES** |
| ACCOUNT_DELETION_RELEASE_BLOCKING | **YES** |
| UGC_RELEASE_BLOCKING | **YES** |
| NEW_AAB_REQUIRED_FOR_DATA_SAFETY | **NO** |

A dedicated **web** deletion page can unblock the Console URL without a new AAB. In-app deletion / report / block / terms checkbox **would** need a new AAB later. Do not build versionCode 4 in this task.

---

## Operator do / do not

**Do**

- Select the eight data types and per-type answers in this packet.
- Answer encrypted in transit = YES.
- Answer independent security review = NO.
- Keep username/password + email/password as creation methods.
- Leave deletion URL empty until a real page exists.

**Do not**

- Select location, photos, audio, financial, ads, crash logs, or LiveKit.
- Mark Supabase/Expo/FCM as Play “shared.”
- Paste privacy or homepage as a deletion URL.
- Claim in-app deletion, report, or block.
- Rebuild or bump versionCode for this form.

---

## Files / mutation

PRODUCT_CODE_CHANGED = NO  
GOOGLE_PLAY_MUTATED = NO  
FILES_CHANGED = this closeout + `docs/ai/CURRENT_TASK.md`, `PROJECT_STATE.md`, `SESSION_HANDOFF.md`, `CURSOR_REPORT.md`
