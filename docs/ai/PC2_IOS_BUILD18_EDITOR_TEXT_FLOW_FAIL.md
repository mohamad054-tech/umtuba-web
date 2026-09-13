# PC2 iOS BUILD 18 — Editor text flow FAIL (READ-ONLY RCA)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS18_EDITOR_TEXT_FLOW_FAIL_RCA_V1
DATE = 2026-08-20
PHASE = DEVICE QA — EDITOR TEXT FLOW FAIL — STOP REMAINING PUBLISH QA
MODE = RECORD_ONLY — NO PATCH — NO BUILD 19 — NO REVIEW SUBMIT
DEVICE = physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 18
AUTHORIZED_SOURCE_SHA = a70a399d3e68780688094615d95b248a91a6120f
SOURCE_SHA = a70a399d3e68780688094615d95b248a91a6120f
EAS_BUILD_ID = 30fb2519-2677-470b-a62f-6b9653d22ef3
TESTFLIGHT_BUILD = 18
TEXT_OVERLAY_RENDER = PASS
TEXT_DRAG = FAIL
KEYBOARD_DISMISS = FAIL
BUILD18_EDITOR_TEXT_FLOW = FAIL
IOS18_READY = NO
REVIEW_SUBMITTED = NO
SOURCE_CHANGED = NO
BUILD_CHANGED = NO
DEVICE_PASS_INVENTED = NO
PATCH_APPLIED = NO
REBUILD = NO
CURSOR_REPORT_OVERWRITTEN = NO
MAIN_CHECKOUT_77e9e28_RESET = NO
```

Read-only inspect of detached worktree
`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build18-editor-targeted-retest-v1`
at SHA `a70a399d3e68780688094615d95b248a91a6120f`. Main checkout
`umtuba-mobile` was **not** reset. No mobile source was changed.

Do **not** patch. Do **not** build 19. Do **not** Add for Review.
Do **not** invent PASS.

---

## Official device evidence (authoritative)

Physical iPhone 13 / TestFlight **1.0.0 (18)** / EAS `30fb2519-2677-470b-a62f-6b9653d22ef3`.

```text
TEXT_OVERLAY_RENDER = PASS
TEXT_DRAG = FAIL
KEYBOARD_DISMISS = FAIL
BUILD18_EDITOR_TEXT_FLOW = FAIL
```

- Text overlay **renders**.
- Direct touch-drag moves the text **opposite** the finger.
- Expected: **1:1 same X/Y**, including Arabic / RTL editor.
- After text entry, the iOS keyboard **stays**. No clear Done / تم.
- Operator cannot return to editing.
- Stop remaining publish QA.

Untested Create / Watch surfaces stay `NOT_STARTED` (not PASS).

---

## TEXT_DRAG_ROOT_CAUSE

Live drag does **not** map the finger in physical stage space.

`VideoOverlayLayer.DraggableOverlay` (`components/create/VideoOverlayLayer.tsx`)
uses `PanResponder` and on move calls `applyOverlayDrag(start, gesture.dx, gesture.dy, width, height)`.
It **ignores** `event.nativeEvent.locationX/Y` and `pageX/pageY`.

`applyOverlayDrag` (`src/lib/video/overlayDrag.ts`) writes:

```text
x = clamp01(start.x + dx / width)
y = clamp01(start.y + dy / height)
```

The glyph is then placed with **physical-left** Yoga props:

```text
left: el.x * width
top:  el.y * height
transform: translateX(-hit/2), translateY(-hit/2), rotate
```

The overlay contract (`src/lib/video/videoOverlays.ts`) defines
`x/y` as normalized centers with **0 = top/left, 1 = bottom/right**.

That math is 1:1 only while `left`/`dx` share the same physical
origin. On the Arabic / RTL editor they do not:

- `I18nProvider` calls `applyRtl` → `I18nManager.allowRTL(true)` +
  `forceRTL(true)` for `ar`, and wraps the tree in
  `localeRootStyle` (`direction: "rtl"`).
- The editor `Modal` / stage / `VideoOverlayLayer` never lock
  `direction: "ltr"` (Watch scrub and global header already do).
- Nobody calls `I18nManager.swapLeftAndRightInRTL(false)`. RN’s
  default left/right swap stays on.
- There is **no** `scaleX(-1)` and **no** inverted PanResponder.
- `hitTestOverlay(locationX, locationY)` exists but is **unused**
  by the live layer.

So `gesture.dx` (physical / page translation) is added onto a
`left` that RTL treats as the opposite horizontal edge. Finger
right → `x` increases → swapped `left` moves the glyph **left**.
That is opposite-finger drag. Unit tests only cover LTR
(`overlayDrag.test.ts`: +dx → larger x). No RTL case.

Y uses `top` + `dy` and is not left/right-swapped. Official FAIL
is the inverted finger mapping; the required contract is 1:1 X **and**
Y including RTL. X is the broken axis in source.

Watch already documented this class:
`WATCH_SCRUB_LAYOUT_DIRECTION = "ltr"` and
`resolveScrubRatioFromPageX` — Yoga `%` / `left` vs RTL start-edge.

```text
TEXT_DRAG_ROOT_CAUSE = APPLY_OVERLAY_DRAG_ADDS_GESTURE_DX_TO_STYLE_LEFT; RTL_SWAPS_LEFT; NO_PHYSICAL_PAGEX_MAP
```

---

## RTL_COORDINATE_CAUSE

```text
RTL_COORDINATE_CAUSE = I18NMANAGER_FORCERTL_AR + DIRECTION_RTL_ROOT; OVERLAY_USES_LEFT_PLUS_DX; NO_LTR_LOCK; NO_SCALEX_NEG1; NO_INVERTED_PANRESPONDER; LOCATIONX_HITTEST_UNUSED
```

| Mechanism | Present on SHA `a70a399`? |
| --- | --- |
| `I18nManager.forceRTL` for Arabic | **Yes** — `src/lib/i18n/rtl.ts` `applyRtl` |
| Root `direction: "rtl"` | **Yes** — `localeRootStyle` in `I18nProvider` |
| Overlay / stage `direction: "ltr"` lock | **No** |
| `scaleX(-1)` on editor overlay | **No** |
| Inverted PanResponder / negated `dx` | **No** |
| Live drag uses `pageX` / `measureInWindow` | **No** — `gesture.dx` / `gesture.dy` only |
| Live drag uses `locationX` / `locationY` | **No** — only unused `hitTestOverlay` |

Arabic header / footer strings (`create.editorDone` = تم,
`create.editorContinue` = متابعة) are unrelated to drag math.

---

## KEYBOARD_DISMISS_ROOT_CAUSE

Editor `TextInput` in `VideoEditorScreen` has **no** dismiss chrome.

Present:

- `KeyboardAvoidingView` `behavior="padding"` on iOS (shifts layout
  only; does not dismiss).
- Tools `ScrollView` `keyboardDismissMode="on-drag"` +
  `keyboardShouldPersistTaps="handled"` (dismiss only if the user
  discovers a drag on the tool list; not a Done / تم).
- Header `create.editorDone` (AR **تم**) calls `commitAndContinue`
  and **closes the editor**. It is not a keyboard Done.
- Footer Continue also exits to publish.

Absent (repo-wide for this input):

- `returnKeyType="done"`
- `blurOnSubmit` / `onSubmitEditing` → `Keyboard.dismiss()`
- `InputAccessoryView` / `inputAccessoryViewID`
- Toolbar تم that **only blurs**
- Blur on Add Text (`setTextDraft("")` leaves focus)
- Tap-stage-to-dismiss

Arabic iOS keyboards often have **no** visible Done / return.
Without an accessory toolbar, there is no clear تم. The focused
field keeps the keyboard up; the operator cannot return to
overlay editing. `Keyboard.dismiss` exists on World search only
(`WorldSearchBar`), not the editor.

```text
KEYBOARD_DISMISS_ROOT_CAUSE = NO_INPUTACCESSORY_DONE_TAM; NO_RETURNKEYTYPE_DONE; NO_BLUR_ON_ADD_TEXT; HEADER_TAM_EXITS_EDITOR; KAV_PADDING_ONLY
```

---

## Severity

```text
P0 = TEXT_DRAG; KEYBOARD_DISMISS; BUILD18_EDITOR_TEXT_FLOW
P1 = NONE
```

Both official FAILs are **P0**. Opposite-finger drag writes wrong
normalized `x` into edit state (Watch composite would show the
mirrored place). Stuck keyboard blocks the rest of the edit loop.
Together they stop remaining publish QA.

Not P1: unused `hitTestOverlay(locationX)` is dead code, not a
separate device finding.

```text
IOS18_READY = NO
```

---

## Smallest Central-owned fix (describe only — do not implement)

One Central SHA. Do not ship two rebuilds.

1. **Physical 1:1 drag (RTL-safe)**  
   Lock the editor stage + `VideoOverlayLayer` to
   `direction: "ltr"` (same pattern as
   `WATCH_SCRUB_LAYOUT_DIRECTION` / `GLOBAL_HEADER_LAYOUT_DIRECTION`).
   Keep `left`/`top` as the overlay contract origin
   (0 = top/left). Map move from physical `pageX`/`pageY` versus
   stage `measureInWindow`, **or** keep `gesture.dx`/`dy` only
   after that LTR lock so translation matches `left`/`top`.
   Do **not** use `scaleX(-1)`. Do **not** invert the PanResponder.
   Add an RTL unit case: finger +dx must increase physical `x`.

2. **Keyboard Done / تم that only dismisses**  
   On the editor `TextInput`: `returnKeyType="done"`,
   `blurOnSubmit`, `onSubmitEditing` → `Keyboard.dismiss()`.
   iOS `InputAccessoryView` labeled `create.editorDone` (AR تم)
   that **blurs only** — must not call `commitAndContinue`.
   Also dismiss on Add Text. Do not reuse header تم as the
   keyboard control.

```text
CENTRAL_FIX_REQUIRED = YES_SINGLE_SHA_PHYSICAL_DRAG_PLUS_KEYBOARD_DONE_TAM
NEXT_ACTION = REPORT_TO_CENTRAL_FOR_SINGLE_FIX_SHA
```

---

## Evidence (files / functions)

| Area | File / function |
| --- | --- |
| Live drag | `VideoOverlayLayer.tsx` `DraggableOverlay` `onPanResponderMove` |
| Math | `overlayDrag.ts` `applyOverlayDrag` |
| Unused hit | `overlayDrag.ts` `hitTestOverlay(locationX, locationY)` |
| State write | `videoOverlays.ts` `moveOverlay` / `VideoEditorScreen` `onMove` |
| RTL root | `rtl.ts` `applyRtl` / `localeRootStyle`; `I18nProvider` |
| Known LTR lock | `playbackPolicy.ts` `WATCH_SCRUB_LAYOUT_DIRECTION`; `globalBack.ts` |
| Keyboard | `VideoEditorScreen` `TextInput` + `KeyboardAvoidingView` |
| AR تم (exit, not KB) | `messages/ar.ts` `create.editorDone` |

---

## Safety

- No mobile source change.
- No Build 19 / new EAS job.
- No Review / Production submit.
- `CURSOR_REPORT.md` not overwritten.
- Main checkout `77e9e28` not reset.
- TEXT_OVERLAY_RENDER PASS is **not** a drag or keyboard PASS.
