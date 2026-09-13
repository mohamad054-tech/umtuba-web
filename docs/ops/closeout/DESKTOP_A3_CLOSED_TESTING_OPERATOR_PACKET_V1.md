# DESKTOP_A3_CLOSED_TESTING_OPERATOR_PACKET_V1

**DEVICE:** DESKTOP-A3  
**DEVICE_ROLE:** CLOSED_TESTING_OPERATOR_PACKET  
**WAVE_ID:** DESKTOP_CONTINUOUS_ANDROID_PLAY_V4  
**MODE:** EVIDENCE_ONLY / NO_CONSOLE_WRITE / NO_V4_UPLOAD / NO_V5_UPLOAD / NO_APPLY_FOR_PRODUCTION  
**DATE:** 2026-08-14  
**TASK_ID:** DESKTOP_A3_CLOSED_TESTING_OPERATOR_PACKET_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**PLAY_BINARY_ON_STORE:** versionCode **3** (Internal Testing CORE). versionCode **4** local only / not uploaded. versionCode **5** not built / not device-QA’d.  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web`  
**MOBILE:** not modified.

This packet is the exact operator checklist for the **already supplied** Closed Testing tester set. It does **not** print tester emails. It does **not** invent opted-in counts. It does **not** upload v4 or v5. It does **not** Apply for production. It does **not** overwrite `docs/ai/CURRENT_TASK.md`.

Play Console was **not** reachable this session (Cursor browser tabs empty; no Testers OCR). SMB `192.168.88.11` being used later by A1 for a v5 source deposit does **not** imply Console access. No Console field was saved here.

No secrets. Tester addresses are not reproduced. Reviewer password is not printed.

Official rule (re-fetched this session): [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465). Closed-test setup: [Set up an open, closed, or internal test](https://support.google.com/googleplay/android-developer/answer/9845334).

---

## DESKTOP-A3 REPORT

```
DESKTOP-A3 REPORT
TASK_ID = DESKTOP_A3_CLOSED_TESTING_OPERATOR_PACKET_V1
TESTER_LIST_READY = YES_OPERATOR — Closed Testing Alpha list “UMTUBA Closed Testers” (operator 2026-08-13). LISTED = OPERATOR_FLOOR_>=17 (2026-08-13) / APPROX_25_UNVERIFIED (2026-08-14). LOCAL_LIST_FILE = NONE. UNIQUE_COUNT = UNKNOWN. NOT_OCR_THIS_SESSION.
OPTED_IN_EVIDENCE = UNKNOWN
TEST_START_EVIDENCE = UNKNOWN / IN_PREPARATION / CLOCK_NOT_PROVEN
TWELVE_GATE = UNKNOWN / UNPROVEN
FOURTEEN_DAY_GATE = NOT_PROVEN_STARTED
PRODUCTION_ACCESS = NO
NEXT_OPERATOR_STEPS = Open Play Console → Test and release → Testing → Closed testing → Manage track (Alpha) → Testers. Confirm list “UMTUBA Closed Testers” is selected. Read Opted-in (not list count). If the opt-in URL is missing, the Closed Testing release is still Draft/Pending — do not upload v4/v5 to create it; confirm whether v3 is already published on this track. Copy the existing Closed Testing opt-in URL and send it only to people already on that list. Testers open it on the listed Google account and tap Become a tester. Stay opted in. Record DATE, OPTED_IN_COUNT, DATE_12_FIRST_HELD. Do not create a new list. Do not upload v4. Do not upload unverified v5. Do not Apply for production. Do not save UGC YES while v3 is the Play binary.
```

---

## 1 — Layers (do not collapse)

`INVITED != OPTED_IN != LISTED != INSTALLED`.

| Layer | Meaning | This session |
|-------|---------|--------------|
| **LISTED** | Emails on Closed Testing list “UMTUBA Closed Testers” | OPERATOR **≥17** (2026-08-13 remaining-console). OPERATOR **~25** (2026-08-14 A2). **Not file-verified. Not Console-OCR.** |
| **INVITED** | Opt-in link actually sent | **UNKNOWN** |
| **OPTED_IN** | Testers who opened the join link and accepted. **This is the 12/14 number.** | **UNKNOWN** |
| **INSTALLED** | Testers who installed from Play Closed Testing | **UNKNOWN**. Internal Testing v3 device install is a **different** track and does **not** count. v4/v5 cannot be installed from Play (not uploaded). |

Do not treat 25 or ≥17 as opted-in. Do not treat list-creation calendar age (list created 2026-08-13) as Day 1 of the official clock.

`LOCAL_LIST_FILE = NONE` (A2 hunts today: web closeout/inbox/intake, mobile `CLOSED_TESTING_OPERATOR.txt` = procedure only / 0 addresses, Desktop top-level, Downloads, `Documents/UMTUBA`). This packet does not reprint or hunt addresses. Unique / valid integer **cannot** be computed here.

---

## 2 — Tester list configured

| Item | Status | Class |
|------|--------|--------|
| Track | Closed Testing **Alpha** | OPERATOR 2026-08-13 |
| List name | “UMTUBA Closed Testers” | OPERATOR |
| Countries / regions | All available selected | OPERATOR |
| List created | 2026-08-13 (~15:23 one tester; ~22:56 ≥17) | OPERATOR |
| Later supplied set | ~25 (2026-08-14) — use **existing** list | OPERATOR; not independently counted |
| Internal Testing | Separate. CORE **CLOSED / PASS** on v3. **Does not count** toward 12/14 | PRIOR CLOSEOUT |
| Production track | Not created / not to be used | PRIOR |
| Console confirmation this session | **UNKNOWN** — tabs empty; no OCR | SESSION |
| Closed Testing release published vs draft | **UNKNOWN** | NO OCR |
| `CLOSED_TESTING_ACTIVE` | **IN_PREPARATION / CLOCK_NOT_PROVEN** | OPERATOR + prior packets; not proven live opted-in |

`TESTER_LIST_READY = YES_OPERATOR`. Use the existing list. Do **not** create a second list. Do **not** upload a CSV (that overwrites the current list). Do **not** reprint emails.

Developer account type (personal after 13 Nov 2023 vs Organization / older personal) = **OPERATOR_CONFIRMATION_REQUIRED** on Publishing overview. Do not assume exemption. Official 12/14 rule applies to personal accounts created after 13 November 2023.

---

## 3 — Console this session

| Check | Result |
|-------|--------|
| Cursor browser tabs | **Empty** |
| Play Console opened | **NO** |
| Testers page OCR | **NO** |
| Opted-in integer collected | **NO — keep UNKNOWN** |
| Any Console field saved | **NO** |
| v4 / v5 uploaded | **NO** |
| Apply for production | **NOT DONE** |

`GOOGLE_PLAY_MUTATED = NO`.  
If Console later opens, record only what the Testers page actually shows. Do not invent OCR.

---

## 4 — One exact operator sequence

Do these steps in order. Stop after step 8. Do not add a new list. Do not upload an AAB.

1. Open **Play Console** → app **UMTUBA** (`com.umtuba.app`).
2. **Test and release → Testing → Closed testing**.
3. Open the **Alpha** track → **Manage track** (do not Create a new closed track).
4. Open the **Testers** tab.
5. Confirm **“UMTUBA Closed Testers”** is the selected email list. If it is not selected, select that existing list and **Save changes**. Do not Create email list. Do not Upload CSV.
6. Read the **Opted-in** number. This is **not** the email-list membership count. Write it down (count only).
7. Copy the **Closed testing opt-in URL** (shareable join link). Pattern only — do not treat as confirmed this session: `https://play.google.com/apps/testing/com.umtuba.app`.  
   Official: the opt-in link appears only when the Closed Testing release is **Published**. Draft / Pending publication = no link. If the link is missing, the test has **not** started for testers — see §6. Do **not** upload v4 or unverified v5 to “create” a link.
