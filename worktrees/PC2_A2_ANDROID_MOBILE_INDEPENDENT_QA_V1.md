# PC2-A2 — ANDROID / MOBILE INDEPENDENT QA V1

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = INDEPENDENT_RELEASE_QA / POST_RELEASE_QA
AGENT_ID = PC2-A2
WAVE_ID = PC2_POST_RELEASE_INDEPENDENT_QA_V1
TASK_ID = PC2_ANDROID_MOBILE_INDEPENDENT_QA_V1
REPORT_TYPE = ANDROID_MOBILE_INDEPENDENT_QA + ACCEPTANCE_CONTRACT
TIMESTAMP_LOCAL = 2026-08-13 01:30 +03
MODE = EXECUTE / INDEPENDENT_QA (NO IMPLEMENTATION / NO AAB / NO PLAY PUBLISH)
FEATURE_EXPANSION = FORBIDDEN
ANDROID_PROJECT_CREATED = NO
COMPETING_ANDROID_PROJECT = NO
AAB_CREATED = NO
GOOGLE_PLAY_UPLOAD = NOT_ATTEMPTED
GOOGLE_PLAY_PUBLISH = NOT_ATTEMPTED
SECRET_VALUES_PRINTED = NO
SIGNING_SECRETS_EXPOSED = NO
PRODUCT_CODE_CHANGED = NO
COMMIT_CREATED = NO
PUSHED = NO
WORKSPACE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1
WORKSPACE_BRANCH = office/platform-translation-trunk-port-v1
WORKSPACE_HEAD = 1c5ae0bd0266029f264cab866744c7fcde25cc2e
SEARCH_ROOT = C:\Users\Giga store\Desktop\umtuba\
LOCKED_PACKAGE_WHEN_EVIDENCE = com.umtuba.app
DESKTOP_OWNS_ANDROID_IMPLEMENTATION = YES
PC2_MUST_NOT_DUPLICATE_IMPLEMENTATION = YES
```

---

## REQUIRED FINALS (machine-readable)

```text
ANDROID_ACCEPTANCE_CONTRACT_READY = YES
ANDROID_CURRENT_QA_STATE = NATIVE_PROJECT_ABSENT_NOT_RELEASE_READY
ANDROID_RELEASE_BLOCKERS = [
  NATIVE_ANDROID_PROJECT_ABSENT,
  PACKAGE_APPLICATION_ID_com.umtuba.app_ABSENT_IN_TREE,
  GRADLE_WRAPPER_ABSENT,
  JDK_GRADLE_TOOLCHAIN_ABSENT_ON_PC2_PATH,
  SIGNING_CONFIG_ABSENT,
  KEYSTORE_REF_ABSENT,
  PLAY_INTEGRITY_ABSENT,
  VERSION_CODE_NAME_ABSENT,
  AAB_APK_ARTIFACT_ABSENT,
  ANDROID_APP_LINKS_assetlinks.json_404,
  AUTH_CALLBACK_REDIRECT_HOST_POINTS_TO_localhost:3001,
  NATIVE_REQUIREMENT_HISTORICALLY_NO,
  CENTRAL_NATIVE_GO_NOT_CONFIRMED,
  DESKTOP_ANDROID_ARTIFACT_DELIVERY_ABSENT_THIS_WAVE,
  PLAY_UPLOAD_AUTHORIZATION_ABSENT
]
GOOGLE_PLAY_PRECONDITIONS = [
  CENTRAL_AUTHORIZE_NATIVE_PLAY_SCOPE,
  DESKTOP_DELIVER_NATIVE_PROJECT_applicationId_com.umtuba.app,
  RELEASE_VARIANT_PLUS_VERSION_CODE_NAME,
  SIGNING_CONFIG_AND_KEYSTORE_CUSTODY_OPERATOR,
  PLAY_APP_SIGNING_ENROLLMENT_OPERATOR,
  PLAY_INTEGRITY_WIRING_WHEN_IN_SCOPE,
  SIGNED_AAB_FROM_AUTHORIZED_BUILDER,
  ASSETLINKS_JSON_200_WITH_VALID_STATEMENTS,
  PROD_AUTH_CALLBACK_HOST_NOT_LOCALHOST,
  PLAY_CONSOLE_APP_SETUP_OPERATOR_RECEIPT,
  INTERNAL_TESTING_TRACK_AND_TESTER_LIST,
  STORE_LISTING_ASSETS_AND_COPY,
  DATA_SAFETY_AND_CONTENT_RATING_OPERATOR,
  PRIVACY_TERMS_WEBSITE_URLS_BOUND_IN_CONSOLE,
  EXPLICIT_GO_BEFORE_ANY_PRODUCTION_TRACK_PUBLISH
]
```

---

## 1. Scope / ownership locks (this wave)

| Lock | Value |
| --- | --- |
| Desktop owns Android implementation | **YES** — PC2 verifies only |
| PC2 may create Android project / competing tree | **NO** |
| Create AAB / assemble / bundleRelease | **NO** |
| Google Play publish / Internal upload | **NO** |
| Secrets / keystore invent | **NO** |
| Reopen locked web release gates | **NO** |
| Package identity when evidence exists | `com.umtuba.app` (locked target; **not** present in tree) |

Mobile remains a **SEPARATE_POST_RELEASE_TRACK**. Android/Play do **not** block current whole-project web release (prior A2/A3 classification revalidated).

---

## 2. Evidence consumed / revalidated

| Source | Role | This-run status |
| --- | --- | --- |
| Prior PC2-A2 Android closeout | `worktrees/PC2_A2_ANDROID_PRODUCTION_BACKEND_RELEASE_CLOSEOUT_V1.md` (SHA256 `BF44DC98108F3FB04565EEDAACCC4330209DA6A98E0A10677A87CD4846F50E14`) | Revalidated — native still ABSENT |
| AI/Games/Mobile arch review | Desktop `worktrees/UMTUBA_AI_GAMES_MOBILE_INDEPENDENT_ARCHITECTURE_REVIEW_V1_REPORT.md` (SHA256 `EE95158D08C7560AEDBB5E472674236D4C4EE7E1D27D970340C4C607F0B0800F`) | `NATIVE_REQUIREMENT=NO` still authoritative historical product stance |
| Alpha tip worktree | `worktrees/PC2-A1-UMTUBA-AI-GAMES-MOBILE-ARCH-REVIEW-V1` @ `e7b6fe8b08041d3cfb04a3a7966dc9f091ed1778` | `platforms/` = **core only**; `platforms/mobile` ABSENT |
| A3 Mobile post-release map | `worktrees/PC2_A3_MOBILE_POST_RELEASE_CLOSEOUT_MAP_V2.md` | Future Android requirements map — not implementation |
| A3 Play path | `worktrees/PC2_A3_GOOGLE_PLAY_FINAL_RELEASE_PATH_V1.md` | Internal/Production Play NOT ready |
| Desktop delivery this wave | OUTBOX + Desktop `umtuba` Android markers | **NO** native project / AAB / applicationId tree delivered |

### Desktop `umtuba` CURRENT marker scan (2026-08-13)

| Marker | Count / state |
| --- | --- |
| Top dirs under Desktop `umtuba` | `umtuba-web-translation-sot`, `umtuba-web-translation-trunk-port-v1`, `worktrees` (+ one lineage md) |
| `android/`, `apps/mobile`, `platforms/mobile`, `mobile/`, `capacitor/` | **ABSENT** at search root |
| `AndroidManifest.xml` (depth≤3) | **0** |
| `settings.gradle*` | **0** |
| `gradlew*` | **0** |
| `*.aab` / `*.apk` | **0** |
| `google-services.json` | **0** |
| `capacitor.config.*` | **0** (glob) |
| `com.umtuba.app` in translation product tree (excl. worktrees docs) | **ABSENT** (only unrelated Store `applicationId` UUID helpers) |
| `java` / `gradle` on PATH | **ABSENT** |

**Verdict vs prior PC2 evidence:** Prior claim `NATIVE_ANDROID_PROJECT_ABSENT` is **STILL TRUE**. No Desktop Android artifact arrived for immediate consume/verify during this wave.

---

## 3. Production probe (read-only; no Play)

| URL | Status | Notes |
| --- | --- | --- |
| `https://umtuba.com/` | **200** | len≈49524 — prod front door LIVE |
| `https://umtuba.com/login` | **200** | |
| `https://umtuba.com/manifest.webmanifest` | **200** | len≈461 — web PWA metadata only |
| `https://umtuba.com/privacy` | **200** | Play URL class cleared |
| `https://umtuba.com/terms` | **200** | Play URL class cleared |
| `https://umtuba.com/.well-known/assetlinks.json` | **404** | App Links SoT missing |
| `https://umtuba.com/auth/callback` | **307** → `https://localhost:3001/login?error=...invalid+or+has+expired...` | Production OAuth return host **wrong** |
| `https://umtuba.com/auth/callback?code=probe` | **307** → `https://localhost:3001/login?error=...could+not+be+verified...` | Same localhost host defect |
| TLS | OK | CN=`umtuba.com`; Let's Encrypt YE1; Effective 2026-08-12; Expires 2026-11-10 |

