PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = INDEPENDENT_RELEASE_QA
AGENT_ID = PC2-A2
WAVE_ID = MOBILE_FULL_REACTIVATION_PRODUCTION_CLOSEOUT_V1
TASK_ID = ANDROID_PRODUCTION_BACKEND_RELEASE_CLOSEOUT_V1
TIMESTAMP_LOCAL = 2026-08-12 ~15:06–15:12 +03:00
MODE = EXECUTE / AUDIT+PROD_PROBE (NO FEATURE EXPANSION)
FEATURE_EXPANSION = FORBIDDEN
PRODUCT_CODE_CHANGED = NO
COMMIT_CREATED = NO
PUSHED = NO
GOOGLE_PLAY_UPLOAD = NOT_ATTEMPTED (no explicit prior authorization)
SECRET_VALUES_PRINTED = NO
SIGNING_SECRETS_EXPOSED = NO

---

## REQUIRED FINALS (machine-readable)

```
ANDROID_CODE_READY = NO
ANDROID_PRODUCTION_BACKEND_READY = NO
ANDROID_RELEASE_BUILD_READY = NO
ANDROID_SERVER_BLOCKERS_CLEARED = YES
ANDROID_REMAINING_BLOCKERS = [
  NATIVE_ANDROID_PROJECT_ABSENT,
  PACKAGE_APPLICATION_ID_com.umtuba.app_ABSENT,
  GRADLE_WRAPPER_ABSENT,
  SIGNING_CONFIG_ABSENT,
  KEYSTORE_REF_ABSENT,
  PLAY_INTEGRITY_ABSENT,
  VERSION_CODE_NAME_ABSENT,
  AAB_APK_ARTIFACT_ABSENT,
  ANDROID_APP_LINKS_assetlinks.json_404,
  AUTH_CALLBACK_REDIRECT_HOST_POINTS_TO_localhost:3001,
  NATIVE_REQUIREMENT_HISTORICALLY_NO,
  PLAY_UPLOAD_AUTHORIZATION_ABSENT
]
GRADLE_ASSEMBLE = NOT_RUN (no Android project / no gradlew / java+gradle ABSENT on PATH)
PLAY_UPLOAD = NOT_PERFORMED
```

---

## 1. Sync / scope inputs

| Input | Result |
| --- | --- |
| `docs/ai/PROJECT_STATE.md` | Active feature is Private AI Deployment runtime (other worktree); Mobile/native not in Translation closeout scope |
| `docs/ai/CURRENT_TASK.md` | Translation Studio V1 = PRODUCTION_ACCEPTED; hard rule: do not touch Mobile as Translation work; this task is independent Android closeout QA only |
| Workspace | `C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1` |
| Branch / HEAD | `office/platform-translation-trunk-port-v1` @ `1c5ae0bd0266029f264cab866744c7fcde25cc2e` |
| Search root (task) | `C:\Users\Giga store\Desktop\umtuba\` |
| Alpha mobile-arch tip worktree | `C:\Users\Giga store\Desktop\umtuba\worktrees\PC2-A1-UMTUBA-AI-GAMES-MOBILE-ARCH-REVIEW-V1` @ `e7b6fe8b08041d3cfb04a3a7966dc9f091ed1778` (detached) |
| EXTERNAL_PRODUCTION_SERVER (parent context) | AVAILABLE / Hetzner live — revalidated by HTTPS probe this run |

Commands (inventory):

```text
Get-ChildItem "c:\Users\Giga store\Desktop\umtuba" -Force
Get-ChildItem "c:\Users\Giga store\Desktop\umtuba" -Recurse -Depth 5 -Filter "settings.gradle*"
Get-ChildItem "c:\Users\Giga store\Desktop\umtuba" -Recurse -Depth 6 -Filter "AndroidManifest.xml"
Get-ChildItem "c:\Users\Giga store\Desktop\umtuba" -Recurse -Depth 3 -Filter "gradlew*"
rg -l -i "com\.umtuba\.app|applicationId|platforms/mobile" "c:\Users\Giga store\Desktop\umtuba" -g "!**/node_modules/**" -g "!**/.git/**"
```

---

## 2. Android project audit (PC2 search root)

| Audit item | Finding | Evidence |
| --- | --- | --- |
| Android project tree | **ABSENT** under `Desktop\umtuba` | No `settings.gradle*`, no `AndroidManifest.xml`, no `gradlew*` (depth 3–6 scan) |
| Package / `applicationId` `com.umtuba.app` | **ABSENT** (not authoritative on this device tree) | `rg` over umtuba root: no `com.umtuba.app` hits outside unrelated Store `applicationId` UUID helpers |
| `platforms/mobile` | **ABSENT** | Alpha tip worktree `platforms/` contains only `core` |
| `android/`, `apps/mobile`, `mobile/` | **ABSENT** | Exists checks on tip worktree = False |
| Capacitor / Expo / RN product shell | **ABSENT** as UMTUBA native client | Prior AI/Games/Mobile arch review (revalidated) |
| Signing config names | **ABSENT** | No Gradle module to declare `signingConfigs` |
| Keystore refs (PRESENT/ABSENT only) | **ABSENT** | No `*.jks` / `*.keystore` markers in depth-4 Android marker search; no inventing credentials |
| Build variants | **N/A** | No Gradle project |
| Prod backend URL (Android-configured) | **N/A / not configured** | No Android source; web `.env.example` documents `NEXT_PUBLIC_SITE_URL` production fallback `https://umtuba.com` |
| HTTPS | Prod site **LIVE** (see §4) | Probe |
| Auth / redirects | Web auth callback on prod **mis-hosts** redirect to `localhost:3001` (see §4) | Probe |
| Deep / App Links | `/.well-known/assetlinks.json` = **404** | Probe |
| API connectivity (Android client) | **N/A** (no client) | — |
| Runtime compatibility | **N/A** | — |
| Permissions (`AndroidManifest`) | **N/A** | — |
| Play Integrity state | **ABSENT / not wired** | No Android code / Play Integrity SDK references in native tree (tree missing) |
| versionCode / versionName | **ABSENT** | — |
| Release build / AAB-APK readiness | **NOT READY** | No assemble possible |
| Tests (Android instrumented/unit) | **ABSENT** | — |
| Android-specific server deps | assetlinks **missing**; auth callback host **not production-correct** for mobile OAuth return | Probe |