8. If **Opted-in < 12**: send that **existing** opt-in URL to people **already on** “UMTUBA Closed Testers”. Each person must:
   - open the URL while signed into the **listed** Google account (`@gmail.com` or Google Workspace);
   - tap **Become a tester** / **Accept**;
   - **stay opted in** (leave + rejoin does not stack non-consecutive days).
9. Record the evidence row in §7. Do **not** Apply for production. Do **not** open Production. Do **not** promote Internal → Production.

That is the only Console action that can start the 14-day clock. This machine cannot start it.

---

## 5 — How to verify Opted-in

**Path:** Play Console → Test and release → Testing → Closed testing → Manage track (Alpha) → **Testers**.

| Do | Do not |
|----|--------|
| Read the label **Opted-in** (or equivalent testers-who-accepted count) | Read the email-list size (~25 / ≥17) and call it opted-in |
| Write the integer and the date/time of the read | Guess, round, or reuse the supplied-list count |
| If < 12: send the **existing** opt-in URL to listed testers only | Create a new list; paste addresses into chat; treat Internal testers as opted-in |
| Confirm testers used the listed Google account | Count people who only received an email |

`OPTED_IN_EVIDENCE` stays **UNKNOWN** until that Testers page is read.

---

## 6 — How to verify test start

List creation (2026-08-13) is **not** test start. Emails added is **not** test start. Calendar age of the list is **not** elapsed opted-in days.

