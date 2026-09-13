# UMTUBA_CENTRAL_DESKTOP_ANDROID_FINAL_DEVICE_QA

Desktop + Galaxy Z Fold6. Auth password visibility / Autofill delta + minimal regression + English LTR closeout. D:\ was missing; this is the Desktop-written Central file.

```
TASK_ID = DESKTOP_ANDROID_AUTH_PASSWORD_FINAL_DEVICE_QA_V1
STATUS = COMPLETE
SOURCE_SHA_VERIFIED = YES
BUILD_RESULT = PASS
INSTALLED_ON_FOLD6 = YES
LOGIN_PASSWORD_EYE = PASS
LOGIN_MASKED_DEFAULT = PASS
LOGIN_SHOW_PASSWORD = PASS
LOGIN_REHIDE_PASSWORD = PASS
LOGIN_PASSWORD_VALUE_PRESERVED = PASS
SIGNUP_PASSWORD_EYE = PASS
SIGNUP_MASKED_DEFAULT = PASS
SIGNUP_SHOW_PASSWORD = PASS
SIGNUP_REHIDE_PASSWORD = PASS
SIGNUP_PASSWORD_VALUE_PRESERVED = PASS
ANDROID_LOGIN_AUTOFILL = PARTIAL
ANDROID_PASSWORD_MANAGER_RECOGNITION = PARTIAL
ANDROID_SIGNUP_AUTOFILL = PARTIAL
ANDROID_SAVE_PASSWORD_BEHAVIOR = NOT_OFFERED
REFERRAL_FIELD_VISIBLE = NO
SIGNUP_WITHOUT_REFERRAL = PASS_UI_VALIDATION_GATES
ARABIC_USERNAME_VALIDATION = PASS
APP_LAUNCH = PASS
WATCH_PLAYBACK_SANITY = PASS
PROFILE_SANITY = PASS
SESSION_SANITY = PASS
GLOBAL_BACK_SANITY = PASS
NEW_DEFECTS = NONE
ANDROID_ONLY_DEFECTS = NONE
LIKELY_SHARED_DEFECTS = NONE
SOURCE_CHANGED_BY_DESKTOP = NO
GOOGLE_PLAY_UPLOAD = NO
PRODUCTION_SUBMISSION = NO
ANDROID_DEVICE_GATE = PASS
READY_FOR_CENTRAL_FINAL_DECISION = YES
BLOCKERS = NONE
```

```
AUTHORIZED_SOURCE_SHA = d989e66364af04bc11b6741914e54b480c1e64b5
ANDROID_VERSION_CODE = 20
BUILD_ID = c9892a8f-b193-498c-b551-0b23e2a3a956
APK_SHA256 = 87CB8A6A8A3FB9AB7767620FC2E7E8F2D9F527654AD92AFD91B263108FC805F5
DEVICE = Galaxy Z Fold6 / SM-F956B
ADB_DEVICE_SERIAL = RFCX718LVHK
ARABIC_RTL_LOGIN = PASS
ARABIC_RTL_SIGNUP = PASS
ENGLISH_LTR_LOGIN = PASS
ENGLISH_LTR_SIGNUP = PASS
ENGLISH_LTR_PASSWORD_EYE_POSITION = RIGHT_END
OPERATOR_SESSION_RESTORED = PASS
COMMIT = NO
```

Autofill on Fold6 (unchanged; not reclassified): Samsung Pass offered “Enable autofill on this page” on login current-password and signup new-password. No saved-credential fill. No Save Password (dummy only; auth not completed).

English LTR closeout: signed into `@mohamad`, used existing Settings → Language → English (no source change). After sign-out, Login and Signup were independently tested in English LTR. Password masked by default; eye at LTR right end; show; re-hide; dummy length 10 preserved; field remained usable. Dummy values only; never printed.

Operator session restore verified on Fold6: own Profile `@mohamad` / mohamad abu tair / 2.1K UM · Creator / Edit profile. dumpsys still `com.umtuba.app` versionCode **20**; installed APK SHA256 still matches `c9892a8f`. English LTR fields unchanged (already physically completed). No Play upload. No source change.

Full packet: worktree `docs/ops/android-auth-password-fold6-qa/DESKTOP_ANDROID_AUTH_PASSWORD_FINAL_DEVICE_QA_V1.md`.
