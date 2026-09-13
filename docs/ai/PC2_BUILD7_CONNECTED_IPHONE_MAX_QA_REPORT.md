# PC2 BUILD 7 — connected iPhone max QA

```text
PC2 REPORT
SOURCE_DEVICE = PC2
TASK_ID = PC2_BUILD7_CONNECTED_IPHONE_MAX_QA_V1
DATE = 2026-08-16
MODE = CONNECTED_DEVICE_MAX_QA / OPERATOR_CHECKLIST_REMAINING
DEVICE = PC2 (Windows) + physical iPhone 13 USB
TESTFLIGHT_BUILD_EXPECTED = UMTUBA 1.0.0 (7)
SOURCE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
EAS_BUILD_ID = 67147f93-9c70-4631-8257-ff80628a49f6
BUNDLE_ID = com.umtuba.app
APP_STORE_PRODUCTION_SUBMITTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
ANDROID_VERSIONCODE_TOUCHED = NO
IOS_REBUILT = NO
MOBILE_CHECKOUT_77e9e28_RESET = NO
REAL_USER_BLOCKED = NO
REAL_ACCOUNT_DELETED = NO
```

This turn used every **safe** capability actually present on PC2.
It did **not** tap TestFlight UI from Windows.
It does **not** invent UI PASS.
Prior operator-authorized Build 7 results are recorded, not re-run.

---

## Return fields

```text
DEVICE_PAIRING = YES
BUILD7_DEVICE_VERIFIED = DISCREPANCY — operator prior YES; installation_proxy CFBundleVersion=6
DEVICE_AUTOMATION_AVAILABLE = NO
DEVICE_LOGGING_AVAILABLE = YES
ARABIC = PRIOR_PARTIAL — RTL/Back authorized; representative chrome not rescored this turn
AR_RTL = PRIOR_PASS — do not redo
GERMAN = IN_PROGRESS — override + Watch long-string + Create landing authorized; Veröffentlichen / Erneut versuchen NOT_OBSERVED
FRENCH = NOT_TESTED
ENGLISH = NOT_TESTED — LTR Back prior PASS is navigation only
SPANISH = NOT_TESTED
PORTUGUESE = NOT_TESTED
DEVICE_LOCALE_DETECTION = OS_CONFIRMED_ar-IL; APP_UI_NOT_REOBSERVED_THIS_TURN
MANUAL_OVERRIDE = GERMAN_PRIOR_PASS; other locales NOT_TESTED
OVERRIDE_PERSISTENCE = NOT_TESTED
RESET_OVERRIDE_USES_DEVICE = BUILD6_ONLY_NOT_RECLAIMED
UNSUPPORTED_LOCALE_FALLBACK = SOURCE_PASS; DEVICE_NOT_TESTED
ENGLISH_LEAKAGE = SOURCE_PASS; DEVICE_NOT_TESTED
MISSING_KEYS = SOURCE_NONE; DEVICE_NOT_TESTED
RAW_KEYS = CREATE_LANDING_NONE_PRIOR; OTHER_SCREENS_NOT_TESTED
UI_OVERFLOW = NOT_TESTED — Watch DE long-string / Create wrap prior only
TEXT_OVERLAP = POSSIBLE_WATCH_DURATION_CONTROLS — unconfirmed
RTL_NAVIGATION = PRIOR_PASS
WATCH_PLAYBACK = NOT_TESTED — Build 4 intermittent still open; this syslog window has no player session
SAVED = NOT_TESTED
OTHER_USER_PROFILE = BACK_PASS_PRIOR; CONTENT_NOT_TESTED
FOLLOW = NOT_TESTED
MESSAGES = BACK_PASS_PRIOR; OPEN_SEND_NOT_TESTED
BACK = PRIOR_PASS
CREATE_UPLOAD = NOT_TESTED
OPEN_AFTER_UPLOAD = NOT_TESTED
SESSION_PERSISTENCE = NOT_TESTED
BACKGROUND_RESUME = NOT_TESTED
CRASH_SANITY = NO_UMTUBA_CRASH_IN_CRASHREPORT_ROOT; SYSLOG_NO_CRASH_THIS_WINDOW; NOT_A_FULL_PASS
AUTOMATED_DEVICE_CHECKS_COMPLETED = YES
MANUAL_CHECKS_STILL_REQUIRED = YES
IOS_LOCALIZATION_DEVICE_QA = IN_PROGRESS
IOS_RELEASE_BLOCKERS = DEVICE_QA_INCOMPLETE; CFBundleVersion_6_VS_OPERATOR_BUILD7; BUILD4_PLAYBACK_INTERMITTENT_UNRESOLVED; NO_PRODUCT_PASS
APP_STORE_PRODUCTION_SUBMITTED = NO
CENTRAL_ACTION_REQUIRED = YES — do not submit; do not rebuild without GO; resolve installed CFBundleVersion 6 vs expected 7
```

