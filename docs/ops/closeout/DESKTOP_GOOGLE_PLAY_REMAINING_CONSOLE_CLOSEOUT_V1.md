# DESKTOP_GOOGLE_PLAY_REMAINING_CONSOLE_CLOSEOUT_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_RELEASE_OPERATOR  
**PRIORITY:** RELEASE_CRITICAL  
**MODE:** EVIDENCE_AUDIT / DOCS_ONLY / NO_CONSOLE_MUTATION / NO_AAB / NO_PRODUCTION_SUBMIT  
**DATE:** 2026-08-13  
**TASK_ID:** DESKTOP_GOOGLE_PLAY_REMAINING_CONSOLE_CLOSEOUT_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**VERSION_CODE:** `3`  
**EAS_BUILD_ID (prior):** `26a60f53-5658-4182-bca4-c0424928b015`  
**MOBILE:** `C:\Users\1\Desktop\umtuba\umtuba-mobile`  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web`

This packet is a **fresh remaining-gates audit**. It does **not** reopen closed items, mutate Play Console, rebuild Android, enable Live, touch Stripe, submit Production, or implement UGC tools.

Official policy cited (fetched this session):

- [User Generated Content](https://support.google.com/googleplay/android-developer/answer/9876937)
- [Account deletion / User data](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Closed testing / production access for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Target audience](https://support.google.com/googleplay/android-developer/answer/9867159)
- [Content ratings](https://support.google.com/googleplay/android-developer/answer/188189)

---

## Verdict

| Field | Result |
|------|--------|
| CURRENT_PLAY_READINESS_PERCENT | **45%** (9 of 20 gates PASS — method below) |
| DATA_SAFETY_COMPLETE | **YES** (operator-given; do not reopen) |
| ACCOUNT_DELETION_COMPLETE | **YES** (web URL live; Play deletion-URL half) |
| IN_APP_ACCOUNT_DELETION | **NO** (v3 Settings has no delete row / no in-app link) |
| APP_ACCESS_COMPLETE | **YES** (operator-given; do not reopen) |
| TARGET_AUDIENCE_COMPLETE | **PARTIAL** (ages selected; App details / Ads / Store presence / Summary unconfirmed) |
| STORE_LISTING_COMPLETE | **NO** |
| CONTENT_RATING_COMPLETE | **NO** |
| ADS_DECLARATION_COMPLETE | **NO** (draft ready: **No ads**) |
| UGC_POLICY_READY | **NO** |
| APP_SIGNING_READY | **OPERATOR_CONFIRMATION_REQUIRED** |
| CLOSED_TESTING_TESTER_LIST_COUNT | **>=17 emails** (operator) / verify |
| CLOSED_TESTING_OPTED_IN_COUNT | **UNKNOWN** |
| CLOSED_TESTING_14_DAY_GATE | **UNKNOWN / NOT_PROVEN_STARTED** |
| PRODUCTION_ACCESS_READY | **NO** |
| NEW_ANDROID_BUILD_REQUIRED | **YES** (future; UGC in-app report + block + terms) |
| NEW_AAB_REQUIRED | **NO** (this wave) |
| ANDROID_PRODUCTION_RELEASE_READY | **NO** |
| PRODUCT_CODE_CHANGED | **NO** |
| GOOGLE_PLAY_MUTATED | **NO** |
| VERDICT | **CONSOLE_DRAFTS_READY / UGC_CODE_BLOCKING / 14_DAY_CLOCK_UNPROVEN** |

**Do not submit or roll out Production.**  
**Do not send anything to Google for review without explicit operator GO.**

---

## PASTE-READY OPERATOR BLOCK (remaining Console-only)

Copy one card at a time. Do **not** repeat Data Safety. Do **not** claim in-app report/block/delete.

### 0 — Highest-priority click (do this first)

```
SCREEN/PATH = Play Console → UMTUBA (com.umtuba.app) → Test and release → Testing → Closed testing → Testers
EXACT OPTION TO SELECT = Read the Opted-in count (not the email-list count)
EXACT TEXT TO PASTE = (none — record the number and the date 12 testers first stayed opted in)
WHY = Emails on the list ≠ opted-in. The 14-day production-access clock starts only after ≥12 testers are opted in continuously. Official rule for personal accounts created after 13 Nov 2023: https://support.google.com/googleplay/android-developer/answer/14151465
SAFE_TO_SAVE_NOW = N/A (read-only). If opted-in < 12: send the Closed testing opt-in link until 12 stay opted in. If account is Organization or pre-2023-11-13 personal, confirm on Publishing overview whether this gate applies — OPERATOR_CONFIRMATION_REQUIRED for account type.
```

### 1 — Account deletion URL (only if that App content card is still incomplete)

```
SCREEN/PATH = Play Console → Policy → App content → Account deletion
  (separate card from Data safety; Data safety is already SAVED — do not reopen Data safety)
