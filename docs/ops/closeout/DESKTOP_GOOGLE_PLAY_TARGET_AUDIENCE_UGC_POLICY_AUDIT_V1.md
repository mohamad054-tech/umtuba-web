# DESKTOP_GOOGLE_PLAY_TARGET_AUDIENCE_UGC_POLICY_AUDIT_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_RELEASE_OPERATOR  
**PRIORITY:** RELEASE_CRITICAL  
**MODE:** AUDIT_ONLY / EVIDENCE_BASED  
**DATE:** 2026-08-13  
**TASK_ID:** DESKTOP_GOOGLE_PLAY_TARGET_AUDIENCE_UGC_POLICY_AUDIT_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**VERSION_CODE:** `3`  
**TRACK (context):** CLOSED_TESTING_ALPHA  
**MOBILE:** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `fe14a34e7d5d10f8fd6fe2f1845e3bd81ffe2f99`  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1` @ `7ed9159f62d6a82d1999b19ef9d1df9a63c09de9`

This packet is an **audit only**. It tells the operator which Google Play **Target age** boxes to select for the current Android release, and whether UMTUBA currently satisfies Play UGC/social requirements for that audience. It does **not** select boxes in Console, rebuild, bump versionCode, upload an AAB, change policies, mutate product code, or enable Live.

No secrets. Reviewer password is not in this file.

---

## Verdict

| Field | Result |
|------|--------|
| AGE_5_AND_UNDER | **NOT_TARGET** |
| AGE_6_TO_8 | **NOT_TARGET** |
| AGE_9_TO_12 | **NOT_TARGET** |
| AGE_13_TO_15 | **TARGET** |
| AGE_16_TO_17 | **TARGET** |
| AGE_18_PLUS | **TARGET** |
| CHILDREN_TARGETED | **NO** |
| TEENS_TARGETED | **YES** |
| ADULTS_TARGETED | **YES** |
| SELECT_TARGET_AGE_BOXES | **[13–15, 16–17, 18 and over]** |
| DO_NOT_SELECT | **[5 and under, 6–8, 9–12]** |
| TARGET_AUDIENCE_OPERATOR_SELECTION_READY | **YES** |
| UGC_GOOGLE_PLAY_READY | **NO** |
| TARGET_AUDIENCE_STORE_CONSISTENT | **UNKNOWN** (legal/product consistent; Play listing not captured) |
| NEXT_SCREEN_EXPECTED | **App details** (then Ads → Store presence → Summary) |
| SAFE_TO_CONTINUE_TARGET_AUDIENCE_FLOW | **YES** (select the three TARGET boxes; answer later cards honestly; do not claim in-app UGC tools) |
| PRODUCT_CODE_CHANGED | **NO** |
| GOOGLE_PLAY_MUTATED | **NO** |
| NEW_AAB_REQUIRED | **NO** (v3 remains the candidate; implementing UGC tools later would require a new AAB) |
| VERDICT | **TARGET_AGE_READY / UGC_NOT_PLAY_READY** |

**Why not 18+ only:** Terms explicitly allow people under digital consent / majority to use the Service with parental permission. Privacy is titled “Children and teens” and is **not** an 18+ adult-only policy. Product is general social video (Watch / Create / Messages). Selecting only 18+ would be a false declaration to dodge Families questions.

**Why not children (5 / 6–8 / 9–12):** Privacy: *“UMTUBA is not directed at children who are too young to use social platforms under applicable law.”* Android ships public UGC + 1:1 Messages with **no** child mode, parental controls, or age gate. Play Families policy would apply if any under-13 box is selected ([Play target audience help](https://support.google.com/googleplay/android-developer/answer/9867159)); this binary is not Families-ready. Learning on the broader web platform is **not** the Android release audience.

---

## 0 — Repository state (pre-edit)

`git fetch --prune` on both repos. Already even with upstream. No merge / rebase / reset / stash / force.

### umtuba-web

- Branch: `office/profile-hero-completeness-v1` @ `7ed9159f62d6a82d1999b19ef9d1df9a63c09de9` = `origin/office/profile-hero-completeness-v1` (**0 ahead / 0 behind**)
- Dirty before this task: `docs/ai/*` from prior Android Play work + untracked `docs/ops/closeout/` and `worktrees/`
- This task: docs only

### umtuba-mobile

- Branch: `master` @ `fe14a34e7d5d10f8fd6fe2f1845e3bd81ffe2f99` = `origin/master` (**0 ahead / 0 behind**)
- Uncommitted (prior runtime-config rebuild; **kept, not modified this task**): `app.config.ts`, `eas.json`, untracked `release-artifacts/`
- PRODUCT_CODE_CHANGED = NO

Concurrent stream to preserve (not executed here): prior Android Play closeouts remain authoritative; any concurrent production-SSH AUTH_ENV provisioning must not be discarded.

---

## Authoritative prior closeouts (weaker than primary product evidence)

| Packet | Use here |
|--------|----------|
| `DESKTOP_ANDROID_PRODUCTION_RELEASE_GATE_AUDIT_V1` | Prior UGC product-gap inventory; Target audience was OPERATOR_CONFIRMATION_REQUIRED. Re-verified against source + live terms/privacy + official Play policy URLs. |
| `DESKTOP_ANDROID_INTERNAL_TEST_FINAL_CLOSEOUT_V1` | Watch / Discover / Messages / Create PASS on versionCode 3. Live INTENTIONALLY_UNAVAILABLE. |
| `DESKTOP_ANDROID_POST_INSTALL_QA_AND_LIVE_CREATE_GATE_V1` | Live fail-closed; Create contract. |
| `DESKTOP_GOOGLE_PLAY_REVIEW_ACCOUNT_PROVISION_V1` | Reviewer account provisioned; **password not reprinted**. App access / Login details completed per operator (this audit did not open Console). |

ANDROID_INTERNAL_TEST_CORE = CLOSED/PASS (given). No new AAB.

---

## Phase 1 — Product audience audit

### 1.1 Legal minimum age (live + source; match)

Live `https://umtuba.com/terms` matches `lib/legal/legalDocuments.ts` **Eligibility and age** (last updated **19 July 2026**):

> You must be able to form a binding agreement where you live to use UMTUBA.
>
> If you are under the age of digital consent or majority that applies where you live, you may use the Service only with permission and appropriate supervision from a parent or legal guardian, to the extent required by applicable law. Parents and guardians are responsible for monitoring a minor’s use of the Service.

There is **no numeric 13+ / 16+ / 18+ floor** in Terms. This audit does **not** invent one.

Live `https://umtuba.com/privacy` matches `PRIVACY_SECTIONS` id `children` (**Children and teens**):

> UMTUBA is not directed at children who are too young to use social platforms under applicable law. Do not create an account for a child below the minimum age required where you live.

That is a **children-not-directed** statement plus a jurisdiction-local social-platform minimum (commonly 13 in COPPA-style regimes). It is **not** an 18+ only product.

### 1.2 Signup / age gate / DOB

| Surface | Age / DOB / parental consent | Terms acceptance |
|---------|------------------------------|------------------|
| Android `app/(auth)/signup.tsx` versionCode 3 | Fields: full name, username, email, password, optional referral. **No** date of birth, age checkbox, or parental-consent UI. Subtitle: *“Create your account to watch, create, and earn.”* | **None** |
| Web `app/signup/SignupForm.tsx` | Same identity fields; **no** DOB / age gate | **Required** Terms + Privacy checkbox |
| Profiles / auth | No `date_of_birth` / `birth_date` columns found in product signup/profile paths searched | — |

Android can create an account and publish UGC without ever ticking Terms.

### 1.3 Current Android release scope (tabs shipped)

`umtuba-mobile/app/(tabs)/_layout.tsx`: **Watch, Discover, Create, Live, Messages**. Internal Testing CORE: Watch / Discover / Messages / Create UI + real upload + Create→Watch E2E **PASS**. Live INTENTIONALLY_UNAVAILABLE (out of Android production scope).

World / Rewards / Profile exist as extra routes. Learning, Store checkout, and Games are **not** primary Android tabs. Web Learning V1 being frozen does **not** make children the Android target.

Marketing (`app/welcome/page.tsx`): “social platform”, “Videos”, “creators”, “talent” — not child-directed, not 18+ adult-only.

Web ads (not shipped in this Android binary; no AdMob in `umtuba-mobile/package.json`): `lib/ads/constants.ts` `MIN_TARGET_AGE = 13`; `app/advertise/page.tsx` *“ages 13+”*. Supporting **product positioning** that advertising/audience floor is teen+, **not** a Terms numeric minimum and **not** Android ads.

### 1.4 Age-bracket table

| Bracket | Class | Evidence |
|---------|--------|----------|
| AGE_5_AND_UNDER | **NOT_TARGET** | Play: this group “includes children in most locales”; apps for this age are non-readers / parental-role toys ([9867159](https://support.google.com/googleplay/android-developer/answer/9867159)). Product is social UGC. Privacy: not directed at children too young for social platforms. |
| AGE_6_TO_8 | **NOT_TARGET** | Same. Play: children; “search feature” listed as often unsuitable. Android Discover exists. No early-education positioning. |
| AGE_9_TO_12 | **NOT_TARGET** | Play: children; apps “may not be suitable” if they “allow opportunity for direct interaction between users.” Android Messages + public Watch/Create **are** direct user interaction. Privacy not-directed-at-children. No child account / parental controls. |
| AGE_13_TO_15 | **TARGET** | Terms allow minors under majority/digital consent **with parental permission**. Privacy section **Children and teens** (teens acknowledged; children-too-young excluded). General social Watch/Create/Messages; signup not 18-gated. Ads copy 13+. Play: 13–15 may include children *in some locales* but is the first teen social bracket, not the Families under-13 set. |
| AGE_16_TO_17 | **TARGET** | Same minor-with-guardian clause; still under typical majority; general social product. |
| AGE_18_PLUS | **TARGET** | Binding-agreement sentence; adult creators/viewers are intended users of Watch/Create/Messages. Not exclusive. |

UNKNOWN is not used: Terms/privacy plus shipped social surfaces are sufficient for a hard call.

---

## Phase 2 — Children / teen / adult targeting

| Class | Result | Evidence |
|-------|--------|----------|
| CHILDREN_TARGETED | **NO** | Privacy not-directed-at-children. No child-directed landing copy. No child accounts, parental-consent UI, parental controls, or Families-ready mode. Android social UGC + DMs with no child mode is evidence **against** targeting children. Learning on web ≠ Android child education app. |
| TEENS_TARGETED | **YES** | Terms allow under-majority use with a parent/guardian. Privacy “Children and teens.” Product is general social media available to teens; ads floor 13+. Not teen-only marketing, but teens are an intended/permitted audience — not an accident of availability. |
| ADULTS_TARGETED | **YES** | Binding-agreement language; creator/social positioning; 18+ is a TARGET group alongside teens. |

Parental permission in Terms is a **legal condition for minors**, not a shipped parental-control product. No COPPA child-directed design found.

**Families policy readiness:** **NO** if under-13 boxes were selected. Play: any target age group that includes children must comply with [Families Policy Requirements](https://support.google.com/googleplay/android-developer/answer/9893335) (self-certified ads SDKs, possible mixed-audience neutral age screen, etc.). This app has no AdMob, no neutral age screen, no child UX. **Do not select 5 / 6–8 / 9–12.**

**Consequence of 18+ only:** Play allows Restrict Minor Access only when **18 and over is the sole** target age ([9867159](https://support.google.com/googleplay/android-developer/answer/9867159)). That would contradict Terms’ minor-with-guardian clause. Forbidden here as a convenience dodge.

**Consequence of including 13–15 / 16–17:** Families under-13 program typically **does not** attach from those boxes alone. Play still notes 13–15/16–17 “may be considered to include children in some locales.” UGC policy still applies (social/public UGC + 1:1 Messages) **regardless of age selection**. Later App details questions must not claim the app is designed for children.

---

## Phase 3 — UGC / social policy audit

Android versionCode 3 **is** a UGC app under Play’s definition: users publish videos (Create→Watch), profiles, likes/saves; Messages is 1:1. Physical CORE PASS.

Official Play policy cited (not invented):

- [User Generated Content](https://support.google.com/googleplay/android-developer/answer/9876937)
- [Understanding moderation / incidental sexual content](https://support.google.com/googleplay/android-developer/answer/12923286)
- [Account deletion / User data](https://support.google.com/googleplay/android-developer/answer/13327111)

Play UGC (social / publicly accessible UGC + 1:1):

1. Users must **accept Terms before they can create or upload UGC** (cannot be skipped).
2. Terms must define/prohibit objectionable content.
3. **In-app** report of content **and** users.
4. **In-app** block users (required for public UGC social apps **and** for 1:1 interaction).
5. Ongoing moderation / action on reports.
6. Incidental sexual content (if any) needs default filters + age screening — not evidenced as a designed feature here; no Android mature filter / DOB screen.

Play account deletion (separate User Data policy): if the app allows **in-app account creation**, provide an **in-app path** to request deletion **and** a **web** deletion resource. Alternative in-app path: a link **inside the app** to that web resource. Homepage is not sufficient unless deletion is prominently featured there.

### Per-control results

| Control | Result | Where it exists |
|---------|--------|-----------------|
| UGC_TERMS_ACCEPTANCE | **FAIL** | **Android-in-app:** signup has no Terms checkbox; Create has no accept gate. **Web:** `SignupForm` required checkbox. **Policy-document:** Terms “By creating an account… you agree.” Play requires non-skippable accept **before UGC create/upload** — Android fails that. Settings → Terms is post-login browse, not a gate. |
| UGC_REPORT_CONTENT | **FAIL** | **Android-in-app:** `WatchVideoCard` actions are Like / Save / Comments coming soon / Share coming soon — **no Report**. `watch.tsx` has none. **Web Watch:** no matching Watch-post report UI found. **Web Live:** `create_live_report` exists — Live is OUT_OF_SCOPE on Android. |
| UGC_REPORT_USER | **FAIL** | **Android-in-app:** none in Watch, Messages, Settings. **Web:** no `blocked_users` / `block_user` product tables found in this pass. |
| UGC_BLOCK_USER | **FAIL** | **Android-in-app:** Settings row *“Blocked users”* → *“Blocking is not available in this version.”* (`app/settings.tsx`). Messages: no block. |
| UGC_MODERATION | **FAIL** (user-facing Android) / **UNKNOWN** (ops) | Terms: we may remove content / suspend accounts. Store admin + Live reports exist on web/SQL. **No** Android moderation surface. **No** evidenced Watch-post report→action pipeline for this binary. |
| UGC_CONTENT_REMOVAL | **FAIL** (Android published posts) | Terms: operator may remove; “in-product controls where available.” Internal Testing: no published-post delete UI on Android. Failed Create uploads self-delete storage — not user moderation. |
| UGC_CONTACT_CHANNEL | **FAIL** (dedicated abuse) | **Android:** Settings Help/Contact/About open `https://umtuba.com` homepage (`src/lib/settings/supportLinks.ts`). Privacy/Terms: “contact method provided on UMTUBA.” **No** `app/contact` route. Legal tests forbid inventing `@umtuba.com`. Homepage is not an in-app abuse-report tool. |
| UGC_ABUSE_HANDLING | **FAIL** | No user report intake on Android → no evidenced timely action loop on reports. Terms allow suspension — policy-only, not an in-app handling path. |
| UGC_COMMUNITY_GUIDELINES | **PASS** | **Policy-document:** Terms **Community rules and prohibited content** (harassment, illegal content, CSAM/NCI, IP, malware, spam, unauthorized access). Reachable Android Settings → Terms → `https://umtuba.com/terms`. Not a separate “Community Guidelines” page. Play accepts ToU as the user policy. |
| ACCOUNT_DELETION | **FAIL** | **Android-in-app:** Account rows are Edit profile (unavailable), Change password, Sign out — **no** delete-account. **Web:** no delete-account UI found under `app/settings`. Terms: *“Where account deletion is available…”* (documents possible absence). Privacy: deletion **rights requests** via contact method. Play requires in-app path **or** in-app link to a **prominent** web deletion resource ([13327111](https://support.google.com/googleplay/android-developer/answer/13327111)). Homepage + vague contact line do not meet “prominently featured deletion pathway.” |
| PRIVACY_POLICY_COVERAGE | **PASS** | Live `https://umtuba.com/privacy`; `app/privacy/page.tsx`; Android Settings → Privacy Policy. Covers account, UGC, messages, device permissions, processors (Supabase, LiveKit), children/teens. Last updated 19 July 2026. Console URL field still operator. |

UGC_GOOGLE_PLAY_READY = **NO**

### REAL_POLICY_BLOCKERS

These are Play **policy** gaps for this **social UGC + messaging** binary. They are not Target-age-screen blockers. They **are** release blockers for a truthful UGC / Data-deletion declaration and for Play UGC + User Data policy compliance:

1. **ANDROID_IN_APP_REPORT_CONTENT_MISSING** — Play UGC: in-app report of objectionable content required for publicly accessible UGC / social apps.
2. **ANDROID_IN_APP_REPORT_USER_MISSING** — same policy: report users.
3. **ANDROID_IN_APP_BLOCK_USER_MISSING** — required for public UGC social apps **and** for 1:1 Messages; Android explicitly says blocking is unavailable.
4. **ANDROID_NO_MANDATORY_TERMS_ACCEPTANCE_BEFORE_UGC** — Play: accept ToU before create/upload; cannot be skipped. Android signup/Create have no gate (web checkbox is not this binary).
5. **ANDROID_ACCOUNT_DELETION_PATH_MISSING** — Play User Data: in-app account creation exists (`signup.tsx`); no in-app deletion path and no in-app link to a dedicated web deletion resource.

Not listed as Play blockers (insufficient local proof of Play reject, or out of scope): Live unavailable; comments/share “coming soon”; web-only Learning/Store; whether ops staff actually moderate off-app.

Implementing (1)–(5) would require a **future** AAB (versionCode 4). This audit does **not** rebuild. NEW_AAB_REQUIRED **today** = NO.

---

## Phase 4 — Store positioning consistency

| Artifact | Consistent with SELECT 13–15 + 16–17 + 18+? |
|----------|-----------------------------------------------|
| Terms / Privacy | **YES** — not child-directed; minors with guardian; not 18-only. |
| Android signup copy | **YES** — general “watch, create, and earn”; no kids/18+ claim. |
| Android tabs / UGC | **YES** for teen+adult social; **NO** for under-13 (DMs + public UGC). |
| Web welcome/marketing | **YES** — creators/talent/social; not preschool/child-education. |
| Web ads 13+ copy | **YES** as supporting positioning (ads not in this APK). |
| Play Main store listing / screenshots / IARC rating | **UNKNOWN** — no listing packet in repo (prior production-gate audit). Operator must ensure listing art is **not** child-appealing. Play may reject 13+ apps whose listing looks child-directed ([9867159](https://support.google.com/googleplay/android-developer/answer/9867159) “Apps primarily designed for children”). |

TARGET_AUDIENCE_STORE_CONSISTENT = **UNKNOWN** (Console listing not captured). Product/legal vs recommended ages are consistent. **Must not change** listing in this task.

If listing later uses youthful cartoon/child characters, either remove those assets or (wrongly) take Families — Families is **not** supported by this product. Fix listing, do not add under-13 boxes.

---

## Phase 5 — Google Play operator answer (current screen)

**Screen:** App content → Target audience and content → Target age  
**No box selected yet** (operator-given).

```
SELECT_TARGET_AGE_BOXES = [13–15, 16–17, 18 and over]
DO_NOT_SELECT = [5 and under, 6–8, 9–12]
TARGET_AUDIENCE_OPERATOR_SELECTION_READY = YES
```

Do not select 18+ alone. Do not select any under-13 box.

---

## Phase 6 — Next Play steps (guidance only; do not fabricate uninspected answers)

Play Target Audience flow ([9867159](https://support.google.com/googleplay/android-developer/answer/9867159)):

1. **Target age** ← current screen  
2. **App details**  
3. **Ads**  
4. **Store presence**  
5. **Summary**

NEXT_SCREEN_EXPECTED = **App details**

SAFE_TO_CONTINUE_TARGET_AUDIENCE_FLOW = **YES** — evidence is sufficient to complete **Target age** and proceed. Answer later cards from product truth. Do not invent App details / Ads / Store presence answers this machine has not seen.

Likely later questions (prepare, do not auto-fill Console):

| Step | Evidence-based guidance |
|------|-------------------------|
| App details (designed for children / appeals to children) | **Not** designed for children. Android is social UGC + Messages. If asked whether the app **appeals** to children, judge listing/screenshots (not captured here). Product copy is creator/social, not kids. |
| Ads (Families self-certified SDK / neutral age screen) | These Families ads questions typically attach when **children** are in the target. They should **not** attach from 13–15/16–17/18+ alone. Android `package.json` has **no** AdMob/ads SDK. Prior Ads Console declaration still OPERATOR_CONFIRMATION_REQUIRED. Do not claim ads if the binary does not serve them. |
| Store presence / Teacher Approved | Eligibility is for children / mixed children+older. **Not** applicable if under-13 boxes stay unchecked. |
| Separate card: User-generated content | **Do not** answer that in-app report/block exist. They do not. Completing Target Audience does **not** fix UGC_GOOGLE_PLAY_READY = NO. |
| Separate card: Account deletion / Data safety | **Do not** claim in-app deletion. It does not exist. Privacy URL `https://umtuba.com/privacy` is valid coverage of processing, not a deletion form. |

Selecting teens vs 18-only **does** change later Families/ads branching: including 13–15/16–17 is product-truth and should **not** open Designed-for-Families under-13 requirements; 18-only would open Restrict Minor Access and would be a **false** audience claim.

---

## Phase 7 — Constraints honored

- No product code, policy files, database, users, Google Play Console, Android build, versionCode, AAB, Live, or EAS changes.
- No commit / push / force / reset.
- No secrets.
- No Windows Desktop output. `_port_extract` not touched.
- Prior Android closeouts and any concurrent production-SSH AUTH_ENV work preserved.

PRODUCT_CODE_CHANGED = NO  
GOOGLE_PLAY_MUTATED = NO  
NEW_AAB_REQUIRED = NO  
FILES_CHANGED = docs listed in CURSOR_REPORT

---

## Operator next actions (read-only Console)

1. Select Target age: **13–15**, **16–17**, **18 and over**. Save/continue.
2. Complete App details / Ads / Store presence / Summary honestly.
3. Do **not** fill UGC or Account deletion forms as if Android had report/block/delete.
4. Closed Testing ≥12 testers / 14 days remains a separate production-access item.
5. Do not rebuild unless a later authorized product task implements UGC/deletion tools (then versionCode 4).
