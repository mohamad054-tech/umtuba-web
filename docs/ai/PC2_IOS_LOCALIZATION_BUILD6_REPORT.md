# PC2_IOS_LOCALIZATION_BUILD6_V1

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_LOCALIZATION_BUILD6_V1
DATE = 2026-08-16
MODE = EXECUTION
CENTRAL_AUTHORITATIVE_MOBILE_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
REMOTE_REF = origin/central/mobile-reconcile-ios-android-v1
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 6
BUNDLE_ID = com.umtuba.app
APP_STORE_REVIEW_SUBMIT = NO
APP_STORE_PRODUCTION_SUBMIT = NO
REUPLOAD_BUILD_3 = NO
REUPLOAD_BUILD_4 = NO
REUPLOAD_BUILD_5 = NO
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
LEARNING_FILES_MODIFIED = NO
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
STALE_PC2_BRANCH_USED_AS_SOT = NO
IOS_ONLY_LOCALIZATION_FORK = NO
NEW_PRODUCT_FIXES_ADDED = NO
PLAYBACK_FIXES_INVENTED = NO
ANDROID_VERSIONCODE_MODIFIED = NO
DEVICE_PASS_INVENTED = NO
```

## FINAL FIELDS

```text
SOURCE_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
APP_VERSION = 1.0.0
BUILD_NUMBER = 6
TESTS = FAIL (2 failed / 476 passed / 59 files: 2 failed, 57 passed)
TYPECHECK = PASS
LINT = PASS
EAS_BUILD_ID = 7d0dd256-fdb0-42c3-8a4d-0833fcaae656
BUILD_RESULT = FINISHED
BUILD_SOURCE_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
TESTFLIGHT_BUILD6_AVAILABLE = YES_INTERNAL
BLOCKERS = TESTS_FAIL_ON_AUTHORIZED_SHA; DEVICE_QA_NOT_RUN; APP_STORE_REVIEW_NOT_SUBMITTED; NO_PRODUCT_PASS
```

```text
BUNDLE_ID = com.umtuba.app
DISTRIBUTION = STORE
BUILD_PROFILE = production
IS_FOR_IOS_SIMULATOR = false
EAS_INCREMENT = 5_TO_6
ANDROID_VERSIONCODE_REMOTE_BEFORE = 7
ANDROID_VERSIONCODE_REMOTE_AFTER = 7
ANDROID_VERSIONCODE_IN_SHA_APP_CONFIG = 8
TESTFLIGHT_UPLOAD = YES
APP_STORE_SUBMITTED = NO
IPHONE_QA = NOT_RUN
```

Do **not** treat this as a product PASS. EAS `FINISHED` and TestFlight `in beta testing` are upload/processing statuses only. Device QA was not run.

---

## Phase 1 — Source lock

Preferred new worktree (this turn):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-localization-build6-v1`

```text
git fetch --prune = DONE
SHA_EXISTS = YES
ORIGIN_TIP_OF = origin/central/mobile-reconcile-ios-android-v1
LOCAL_SOURCE_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
COMMIT_SUBJECT = chore(mobile): stamp iOS buildNumber 6 and Android versionCode 8
WORKTREE = detached HEAD at c48b4b2
CLEAN_WORKTREE = YES
```

