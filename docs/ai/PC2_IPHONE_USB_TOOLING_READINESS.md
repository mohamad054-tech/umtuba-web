# PC2_IPHONE_USB_TOOLING_READINESS_V1 — READ_ONLY_DIAGNOSTIC

```text
TASK_ID = PC2_IPHONE_USB_TOOLING_READINESS_V1
STATUS = COMPLETE
DATE = 2026-08-19
DEVICE = PC2 (Windows)
MODE = READ_ONLY_DIAGNOSTIC
AUTHORITATIVE_SHA = 7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7
TESTFLIGHT_BUILD = 16
HISTORICAL_UDID = 00008110-000A10123AF9801E
BUILD16_CHANGED = NO
SOURCE_CHANGED = NO
REPO_MUTATED = NO
COMMIT_CREATED = NO
PUSH_PERFORMED = NO
STORE_SUBMISSION = NO
SOFTWARE_INSTALLED = NO
CURSOR_REPORT_OVERWRITTEN = NO
PRODUCT_MODE_REMAINS = WAIT_PRESERVE
```

This turn checked whether PC2 can see the already-connected iPhone 13 over USB and which diagnostics are possible **without installing software**. Product trees were not reset, committed, or rebuilt. TestFlight UI remains the winner for installed-build confirmation.

---

## Exact return

```text
TASK_ID = PC2_IPHONE_USB_TOOLING_READINESS_V1
STATUS = COMPLETE
WINDOWS_IPHONE_DETECTED = YES
USB_STORAGE_VISIBLE = YES
TRUST_PAIRING_STATE = TRUSTED_PAIRED_LIVE
APPLE_DRIVER_STATE = OK
APPLE_DEVICES_OR_ITUNES = APPLE_DEVICES_PRESENT_ITUNES_ABSENT
EXPO_DEVICE_VISIBILITY = LOCAL_CLI_PRESENT_NO_IOS_USB
EAS_DEVICE_VISIBILITY = NPX_CACHE_ONLY_NO_IOS_USB
DEVICE_LOG_ACCESS = YES_VIA_EXISTING_NODE_LOCKDOWN
USB_ADDITIONAL_QA_CAPABILITY = YES_SUPPLEMENTAL_NOT_REPLACING_TESTFLIGHT
MACOS_XCODE_STILL_REQUIRED = YES
BUILD16_CHANGED = NO
SOURCE_CHANGED = NO
REPO_MUTATED = NO
COMMIT_CREATED = NO
PUSH_PERFORMED = NO
STORE_SUBMISSION = NO
SAFE_NEXT_IOS_CAPABILITIES = TestFlight on-device QA; USB syslog/crash/install_proxy Lookup via existing Node lockdown scripts; Explorer MTP photos; Apple Devices stack already paired
LIMITATIONS = idevice*/libimobiledevice/pymobiledevice3/tidevice ABSENT; iTunes ABSENT; Expo/EAS cannot install iOS over USB from Windows; screenshotr InvalidService; no XCUITest/WDA; Apple Devices GUI not opened this turn
BLOCKERS = NONE_FOR_TESTFLIGHT_DEVICE_QA; MAC_STILL_REQUIRED_FOR_NATIVE_DEBUG
FINAL_RECOMMENDATION = Keep WAIT_PRESERVE. Do not install new USB tools. Use TestFlight UI as version source of truth (USB Lookup agrees CFBundleVersion 16). Use existing Apple Devices + Temp Node scripts only if a natural Build 16 error needs logs. Use macOS/Xcode for screenshot, Instruments, Console, run:ios, symbolication.
```

---

## Safety

- No Web / Localization / mobile / Build 16 product edits.
- Mobile primary left at `77e9e287e117fc9a19f9a5df1596f69b0b8bf07f` (dirty worktree preserved; **not** reset).
- Build 16 worktree left at `7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7` detached HEAD; **not** changed.
- No commit, push, merge, stash, clean, or replacement binary.
- No TestFlight / App Store submit.
- No new software install. Missing CLIs reported **ABSENT**.
- No Trust tap. Pairing session succeeded without a prompt from this PC.
- Pairing plist values / HostID / certificates / IMEI / Wi‑Fi MAC not printed.
- `docs/ai/CURSOR_REPORT.md` not overwritten.
- Requested docs only: this file + light `CURRENT_TASK.md` WAIT_PRESERVE note.

