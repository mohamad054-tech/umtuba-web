# PC2 iOS BUILD 17 — Video editor exit FAIL (RECORD ONLY)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS17_BUILD_TESTFLIGHT_DEVICE_QA_V1
DATE = 2026-08-20
PHASE = DEVICE QA — VIDEO EDITOR EXIT FAIL
MODE = RECORD_ONLY — NO PATCH — NO REBUILD — NO REVIEW SUBMIT
DEVICE = physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 17
AUTHORIZED_SOURCE_SHA = f66f15c81772e671da85f04333b1fbb26b9e54a5
SOURCE_SHA = f66f15c81772e671da85f04333b1fbb26b9e54a5
EAS_BUILD_ID = b65d2d81-13f2-43b5-b6c6-fc515344f03c
TESTFLIGHT_BUILD = 17
VIDEO_EDITOR_OPEN = PASS
VIDEO_EDITOR_EXIT_TO_PUBLISH = FAIL
CREATE_PUBLISH = BLOCKED_BY_EDITOR_UI
SEVERITY = P0
IOS17_READY = NO
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
`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build17-testflight-device-qa-v1`
at SHA `f66f15c81772e671da85f04333b1fbb26b9e54a5`. Main checkout
`umtuba-mobile` was **not** reset. No mobile source was changed.

Do **not** patch. Do **not** rebuild. Do **not** Add for Review.
Do **not** treat the header `Done` string in source as a device PASS.

---

## Official device evidence (authoritative)

Physical iPhone 13 / TestFlight **1.0.0 (17)**.

```text
VIDEO_EDITOR_OPEN = PASS
VIDEO_EDITOR_EXIT_TO_PUBLISH = FAIL
CREATE_PUBLISH = BLOCKED_BY_EDITOR_UI
```

After finishing video editing, the operator had **no visible
actionable control** (Next / Done / Continue) to leave the editor
and proceed to publish. Create publish is blocked by that editor UI.

This is **not** a Watch finding. Untested Create fields
(sound library, checkbox, timestamp, Watch composite, share-export)
stay `NOT_STARTED`. They are not PASS.

---

## How the user is supposed to leave the editor (source)

Publish is **not** inside the editor. It lives on the Create form
under the full-screen modal (`app/(tabs)/create.tsx` publish
Pressable + `canPublishCreateDraft`). The editor must close first.

Coded exits on SHA `f66f15c`
(`components/create/VideoEditorScreen.tsx`):

| Control | Where | Action | Visible as Next/Done/Continue? |
| --- | --- | --- | --- |
| Header `t("create.editorDone")` | Top bar, trailing text | `onClose()` → `setEditorOpen(false)` | Source yes (small cyan text). Device: not seen. |
| Header `t("actions.back")` | Top bar, leading text | `askClose()` → Alert; confirm uses `create.editorDone` | Discard/leave alert, not a proceed CTA. |
| `Modal.onRequestClose` | Android back / system | `askClose()` | iPhone has no hardware back. |
| Swipe-down / page sheet | — | **Not implemented** | Modal is default full-screen `slide`, not `pageSheet`. |
| Bottom Next / Continue / Publish | Tool `ScrollView` | **Not implemented** | Last filled button is Sound Library. |
| Gesture / overflow menu | — | **Not implemented** | No hidden menu. |
| Gate on text / sound / trim | — | **Not implemented** | `Done` is not conditionally unmounted. |

`onClose` only sets `editorOpen` false. It does not publish.

Editor is not auto-opened after pick. Create shows an `Edit video`
link; `VIDEO_EDITOR_OPEN = PASS` means that path worked.

---

## Why header Done would not be a visible exit on iPhone 13

Source **did** add a header Done. Official QA still recorded
**no visible** Next / Done / Continue. Do not score that header
string as PASS.

Reasons it would not read or sit as a usable iPhone 13 control:

1. **No completion CTA in the edit workspace.** Trim, text, stickers,
   original audio, then a filled primary `create.openSoundLibrary`.
   After finishing edits the operator is in that `ScrollView`. There
   is no Next / Done / Continue there. Header chrome is outside that
   flow (280pt preview + a long tool list above).

2. **iPhone Modal + safe area.** The editor is an RN `Modal`. Content
   is a `SafeAreaView` only — no nested `SafeAreaProvider`, no
   `useSafeAreaInsets()`. `react-native-safe-area-context` ~5.7 docs
   still require wrapping Modal bodies. If insets are 0, the 48pt
   top bar sits in the iPhone 13 notch/status-bar band (clock left,
   battery right, notch center). Back/Done then overlap system UI
   and do not read as buttons. Title sits under the notch.

3. **Title can push Done off the 390pt edge.** `topBar` is
   `flexDirection: "row"` + `space-between`. Title has no `flex: 1`,
   `flexShrink`, `numberOfLines`, or overflow clip. Buttons default
   `flexShrink: 0`. Long DE/FR titles or Dynamic Type can extend the
   trailing Done past the iPhone 13 width (or the leading edge in RTL).

