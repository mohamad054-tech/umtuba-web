# Session close handoff — 2026-08-29

**Owner can shut down the PC.** Everything below is persisted in-repo. No commit. No push. No deploy. No migrations applied.

```
LAST_ASSIGNED = DESKTOP_FOLD6_CONTAIN_FIT_INSTALL_RETRY_V1
STATUS = PASS
SHUTDOWN_SAFE = YES
COMMIT = NO
PUSHED = NO
DEPLOYED = NO
PLAY_UPLOAD = NO
DIRTY_PARENT_RESET = NO
DESKTOP_WRITES = NO
PORT_EXTRACT_TOUCHED = NO
```

## Next-boot first reads

1. This file.
2. `docs/ai/CURRENT_TASK.md`
3. `docs/ai/PROJECT_STATE.md`
4. `docs/ai/CURSOR_REPORT.md`
5. FIT worktree: `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-FOLD6-WATCH-VIDEO-FIT-V1\docs\ai\CURRENT_TASK.md`

Do **not** restore the stale 2026-08-28 Brand Phase 2 `BLOCKED_GIT_SAFETY_AND_PACKAGE` packet as current production. Live official SHA is `b5fbeff`.

## Hard constraints (still true after reboot)

- Never reset / clean / stash the dirty parent checkout `C:\Users\1\Desktop\umtuba\umtuba-web` (`office/profile-hero-completeness-v1` @ `380a36646d4de8a37c39a56ac3ccd449f6d8b20d`).
- Never write artifacts to the Windows Desktop.
- Never touch `_port_extract`.
- No Play Store upload. No Android production release from the FIT APK.
- No web/iOS product changes unless a new GO says so.
- Do not invent `origin/main`. Do not invent `ANON_KEY`. House key is `PUBLISHABLE_KEY`.

## LAST ASSIGNED — Fold6 contain/FIT — OWNER-CONFIRMED PASS

```
TASK_ID = DESKTOP_FOLD6_CONTAIN_FIT_INSTALL_RETRY_V1
STATUS = PASS
SOURCE_SHA = 703740b85048d4d14ea6ffb1e322f33b33d24a48
BUILD_FAILURE_ROOT_CAUSE = LOCAL_GRADLE_DISK_AND_WIN260_PATH; EAS_NEVER_STARTED_UNTIL_RETRY
BUILD_ONLY_FIX_REQUIRED = NO
BUILD_SHA = 703740b85048d4d14ea6ffb1e322f33b33d24a48
APK_BUILD = PASS
APK_PATH_OR_BUILD_ID = b2b0bbd8-13e3-43d1-9a1f-c61bddf9ff13 | docs/ops/fold6-contain-fit-install-retry-v1/umtuba-703740b-b2b0bbd8.apk
FOLD6_CONNECTED = YES
DEVICE = Galaxy Z Fold6 SM-F956B
NEW_APK_INSTALLED = YES
INSTALLED_BUILD_VERIFIED = YES
INSTALLED_VERSION_NAME = 1.0.22
EAS_PREVIEW = b2b0bbd8
INSTALLED_COMMIT = 703740b
OLD_CROPPED_VIDEO_APK_1_0_0 = NO
FOLDED_CONTAIN_FIT = PASS
UNFOLDED_CONTAIN_FIT = PASS
VIDEO_CROPPED = NO
ASPECT_RATIO_PRESERVED = YES
PLAYBACK = PASS
SWIPE = PASS
AUTO_ADVANCE = PASS
THREE_VIDEO_CACHE = PASS
CRASH = NO
PLAY_UPLOAD = NO
DEPLOYED = NO
BLOCKERS = NONE
WORKTREE = C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-FOLD6-WATCH-VIDEO-FIT-V1
```

Owner said the video is fine, then asked to save everything before shutdown.

APK + folded screenshots (do not delete):

