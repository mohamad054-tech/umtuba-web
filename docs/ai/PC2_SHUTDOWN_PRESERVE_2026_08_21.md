# PC2 shutdown preserve — 2026-08-21 (01:31 +03)

Operator asked to save everything before sleep. **No commit. No push. No reset.** Files remain on disk.

```text
TASK_ID = PC2_SHUTDOWN_PRESERVE_2026_08_21
DEVICE = PC2
DATE = 2026-08-21
COMMIT_CREATED = NO
PUSH = NO
RESET_STASH_OVERWRITE = NO
P_DRIVE_MOUNTED = NO
LOCAL_PACKET_UPDATED = YES
SAFE_TO_POWER_OFF = YES
```

## Resume first thing tomorrow

1. Open this repo. Read `docs/ai/CURRENT_TASK.md` then `docs/ai/CURSOR_REPORT.md`.
2. Active GO is still **`PC2_IOS19_FINAL_TARGETED_DEVICE_QA_V1`**.
3. On iPhone 13: TestFlight → UMTUBA → install **1.0.0 (19)** (phone was still on **18** at shutdown).
4. Run Sound Library escape + editor + Profile gates in `docs/ai/PC2_IOS19_FINAL_TARGETED_DEVICE_QA_V1.md`.
5. Empty sound catalog is expected. Do not fabricate licensed sounds. Do not Add for Review. Do not create Build 20. Do not use iPad.

## What is already done (do not rebuild)

- Authorized SHA `c0fe00a4fc34a9262daf5870fbc1f4bc42433853` built as **UMTUBA 1.0.0 (19)**.
- Forbidden SHA `3ceb90ba` was **not** built.
- EAS iOS production finished and submitted to TestFlight (internal: in beta testing).
- iPad release/screenshot blockers closed: **IPHONE_ONLY**. `supportsTablet` stays false.
- Windows cannot tap TestFlight/app UI. Device QA is operator/manual.

```text
EAS_BUILD_ID = e21b7f4a-769d-4597-9885-7a5890f060ea
EAS_SUBMIT_ID = 98111364-52bb-4687-95ee-94d2bbbd8a5b
IPA = https://expo.dev/artifacts/eas/tUNmcxvBaVcjKSwh1Y4MHhanCFOTuOk67pPKR1b1xB8.ipa
BUILD_LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/e21b7f4a-769d-4597-9885-7a5890f060ea
SUBMIT = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/submissions/98111364-52bb-4687-95ee-94d2bbbd8a5b
ASC_APP_ID = 6801665530
TESTFLIGHT = YES_INTERNAL_IN_BETA_TESTING
APP_STORE_REVIEW_SUBMITTED = NO
```

## Trees on disk (leave them)

| Tree | Path | SHA / branch | Note |
| --- | --- | --- | --- |
| Web (this repo) | `C:/Users/Giga store/Desktop/umtuba/umtuba-web-translation-trunk-port-v1` | `b3c05d8d` / `office/platform-translation-trunk-port-v1` | DIRTY, uncommitted. Do not reset. |
| Mobile checkout | `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` | `77e9e287` / `pc2/eas-preview-config-v1` | Do **not** reset. |
| Build 19 worktree | `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build19-sound-library-qa-v1` | `c0fe00a4` detached | Authorized SoT. Left clean. |
| Build 18 worktree | (prior) `a70a399` | historical | Do not rebuild 18. |
| Local packet | `C:/Users/Giga store/Desktop/umtuba/_central_intake/PC2_2026_08_18_UNCOMMITTED_HANDOFF/` | intact | Updated with 08-21 reports. |

`PROJECT_STATE.md` still describes Central private-AI on another worktree. It is **not** this PC2 trunk checkout.

## Session facts this night (2026-08-20 → 21)

- Physical iPad 9th gen (`iPad12,1`, 10.2-inch, iPadOS 26.5) was detected USB-trusted. **Out of scope.** Do not install Build 18/19 on it. Do not shoot 13-inch App Store shots on it.
- Physical iPhone 13 (`iPhone14,5` / `00008110-000A10123AF9801E` / iOS 26.6) USB-live and trusted.
- Installed app at last lockdown lookup: UMTUBA `com.umtuba.app` **1.0.0 (18)** TestFlight. Build 19 **not** installed.
- `idevice*` / `pymobiledevice3` ABSENT. Apple Devices + Node lockdown PRESENT. `screenshotr` InvalidService.

## Do not do on resume unless Central GO says so

- Commit / push / force / reset / stash
- Modify mobile source
- Rebuild / Build 20
- App Store Review submit
- Re-enable `supportsTablet` / iPad screenshots
- Fabricate a non-empty sound catalog
- Copy old editor FAIL/PASS without re-running on **19**

## Packet copy this shutdown

Copied into `files/docs/ai/` of the local intake packet (P: not mounted, so no second copy):

- `CURRENT_TASK.md`
- `CURSOR_REPORT.md`
- `PC2_IOS_BUILD19_REPORT.md`
- `PC2_IOS19_FINAL_TARGETED_DEVICE_QA_V1.md`
- `PC2_IOS_BUILD18_FINAL_EDITOR_TARGETED_QA_V1.md`
- `PC2_SHUTDOWN_PRESERVE_2026_08_21.md`

Originals in the web working tree were **not** deleted.

Safe to power off.