---

## 1. Windows detects iPhone

**YES.** PresentOnly PnP + Explorer Shell both show the live iPhone.

| Source | Result |
| --- | --- |
| `Get-PnpDevice -PresentOnly` | `Apple Mobile Device USB Composite Device` Status **OK**, `USB\VID_05AC&PID_12A8\00008110000A10123AF9801E` |
| Same | `Apple Mobile Device USB Device` Status **OK** (`MI_01`) |
| Same | `Apple iPhone` class **WPD** Status **OK** (`MI_00`) |
| `Win32_PnPEntity` | Manufacturer Apple; composite service `usbccgp`; mux service `WINUSB`; storage service `WUDFWpdMtp` |
| Bus-reported names | Composite: **iPhone**; `MI_01`: **Apple USB Multiplexor**; `MI_00`: **PTP** |
| Explorer `Shell.Application` NameSpace(17) | Portable device **Apple iPhone** |
| Explorer child | **Internal Storage** |

Stale **Unknown** nodes ignored (not this session):

- old WPD `Apple iPhone` `MI_00\7&29E206F7&0&0000`
- other composite `00008030000E308C3A82402E`

Live USB serial matches historical UDID without hyphens: `00008110000A10123AF9801E` → `00008110-000A10123AF9801E`.

---

## 2. Apple Mobile Device / USB driver

**OK.** Apple USB stack is the current driver, not a generic-only composite.

| Interface | INF / provider | Version / date | Role |
| --- | --- | --- | --- |
| Composite `VID_05AC` `PID_12A8` REV 1405 | `oem4.inf` Apple, Inc. `AppleUSB_CCGPDriverInstall.NT` | **538.0.0.0** (2023-06-14) | usbccgp |
| `MI_01` Apple USB Multiplexor | `oem4.inf` `AppleUsbMux_Install` | **538.0.0.0** (2023-06-14) | WINUSB / usbmux |
| `MI_00` PTP / Apple iPhone | Microsoft `wpdmtp.inf` MTP | **10.0.26100.3624** | WPD / Explorer photos |

Classic `C:\Program Files\Apple` and `Common Files\Apple` install dirs: **ABSENT**.  
`C:\ProgramData\Apple` **EXISTS** (`Lockdown`, `AMPDevicesAgent`, `SC Info`).

Classic Apple Mobile Device Support Windows service (iTunes-era): **not listed**.  
Store Apple Devices processes **are** running (below).

---

## 3. Trusted / paired

**TRUSTED_PAIRED_LIVE.** Not inferred from photos-only MTP.

| Check | Result |
| --- | --- |
| Pairing record | `C:\ProgramData\Apple\Lockdown\00008110-000A10123AF9801E.plist` (9501 bytes, 2026-08-16 01:25) |
| Key tokens present (values not printed) | HostID, HostCertificate, HostPrivateKey, DeviceCertificate, RootCertificate, RootPrivateKey, EscrowBag, SystemBUID |
| `idevice_id` / `idevicepair` / `ideviceinfo` | **ABSENT** |
| usbmux `:27015` | LISTEN, PID 15384 `AppleMobileDeviceProcess` |
| Existing Temp script `ListDevices` | DeviceID **2**, USB, ProductID 4776 (`0x12A8`), SerialNumber `00008110-000A10123AF9801E` |
| Lockdown `QueryType` | `com.apple.mobile.lockdown` |
| `StartSession` | OK, `EnableSessionSSL=true`, `sessionError=null` |
| Lockdown `UniqueDeviceID` | `00008110-000A10123AF9801E` |
| ProductType / class | `iPhone14,5` / iPhone (iPhone 13) |
| Live OS (lockdown GetValue) | ProductVersion **26.6**, BuildVersion **23G71** |
| Locale (lockdown) | `ar-IL` / `ar_IL`, TimeZone `Asia/Hebron` |

AMP `iPodDevices.xml` last **Connected** stamp is **2026-08-17T07:03:24Z** and still lists Firmware **18.6.2** / Build **22G100**. That file is **stale**. Live lockdown (this turn) is **26.6 / 23G71**. Trust was not re-tapped.

