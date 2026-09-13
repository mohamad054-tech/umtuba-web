# DESKTOP_A2_PLAY_TESTER_25_RECONCILIATION_V1

**DEVICE:** DESKTOP-A2  
**DEVICE_ROLE:** ANDROID_GOOGLE_PLAY_PRIMARY  
**WAVE_ID:** DESKTOP_ZERO_IDLE_PLAY_CLOSEOUT_V3  
**MODE:** EVIDENCE_ONLY / NO_CONSOLE_WRITE / NO_V4_UPLOAD / NO_V5_UPLOAD / NO_EAS / NO_EMAIL_PRINT  
**DATE:** 2026-08-14  
**TASK_ID:** DESKTOP_A2_PLAY_TESTER_25_RECONCILIATION_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**PLAY_BINARY_ON_STORE:** versionCode **3** (Internal Testing CORE). versionCode **4** local only / not uploaded. versionCode **5** not built.  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web`  
**MOBILE (read-only; A1 owns v5 deposit):** `C:\Users\1\Desktop\umtuba\umtuba-mobile`

This packet reconciles the operator-supplied Closed Testing tester set against Google Play Console evidence. It does **not** print tester addresses. It does **not** invent opted-in counts. It does **not** upload v4 or v5. It does **not** EAS-build. It does **not** Apply for production. It does **not** overwrite `docs/ai/CURRENT_TASK.md` (A1 owns the v5 source deposit). It does **not** edit mobile product files.

No secrets. No `.env` values. Tester addresses are not reproduced anywhere in this file.

---

## DESKTOP-A2 REPORT

```
DESKTOP-A2 REPORT
TASK_ID = DESKTOP_A2_PLAY_TESTER_25_RECONCILIATION_V1
SUPPLIED_COUNT = OPERATOR_STATED_APPROX_25 (2026-08-14 ~15:25) + PRIOR_OPERATOR_STATED_FLOOR_>=17 (2026-08-13 ~22:56). LOCAL_LIST_FILE = NONE. NOT_INDEPENDENTLY_COUNTED.
UNIQUE_VALID_COUNT = UNKNOWN_NO_LOCAL_LIST
LIST_CONFIGURED = YES_OPERATOR — Closed Testing Alpha list “UMTUBA Closed Testers” (operator 2026-08-13). NOT_OCR_THIS_SESSION. NOT_SAVED_THIS_SESSION. CONSOLE_WRITE = NO.
INVITED_COUNT = UNKNOWN
OPTED_IN_COUNT = UNKNOWN
CLOSED_TESTING_ACTIVE = IN_PREPARATION / NOT_OCR_THIS_SESSION
QUALIFYING_START_DATE = UNKNOWN / NOT_PROVEN
QUALIFYING_DAYS_ELAPSED = UNKNOWN / NOT_PROVEN_STARTED
TWELVE_TESTER_GATE = UNKNOWN / UNPROVEN
FOURTEEN_DAY_GATE = NOT_PROVEN_STARTED
PRODUCTION_ACCESS_ELIGIBLE = NO
OPERATOR_ACTION_REQUIRED = YES
```

---

## Verdict

| Field | Result | Evidence class |
|-------|--------|----------------|
| Play Console this session | **NOT ACCESSIBLE** — Cursor browser tab create/navigate failed; no open Console tab; user Chrome window is not Play Console | SESSION |
| Console write / save | **NO** | SESSION |
| Local address file | **NONE** | FILE HUNT |
| Unique / valid integer | **UNKNOWN** — cannot de-dupe or validate without addresses | FILE |
| SMB `192.168.88.11` | **UNREACHABLE** (`net use` has no 88.11) | SESSION |
| Operator raw supplied | **~25** (2026-08-14) after floor **≥17** (2026-08-13) | OPERATOR |
| Listed on Console | OPERATOR **≥17** then **~25**. Not OCR’d this session | OPERATOR |
| Invited (opt-in link sent) | **UNKNOWN** | NO CONSOLE |
| Opted-in | **UNKNOWN** | NO CONSOLE |
| Installed / active (Closed Testing) | **UNKNOWN** | NO CONSOLE |
| 12 opted-in gate | **UNPROVEN** | OFFICIAL + NO CONSOLE |
| 14-day continuous gate | **NOT_PROVEN_STARTED** | OFFICIAL + NO CONSOLE |
| Production access | **NO** | GATES UNPROVEN + v3 on Play |

`INVITED != LISTED != OPTED_IN != INSTALLED`.  
Do not treat 25 or ≥17 as opted-in. Do not treat list-creation calendar age as qualifying days.

---

## 1 — Tester-list hunt (addresses never printed)

Count / validity / path only. No address, local-part, or mailbox is written here.

| Location | Result |
|----------|--------|
| `umtuba-web/docs/ops/closeout` | Prior packets: counts only (`≥17`, `~25`). No address file. |
| `umtuba-web/docs/ops/inbox` | **MISSING** |
| `umtuba-web/docs/ops/intake` | **MISSING** |
| `umtuba-web` gitignored locals (`.env.local`, `.env.store-qa.local`) | Store-QA / env only. **Not** a tester list. |
| `umtuba-mobile/release-artifacts/store-listing` | `CLOSED_TESTING_OPERATOR.txt` = procedure, **0** tester addresses. `REVIEWER_INSTRUCTIONS.txt` = reviewer/ops only (not a 25-list). |
| `umtuba-mobile` gitignored locals | Play-review env only. **Not** a tester list. |
| Desktop top-level files | **36** files. Name-hits are PDF / images, not a tester list. Text-ish top-level files scanned: **0** tester-list emails. `_port_extract` not touched. |
| Downloads top-level | Old umtuba zip stubs only. No tester / invite / closed-test file. |
| `Documents/UMTUBA` archive | Exists (`Desktop-Agent-Archive`, `Hetzner-Server`). Name-hits are Playwright / Stripe / worktree lists. **No** tester-address file. High-email hunt (≥8 unique) under 2026-08-13 archive: **NONE**. |
| Desktop `UMTUBA_ASSETS` / `DESKTOP_ALL_WORK_CENTRAL_SERVER_HANDOFF_V1` | No tester-named file. |
| SMB `\\192.168.88.11\{inbox,share,UMTUBA,umtuba}` | **UNREACHABLE**. `NET_USE_88_11 = NO_88_11`. |
| Agent transcripts | Email-like tokens exist. Union unique **gmail.com = 9**. Redacted context shows **Store E2E Auth users** (Jul 2026), not a Play Closed Testing paste of ~25. `example.com` / `example.invalid` / `umtuba.com` are fixtures or known ops accounts. **No pasted ~25-address block.** |
| Cursor browser / Play Console | Tab create then navigate **failed** (`No browser tab available` after `about:blank`). **No OCR. No write.** |

`LOCAL_LIST_FILE = NONE`.  
`UNIQUE_VALID_COUNT` cannot be computed. Do not invent `25` as a verified unique-valid integer. Do not invent `17` as unique-valid either — that was an operator floor on the Console list, not a hashed local set.

Known operational mailboxes seen in locals (counts only; not testers): Store QA **1**, Play reviewer env **1**, reviewer-instructions **2** unique. These are **not** the Closed Testing cohort.

---

## 2 — Operator count timeline (OPERATOR, not file, not Console OCR)

| When | Statement | Class |
|------|-----------|--------|
| 2026-08-13 ~15:23 | List “UMTUBA Closed Testers” created; **one** tester added; Alpha targeting; all available countries/regions selected | OPERATOR (prior A2 packet) |
| 2026-08-13 ~22:56 | Closed Testing list has **at least 17** emails | OPERATOR (`DESKTOP_GOOGLE_PLAY_REMAINING_CONSOLE_CLOSEOUT_V1`) |
| 2026-08-14 ~15:25 | Operator has supplied **approximately 25** tester emails to Desktop | OPERATOR (A2 Closed Testing closeout + this wave parent GO) |
| 2026-08-14 ~17:14 (this GO) | “Use the tester email list already supplied” | OPERATOR — list **not** found as a local file this session |

`SUPPLIED_COUNT` = those operator statements.  
`~25` is **raw supplied / operator-stated**, not unique-valid.  
`≥17` is a **listed** floor from 2026-08-13, not opted-in.

---

## 3 — Layers (do not collapse)

| Layer | Meaning | This session |
|-------|---------|--------------|
| **SUPPLIED / RAW** | Addresses the operator said were given to Desktop | OPERATOR **~25**. File count **UNKNOWN**. |
| **UNIQUE_VALID** | De-duped, format-valid set from a local file | **UNKNOWN_NO_LOCAL_LIST** |
| **LISTED / LIST_CONFIGURED** | Emails on Closed Testing list “UMTUBA Closed Testers” | YES_OPERATOR (list exists). Count OPERATOR **≥17** / **~25**. **Not OCR’d.** This session did **not** add or save addresses. |
| **INVITED** | Opt-in URL actually sent to listed people | **UNKNOWN** |
| **OPTED_IN** | Testers who opened the join link and accepted. **This is the 12/14 number** | **UNKNOWN** |
| **INSTALLED / ACTIVE** | Testers who installed from the Closed Testing track | **UNKNOWN**. Internal Testing v3 device install is a **different** track and does **not** count. v4/v5 cannot be installed from Play (not uploaded). |

Email-list membership ≠ invited ≠ opted-in ≠ installed.

---

## 4 — Closed Testing track (no invented Console state)

This session did **not** open Play Console. Track facts below are prior operator + docs only.

| Item | Status | Class |
|------|--------|--------|
| Package | `com.umtuba.app` | FILE + prior packets |
| Track | Closed Testing Alpha | OPERATOR 2026-08-13 |
| List name | “UMTUBA Closed Testers” | OPERATOR |
| Countries / regions | All available selected | OPERATOR 2026-08-13 |
| Release published vs draft | **UNKNOWN** | No OCR |
| Opt-in URL confirmed live | Procedure pattern only: `https://play.google.com/apps/testing/com.umtuba.app` — **not fetched / not confirmed** this session | DOCS |
| v3 on Internal Testing | YES — prior CORE | PRIOR |
| v4 / v5 on any Play track | **NO** | FILE + forbidden this wave |

