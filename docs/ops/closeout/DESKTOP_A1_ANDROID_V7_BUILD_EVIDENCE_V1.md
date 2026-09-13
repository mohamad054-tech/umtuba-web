# DESKTOP_A1_ANDROID_V7_BUILD_EVIDENCE_V1

**DEVICE:** DESKTOP-A1  
**DATE:** 2026-08-16  
**TASK_ID:** DESKTOP_A1_ANDROID_V7_BUILD_EVIDENCE_V1  
**PACKAGE:** `com.umtuba.app`  
**KIND:** Authorized v7 EAS production AAB + preview APK build/validate/evidence for A2. No Play Console. No Fold6 install. No Production submit. No commit/push.

Continues `DESKTOP_A1_ANDROID_V6_POST_UPLOAD_OPEN_ROUTING_V1` after operator GO to finish the binary. Source was already committed. This session did not change product behavior.

```
A2_CONSUME_ARTIFACTS = GO
V7_SOURCE_SHA = 320424717cd02646a9e586754f41649b9ac55cd7
FIX_SHA = 7841b7263ae9b30a096bfdb147c1fa67dfcb491b
versionName = 1.0.0
versionCode = 7
EAS_PRODUCTION_ID = 3fa02976-9957-487c-a553-4895f3901322
EAS_PREVIEW_ID = 0b160aac-67e1-449e-8aed-efcca378a7d3
BUILD_RESULT = PASS
AAB_SHA256 = 12D62DAF518C83CCB9F5DC93DDC3E6E5565379CCFC6ACD9086D6F26A270ACEE7
APK_SHA256 = AE94E1E7191211AA25C6964562ABC7046CA5B6956615F789042B4E568F8818B7
FOLD6_V7_INSTALL = NOT_PERFORMED
CLOSED_TESTING_V7 = NOT_PERFORMED
PLAY_CONSOLE = NOT_TOUCHED
PRODUCTION_SUBMISSION = NO
```

---

## A2 consume

**GO.** A2 may consume the AAB/APK bytes and hashes below. Do **not** treat this as a Fold6 Open-routing PASS or a Closed Testing rollout. This packet is build evidence only.

| Artifact | Absolute path | Bytes | SHA-256 |
|---|---|---|---|
| Production AAB | `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-v7-release\aab\umtuba-android-production-3fa02976.aab` | `102266646` | `12D62DAF518C83CCB9F5DC93DDC3E6E5565379CCFC6ACD9086D6F26A270ACEE7` |
| Preview APK | `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-v7-release\apk\umtuba-android-preview-0b160aac.apk` | `171486168` | `AE94E1E7191211AA25C6964562ABC7046CA5B6956615F789042B4E568F8818B7` |

Relative (in-repo):

- `docs/ops/closeout/android-v7-release/aab/umtuba-android-production-3fa02976.aab`
- `docs/ops/closeout/android-v7-release/apk/umtuba-android-preview-0b160aac.apk`
- Evidence: `docs/ops/closeout/android-v7-release/evidence/`

Manual AAB/APK modification: **NO**.

---

## Source verify

| Check | Result |
|---|---|
| Worktree | `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A1-ANDROID-V6` |
| Branch | `office/android-v6-minimal-source-fix-v1` (no upstream; not pushed) |
| `git rev-parse HEAD` | `320424717cd02646a9e586754f41649b9ac55cd7` |
| Working tree | clean |
| Open-routing fix | `7841b7263ae9b30a096bfdb147c1fa67dfcb491b` (ancestor) |
| v6 PROFILE/FOLLOW | `f1dbd1cc84fcb96d4784c9e664bf417ee4ad8604` (ancestor; not rebuilt) |
| Stale `822d893` used | **NO** |
| Dirty mobile parent used | **NO** |
| `app.config.ts` version | `1.0.0` / `versionCode` **7** / package `com.umtuba.app` |
| Web fetch | `office/profile-hero-completeness-v1` @ `380a366` vs origin **0/0** (no FF) |
| Mobile fetch | prune OK; no upstream so no FF |

Lineage (do not rebuild older SHAs):

```
3204247 chore(android): set v7 versionCode 7
7841b72 fix(android): open Watch on the published post after Create
f1dbd1c fix(android): honor profile targets and add native Watch follow
```

---

## Commands (existing v5/v6 pipeline; not invented)

CWD: A1 v6 worktree @ `3204247`

```
npx eas-cli build --platform android --profile production --non-interactive
npx eas-cli build --platform android --profile preview --non-interactive
```

`eas.json` `appVersionSource=remote`. Production `autoIncrement` moved remote Android versionCode **6 → 7**. Preview did **not** increment (already 7).

EAS whoami: `mohamadabutair` (umtuba Owner). Project `@umtuba/umtuba-mobile` / `d2593b45-8f18-4c57-9d71-0419193cfd77`.

---

## Production AAB