Historical **WAITING_EXTERNAL_SERVER** hosting class remains **CLEARED**. Remaining Mobile/Android issues are TECHNICAL / OPERATOR / CENTRAL GO — not “server down.”

---

## 4. ANDROID_ACCEPTANCE_CONTRACT (independent QA)

Contract is **READY** for Desktop delivery verification. Passing requires **all** must-pass items below when Desktop delivers artifacts. PC2 will consume and independently verify immediately upon delivery; PC2 will not implement.

### 4.1 Identity & structure

| ID | Requirement | Must-pass evidence |
| --- | --- | --- |
| A-ID-1 | Authoritative `applicationId` / package = `com.umtuba.app` | Gradle/module + manifest package match; no conflicting package |
| A-ID-2 | Single authorized Android project tree (Desktop-owned path) | Project root with `settings.gradle*` + app module; no competing PC2 scaffold |
| A-ID-3 | Framework declared (Capacitor / RN / Flutter / native) | Explicit Desktop handoff stamp + matching tree |

### 4.2 Production backend / HTTPS / API

| ID | Requirement | Must-pass evidence |
| --- | --- | --- |
| A-BE-1 | Prod API/base URL points at public HTTPS origin (not localhost) | Config/source stamp + runtime build config review |
| A-BE-2 | TLS to prod host valid | Independent probe (as this report) remains green |
| A-BE-3 | Production API compatibility for shipped client surface | Desktop compatibility matrix + PC2 smoke against prod (read-only / authorized fixtures only) |
| A-BE-4 | Auth callback production host ≠ loopback | Live `GET /auth/callback` Location host = `umtuba.com` (or approved public host) |

