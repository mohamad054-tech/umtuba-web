# PC2 FINAL iOS WATCH UI FIX WAVE — A1

```text
PC2 REPORT
SOURCE_DEVICE = PC2
TASK_ID = PC2_FINAL_IOS_WATCH_UI_FIX_A1_V1
DATE = 2026-08-17
WAVE = PC2_FINAL_IOS_WATCH_UI_FIX_WAVE
MODE = STRICT_SCOPE / TOKEN_CONSERVATIVE
DEVICE = PC2
PRIORITY = MAXIMUM
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_TOUCHED = NO
LEARNING_TOUCHED = NO
ANDROID_VERSIONCODE_MODIFIED = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
IOS_BUILT = NO
A2_STARTED = NO
A3_STARTED = NO
DIVERGED_CHECKOUT_77e9e28_USED = NO
DIVERGED_CHECKOUT_RESET = NO
STALE_PC2_BRANCH_USED = NO
DEVICE_QA_CLAIMED = NO
DEVICE_PASS_INVENTED = NO
```

## Lineage

Authoritative shared mobile tip after `git fetch --prune` is **not**
`origin/master` (`09e94f8`). That tip is 21 commits behind the Central
reconcile lineage that shipped iOS Build 7.

```text
ORIGIN_HEAD = origin/master
ORIGIN_MASTER = 09e94f80775855d7e2036fa7d83d63b9202fb8a4
AUTHORIZED_SHARED_TIP = origin/central/mobile-reconcile-ios-android-v1
AUTHORIZED_SHARED_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
BUILD7_SOURCE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
LOCAL_DIVERGED_CHECKOUT = 77e9e28 (pc2/eas-preview-config-v1) — left untouched
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-watch-ui-fix-v1
BRANCH = fix/watch-ui-overlap-progress-duration-v1
BASE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
SOURCE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
REMOTE_REF = origin/fix/watch-ui-overlap-progress-duration-v1
REMOTE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
REMOTE_SHA_VERIFIED = YES
PUSHED_TO_MASTER = NO
```

Worktree was created from `origin/master`, then fast-forwarded only to
`origin/central/mobile-reconcile-ios-android-v1` (`74188be`). No reset of
`77e9e28`. No use of `pc2/a2-open-watch-published-post-v1`,
`pc2/eas-preview-config-v1`, or uncommitted RTL worktree patches.

## Return fields

```text
BASE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
FILES_CHANGED = app/(tabs)/create.tsx; components/WatchVideoCard.tsx; src/lib/video/pickVideo.ts; src/lib/video/pickVideo.test.ts; src/lib/watch/playbackPolicy.ts; src/lib/watch/playbackPolicy.test.ts; src/lib/watch/railLayout.ts; src/lib/watch/railLayout.test.ts
ROOT_CAUSE_1 = Watch rail bottom was timelineBottom+52, the same band as the duration clock. Owner delete label (Supprimer/Eliminar/Delete) is the last rail item; actionCount had no maxWidth. Structural absolute-rail vs full-width clock, not translation length.
ROOT_CAUSE_2 = Scrub fill used width% (Yoga grows from RTL start/right) while the thumb used left% (physical left). Same ratio, opposite edges → second cyan segment. Seek math is physical pageX, so LTR origin is required.
ROOT_CAUSE_3 = pickVideo treated expo-image-picker duration as seconds and multiplied by 1000. ImagePicker documents milliseconds. IMG_0008.MOV ~8.2s arrived as 8200; display did durationMs/1000 → 8200s. Not an upload failure.
FIX_1 = Raised WATCH_RAIL_BOTTOM_EXTRA 52→84, wired rail to watchRailBottomOffset, capped action labels at 72pt, reserved 56pt physical-right gutter on the clock row.
FIX_2 = Forced scrub track/hit to direction:ltr; fill is absolute left:0 + shared percent helper; thumb uses the same physical-left percent. LTR unchanged.
FIX_3 = pickerDurationToMs: values <1000 stay seconds (legacy Android mocks); 8200 stays 8200ms. Create shows formatPickedDurationSecondsLabel → 8s. Publish/upload path untouched.
TARGETED_TESTS = PASS — vitest 50 passed (railLayout + playbackPolicy + pickVideo)
TYPECHECK = PASS — npx tsc --noEmit
LINT = PASS — npm run lint (tsc --noEmit)
SOURCE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
REMOTE_SHA_VERIFIED = YES
BLOCKERS = NEW_IOS_BINARY_REQUIRED — Build 7 on device still has all 3 defects until A2 ships a new binary from 658936e. No device QA this track.
```

## Defect 1 — WATCH_LOWER_RIGHT_TEXT_OVERLAP

Physical: lower-right Watch metadata/control area. Delete label overlaps
duration/numeric metadata. Repro DE/FR/ES/AR.

