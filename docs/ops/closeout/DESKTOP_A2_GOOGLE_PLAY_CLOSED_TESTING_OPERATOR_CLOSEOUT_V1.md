# DESKTOP_A2_GOOGLE_PLAY_CLOSED_TESTING_OPERATOR_CLOSEOUT_V1

**DEVICE:** DESKTOP-A2  
**DEVICE_ROLE:** GOOGLE_PLAY_CONSOLE / CLOSED_TESTING_PRIMARY  
**MODE:** FINAL_PARALLEL_EXECUTION / EVIDENCE_ONLY / NO_V4_UPLOAD / NO_CONSOLE_WRITE  
**DATE:** 2026-08-14  
**TASK_ID:** DESKTOP_A2_GOOGLE_PLAY_CLOSED_TESTING_OPERATOR_CLOSEOUT_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**PLAY_BINARY_ON_STORE:** versionCode **3** (Internal Testing CORE published). versionCode **4** AAB exists locally and is **not** uploaded.  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web`  
**MOBILE (read-only):** `C:\Users\1\Desktop\umtuba\umtuba-mobile`

This packet owns Google Play Console / Closed Testing readiness only. It does **not** upload v4, mutate Android product files, commit, push, apply migrations, enable Live, touch Stripe, write `CURRENT_TASK` / `PROJECT_STATE` / `SESSION_HANDOFF`, or print tester emails or the reviewer password.

`V4_UPLOAD_ALLOWED = NO`. No prior explicit Central GO to upload v4 was found. Central applying `20260928` (stated in this wave’s parent GO) is **not** an upload clearance.

Play Console was **not** writable from this session (no open Console tab; no operator OCR of Testers). No Console field was saved here. Remaining cards below are paste-ready only.

No secrets. Tester addresses are not reproduced. Reviewer password is not printed.

---

## DESKTOP-A2 REPORT

```
DESKTOP-A2 REPORT
TASK_ID = DESKTOP_A2_GOOGLE_PLAY_CLOSED_TESTING_OPERATOR_CLOSEOUT_V1
TESTER_EMAILS_RECEIVED = OPERATOR_STATED_APPROX_25 (this GO, 2026-08-14) + PRIOR_OPERATOR_STATED_>=17 (2026-08-13 remaining-console). LOCAL_LIST_FILE = NONE. SMB = UNREACHABLE. HASH = N/A.
UNIQUE_TESTERS = UNKNOWN_NO_LOCAL_LIST (cannot unique-count or validate format without addresses). FLOOR_ADDED_TO_CLOSED_LIST = >=17 (operator, 2026-08-13). THIS_GO_APPROX = 25 (operator; not independently counted).
TESTER_LIST_CONFIGURED = YES_OPERATOR — Closed Testing Alpha list named “UMTUBA Closed Testers” (operator 2026-08-13). Not Internal Testing. Not Console-OCR this session.
OPTED_IN_COUNT = UNKNOWN
CLOSED_TESTING_ACTIVE = IN_PREPARATION (operator) / NOT_OCR_THIS_SESSION. Track exists; countries selected; list created. Live opted-in closed test not proven.
DAY_COUNT = UNKNOWN / NOT_PROVEN_STARTED
APP_ACCESS = COMPLETE (do not reopen)
DATA_SAFETY = COMPLETE (do not reopen)
TARGET_AUDIENCE = AGES_COMPLETE (13–15 / 16–17 / 18+). Remaining App details / Ads / Store presence / Summary = UNCONFIRMED.
ACCOUNT_DELETION_URL_ENTERED = YES_OPERATOR_PLAY_URL_HALF (remaining-console 2026-08-13). URL LIVE this session at https://umtuba.com/account-deletion. Console card not re-OCR’d.
UGC_PLAY_DECLARATIONS = HONEST_NO_FOR_CURRENT_PLAY_BINARY_V3 (report/block/terms not in v3). v4 YES packet exists locally but v4 is not on Play — do not save YES.
PRODUCTION_ACCESS_ELIGIBLE = NO
V4_UPLOAD_ALLOWED = NO
GOOGLE_PLAY_REMAINING_BLOCKERS = opted-in UNKNOWN; 12/14 clock unproven; v4 not uploaded / not cleared; UGC Play answers must stay NO until v4 is on the track; Ads / IARC / listing graphics / TA remaining steps / app-signing OCR still open; do not Apply for production.
```

---

## 1 — Tester-list reconciliation (no addresses)

Searched without echoing addresses. Count / validity / hash only.

| Location | Result |
|----------|--------|
| `umtuba-web/docs/ops/closeout` | Counts only (`>=17`). No address file. |
| `umtuba-web/docs/ops/inbox` | **MISSING** |
| `umtuba-web/docs/ops/intake` | **MISSING** |
| `umtuba-mobile/release-artifacts/store-listing` | `CLOSED_TESTING_OPERATOR.txt` only — procedure, **0** tester addresses |
| Desktop top-level files | No tester / closed-test / invite-list file |
| Downloads name-match | No tester list (old umtuba zip stubs only) |
| `Documents/UMTUBA` archive | No tester-named file |
| SMB `\\192.168.88.11\{inbox,share,UMTUBA,umtuba}` | **UNREACHABLE**. `net use` empty. |
| Agent transcripts (Play wave) | Operator **counts** only. No pasted ~25-address block. |
| Browser / Play Console this session | **No open tab.** No OCR. |

**LOCAL_LIST_FILE = NONE.** This session cannot unique-count, de-dupe, or SHA256 a supplied address set.

### Operator count timeline (evidence class = OPERATOR, not file)

| When | Statement | Track |
|------|-----------|--------|
| 2026-08-13 ~15:23 | “UMTUBA Closed Testers” list created; **one** tester added; Alpha targeting configured; all available countries/regions selected | `CLOSED_TESTING_ALPHA` |
| 2026-08-13 ~22:56 | Closed Testing tester list has **at least 17** emails | Closed Testing (not Internal) |
| 2026-08-14 ~15:25 (this GO) | Operator has supplied **approximately 25** tester emails to Desktop | Use existing list; do not reprint |

`TESTER_EMAILS_RECEIVED` = those operator statements.  
`UNIQUE_TESTERS` cannot be computed. Do not treat 25 as a verified unique-valid count. Do not treat ≥17 as opted-in.

Validity of individual entries: **UNKNOWN** (no local addresses to check RFC-style format or Google-account suitability).

---

## 2 — Which list / group / track

| Layer | Assignment | Evidence |
|-------|------------|----------|
| Closed Testing Alpha | **Intended home of the supplied emails** | Operator: list name “UMTUBA Closed Testers”; `TRACK = CLOSED_TESTING_ALPHA`; later `CLOSED_TESTING_ALPHA_IN_PREPARATION` |
| Internal Testing | **Separate.** CORE **CLOSED / PASS** on versionCode **3**. Does **not** count toward the 12/14 production-access rule | `DESKTOP_ANDROID_INTERNAL_TEST_FINAL_CLOSEOUT_V1` |
| Production | **Not created / not to be used** | Prior remaining-console + official 12/14 gate |

Official rule fetched this session: [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465) — personal accounts created after **13 November 2023** must run a **closed** test with **≥12 testers opted-in for the last 14 days continuously**, then **Apply for production** from the Dashboard. Internal testers do not satisfy that rule.

Developer account type (personal post-2023-11-13 vs Organization / older personal) = **OPERATOR_CONFIRMATION_REQUIRED** (Publishing overview). Do not assume exemption.

---

## 3 — Closed Testing configuration (do not invent Console state)

This session did **not** open Play Console. State below is prior operator + docs only. Anything not in that set is **UNKNOWN / OCR**.

| Item | Status | Class |
|------|--------|--------|
| Package | `com.umtuba.app` | FILE + prior packets |
| Closed Testing track | Exists; Alpha | OPERATOR 2026-08-13 |
| Tester list created | YES — “UMTUBA Closed Testers” | OPERATOR |
| Emails on that list | ≥17 (2026-08-13) / ~25 (this GO) | OPERATOR; not unique-counted here |
| Countries / regions | All available selected | OPERATOR |
| Closed Testing release published vs draft | **UNKNOWN** | No OCR |
| Opt-in URL captured locally | Procedure only: `https://play.google.com/apps/testing/com.umtuba.app` (pattern from operator packet; **not** fetched/confirmed this session) | DOCS |
| Opted-in count | **UNKNOWN** | No Console evidence |
| Date ≥12 first stayed opted in | **UNKNOWN** | No Console evidence |
| 14-day continuous window | **NOT_PROVEN_STARTED** | Clock does not start from emails-added |
| v3 on Internal Testing | YES — Play showed `1.0.0 (3)` | PRIOR CLOSEOUT |
| v4 on any Play track | **NO** | FILE `playUpload: false`; no Central upload GO |