MTP “Internal Storage” is **not** the same as developer Trust. This turn has both: WPD storage **and** a live lockdown SSL session.

---

## 4. Apple Devices / iTunes

| App | State |
| --- | --- |
| Apple Devices (Store) | **PRESENT** `AppleInc.AppleDevices` **1.1540.23042.0** |
| `AppleDevices.exe` stub | `C:\Users\Giga store\AppData\Local\Microsoft\WindowsApps\AppleDevices.exe` |
| `AppleMobileDeviceLauncher` | Running (PID 21632) |
| `AppleMobileDeviceProcess` | Running (PID 15384) — owns usbmux `:27015` |
| Apple Devices GUI window | **Not open** this turn (empty `MainWindowTitle`). GUI was **not** launched |
| iTunes | **ABSENT** (no `iTunes.exe`, no uninstall entry) |

The Apple Devices **stack** can see the USB iPhone (`ListDevices` + pairing). The Apple Devices **window** was not opened, so this report does not claim a GUI screenshot of the device tile.

---

## 5. Expo / EAS on PC2

Honest Windows limitation: **this PC cannot install or debug a TestFlight iOS app over USB the way `adb` does on Android.**

| Tool | State |
| --- | --- |
| `npx` / `npm` / `node` | Present (`C:\Program Files\nodejs\`) |
| Local Expo in `umtuba-mobile` | **PRESENT** `node_modules\.bin\expo.cmd` reports **57.0.9** (`package.json` `expo ~57.0.7`) |
| `expo` top-level commands | `start`, `export`, `run:ios`, `run:android`, `prebuild`, `whoami` — **no** `devices` command |
| `expo run:ios` | Help exists (`--device` UDID) but needs **Xcode / Darwin**. Not executed (would attempt a native build/install) |
| `adb` | **ABSENT** |
| `eas` / `eas-cli` on PATH | **ABSENT** |
| `%APPDATA%\npm\eas.cmd` | **ABSENT** |
| Prior `npx` cache | `eas-cli` **22.0.0** under `npm-cache\_npx\...` — leftover from earlier waves; **not** invoked this turn (would be a fetch/run) |
| `xcrun` / `altool` | **ABSENT** |

```text
EXPO_DEVICE_VISIBILITY = LOCAL_CLI_PRESENT_NO_IOS_USB
EAS_DEVICE_VISIBILITY = NPX_CACHE_ONLY_NO_IOS_USB
```

Expo on Windows can start Metro and talk to a **already-running** JS bundle if the operator configures it. It cannot replace TestFlight for installing Build 16 on this iPhone.

---

## 6. Device logs

Official CLIs:

| Tool | PATH / disk (common dirs) |
| --- | --- |
| `idevicesyslog` / `idevicecrashreport` / `idevice_id` | **ABSENT** |
| `libimobiledevice*` | **ABSENT** |
| `pymobiledevice3` / `tidevice` / `ifuse` / `iproxy` / `usbmuxd` / `cfgutil` | **ABSENT** |

Already-present prior-wave scripts (Temp only, not installed this turn):

`%LOCALAPPDATA%\Temp\pc2-ios-syslog\`

- `_pc2_usbmux_list.js` — **run**; live USB list
- `build7_device_probe.js` — **run**; StartSession + StartService
- `build7_install_lookup.js` + `parse_bplist.js` — **run**; Lookup `com.umtuba.app`
- `build7_syslog_capture.js` / `_build7_syslog_runtime.js` — **present, not started** (no live syslog file this turn)
- `build7_crash_list.js` — **present, not run** (no crash pull this turn)

Live `StartService` this turn:

| Service | Result |
| --- | --- |
| `com.apple.syslog_relay` | OK (port assigned, SSL) |
| `com.apple.os_trace_relay` | OK |
| `com.apple.crashreportcopymobile` | OK |
| `com.apple.crashreportmover` | OK |
| `com.apple.mobile.installation_proxy` | OK |
| `com.apple.mobile.diagnostics_relay` | OK |
| `com.apple.webinspector` | OK (not used; not useful for TestFlight RN UI) |
| `com.apple.mobile.house_arrest` | OK (not used) |
| `com.apple.mobile.screenshotr` | **InvalidService** |
| `com.apple.mobile.notification_proxy` | OK |

```text
DEVICE_LOG_ACCESS = YES_VIA_EXISTING_NODE_LOCKDOWN
LIVE_SYSLOG_STREAMED_THIS_TURN = NO
CRASH_FILES_PULLED_THIS_TURN = NO
IDEVICESYSLOG = ABSENT
```

Log **capability** is proven (service start + pairing). A syslog/crash dump was not collected so this turn would not invent log contents.

---

## 7. USB additional QA vs TestFlight-only

USB can **supplement** TestFlight. It does **not** replace TestFlight UI for operator version confirmation.

`installation_proxy` Lookup of `com.umtuba.app` this turn (binary plist parsed by the existing Temp script):

```text
CFBundleDisplayName = UMTUBA
CFBundleShortVersionString = 1.0.0
CFBundleVersion = 16
SignerIdentity = TestFlight Beta Distribution
ApplicationType = User
ITSDRMScheme = v2
MinimumOSVersion = 18.0
```

That **agrees** with authorized TestFlight Build 16 / SHA `7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7`. Per task rule, **TestFlight UI still wins** if the two ever disagree.

| USB extra vs TestFlight-only | Available on PC2 now? |
| --- | --- |
| Confirm USB identity / UDID | YES |
| install_proxy marketing + build number | YES (non-authoritative vs TestFlight UI) |
| syslog_relay / os_trace_relay | YES (scripts exist; not streamed this turn) |
| crashreportcopymobile list/pull | Service starts; pull script exists; **not** pulled this turn |
| On-device UI / screenshots | NO (`screenshotr` InvalidService) |
| Tap automation | NO |
| Sideload / replace TestFlight binary | NO (and forbidden) |
| Symbolicated Xcode/Console native session | NO on Windows |

---

## 8. macOS / Xcode still required?

**YES** for deeper native work:

- `expo run:ios`, Xcode Devices, developer disk image, debugserver
- Instruments, energy/network profiling, native breakpoint debugging
- `xcrun` / `altool` / organiser symbolication UX
- Reliable device screenshots / XCUITest / WebDriverAgent
- Any flow that needs a Mac-only Apple toolchain

Windows is enough for: TestFlight **operator** QA, USB pairing confirmation, optional syslog/crash/install_proxy via **already-present** Node scripts, Explorer photo storage.

---

## Trees observed (read-only)

| Tree | HEAD | Notes |
| --- | --- | --- |
| `umtuba-mobile` | `77e9e287e117fc9a19f9a5df1596f69b0b8bf07f` | Dirty (`docs/ai/CURSOR_REPORT.md` modified, `worktrees/` untracked). **Not reset.** |
| Build 16 worktree `umtuba-mobile-pc2-ios-build16-watch-load-retry-final-gate-v1` | `7cf3960259f6f9725f7e525ba9d6b83b5d1aaec7` | Detached HEAD. **Not changed.** |
| This web repo | diagnostic docs only | Product source not edited |

---

## Commands (no secrets)

- `Get-PnpDevice` / `Get-PnpDeviceProperty` / `Win32_PnPEntity`
- `Get-Service` / `Get-Process` / `Get-AppxPackage` / `Get-NetTCPConnection`
- Explorer `Shell.Application` NameSpace(17)
- Pairing **key-token** scan only; AMP XML read (IMEI/serial not copied here)
- `where.exe` / `Get-Command` for idevice*, expo, eas, adb, xcrun
- `node %LOCALAPPDATA%\Temp\pc2-ios-syslog\_pc2_usbmux_list.js`
- `node ...\build7_device_probe.js`
- `node ...\build7_install_lookup.js` + `parse_bplist.js`
- `git rev-parse` / `git status -sb` on mobile + Build 16 worktree
- Local `expo --version` / `expo --help` / `expo run:ios --help`

---

## Open issues

- Apple Devices GUI not opened; no operator Trust prompt was visible to this agent.
- AMP `iPodDevices.xml` firmware field is stale vs live lockdown 26.6 / 23G71.
- Official libimobiledevice CLIs remain **ABSENT**. Do not install unless Central GO says so.
- Product work stays **WAIT_PRESERVE**.