`CLOSED_TESTING_ACTIVE = IN_PREPARATION / NOT_OCR_THIS_SESSION`.  
Do not claim a live closed test with opted-in testers.

---

## 5 — Official 12 / 14 rule (re-fetched this session)

Fetched 2026-08-14: [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465).

- Personal accounts created after **13 November 2023** must run a **closed** test with **≥12 testers opted-in for the last 14 days continuously**, then **Apply for production** from the Dashboard.
- Internal testers do **not** satisfy that rule.
- Leaving and rejoining does not stack non-consecutive days.
- Developer account type (personal post-2023-11-13 vs Organization / older personal) = **OPERATOR_CONFIRMATION_REQUIRED**. Do not assume exemption.

| Field | Value |
|-------|--------|
| `QUALIFYING_START_DATE` | **UNKNOWN / NOT_PROVEN** — list created 2026-08-13 is **not** Day 1 of the official clock |
| Calendar age of the list | **1 day** (2026-08-13 → 2026-08-14). **Not** qualifying days |
| `QUALIFYING_DAYS_ELAPSED` | **UNKNOWN / NOT_PROVEN_STARTED** |
| ≥12 opted-in now? | **UNKNOWN** |
| `TWELVE_TESTER_GATE` | **UNKNOWN / UNPROVEN** |
| `FOURTEEN_DAY_GATE` | **NOT_PROVEN_STARTED** |
| Eligible on the 12/14 rule alone | **NO** (unproven) |
| Eligible even if 12/14 later proven | **NO** this wave — Play binary is still v3; remaining Console cards open; no Apply GO |