`C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-FOLD6-WATCH-VIDEO-FIT-V1\docs\ops\fold6-contain-fit-install-retry-v1\`

- `umtuba-703740b-b2b0bbd8.apk`
- `01-after-launch.png` … `05-folded-autonext.png`
- `06-inner-try.png` is an earlier black inner-panel ADB attempt; owner later confirmed unfolded PASS.

## Official production / git

| Fact | Value |
| --- | --- |
| Official remote | `origin/alpha-0.2` |
| Live + official SHA | `b5fbeff29cb0f308481b38c06500c572cd44a9c4` |
| `origin/main` | **does not exist** |
| Production host | Hetzner |
| House Supabase key name | `PUBLISHABLE_KEY` (do not invent `ANON_KEY`) |
| Parent web branch | `office/profile-hero-completeness-v1` |
| Parent web HEAD | `380a36646d4de8a37c39a56ac3ccd449f6d8b20d` (dirty; preserve) |

## Brand / Home

- Brand Phase 2 rebased onto alpha as **`b5fbeff`** and **deployed**.
- Home P0 was a **missing inlined Supabase URL**. Recovered by **same-SHA rebuild** with `umtuba.env` before the next build. **Not** a Discover behavior change.
- Historical 2026-08-28 coordinator start (`BLOCKED_GIT_SAFETY_AND_PACKAGE`, no V3 ZIP, no `origin/main`) is **not** current production state.

## Android Watch next-video / 3-window

- Worktree: `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-WATCH-NEXT-VIDEO-TRANSITION-DELAY-V1`
- V3 cache SHA: `1a4b0f8b41ff388b99ffb136bbc39156d841e52f`
- Earlier Fold6 QA SHA: `da449c9e9f3c4c0371ecdd2999220b4f69ae4ec5`
- Earlier preview: `6bc060ed-b9fe-4697-b8a3-062be8f52973`
- Auto-advance QA was `AUTO_ADVANCE_PASS` / `READY_FOR_CENTRAL_REVIEW` on that older install.
- **Fold6 now has FIT 1.0.22** (`703740b` / `b2b0bbd8`), not the older V3 APK.
- `versionCode` still historically **20** on the older phone/EAS lineage. Current marketing version on device is **1.0.22**.
- **MUST fix `versionCode` before any Play upload. NO Play upload.**

## Web post-edit

- Worktree: `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-UMTUBA-POST-PUBLISH-EDITING-V1`
- Branch: `desktop/umtuba-post-publish-editing-v1`
- Base: `origin/alpha-0.2` @ `b5fbeff29cb0f308481b38c06500c572cd44a9c4`
- Status: `COMPLETE_CANDIDATE`
- Local preview: `http://127.0.0.1:3032` (or `http://localhost:3032`)
- **NOT deployed.**
- Owner Edit occupies the old Watch/Home delete slot. Delete stays inside `/edit/post/[id]`.
- **Do not move the red X** (delete stays inside Edit).

## Android post-edit

- Worktree: `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-POST-PUBLISH-EDITING-V1`
- Branch: `desktop/android-post-publish-editing-v1`
- Status: `IMPLEMENTATION_COMPLETE / DEVICE_QA_NOT_RUN`
- Base (phone / Watch V3): `da449c9e9f3c4c0371ecdd2999220b4f69ae4ec5`
- Source prepared versionCode **22**; EAS hung; **APK was NOT installed on the phone**.
- **Separate from FIT.** Phone still lacks Edit/trim until that APK lands.
- Fold6 currently runs FIT contain 1.0.22, not the edit port.

## What NOT to do on next boot

- Do not treat FIT PASS as Play authorization.
- Do not reinstall the old 1.0.0 cropped-video APK.
- Do not reset parent `umtuba-web`.
- Do not deploy web post-edit without a new GO.
- Do not assume Android Edit is on the phone.
- Do not write to Desktop. Do not touch `_port_extract`.

## File index written this close-out

FIT worktree:

- `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-FOLD6-WATCH-VIDEO-FIT-V1\docs\ai\CURRENT_TASK.md`
- `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-FOLD6-WATCH-VIDEO-FIT-V1\docs\ai\PROJECT_STATE.md`
- `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-FOLD6-WATCH-VIDEO-FIT-V1\docs\ai\CURSOR_REPORT.md`
- `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-FOLD6-WATCH-VIDEO-FIT-V1\docs\ops\fold6-contain-fit-install-retry-v1\DESKTOP_FOLD6_CONTAIN_FIT_INSTALL_RETRY_V1.md`

Web coordinator:

- `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ai\CURRENT_TASK.md`
- `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ai\PROJECT_STATE.md`
- `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ai\CURSOR_REPORT.md`
- `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ai\SESSION_CLOSE_HANDOFF_2026-08-29.md`
- `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ai\SESSION_HANDOFF.md`
- `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\fold6-contain-fit-install-retry-v1\DESKTOP_FOLD6_CONTAIN_FIT_INSTALL_RETRY_V1.md`
