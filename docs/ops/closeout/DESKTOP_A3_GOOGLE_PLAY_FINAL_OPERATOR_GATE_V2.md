# DESKTOP_A3_GOOGLE_PLAY_FINAL_OPERATOR_GATE_V2

**DEVICE:** DESKTOP-A3  
**DEVICE_ROLE:** GOOGLE_PLAY_FINAL_OPERATOR_GATE  
**WAVE_ID:** DESKTOP_ANDROID_V5_FINAL_RELEASE_PREPARATION_V1  
**MODE:** EVIDENCE_ONLY / NO_CONSOLE_WRITE / NO_V4_UPLOAD / NO_V5_UPLOAD / NO_AAB_BUILD  
**DATE:** 2026-08-14  
**TASK_ID:** DESKTOP_A3_GOOGLE_PLAY_FINAL_OPERATOR_GATE_V2  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**PLAY_BINARY_ON_STORE:** versionCode **3** (Internal Testing CORE published). versionCode **4** AAB exists locally and is **not** the final candidate. versionCode **5** is **not** built.  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web`  
**MOBILE (read-only; A1 owns product files):** `C:\Users\1\Desktop\umtuba\umtuba-mobile`

Close every Google Play item that does **not** depend on an unverified v5 upload. Use the existing Closed Testing list. Do not print tester emails or passwords.

Play Console was **not** writable from this session (browser tabs empty; no operator OCR). No Console field was saved here. Remaining cards below are paste-ready only. Do not treat paste-ready as saved.

No secrets. Tester addresses are not reproduced. Reviewer password is not printed. Mobile product files were not edited. No AAB was built.

---

## DESKTOP-A3 REPORT

```
DESKTOP-A3 REPORT
TASK_ID = DESKTOP_A3_GOOGLE_PLAY_FINAL_OPERATOR_GATE_V2
TESTER_LIST_COUNT = OPERATOR_STATED_FLOOR_>=17 (2026-08-13) / APPROX_25_UNVERIFIED (2026-08-14 A2). LOCAL_LIST_FILE = NONE. UNIQUE_COUNT = UNKNOWN.
OPTED_IN_COUNT = UNKNOWN
CLOSED_TESTING_ACTIVE = IN_PREPARATION / NOT_OCR_THIS_SESSION
CLOSED_TEST_START_DATE = UNKNOWN / NOT_PROVEN
ELAPSED_DAYS = UNKNOWN / NOT_PROVEN_STARTED
APP_ACCESS = COMPLETE (do not reopen)
DATA_SAFETY = COMPLETE / SAVED (do not reopen)
TARGET_AUDIENCE = AGES_COMPLETE (13–15 / 16–17 / 18+). Remaining App details / Ads / Store presence / Summary = UNCONFIRMED / PASTE_READY
ACCOUNT_DELETION = URL_LIVE HTTP_200 this session (https://umtuba.com/account-deletion). PLAY_URL_HALF = YES_OPERATOR (2026-08-13). IN_APP_V3 = NO. CARD_SAVE = NOT_OCR
UGC_DECLARATIONS = HONEST_NO_FOR_PLAY_BINARY_V3 (report/block/terms). Do not save YES until a verified UGC+own-delete binary is on Play.
ADS_DECLARATION = NOT_SAVED_THIS_SESSION / PASTE_READY_NO_ADS
IARC = NOT_SAVED_THIS_SESSION / PASTE_READY_HONEST_V3
STORE_LISTING = TEXT_PASTE_READY_V3_SAFE. GRAPHICS_PARTIAL (local feature graphic; phone screenshots missing; not uploaded)
APP_SIGNING = OPERATOR_CONFIRMATION_REQUIRED / NOT_OCR
PRODUCTION_ACCESS_ELIGIBLE = NO
OPERATOR_ACTION_REQUIRED = YES
EXTERNAL_TIME_GATE = YES (12 opted-in × 14 continuous days unproven / not started)
```

---

## Verdict

| Field | Result |
|-------|--------|
| PLAY_BINARY | **v3** on Play. v4 local only (`37dde25f`) and **not** final (own-delete absent). v5 **not built**. |
| CONSOLE_WRITABLE_THIS_SESSION | **NO** |
| GOOGLE_PLAY_MUTATED | **NO** |
| ANY_CARD_SAVED_THIS_SESSION | **NO** |
| V4_UPLOADED | **NO** (forbidden) |
| V5_UPLOADED | **NO** (does not exist; forbidden) |
| APPLY_FOR_PRODUCTION | **NOT DONE** (forbidden) |
| AAB_BUILT | **NO** |
| PRODUCT_CODE_CHANGED | **NO** |
| CURRENT_TASK_WRITTEN | **NO** |
| PRODUCTION_ACCESS_ELIGIBLE | **NO** |
| ANDROID_PRODUCTION_RELEASE_READY | **NO** |

Items that **do not** depend on an unverified v5 upload are closed as evidence + paste-ready operator cards. Items that **do** depend on a verified UGC+own-delete Play binary stay open. A false YES on the live v3 binary is a policy violation.

---

## 0 — Scope vs prior packets (do not reopen completed work)

| Item | Status | Source | This wave |
|------|--------|--------|-----------|
| App Access / login details | **COMPLETE** | Operator + `DESKTOP_GOOGLE_PLAY_REVIEW_ACCOUNT_PROVISION_V1`. Reviewer `google-play-review@umtuba.com` provisioned. Password operator-local only. | **Do not reopen.** |
| Data Safety | **COMPLETE / SAVED** | Operator 2026-08-13. Matrix: eight types; collected YES; shared NO; encrypted YES (`DESKTOP_GOOGLE_PLAY_DATA_SAFETY_AUDIT_V1`). | **Do not reopen.** That packet’s old “deletion URL NONE” is **superseded** by the live web URL. |
| Target ages | **13–15 / 16–17 / 18+** | Operator + `DESKTOP_GOOGLE_PLAY_TARGET_AUDIENCE_UGC_POLICY_AUDIT_V1` | **Do not change ages.** Do not select under-13. Do not switch to 18+ only. |
| Target audience remaining | App details → Ads → Store presence → Summary | Last audit: **PARTIAL / unconfirmed** | Paste-ready below. **OCR** if already saved. |
| Account deletion URL | `https://umtuba.com/account-deletion` | Remaining-console treated Play URL half as complete. **Re-fetched this session: HTTP 200.** | **Do not tell the operator the URL is missing.** Do not paste `/privacy` or `/`. Console card save not re-OCR’d. |
| Internal Testing CORE | **CLOSED / PASS** on v3 | Prior Internal Testing closeout | Does **not** count toward 12/14. |
| Closed Testing list | “UMTUBA Closed Testers” | Operator 2026-08-13; A2 2026-08-14 | Use existing list. Do not reprint emails. |
| UGC Play declarations | Honest **NO** for v3 | A2 + remaining-console. Local v4 YES packet exists but v4 is not on Play and is not the final candidate. | Honest for **current Play binary = v3**. Do not save YES. |
| v4 AAB | Local; SHA256 verified; **not** final | `DESKTOP_ANDROID_V4_FINAL_CANDIDATE_CLOSEOUT_V1` | **Do not upload.** Own-delete absent. |
| v5 AAB | **Not built** | Same + this wave | **Do not upload. Do not build.** |

Authoritative prior Play packets read this session: A2 Closed Testing closeout, remaining-console, Data Safety, Target audience / UGC, reviewer provision, Play policy automation, A3 release-evidence reconciliation, v4 final-candidate, A1 runtime QA.

Official policy re-fetched this session: [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465).

---

## 1 — Account deletion URL (READ-ONLY re-verify)

Fetched 2026-08-14 this session. No login. No form submit.

| Check | Result |
|-------|--------|
| URL | `https://umtuba.com/account-deletion` |
| HTTP HEAD | **200** |
| HTTP GET | **200** (23089 bytes) |
| Title / heading | “Delete your UMTUBA account” |
| Sign-in required to submit | **YES** |
| Immediate `deleteUser` | **NO** — page queues a request |
| Privacy documents this path | **YES** — live `https://umtuba.com/privacy` names `/account-deletion` as the erasure page |

`ACCOUNT_DELETION_URL_PUBLICLY_REACHABLE = YES`.  
Do **not** tell the operator the URL is missing.  
Do **not** paste `https://umtuba.com/privacy` or `https://umtuba.com` into the Play deletion field.

Play User Data ([13327111](https://support.google.com/googleplay/android-developer/answer/13327111)):

- Web deletion resource = **SATISFIED** by this URL.
- In-app path **or** in-app link in the **current Play binary (v3)** = **NO**.
- v4 local Settings row exists in source/AAB but v4 is not on Play and is not the final candidate.
- v5 (UGC + own-delete) is not built.

`ACCOUNT_DELETION` for this gate = URL live + Play URL half operator-complete (2026-08-13). In-app delete for the live binary remains **NO**. Skip the Console card if Publishing overview already shows Account deletion complete.

---

## 2 — Tester layers (do not collapse)

These are four different numbers. Do not treat list membership as opted-in.

| Layer | Meaning | This session |
|-------|---------|--------------|
| **INVITED** | Opt-in link actually sent to people on the list | **UNKNOWN** |
| **LISTED** | Emails on Closed Testing list “UMTUBA Closed Testers” | OPERATOR **≥17** (2026-08-13 remaining-console). A2 this calendar day: operator **~25**. **Not file-verified.** |
| **OPTED_IN** | Testers who opened the join link and accepted. This is the number that counts for 12/14 | **UNKNOWN** |
| **INSTALLED** | Testers who installed from Play | Internal: device install of **v3** PASS (prior CORE). Closed Testing install count **UNKNOWN**. **v4/v5 cannot be installed from Play** (not uploaded). |

Email-list membership ≠ opted-in. Opted-in ≠ installed. Invited ≠ listed.

### Tester-list hunt (addresses never printed)

| Location | Result |
|----------|--------|
| `umtuba-web/docs/ops/closeout` | Counts only. No address file. |
| `umtuba-web/docs/ops/inbox` | **MISSING** |
| `umtuba-web/docs/ops/intake` | **MISSING** |
| `umtuba-mobile/release-artifacts/store-listing` | `CLOSED_TESTING_OPERATOR.txt` only — procedure, **0** tester addresses |
| `Documents/UMTUBA` archive | No tester-named file |
| Downloads name-match | Old umtuba zip stubs only. No tester list. |
| Desktop top-level files | No tester / closed-test / invite-list file |
| SMB `\\192.168.88.11\{inbox,share,UMTUBA,umtuba}` | **UNREACHABLE**. `net use` empty. |
| Browser / Play Console this session | **No open tab.** No OCR. |

`LOCAL_LIST_FILE = NONE`. This session cannot unique-count, de-dupe, or SHA256 a supplied address set.  
`TESTER_LIST_COUNT` = existing Console list as stated by the operator (**floor ≥17**; A2 approx 25). Do not invent a unique-valid integer. Do not reprint addresses. Use that existing list — do not create a new one.

---

## 3 — Closed Testing / 12×14 clock

Official (re-fetched 2026-08-14, [14151465](https://support.google.com/googleplay/android-developer/answer/14151465)):

- Personal accounts created after **13 November 2023** must run a **closed** test with **≥12 testers opted-in for the last 14 days continuously**, then **Apply for production** from the Dashboard.
- Internal testers do **not** satisfy that rule.
- Leaving and rejoining does not stack non-consecutive days.

| Field | Value |
|-------|--------|
| Track | Closed Testing Alpha — “UMTUBA Closed Testers” (operator) |
| Countries / regions | All available selected (operator 2026-08-13) |
| Release published vs draft | **UNKNOWN** (no OCR) |
| Listed | OPERATOR ≥17 / ~25 |
| Opted-in | **UNKNOWN** |
| ≥12 opted-in now? | **UNKNOWN** |
| `CLOSED_TEST_START_DATE` | **UNKNOWN / NOT_PROVEN** — list created 2026-08-13 is **not** Day 1 of the official clock |
| `ELAPSED_DAYS` | **UNKNOWN / NOT_PROVEN_STARTED** — calendar age of the list (~1 day since 2026-08-13) is **not** elapsed opted-in days |
| `CLOSED_TESTING_ACTIVE` | **IN_PREPARATION / NOT_OCR_THIS_SESSION** |
| Account type (personal post-2023-11-13 vs Organization / older personal) | **OPERATOR_CONFIRMATION_REQUIRED** |
| Eligible to apply on the 12/14 rule alone | **NO** (unproven) |
| Eligible to apply even if 12/14 later proven | **NO** — Play binary is still v3; UGC answers must stay NO; v5 not on Play; remaining cards open |

`EXTERNAL_TIME_GATE = YES`. This machine cannot start or advance the 14-day clock. The clock starts only after ≥12 testers are **opted-in** continuously.

---

## 4 — UGC declarations (honest for the binary on Play)

Play still has **versionCode 3**. v4 is local only and **not** the final candidate (own-delete missing from AAB). v5 is **not** built.

Local operator packet `umtuba-mobile/release-artifacts/store-listing/UGC_DECLARATION.txt` is a **v4 YES** draft. **Do not save it.** The same applies to the v4 Safety sentence in `MAIN_STORE_LISTING.txt` and the v4 “moderation tools = YES” line in `CONTENT_RATING_IARC.txt`.

| Control | v3 on Play now | v4 local client | v5 | What to save in Console **now** |
|---------|----------------|-----------------|-----|----------------------------------|
| App contains UGC | YES (Watch / Create / Messages) | YES | not built | **YES** |
| Public UGC | YES | YES | not built | **YES** |
| 1:1 Messages | YES | YES | not built | **YES** |
| In-app report content | **NO** | YES (code; device untested) | not built | **NO** |
| In-app report users | **NO** | YES (code; device untested) | not built | **NO** |
| In-app block users | **NO** | YES (code; device untested) | not built | **NO** |
| Terms before create/upload | **NO** | YES (code; device untested) | not built | **NO** |
| In-app deletion link | **NO** | YES (Settings → web URL) | not built | **NO** for the live binary |

`UGC_DECLARATIONS = HONEST_NO_FOR_PLAY_BINARY_V3`.  
Do **not** save YES until a **verified** UGC + own-delete binary is the Play review binary. Central apply of `20260928` is backend, not a Play binary. It does not make v3 grow report/block UI.

---

## 5 — What this session can close without a v5 upload

Closeable now (operator Console; **not saved here**):

1. Ads = No ads.  
2. Target audience remaining steps (ages already selected).  
3. IARC questionnaire **honest for v3** (moderation = NO).  
4. Store settings: category Social + website.  
5. Main store listing **text** without Safety / report / block claims.  
6. Account deletion URL if that card is still open.  
7. UGC card **honest NO** if the form allows saving without claiming tools.  
8. News / COVID / Government / Financial / Health = NO if still shown.  
9. App signing **read-only confirm** (do not generate a new upload key).

**Not** closeable without a verified UGC+own-delete Play binary (v5, after Central/A1 GO):

- UGC YES for report / block / terms  
- IARC claiming in-app moderation YES  
- Listing Safety / report / block sentence  
- In-app deletion YES  
- AAB upload  
- Apply for production  
- Production access eligibility (also blocked by the 12/14 clock)

---

## 6 — Console write this session

| Action | Result |
|--------|--------|
| Play Console opened | **NO** (browser tabs empty) |
| Testers page OCR | **NO** |
| Any Console field saved | **NO** |
| v4 uploaded | **NO** |
| v5 uploaded | **NO** (not built) |
| Apply for production | **NOT DONE** |

`GOOGLE_PLAY_MUTATED = NO`

---

## 7 — Paste-ready remaining cards (not saved)

Copy one card at a time. Skip any card Publishing overview already marks complete. **Do not reopen Data Safety, App access, or target ages.**

Do **not** paste the local v4 YES packets (`UGC_DECLARATION.txt`, IARC moderation YES, listing Safety bullet) until a verified UGC+own-delete binary is on Play.

### A — Highest leverage (read-only + invite existing list)

```
SCREEN/PATH = Play Console → UMTUBA (com.umtuba.app) → Test and release → Testing → Closed testing → Testers
EXACT OPTION TO SELECT = Read Opted-in (not the email-list count)
EXACT TEXT TO PASTE = (none — write the number and the date ≥12 first stayed opted in)
WHY = Official 12/14 rule counts opted-in only. https://support.google.com/googleplay/android-developer/answer/14151465
SAFE_TO_SAVE_NOW = N/A (read). If opted-in < 12: copy the Closed testing opt-in URL and send it to people ALREADY on “UMTUBA Closed Testers”. They must open it on the listed Google account and tap Become a tester. Stay opted in.
DO_NOT = Create a new list. Do not reprint emails. Do not upload v4 or v5. Do not Apply for production.
```

### B — Account deletion URL (only if that card is still incomplete)

```
SCREEN/PATH = Play Console → Policy → App content → Account deletion
  (separate from Data safety — do not reopen Data safety)
EXACT OPTION TO SELECT = App allows account creation = YES
  Users can request deletion = YES via web resource
  In-app deletion in the current Play binary (v3) = NO
EXACT TEXT TO PASTE = https://umtuba.com/account-deletion
  DO NOT PASTE https://umtuba.com/privacy
  DO NOT PASTE https://umtuba.com
WHY = Page live this session (HTTP 200). Play User Data (13327111) accepts a functional web deletion resource.
SAFE_TO_SAVE_NOW = YES if the card is still open. Skip if Publishing overview already shows Account deletion complete.
```

### C — Ads

```
SCREEN/PATH = Play Console → Policy → App content → Ads
EXACT OPTION TO SELECT = No, my app does not contain ads
EXACT TEXT TO PASTE = (none)
WHY = No AdMob / ads SDK in the Android product. Safe for the current Play binary. Does not publish v4 or v5.
SAFE_TO_SAVE_NOW = YES
```

### D — Target audience remaining (ages already selected — do not change)

```
SCREEN/PATH = Play Console → Policy → App content → Target audience and content → App details
EXACT OPTION TO SELECT =
  Designed for children / primarily for children under 13 = NO
  Appeals to children (if asked) = NO
  Do not select any under-13 age box
  Do not switch to 18+ only
  Restrict Minor Access = DO NOT ENABLE
EXACT TEXT TO PASTE (only if a free-text describe box appears) =
  UMTUBA is a social video app for people 13 and older. Users watch public videos, publish their own clips, and send 1:1 messages. It is not designed for children under 13.
SAFE_TO_SAVE_NOW = YES for honest NO-children answers.

SCREEN/PATH = same flow → Ads (Families / neutral age)
EXACT OPTION TO SELECT = App does not serve ads
SAFE_TO_SAVE_NOW = YES

SCREEN/PATH = same flow → Store presence
EXACT OPTION TO SELECT = Do NOT apply for Teacher Approved
SAFE_TO_SAVE_NOW = YES

SCREEN/PATH = same flow → Summary → Review and Save
SAFE_TO_SAVE_NOW = YES
```

### E — Content rating (IARC) — honest for **v3 on Play**

```
SCREEN/PATH = Play Console → Policy → App content → Content ratings → Start
EXACT OPTION TO SELECT =
  Category = Social Networking (or Social / Communication — not Game, not Utility)
  IARC email = existing Play developer-account email only
  Designed first-party content: violence / sexual / strong language / drugs / gambling / horror as featured product = NO
  Users can interact / communicate = YES
  Users can share videos / text = YES
  Users can share location = NO
  Digital purchases / IAP = NO
  Unrestricted internet / user-shared media others can see = YES
  Shares user’s personal info with other users = YES (username / public profile)
  UGC present = YES
  In-app moderation tools (report / block) = NO for the current Play binary
EXACT TEXT TO PASTE = (radio buttons; do not invent a mailbox)
WHY = Do not claim v4/v5 moderation until a verified UGC+own-delete binary is uploaded. Social UGC + chat typically yields Teen / Parental Guidance — expected. Do not retake to force Everyone.
SAFE_TO_SAVE_NOW = YES (honest questionnaire). Do not start Production review from this page.
```

### F — Store settings / category

```
SCREEN/PATH = Play Console → Grow → Store presence → Store settings
EXACT OPTION TO SELECT = App category = Social
EXACT TEXT TO PASTE =
  Website = https://umtuba.com
  Privacy policy = https://umtuba.com/privacy   (already set — do not change)
  Email = the Play developer-account contact email you already use
    Do not invent support@.
    Do not use google-play-review@umtuba.com
  Phone = leave blank unless required
SAFE_TO_SAVE_NOW = YES for category + website.
```

### G — Main store listing text (v3-safe; no Safety / report / block claims)

```
SCREEN/PATH = Play Console → Grow → Store presence → Main store listing

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

SAFE_TO_SAVE_NOW = YES for name + short + full text.
  NO for “listing complete” until icon 512×512, feature graphic, and ≥2 real-device phone screenshots are uploaded.
  Local feature graphic exists (not uploaded): umtuba-mobile/release-artifacts/store-listing/feature-graphic-1024x500.png
  Phone screenshots: MISSING — capture from Internal Testing v3 (Watch, Discover, Create, Messages). No youthful cartoon characters. Do not mock UGC Safety UI.
  Do not use the local v4 listing’s Safety / report / block sentence until a verified UGC+own-delete binary is the Play binary.
```

### H — UGC declaration — honest for **current Play binary**

```
SCREEN/PATH = Play Console → Policy → App content → User-generated content
EXACT OPTION TO SELECT =
  App contains UGC = YES
  Publicly accessible UGC = YES
  1:1 user interaction = YES
  In-app report content = NO
  In-app report users = NO
  In-app block users = NO
  Users must accept Terms before create/upload in this Android binary = NO
EXACT TEXT TO PASTE = (none — do not write that report/block exist)
SAFE_TO_SAVE_NOW = YES only if the form lets you save honest NO answers.
  NO if completing the card requires claiming report/block exist.
  Do not paste the local v4 YES packet.
  Do not submit for review from this card.
```

### I — App signing (confirm only)

```
SCREEN/PATH = Play Console → Test and release → Setup → App signing
EXACT OPTION TO SELECT = Confirm Play App Signing is enrolled for com.umtuba.app (Google-held signing key; existing upload keystore already used for v3 AAB)
EXACT TEXT TO PASTE = (none)
WHY = v3 used existing EAS upload keystore (SIGNING_CREDENTIALS_CHANGED = NO). Enrollment itself was never captured locally.
SAFE_TO_SAVE_NOW = N/A (read-only confirm). Do not generate a new upload key.
```

### J — Other App content cards if still shown

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
SAFE_TO_SAVE_NOW = YES
```

### K — Do not do

- Do not upload versionCode 4.  
- Do not upload an unverified v5.  
- Do not build a v5 AAB from this task.  
- Do not reopen Data Safety, App access, or the three target-age boxes.  
- Do not Apply for production.  
- Do not promote Internal → Production.  
- Do not save UGC / IARC / listing claims that report, block, or in-app delete exist.  
- Do not enable Live. Do not touch Stripe.  
- Do not print tester emails or the reviewer password.  
- Do not edit mobile product files (A1 owns those).

---

## 8 — Production access

`PRODUCTION_ACCESS_ELIGIBLE = NO`

Blockers that remain even if the operator later OCRs opted-in ≥12:

1. 14 continuous days at ≥12 opted-in **not proven** (`EXTERNAL_TIME_GATE = YES`).  
2. Current Play binary is v3 and lacks in-app UGC tools required for a social/public + messaging app ([9876937](https://support.google.com/googleplay/android-developer/answer/9876937)).  
3. v4 is not a final candidate (own-delete absent). v5 is not built / not verified / not uploaded.  
4. Remaining Console cards (Ads / IARC / listing graphics / TA remainder / app-signing OCR) not saved by this session.  
5. No explicit Central/A1 GO to upload any AAB or submit review.

---

## 9 — What this session did / did not do

| Did | Did not |
|-----|---------|
| Read A2 Closed Testing closeout + remaining Play console packets | Open or save Play Console |
| Re-fetch official 12/14 policy | Invent opted-in, start date, or elapsed days |
| Re-fetch `https://umtuba.com/account-deletion` (HTTP 200) | Claim the deletion card was re-saved |
| Hunt existing tester list (count only; no addresses) | Find or hash a local address file |
| Produce paste-ready remaining cards that do not need v5 | Claim those cards were saved |
| Keep UGC answers honest NO for v3 | Upload v4 or v5; build AAB; Apply for production |
| Write this packet only | Edit mobile product files; write `CURRENT_TASK.md`; commit / push / migrate |

`GOOGLE_PLAY_MUTATED = NO`  
`PRODUCT_CODE_CHANGED = NO`  
`AAB_BUILT = NO`  
`V4_UPLOAD_PERFORMED = NO`  
`V5_UPLOAD_PERFORMED = NO`

---

## 10 — NEXT_SINGLE_OPERATOR_ACTION

Open **Play Console → Test and release → Testing → Closed testing → Testers**. Write down the **opted-in** count (not the email list). If it is under 12, send the existing Closed testing opt-in link to people already on “UMTUBA Closed Testers” until 12 stay opted in. That is the only Console action that starts the 14-day clock.

Then save the non-v5 cards above (Ads = No; IARC honest NO; TA remainder; listing text without Safety claims; category; deletion URL if still open; UGC honest NO if the form allows). Do not upload v4. Do not upload v5. Do not Apply for production.

Then STOP.