EXACT OPTION TO SELECT = App allows account creation = YES
  Users can request deletion = YES via web resource
  In-app deletion in this binary = NO (do not claim in-app delete)
EXACT TEXT TO PASTE = https://umtuba.com/account-deletion
  DO NOT PASTE https://umtuba.com/privacy
  DO NOT PASTE https://umtuba.com
WHY = Live dedicated deletion-request page, HTTP 200 this session. Play User Data requires a functional web deletion resource (13327111). Web URL can fill the Console field without a new AAB.
SAFE_TO_SAVE_NOW = YES (URL paste only). Skip this card if Publishing overview already shows Account deletion complete.
```

### 2 — Ads declaration

```
SCREEN/PATH = Play Console → Policy → App content → Ads
EXACT OPTION TO SELECT = No, my app does not contain ads
EXACT TEXT TO PASTE = (none)
WHY = umtuba-mobile package.json has no AdMob / ads SDK (Data Safety + production-gate audits). v3 does not serve ads.
SAFE_TO_SAVE_NOW = YES
```

### 3 — Target audience remaining steps (ages already selected — do not change ages)

```
SCREEN/PATH = Play Console → Policy → App content → Target audience and content → App details
EXACT OPTION TO SELECT =
  Designed for children / primarily for children under 13 = NO
  Appeals to children (if asked) = NO
  Do not select any under-13 age box
  Do not switch to 18+ only
  Restrict Minor Access = DO NOT ENABLE (requires 18+ only; contradicts Terms)
EXACT TEXT TO PASTE = (none unless a free-text “describe the app” box appears; if it does, paste:)
  UMTUBA is a social video app for people 13 and older. Users watch public videos, publish their own clips, and send 1:1 messages. It is not designed for children under 13.
WHY = Ages 13–15 / 16–17 / 18+ already selected. Remaining cards are App details → Ads → Store presence → Summary (9867159). Product is teen+adult social UGC, not Families.
SAFE_TO_SAVE_NOW = YES for honest NO-children answers.

SCREEN/PATH = same flow → Ads (Families ads / neutral age screen)
EXACT OPTION TO SELECT = App does not serve ads. Families Self-Certified Ads SDK / neutral age screen should not attach if under-13 boxes stay unchecked. If the card still appears: app contains no ads.
EXACT TEXT TO PASTE = (none)
SAFE_TO_SAVE_NOW = YES

SCREEN/PATH = same flow → Store presence
EXACT OPTION TO SELECT = Do NOT apply for Teacher Approved
EXACT TEXT TO PASTE = (none)
WHY = Teacher Approved is for children / mixed children+older. Under-13 is not targeted.
SAFE_TO_SAVE_NOW = YES