**Games catalog note (not a native app):** tip `lib/games/gamesCatalog.ts` exports `GAMES_CATALOG_PLATFORMS = ["web","ios","android"]` — metadata enum only; does **not** imply a shipped Android client.

---

## 3. Server-dependent vs remaining classification

### Historical server-class (depended on missing external production infra)

| Item | Prior state (docs) | This-run state | Class |
| --- | --- | --- | --- |
| External production / Hetzner reachability | Parent closeout: `EXTERNAL_PRODUCTION_SERVER_BLOCKER=CLEARED` | Confirmed: `https://umtuba.com/` GET **200**, TLS Let's Encrypt CN=`umtuba.com` valid through 2026-11-10 | **CLEARED** |
| Generic HTTPS production front door | Blocked when infra missing | LIVE | **CLEARED** |
| `/login` surface | — | GET **200** | **CLEARED** (web) |
| Web manifest | Partial PWA metadata | GET **200** `/manifest.webmanifest` | **CLEARED** as web surface (not Android AAB) |

→ **ANDROID_SERVER_BLOCKERS_CLEARED = YES** for the historical “no external production server” class.

### Remaining (not cleared by server availability)

| Blocker | Server-dependent? | Notes |
| --- | --- | --- |
| Native Android project / `com.umtuba.app` | **NO** | Codebase absent on PC2 search root |
| Gradle / JDK toolchain on PC2 | **NO** | `gradle`/`java` not on PATH; no wrapper |
| SigningConfigs + keystore ref | **NO** | ABSENT; secrets not invented |
| Play Integrity integration | **NO** | ABSENT |
| versionCode/versionName + release variant | **NO** | ABSENT |
| AAB/APK assemble | **NO** | Cannot run without project |
| Google Play upload authorization | **NO** | Explicitly out of scope / not authorized |
| `assetlinks.json` for App Links | **YES (Android-specific server file)** | Prod **404** — remaining if/when native ships |
| Auth callback redirect host → `localhost:3001` | **YES (auth/config)** | Prod `/auth/callback` 307 → `https://localhost:3001/login?...` — blocks correct production OAuth return for any client expecting `umtuba.com` |
| Historical product decision `NATIVE_REQUIREMENT=NO` | **NO (scope)** | Arch review: responsive/PWA first; native rewrite not required for launch |

---

## 4. Production probe evidence (approved validation; no Play upload)

