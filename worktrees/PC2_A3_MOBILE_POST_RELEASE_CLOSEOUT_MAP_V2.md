# PC2-A3 — MOBILE POST-RELEASE CLOSEOUT MAP V2

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = INDEPENDENT_RELEASE_QA / PLATFORM_CORE
AGENT_ID = PC2-A3
WAVE_ID = PC2_FINAL_EXECUTION_STANDBY_MOBILE_V3
TASK_ID = PC2_MOBILE_POST_RELEASE_CLOSEOUT_MAP_V2
REPORT_TYPE = MOBILE_POST_RELEASE_CLOSEOUT_MAP
TIMESTAMP_LOCAL = 2026-08-12 16:12 +03
MODE = MAP_ONLY (NO FEATURE EXPANSION / NO ANDROID PROJECT / NO AAB / NO PLAY UPLOAD)
FEATURE_DEVELOPMENT = FORBIDDEN
PRODUCT_CODE_CHANGED = NO
COMMIT_CREATED = NO
PUSHED = NO
SECRET_VALUES_PRINTED = NO
ANDROID_PROJECT_CREATED = NO
AAB_CREATED = NO
GOOGLE_PLAY_UPLOAD = NOT_ATTEMPTED
WORKSPACE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1
WORKSPACE_BRANCH = office/platform-translation-trunk-port-v1
WORKSPACE_HEAD = 1c5ae0bd0266029f264cab866744c7fcde25cc2e
```

## Locked track classification (authoritative)

```text
PWA_REQUIRED_FOR_CURRENT_WHOLE_PROJECT_RELEASE = NO
ANDROID_NATIVE_REQUIRED_FOR_CURRENT_WHOLE_PROJECT_RELEASE = NO
GOOGLE_PLAY_REQUIRED_FOR_CURRENT_WHOLE_PROJECT_RELEASE = NO
MOBILE_TRACK_CLASSIFICATION = SEPARATE_POST_RELEASE_TRACK
MOBILE_BLOCKS_CURRENT_WEB_PLATFORM_RELEASE = NO
WAITING_EXTERNAL_SERVER = CLEARED
CURRENT_WEB_PLATFORM_MANDATORY_OPEN_GATES = [LB-003, SECURITY, CENTRAL_WHOLE_PROJECT_READY_DECLARE]
```

Mobile map **must not** alter `CURRENT_WEB_PLATFORM_MANDATORY_OPEN_GATES`.

---

## 1. Evidence consumed (CURRENT)

| Source | Role |
| --- | --- |
| `worktrees/PC2_PWA_AUTH_CALLBACK_PRODUCTION_CLOSEOUT_V1.md` | Source callback origin fix; deploy pending; PWA remaining list |
| `worktrees/PC2_A1_MOBILE_PWA_PRODUCTION_REACTIVATION_V1.md` | PWA inventory; 48% closeout; AUTHORIZE_PWA=NO |
| `worktrees/PC2_A2_ANDROID_PRODUCTION_BACKEND_RELEASE_CLOSEOUT_V1.md` | Native project ABSENT; package absent; server class CLEARED |
| `worktrees/PC2_A3_GOOGLE_PLAY_FINAL_RELEASE_PATH_V1.md` | Play path; Internal test NOT ready; Production NOT_AUTHORIZED |
| `worktrees/PC2_A2_RELEASE_TAIL_CLASSIFICATION_V1.md` | PWA/Android OPTIONAL_POST_RELEASE; mandatory gates = LB003→SECURITY→CENTRAL |
| Desktop `umtuba` Android marker scan (this wave) | `settings.gradle*`, `AndroidManifest.xml`, `gradlew*` = **ABSENT** |

---

## 2. Stale WAITING_EXTERNAL_SERVER removals

Historical “server missing / PAUSED_EXTERNAL_SERVER / WAITING_EXTERNAL_SERVER” premises for Mobile hosting/URL are **CLEARED** (external prod HTTPS live). Do **not** retain as open Mobile blockers.

```text
WAITING_EXTERNAL_SERVER_STALE_CLASSIFICATIONS_REMOVED = [
  MOBILE_HOSTING_WAITING_EXTERNAL_SERVER,
  PWA_HTTPS_ORIGIN_WAITING_EXTERNAL_SERVER,
  PWA_MANIFEST_URL_WAITING_EXTERNAL_SERVER,
  ANDROID_PROD_API_HOST_WAITING_EXTERNAL_SERVER,
  PLAY_WEBSITE_PRIVACY_TERMS_URL_WAITING_EXTERNAL_SERVER,
  GOOGLE_PLAY_HOSTING_URL_WAITING_EXTERNAL_SERVER
]
```

| Prior stale class | Replacement CURRENT class |
| --- | --- |
| Waiting for external production host for Mobile/PWA URL | **CLEARED** — `https://umtuba.com` live |
| Waiting for HTTPS for installability | **CLEARED** — TLS+HSTS observed |
| Waiting for manifest to be served | **CLEARED** — `/manifest.webmanifest` 200 (partial content) |
| Waiting for privacy/terms/website URLs for Play listing deps | **CLEARED** as URL class — Console binding still OPERATOR |
| Auth callback broken because “server down” | **INVALID** — server up; remaining = **OPERATOR_DEPLOY / config** after source fix |