A Closed Testing test has started for the 12/14 rule only when **all** of the following are true. This session can prove **none** of them.

| Check | Where | Pass looks like | This session |
|-------|-------|-----------------|--------------|
| Alpha track exists | Closed testing | Track present (operator: yes) | OPERATOR; not OCR |
| Existing list selected | Testers | “UMTUBA Closed Testers” checked | OPERATOR; not OCR |
| Closed Testing **release** is Published | Closed testing → Releases | Status **Published** (not Draft / Pending). Official: opt-in link shows only when Published. First publish can take a few hours before the link works. | **UNKNOWN** |
| Opt-in URL visible | Testers | Copyable join link | **UNKNOWN** |
| ≥12 testers opted in | Testers → Opted-in | Integer ≥ 12 | **UNKNOWN** |
| Those 12 stayed opted in continuously | Testers + calendar | Date ≥12 first held, then 14 straight days with no drop below 12 | **UNKNOWN / NOT_PROVEN_STARTED** |

`TEST_START_EVIDENCE = UNKNOWN / IN_PREPARATION / CLOCK_NOT_PROVEN`.

If Releases shows Draft/Pending and there is no opt-in URL: the operator confirms whether a **v3** Closed Testing release was already created. Do **not** upload v4. Do **not** upload unverified v5. Do **not** create a new AAB to “start” the track. If a v3 Closed Testing release already exists, finish **Review release / Start rollout to Closed testing** on **that existing v3 artifact only** — and only if Console shows that artifact is already on the Closed Testing track. If no Closed Testing artifact exists, **stop and report**; do not upload from this Desktop.

Internal Testing v3 being live does **not** start the Closed Testing clock.

---

## 7 — How to record 12-testers / 14-days evidence

Copy this row when Console is actually open. Fill only observed values. Leave UNKNOWN if not seen.

```
EVIDENCE_DATE_TIME =
TRACK = CLOSED_TESTING_ALPHA
LIST_NAME = UMTUBA Closed Testers
LISTED_COUNT_SHOWN =          (email-list size on Testers — not the 12/14 number)
OPTED_IN_COUNT =              (Testers → Opted-in only)
OPT_IN_URL_VISIBLE = YES / NO
RELEASE_STATUS = PUBLISHED / DRAFT / PENDING / UNKNOWN
DATE_12_FIRST_HELD =          (calendar date Opted-in first stayed ≥12; blank if never)
DAYS_CONTINUOUS_AT_GE_12 =    (count only consecutive days; leave/rejoin does not stack)
BELOW_12_ANY_DAY = YES / NO
ACCOUNT_TYPE_CONFIRMED = PERSONAL_POST_2023-11-13 / ORG / OLDER_PERSONAL / UNKNOWN
DASHBOARD_APPLY_FOR_PRODUCTION_ENABLED = YES / NO   (read only — do not click)
```

