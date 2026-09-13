# PC2_IOS_BUILD18_FINAL_EDITOR_TARGETED_QA_V1

Retry after operator said iPhone 13 is unlocked, trusted, and USB-connected. The iPhone **is** live. TestFlight **UMTUBA 1.0.0 (18)** **is** installed. Targeted editor QA was **not** executed because this Windows session cannot drive the app UI. Prior FAIL/PASS was **not** copied. iPad was **not** used.

```text
TASK_ID = PC2_IOS_BUILD18_FINAL_EDITOR_TARGETED_QA_V1
DATE = 2026-08-20
DEVICE = PC2
DEVICE_ROLE = IOS_TESTFLIGHT_IPHONE13_VALIDATOR
IOS_V1_DEVICE_SCOPE = IPHONE_ONLY
CURRENT_TARGET_BUILD = 18
AUTHORIZED_SOURCE_SHA = a70a399d
IPHONE13_USB_CONNECTED = YES
LIVE_USB_DEVICE = iPhone14,5 / iPhone 13 / 00008110-000A10123AF9801E / iOS 26.6 (23G71)
IPAD_USED = NO
SOURCE_CHANGED = NO
REBUILD_PERFORMED = NO
APP_STORE_REVIEW_SUBMITTED = NO
DEVICE_PASS_INVENTED = NO
PRIOR_FAIL_COPIED = NO
```

## 1 — USB / identity (this turn)

| Check | Result |
| --- | --- |
| `Get-PnpDevice -PresentOnly` | **Apple iPhone** WPD OK; composite `USB\VID_05AC&PID_12A8\00008110000A10123AF9801E` |
| Explorer portable | **Apple iPhone** |
| usbmux | One USB device, ProductID **4776** (`0x12A8`), DeviceID **4**, serial `00008110-000A10123AF9801E` |
| Live lockdown | `DeviceClass=iPhone`; `ProductType=iPhone14,5`; `HardwareModel=D17AP`; iOS **26.6** / **23G71** |
| iPad on USB this turn | **NONE** |
| Pairing | Trusted live session (`EnableSessionSSL=true`, `sessionError=null`) |
| `idevice*` / `pymobiledevice3` / `tidevice` | **ABSENT** |
| `com.apple.mobile.screenshotr` | **InvalidService** |
| Tap / XCUITest / WDA | **ABSENT** |

## 2 — Build 18 identity (installed binary)

`installation_proxy` Lookup `com.umtuba.app` on the live iPhone (DeviceID 4):

| Field | Value |
| --- | --- |
| CFBundleDisplayName | UMTUBA |
| CFBundleShortVersionString | 1.0.0 |
| CFBundleVersion | **18** |
| SignerIdentity | TestFlight Beta Distribution |
| ApplicationType | User |
| UISupportedDevices | iPhone models only (includes `iPhone14,5`; **no iPad** models) |

Authorized worktree SHA remains `a70a399d3e68780688094615d95b248a91a6120f` (`supportsTablet: false`). No rebuild.

`BUILD18_AVAILABLE_IN_TESTFLIGHT = YES` because the installed binary is TestFlight-signed **18**.

## 3 — Targeted editor QA

**NOT EXECUTED.** Create → editor → footer CTA → text/emoji drag → publish was not opened from this session.

| Gate | Result |
| --- | --- |
| EDITOR_EXIT_FOOTER_CTA | NOT_EXECUTED |
| TEXT_OVERLAY_DRAG | NOT_EXECUTED |
| EMOJI_STICKER_DRAG | NOT_EXECUTED |
| CREATE_EDIT_PUBLISH | NOT_EXECUTED |

No this-turn editor screenshots. Camera-roll MTP listing exists but was **not** used as substitute QA. Syslog/crash not claimed as editor evidence.

## 4 — App Store closeout

Not eligible. Editor QA did not PASS. Add for Review was **not** attempted.

## Next

Keep Build **18**. Do not create Build 19. Operator or macOS session must tap the editor path on this already-installed binary and return observed PASS/FAIL. Then (only if PASS) run ASC closeout.