---

## 1. Pairing / connected device (automated — observed)

Apple lockdown pairing is present. usbmux `:27015` is listening via Apple Devices (`AppleMobileDeviceProcess`).

| Check | Result |
| --- | --- |
| USB composite `VID_05AC` `PID_12A8` | Present — serial `00008110000A10123AF9801E` |
| Apple Mobile Device USB Device `MI_01` | OK |
| Apple Devices 1.1540.23042.0 | Running (`AMPDevicesAgent`, `AppleMobileDeviceProcess`) |
| usbmux `ListDevices` | DeviceID **2**, USB, SerialNumber `00008110-000A10123AF9801E`, ProductID 4776 (`0x12A8`) |
| Pairing record | `C:\ProgramData\Apple\Lockdown\00008110-000A10123AF9801E.plist` (2026-08-16 01:25) — HostID/certs present; values not printed |
| `StartSession` | OK, `EnableSessionSSL=true` |
| `idevicepair` / `ideviceinfo` / `pymobiledevice3` / `tidevice` / `cfgutil` | **MISSING** on PATH |
| Python | Windows Store stub only — not a real interpreter |
| Stale USB node | `00008030000E308C3A82402E` Status Unknown — ignored |

Lockdown `GetValue` (this turn):

```text
UDID = 00008110-000A10123AF9801E
DeviceName = iPhone الخاص بـGiga store
ProductType = iPhone14,5
HardwareModel = D17AP
DeviceClass = iPhone
ProductVersion = 18.6.2
BuildVersion = 22G100
TimeZone = Asia/Hebron
com.apple.international Language = ar-IL
com.apple.international Locale = ar_IL
```

`iPhone14,5` is iPhone 13. Device OS language is Arabic (`ar-IL`). That confirms the **phone** locale. It does **not** by itself prove the UMTUBA UI is in Arabic this turn (German override was the last authorized app state).

---

## 2. Installed UMTUBA (automated — observed)

`com.apple.mobile.installation_proxy` Lookup of `com.umtuba.app` succeeded (binary plist parsed twice; same result).

```text
CFBundleIdentifier = com.umtuba.app
CFBundleDisplayName = UMTUBA
CFBundleShortVersionString = 1.0.0
CFBundleVersion = 6
SignerIdentity = TestFlight Beta Distribution
ApplicationType = User
Path = /private/var/containers/Bundle/Application/13CBDEEC-4969-4056-B49C-F897E3E8B95D/UMTUBA.app
ITSDRMScheme = v2
```

String atoms in that Lookup include `"6"` and `"1.0.0"`. They do **not** include `"7"`.

Authorized SHA `74188be` `app.config.ts` has `ios.buildNumber: "7"`.

```text
OPERATOR_PRIOR = Build 7 installed (do not redo that confirmation as a new PASS)
TOOLING_THIS_TURN = CFBundleVersion 6
BUILD7_DEVICE_VERIFIED = DISCREPANCY
```

In-app Settings prefers `expoConfig.ios.buildNumber` over `nativeBuildVersion` (`src/lib/settings/appInfo.ts`). An in-app “Build version” row is **not** sufficient to close this. TestFlight’s installed-build line, or iOS Settings → General → iPhone Storage → UMTUBA, is the operator check.

Do **not** treat this discrepancy as proof the prior RTL/German taps were on Build 6. Do **not** treat it as proof they were on Build 7. Central must resolve it.

---

## 3. What this Windows PC can and cannot do

| Capability | Available? | Used? |
| --- | --- | --- |
| Lockdown pairing / `GetValue` | YES | YES |
| usbmux ListDevices | YES | YES |
| `installation_proxy` Lookup | YES | YES |
| `com.apple.syslog_relay` | YES | YES — armed |
| `com.apple.os_trace_relay` | YES (StartService OK) | Not streamed (syslog_relay already running) |
| `crashreportcopymobile` AFC list | YES | YES — root only |
| `house_arrest` VendDocuments/VendContainer | StartService OK; Vend timed out | Attempted — no AsyncStorage read |
| `screenshotr` | **InvalidService** | No |
| XCUITest / Appium / WebDriverAgent | Not installed; no developer disk image | No |
| `tidevice` / `pymobiledevice3` / `idevice*` | Missing | No |
| Accessibility dump | No developer tools | No |
| WebInspector | StartService OK | Not usable for TestFlight RN UI |
| Metro / JS logs | TestFlight production — no | No |