Official ([14151465](https://support.google.com/googleplay/android-developer/answer/14151465)):

- ≥12 testers **opted-in** (not merely listed).
- Those 12 must have been opted-in for the **last 14 days continuously**.
- Leaving and rejoining does not stack non-consecutive days.
- Then **Apply for production** from the **Dashboard** — **do not click it before v5 device QA**.

| Gate | Value now |
|------|-----------|
| `TWELVE_GATE` | **UNKNOWN / UNPROVEN** |
| `FOURTEEN_DAY_GATE` | **NOT_PROVEN_STARTED** |
| Eligible on 12/14 alone | **NO** |
| Eligible even if 12/14 later proven | **NO** — Play binary is still v3; v5 not device-QA’d; UGC answers must stay honest NO; remaining Console cards open |

`EXTERNAL_TIME_GATE = YES`. This machine cannot advance the clock.

---

## 8 — Must NOT before v5 device QA

Do **not** do any of the following until a **verified** v5 binary has passed device QA and Central/A1 gives an explicit upload GO:

1. **Upload v4** (`V4_UPLOAD_ALLOWED = NO`; v4 AAB `37dde25f` is not a final candidate — own-delete absent).
2. **Upload unverified v5** (`V5_BUILD_STATUS = NOT_PERFORMED`; `V5_DEVICE_QA_READY = NO`; `DESKTOP_V5_BUILD_GO = NO`).
3. **Apply for production** (Dashboard). Also do not promote Internal → Production.
4. **Save UGC YES** (in-app report content / report users / block / Terms-before-create) while **v3** is the Play binary. Honest answers for the live binary: UGC present = YES; public UGC = YES; 1:1 messages = YES; report/block/terms = **NO**. A false YES is a policy violation ([9876937](https://support.google.com/googleplay/android-developer/answer/9876937)). Central apply of `20260928` is backend, not a Play binary.

Also do not: reopen Data Safety / App access / the three target-age boxes; generate a new upload key; enable Live; print tester emails.

Safe now (does not start 12/14 by itself; not required to finish this packet): send the existing opt-in URL to people already on the list; read Opted-in; save Ads = No / IARC honest-for-v3 / listing text without Safety claims — only if those cards are still open. Those cards are **not** this packet’s sequence.

---

## 9 — Production access

`PRODUCTION_ACCESS = NO`  
`PRODUCTION_ACCESS_ELIGIBLE = NO`

Blockers that remain even after a later Opted-in OCR of ≥12:

1. 14 continuous days at ≥12 opted-in **not proven**.
2. Current Play binary is **v3** (no in-app UGC tools).
3. v4 must not be uploaded. v5 is not built / not device-QA’d / not uploaded.
4. No explicit Central GO to upload any AAB or submit review.

---

## 10 — What this session did / did not

| Did | Did not |
|-----|---------|
| Read PROJECT_STATE + prior A2/A3 Closed Testing packets | Overwrite `CURRENT_TASK.md` |
| Re-fetch official 12/14 and closed-test setup pages | Invent opted-in, Day 1, or elapsed days |
| Confirm Cursor browser tabs empty | Open or save Play Console |
| Write this operator sequence for the existing list | Print tester emails; unique-count ~25 |
| Keep UGC answers honest NO for v3 | Upload v4 or v5; Apply for production; edit mobile |

`GOOGLE_PLAY_MUTATED = NO`  
`PRODUCT_CODE_CHANGED = NO`  
`CURRENT_TASK_WRITTEN = NO`  
`V4_UPLOAD_PERFORMED = NO`  
`V5_UPLOAD_PERFORMED = NO`

---

## STOP
