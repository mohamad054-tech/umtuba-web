# DESKTOP_UMTUBA_ANDROID_PLAY_FINAL_RELEASE_EVIDENCE_V1

Read/verify only. 2026-08-25. No rebuild. No source patch. No broad Android QA. No AAB/APK upload. No Closed Testing create. No Production request/submit.

## Report block

```
TASK_ID = DESKTOP_UMTUBA_ANDROID_PLAY_FINAL_RELEASE_EVIDENCE_V1
STATUS = COMPLETE_LIVE_INSPECT / GOOGLE_14_DAY_WAIT
SOURCE_SHA = 17cbfefbc8c77d5286efdf2c9b941101db84b6c3
FOLD6_17CBFEF_EVIDENCE = RECOVERED
FOLLOW_LIST = PASS
WATCH_REMOUNT = PASS
ANDROID_DEVICE_GATE = PASS
PLAY_ACTIVE_RELEASE = CLOSED_TESTING_ALPHA / 10 (1.0.0)
PLAY_VERSION_CODE = 10
TESTERS_CONFIGURED = 29
TESTERS_OPTED_IN = 12
CONTINUOUS_TESTING_DAYS = 9
FOURTEEN_DAY_REQUIREMENT = NOT_YET_SATISFIED
PRODUCTION_ACCESS_STATE = INACTIVE / NO_PERMISSION
PRODUCTION_ACCESS_REQUEST_AVAILABLE = NO
LISTING = LIVE
POLICY = NO_ISSUES
ANDROID_RELEASE_READY = NO
EXTERNAL_WAIT = YES
BLOCKERS = FOURTEEN_DAY_CLOCK_9_OF_14; PRODUCTION_REQUEST_DISABLED
```

## 1. Fold6 17cbfef evidence recovery

Authoritative later accepted packet (do not rebuild / retest):

- Packet: `docs/ops/android-17cbfef-follow-list-stack-retest/DESKTOP_ANDROID_17CBFEF_FOLLOW_LIST_STACK_RETEST.md`
- Worktree: `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-17CBFEF-FOLLOW-LIST`
- Date: 2026-08-23
- Device: Galaxy Z Fold6 `RFCX718LVHK` / SM-F956B
- `DESKTOP_FINAL_STATUS = PASS`

### Identity

| Field | Recovered value |
|---|---|
| SOURCE_SHA | `17cbfefbc8c77d5286efdf2c9b941101db84b6c3` |
| EAS_BUILD_ID | `c6e73333-6629-40eb-9d31-4fde666856a7` |
| gitCommitHash | exact SHA (EAS JSON) |
| Profile | preview / INTERNAL |
| versionCode | 20 |
| versionName | 1.0.0 |
| APK SHA256 file | `7F0A591B538D27B5F2D420E98D0F20E6269FAA0C3D40CCAB99A02863BAA5C4AC` |
| APK size file | `148613640` |
| APK binary | PRESENT at worktree `evidence/build/apk/umtuba-android-preview-c6e73333.apk` |
| SOURCE_PATCHED | NO |
| GOOGLE_PLAY_UPLOAD | NO |

This is **not** the Play Closed Testing binary. Play is still versionCode **10**.

### Follow / following / followers

Accepted packet: `FOLLOWERS_FULL_STACK = PASS`, `FOLLOWING_FULL_STACK = PASS`, `FOLLOW_LIST_PROFILE_OSCILLATION = ABSENT`.

Local corroboration this session (no device retest):

- `followers-chain-log.txt` — Watch → Followers → member → Back → list → origin Profile → Watch
- `following-chain-log.txt` — same unwind for Following
- `E-back-followers-list-nodes.txt` — header `Followers`, member `@marenapost`
- `N-back-watch-media_session.txt` — after Following unwind, `com.umtuba.app` `PLAYING`

`FOLLOW_LIST = PASS`

### Watch remount

Accepted packet: `WATCH_REMOUNT_OBSERVED = NO`, `WATCH_INSTANCE_PRESERVED = PASS` (3 cycles). Packet already warned stale uiautomator must not override screenshots.

Local corroboration: `remount-3x-log.txt` present; `P-c2-return-media_session.txt` still `PLAYING` on `com.umtuba.app`. Cited PNG screenshots (`P-c1-return.png` etc.) are **not** in the current searchable tree. Verdict left as the accepted 2026-08-23 PASS.

`WATCH_REMOUNT = PASS`

### Final device gate

There is no later 17cbfef device-QA packet after the follow-list retest. Central closed the mobile final gate on that PASS (`DESKTOP_FINAL_STATUS = PASS`). This GO did not rerun Fold6 QA.

`ANDROID_DEVICE_GATE = PASS`

## 2. Live Google Play Console (2026-08-25)

`PLAY_CONSOLE_SIGNED_IN = YES`  
`EVIDENCE_SOURCE = AUTHENTICATED_PLAY_CONSOLE`  
`GOOGLE_PLAY_MUTATED = NO`

Developer `UMTUBA` / app `com.umtuba.app` (app id `4972778507952864002`).

### Closed Testing

- Track: **Closed testing — Alpha** (active)
- Release: **10 (1.0.0)** — one version code
- Status: available to specified testers
- Release date / last modified: **17 August 2026** 12:41
- Countries: 177
- Testers method: email lists
- List: **UMTUBA Closed Testers** — **29** users configured
- Opt-in join URL present (not copied / not sent)

### Production access / 14-day clock (Dashboard)

Exact dashboard checklist:

1. Publish a closed testing release — **checked**
2. At least 12 testers opted in — **checked**
3. 12 testers for at least 14 days — **not checked**
4. Displayed: **عدد المختبرين المشتركين حاليًا لمدة 9 أيام: 12** (12 testers currently credited for **9** days)

- Production stage: **INACTIVE**
- Dashboard button **طلب الإصدار العلني** = **disabled** (`disabled: true`)
- Production track: locked — “ليس لديك إذن بالإصدار العلني حتى الآن”
- No Production release created. Request not clicked.

This is consistent with the 2026-08-19 owner checkpoint (`12 testers for 3 days`) plus six calendar days.

### Listing

Default store listing **LIVE** (`مباشر` + check). Last modified **15 August 2026**. No pending publishing changes. Managed publishing **OFF**. Last publish **17 August 2026**.

### Policy / declarations

- Policy center: **لم يتمّ العثور على أي مشاكل** (no issues found)
- App content: **ليست هناك سياسات تتطلب انتباهك**
- 11 acted-on declarations present (Advertising ID, photos/videos, Data Safety, target audience, login details, ads, content ratings, financial, health, government, privacy policy)
- Identity-verification banner: apps already registered (informational; not dismissed)

### Identity vs Fold6 candidate

Play Closed Testing binary is versionCode **10**. Fold6 accepted gate is preview versionCode **20** @ `17cbfef`. That gap is **not** a Play policy issue. Upload is **not** authorized by this GO.

## Forbidden actions confirmed not done

- Rebuild / source patch / broad Fold6 QA: **NO**
- AAB/APK upload / new release: **NO**
- Request Production access: **NO**
- Submit Production: **NO**
- Tester list / Save / Dismiss banner: **NO**
- Commit / push: **NO**

## Next action

Preserve Closed Testing. Wait remaining Google 14-day credit (currently 9 of 14). Do not request Production until the dashboard checkbox is satisfied and Central authorizes. Do not upload 17cbfef / v20 without a new Central GO.