```text
DEVICE_AUTOMATION_AVAILABLE = NO
WHY = Windows has pairing + syslog + install/crash services only. screenshotr is InvalidService. No WDA/Appium/XCUITest. Cannot observe or tap TestFlight UI from this PC.
DEVICE_LOGGING_AVAILABLE = YES
LOG_CAPTURE_METHOD = com.apple.syslog_relay SSL
LOG_FILE = %LOCALAPPDATA%\Temp\pc2-ios-syslog\build7-syslog.capture.log
LOG_PID = 23308
LOG_STARTED = 2026-08-16T19:27:39.012Z
```

URLs in syslog are `<private>`. This is the same privacy limitation as the Build 4 capture.

---

## 4. Syslog / crash evidence (this window)

Syslog is live and growing (about 2.1 MB by 22:30 local). UMTUBA process name appeared twice:

```text
22:29:28 kernel necp_process_defunct_list abort nexus error (2) for pid 3700 UMTUBA
```

That is network-client teardown when the process becomes defunct. It is **not** an AVPlayer error and **not** a crash.

```text
AVPlayer / AVFoundation / resource unavailable / ExpoVideo / PlayerItemLoadException = NONE in this capture
NSURLErrorDomain / -1008 / -1001 / -1009 = NONE observed in UMTUBA-attributed lines
missing translation-key / i18n warnings = NONE observed
layout/runtime warnings attributed to UMTUBA = NONE observed
com.umtuba.app foreground playback session = NOT_IN_THIS_WINDOW
```

`crashreportcopymobile` root listing (21 names): Siri/SFA/power/diagnostic folders. **No** filename containing `umtuba` / `UMTUBA`. `DiagnosticLogs/` and `Retired/` were not recursed.

```text
CRASH_SANITY = NO_UMTUBA_NAMED_CRASH_IN_ROOT; NO_CRASH_LINE_IN_THIS_SYSLOG
CRASH_SANITY ≠ PASS
WATCH_PLAYBACK ≠ PASS
```

Build 4 intermittent `Failed to load the player item: resource unavailable` remains open. One later success is still not PASS.

---

## 5. Source inventory (SHA `74188be`, clean worktree)

Worktree `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build7-rtl-back-v1` is detached **clean** at `74188bea5a23269c3d19448894c6ad5381e3b3a9`.