SCREEN/PATH = same flow → Summary
EXACT OPTION TO SELECT = Review and Save
EXACT TEXT TO PASTE = (none)
SAFE_TO_SAVE_NOW = YES
```

### 4 — Content rating (IARC)

```
SCREEN/PATH = Play Console → Policy → App content → Content ratings → Start
EXACT OPTION TO SELECT =
  Category = Social Networking (or Social / Communication — pick the social option, not Game, not Utility)
  IARC email = the Play developer-account email you already use (do not invent a new public address)
  Designed first-party content:
    Violence / blood / gore = NO
    Sexual content / nudity as a featured product = NO
    Strong language as featured product = NO
    Drugs / alcohol / tobacco as featured product = NO
    Gambling / simulated gambling / loot boxes = NO
    Horror as featured product = NO
  Interactive elements (answer YES where the binary actually does this):
    Users can interact / communicate with each other = YES (public Watch + 1:1 Messages)
    Users can share videos / text = YES (Create captions + Messages)
    Users can share location = NO (Android v3 does not send GPS)
    Digital purchases / in-app purchases = NO (no Stripe / Play Billing / IAP in v3)
    Unrestricted internet / user-shared media others can see = YES (public Watch UGC)
    Shares user’s personal info with other users = YES (username / public profile on Watch)
  UGC present = YES
  Do not claim in-app moderation tools exist
EXACT TEXT TO PASTE = (IARC is mostly radio buttons; email field = existing Play developer email only)
WHY = All apps need an IARC rating (188189). Social UGC + chat typically yields Teen / Parental Guidance — that is expected. Do not retake the form to force Everyone.
SAFE_TO_SAVE_NOW = YES (honest questionnaire). Submit the calculated ratings. Do not start Production review from this page.
```

### 5 — Store settings / category

```
SCREEN/PATH = Play Console → Grow → Store presence → Store settings
EXACT OPTION TO SELECT =
  App category = Social
  Tags (if shown) = Social; Video Players & Editors only if a second tag is required
EXACT TEXT TO PASTE =
  Website = https://umtuba.com
  Privacy policy = https://umtuba.com/privacy   (already set — do not change)
  Email = the Play developer-account contact email you already use
    Do not invent support@ or a new public mailbox.
    Do not use google-play-review@umtuba.com (reviewer login, not store contact).
  Phone = leave blank unless Console requires it
WHY = Product is social video + messaging. Legal tests forbid inventing a public @umtuba.com support address.
SAFE_TO_SAVE_NOW = YES for category + website. Email only if you paste a mailbox you already control.
```

### 6 — Main store listing (text ready; graphics missing in repo)

```
SCREEN/PATH = Play Console → Grow → Store presence → Main store listing
EXACT OPTION TO SELECT = Default listing / English (United States) or English (UK) — use the locale you already started
EXACT TEXT TO PASTE =

App name:
UMTUBA

Short description (66/80):
Watch, create, and message on UMTUBA. Social video for talent 13+.

Full description:
UMTUBA is a social video app for people 13 and older. Watch short videos from creators, publish your own clips, discover new talent, and send 1:1 messages.

What you can do in this Android release:
• Watch — public creator videos
• Discover — browse trending and latest videos
• Create — upload a video from your gallery with a caption
• Messages — 1:1 text conversations
• Account — sign in with email and password

Live is not available in this Android release.

UMTUBA is not directed at children under 13. If you are under the age of digital consent or majority where you live, use UMTUBA only with a parent or guardian’s permission.

Privacy: https://umtuba.com/privacy
Terms: https://umtuba.com/terms
Delete your account: https://umtuba.com/account-deletion

WHY = Drafted from brand + Android v3 shipped tabs (Watch / Discover / Create / Messages). Does not claim Live, Store, Learning, Games, or AI Companion as Android features. Listing art must not look child-directed (9867159).
SAFE_TO_SAVE_NOW = YES for name + short + full text.
  NO for “listing complete” until icon 512×512, feature graphic 1024×500, and ≥2 phone screenshots are uploaded.
  Icon source exists: umtuba-mobile/assets/images/icon.png (geometric chevron; not child-cartoon).
  Feature graphic: NOT IN REPO.
  Phone screenshots: NOT IN REPO — capture from the Internal Testing device (Watch, Discover, Create, Messages). No youthful cartoon characters.