### 4.3 Auth / deep links / App Links

| ID | Requirement | Must-pass evidence |
| --- | --- | --- |
| A-LINK-1 | Intent filters / App Links for approved hosts | Manifest + Desktop deep-link map |
| A-LINK-2 | `/.well-known/assetlinks.json` served 200 | JSON with package `com.umtuba.app` + matching cert fingerprints (PRESENT reporting; no secret material) |
| A-LINK-3 | OAuth / magic-link return path works on device/emulator under Internal test | Desktop test receipt + PC2 independent recheck when authorized |

### 4.4 Permissions

| ID | Requirement | Must-pass evidence |
| --- | --- | --- |
| A-PERM-1 | Manifest permissions match CENTRAL-scoped features only | Diff vs feature scope; no unexplained dangerous perms |
| A-PERM-2 | Runtime permission UX for dangerous perms (if any) | Desktop QA notes + PC2 spot-check |

### 4.5 Release build / versioning / signing

| ID | Requirement | Must-pass evidence |
| --- | --- | --- |
| A-REL-1 | Release variant configured | `buildTypes.release` (or equivalent) present |
| A-REL-2 | Monotonic `versionCode` + human `versionName` | Values documented in Desktop handoff |
| A-REL-3 | `signingConfigs` named; keystore ref PRESENT (outside Git) | PRESENT/ABSENT only — no passwords/paths with secrets printed |
| A-REL-4 | Signed AAB produced by authorized builder | Artifact hash + package/version stamps (PC2 verifies; PC2 does not create) |