Remaining Mobile items are OPERATOR / CENTRAL GO / TECHNICAL (native absent) / ASSET — **not** WAITING_EXTERNAL_SERVER.

---

## 3. PWA post-release map (after source callback fix)

Source-level state (prior closeout, not redeployed by this task):

```text
AUTH_CALLBACK_CORRECTED = YES (source)
AUTH_GATE_REGRESSION = NO
DEV_LOCALHOST_PRESERVED = YES
OPERATOR_DEPLOY_REQUIRED_FOR_LIVE_AUTH_CALLBACK = YES
LIVE_PROD_AUTH_CALLBACK_LOCALHOST_AFTER_CODE_ONLY = YES (undeployed at last probe)
```

### Ordered remaining PWA gates

#### PWA-1 — Operator deploy + live auth callback recheck

| Field | Value |
| --- | --- |
| ITEM | OPERATOR_DEPLOY_AUTH_CALLBACK_ORIGIN_FIX + LIVE_RECHECK |
| CURRENT_STATUS | SOURCE_FIXED_UNDEPLOYED |
| ACCEPTANCE_CONTRACT | After Central/Operator integrate+deploy: `LIVE_PRODUCTION_AUTH_CALLBACK_LOCALHOST=NO` and `POST_DEPLOY_AUTH_SMOKE=PASS` (Location host = public origin, not loopback) |
| OWNER | CENTRAL / OPERATOR (deploy); PC2 may re-probe read-only when asked |
| DEPENDENCIES | Clean source handoff of callback fix; production deploy authorization |
| EXACT_CLOSE_ACTION | Integrate callback origin helper → deploy prod (and staging if in scope) → re-probe `GET /auth/callback` until Location uses `https://umtuba.com` (staging public host likewise) |
| BLOCKED_BY_EXTERNAL_SERVER | **NO** |
| OPTIONAL_OR_REQUIRED_FOR_PWA_RELEASE | **REQUIRED** for honest production auth completion on Mobile/PWA surfaces |

#### PWA-2 — Central AUTHORIZE_PWA

| Field | Value |
| --- | --- |
| ITEM | AUTHORIZE_PWA_YES |
| CURRENT_STATUS | NOT_CONFIRMED (no `AUTHORIZE_PWA=YES` packet on PC2) |
| ACCEPTANCE_CONTRACT | Explicit Central grant `AUTHORIZE_PWA=YES` + scoped SW/icon design GO |
| OWNER | CENTRAL |
| DEPENDENCIES | Product decision that honest installable PWA is in post-release scope |
| EXACT_CLOSE_ACTION | Issue AUTHORIZE_PWA=YES packet; open authorized implementation branch only after GO |
| BLOCKED_BY_EXTERNAL_SERVER | **NO** |
| OPTIONAL_OR_REQUIRED_FOR_PWA_RELEASE | **REQUIRED** for PWA track release; **NOT** required for current whole-project web release |

#### PWA-3 — Approved icon assets 192/512 (+ maskable/apple if scoped)

| Field | Value |
| --- | --- |
| ITEM | APPROVED_PWA_ICON_ASSETS_192_512 |
| CURRENT_STATUS | INCOMPLETE (favicon-only on tip/prod) |
| ACCEPTANCE_CONTRACT | Operator-approved 192 + 512 (maskable / apple-touch if iOS A2HS scoped) wired in manifest |
| OWNER | OPERATOR (assets) + authorized implementer after AUTHORIZE_PWA |
| DEPENDENCIES | AUTHORIZE_PWA; approved brand assets (do not fabricate) |
| EXACT_CLOSE_ACTION | Deliver approved icons → wire `app/manifest` icons → verify live `/manifest.webmanifest` |
| BLOCKED_BY_EXTERNAL_SERVER | **NO** |
| OPTIONAL_OR_REQUIRED_FOR_PWA_RELEASE | **REQUIRED** for honest Chromium installability |