```

### 7 — User-generated content declaration (honest answers only)

```
SCREEN/PATH = Play Console → Policy → App content → User-generated content
EXACT OPTION TO SELECT =
  App contains UGC = YES
  Publicly accessible UGC (social / Watch) = YES
  1:1 user interaction (Messages) = YES
  In-app report content = NO
  In-app report users = NO
  In-app block users = NO
  Users must accept Terms before create/upload in this Android binary = NO
EXACT TEXT TO PASTE = (none — do not write that report/block exist)
WHY = Play UGC policy (9876937) requires in-app report of content AND users, and in-app block, for public UGC social apps and for 1:1 messaging. Android v3 does not have those controls. A truthful NO is required. A false YES is a policy violation.
SAFE_TO_SAVE_NOW = YES only if the form lets you save honest NO answers.
  NO if saving/completing the card requires claiming report/block exist.
  Do not submit the app for review from this card.
```

### 8 — App signing (confirm only)

```
SCREEN/PATH = Play Console → Test and release → Setup → App signing
EXACT OPTION TO SELECT = Confirm Play App Signing is enrolled for com.umtuba.app (Google-held signing key; existing upload keystore already used for v3 AAB)
EXACT TEXT TO PASTE = (none)
WHY = v3 used existing EAS upload keystore (SIGNING_CREDENTIALS_CHANGED = NO). Play App Signing enrollment itself was never captured locally.
SAFE_TO_SAVE_NOW = N/A (read-only confirm). Do not generate a new upload key.
```

### 9 — Other App content cards if still shown

```
SCREEN/PATH = Play Console → Policy → App content → News / COVID-19 / Government / Financial features / Health
EXACT OPTION TO SELECT =
  News app = NO
  COVID-19 contact tracing / status = NO
  Government app = NO
  Financial features / banking = NO
    (UM Points are internal loyalty units; Android v3 has no payments SDK)
  Health = NO
EXACT TEXT TO PASTE = (none)
WHY = None of these are the Android v3 product.
SAFE_TO_SAVE_NOW = YES
```

### 10 — Do not do

- Do not reopen Data safety.
- Do not upload a new AAB.
- Do not promote Internal → Production.
- Do not click Apply for production until opted-in ≥12 for 14 continuous days **and** UGC in-app tools ship (versionCode 4) **and** you give an explicit GO.
- Do not enable Live.
- Do not touch Stripe / live payments.

---

## 0 — Closed items (do not reopen)

Treated as given + re-verified only where this session could fetch evidence.

| Item | Status | Evidence |
|------|--------|----------|
| Package | `com.umtuba.app` | Prior Android packets + `app.config.ts` |
| Production candidate | versionCode **3** | Internal Testing CORE closeout; EAS `26a60f53` |
| New AAB this wave | **NOT required** | No new Android policy code implemented |
| Internal Testing CORE | **CLOSED / PASS** | `DESKTOP_ANDROID_INTERNAL_TEST_FINAL_CLOSEOUT_V1` |
| Closed Testing email list | **≥17 emails** | Operator-given |
| Target age boxes | **13–15, 16–17, 18+** | Operator-given; prior UGC/audience audit |
| Play reviewer account | **Provisioned + verified** | `google-play-review@umtuba.com` — password not reprinted |
| App access / login details | **Entered** | Operator-given |
| Privacy URL | `https://umtuba.com/privacy` | Operator-given; HTTP 200 this session |
| Public account deletion URL | `https://umtuba.com/account-deletion` | Operator-given HTTP 200; **re-fetched this session — page live** |
| Data Safety | **Completed and SAVED** | Operator-given. Collected=YES, shared=NO, encrypted=YES. Eight types as previously audited. **Do not reopen.** |

---

## 1 — Live URL checks (read-only, this session)

