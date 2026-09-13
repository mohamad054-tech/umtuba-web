# DESKTOP_ANDROID_RELEASE_BUILD_V1

**DEVICE:** DESKTOP  
**TASK_ID:** DESKTOP_ANDROID_RELEASE_BUILD_V1  
**MODE:** CONTROLLED_RELEASE_BUILD  
**DATE:** 2026-08-12  
**IDLE_POLICY:** DO_NOT_IDLE  
**PROJECT:** `C:\Users\1\Desktop\umtuba\umtuba-mobile`  
**PRIOR:** `docs/ops/closeout/DESKTOP_ANDROID_RELEASE_ARTIFACT_SEARCH_V1.md` (ANDROID_RELEASE_FILE_FOUND=NO, REBUILD_REQUIRED=YES)

## Verdict

**BUILD_RESULT = BLOCKED** — gates failed before any Android production build. No Google Play upload attempted. No signing identity created or replaced. No secrets printed or written to Git.

## Phase 1 — Project verification

| Item | Result |
|------|--------|
| Repo | `C:\Users\1\Desktop\umtuba\umtuba-mobile` EXISTS |
| Sync | `git fetch --prune` + `git pull --ff-only` (was behind 46; clean tree). HEAD now `fe14a34e7d5d10f8fd6fe2f1845e3bd81ffe2f99` on `master` = `origin/master` |
| Dirty | Clean after FF pull (no local WIP discarded) |
| Package manager | **npm** (`package-lock.json` present; no yarn/pnpm lock) |
| Expo SDK | `expo ~57.0.7` (npx expo reported 57.0.14 when resolving CLI) |
| React Native | `0.86.0` |
| React | `19.2.3` |
| Config | `app.config.ts` (no `app.json`) |
| Native `android/` | **ABSENT** (managed workflow; `.gitignore` typically excludes generated android) |
| `node_modules` | **ABSENT** (not installed this session) |
| `eas.json` | **PRESENT** after pull (was missing in prior search on older HEAD) |
| EAS `projectId` | UUID present in `app.config.ts` `extra.eas.projectId` (non-placeholder) |
| Local Android SDK | **ABSENT** (`%LOCALAPPDATA%\Android\Sdk`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, Program Files Android) |
| Java | **ABSENT** on PATH |
| Local keystore (`*.jks` / `*.keystore`) | **NONE** under mobile tree |
| `credentials.json` / `.eas` | **ABSENT** |
| EAS CLI | Available via `npx eas-cli` → **21.8.0**; global `eas` not on PATH |
| Expo/EAS auth | **`npx eas-cli whoami` → Not logged in**; `EXPO_TOKEN` / `EAS_TOKEN` env **unset** |
| Local build feasibility | **NO** (no SDK, no Java, no `android/` tree) |
| EAS cloud build feasibility | **BLOCKED** until operator `eas login` (or non-interactive token) and signing credentials connected |

### Required env / runtime config (names only)