#### PWA-4 — Service worker / offline / update lifecycle

| Field | Value |
| --- | --- |
| ITEM | SERVICE_WORKER_OFFLINE |
| CURRENT_STATUS | ABSENT (tip + prod `/sw.js` / `/service-worker.js` 404) |
| ACCEPTANCE_CONTRACT | Authorized SW design + offline/update policy implemented and live |
| OWNER | CENTRAL (design GO) + authorized implementer |
| DEPENDENCIES | AUTHORIZE_PWA + SW design GO |
| EXACT_CLOSE_ACTION | After GO only: implement approved SW stack; verify installability + update path |
| BLOCKED_BY_EXTERNAL_SERVER | **NO** |
| OPTIONAL_OR_REQUIRED_FOR_PWA_RELEASE | **REQUIRED** for honest PWA production ready; **NOT** whole-project mandatory |

### PWA machine list

```text
PWA_POST_RELEASE_REMAINING_GATES = [
  OPERATOR_DEPLOY_AUTH_CALLBACK_ORIGIN_FIX_AND_LIVE_RECHECK,
  AUTHORIZE_PWA_YES,
  APPROVED_PWA_ICON_ASSETS_192_512,
  SERVICE_WORKER_OFFLINE
]
PWA_PRODUCTION_READY = NO
PWA_REQUIRED_FOR_CURRENT_WHOLE_PROJECT_RELEASE = NO
```

---

## 4. Android native map (future; DO NOT CREATE)

```text
ANDROID_PROJECT_PRESENT = NO
ANDROID_PROJECT_REQUIRED = YES (only if/when native Play program is authorized)
ANDROID_PACKAGE_ID = com.umtuba.app
ANDROID_NATIVE_TRACK = POST_RELEASE
NATIVE_REQUIREMENT_HISTORICAL = NO
ANDROID_CODE_READY = NO
ANDROID_RELEASE_BUILD_READY = NO
```

Desktop/`umtuba` scan (this wave): no `settings.gradle*`, `AndroidManifest.xml`, `gradlew*` — project **absent**. Do **not** scaffold.

### ANDROID_FUTURE_REQUIREMENTS

Each item is a prerequisite before an honest native release path. Unknown product choices are marked explicitly.

```text
ANDROID_FUTURE_REQUIREMENTS = [
  {
    ITEM: project/bootstrap decision,
    STATUS: ABSENT,
    OWNER: CENTRAL,
    NOTE: CENTRAL_PRODUCT_OR_ARCHITECTURE_DECISION_REQUIRED (contradicts current NATIVE_REQUIREMENT=NO unless scope changes)
  },
  {
    ITEM: framework/build-system decision from authoritative product architecture,
    STATUS: UNKNOWN,
    OWNER: CENTRAL,
    NOTE: CENTRAL_PRODUCT_OR_ARCHITECTURE_DECISION_REQUIRED (Capacitor/RN/Flutter/native — not evidenced as selected)
  },
  {
    ITEM: production API/auth environment contract,
    STATUS: PARTIAL (web prod live; Android client contract N/A),
    OWNER: CENTRAL + OPERATOR,
    NOTE: include public origin auth callback + App Links after native GO; not WAITING_EXTERNAL_SERVER
  },
  {
    ITEM: package/application identity,
    STATUS: TARGET_DECLARED_com.umtuba.app_NOT_PRESENT_IN_TREE,
    OWNER: CENTRAL,
    NOTE: authoritative applicationId must be delivered with project; historical name alone is not code evidence
  },
  {
    ITEM: signing model,
    STATUS: ABSENT,
    OWNER: OPERATOR / CENTRAL,
    NOTE: CENTRAL_PRODUCT_OR_ARCHITECTURE_DECISION_REQUIRED for Play App Signing vs upload-key custody; secrets never in Git
  },
  {
    ITEM: release build configuration,
    STATUS: ABSENT,
    OWNER: authorized implementer after GO,
    NOTE: versionCode/versionName/release variant — invent nothing until project exists
  },
  {
    ITEM: required platform permissions,
    STATUS: UNKNOWN,
    OWNER: CENTRAL,
    NOTE: CENTRAL_PRODUCT_OR_ARCHITECTURE_DECISION_REQUIRED (manifest permissions depend on scoped features)
  },
  {
    ITEM: web/native integration contract where applicable,
    STATUS: UNKNOWN,
    OWNER: CENTRAL,
    NOTE: CENTRAL_PRODUCT_OR_ARCHITECTURE_DECISION_REQUIRED (deep links / assetlinks / shared auth)
  },
  {
    ITEM: test strategy,
    STATUS: ABSENT,
    OWNER: CENTRAL + PC2 QA when authorized,
    NOTE: CENTRAL_PRODUCT_OR_ARCHITECTURE_DECISION_REQUIRED for unit/instrumented/E2E matrix
  },
  {
    ITEM: artifact generation requirements,
    STATUS: ABSENT,
    OWNER: authorized release engineering,
    NOTE: signed AAB acceptance only after project+signing+release config exist
  },
  {
    ITEM: Android App Links server file,
    STATUS: assetlinks.json_404,
    OWNER: OPERATOR when native ships,
    NOTE: Android-specific server file debt — NOT WAITING_EXTERNAL_SERVER hosting class
  }
]
```

