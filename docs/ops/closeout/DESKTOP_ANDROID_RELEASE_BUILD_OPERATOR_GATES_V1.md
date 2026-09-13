# DESKTOP_ANDROID_RELEASE_BUILD_OPERATOR_GATES_V1

**DEVICE:** DESKTOP  
**TASK_ID:** DESKTOP_ANDROID_RELEASE_BUILD_OPERATOR_GATES_V1  
**MODE:** OPERATOR_GATE_RESOLUTION_ONLY  
**DATE:** 2026-08-12  
**IDLE_POLICY:** DO_NOT_IDLE  
**PROJECT:** `C:\Users\1\Desktop\umtuba\umtuba-mobile`  
**PRIOR:** `docs/ops/closeout/DESKTOP_ANDROID_RELEASE_BUILD_V1.md`  

## Verdict

Operator gates **not cleared**. No AAB/APK build. No Google Play upload. No signing credentials created or replaced. No secrets printed. Local Android SDK/Java **not** installed (not required for EAS cloud).

## 1 — EAS login

| Check | Result |
|-------|--------|
| `npx eas-cli whoami` | Not logged in (exit 1) |
| `npx expo whoami` | Not logged in |
| Global `eas` on PATH | Not relied on (use `npx eas-cli`) |
| `EXPO_TOKEN` / `EAS_TOKEN` | UNSET |
| Interactive login by agent | **Not attempted** (needs browser/credentials) |

**EAS_LOGIN_REQUIRED = YES**  
**EAS_AUTH_VERIFIED = NO**  
**EAS_LOGIN_COMMAND** (run in Desktop terminal):

```powershell
cd C:\Users\1\Desktop\umtuba\umtuba-mobile
npx eas-cli login
```

After login, verify (non-secret):

```powershell
cd C:\Users\1\Desktop\umtuba\umtuba-mobile
npx eas-cli whoami
```

Optional org/account check (username/account name OK; never paste tokens into chat):

```powershell
npx eas-cli project:info
```

Confirm the logged-in account owns EAS `projectId` in `app.config.ts` (`extra.eas.projectId`).

## 2 — Android signing

| Check | Result |
|-------|--------|
| Local `*.jks` / `*.keystore` under mobile tree | **NONE** (paths scanned; none found) |
| Local `credentials.json` / `.eas` | **ABSENT** |
| `npx eas-cli credentials -p android --non-interactive` | Flag unsupported on eas-cli 21.x (`Nonexistent flag`) |
| Remote EAS Android credentials for `com.umtuba.app` | **UNKNOWN** (requires login; interactive `eas credentials` not completed by agent) |

**EXISTING_ANDROID_SIGNING_FOUND = UNKNOWN**  
(Local = NO; remote not inspectable until login.)

**SIGNING_OPERATOR_APPROVAL_REQUIRED = YES**  
**SIGNING_ACTION_REQUIRED:**

1. Complete EAS login (section 1).
2. Inspect only (do not generate/replace yet):

```powershell
cd C:\Users\1\Desktop\umtuba\umtuba-mobile
npx eas-cli credentials -p android
```

Choose Android → production / build credentials. Note whether an upload keystore already exists on EAS for this project.

3. **STOP for operator decision** (do not auto-generate):

| Case | Operator choice |
|------|-----------------|
| EAS already has Android credentials for this app | Connect/use that existing identity for production builds (follow CLI prompts to assign to build profile; do not create a second upload key unless Play requires it). |
| No remote credentials **and** app never published / no prior upload key | **(A)** Explicitly approve: let EAS **generate first-time** Android signing credentials. |
| No remote credentials **but** org has an existing Play upload keystore | **(B)** Upload/connect that **existing** keystore via `eas credentials` (operator supplies keystore via secure local path in CLI; **do not paste passwords/keys into chat or reports**). |

Agent must **not** create or replace signing credentials without explicit operator approval of (A) or (B).

Post-login helper (still no auto-replace):

```powershell
npx eas-cli credentials:configure-build -p android -e production
```

Only after operator chooses (A) or (B) and confirms the intended identity.

## 3 — Google Play versionCode

| Item | Value |
|------|-------|
| Project `VERSION_CODE` | `1` (`app.config.ts` `android.versionCode`) |
| `VERSION_NAME` | `1.0.0` |
| EAS | `cli.appVersionSource: "remote"` + production `autoIncrement: true` |
| Play max versionCode from this machine | **Not verified** (no Play API/browser evidence; logged out of EAS so remote build version also unavailable) |

**PLAY_VERSIONCODE_OPERATOR_CHECK_REQUIRED = YES**  
**Do not change `versionCode` in the project for this task.**

**PLAY_CONSOLE_NAVIGATION** (exact):

