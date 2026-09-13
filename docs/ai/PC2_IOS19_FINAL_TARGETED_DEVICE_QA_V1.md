# PC2_IOS19_FINAL_TARGETED_DEVICE_QA_V1 — DEVICE / OPERATOR

Build 19 is in TestFlight. Physical iPhone 13 is USB-live on PC2. Installed binary is still **1.0.0 (18)**. Targeted Sound Library / editor / Profile QA was **not** executed: Windows cannot drive TestFlight or app UI (`screenshotr` InvalidService). Empty catalog is expected. No PASS invented. No App Store Review. No Build 20. No iPad.

```text
TASK_ID = PC2_IOS19_FINAL_TARGETED_DEVICE_QA_V1
DATE = 2026-08-20
DEVICE = PC2
IOS_V1_DEVICE_SCOPE = IPHONE_ONLY
CURRENT_TARGET_BUILD = 19
AUTHORIZED_SOURCE_SHA = c0fe00a4fc34a9262daf5870fbc1f4bc42433853
IPHONE13_USB_CONNECTED = YES
LIVE_USB_DEVICE = iPhone14,5 / iPhone 13 / 00008110-000A10123AF9801E / iOS 26.6 (23G71)
IPAD_USED = NO
BUILD19_AVAILABLE_IN_TESTFLIGHT = YES
BUILD19_INSTALLED_ON_IPHONE13 = NO
INSTALLED_CFBundleShortVersionString = 1.0.0
INSTALLED_CFBundleVersion = 18
SOURCE_CHANGED = NO
APP_STORE_REVIEW_SUBMITTED = NO
DEVICE_PASS_INVENTED = NO
```

## 1 — USB / identity (this turn)

| Check | Result |
| --- | --- |
| `Get-PnpDevice -PresentOnly` | **Apple iPhone** WPD OK; composite `USB\VID_05AC&PID_12A8\00008110000A10123AF9801E` |
| usbmux | One USB device, ProductID **4776** (`0x12A8`), DeviceID **4**, serial `00008110-000A10123AF9801E` |
| Live lockdown | `DeviceClass=iPhone`; `ProductType=iPhone14,5`; `HardwareModel=D17AP`; iOS **26.6** / **23G71** |
| iPad on USB this turn | **NONE** (pairing file for another UDID exists on disk; not attached) |
| Pairing | Trusted live session (`EnableSessionSSL=true`, `sessionError=null`) |
| `idevice*` / `pymobiledevice3` / `tidevice` | **ABSENT** |
| `com.apple.mobile.screenshotr` | **InvalidService** |
| Tap / XCUITest / WDA | **ABSENT** |

## 2 — Installed binary (not Build 19)

`installation_proxy` Lookup `com.umtuba.app` on the live iPhone (DeviceID 4):

| Field | Value |
| --- | --- |
| CFBundleDisplayName | UMTUBA |
| CFBundleShortVersionString | 1.0.0 |
| CFBundleVersion | **18** |
| SignerIdentity | TestFlight Beta Distribution |
| ApplicationType | User |

`BUILD19_INSTALLED_ON_IPHONE13 = NO`. Operator must install **1.0.0 (19)** from TestFlight before any Sound Library / editor / Profile field may leave `NOT_EXECUTED`.

## 3 — Targeted QA this turn

**NOT EXECUTED / BLOCKED_NO_UI_AUTOMATION.** TestFlight UI cannot be tapped from Windows. Do not copy prior FAIL/PASS. Empty catalog must not be treated as a fail if later observed.

## 4 — Operator manual steps remaining

Unlock the iPhone 13 (already USB-connected and trusted). Then:

1. Open **TestFlight**.
2. Open **UMTUBA**.
3. Confirm the available build is **1.0.0 (19)**.
4. Tap **Install** or **Update**. Wait until TestFlight shows **1.0.0 (19)** installed.
5. Open UMTUBA once. Do not start QA on 18.

### Sound Library (release-critical escape; empty catalog expected)

6. Create → editor → **Sound Library**.
7. Record: `SOUND_LIBRARY_OPENS`, `BACK_VISIBLE`, `CLOSE_VISIBLE`.
8. Tap **Back**. Must return to editor. Record `BACK_FUNCTIONAL`, `EMPTY_STATE_VISIBLE`, `EMPTY_STATE_ESCAPE`, `RETURN_TO_EDITOR`, `EDITOR_STATE_PRESERVED`.
9. Open Sound Library again. Tap **Close**. Record `CLOSE_FUNCTIONAL`, `REOPEN_ESCAPE`.
10. If a natural loading spinner appears, confirm you can still exit (`LOADING_ESCAPE`). Do not manufacture a loading state.
11. If a natural error state appears, confirm you can still exit (`ERROR_ESCAPE`). Do not manufacture an error.
12. `SOUND_SELECTION_PATH` stays `NOT_TESTED_CATALOG_EMPTY_NO_LICENSED_ASSETS` unless licensed sounds are actually present. Do **not** fabricate a catalog.

**STOP** if Sound Library cannot exit, empty/loading/error traps the user, or editor state is lost.

### Editor (affected)

13. Confirm footer Continue/Done CTA visible and works (`EDITOR_FOOTER_CTA_VISIBLE` / `FUNCTIONAL`).
14. Add a text overlay, drag it, confirm final position (`TEXT_OVERLAY_DRAG`).
15. Add an emoji/sticker, drag it (`EMOJI_STICKER_DRAG`).
16. Create → edit → exit/continue → publish. No trap, no crash, edit preserved, publish completes (`CREATE_EDIT_PUBLISH`).

**STOP** if CTA fails, overlay drag fails, publish fails, or crash.

### Profile

17. Own profile: header/cover, avatar, display name + username, bio, counters, Edit Profile.
18. Other user if available: open profile, Follow, Following, Unfollow. If no other user: `PARTIAL_NO_OTHER_USER_AVAILABLE`.
19. Confirm text / image / video / mixed posts present (Facebook-style social profile, not TikTok-only video feed).
20. Arabic RTL profile + LTR profile + back navigation.

**STOP** if a Profile release-blocking regression or crash.

21. Return observed PASS/FAIL to Central. Do **not** Add for Review. Do **not** create Build 20.