Diverged checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` remains `77e9e28` — **not** reset.

`npx vitest run src/lib/i18n/i18n.test.ts` — **12/12 PASS**.

Source facts (not device PASS):

| Contract | Source result |
| --- | --- |
| Locales | `ar, en, fr, es, de, pt` |
| Default / unsupported | `en` (`zh-CN` → `en`) |
| RTL | `ar` only |
| Override vs device | override wins; clear override uses device |
| Catalog keys | identical across six locales; no empty strings |
| Missing key | falls back to English; unknown key returns the raw key |
| English-identical chrome | none except brand/identical set (`UMTUBA`, `Messages`, `Live`, …) |
| FR `nav.messages` | `"Messages"` — allowed identical, not scored as leakage |

`create.publish` is **always rendered** on the signed-in Create `ScrollView` (`app/(tabs)/create.tsx`). It is disabled until a video is selected **and** UGC ack is checked. Previous “not visible in current view” is consistent with **below the fold**. Operator can **scroll Create** to see `Veröffentlichen` without picking a video. Do **not** publish.

`actions.retry` (`Erneut versuchen`) on Create appears only after a **publish error with an asset**. Do not force a real publish failure. Watch `watch.retryPlayback` appears only after a playback error.

Follow UI uses `t("follow.follow")` / `t("follow.following")`. There is **no** Unfollow label by design (`follows.ts`: never show Unfollow). Toggle Following → Follow is the unfollow path.

---

## 6. Prior device-verified results (not redone)

```text
ARABIC_RTL = PASS (earlier)
GERMAN_MANUAL_OVERRIDE = PASS
PROFILE_SETTINGS_BACK = PASS
CONVERSATION_BACK = PASS
OTHER_USER_PROFILE_BACK = PASS
NOTIFICATIONS_BACK = PASS
RTL_HITBOX = PASS
ENGLISH_LTR_BACK = PASS
WATCH_ROOT_BACK = NO-OP intentional
GERMAN_WATCH_LONG_STRING = PASS ("Automatisch weiter an")
GERMAN_CREATE_OPENS = PASS
GERMAN_CREATE_WRAP = PASS
VEROEFFENTLICHEN = STILL_NOT_VISIBLE_IN_CURRENT_VIEW (prior)
UI_OVERLAP = POSSIBLE_WATCH_DURATION_CONTROLS unconfirmed
PREVIOUS_NON_NAVIGATION_FINDING = NOT_REPRODUCED / CLOSE
```

`GERMAN` is still **not** a full locale PASS.

---

## 7. Why remaining checks need the operator

Windows cannot screenshot, dump accessibility, or inject taps into the TestFlight app. Syslog cannot prove chrome language, clipping, overlap, Follow, Saved, or Messages. `house_arrest` did not yield `umtuba.locale.override`. Those checks are **NOT_OBSERVABLE** from this PC.

Unsupported-locale fallback on device requires changing the **iPhone system language** (e.g. Chinese). Source already maps `zh-CN` → `en`. That iPhone change is optional and disruptive; it is **not** in the required checklist.

---

## 8. ONE consolidated operator checklist

Do this **once**, in order. Stay in TestFlight **UMTUBA**. Do **not** submit App Store Production. Do **not** delete the account. Do **not** publish unless step 8 (optional). Note wall-clock time if Watch fails (syslog is already running).

**0. Build number (required because tooling says 6)**  
Open TestFlight → UMTUBA installed build. Write the exact `1.0.0 (N)`. Optionally iOS Settings → General → iPhone Storage → UMTUBA. Do **not** trust only in-app Settings.

**1. German remaining (app should still be Deutsch)**  
Create tab → **scroll down** (do not need to pick a video). Is **Veröffentlichen** visible (likely disabled)? Any raw key? Horizontal clip?  
**Erneut versuchen**: only if a real error row already exists — do not invent a failure.  
Watch: play **3 different** videos. Any `resource unavailable` / player fail? Duration-area overlap yes/no?

**2. Override persist**  
With Deutsch still selected: swipe away UMTUBA (force quit) → reopen. Still Deutsch? Then Profile → Settings → Language → **Gerätesprache verwenden**. Expect Arabic (device is `ar-IL`): tabs شاهد / اكتشف / إنشاء / الرسائل / الملف.

**3. French / Spanish / Portuguese / English (same 30-second scan each)**  
Settings → Language → set locale. On Watch + Create glance: title, five tabs, auto-next label, Create title + publish label, no `nav.` / `create.` raw keys, no obvious clip/overlap, Back chevron left.

| Locale | Watch | Tabs (W/D/C/M/P) | Auto-next on | Create / Publish |
| --- | --- | --- | --- | --- |
| FR | Regarder | Regarder / Découvrir / Créer / Messages / Profil | Lecture suivante activée | Créer / Publier |
| ES | Ver | Ver / Descubrir / Crear / Mensajes / Perfil | Siguiente automático activado | Crear / Publicar |
| PT | Assistir | Assistir / Descobrir / Criar / Mensagens / Perfil | Próximo automático ligado | Criar / Publicar |
| EN | Watch | Watch / Discover / Create / Messages / Profile | Auto-next on | Create / Publish |

`Messages` in French matching English is **allowed**. Ignore UGC titles. Product tokens `UMTUBA` / `UM` / `Rising` are not leakage.

**4. Arabic representative**  
After reset-to-device (step 2) or set العربية. Confirm tabs + شاهد + التالي تلقائي / التشغيل التلقائي التالي مفعّل. Do **not** retest the Back gate.

**5. Regression (any working locale; Arabic is fine)**  
- Other-user Profile opens (not only Back).  
- Follow: متابعة/Follow → تتابع/Following. Tap again to unfollow (label will **not** say Unfollow).  
- Save a video → leave Watch → return; still saved.  
- Messages: open a thread, send **one** harmless test message.  
- Home button 10s → resume; still signed in; Watch still works.  
- No crash / white screen.

**6. Optional upload**  
Pick a **local** short video on Create, ack Terms, **Veröffentlichen** only if you accept it going to Watch. Then **Open** should focus the new post. Skip if you do not want a public test post. Do not block anyone.

**7. Optional / skip unless asked**  
iPhone Settings → language Chinese → reopen UMTUBA with “use device language” → expect English. Then restore Arabic on the iPhone.

Reply with: TestFlight `(N)`; Veröffentlichen visible?; 3 Watch results; persist/reset; FR/ES/PT/EN/AR one line each; Follow/Save/Messages/resume; any crash time.

---

## 9. What was not done (by design)

- No App Store Production submit  
- No iOS rebuild / re-upload  
- No Android `versionCode` change  
- No reset of `77e9e28`  
- No `CURSOR_REPORT.md` overwrite  
- No source change to make a test pass  
- No fabricated UI PASS  
- Syslog left running (pid 23308) for the operator window  

---

## 10. Central

```text
CENTRAL_ACTION_REQUIRED = YES
DO_NOT_SUBMIT_APP_STORE = YES
DO_NOT_REBUILD_WITHOUT_GO = YES
RESOLVE = installation_proxy CFBundleVersion 6 vs expected / operator Build 7
IOS_LOCALIZATION_DEVICE_QA = IN_PROGRESS
IOS_RELEASE_READY = NOT_DECLARED
```
