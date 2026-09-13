# DESKTOP_A3_ANDROID_V5_DEVICE_TEST_TOOLING_READY_V1

**TASK_ID:** `DESKTOP_A3_ANDROID_V5_DEVICE_TEST_TOOLING_READY_V1`  
**WAVE_ID:** `DESKTOP_RESULT_ONLY_ANDROID_V1`  
**DEVICE:** DESKTOP-A3  
**MODE:** SURGICAL_EXECUTION_ONLY  
**DATE:** 2026-08-14 (~20:56 local start)

## Mission

Prepare Android device-test toolchain so the next **accepted v5** artifact can be installed and launched immediately. No Play upload. No mobile source mutation. No v4-as-final-candidate. No Desktop writes. No secrets.

## Results (return block)

```
JAVA_READY = YES
ADB_READY = YES
BUNDLETOOL_READY = YES
DEVICE_TEST_TOOLCHAIN_READY = YES
DEVICE_CONNECTION_CURRENTLY_AVAILABLE = NO
INSTALL_COMMAND_PACKET = docs/ops/closeout/android-device-toolchain/INSTALL_COMMAND_PACKET.md
REMAINING_PHYSICAL_DEVICE_ACTION = Connect phone with USB debugging enabled; accept RSA prompt; confirm `adb devices -l` shows `<serial> device`; then install accepted v5 APK/APKS only (not v4).
```

## What was installed / verified

| Component | Status | Location / notes |
|-----------|--------|------------------|
| Temurin JDK 17 | YES (portable) | `tools/android-device-toolchain/jdk-17.0.20+8/` - `openjdk version "17.0.20"` |
| winget Temurin 17 MSI | NOT LANDED | `winget install EclipseAdoptium.Temurin.17.JDK` started MSI but did not complete / not on PATH; portable path is authoritative |
| platform-tools / adb | YES (portable) | `tools/android-device-toolchain/platform-tools/` - adb 1.0.41 / 37.0.1-15733141 |
| bundletool | YES | `docs/ops/closeout/android-device-toolchain/bundletool-all-1.18.1.jar` - version `1.18.1` |
| Physical device | NO | `adb devices -l` empty after daemon start |
| Install command packet | YES | `docs/ops/closeout/android-device-toolchain/INSTALL_COMMAND_PACKET.md` |
| Session env helper | YES | `docs/ops/closeout/android-device-toolchain/env.ps1` |

## Approved AAB → device path

1. **Preferred:** EAS (or other) **APK** profile after `DESKTOP_V5_BUILD_GO = YES` → `adb install -r <v5.apk>` → launch `com.umtuba.app`.
2. **Alternate:** accepted v5 **AAB** → `bundletool build-apks` (operator supplies keystore out-of-band; **no passwords in docs**) → `bundletool install-apks` → launch `com.umtuba.app`.

Exact commands: see INSTALL_COMMAND_PACKET.

## Device detection procedure (recorded)

1. USB debugging on.
2. Data cable + RSA authorize.
3. `adb devices -l` must show `device`.
4. **At tooling-ready time:** no device attached.

## Explicit non-actions

- Did not overwrite `docs/ai/CURRENT_TASK.md`
- Did not modify `umtuba-mobile` source
- Did not upload to Play
- Did not test / promote v4 as release candidate
- Did not print keystore passwords or `.env` contents
- Did not write to Windows Desktop / `_port_extract`

## Remaining blockers for live device install

1. Physical phone USB-connected with debugging authorized (`DEVICE_CONNECTION_CURRENTLY_AVAILABLE = NO`).
2. Accepted **v5** APK or AAB (build still gated: `DESKTOP_V5_BUILD_GO = NO` at prior state - out of this task's install scope).
3. For AAB path only: operator-local keystore + passwords supplied at runtime (never committed).

## Toolchain ready verdict

**DEVICE_TEST_TOOLCHAIN_READY = YES** - Java, adb, and bundletool are usable from repo-local paths; packet documents install/launch for `com.umtuba.app`. Only physical device (+ later accepted v5 binary) remain for an actual device QA run.