`CLOSED_TESTING_ACTIVE = IN_PREPARATION / NOT_OCR_THIS_SESSION`.  
Do not claim a live closed test with opted-in testers.

---

## 4 — INVITED / ADDED_TO_TESTER_LIST / OPTED_IN / INSTALLED

These are four different numbers. Do not collapse them.

| Layer | Meaning | This session |
|-------|---------|--------------|
| **INVITED** | Opt-in link actually sent to people on the list | **UNKNOWN** |
| **ADDED_TO_TESTER_LIST** | Emails on the Closed Testing list | OPERATOR **≥17** (2026-08-13); this GO **~25**. Not file-verified. |
| **OPTED_IN** | Testers who opened the join link and accepted. This is the number that counts for 12/14 | **UNKNOWN** |
| **INSTALLED** | Testers who installed from Play | Internal: device install of **v3** PASS (prior CORE). Closed Testing install count **UNKNOWN**. **v4 cannot be installed from Play** (not uploaded). |

Email-list membership ≠ opted-in. Opted-in ≠ installed.

---

## 5 — Exact 12-testers / 14-day state

Official (fetched 2026-08-14, [14151465](https://support.google.com/googleplay/android-developer/answer/14151465)):

- ≥12 testers **opted-in** (not merely listed)
- Those 12 must have been opted-in for the **last 14 days continuously**
- Leaving and rejoining does not stack non-consecutive days
- Then **Apply for production** from the Dashboard (do **not** click it this wave)

| Field | Value |
|-------|--------|
| Listed emails | OPERATOR ≥17 / ~25 |
| Opted-in | **UNKNOWN** |
| ≥12 opted-in now? | **UNKNOWN** |
| Day 1 of a proven 14-day window | **UNKNOWN** |
| `DAY_COUNT` | **UNKNOWN / NOT_PROVEN_STARTED** |
| Eligible to apply for production on the 12/14 rule alone | **NO** (unproven) |
| Eligible to apply after 12/14 even if proven | **NO** — v4 not on Play; UGC answers for the live binary are still NO; remaining Console cards open |

---

## 6 — Prior Play closeouts (do not reopen completed work)

| Item | Status | Source | This wave |
|------|--------|--------|-----------|
| App Access / login details | **COMPLETE** | Operator + `DESKTOP_GOOGLE_PLAY_REVIEW_ACCOUNT_PROVISION_V1`. Reviewer `google-play-review@umtuba.com` provisioned. Password operator-local only. | **Do not reopen.** Instructions packet: `umtuba-mobile/release-artifacts/store-listing/REVIEWER_INSTRUCTIONS.txt` (password not copied here). |
| Data Safety | **COMPLETE / SAVED** | Operator 2026-08-13 remaining-console. Matrix from `DESKTOP_GOOGLE_PLAY_DATA_SAFETY_AUDIT_V1` (eight types; collected YES; shared NO; encrypted YES). | **Do not reopen.** The original Data Safety packet’s “deletion URL NONE” is **superseded** for the live web URL. |
| Target ages | **13–15 / 16–17 / 18+** selected | Operator + `DESKTOP_GOOGLE_PLAY_TARGET_AUDIENCE_UGC_POLICY_AUDIT_V1` | **Do not change ages.** Do not select under-13. Do not switch to 18+ only. |
| Target audience remaining | App details → Ads → Store presence → Summary | Last audit: **PARTIAL / unconfirmed** | Paste-ready below. **OCR** if already saved. |
| Account deletion URL | `https://umtuba.com/account-deletion` | Remaining-console treated Play URL half as complete. **Re-fetched this session: page live** (“Delete your UMTUBA account”; queued request; sign-in required). | **Do not tell the operator the URL is missing.** Do not paste `/privacy` or `/`. Console card save not re-OCR’d. |
| UGC Play declarations | See §7 | Remaining-console honest **NO** for v3. v4 local packet is YES **after upload only**. | Honest for **current Play binary = v3**. |

---

## 7 — UGC Play declarations (honest)

Play still has **versionCode 3**. v4 is local only (`37dde25f`; SHA256 `C2CD78E0C14B46D02BECDA0C5CBC364F40B8A161832B85FF9FFCEE7E418283E6`). Not uploaded.

| Control | v3 on Play now | v4 local client | What to save in Console **now** |
|---------|----------------|-----------------|----------------------------------|
| App contains UGC | YES (Watch / Create / Messages) | YES | YES |
| Public UGC | YES | YES | YES |
| 1:1 Messages | YES | YES | YES |
| In-app report content | **NO** | YES (code) | **NO** until v4 is the Play binary |
| In-app report users | **NO** | YES (code) | **NO** |
| In-app block users | **NO** | YES (code) | **NO** |
| Terms before create/upload | **NO** | YES (code) | **NO** |
| In-app deletion link | **NO** | YES (Settings → web URL) | Do not claim in-app delete for v3 |

Parent GO states Central applied `20260928`. That is backend, not a Play binary. It does **not** make v3 grow report/block UI. It does **not** authorize saving UGC YES. It does **not** authorize uploading v4.

`UGC_PLAY_DECLARATIONS = HONEST_NO_FOR_CURRENT_PLAY_BINARY_V3`.  
A false YES on the live v3 binary is a policy violation.

---

## 8 — Console write this session

| Action | Result |
|--------|--------|
| Play Console opened | **NO** (browser tabs empty) |
| Testers page OCR | **NO** |
| Any Console field saved | **NO** |
| v4 uploaded | **NO** (`V4_UPLOAD_ALLOWED = NO`) |
| Apply for production | **NOT DONE** (forbidden) |

Safe operator actions that would **not** publish unverified v4 (human Console only; **not performed here**):

1. Closed testing → Testers → read **Opted-in** (not email-list count). If &lt;12, send the opt-in link to people **already on the list**.
2. Save Ads = No; IARC honest questionnaire **without** claiming v4 moderation; TA remaining steps; listing **text** without v4 Safety claims; deletion URL if that card is still open.
3. Do **not** save UGC YES. Do **not** upload v4. Do **not** Apply for production.

---

## 9 — Paste-ready remaining cards (not saved)

Copy one card at a time. Skip any card Publishing overview already marks complete. **Do not reopen Data Safety, App access, or target ages.**

### A — Highest leverage (read-only + invite)

```
SCREEN/PATH = Play Console → UMTUBA (com.umtuba.app) → Test and release → Testing → Closed testing → Testers
EXACT OPTION TO SELECT = Read Opted-in (not the email-list count)
EXACT TEXT TO PASTE = (none — write the number and the date ≥12 first stayed opted in)
WHY = Official 12/14 rule counts opted-in only. https://support.google.com/googleplay/android-developer/answer/14151465
SAFE_TO_SAVE_NOW = N/A (read). If opted-in < 12: copy the Closed testing opt-in URL and send it to listed testers. They must open it on the listed Google account and tap Become a tester. Stay opted in.
DO_NOT = Upload v4. Do not Apply for production.
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
WHY = Page live this session. Play User Data (13327111) accepts a functional web deletion resource.
SAFE_TO_SAVE_NOW = YES if the card is still open. Skip if Publishing overview already shows Account deletion complete.
```

### C — Ads

```
SCREEN/PATH = Play Console → Policy → App content → Ads
EXACT OPTION TO SELECT = No, my app does not contain ads
EXACT TEXT TO PASTE = (none)
WHY = No AdMob / ads SDK in the Android product. Safe for v3 and v4. Does not publish v4.
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
WHY = Do not claim v4 moderation until v4 is uploaded. Social UGC + chat typically yields Teen / Parental Guidance — expected. Do not retake to force Everyone.
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

### G — Main store listing text (v3-safe; no v4 Safety claims)

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
  Do not use the v4 listing’s Safety / report / block sentence until v4 is the Play binary.
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
  Do not paste the v4 YES packet until v4 is uploaded and is the review binary.
  Do not submit for review from this card.
```

### I — Do not do

- Do not upload versionCode 4 (`V4_UPLOAD_ALLOWED = NO`).
- Do not reopen Data Safety, App access, or the three target-age boxes.
- Do not Apply for production.
- Do not promote Internal → Production.
- Do not enable Live. Do not touch Stripe.
- Do not print tester emails or the reviewer password.

---

## 10 — Production access

`PRODUCTION_ACCESS_ELIGIBLE = NO`

Blockers that remain even if the operator later OCRs opted-in ≥12:

1. 14 continuous days at ≥12 opted-in **not proven** (and cannot start from this machine).
2. v4 not uploaded; current Play binary lacks in-app UGC tools required for a social/public + messaging app ([9876937](https://support.google.com/googleplay/android-developer/answer/9876937)).
3. Remaining Console cards (Ads / IARC / listing graphics / TA remainder / app-signing OCR).
4. No explicit Central/A1 GO to upload v4 or submit review.

---

## 11 — What this session did / did not do

| Did | Did not |
|-----|---------|
| Reconcile tester evidence (count + track only) | Find or hash a local ~25-address file |
| Re-fetch official 12/14 policy | Invent opted-in or day count |
| Re-fetch `https://umtuba.com/account-deletion` (live) | Open or save Play Console |
| Read prior Play closeouts; leave completed items closed | Upload v4 |
| Write this packet only | Commit / push / migrate / edit Android product / write A3-owned AI docs |
| Produce paste-ready remaining cards | Claim those cards were saved |

`GOOGLE_PLAY_MUTATED = NO`  
`PRODUCT_CODE_CHANGED = NO`  
`V4_UPLOAD_PERFORMED = NO`

---

## 12 — NEXT_SINGLE_OPERATOR_ACTION

Open **Play Console → Test and release → Testing → Closed testing → Testers**. Write down the **opted-in** count (not the email list). If it is under 12, send the Closed testing opt-in link until 12 people stay opted in. That is the only Console action that starts the 14-day clock. Do not upload v4. Do not Apply for production.

Then STOP.
