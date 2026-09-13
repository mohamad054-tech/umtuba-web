# PC2_APP_STORE_BUILD29_FINAL_PREFLIGHT

Official ASC API only. No EAS. No Add for Review. No product source change.

```text
TASK_ID = PC2_APP_STORE_BUILD29_FINAL_PREFLIGHT
STATUS = NOT_READY
APP_VERSION = 1.0.0
SELECTED_BUILD = 16
SELECTED_BUILD_SHA = UNKNOWN_NOT_29
IPHONE_ONLY_SCOPE = NO_IPAD_SCREENSHOT_SETS
IPHONE_SCREENSHOTS = APP_IPHONE_65_COUNT_3; APP_IPHONE_67_ABSENT
APP_METADATA = PRESENT
PRIVACY_POLICY = PRESENT_AND_REACHABLE
APP_PRIVACY = NOT_QUERIABLE_VIA_ASC_API_USED
AGE_RATING = COMPLETE
CONTENT_RIGHTS = COMPLETE
REVIEWER_CONTACT = COMPLETE
REVIEWER_LOGIN = COMPLETE
EXPORT_COMPLIANCE = BUILD29_USES_NON_EXEMPT_ENCRYPTION_FALSE
AGREEMENTS = NOT_QUERIED
MISSING_REQUIRED_FIELDS = SELECTED_BUILD_IS_16_NOT_29; APP_IPHONE_67_SET_ABSENT; APP_PRIVACY_NUTRITION_LABELS_NOT_VISIBLE_VIA_THIS_API
APP_STORE_CONNECT_BLOCKERS = SELECTED_BUILD_16_NOT_29
READY_FOR_ADD_FOR_REVIEW = NO
ADD_FOR_REVIEW = NO
SOURCE_CHANGED = NO
NEW_BUILD_CREATED = NO
```

## ASC quotes (API)

App `6801665530` / `com.umtuba.app` / name `UMTUBA` / locale `en-US`.

Version (1 row): id `ce705833-75df-4677-8f6a-a2c239eb092d`, `versionString=1.0`, `platform=IOS`, `appStoreState=PREPARE_FOR_SUBMISSION`, `appVersionState=PREPARE_FOR_SUBMISSION`, copyright `2026 UMTUBA`.

**Selected build (version.getBuildAsync):** id `abc0fda5-7688-4f8b-b87b-6832ff34ad9f`, `cfBundleVersion=16`, `uploadedDate=2026-08-17T15:04:45-07:00`, `processingState=VALID`, `usesNonExemptEncryption=false`. **Not 29. Not `21ce372e`.**

**Apple Build 29 (exists, not selected):** id `21ce372e-43c4-47d1-a85b-83ae2bb18479`, `cfBundleVersion=29`, `processingState=VALID`, `uploadedDate=2026-08-22T16:00:40-07:00`, `usesNonExemptEncryption=false`, `expired=false`. EAS `03abe57b` / SHA `17cbfef` is this binary’s provenance from the prior packet — ASC does not return git SHA.

App Info `adc90496-…`: `PREPARE_FOR_SUBMISSION`, `appStoreAgeRating=TWELVE_PLUS`. Age declaration filled (advertising, UGC, violence, etc.). Info loc en-US: name `UMTUBA`, subtitle `Watch. Create. Belong.`, `privacyPolicyUrl=https://umtuba.com/privacy` (HTTP GET reachable). Content rights on App: `USES_THIRD_PARTY_CONTENT`.

Version loc en-US: description len 408, keywords present, `marketingUrl=https://umtuba.com`, `supportUrl=https://umtuba.com/support` (HTTP GET reachable), `whatsNew` empty. Screenshot sets: **only** `APP_IPHONE_65` count **3**. No `APP_IPHONE_67`. No `APP_IPAD_*`.

Review detail: contact first/last/phone/email present; `demoAccountRequired=true`; demo name+password present; notes present. Values not printed.

App Privacy nutrition-label relationships `dataUsages` / `dataUsagePublishState` **do not exist** on this API client. Not guessed complete.

Agreements not queried.