---

## 6 — Console write this session

| Action | Result |
|--------|--------|
| Play Console opened | **NO** (Cursor browser navigate failed; no Console tab) |
| Testers page OCR | **NO** |
| Tester addresses pasted / saved | **NO** (no list file; no Console write access) |
| Any Console field saved | **NO** |
| v4 uploaded | **NO** (forbidden) |
| v5 uploaded | **NO** (not built; forbidden) |
| EAS build | **NO** (forbidden) |
| Apply for production | **NOT DONE** (forbidden) |

`GOOGLE_PLAY_MUTATED = NO`  
`LIST_CONFIGURED` this session = **NOT_SAVED**. Prior operator configuration of the named list is **not** re-claimed as a save performed here.

Prior wave already recorded Play Console as **not writable**. This session did not gain write access.

---

## 7 — Production access

`PRODUCTION_ACCESS_ELIGIBLE = NO`

Blockers that remain even if the operator later OCRs opted-in ≥12:

1. 14 continuous days at ≥12 opted-in **not proven** (`FOURTEEN_DAY_GATE = NOT_PROVEN_STARTED`).
2. Current Play binary is **v3** (UGC in-app report/block/terms absent on the store binary).
3. v4 is not a final candidate and is **not** uploaded. v5 is **not** built / not uploaded.
4. Remaining Console cards (Ads / IARC / listing graphics / TA remainder / app-signing OCR) not proven saved this session.
5. No explicit Central GO to Apply for production.

---

## 8 — What this session did / did not do

| Did | Did not |
|-----|---------|
| Hunt the supplied list (repo, gitignored locals, archive, Downloads top-level, Desktop top-level, SMB, transcripts) | Find or hash a local ~25-address file |
| Count-only / domain-only scans (no addresses printed) | Treat Store E2E gmail fixtures as Play testers |
| Re-fetch official 12/14 policy | Invent unique-valid, invited, opted-in, or qualifying days |
| Attempt Cursor Play Console tab | Open, OCR, or save Console |
| Write this packet only | Overwrite `CURRENT_TASK.md`; edit mobile; commit / push; upload v4/v5; EAS; Apply for production |

`PRODUCT_CODE_CHANGED = NO`  
`CURRENT_TASK_WRITTEN = NO`  
`V4_UPLOAD_PERFORMED = NO`  
`V5_UPLOAD_PERFORMED = NO`  
`AAB_BUILT = NO`

---

## 9 — NEXT_SINGLE_OPERATOR_ACTION

1. Place the supplied tester addresses in a **local file inside the repo** (`docs/ops/intake/` — gitignored if needed) **or** open Play Console yourself. Do not put the list on the Windows Desktop.
2. Open **Play Console → Test and release → Testing → Closed testing → Testers**.
3. Write down **Opted-in** (not the email-list count) and the date ≥12 first stayed opted in.
4. If opted-in &lt; 12: send the existing Closed testing opt-in URL to people **already** on “UMTUBA Closed Testers”. They must open it on the listed Google account and tap Become a tester. Stay opted in.
5. Do **not** upload v4. Do **not** upload v5. Do **not** Apply for production.

Then STOP.
