# Android V5 Device Test - INSTALL COMMAND PACKET

**TASK_ID:** `DESKTOP_A3_ANDROID_V5_DEVICE_TEST_TOOLING_READY_V1`  
**WAVE_ID:** `DESKTOP_RESULT_ONLY_ANDROID_V1`  
**DATE:** 2026-08-14  
**PACKAGE:** `com.umtuba.app`  
**SCOPE:** Tooling + install/test commands only. No keystore passwords. Do not treat v4 as release candidate. Do not upload to Play.

## Repo-local tool roots (NOT Desktop)

| Tool | Path |
|------|------|
| Temurin JDK 17 (portable) | `tools/android-device-toolchain/jdk-17.0.20+8/` |
| platform-tools / adb | `tools/android-device-toolchain/platform-tools/` |
| bundletool 1.18.1 | `docs/ops/closeout/android-device-toolchain/bundletool-all-1.18.1.jar` |
| Session env helper | `docs/ops/closeout/android-device-toolchain/env.ps1` |

Absolute (this Desktop):

```text
C:\Users\1\Desktop\umtuba\umtuba-web\tools\android-device-toolchain\jdk-17.0.20+8
C:\Users\1\Desktop\umtuba\umtuba-web\tools\android-device-toolchain\platform-tools
C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-device-toolchain\bundletool-all-1.18.1.jar
```

## 0) Load toolchain into current PowerShell session

```powershell
. C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-device-toolchain\env.ps1
```

## 1) Check Java (Temurin / OpenJDK 17+)

```powershell
& "C:\Users\1\Desktop\umtuba\umtuba-web\tools\android-device-toolchain\jdk-17.0.20+8\bin\java.exe" -version
```

Expect: `openjdk version "17.0.20"` (or newer 17+).

Optional system install (if UAC allowed; not required - portable already works):

```powershell
winget install --id EclipseAdoptium.Temurin.17.JDK -e --accept-package-agreements --accept-source-agreements
```

Note (2026-08-14): winget MSI install stalled / did not land on PATH; portable JDK under `tools/` is the approved ready path.

## 2) Check adb / platform-tools

```powershell
& "C:\Users\1\Desktop\umtuba\umtuba-web\tools\android-device-toolchain\platform-tools\adb.exe" version
& "C:\Users\1\Desktop\umtuba\umtuba-web\tools\android-device-toolchain\platform-tools\adb.exe" devices -l
```

Expect: `Android Debug Bridge version 1.0.41` / `Version 37.0.1-...`  
Device line when connected: `<serial> device` (not `unauthorized` / `offline`).

### USB / device detection procedure

1. Enable Developer options → USB debugging on the phone.
2. Connect USB data cable; accept RSA prompt on device if shown.
3. Run `adb devices -l`.
4. If empty: try another cable/port; `adb kill-server` then `adb start-server`; confirm device charge/MTP mode allows debugging.
5. Wireless (optional): `adb tcpip 5555` then `adb connect <device-ip>:5555` after one successful USB authorize.

**Recorded 2026-08-14 (~20:56-21:00 local):** `adb devices -l` → daemon started; **List of devices attached** was **empty**. No physical device connected to this Desktop at tooling-ready time.

## 3) Check bundletool

```powershell
$java = "C:\Users\1\Desktop\umtuba\umtuba-web\tools\android-device-toolchain\jdk-17.0.20+8\bin\java.exe"
$bt = "C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-device-toolchain\bundletool-all-1.18.1.jar"
& $java -jar $bt version
```

Expect: `1.18.1`

## 4) Install path A - APK already built (preferred when EAS APK profile used)

Do **not** use obsolete v4 as release candidate. Point `$apk` at the **accepted v5** APK only.

```powershell
$adb = "C:\Users\1\Desktop\umtuba\umtuba-web\tools\android-device-toolchain\platform-tools\adb.exe"
$apk = "<PATH_TO_ACCEPTED_V5.apk>"   # operator fills after v5 build GO
& $adb install -r $apk
& $adb shell monkey -p com.umtuba.app -c android.intent.category.LAUNCHER 1
```

EAS alternative (when Central GO + EAS profile yields APK; run from mobile repo - **do not modify mobile source** in this task):

```text
# High-level only - execute only after DESKTOP_V5_BUILD_GO = YES and accepted profile:
# eas build --platform android --profile <apk-or-preview-profile>
# Download APK artifact → adb install -r as above.
```

## 5) Install path B - AAB → device via bundletool (APKS)

Requires: accepted v5 `.aab`, and a **local** signing keystore path known to the operator.  
**Never put keystore passwords in this packet, chat, or git.** Use interactive prompt or operator-private env vars outside the repo.

```powershell
$java = "C:\Users\1\Desktop\umtuba\umtuba-web\tools\android-device-toolchain\jdk-17.0.20+8\bin\java.exe"
$bt = "C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-device-toolchain\bundletool-all-1.18.1.jar"
$adb = "C:\Users\1\Desktop\umtuba\umtuba-web\tools\android-device-toolchain\platform-tools\adb.exe"

$aab = "<PATH_TO_ACCEPTED_V5.aab>"
$apks = "C:\Users\1\Desktop\umtuba\umtuba-web\tools\android-device-toolchain\out\umtuba-v5.apks"
$ks = "<PATH_TO_UPLOAD_OR_DEBUG_KEYSTORE>"   # local only; not in repo

New-Item -ItemType Directory -Force -Path (Split-Path $apks) | Out-Null

# Passwords: supply at runtime via SecureString / console - DO NOT paste into docs.
# Example shape only (operator fills secrets out-of-band):
& $java -jar $bt build-apks `
  --bundle=$aab `
  --output=$apks `
  --ks=$ks `
  --ks-key-alias=<ALIAS> `
  --mode=universal

# If .apks already exists from a prior signed extract:
& $java -jar $bt install-apks --apks=$apks --adb=$adb
& $adb shell monkey -p com.umtuba.app -c android.intent.category.LAUNCHER 1
```

## 6) Launch package `com.umtuba.app`

```powershell
$adb = "C:\Users\1\Desktop\umtuba\umtuba-web\tools\android-device-toolchain\platform-tools\adb.exe"
& $adb shell monkey -p com.umtuba.app -c android.intent.category.LAUNCHER 1
# or:
& $adb shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -p com.umtuba.app
```

## 7) Quick readiness checklist (next accepted v5)

```powershell
. C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-device-toolchain\env.ps1
adb devices -l          # must show a device
# then install APK or install-apks from accepted v5 only
adb shell monkey -p com.umtuba.app -c android.intent.category.LAUNCHER 1
```

## Provenance (non-secret)

| Artifact | Notes |
|----------|-------|
| JDK | Temurin 17.0.20+8 portable zip from Adoptium GitHub release |
| platform-tools | Google `platform-tools-latest-windows.zip` → adb 37.0.1-15733141 |
| bundletool | `bundletool-all-1.18.1.jar` SHA256 `675786493983787FFA11550BDB7C0715679A44E1643F3FF980A529E9C822595C` |
| adb.exe | SHA256 `B4A6B455702684652CCCF7B46258B29E653538904359A58FD4931CF3EF286B3F` |

## Forbidden

- Keystore / Play / `.env` secrets in this file or command history paste-backs
- Installing or promoting v4 as final candidate
- Writing artifacts to the Windows Desktop
- Touching `_port_extract`
- Mutating `umtuba-mobile` source