1. Open [Google Play Console](https://play.google.com/console).
2. Select app **UMTUBA** / package **`com.umtuba.app`** (App ID must match).
3. Left nav: **Release** → **Production** (also check **Testing** → Internal / Closed / Open if used).
4. Open the latest release (or **App bundle explorer** / release details) and note the highest **version code** among all uploaded AABs/APKs (including drafts, rejected, and testing tracks).
5. Alternate path: **Release** → **App bundle explorer** → select latest artifact → read **version code**.
6. If the app listing does not exist / never uploaded: report `PLAY_MAX_VERSION_CODE = NONE (never uploaded)`.

**Operator must report back (single value):**

```
PLAY_MAX_VERSION_CODE = <integer or NONE>
```

Rule: any future upload’s versionCode must be **greater than every previously uploaded** versionCode. With EAS `autoIncrement` + remote source, after login also run:

```powershell
npx eas-cli build:version:get -p android -e production --non-interactive
```

and reconcile EAS remote Android version vs Play max before build/submit. Still **do not** edit local `versionCode` in this gate task.

## 4 — Node modules

| Item | Result |
|------|--------|
| Lockfile | `package-lock.json` present |
| yarn / pnpm lock | absent |
| `node_modules` | **ABSENT** |

**PACKAGE_MANAGER = npm**  
**NODE_MODULES_INSTALL_REQUIRED = YES**  
**NODE_MODULES_INSTALL_COMMAND:**

```powershell
cd C:\Users\1\Desktop\umtuba\umtuba-mobile
npm ci
```

(Install not run this session; whoami used `npx eas-cli` without local install. Run `npm ci` before production EAS build.)

## 5 — Local SDK / Java

| Item | Result |
|------|--------|
| `ANDROID_HOME` / `ANDROID_SDK_ROOT` | unset |
| `%LOCALAPPDATA%\Android\Sdk` | absent |
| `java` on PATH | absent |

**LOCAL_ANDROID_SDK_REQUIRED_FOR_EAS_BUILD = NO**  
EAS **cloud** build does not require local Android SDK or JDK. Do not install large SDK/Java for the cloud path. Local SDK/Java only if operator later chooses `--local` (out of scope for clearing these gates).

## Final metrics

```
EAS_LOGIN_REQUIRED = YES
EAS_AUTH_VERIFIED = NO
EAS_LOGIN_COMMAND = cd C:\Users\1\Desktop\umtuba\umtuba-mobile && npx eas-cli login
EXISTING_ANDROID_SIGNING_FOUND = UNKNOWN
SIGNING_ACTION_REQUIRED = After login run npx eas-cli credentials -p android; if credentials exist use them; if none STOP for operator (A) EAS first-time generate OR (B) upload existing Play keystore. Local keystore none. No generate/replace without approval.
SIGNING_OPERATOR_APPROVAL_REQUIRED = YES
PLAY_VERSIONCODE_OPERATOR_CHECK_REQUIRED = YES
PLAY_CONSOLE_NAVIGATION = Play Console → app com.umtuba.app → Release → Production (+ Testing tracks) and/or App bundle explorer → report highest version code (or NONE if never uploaded)
PACKAGE_MANAGER = npm
NODE_MODULES_INSTALL_REQUIRED = YES
NODE_MODULES_INSTALL_COMMAND = cd C:\Users\1\Desktop\umtuba\umtuba-mobile && npm ci
LOCAL_ANDROID_SDK_REQUIRED_FOR_EAS_BUILD = NO
READY_FOR_OPERATOR_ACTION = YES
READY_FOR_AAB_BUILD = NO
```

## Operator checklist (exact next steps)

1. [ ] Desktop terminal: `cd C:\Users\1\Desktop\umtuba\umtuba-mobile` then `npx eas-cli login`
2. [ ] Verify: `npx eas-cli whoami` (account name only; no tokens in chat)
3. [ ] Confirm account owns project (`npx eas-cli project:info` vs `app.config.ts` projectId)
4. [ ] Inspect signing: `npx eas-cli credentials -p android` — **do not generate/replace yet**
5. [ ] Decide and approve in writing: **(A)** EAS generate first-time **or** **(B)** connect existing upload keystore — then configure only that choice
6. [ ] Play Console: record `PLAY_MAX_VERSION_CODE` for `com.umtuba.app` (all tracks + bundle explorer)
7. [ ] After login: `npx eas-cli build:version:get -p android -e production --non-interactive` — reconcile with Play max (still do not change local versionCode here)
8. [ ] `npm ci` in `umtuba-mobile`
9. [ ] Only when login + signing decision + Play versionCode proven: request separate build task for `npx eas-cli build --platform android --profile production` (cloud AAB)

## Security

- No keystore passwords, private keys, or tokens printed
- No credentials created/replaced
- No Play upload
- `_port_extract` not touched
- No Desktop artifact dumps outside repo closeout path

## Scope compliance

- MODE = OPERATOR_GATE_RESOLUTION_ONLY
- No AAB/APK build
- No versionCode change
- No automatic signing credential create/replace
- No large Android SDK/Java install