---

## 5. Signing / AAB map (no keys / no AAB)

```text
AAB_STATUS = NOT_CREATED
SIGNING_MATERIAL_FABRICATED = NO
SIGNING_SECRETS_EXPOSED = NO
```

| Requirement | Value |
| --- | --- |
| SIGNING_OWNER | OPERATOR / CENTRAL release custodian (not PC2 Git) |
| SIGNING_SECRET_REQUIREMENTS | Upload keystore + passwords / key aliases held in approved secret store; **never** committed; PRESENT/ABSENT reporting only |
| KEYSTORE_HANDLING_REQUIREMENTS | Outside Git; restricted access; Play App Signing enrollment decision before first upload; backup/recovery procedure OPERATOR-owned |
| VERSIONING_REQUIREMENTS | Monotonic `versionCode`; human `versionName` policy — **CENTRAL_PRODUCT_OR_ARCHITECTURE_DECISION_REQUIRED** for numbering scheme |
| RELEASE_BUILD_REQUIREMENTS | Release variant + `signingConfigs` + minify/R8 policy + toolchain (JDK/AGP) on authorized builder — all ABSENT until project exists |
| AAB_ACCEPTANCE_REQUIREMENTS | `bundleRelease` (or equivalent) produces signed AAB; packageId=`com.umtuba.app`; version stamps set; no secrets in artifact metadata beyond normal Play signing; smoke-installable on Internal track only after Console upload auth |

**Forbidden this wave:** create keystore, invent passwords, run assemble/bundle, upload AAB.

---

## 6. Google Play Internal Testing sequence map (no upload)

```text
GOOGLE_PLAY_INTERNAL_TEST_STATUS = NOT_STARTED
GOOGLE_PLAY_TECHNICAL_READY = NO
GOOGLE_PLAY_INTERNAL_TEST_READY = NO
GOOGLE_PLAY_PRODUCTION_PUBLISH = NOT_AUTHORIZED
```

### Ordered chain (expected shape)

```text
MOBILE_POST_RELEASE_ORDERED_CHAIN = [
  CENTRAL_AUTHORIZE_NATIVE_OR_PWA_SCOPE,
  PWA_AUTHORIZE_AND_COMPLETE_OR_ANDROID_IMPLEMENTATION,
  RELEASE_VALIDATION,
  SIGNED_AAB,
  PLAY_CONSOLE_APP_CONFIGURATION,
  INTERNAL_TEST_TRACK_UPLOAD,
  TESTER_ACCESS,
  INSTALL_LAUNCH_AUTH_CORE_FLOW_VERIFICATION,
  INTERNAL_TEST_ACCEPTANCE,
  LATER_RELEASE_DECISION
]
```

Android-specific subsequence (after native GO):

```text
ANDROID_IMPLEMENTATION
→ RELEASE_VALIDATION
→ SIGNED_AAB
→ PLAY_CONSOLE_APP_CONFIGURATION
→ INTERNAL_TEST_TRACK_UPLOAD
→ TESTER_ACCESS
→ INSTALL/LAUNCH/AUTH/CORE_FLOW_VERIFICATION
→ INTERNAL_TEST_ACCEPTANCE
→ LATER_RELEASE_DECISION
```

### Future external / operator requirements (no guessing Console state)

| Requirement | Class | CURRENT evidence |
| --- | --- | --- |
| Play Console access / operator receipt | OPERATOR / GOOGLE_PLAY_CONSOLE | NOT_CONFIRMED on PC2 |
| Application identity ownership (`com.umtuba.app`) | CENTRAL / CONSOLE | Target declared; code ABSENT |
| Signing / Play App Signing enrollment | OPERATOR / CENTRAL | ABSENT; decision required |
| Store listing assets/copy | ASSET / OPERATOR | No listing packet on PC2 |
| Privacy / Data safety declarations | POLICY / OPERATOR | Privacy URL live; Console forms unconfirmed — PC2 must not attest |
| Content rating / target audience | POLICY / OPERATOR | Unconfirmed |
| Tester group | OPERATOR / TESTING | Do not fabricate testers |
| Dedicated support URL | OPERATOR / ASSET | `/support` 404 historically |
| Country/device compatibility | FUTURE_VALIDATION | CENTRAL/operator validation required — do not invent matrix |
| Production track publish | **NOT_AUTHORIZED** | Explicit later Central GO after Internal Testing acceptance |