4. **RTL / locale.** Modal and top bar do **not** use
   `localeRootStyle` / `direction`. `I18nManager.forceRTL` is
   best-effort (`src/lib/i18n/rtl.ts`). If RTL flipped, Done becomes
   a two-glyph Arabic `تم` on the opposite physical side. If it did
   not flip, Done stays trailing as small cyan text. Neither is a
   filled proceed control.

5. **Low affordance, not a color-on-color accident.**
   `barBtnText` is `colors.accentCyan` (`#22d3ee`) on `colors.bg`
   (`#050510`) — contrast is fine **if** the pixels are on screen.
   There is no fill, border, icon, or primary weight. Same style as
   Back. It does not look like “continue to publish”.

6. **Not a feature gate.** `Done` is always in the tree. It is not
   hidden until the user adds text or a sound. “Requires text/sound
   first” is **not** the cause.

7. **No iPhone dismiss gesture.** Full-screen Modal. No page-sheet
   swipe. `onRequestClose` does not give a visible iPhone control.

8. **Publish is covered.** While `editorOpen` is true the modal
   covers the Create Publish button. Stuck in the editor means
   `CREATE_PUBLISH = BLOCKED_BY_EDITOR_UI`.

---

## Severity

```text
SEVERITY = P0
```

Typical Create path on this build: pick video → open editor
(PASS) → finish edits → **cannot leave** → cannot reach checkbox /
Publish. That blocks the intended publish path for a typical user.

---

## Root cause

```text
ROOT_CAUSE = EDITOR_HAS_HEADER_ONLY_DONE_NOT_VISIBLE_AS_EXIT_CTA; NO_BOTTOM_NEXT_CONTINUE; IOS_MODAL_SAFEAREA_AND_TITLE_OVERFLOW_CAN_HIDE_HEADER; PUBLISH_LIVES_UNDER_MODAL
```

Exact cause from source + device:

- Device: after editing, no visible Next / Done / Continue; publish
  blocked.
- Source: the only proceed-style exit is a low-affordance header
  text button. There is no sticky/footer Next / Continue. iOS
  full-screen Modal + optional zero safe-area + unconstrained title
  explain why that header control would not be visible or tappable
  on iPhone 13. This is **not** “source never added any Done key”.
  It is “source never added a completion CTA that remains visible
  in the edit workspace, and the header Done is not a reliable
  iPhone 13 exit.”

---

## Source evidence (SHA `f66f15c` only)

Worktree HEAD = `f66f15c81772e671da85f04333b1fbb26b9e54a5`.

- `components/create/VideoEditorScreen.tsx`
  - Lines 75–80: Back → `Alert.alert` (`editorDiscard*` / Keep /
    Done).
  - Lines 85–102: top bar Back + title + Done (`onClose`).
  - Lines 125–340: tools `ScrollView`; last primary =
    `onOpenSounds` / `create.openSoundLibrary`.
  - No footer Next / Continue / Publish.
  - `Modal` at line 83: `animationType="slide"` only.
  - Styles 348–357: top bar / title / `barBtn` as above.
- `app/(tabs)/create.tsx`
  - `editorOpen` default false; open only from `create.editVideo`.
  - `onClose={() => setEditorOpen(false)}` (line 931).
  - Publish Pressable ~899–920, **behind** the modal.
- `src/lib/i18n/messages/{en,ar,de,es,fr,pt}.ts`:
  `create.editorDone` = Done / تم / Fertig / Listo / Terminé /
  Concluído.
- `src/theme/colors.ts`: cyan on near-black.
- `app/_layout.tsx`: one root `SafeAreaProvider`; editor Modal is
  not wrapped again.
- `VideoOverlayLayer` is `pointerEvents="none"` inside the 280pt
  stage — it does not cover the header.

---

## Smallest Central-owned fix (describe only — not applied)

Stay in `VideoEditorScreen.tsx` (optional one new i18n key). Do not
change publish APIs, Watch, or Store.

1. Add a **sticky footer** primary Pressable, always mounted (no
   overlay/sound gate), `minHeight` 48, existing `styles.primary`,
   label `create.editorDone` or a new Continue/Next string, `onPress={onClose}`.
2. Pad that footer (and the header) with `useSafeAreaInsets()` so
   controls cannot sit under the notch or home indicator. Prefer a
   nested `SafeAreaProvider` around Modal children.
3. Header hygiene: `flex: 1` + `numberOfLines={1}` on the title;
   keep header Done as a secondary; `zIndex` on the bar buttons.

That is the smallest change that makes “leave editor → Create
publish” visible on iPhone 13. Tightening only the header without a
workspace-level CTA can still fail the same typical-user check.

PC2 must **not** implement this. Central owns the SHA and the next
iOS binary.

---

## Safety

```text
SOURCE_CHANGED = NO
BUILD_CHANGED = NO
REVIEW_SUBMITTED = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
IOS17_READY = NO
CENTRAL_ACTION_REQUIRED = ADD_VISIBLE_EDITOR_EXIT_CTA_THEN_NEW_SHA_AND_IOS_BINARY
```