`WatchVideoCard` rail is `position: "absolute"`, `right: 12`, previously
`bottom: timelineBottom + 52`. Timeline clocks sit in a full-width row
at `bottom: timelineBottom` above a 48pt scrub hit — the duration clock
is in the same vertical band as the last rail label.

Owner rail last item is `t("actions.delete")` (`Supprimer` / `Eliminar` /
`Delete` / `Löschen` / `حذف`) with `numberOfLines={1}` and no maxWidth.

Not a translation-length bug. Shared layout.

Fix (no Watch redesign): lift rail via `watchRailBottomOffset`, cap
labels, keep duration left of the physical-right rail column.

## Defect 2 — WATCH_PROGRESS_BAR_RTL_LAYOUT

Physical Arabic: main thumb moves with playback while a second cyan
segment appears/moves from the opposite side.

`ScrubBar` fill was `width: ${ratio}%` (start-edge in RTL) and thumb was
`left: ${ratio}%` (physical left). Seek uses `pageX` vs `measureInWindow`
x/width — physical left → right. Volume bar shares this component.

Fix: lock scrub chrome to `direction: "ltr"`, pin fill to `left: 0` +
width percent, keep thumb on the same percent. LTR fill/thumb still grow
from the left.

## Defect 3 — SELECTED_VIDEO_DURATION_DISPLAY_8200s

Physical: IMG_0008.MOV 9.5 MB showed `8200s` on Create after select.
Persistent after terms. Upload later succeeded — not an upload failure.

`expo-image-picker` documents `duration` in milliseconds (iOS
`VideoUtils.readDurationFrom` returns ms). Code assumed seconds:

`Math.round(8200 * 1000) = 8_200_000` → Create `durationMs / 1000` →
`8200s`.

`pickerDurationToMs(8200) = 8200` → label `8s`. Values `< 1000` still
convert as seconds so existing Android 12.5s mock stays `12500ms`.
`publishVideoPost` / upload flow not changed.

## Exact files changed

| File | Change |
| --- | --- |
| `src/lib/watch/railLayout.ts` | Rail lift, label max width, clock gutter |
| `src/lib/watch/railLayout.test.ts` | Offset / gutter assertions |
| `src/lib/watch/playbackPolicy.ts` | LTR scrub percent helpers |
| `src/lib/watch/playbackPolicy.test.ts` | Fill/thumb same-origin |
| `components/WatchVideoCard.tsx` | Apply rail + scrub layout |
| `src/lib/video/pickVideo.ts` | Duration unit normalize + label |
| `src/lib/video/pickVideo.test.ts` | 8200ms → 8s; picker path |
| `app/(tabs)/create.tsx` | Use duration label helper |

## Safety

```text
MIGRATIONS = NONE
SECRETS_EXPOSED = NO
ANDROID_VERSIONCODE = UNCHANGED
IOS_BUILD_NUMBER = UNCHANGED
STORE = UNTOUCHED
LEARNING = UNTOUCHED
PUBLISH_UPLOAD_FLOW = UNTOUCHED
NAVIGATION_SAVED_FOLLOW_MESSAGES_AUTH = UNTOUCHED
GIT_CONFIG_UPDATED = NO
HOOKS_SKIPPED = NO
FORCE_PUSH = NO
AMEND = NO
MASTER_PUSHED = NO
```

## Tests / TypeScript / lint / diff

```text
TARGETED_TESTS = PASS
VITEST = 3 files / 50 tests passed
  src/lib/watch/railLayout.test.ts
  src/lib/watch/playbackPolicy.test.ts
  src/lib/video/pickVideo.test.ts
TYPECHECK = PASS
LINT = PASS
GIT_DIFF_CHECK = PASS
GIT_STATUS_AFTER_COMMIT = clean (worktree tracks origin/fix/watch-ui-overlap-progress-duration-v1)
```

## Commit / remote

```text
COMMIT = 658936e18718606a3b3d30753e717d7fe9e86a18
MESSAGE = fix(mobile): keep Watch chrome and Create duration on physical layout units
REMOTE = origin
REMOTE_BRANCH = fix/watch-ui-overlap-progress-duration-v1
REMOTE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
REMOTE_SHA_VERIFIED = YES
PR_URL = https://github.com/mohamad054-tech/umtuba-mobile/pull/new/fix/watch-ui-overlap-progress-duration-v1
```

## What this track did not do

- iOS EAS build / TestFlight upload (A2)
- Device QA / iPhone retest
- App Store Production submit
- Android versionCode bump
- Store / Learning
- Overwrite `docs/ai/CURSOR_REPORT.md`
- Reset or use diverged checkout `77e9e28`

## Open issues

Build 7 (`74188be`, TestFlight 1.0.0 (7)) still shows all three defects
on device until A2 produces a new binary from `658936e`. Do not invent
device PASS.