| URL | Result | Notes |
|-----|--------|-------|
| `https://umtuba.com/account-deletion` | **LIVE** (content retrieved; treat as HTTP 200) | Dedicated “Delete your UMTUBA account” page. Sign-in required to submit. Queued request, not immediate delete. |
| `https://umtuba.com/privacy` | **LIVE** (content retrieved; treat as HTTP 200) | Now documents `/account-deletion` as the erasure path. |
| `https://umtuba.com/terms` | **LIVE** (content retrieved; treat as HTTP 200) | Community rules + points users to `/account-deletion`. |

ACCOUNT_DELETION_URL_PUBLICLY_REACHABLE = **YES** (this session).  
Prior closeouts that said PENDING_DEPLOY are **superseded for reachability**. This session did not inspect whether migration `20260872` is applied remotely; the **page** is live. Queued submit still depends on backend/RLS — Play’s URL requirement is a prominent functional deletion-request page, which this is.

Play User Data ([13327111](https://support.google.com/googleplay/android-developer/answer/13327111)):

- Web deletion resource = **SATISFIED** by this URL.
- In-app path **or** in-app link to that URL = **NOT in versionCode 3** (`settings.tsx` Account rows = Edit profile unavailable / Change password / Sign out only).
- Distinction used here:
  - **ACCOUNT_DELETION_COMPLETE** = YES for Play’s **deletion URL**.
  - In-app Settings link remains a **User Data residual**, smallest fix = one Settings row opening the same URL (needs versionCode 4). Not the same as UGC report/block.

---

## 2 — Gate score (CURRENT_PLAY_READINESS_PERCENT)

Method: **9 of 20** named Production-readiness gates are PASS on evidence. Unknown/fail count as not PASS. Do not treat 45% as “almost done.”

| # | Gate | Status |
|---|------|--------|
| 1 | VERSION_CODE_3_CANDIDATE | **PASS** |
| 2 | INTERNAL_TESTING_CORE | **PASS** |
| 3 | PRIVACY_POLICY_URL | **PASS** |
| 4 | DATA_SAFETY_SAVED | **PASS** |
| 5 | APP_ACCESS_ENTERED | **PASS** |
| 6 | TARGET_AGE_BOXES | **PASS** |
| 7 | ACCOUNT_DELETION_WEB_URL | **PASS** |
| 8 | REVIEWER_ACCOUNT | **PASS** |
| 9 | CLOSED_TESTING_EMAIL_LIST | **PASS** (≥17 added) |
| 10 | MAIN_STORE_LISTING | **NO** (text drafted; graphics missing) |
| 11 | STORE_CATEGORY_CONTACT | **NO** |
| 12 | CONTENT_RATING | **NO** |
| 13 | ADS_DECLARATION | **NO** (draft = No ads) |
| 14 | TARGET_AUDIENCE_REMAINING_STEPS | **NO** (OCR) |
| 15 | UGC_POLICY_READY | **FAIL** (code) |
| 16 | APP_SIGNING_CONSOLE | **OCR** |
| 17 | CLOSED_TESTING_OPTED_IN | **OCR** |
| 18 | CLOSED_TESTING_14_DAY | **OCR / not proven started** |
| 19 | PRODUCTION_ACCESS | **NO** |
| 20 | PRODUCTION_TRACK | **NO** |

CURRENT_PLAY_READINESS_PERCENT = **45%** (9/20 PASS).

---

## 3 — UGC policy vs Android v3 (mandatory)

Android v3 **is** a UGC app under Play’s definition: public Watch videos + Create publish + 1:1 Messages. Internal Testing CORE PASS on those surfaces.

Official Play UGC ([9876937](https://support.google.com/googleplay/android-developer/answer/9876937)), quoted in substance:

- Users must **accept terms/user policy before they can create or upload UGC** (cannot be skipped).
- Terms must define/prohibit objectionable content. **PASS** — live Terms “Community rules and prohibited content.”
- **Publicly accessible UGC** (social networking): in-app **report users and content**, and **block users**.
- **1:1 interaction** (direct messaging): in-app **block users**.
- Ongoing moderation / action on reports.

### v3 UI evidence (re-read this session)

| Control | v3 result | Where |
|---------|-----------|--------|
| Terms accept before signup / Create | **FAIL** | `app/(auth)/signup.tsx` — name, username, email, password, optional referral. **No checkbox.** Create publishes without a terms gate (`app/(tabs)/create.tsx`). Settings → Terms is post-login browse only. |
| Report content | **FAIL** | `WatchVideoCard` rail = Like / Save / Comments coming soon / Share coming soon. **No Report.** |
| Report user | **FAIL** | No report control in Watch, Messages, or Settings. |
| Block user | **FAIL** | Settings → Blocked users → *“Blocking is not available in this version.”* Messages: no block. |
| In-app account deletion / link | **FAIL** | Settings Account = Edit profile / Change password / Sign out. |
| Community policy document | **PASS** | `https://umtuba.com/terms` |

**UGC_POLICY_READY = NO**

**Honesty:** For social/public UGC + messaging, Play UGC policy **requires** in-app report **and** block. Web-only account deletion does **not** satisfy UGC. Google **will typically reject** Production (or take down after review) if this binary is submitted without those in-app tools. This is a **real policy blocker**, not a nice-to-have.

NEW_ANDROID_BUILD_REQUIRED = **YES** (future).  
NEW_AAB_REQUIRED = **NO** this wave (not implementing). After implementation, versionCode **4** AAB would be required.

Incidental sexual-content filters / DOB age screen: not a designed mature-content product. No Android mature filter. Not listed as the primary blocker; report/block/terms are.

---

## 4 — Smallest safe UGC implementation PLAN (do not implement this wave)

Scope: Android + minimal backend. No Live. No Stripe. No Families.

### 4.1 Backend (can land on web/Supabase first)

1. `content_reports` — reporter `auth.uid()`, target `post_id` or `message_id`, reason enum, status pending.
2. `user_blocks` — blocker + blocked unique pair; RLS insert/select/delete own rows.
3. Optional `user_reports` if report-user is not folded into `content_reports`.
4. FORCE RLS. No service-role in the client.
5. Operator inbox: SQL view or existing admin surface to act (remove post / suspend). Terms already allow removal.

### 4.2 Android versionCode 4 (same AAB after this ships)

1. **Terms gate (required):** checkbox on `signup.tsx` — “I accept the Terms and Privacy Policy” linking to `https://umtuba.com/terms` and `/privacy`. Join disabled until checked. Mirror a non-skippable checkbox on Create → Publish if a user could reach Create without the signup tick (they cannot if signup is the only create-account path, but Play wording is “before create or upload” — cheapest belt-and-suspenders is Create as well).
2. **Report content:** overflow on `WatchVideoCard` → reason list → insert `content_reports`.
3. **Report user:** same overflow on Watch author + Messages peer.
4. **Block user:** replace Settings “not available” with a working list; Block action on Watch author + Messages peer; filter blocked authors out of Watch/Messages queries.
5. **Delete-account row (User Data residual):** Settings → “Delete account” → `Linking.openURL("https://umtuba.com/account-deletion")`. No new AAB needed for the **web URL**, but this row needs v4.

### 4.3 After code

- Bump versionCode **4** (EAS `autoIncrement` will do this if a production EAS build is run — do not run it until this code exists).
- New AAB **then**. Upload to Closed testing (keep the 14-day clock on the closed track).
- Do **not** rebuild in this closeout.

---

## 5 — Closed testing vs Production access

Official ([14151465](https://support.google.com/googleplay/android-developer/answer/14151465)): **personal developer accounts created after 13 November 2023** must run a **closed** test with **≥12 testers opted-in for the last 14 days continuously**, then **Apply for production** from the Dashboard.

| Layer | Status | Meaning |
|-------|--------|---------|
| Emails added to tester list | **≥17** (operator) | Invitation list only |
| Testers opted in via Play opt-in link | **UNKNOWN** | This is the number that counts |
| 14 continuous days at ≥12 opted-in | **NOT PROVEN** | Clock does **not** start from “emails added” |
| Account type (personal post-2023-11-13 vs org / older personal) | **OPERATOR_CONFIRMATION_REQUIRED** | Publishing overview / account settings. If org or older personal, 12/14 may not apply — still confirm; do not assume exemption. |
| Internal Testing CORE | **CLOSED** | Does **not** count toward the 12/14 closed-test rule |
| Apply for production | **DO NOT** this wave | Even after 14 days, UGC tools are still missing |

Evidence still needed from Console (read-only):

1. Closed testing → Testers → **opted-in** count.
2. Date ≥12 testers first remained opted in (start of 14-day window).
3. Publishing overview: whether Production / Apply for production is disabled and the exact message.
4. Developer account type.

PRODUCTION_ACCESS_READY = **NO**.

---

## 6 — Store listing assets search

Searched `umtuba-web/docs` and `umtuba-mobile` for Play listing packets, feature graphic, and phone screenshots.

| Asset | In repo? |
|-------|----------|
| App name / brand | YES — `UMTUBA` / `lib/site/brand.ts` |
| Short/full Play listing copy | **NO prior packet** — drafted in this closeout |
| Launcher icon | YES — `umtuba-mobile/assets/images/icon.png` (+ android adaptive icons). Geometric chevron, not child-cartoon. |
| Play 512×512 hi-res icon export | Not a separate Play asset packet |
| Feature graphic 1024×500 | **NO** |
| Phone / tablet screenshots | **NO** |
| Promo video | **NO** |

STORE_LISTING_COMPLETE = **NO**. Text can be saved now. Graphics are operator capture/export.

---

## 7 — Remaining blockers

### REMAINING_OPERATOR_ONLY_ACTIONS

See PASTE-READY block items **0–9**. Highest leverage: **opted-in count**, then Ads = No, then IARC, then listing text, then TA remaining steps, then deletion URL if that card is still open.

### REMAINING_CODE_BLOCKERS

1. ANDROID_IN_APP_REPORT_CONTENT_MISSING  
2. ANDROID_IN_APP_REPORT_USER_MISSING  
3. ANDROID_IN_APP_BLOCK_USER_MISSING  
4. ANDROID_NO_MANDATORY_TERMS_ACCEPTANCE_BEFORE_UGC  
5. ANDROID_NO_IN_APP_DELETION_LINK (User Data residual; web URL already live)

### REMAINING_PLAY_BLOCKERS

1. UGC policy non-compliance of v3 (will fail review if submitted now).  
2. Closed testing opted-in ≥12 for 14 continuous days — unproven; required for new personal accounts.  
3. Production access not granted.  
4. Main store listing graphics missing.  
5. Content rating not evidenced complete.  
6. Ads declaration not evidenced complete.  
7. Target audience remaining steps not evidenced complete.  
8. App signing enrollment not evidenced.  
9. Production track not created / not to be created this wave.

---

## 8 — NEXT_SINGLE_OPERATOR_ACTION

Open **Play Console → Test and release → Testing → Closed testing → Testers** and write down the **opted-in** count (not the email list). If it is under 12, send the opt-in link until 12 people stay opted in. That is the only remaining Console action that starts a calendar clock this machine cannot start for you.

Then STOP. Do not start another wave. Do not implement UGC in this GO. Do not submit Production.

---

## 9 — Constraints honored

- No Play Console write / submit / rollout  
- No new AAB / versionCode 4 / EAS build  
- No Live enable / Stripe / production deploy  
- No Android product code  
- No secrets / reviewer password  
- No Windows Desktop writes / `_port_extract` untouched  
- Closed Data Safety / App access / Internal Testing CORE / target ages not reopened  
- Docs only; no commit requested  

PRODUCT_CODE_CHANGED = NO  
GOOGLE_PLAY_MUTATED = NO  
NEW_AAB_REQUIRED = NO  
FILES_CHANGED = this closeout + `docs/ai/CURRENT_TASK.md`, `PROJECT_STATE.md`, `SESSION_HANDOFF.md`, `CURSOR_REPORT.md`