From `.env.example` (values not read from `.env`):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_LIVEKIT_URL` (optional)

Auth redirect / push notes in `.env.example` are documentation only (no secret values recorded here).

## Phase 2 — Package ID

- **Android package:** `com.umtuba.app` (from `app.config.ts` → `android.package`)
- **iOS bundleIdentifier:** `com.umtuba.app` (informational)
- **STOP for package mismatch:** N/A — matches required `com.umtuba.app`

## Phase 3 — Versioning

| Field | Value | Source |
|-------|-------|--------|
| VERSION_NAME | `1.0.0` | `app.config.ts` `version` / `package.json` |
| VERSION_CODE | `1` | `app.config.ts` `android.versionCode` |
| EAS version source | `cli.appVersionSource: "remote"` + production `autoIncrement: true` | `eas.json` |

**Play Console published versionCode:** Not provable from this machine/repo (no Play history docs; prior artifact search found zero AAB/APK; no remote EAS build metadata accessible while logged out).

**Stance for this task:** Project config states first-release `versionCode: 1`. Build was not executed; before any future Play **upload**, operator must confirm Console max `versionCode` (EAS remote autoIncrement after login may advance the remote Android version independently). No guessed Play Console number used.

## Phase 4 — EAS configuration

`eas.json` already present post-pull. Production profile:

```json
"production": {
  "autoIncrement": true
}
```

- EAS default for production Android is **App Bundle (AAB)** when `buildType` is omitted — preferred over APK.
- Development/preview profiles explicitly use APK (internal only).
- **No new `eas.json` written** this session (already correct enough; avoided unnecessary edits / commits).
- **No push** performed.
- Cloud build would require auth + (usually) credentials; local `eas build --local` also requires Android SDK/Java (missing).

**EAS_CONFIG_READY = YES** (file + projectId present). Auth/signing still block execution.

## Phase 5 — Signing gate (STOP)

| Check | Status |
|-------|--------|
| Local keystore in repo | NO |
| EAS credentials inspectable | NO — login required; interactive prompt failed (stdin not readable) |
| Create/replace signing identity | **FORBIDDEN / NOT DONE** |
| Secrets in Git | **NOT DONE** |

**ANDROID_SIGNING_READY = NO**

### Exact operator actions required (next)

1. On DESKTOP (or CI with secrets store): `npx eas-cli login` **or** set a non-printed `EXPO_TOKEN` / approved EAS token in the environment.
2. Confirm Expo account owns EAS project id in `app.config.ts` (`extra.eas.projectId`).
3. Run Android credentials setup **non-destructively**: `npx eas-cli credentials` → Android → production — **use existing Play upload keystore** if app was ever signed/published elsewhere; do **not** generate a replacement identity unless Play Console / org policy confirms first-ever key.
4. Confirm Play Console package `com.umtuba.app` max `versionCode` (or confirm never published). Align with EAS remote version / `autoIncrement` before submit.
5. Install deps: `npm ci` in `umtuba-mobile`.
6. Prefer: `npx eas-cli build --platform android --profile production` (cloud AAB).  
   Local alternative only after installing JDK + Android SDK: `npx eas-cli build --platform android --profile production --local`.
7. Re-run artifact verification (path, size, SHA256, package, versionCode, signed release) — **no Play upload** unless a separate approved task.

Optional local toolchain (only if choosing `--local`): install Temurin/JDK 17+, Android SDK cmdline-tools, accept licenses, set `ANDROID_HOME`.

## Phase 6 — Build

**Not executed** — blocked at auth + signing (+ local SDK if local path chosen).

- No `.aab` produced
- No Play upload

## Archive deposit

Searched common Desktop-Agent-Archive / Handoffs paths under Desktop and user profile — **none exist / not writable**. Primary report remains under umtuba-web closeout only.

## Security review

- No keystore passwords, private keys, or token values printed
- `.env` not dumped
- No signing secrets added to Git
- No Google Play upload
- `_port_extract` not touched
- Dirty WIP: none on mobile after FF; unrelated web WIP not modified for feature work

## Output metrics

```
ANDROID_PROJECT_VERIFIED = YES
PACKAGE_ID = com.umtuba.app
VERSION_NAME = 1.0.0
VERSION_CODE = 1
EAS_CONFIG_READY = YES
ANDROID_SIGNING_READY = NO
BUILD_EXECUTED = NO
BUILD_RESULT = BLOCKED
AAB_CREATED = NO
AAB_FULL_PATH = NONE
AAB_FILE_SIZE = N/A
AAB_SHA256 = N/A
AAB_SIGNED = N/A
AAB_READY_FOR_GOOGLE_PLAY = NO
GOOGLE_PLAY_UPLOAD_PERFORMED = NO
REMAINING_BLOCKERS = [EAS_NOT_LOGGED_IN, ANDROID_SIGNING_CREDENTIALS_NOT_CONNECTED, NO_LOCAL_ANDROID_SDK_OR_JAVA, NODE_MODULES_ABSENT, PLAY_CONSOLE_VERSIONCODE_UNPROVEN_FOR_SUBMIT]
```

## Git state (mobile) at close

- Branch: `master` tracking `origin/master` (synced after FF)
- HEAD: `fe14a34e7d5d10f8fd6fe2f1845e3bd81ffe2f99`
- Working tree: clean
- Commits created this task: **none**
- Pushes: **none**

---
*Generated by DESKTOP_ANDROID_RELEASE_BUILD_V1 — controlled release build; stopped at signing/auth gate.*
