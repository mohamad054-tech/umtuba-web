# DESKTOP_A3_CLOSED_TESTING_25_TESTERS_FINAL_RECON_V1

**DEVICE:** DESKTOP-A3  
**DEVICE_ROLE:** CLOSED_TESTING_25_TESTERS_FINAL_RECON  
**WAVE_ID:** DESKTOP_ANDROID_V5_BUILD_AND_PLAY_PREP_V6  
**MODE:** EVIDENCE_ONLY / NO_CONSOLE_WRITE / NO_V4_UPLOAD / NO_V5_UPLOAD / NO_APPLY_FOR_PRODUCTION  
**DATE:** 2026-08-14 (~19:15)  
**TASK_ID:** DESKTOP_A3_CLOSED_TESTING_25_TESTERS_FINAL_RECON_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**PLAY_BINARY_ON_STORE:** versionCode **3** (Internal Testing CORE). versionCode **4** local only / not uploaded. versionCode **5** not built / not device-QA’d.  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web`  
**MOBILE:** not modified.

This packet is the **final Desktop recon** of the operator-supplied Closed Testing tester set against live Play Console evidence. It does **not** print tester emails. It does **not** invent opted-in, start-date, or elapsed qualifying days. It does **not** upload v4 or v5. It does **not** Apply for production. It does **not** overwrite `docs/ai/CURRENT_TASK.md`.

`LISTED != INVITED != OPTED_IN != INSTALLED != SUPPLIED`.

Play Console was **not** reachable this session (tabs empty at start; tab create then navigate to `https://play.google.com/console` failed — view vanished / “No browser tab available” / “Browser view not found”). **No Testers OCR.** No Console field was saved. SMB `192.168.88.11` has **no** `net use` mapping this session. That does **not** imply Console access.

No secrets. Tester addresses are not reproduced. Reviewer / EAS / Store-QA mailboxes are not treated as Closed Testing testers.