### 4.6 Play Integrity / Internal Testing

| ID | Requirement | Must-pass evidence |
| --- | --- | --- |
| A-PI-1 | Play Integrity (or approved equivalent) wired if CENTRAL requires it | SDK/config stamps + Desktop verification notes |
| A-IT-1 | Internal Testing prerequisites met | Console operator receipt: app setup, App Signing, Internal track, testers — PC2 does not invent Console state |
| A-IT-2 | Install/launch/auth/core-flow on Internal track | Desktop + PC2 independent acceptance after upload auth |

### 4.3 Contract status stamp

```text
ANDROID_ACCEPTANCE_CONTRACT_READY = YES
ANDROID_ACCEPTANCE_PASS = NO
REASON_NOT_PASS = NATIVE_PROJECT_AND_DELIVERABLES_ABSENT
NEXT_CONSUME_TRIGGER = DESKTOP_ANDROID_ARTIFACT_HANDOFF_ON_SEARCH_ROOT
```

---

## 5. ANDROID_CURRENT_QA_STATE (audit matrix)

| Audit item | CURRENT state | Class |
| --- | --- | --- |
| Project structure | **ABSENT** | TECHNICAL |
| Prod backend (generic HTTPS) | **LIVE** | SERVER — CLEARED as hosting |
| Prod backend (Android-configured) | **N/A** (no client) | TECHNICAL |
| HTTPS | **OK** | SERVER — CLEARED |
| Auth / deep / App Links | Callback → **localhost:3001**; assetlinks **404** | OPERATOR / TECHNICAL |
| Permissions | **N/A** | TECHNICAL |
| Release build | **NOT POSSIBLE** (no project) | TECHNICAL |
| versionCode / versionName | **ABSENT** | TECHNICAL |
| Signing readiness | **ABSENT** | OPERATOR / TECHNICAL |
| AAB | **ABSENT** | TECHNICAL |
| Play Integrity | **ABSENT** | TECHNICAL |
| Internal Testing prerequisites | **NOT_CONFIRMED** (no Console receipt; no AAB) | OPERATOR / GOOGLE_PLAY_CONSOLE |
| Production API compatibility (Android client) | **N/A** | TECHNICAL |
| Desktop artifact delivery this wave | **ABSENT** | PROCESS |
| Historical `NATIVE_REQUIREMENT` | **NO** | SCOPE / CENTRAL |

```text
ANDROID_CURRENT_QA_STATE = NATIVE_PROJECT_ABSENT_NOT_RELEASE_READY
ANDROID_CODE_READY = NO
ANDROID_PRODUCTION_BACKEND_READY = NO
ANDROID_RELEASE_BUILD_READY = NO
ANDROID_SERVER_HOSTING_BLOCKERS_CLEARED = YES
DESKTOP_ANDROID_DELIVERY_CONSUMED = NO (nothing to consume)
GOOGLE_PLAY_PUBLISH = NOT_ATTEMPTED
```

---

## 6. ANDROID_RELEASE_BLOCKERS

Ordered for Desktop/Central/Operator owners (PC2 = verify only):