| Field | Value |
|---|---|
| Command | `npx eas-cli build --platform android --profile production --non-interactive` |
| EAS_BUILD_ID | `3fa02976-9957-487c-a553-4895f3901322` |
| Status | FINISHED / exit 0 |
| gitCommitHash (EAS) | `320424717cd02646a9e586754f41649b9ac55cd7` |
| versionName | `1.0.0` |
| versionCode | **7** |
| Distribution | STORE |
| Keystore | existing remote `p6De1DDtE_` (default). **Not rotated** |
| AAB path | `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-v7-release\aab\umtuba-android-production-3fa02976.aab` |
| AAB bytes | `102266646` |
| AAB SHA256 | `12D62DAF518C83CCB9F5DC93DDC3E6E5565379CCFC6ACD9086D6F26A270ACEE7` |
| bundletool dump | package `com.umtuba.app` / versionName `1.0.0` / versionCode **7** / minSdk 24 / targetSdk 36 |
| Cert SHA1 | `70:0D:77:E5:04:20:DD:E2:5C:9B:79:F1:A8:7E:A3:09:44:63:0C:EB` |
| Cert SHA256 | `45:15:8D:3D:05:3F:AD:18:88:BF:5B:71:D8:8F:3A:14:FF:C8:A4:DD:4C:63:F3:0F:12:61:93:8B:C0:61:6A:64` |
| Mapping / native symbols | **NOT_IN_EAS_ARTIFACTS** (empty `android-v7-release/mapping/`) |
| Play upload this session | **NO** |

Logs URL (no signed GCS URL stored):  
`https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/3fa02976-9957-487c-a553-4895f3901322`

---

## Preview APK (sideload companion; same SHA + same keystore)

| Field | Value |
|---|---|
| Command | `npx eas-cli build --platform android --profile preview --non-interactive` |
| EAS_BUILD_ID | `0b160aac-67e1-449e-8aed-efcca378a7d3` |
| Status | FINISHED / exit 0 |
| Profile | preview / INTERNAL |
| gitCommitHash (EAS) | `320424717cd02646a9e586754f41649b9ac55cd7` |
| versionName | `1.0.0` |
| versionCode | **7** |
| Keystore | existing remote `p6De1DDtE_` (default) |
| Path | `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-v7-release\apk\umtuba-android-preview-0b160aac.apk` |
| Bytes | `171486168` |
| SHA256 | `AE94E1E7191211AA25C6964562ABC7046CA5B6956615F789042B4E568F8818B7` |
| keytool -jarfile | NOT_A_SIGNED_JAR (v2/v3 only; no v1 META-INF/*.RSA) |
| Play upload | **NO** |
| Fold6 install this session | **NO** |

---

## What was NOT done

- Google Play Console: no uploads, no clicks, no Play API publish
- Fold6 install / Open retest on versionCode 7
- Closed Testing v7 rollout
- Production submit / Apply for production
- Product source changes
- git commit / push
- New keystore generation
- Writes to the Windows Desktop
- `_port_extract` untouched

---

## Security

- No secrets, tokens, `.env` values, tester emails, or keystore passwords in this packet
- EAS env **names** only (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- Signed GCS log URLs not stored (raw `build:view` JSON discarded)
- Cert fingerprints only; no keystore material
- `_port_extract` not touched
- Windows Desktop not written
- No commit / push / force

---

## Files written this task

- `docs/ops/closeout/DESKTOP_A1_ANDROID_V7_BUILD_EVIDENCE_V1.md` (this file)
- `docs/ops/closeout/android-v7-release/aab/umtuba-android-production-3fa02976.aab`
- `docs/ops/closeout/android-v7-release/apk/umtuba-android-preview-0b160aac.apk`
- `docs/ops/closeout/android-v7-release/evidence/*`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/SESSION_HANDOFF.md`
- `docs/ai/CURSOR_REPORT.md`

---

## FINAL RETURN

```
A2_CONSUME_ARTIFACTS = GO
V7_SOURCE_SHA = 320424717cd02646a9e586754f41649b9ac55cd7
FIX_SHA = 7841b7263ae9b30a096bfdb147c1fa67dfcb491b
versionName = 1.0.0
versionCode = 7
PACKAGE = com.umtuba.app
WORKTREE = C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A1-ANDROID-V6
BRANCH = office/android-v6-minimal-source-fix-v1
EAS_PRODUCTION_ID = 3fa02976-9957-487c-a553-4895f3901322
EAS_PREVIEW_ID = 0b160aac-67e1-449e-8aed-efcca378a7d3
AAB = C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-v7-release\aab\umtuba-android-production-3fa02976.aab
AAB_BYTES = 102266646
AAB_SHA256 = 12D62DAF518C83CCB9F5DC93DDC3E6E5565379CCFC6ACD9086D6F26A270ACEE7
APK = C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-v7-release\apk\umtuba-android-preview-0b160aac.apk
APK_BYTES = 171486168
APK_SHA256 = AE94E1E7191211AA25C6964562ABC7046CA5B6956615F789042B4E568F8818B7
KEYSTORE = p6De1DDtE_ (default, not rotated)
CERT_SHA1 = 70:0D:77:E5:04:20:DD:E2:5C:9B:79:F1:A8:7E:A3:09:44:63:0C:EB
CERT_SHA256 = 45:15:8D:3D:05:3F:AD:18:88:BF:5B:71:D8:8F:3A:14:FF:C8:A4:DD:4C:63:F3:0F:12:61:93:8B:C0:61:6A:64
BUILD_RESULT = PASS
FOLD6_V7_INSTALL = NOT_PERFORMED
CLOSED_TESTING_V7 = NOT_PERFORMED
PLAY_CONSOLE = NOT_TOUCHED
PRODUCTION_SUBMISSION = NO
```