Main checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` was **not** reset, merged, rebased, stashed, or used as SoT (`77e9e28` / `pc2/eas-preview-config-v1` untouched).

Stale PC2 branches were **not** used as SoT:

- `pc2/a2-open-watch-published-post-v1`
- `pc2/eas-preview-config-v1` (`77e9e28`)
- Build 5 SHA `017be09f4dff2e7c39f8f4363a79cef46cd52d48`

No source files were committed. `npm ci` was local-only in the new worktree so Expo plugins resolve. `node_modules` is untracked.

Superseded Build 5 was **not** reused:

```text
PREVIOUS_BUILD5_EAS_ID = 4c341dcb-b4a8-4549-b50e-5eeb79293b36
PREVIOUS_BUILD5_SOURCE = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
```

---

## Phase 2 — Expo / EAS config

`eas.json` uses `cli.appVersionSource = remote` and `build.production.autoIncrement = true`. Local `app.config.ts` `ios.buildNumber = "6"` is ignored for remote version source.

```text
PRE_BUILD_SOURCE_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
APP_VERSION = 1.0.0
LOCAL_IOS_BUILD_NUMBER = 6
EAS_REMOTE_BUILD_NUMBER_BEFORE = 5
EXPECTED_BUILD_NUMBER = 6
BUNDLE_ID = com.umtuba.app
LOCAL_ANDROID_VERSIONCODE = 8
EAS_REMOTE_ANDROID_VERSIONCODE_BEFORE = 7
SOURCE_DELTA_COMMITTED = NO
```

EAS printed: `Incrementing buildNumber from 5 to 6.` It did **not** reuse 3/4/5 and did **not** jump past 6.

Android remote `versionCode` stayed **7** before and after. Android release was not rebuilt. Local SHA already stamps `android.versionCode = 8`; this track did **not** bump it.

---

## Phase 3 — Shared localization proof (not iOS-only)

Required locales exist on `c48b4b2` in the shared i18n layer used by the whole app (web-aligned contract). No iOS-only fork was created. No translations were invented.

| Proof | Path on `c48b4b2` |
| --- | --- |
| Locale contract | `src/lib/i18n/locales.ts` `SUPPORTED_LOCALES = ["ar", "en", "fr", "es", "de", "pt"]` |
| Catalog map | `src/lib/i18n/messages/catalogs.ts` binds all six |
| Catalog files | `src/lib/i18n/messages/{ar,en,fr,es,de,pt}.ts` |
| Provider | `src/lib/i18n/I18nProvider.tsx` |
| Language screen | `app/language.tsx` lists `options` from `listSupportedLocales()` |
| Completeness tests | `src/lib/i18n/i18n.test.ts` asserts identical key sets, no empty strings, placeholder parity |

Sample catalog strings (source, not invented):

- ar `actions.save` = حفظ
- en `actions.save` = Save
- fr `actions.save` = Enregistrer
- es `actions.save` = Guardar
- de `actions.save` = Speichern
- pt `actions.save` = Salvar (pt-BR, not pt-PT)

---

## Phase 4 — Required quality commands

Worktree: `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-localization-build6-v1`

```text
COMMAND = npm ci
RESULT = PASS (exit 0; 678 packages)
```

```text
COMMAND = npm test
RESULT = FAIL (exit 1)
VITEST = 2 failed | 476 passed (478)
FILES = 2 failed | 57 passed (59)
```

Failures recorded as-is. **Not fixed** (task forbids silent product fixes / invented patches):

1. `src/lib/ios/appStoreConfig.test.ts` — expects `ios.buildNumber === "1"`; authorized SHA stamps `"6"`.
2. `src/lib/wallet/format.test.ts` — `formatWalletAmountExact(1234)` expected `/1/`; host Windows locale produced `١٬٢٣٤`. Environment/locale assertion, not a new product change.

```text
COMMAND = npm run typecheck
RESULT = PASS (exit 0; tsc --noEmit)
```

```text
COMMAND = npm run lint
RESULT = PASS (exit 0; package lint script is tsc --noEmit)
```

---

## Phase 5 — One iOS production build

Exactly one authorized production/store build this turn:

```text
COMMAND = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-localization-build6-v1
EAS_BUILD_ID = 7d0dd256-fdb0-42c3-8a4d-0833fcaae656
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 6
gitCommitHash = c48b4b2898b116a39e90b85221ae1856f446d0a0
isForIosSimulator = false
createdAt = 2026-08-16T16:34:40.076Z
completedAt = 2026-08-16T16:39:31.262Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/UuGyXk2ThQxY_Gm5kDVV8pY0I-KRy15aWugGgzJ8gIo.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/7d0dd256-fdb0-42c3-8a4d-0833fcaae656
```

Built source matches the authorized SHA. No other source change. Builds 3/4/5 were not re-uploaded.

---

## Phase 6 — Internal TestFlight upload (Build 6 only)

Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530` (same ASC app as Builds 3/4/5). Submit ran, then `eas.json` was restored. Worktree left clean. Not committed.

```text
COMMAND = npx eas-cli submit --platform ios --id 7d0dd256-fdb0-42c3-8a4d-0833fcaae656 --profile production --non-interactive --wait
EAS_SUBMIT_ID = 8d6ab5a2-27ad-4b22-9798-fa809cdaf0d1
SUBMIT_STATUS = FINISHED
ASC_APP_ID = 6801665530
TESTFLIGHT_UPLOAD = YES
EXTERNAL_BETA = NO
APP_STORE_REVIEW_SUBMIT = NO
REUPLOAD_BUILD_3 = NO
REUPLOAD_BUILD_4 = NO
REUPLOAD_BUILD_5 = NO
```

`eas submit:status` after Apple processing:

```text
1.0.0 (6) — internal: in beta testing, external: ready for beta submission
EAS Build ID 7d0dd256-fdb0-42c3-8a4d-0833fcaae656
EAS Submission 8d6ab5a2-27ad-4b22-9798-fa809cdaf0d1
```

Builds 3, 4, and 5 remain listed. They were not re-uploaded. App Store live / in review / pending release = none.

ASC “in beta testing” is **not** iPhone install proof.

---

## Safety / scope

- One production iOS build only.
- Built SHA = `c48b4b2` only.
- Build number 6, not 3, not 4, not 5.
- No App Store Review submit.
- No Production submit.
- No force push / reset / merge of `77e9e28`.
- `docs/ai/CURSOR_REPORT.md` not overwritten.
- Store / Learning files in this web repo not touched.
- No tokens / `.p8` / ASC key material printed.
- No new product fixes.
- No playback fixes invented.
- No iOS-only localization fork.
- Android remote versionCode left at 7.

---

## What happens next

1. Physical iPhone QA on **1.0.0 (6)** only. Do not copy Build 4/5 device verdicts forward as Build 6 PASS.
2. If TestFlight still shows **(5)**: do not install. Reply `TESTFLIGHT_STILL_SHOWS_BUILD_5`.
3. Do not Submit for Review from this report.