---

## 7. Google Play Production

```text
GOOGLE_PLAY_PRODUCTION_PUBLISH = NOT_AUTHORIZED
PRODUCTION_TRACK_PUBLISH_PERFORMED = NO
```

Production publication requires later explicit Central GO **after** Internal Testing acceptance. This map does not authorize Production.

---

## 8. What this map explicitly does / does not do

| Action | Status |
| --- | --- |
| Reclassify Mobile as SEPARATE_POST_RELEASE_TRACK | DONE |
| Remove stale WAITING_EXTERNAL_SERVER Mobile hosting/URL classes | DONE |
| Enumerate PWA remaining gates post source-callback fix | DONE |
| Map Android future requirements without creating project | DONE |
| Map signing/AAB prerequisites without creating keys/AAB | DONE |
| Map Play Internal Testing sequence without upload | DONE |
| Record Production = NOT_AUTHORIZED | DONE |
| Alter CURRENT_WEB_PLATFORM_MANDATORY_OPEN_GATES | **FORBIDDEN / NOT DONE** |
| Implement PWA SW/icons/features | **NOT DONE** |
| Create Android / AAB / Play publish | **NOT DONE** |

---

## 9. Exact files changed (this task artifact)

| Path | Action |
| --- | --- |
| `worktrees/PC2_A3_MOBILE_POST_RELEASE_CLOSEOUT_MAP_V2.md` | Created (this file) |
| `docs/ai/CURSOR_REPORT.md` | Updated by A3 final reconciliation (wave report) |

---

## 10. Map finals (machine-readable)

```text
MOBILE_TRACK_CLASSIFICATION = SEPARATE_POST_RELEASE_TRACK
WAITING_EXTERNAL_SERVER = CLEARED
WAITING_EXTERNAL_SERVER_STALE_CLASSIFICATIONS_REMOVED = [MOBILE_HOSTING_WAITING_EXTERNAL_SERVER, PWA_HTTPS_ORIGIN_WAITING_EXTERNAL_SERVER, PWA_MANIFEST_URL_WAITING_EXTERNAL_SERVER, ANDROID_PROD_API_HOST_WAITING_EXTERNAL_SERVER, PLAY_WEBSITE_PRIVACY_TERMS_URL_WAITING_EXTERNAL_SERVER, GOOGLE_PLAY_HOSTING_URL_WAITING_EXTERNAL_SERVER]
PWA_POST_RELEASE_REMAINING_GATES = [OPERATOR_DEPLOY_AUTH_CALLBACK_ORIGIN_FIX_AND_LIVE_RECHECK, AUTHORIZE_PWA_YES, APPROVED_PWA_ICON_ASSETS_192_512, SERVICE_WORKER_OFFLINE]
ANDROID_PROJECT_PRESENT = NO
ANDROID_PACKAGE_ID = com.umtuba.app
ANDROID_PROJECT_REQUIRED = YES
AAB_STATUS = NOT_CREATED
GOOGLE_PLAY_INTERNAL_TEST_STATUS = NOT_STARTED
GOOGLE_PLAY_PRODUCTION_PUBLISH = NOT_AUTHORIZED
MOBILE_POST_RELEASE_ORDERED_CHAIN = [CENTRAL_AUTHORIZE_NATIVE_OR_PWA_SCOPE, PWA_AUTHORIZE_AND_COMPLETE_OR_ANDROID_IMPLEMENTATION, RELEASE_VALIDATION, SIGNED_AAB, PLAY_CONSOLE_APP_CONFIGURATION, INTERNAL_TEST_TRACK_UPLOAD, TESTER_ACCESS, INSTALL_LAUNCH_AUTH_CORE_FLOW_VERIFICATION, INTERNAL_TEST_ACCEPTANCE, LATER_RELEASE_DECISION]
CURRENT_WEB_PLATFORM_MANDATORY_OPEN_GATES = [LB-003, SECURITY, CENTRAL_WHOLE_PROJECT_READY_DECLARE]
```

END PC2_A3_MOBILE_POST_RELEASE_CLOSEOUT_MAP_V2