Official rule (re-fetched this session ~19:15): [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465). Closed-test setup (re-fetched this session): [Set up an open, closed, or internal test](https://support.google.com/googleplay/android-developer/answer/9845334).

Prior packets reused (verify, do not invent):

- `docs/ops/closeout/DESKTOP_A3_CLOSED_TESTING_LIVE_STATE_RECONCILIATION_V2.md` (~19:09 — Console not reachable; clock not proven)
- `docs/ops/closeout/DESKTOP_A3_CLOSED_TESTING_OPERATOR_PACKET_V1.md` (click path)
- `docs/ops/closeout/DESKTOP_A2_PLAY_TESTER_25_RECONCILIATION_V1.md` (operator ~25 / ≥17; `LOCAL_LIST_FILE = NONE`)

---

## DESKTOP-A3 REPORT

```
DESKTOP-A3 REPORT
TASK_ID = DESKTOP_A3_CLOSED_TESTING_25_TESTERS_FINAL_RECON_V1
LISTED_COUNT = OPERATOR_STATED_APPROX_25 (2026-08-14) / PRIOR_OPERATOR_STATED_FLOOR_>=17 (2026-08-13). LOCAL_LIST_FILE = NONE. UNIQUE_VALID = UNKNOWN. NOT_INDEPENDENTLY_COUNTED. NOT_OCR.
OPTED_IN_COUNT = UNKNOWN
CLOSED_TESTING_ACTIVE = IN_PREPARATION / CLOCK_NOT_PROVEN / NOT_OCR_THIS_SESSION
START_DATE = UNKNOWN / NOT_PROVEN
QUALIFYING_DAYS = UNKNOWN / NOT_PROVEN_STARTED
TWELVE_TESTER_GATE = UNKNOWN / UNPROVEN
FOURTEEN_DAY_GATE = NOT_PROVEN_STARTED
PRODUCTION_ACCESS_ELIGIBLE = NO
OPERATOR_ACTION = Open Play Console → Test and release → Testing → Closed testing → Manage track (Alpha) → Testers. Confirm list “UMTUBA Closed Testers” is selected. Read Opted-in (not list count). Record LISTED_COUNT_SHOWN, OPTED_IN_COUNT, RELEASE_STATUS, OPT_IN_URL_VISIBLE, DATE_12_FIRST_HELD, DAYS_CONTINUOUS_AT_GE_12. If the opt-in URL is missing, the Closed Testing release is still Draft/Pending — do not upload v4/v5 to create it; confirm whether v3 is already published on this track. Copy the existing Closed Testing opt-in URL and send it only to people already on that list. Testers open it on the listed Google account and tap Become a tester. Stay opted in. Do not create a new list. Do not upload a CSV. Do not upload v4. Do not upload unverified v5. Do not Apply for production. Do not save UGC YES while v3 is the Play binary.
```

---

## Verdict

| Field | Result | Evidence class |
|-------|--------|----------------|
| Play Console this session (~19:15) | **NOT ACCESSIBLE** — tabs empty; create/navigate to Play Console failed; no Testers page | SESSION |
| Prior V2 (~19:09) | Console **not** reachable; same Testers page unread | PRIOR (verified) |
| Console write / save | **NO** | SESSION |
| Local address file | **NONE** | FILE HUNT this session |
| Unique / valid integer | **UNKNOWN** — cannot de-dupe without addresses | FILE |
| SMB `192.168.88.11` | **UNREACHABLE** (`net use` empty) | SESSION |
| Operator raw supplied | **~25** (2026-08-14) after floor **≥17** (2026-08-13) | OPERATOR (prior packets) |
| Listed on Console | OPERATOR **≥17** then **~25**. **Not OCR’d this session** | OPERATOR |
| Invited (opt-in link sent) | **UNKNOWN** | NO CONSOLE |
| Opted-in | **UNKNOWN** | NO CONSOLE — do not invent |
| Installed (Closed Testing) | **UNKNOWN** | NO CONSOLE |
| Qualifying start date | **UNKNOWN / NOT_PROVEN** | NO CONSOLE — list created 2026-08-13 is **not** Day 1 |
| Qualifying days | **UNKNOWN / NOT_PROVEN_STARTED** | Calendar age of the list is **not** opted-in days |
| 12 opted-in gate | **UNKNOWN / UNPROVEN** | OFFICIAL + NO CONSOLE |
| 14-day continuous gate | **NOT_PROVEN_STARTED** | OFFICIAL + NO CONSOLE |
| Production access | **NO** | Gates unproven + Play binary still v3 |

Do not treat 25 or ≥17 as opted-in. Do not treat list-creation calendar age as qualifying days. Do not invent OCR.

---

## 1 — Layers (do not collapse)

`LISTED != INVITED != OPTED_IN != INSTALLED != SUPPLIED`.

| Layer | Meaning | This session |
|-------|---------|--------------|
| **SUPPLIED** | Addresses the operator said were given to Desktop | OPERATOR **~25** (2026-08-14). File count **UNKNOWN**. |
| **LISTED** | Emails on Closed Testing list “UMTUBA Closed Testers” | OPERATOR **≥17** (2026-08-13 remaining-console). OPERATOR **~25** (2026-08-14 A2). **Not file-verified. Not Console-OCR this session.** |
| **INVITED** | Opt-in link actually sent | **UNKNOWN** |
| **OPTED_IN** | Testers who opened the join link and accepted. **This is the 12/14 number.** | **UNKNOWN** |
| **INSTALLED** | Testers who installed from Play Closed Testing | **UNKNOWN**. Internal Testing v3 device install is a **different** track and does **not** count. v4/v5 cannot be installed from Play (not uploaded). |

`LOCAL_LIST_FILE = NONE`. Unique / valid integer **cannot** be computed here.

---

## 2 — Tester-list hunt this session (addresses never printed)

Count / path / validity only. No address, local-part, or mailbox is written here.

| Location | Result |
|----------|--------|
| `umtuba-web/docs/ops/closeout` | Prior packets: counts only (`≥17`, `~25`). No address file. Name-hits are closeout markdown, not a list. |
| `umtuba-web/docs/ops/inbox` | **MISSING** |
| `umtuba-web/docs/ops/intake` | **MISSING** |
| `umtuba-web/intake` | **MISSING** |
| `umtuba-mobile/release-artifacts/store-listing/CLOSED_TESTING_OPERATOR.txt` | Procedure only. **email_like_count = 0**. |
| `umtuba-mobile/release-artifacts/store-listing/REVIEWER_INSTRUCTIONS.txt` | Ops/reviewer only. **email_like_count = 2**. **Not** the Closed Testing cohort. |
| `umtuba-mobile/release-artifacts/store-listing/CATEGORY.txt` | **email_like_count = 1**. **Not** a tester list. |
| Desktop top-level text-ish | One non-tester `.txt`. **unique_email = 0**. `_port_extract` not touched. |
| Desktop top-level name-match | **NONE** (tester / invite / closed / play-list). |
| Downloads top-level name-match | No tester / invite / closed-test file. Two `customers_export` CSVs: **unique_email = 1** each — **not** a ~25 Play list. |
| `Documents/UMTUBA` archive | Exists. Tester-named files: **NONE**. High-email hunt (≥8 unique) under text-ish files: **NONE**. |
| SMB `\\192.168.88.11` | **UNREACHABLE**. `NET_USE = empty`. |
| Cursor browser / Play Console | Tab create then navigate **failed**. **No OCR. No write.** |

`SUPPLIED_TESTERS` remains the **operator statements**, not a hashed local set. Do not invent `25` or `17` as a verified unique-valid integer.

Known operational mailboxes seen in locals / prior packets (counts only; **not** testers): Store QA **1**, Play reviewer env **1**, reviewer-instructions **2** unique. These are **not** the Closed Testing cohort.

---

## 3 — Operator count timeline (OPERATOR, not file, not Console OCR)

| When | Statement | Class |
|------|-----------|--------|
| 2026-08-13 ~15:23 | List “UMTUBA Closed Testers” created; **one** tester added; Alpha targeting; all available countries/regions selected | OPERATOR (prior A2) |
| 2026-08-13 ~22:56 | Closed Testing list has **at least 17** emails | OPERATOR (`DESKTOP_GOOGLE_PLAY_REMAINING_CONSOLE_CLOSEOUT_V1`) |
| 2026-08-14 ~15:25 | Operator has supplied **approximately 25** tester emails to Desktop | OPERATOR (A2 Closed Testing + tester-25 reconciliation) |
| 2026-08-14 (A3 V1 packet) | Use existing list. Console not reachable. Clock not proven. `PRODUCTION_ACCESS_ELIGIBLE = NO` | PRIOR A3 |
| 2026-08-14 ~19:09 (A3 V2) | Re-hunt + Console probe. List file **NONE**. Console **not** reachable. Counts **UNKNOWN** | PRIOR (verified this GO) |
| 2026-08-14 ~19:15 (this GO) | Final recon. List file still **NONE**. Console still **not** reachable. Counts stay **UNKNOWN** | SESSION |

`~25` is **raw supplied / operator-stated**, not unique-valid.  
`≥17` is a **listed** floor from 2026-08-13, not opted-in.

---

## 4 — Closed Testing track (no invented Console state)

This session did **not** open Play Console. Track facts below are prior operator + docs only. Anything not in that set is **UNKNOWN**.

| Item | Status | Class |
|------|--------|--------|
| Package | `com.umtuba.app` | FILE + prior packets |
| Track | Closed Testing **Alpha** | OPERATOR 2026-08-13 |
| List name | “UMTUBA Closed Testers” | OPERATOR |
| Countries / regions | All available selected | OPERATOR 2026-08-13 |
| List created | 2026-08-13 | OPERATOR — **not** qualifying start |
| Release published vs draft | **UNKNOWN** | No OCR |
| Opt-in URL visible | **UNKNOWN**. Pattern only (not fetched / not confirmed): `https://play.google.com/apps/testing/com.umtuba.app` | DOCS |
| Official opt-in-link rule | Link shows only when the Closed Testing release is **Published**. Draft / Pending publication = no link. First publish can take a few hours. | OFFICIAL (9845334, re-fetched) |
| v3 on Internal Testing | YES — prior CORE **CLOSED / PASS** | PRIOR |
| v4 / v5 on any Play track | **NO** | FILE + forbidden this wave |
| `CLOSED_TESTING_ACTIVE` | **IN_PREPARATION / CLOCK_NOT_PROVEN / NOT_OCR_THIS_SESSION** | OPERATOR + prior + this session |

Internal Testing v3 being live does **not** start the Closed Testing clock.

Developer account type (personal after 13 Nov 2023 vs Organization / older personal) = **OPERATOR_CONFIRMATION_REQUIRED** on Publishing overview. Do not assume exemption. Official 12/14 rule applies to personal accounts created after 13 November 2023.

---

## 5 — Official 12 / 14 rule (re-fetched this session)

Fetched 2026-08-14 ~19:15: [14151465](https://support.google.com/googleplay/android-developer/answer/14151465).

- Personal accounts created after **13 November 2023** must run a **closed** test with **≥12 testers opted-in for the last 14 days continuously**, then **Apply for production** from the Dashboard.
- Internal testers do **not** satisfy that rule.
- Leaving and rejoining does not stack non-consecutive days.
- This session can prove **none** of: Opted-in integer, date ≥12 first held, continuous days at ≥12, Dashboard Apply enabled.

| Field | Value now |
|-------|-----------|
| `START_DATE` / `QUALIFYING_START_DATE` | **UNKNOWN / NOT_PROVEN** — list created 2026-08-13 is **not** Day 1 of the official clock |
| Calendar age of the list | **~1 day** (2026-08-13 → 2026-08-14 evening). **Not** qualifying days |
| `QUALIFYING_DAYS` | **UNKNOWN / NOT_PROVEN_STARTED** |
| ≥12 opted-in now? | **UNKNOWN** |
| `TWELVE_TESTER_GATE` | **UNKNOWN / UNPROVEN** |
| `FOURTEEN_DAY_GATE` | **NOT_PROVEN_STARTED** |
| Eligible on 12/14 alone | **NO** (unproven) |
| Eligible even if 12/14 later proven | **NO** — Play binary is still v3; v5 not device-QA’d; UGC answers must stay honest NO; remaining Console cards open |

`EXTERNAL_TIME_GATE = YES`. This machine cannot start or advance the clock.

---

## 6 — Console this session (~19:15)

| Check | Result |
|-------|--------|
| Cursor browser tabs at start | **Empty** |
| Tab create | Created (`about:blank`, viewId `ffaa8f`) then view **vanished** |
| Navigate `https://play.google.com/console` (newTab) | **FAIL** — “No browser tab available. Please navigate to a page first.” |
| Navigate with viewId `ffaa8f` | **FAIL** — “Browser view not found” |
| Retry navigate newTab | **FAIL** — “No browser tab available” |
| Tabs after retries | **Empty** |
| Play Console opened | **NO** |
| Testers page OCR | **NO** |
| Opted-in integer collected | **NO — keep UNKNOWN** |
| Listed unique integer collected | **NO — keep OPERATOR ~25 / ≥17** |
| Any Console field saved | **NO** |
| v4 / v5 uploaded | **NO** |
| Apply for production | **NOT DONE** |

`GOOGLE_PLAY_MUTATED = NO`.  
If Console later opens, record only what the Testers page actually shows. Do not invent OCR.

---

## 7 — Exact operator screen path and fields (Console inaccessible)

Because Play Console is **not** reachable from this Desktop session, the operator must read these fields on the live Testers page. Do these steps in order. Stop after recording the evidence row. Do not add a new list. Do not upload an AAB. Do **not** upload v4 or v5 to create a missing opt-in URL.

**Path:** Play Console → **Test and release** → **Testing** → **Closed testing** → **Manage track (Alpha)** → **Testers**.

1. Open **Play Console** → app **UMTUBA** (`com.umtuba.app`).
2. **Test and release → Testing → Closed testing**.
3. Open the **Alpha** track → **Manage track** (do not Create a new closed track).
4. Open the **Testers** tab.
5. Confirm **“UMTUBA Closed Testers”** is the selected email list. If it is not selected, select that existing list and **Save changes**. Do not Create email list. Do not Upload CSV (CSV overwrite would replace the current list).
6. Read the **Opted-in** number. This is **not** the email-list membership count. Write it down (count only).
7. Read the **listed** membership count shown on Testers (email-list size). Write it down (count only). This is **LISTED**, not **OPTED_IN**.
8. Copy the **Closed testing opt-in URL** (shareable join link) if visible. Pattern only — do not treat as confirmed this session: `https://play.google.com/apps/testing/com.umtuba.app`.  
   Official: the opt-in link appears only when the Closed Testing release is **Published**. Draft / Pending publication = no link. If the link is missing, the test has **not** started for testers — see §8. Do **not** upload v4 or unverified v5 to “create” a link.
9. If **Opted-in < 12**: send that **existing** opt-in URL to people **already on** “UMTUBA Closed Testers”. Each person must:
   - open the URL while signed into the **listed** Google account (`@gmail.com` or Google Workspace);
   - tap **Become a tester** / **Accept**;
   - **stay opted in** (leave + rejoin does not stack non-consecutive days).
10. Record the evidence row in §9. Do **not** Apply for production. Do **not** open Production. Do **not** promote Internal → Production.

That is the only Console action that can start the 14-day clock. This machine cannot start it.

**Fields the operator must copy (counts / dates / status only — no emails):**

| Field | Where | Why |
|-------|-------|-----|
| `LISTED_COUNT_SHOWN` | Testers → email-list size | Membership. **Not** the 12/14 number. |
| `OPTED_IN_COUNT` | Testers → **Opted-in** | The 12-tester gate. Read this, not list count. |
| `OPT_IN_URL_VISIBLE` | Testers → shareable join link | YES only if Published. |
| `RELEASE_STATUS` | Closed testing → Releases | PUBLISHED / DRAFT / PENDING. |
| `DATE_12_FIRST_HELD` | Calendar + Opted-in history | Day 1 of the 14-day clock. Blank if never ≥12. |
| `DAYS_CONTINUOUS_AT_GE_12` | Calendar | Consecutive days only. |
| `BELOW_12_ANY_DAY` | Calendar | Leave/rejoin breaks the clock. |
| `ACCOUNT_TYPE_CONFIRMED` | Publishing overview | PERSONAL_POST_2023-11-13 / ORG / OLDER_PERSONAL. |
| `DASHBOARD_APPLY_FOR_PRODUCTION_ENABLED` | Dashboard (read only) | Do **not** click Apply. |

---

## 8 — How to verify test start (if opt-in URL is missing)

List creation (2026-08-13) is **not** test start. Emails added is **not** test start. Calendar age of the list is **not** elapsed opted-in days.

A Closed Testing test has started for the 12/14 rule only when **all** of the following are true. This session can prove **none** of them.

| Check | Where | Pass looks like | This session |
|-------|-------|-----------------|--------------|
| Alpha track exists | Closed testing | Track present (operator: yes) | OPERATOR; not OCR |
| Existing list selected | Testers | “UMTUBA Closed Testers” checked | OPERATOR; not OCR |
| Closed Testing **release** is Published | Closed testing → Releases | Status **Published** (not Draft / Pending). Official: opt-in link shows only when Published. | **UNKNOWN** |
| Opt-in URL visible | Testers | Copyable join link | **UNKNOWN** |
| ≥12 testers opted in | Testers → Opted-in | Integer ≥ 12 | **UNKNOWN** |
| Those 12 stayed opted in continuously | Testers + calendar | Date ≥12 first held, then 14 straight days with no drop below 12 | **UNKNOWN / NOT_PROVEN_STARTED** |

If Releases shows Draft/Pending and there is no opt-in URL: the operator confirms whether a **v3** Closed Testing release was already created. Do **not** upload v4. Do **not** upload unverified v5. Do **not** create a new AAB to “start” the track. If a v3 Closed Testing release already exists, finish **Review release / Start rollout to Closed testing** on **that existing v3 artifact only** — and only if Console shows that artifact is already on the Closed Testing track. If no Closed Testing artifact exists, **stop and report**; do not upload from this Desktop.

---

## 9 — How to record 12-testers / 14-days evidence

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

---

## 10 — Must NOT (still in force)

Do **not** do any of the following until a **verified** v5 binary has passed device QA and Central/A1 gives an explicit upload GO:

1. **Upload v4** (`V4_UPLOAD_ALLOWED = NO`; v4 AAB `37dde25f` is not a final candidate — own-delete absent).
2. **Upload unverified v5** (`V5_BUILD_STATUS = NOT_PERFORMED`; `V5_DEVICE_QA_READY = NO`; `DESKTOP_V5_BUILD_GO = NO`).
3. **Apply for production** (Dashboard). Also do not promote Internal → Production.
4. **Save UGC YES** (in-app report content / report users / block / Terms-before-create) while **v3** is the Play binary. Honest answers for the live binary: UGC present = YES; public UGC = YES; 1:1 messages = YES; report/block/terms = **NO**. A false YES is a policy violation ([9876937](https://support.google.com/googleplay/android-developer/answer/9876937)). Central apply of `20260928` is backend, not a Play binary.

Also do not: reopen Data Safety / App access / the three target-age boxes; generate a new upload key; enable Live; print tester emails; create a second list; upload a CSV over the existing list.

---

## 11 — Production access

`PRODUCTION_ACCESS_ELIGIBLE = NO`

Blockers that remain even after a later Opted-in OCR of ≥12:

1. 14 continuous days at ≥12 opted-in **not proven**.
2. Current Play binary is **v3** (no in-app UGC tools).
3. v4 must not be uploaded. v5 is not built / not device-QA’d / not uploaded.
4. No explicit Central GO to upload any AAB or submit review.

---

## 12 — What this session did / did not

| Did | Did not |
|-----|---------|
| Read PROJECT_STATE + V2 live-state + V1 operator packet + A2 tester-25 | Overwrite `CURRENT_TASK.md` |
| Re-fetch official 12/14 and closed-test setup pages | Invent opted-in, Day 1, or elapsed qualifying days |
| Re-hunt local / archive / Downloads / SMB for a supplied list (counts only) | Find or hash a local ~25-address file |
| Attempt Cursor Play Console tab (create + navigate + retry) | Open, OCR, or save Console |
| Write this final recon only | Print tester emails; unique-count ~25; upload v4/v5; Apply for production; edit mobile |

`GOOGLE_PLAY_MUTATED = NO`  
`PRODUCT_CODE_CHANGED = NO`  
`CURRENT_TASK_WRITTEN = NO`  
`V4_UPLOAD_PERFORMED = NO`  
`V5_UPLOAD_PERFORMED = NO`

---

## STOP