1. **CENTRAL** — Confirm native Play program in scope (overrides historical `NATIVE_REQUIREMENT=NO`) or keep native FUTURE / out-of-scope.
2. **DESKTOP** — Deliver authorized Android project with `applicationId=com.umtuba.app` (no PC2 duplicate).
3. **DESKTOP** — Release variant + versionCode/versionName + permissions + backend/auth/deep-link wiring.
4. **OPERATOR** — Keystore custody + signingConfigs refs (secrets never in Git); Play App Signing enrollment.
5. **DESKTOP + OPERATOR** — Signed AAB from authorized builder (PC2 verifies hashes/stamps only).
6. **OPERATOR** — Serve `assetlinks.json` 200 with valid statements for `com.umtuba.app`.
7. **OPERATOR** — Deploy auth-callback origin fix so live Location host is not `localhost:3001`.
8. **OPERATOR / CENTRAL** — Play Integrity decision + wiring if required.
9. **OPERATOR** — Play Console Internal Testing setup + tester list + listing/policy forms (receipts).
10. **CENTRAL** — Explicit GO before any Production track publish (Internal Testing first).

---

## 7. GOOGLE_PLAY_PRECONDITIONS

```text
GOOGLE_PLAY_TECHNICAL_READY = NO
GOOGLE_PLAY_INTERNAL_TEST_READY = NO
GOOGLE_PLAY_PRODUCTION_SUBMISSION_READY = NO
GOOGLE_PLAY_PRODUCTION_PUBLISH = NOT_AUTHORIZED
```

### Preconditions checklist (must hold before Internal Testing honesty)

| # | Precondition | CURRENT |
| --- | --- | --- |
| 1 | Central authorize native Play scope | NOT_CONFIRMED |
| 2 | Desktop native project `com.umtuba.app` | ABSENT |
| 3 | Release + version stamps | ABSENT |
| 4 | Signing + Play App Signing | ABSENT / NOT_CONFIRMED |
| 5 | Play Integrity (if required) | ABSENT |
| 6 | Signed AAB | ABSENT |
| 7 | assetlinks.json 200 | **404** |
| 8 | Auth callback non-localhost | **FAIL** (localhost:3001) |
| 9 | Console app setup receipt | NOT_CONFIRMED on PC2 |
| 10 | Internal track + testers | NOT_CONFIRMED — do not fabricate |
| 11 | Store listing assets/copy | ABSENT on PC2 |
| 12 | Data safety / content rating (operator attest) | OPEN — PC2 does not attest |
| 13 | Privacy/terms/website URLs | **LIVE** (URL class cleared; Console binding OPERATOR) |
| 14 | Production track publish GO | **NOT_AUTHORIZED** |

Cleared server-URL class (do not re-open as WAITING_EXTERNAL_SERVER): public HTTPS origin, privacy URL, terms URL, website URL, partial webmanifest.

---

## 8. What this task did / did not do

| Action | Status |
| --- | --- |
| Establish Android acceptance contract | **DONE** (`ANDROID_ACCEPTANCE_CONTRACT_READY=YES`) |
| Revalidate native project absence on Desktop `umtuba` | **DONE** (still ABSENT) |
| Probe prod HTTPS / assetlinks / auth callback | **DONE** (read-only) |
| Consume Desktop Android artifacts this wave | **N/A** — none delivered |
| Create Android project / AAB | **NOT DONE** (forbidden) |
| Publish Google Play | **NOT DONE** (forbidden) |
| Duplicate Desktop implementation | **NOT DONE** (forbidden) |

---

## 9. Exact files changed

| Path | Action |
| --- | --- |
| `worktrees/PC2_A2_ANDROID_MOBILE_INDEPENDENT_QA_V1.md` | Created (this report) |
| `docs/ai/CURSOR_REPORT.md` | Updated for this task handoff |

---

## 10. Open issues / next owners

1. **CENTRAL** — Native Play scope GO (or formal keep-FUTURE).
2. **DESKTOP** — Only authorized implementer for Android project + AAB.
3. **OPERATOR** — Auth callback deploy + assetlinks + Console/signing.
4. **PC2-A2** — On Desktop delivery: immediate independent verify against §4 contract; do not implement.
