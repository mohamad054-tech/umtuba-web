# DESKTOP_GOOGLE_PLAY_FINAL_PREP_V2

**DEVICE:** DESKTOP-A2  
**DATE:** 2026-08-15  
**TASK_ID:** DESKTOP_GOOGLE_PLAY_FINAL_PREP_V2  
**OWNER:** GOOGLE PLAY / CLOSED TESTING / NON-BINARY CLOSEOUT  
**PACKAGE:** `com.umtuba.app`  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web`  
**MOBILE (read-only):** `C:\Users\1\Desktop\umtuba\umtuba-mobile`

Central authorized **Play non-binary closeout**. Independent of the v6 binary. This session did **not** wait for v6. Did **not** roll out v5. Did **not** submit Production. Did **not** upload or rebuild any AAB.

`docs/ai/PROJECT_STATE.md`, `CURRENT_TASK.md`, `CURSOR_REPORT.md`, and `SESSION_HANDOFF.md` were **not** overwritten.

---

## Immediate return

```
PLAY_SETUP = PARTIAL / BLOCKED_CONSOLE_TAB (packets + source evidence ready; no Console field saved)
FULL_DESCRIPTION = PASTE_READY_NOT_SAVED (docs/ops/closeout/play-assets/PASTE_FULL_DESCRIPTION.txt)
AI_MEDIA_DECLARATION = STOPPED_LISTING_FORM_HUMAN_INPUT (in-app Jinn/UGC does not answer it)
APP_DASHBOARD_SETUP = UNKNOWN_REMAINING (operator prior: mandatory steps remain; not OCR)
APP_CONTENT = PARTIAL (Data Safety / reviewer access ALREADY_COMPLETE — do not reopen unless Console requires)
DATA_SAFETY = ALREADY_COMPLETE (do not reopen)
PRIVACY_POLICY = LIVE https://umtuba.com/privacy
ACCOUNT_DELETION_URL = LIVE https://umtuba.com/account-deletion
UGC_DECLARATIONS = HONEST_V5_YES_NOT_SAVED (do not use play-assets/PASTE_UGC.txt v3 NO)
TARGET_AUDIENCE = AGES_COMPLETE_REMAINDER_PASTE_READY (13–15 / 16–17 / 18+; remainder PASTE_TARGET_AUDIENCE_REMAINDER.txt)
COUNTRIES = CLOSED_TESTING_ALL_AVAILABLE_PRIOR (confirm only; PASTE_COUNTRIES.txt)
ADS_DECLARATION = NO_ADS_PASTE_READY (package.json has no ads SDK; PASTE_ADS.txt)
CONTENT_RATING = HONEST_V5_MODERATION_YES_NOT_SAVED (do not use play-assets/PASTE_IARC.txt v3 NO)
REVIEWER_ACCESS = ALREADY_COMPLETE (do not reopen unless Console requires; if it does, use v5-honest mobile REVIEWER_INSTRUCTIONS.txt — not PASTE_REVIEW_ACCESS_V3_HONEST.txt)
V5_ROLLED_OUT = NO
PRODUCTION_SUBMISSION = NO
OPERATOR_ACTION_REQUIRED = YES
BLOCKERS = YES (Cursor MCP cannot hold Play Console; listing AI-media origin undocumented)
CENTRAL_ACTION_REQUIRED = NO_FOR_THIS_NON_BINARY_CLOSEOUT (v6 AAB remains A3 after device PASS only — not this task)
```

`GOOGLE_PLAY_MUTATED = NO`.  
`CURRENT_V5_ALPHA_ROLLOUT = FORBIDDEN / HOLD`.  
Configured testers **25** ≠ opted-in / qualifying testers. Opted-in = **UNKNOWN**. 14-day eligibility = **NO** unless Play confirms.

---

## What this session actually did

| Action | Result |
|--------|--------|
| Scope | Non-binary Play setup only. No v5 rollout. No Production. No AAB. |
| Cursor MCP browser | `browser_tabs` list empty → navigate `https://play.google.com/console` **FAIL** (`No browser tab available`). Retry: `browser_tabs` new `viewId=f574f4` → lock-first **FAIL** (tab vanished). **STOP.** No third loop. |
| Official AI help | Fetched [14094294](https://support.google.com/googleplay/android-developer/answer/14094294) (in-app generative AI policy) and [9866151](https://support.google.com/googleplay/android-developer/answer/9866151) (preview assets). 9866151 does **not** print the listing AI-declaration question. Console form wording **not OCR’d**. |
| v5 shipping source | `822d893c78505d7db99e892190510cf202cbbc6d` `app.config.ts` `version: 1.0.0` / `versionCode: 5`. Matches A1 installed evidence. |
| Ads SDK | `umtuba-mobile/package.json` has **no** AdMob / google-mobile-ads / Audience Network / AppLovin / ironSource / Unity Ads. |
| UGC in v5 SHA | **Present.** `UgcSafetySheet` used from `watch.tsx` and `messages/[id].tsx`. Create has `ugcAck` + `canPublishWithUgcAck` + Terms checkbox. Settings has **Delete account**. |
| Listing chevron origin | Still **undocumented** (byte-copy / flatten only). Not guessed. |
| Console saves | **NONE.** |

---

## Two different AI questions (do not collapse)

### A — Store listing “AI-generated image/video” form (the review-error)

Operator-reported mandatory error: **Google Play AI-generated image/video declaration form is required.**  
Official preview-assets help ([9866151](https://support.google.com/googleplay/android-developer/answer/9866151)) covers icon / feature graphic / screenshots / preview video. It does **not** publish the declaration question text. This session could not open Console to OCR it.

This form is about **store-listing images/videos**, not in-app UGC and not Jinn.

| Listing asset | Origin evidence | Enough to answer Yes/No? |
|---------------|-----------------|--------------------------|
| `play-assets/icon-512x512.png` | Byte-identical `android-icon-foreground.png` (geometric chevron) | **NO** — copy step is not generative AI; original mark author/tool is undocumented |
| `play-assets/feature-graphic-1024x500.png` | Flatten of existing chevron / construction-grid graphic onto `#050510` | **NO** — flatten is not generative AI; original mark undocumented |
| Phone screenshots | **MISSING** (not fabricated) | N/A |
| Preview video | **NONE** | N/A |

In-app Jinn / product AI **does not answer** this form. Repo grep of closeouts found **no** Midjourney / DALL·E / Imagen / “AI-generated” attribution for the chevron.

**STOP only this field:**

```
SCREEN = Grow → Store presence → Main store listing → AI-generated image/video declaration
  (or the Closed Testing review-error that names that form)
FIELD = AI-generated image/video declaration for store listing assets
QUESTION_EXACT_WORDING = NOT_OCR’d this session. Official 9866151 does not print it.
  Operator-reported name = “Google Play AI-generated image/video declaration”.
  Typical Console shape (UNCONFIRMED — do not treat as OCR) = whether listing images/videos were generated by AI, with Yes/No.
OPTIONS = NOT_OCR’d. Open the form and record the real radios/checkboxes before clicking.
WHY_HUMAN_INPUT_REQUIRED = Listing-asset origin of the brand chevron is not documented as generative-AI or as human-designed. Guessing Yes or No would be a false declaration. Product UGC/Jinn is a different question.
EXACT_OPERATOR_ACTION =
  1. Chrome/Edge as Play developer → https://play.google.com/console → UMTUBA
  2. Grow → Store presence → Main store listing (or click the review error)
  3. Read the exact question. If it is ONLY about store-listing images/videos: answer from who made the original chevron (android-icon-foreground / construction-grid master). Yes only if generative AI produced/substantially generated a listing asset. No only if you know it did not.
  4. If the form is instead about in-app AI-generated content, do not use the chevron. See §B.
  5. Do not invent a new graphic to dodge the question. Do not roll out v5 from this card.
```

### B — In-app AI-Generated Content policy ([14094294](https://support.google.com/googleplay/android-developer/answer/14094294))

Official scope: apps that **generate** content with generative AI (chatbots, text-to-image, deepfake voice/video).  
Official **not** in scope: “Apps that merely host AI-generated content and are unable to create content using AI, such as social media apps that do not contain AI content generation features.” Those stay under the **UGC** policy.

Current **Android** shipping binary (v5 / `822d893`): social Watch / Discover / Create / Messages. Create uploads a **gallery** video + caption. No Jinn / generative image-video feature in that SHA (grep empty). Web AI hub flags remain default OFF and are not this Android binary.

If Console later shows an **App content** card “does this app generate content using AI” (separate from the listing form): honest answer for **current Android v5** is **NO** (social UGC host, no in-app generator). Do **not** fill that card unless it is actually shown. Do not use that answer on the **listing** form.

---

## UGC — honest for current Play binary (v5 uploaded, not rolled out)

Do **not** wait for v6. v6 is a PROFILE/FOLLOW source fix (A1 HOLD). UGC tools are already in v5 source `822d893`.

Do **not** paste `docs/ops/closeout/play-assets/PASTE_UGC.txt` (v3 NO). That would be a false declaration.

Use `umtuba-mobile/release-artifacts/store-listing/UGC_DECLARATION.txt` (written for the binary that implements the controls):

| Question | Honest v5 answer | Evidence in `822d893` |
|----------|------------------|------------------------|
| App contains UGC | **YES** | Watch / Create |
| Publicly accessible UGC | **YES** | Watch |
| 1:1 user interaction | **YES** | Messages |
| In-app report content | **YES** | `UgcSafetySheet` from `watch.tsx` |
| In-app report users | **YES** | Watch + `messages/[id].tsx` |
| In-app block users | **YES** | same |
| Terms before create/upload | **YES** | `create.tsx` `ugcAck` / `canPublishWithUgcAck` |
| In-app delete path | **YES** (opens web URL) | `settings.tsx` “Delete account” → `https://umtuba.com/account-deletion` |

Path: **Policy → App content → User-generated content**. Save only those answers. Do not submit Production from this card.

---

## Other non-binary cards (complete in Chrome/Edge; MCP cannot)

Do not reopen Data Safety or App access unless Console requires.

| Card | Verdict | Human click |
|------|---------|-------------|
| Full description | Paste-ready | **Grow → Store presence → Main store listing → Full description** → `play-assets/PASTE_FULL_DESCRIPTION.txt` (785/4000). Watch/Discover/Create/Messages/Account. Live not available. 13+. Privacy/Terms/Deletion URLs. Does not invent Safety marketing copy. |
| Short description | Paste-ready | Same screen → `PASTE_SHORT_DESCRIPTION.txt` (66/80) if empty. |
| Icon / feature | Local files ready | `icon-512x512.png` + `feature-graphic-1024x500.png` if slots empty. No fake screenshots. |
| Ads | **No ads** | **Policy → App content → Ads** → `PASTE_ADS.txt` → No. Confirmed no ads SDK in `package.json`. |
| Privacy policy | Live | Confirm `https://umtuba.com/privacy`. Do not change. |
| Account deletion | Live web | Skip if overview complete. Else `PASTE_ACCOUNT_DELETION.txt` → `https://umtuba.com/account-deletion`. In-app row exists in v5 and opens this URL. |
| Target audience remainder | Ages already 13–15 / 16–17 / 18+ | `PASTE_TARGET_AUDIENCE_REMAINDER.txt` / mobile `TARGET_AUDIENCE.txt`. Do not change ages. Not for children. No Teacher Approved. |
| Content declarations | All NO | `PASTE_CONTENT_DECLARATIONS.txt` |
| Countries | Confirm Closed Testing all-available | `PASTE_COUNTRIES.txt`. Do not create a Production track. |
| Content rating / IARC | Honest **v5** | **Do not** use `play-assets/PASTE_IARC.txt` (moderation NO for v3). Use `umtuba-mobile/release-artifacts/store-listing/CONTENT_RATING_IARC.txt` — moderation **YES**. Social Networking. No IAP. Do not retake to force Everyone. |
| Reviewer access | Already complete | Do not reopen. If Console forces a refresh: mobile `REVIEWER_INSTRUCTIONS.txt` (v5 tools). **Not** `PASTE_REVIEW_ACCESS_V3_HONEST.txt`. Password stays operator-local. |
| App signing | OCR only | `PASTE_APP_SIGNING.txt`. Do not generate a new upload key. |
| Dashboard leftover | Unknown | After the above, open **Dashboard / Publishing overview** and finish only cards still marked required. |

---

## Closed Testing — do not roll out v5

| Item | State |
|------|--------|
| Track | Alpha / Closed Testing |
| List | UMTUBA Closed Testers |
| Configured | **25** (listed only) |
| Opted-in / qualifying | **UNKNOWN** — do not report 25 as qualifying |
| v5 on track | Uploaded (operator + A1 SHA). **HOLD. Do not roll out.** |
| v6 AAB | Not this task. A3 after device PASS only. |
| Production | **NO. Do not Apply.** |

After non-binary cards save, **stop**. Do not click Roll out on the v5 Alpha release.

---

## Exact operator order (Chrome/Edge)

1. `https://play.google.com/console` → UMTUBA / `com.umtuba.app`
2. Full description → `PASTE_FULL_DESCRIPTION.txt` → Save
3. AI listing form → **you** answer from chevron origin (schema above). Agent will not click Yes/No.
4. Ads → No (`PASTE_ADS.txt`) if still open
5. UGC → v5 YES (`umtuba-mobile/release-artifacts/store-listing/UGC_DECLARATION.txt`) if still open
6. IARC → v5 moderation YES (mobile `CONTENT_RATING_IARC.txt`) if still open / unrated
7. Target audience remainder + content declarations + store settings if still open
8. Dashboard leftover cards only
9. **Do not** roll out v5. **Do not** Apply for production. **Do not** upload an AAB.

---

## Files

| File | Action |
|------|--------|
| `docs/ops/closeout/DESKTOP_GOOGLE_PLAY_FINAL_PREP_V2.md` | **This execution** (created) |
| `docs/ops/closeout/play-assets/OPERATOR_REMAINING_CLICKS_2026-08-15.txt` | Updated (v5 HOLD; UGC/IARC v5 YES; AI human stop) |
| `docs/ops/closeout/play-assets/PASTE_FULL_DESCRIPTION.txt` | Reused |
| `docs/ai/PROJECT_STATE.md` / `CURRENT_TASK.md` / `CURSOR_REPORT.md` / `SESSION_HANDOFF.md` | **Not overwritten** |

No commit. No push. No secrets. `_port_extract` not touched. Nothing written to the Windows Desktop.