| URL | Method | Status | Notes |
| --- | --- | --- | --- |
| `https://umtuba.com/` | GET | **200** | len≈49524 |
| `https://www.umtuba.com/` | GET | **200** | len≈49883 |
| `https://umtuba.com/login` | GET | **200** | |
| `https://umtuba.com/manifest.webmanifest` | GET | **200** | len≈461 |
| `https://umtuba.com/.well-known/assetlinks.json` | GET | **404** | Android App Links SoT missing |
| `https://umtuba.com/auth/callback` | GET | **307** | Location → `https://localhost:3001/login?error=This+sign-in+link+is+invalid+or+has+expired.+Please+try+again.` |
| `https://umtuba.com/auth/callback?code=probe` | GET | **307** | Location → `https://localhost:3001/login?error=This+sign-in+link+could+not+be+verified.+Please+try+again.` |
| `https://umtuba.com/api/health` | HEAD/GET | **404** | No public health route observed |
| TLS | — | OK | Subject `CN=umtuba.com`; Issuer Let's Encrypt YE1; Effective 2026-08-12; Expires 2026-11-10 |

Commands:

```text
Invoke-WebRequest -Uri <url> -Method GET -MaximumRedirection 0 -TimeoutSec 25 -UseBasicParsing
# TLS via System.Net.HttpWebRequest ServicePoint.Certificate on https://umtuba.com/
```

---

## 5. Gradle assemble

| Check | Result |
| --- | --- |
| Android project / `gradlew` | ABSENT |
| `gradle` on PATH | ABSENT |
| `java` on PATH | ABSENT |
| `assemble` / `bundleRelease` | **NOT RUN** (unsafe/impossible without project + signing) |

---

## 6. Prior evidence SHAs / paths consumed

| Artifact | Path | SHA256 |
| --- | --- | --- |
| AI/Games/Mobile arch review | `C:\Users\Giga store\Desktop\umtuba\worktrees\UMTUBA_AI_GAMES_MOBILE_INDEPENDENT_ARCHITECTURE_REVIEW_V1_REPORT.md` | `EE95158D08C7560AEDBB5E472674236D4C4EE7E1D27D970340C4C607F0B0800F` |
| Release tail classification (Android Play ≠ whole-platform) | `...\worktrees\PC2_A2_RELEASE_TAIL_CLASSIFICATION_V1.md` (and translation copy) | `67A365C624AE43E73D1FB01E68FD53CC2C1690A62FE96A6B2DDC45F4DFA261B4` |
| Alpha tip audited | worktree HEAD | git SHA `e7b6fe8b08041d3cfb04a3a7966dc9f091ed1778` |
| Workspace HEAD | translation trunk | git SHA `1c5ae0bd0266029f264cab866744c7fcde25cc2e` |

Key prior conclusions revalidated (not blindly copied):

- `NATIVE_REQUIREMENT=NO`
- `platforms/mobile` ABSENT
- `ANDROID_PLAY_BLOCKS_WHOLE_PLATFORM = NO`
- Mobile = responsive web first / FUTURE_SCOPE for native

---

## 7. Verdict narrative

External production is **available** and the historical server-missing blocker class is **cleared**. That does **not** make Android production-release-ready: there is **no** native Android codebase, package `com.umtuba.app`, signing, Play Integrity, or release artifact on the authorized PC2 search root. Android-specific server surfaces still incomplete (`assetlinks.json` 404; auth callback redirect host points at `localhost:3001`). No Google Play upload was attempted. Feature expansion was not performed.

### Closeout booleans

| Flag | Value |
| --- | --- |
| ANDROID_CODE_READY | **NO** |
| ANDROID_PRODUCTION_BACKEND_READY | **NO** (generic HTTPS live, but Android backend closeout surfaces incomplete) |
| ANDROID_RELEASE_BUILD_READY | **NO** |
| ANDROID_SERVER_BLOCKERS_CLEARED | **YES** (missing-external-prod class) |
| ANDROID_REMAINING_BLOCKERS | See machine-readable list above |

---

## 8. Open issues / next owners

1. **CENTRAL / Product GO** required before any native Android scaffold (contradicts current `NATIVE_REQUIREMENT=NO` unless scope changes).
2. If native is later authorized: deliver project with authoritative `applicationId`, signingConfig names + keystore refs (PRESENT only), Play Integrity plan, App Links (`assetlinks.json`), and fix prod auth callback host away from `localhost:3001`.
3. Play Console upload remains **blocked** until explicit authorization + release artifacts exist.
4. This closeout does **not** reopen Translation Studio V2 / DB-primary / Learning / Commerce scopes.
