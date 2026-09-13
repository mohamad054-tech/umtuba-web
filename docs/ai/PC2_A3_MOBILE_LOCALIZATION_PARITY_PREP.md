# PC2-A3 Mobile Localization Parity Prep V1

```text
PC2 REPORT
SOURCE_DEVICE = PC2
TASK_ID = PC2_A3_MOBILE_LOCALIZATION_PARITY_PREP_V1
DATE = 2026-08-16
MODE = INVENTORY / PREP ONLY
COMMIT_CREATED = NO
PUSHED = NO
PRODUCT_CODE_CHANGED = NO
CURSOR_REPORT_OVERWRITTEN = NO
IOS_BUILT = NO
PRODUCTION_SUBMITTED = NO
ANDROID_VERSIONCODE_TOUCHED = NO
STORE_LEARNING_REOPENED = NO
IOS_ONLY_TRANSLATION_IMPLEMENTED = NO
MOBILE_CHECKOUT_77e9e28_RESET = NO
```

## Required final fields

```text
AUTHORITATIVE_MOBILE_SHA = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
TARGET_LANGUAGES = ar, en, fr, es, de, pt
TARGET_LANGUAGE_EVIDENCE = CONFIRMED_FROM_DESKTOP_CENTRAL_I18N_CONTRACT
EXISTING_MOBILE_LOCALES = NONE
HARDCODED_MOBILE_STRINGS = YES_ENGLISH_ONLY_SHARED_TSX
MISSING_KEYS = YES_MOST_MOBILE_SURFACES_HAVE_NO_CATALOG_KEY
RTL_GAPS = YES_NO_I18NMANAGER_NO_DIR_LTR_CHEVRON_STATIC_ENGLISH
IOS_ONLY_STRINGS = INFO_PLIST_USAGE_DESCRIPTIONS
ANDROID_ONLY_STRINGS = LIVE_TAB_AND_LOBBY; ANDROID_NOTIFICATION_CHANNEL_NAME
SHARED_STRINGS = ALL_APP_AND_COMPONENT_TSX_EXCEPT_LIVE_SURFACE
LOCALIZATION_IMPLEMENTATION_READY = NO
BLOCKERS = [NO_MOBILE_I18N_LAYER, NO_MOBILE_LOCALE_FILES, DESKTOP_CATALOG_MISSING_MOBILE_KEYS, RTL_UNWIRED, LANGUAGE_SETTING_HARDCODED_EN, FR_ES_DE_PT_SHELL_INCOMPLETE, IMPLEMENTATION_NOT_AUTHORIZED]
```

---

## Scope and method

Inventory / prep only. No translation implementation. No iOS-only catalog. No language invention. No Android `versionCode` change. Store / Learning not reopened. iOS not built. Production not submitted.

Authoritative mobile source was read from a **new detached worktree**, not by resetting the diverged PC2 checkout:

```text
MOBILE_SOT = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile
LOCAL_CHECKOUT_LEFT_UNTOUCHED = pc2/eas-preview-config-v1 @ 77e9e287e117fc9a19f9a5df1596f69b0b8bf07f
READ_WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile/worktrees/_pc2_a3_loc_017be09
READ_SHA = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
READ_SUBJECT = fix(mobile): share conversation UGC and ingest prebuild contract tests
READ_DATE = 2026-08-16 09:54:13 +0300
```

Web evidence was read from this workspace (`lib/i18n`, `docs/architecture/PLATFORM_INTERNATIONALIZATION_FOUNDATION_V1.md`, Translation Studio language contract). `docs/ai/CURSOR_REPORT.md` was not overwritten.

---

## TARGET_LANGUAGES (not guessed)

**Recovered exact list:** `ar`, `en`, `fr`, `es`, `de`, `pt`.

This is the Desktop / Central platform locale contract. There is **no separate mobile-approved language list** in `umtuba-mobile` at `017be09` (no locale files, no i18n config, Settings Language is a static `"English"` info row).

Do not add languages beyond this set. Do not drop FR/ES/DE/PT just because their App Shell catalogs still inherit English.

### TARGET_LANGUAGE_EVIDENCE

| Source | What it states |
| --- | --- |
| `lib/i18n/locales.ts` | `SUPPORTED_LOCALES = ["ar", "en", "fr", "es", "de", "pt"]` |
| `lib/i18n/i18nFoundation.test.ts` | Asserts exact six-locale array; rejects `zh`; Arabic `rtl`, others `ltr` |
| `docs/architecture/PLATFORM_INTERNATIONALIZATION_FOUNDATION_V1.md` | Supported locales table: `ar` RTL, `en` default LTR, `fr`, `es`, `de`, `pt` LTR |
| `lib/i18n/messages/catalogs.ts` | Catalogs exist for all six codes |
| `lib/translationStudio/languages.ts` | Studio languages = `SUPPORTED_LOCALES` (same six) |
| `docs/architecture/TRANSLATION_STUDIO_FOUNDATION_V1.md` | EN approved source; AR approved when non-empty; FR/ES/DE/PT never auto-approved (fallback EN stays Needs Review) |

No PC2 A1/A2/A3 report invents a different mobile language set. No mobile `locales/`, `i18n/`, `expo-localization`, or `CFBundleLocalizations` exists at `017be09`.

### Coverage caveat (not a second language list)

| Locale | Desktop catalog state | Mobile catalog state |
| --- | --- | --- |
| `en` | Full App Shell source | None |
| `ar` | Full App Shell Arabic | None |
| `fr` / `es` / `de` / `pt` | Language names + some `actions.*` / `status.*`; remaining App Shell keys inherit English | None |

---

## EXISTING_MOBILE_LOCALES

```text
EXISTING_MOBILE_LOCALES = NONE
```

At `017be09`:

- No `locales/` directory
- No `src/i18n/`
- No `*.strings`, `strings.xml`, `InfoPlist.strings`, or `Localizable.strings`
- No checked-in `ios/` or `android/` native trees (Expo prebuild)
- `package.json` has no `i18n` / `expo-localization` / `i18next` dependency
- `app.config.ts` has no `locales` / `CFBundleLocalizations`
- Settings → Language is `kind: "info"`, value `"English"` (not a picker)

All user-facing copy is hardcoded English in shared TypeScript.

---

## Classification rule

UMTUBA mobile is **one Expo / React Native product** (`com.umtuba.app`). Release screens live in shared `app/` + `components/`.

| Class | Rule used here |
| --- | --- |
| `SHARED_IOS_ANDROID` | Same TSX/TS string shown on both platforms |
| `IOS_ONLY` | iOS system / Info.plist copy, or a string that cannot appear on Android |
| `ANDROID_ONLY` | Android-only surface or Android system channel name |

---

## Newly reconciled strings

| English | Class | Mobile evidence | Desktop key | Gap |
| --- | --- | --- | --- | --- |
| Open | SHARED | `Open Watch`, `Open profile`, `Open rewards`, `Open notifications`, `Open settings`, `Open UMTUBA Terms` | none | MISSING_KEY |
| Saved | SHARED | Watch rail a11y is `Save` / `Unsave` (star + count). No visible `Saved` label. Web menu uses `menu.saved` = `Saved` | `menu.saved` | SEMANTIC_MISMATCH |
| Follow | SHARED | `followButtonLabel(false)` → `"Follow"` (`src/lib/social/follows.ts`, profile) | none | MISSING_KEY |
| Following | SHARED | `followButtonLabel(true)` → `"Following"` (never `Unfollow`) | none | MISSING_KEY |
| Back | SHARED | `GlobalBackButton` `accessibilityLabel="Back"`; visible glyph is LTR `‹` | `actions.back` | KEY_EXISTS_UNUSED_ON_MOBILE |
| Messages | SHARED | Tab title; catalog `Messages`; notification category `Messages` | `nav.messages` | KEY_EXISTS_UNUSED_ON_MOBILE |
| Profile | SHARED | Tab title; stack title; `Open profile` | `nav.profile` | KEY_EXISTS_UNUSED_ON_MOBILE |
| Report / Block | SHARED | Watch rail + alerts; conversation `Report or block` | none | MISSING_KEY |
| Account deletion | SHARED | Settings row `Delete account` opens browser support URL | none | MISSING_KEY |
| Auth | SHARED | Login / signup / forgot / update-password / change-password | `menu.signIn` / `settings.signOut` only | MOSTLY_MISSING |
| Upload / Publish | SHARED | Create: `Choose video`, `Publish`, `Uploading N%`, `Video published.` | none | MISSING_KEY |
| Error / loading / empty | SHARED | Per-screen English (`Loading Watch…`, `No videos yet`, `Sign in required`, …) | `status.*` / `empty.*` / `error.*` are generic only | PARTIAL_GENERIC_ONLY |

---

## HARDCODED_MOBILE_STRINGS

English-only. Representative inventory by surface (not every World map-layer label).

### Chrome / navigation — SHARED

- Tabs: Watch, Discover, Create, Live, Messages, Profile
- Stack titles: Profile, Notifications, Rewards, World, Settings, Blocked users, Change password, Conversation
- `+not-found`: `Not found`, `This screen does not exist.`, `Go home`
- Config gate: `Configuration needed`, `Retry`
- Back: a11y `Back`

### Auth — SHARED

- Login: `Welcome back`, `Sign in to Watch, earn UM Points, and continue your journey.`, `Forgot password?`, `New here? Create an account`, `Email`, `Password`, `Sign in`, `Unable to sign in.`
- Signup: `Join UMTUBA`, `Create your account to watch, create, and earn.`, `Full name`, `Username`, `Referral code (optional)`, `Create account`, `Already have an account? Sign in`
- Forgot: `Reset password`, `Send reset link`, `If an account exists for that email, a reset link is on the way.`
- Update / change password: `Update password`, `Save password`, `New password`, `Confirm password`, `Sign in required`, `Back to sign in`, `Cancel`

### Watch — SHARED

- `Loading Watch…`, `No videos yet. Check back soon.`, `Retry`, `Refresh`, `Dismiss`
- Play / pause: `Play video` / `Pause video`, `Paused` / `Playing`
- `Auto-next on` / `Auto-next off`, `Mute` / `Unmute`, `Volume N%`
- Like / Save a11y: `Like` / `Unlike`, `Save` / `Unsave`
- Rail: `Delete`, `Report`, `Block`; disabled `Comments, coming soon`, `Share, coming soon`
- Alerts: `Like failed`, `Save failed`, `Delete video`, `Report`, `This video`, `This account`, `Block account`, `Account blocked`, report reasons (below)

### Profile / social — SHARED

- `Loading profile…`, `Sign in required`, `Profile not found`, `Profile details unavailable`, `Follow` / `Following`
- Shortcuts: Rewards, Notifications, Settings (`Open …` a11y)

### Messages — SHARED

- `Sign in to message`, `Messages unavailable`, `Couldn’t load messages`, `No conversations yet`
- Thread: `Report or block`, `Typing…`, `No messages yet`, `Load earlier`, `Send`, `Message`, `Back to Messages`
- Receipt crumbs: `Sending`, `Failed`

### Create / publish — SHARED

- `Sign in to create`, `Create`, `MP4, WebM, or MOV — maximum 50 MB`
- `Choose video` / `Choose a different video`, `Caption`, `Publish`, `Cancel upload`, `Uploading N%`, `Publishing…`
- `Video published.`, `Open Watch`, `Create another`, `Publish failed`
- UGC ack: `I confirm this video follows UMTUBA Terms and does not include objectionable content.`
- `Read Terms`

### Report / block / deletion — SHARED

Report reasons (`UGC_REPORT_REASON_LABELS`):

- Spam or misleading
- Harassment or bullying
- Hate or discrimination
- Sexual or pornographic content
- Violence or dangerous acts
- Illegal activity
- Impersonation or identity fraud
- Other objectionable content

Settings: `Delete account` (external browser). Blocked users: `Unblock`, `No blocked accounts on this device.`

### Settings — SHARED

- Sections: Account, Privacy, App, Support, Developer
- Rows: Edit profile, Change password, Sign out, Delete account, Privacy settings, Notifications inbox, System notification settings, Blocked users, Theme (`Dark`), Language (`English`), About, Help, Contact, Privacy Policy, Terms
- Alerts: `Sign out` / `End your session on this device?`, `Unavailable`, `Not available yet`

### Error / loading / empty (other) — SHARED

- Discover: `Loading Discover…`, `Discover unavailable`, `Couldn’t load Discover`, `No results`
- Notifications: `Sign in required`, `Notifications unavailable`, `Couldn’t load notifications`, `No notifications yet`
- Rewards: `UM Points`, `Unable to load rewards.`, `Retry`
- Live empty/error copy exists in source but is **Android-visible only** (see below)

### World — SHARED (catalog out of Desktop App Shell scope)

Hardcoded layer / control labels: Places, Education, Users, Games, Commerce, Events, Zoom in/out, Recenter, Globe, Map, Close, Retry, Search, etc. Desktop Translation Studio marks World **out of scope**.

---

## MISSING_KEYS

Desktop `FoundationMessages` (`lib/i18n/messages/types.ts`) has **no** keys for most shipping mobile copy.

### Keys that exist on Desktop but are unused on mobile

`actions.back`, `actions.retry`, `actions.cancel`, `actions.save`, `actions.delete`, `actions.close`, `nav.messages`, `nav.profile`, `nav.discover`, `nav.live`, `nav.world`, `menu.create`, `menu.saved`, `menu.signIn`, `menu.signOut`, `settings.signOut`, `settings.language`, `status.loading`, `status.empty`, `status.error`, `empty.*`, `error.*`

Mobile does not import `lib/i18n`. These keys cannot be consumed until a shared catalog + mobile translator exists.

### Keys that do not exist (needed for reconciled + shipping surfaces)

No Desktop keys for:

- `Follow` / `Following`
- `Open` / `Open Watch` / `Open profile` / `Open rewards` / `Open settings`
- `Save` / `Unsave` (Watch rail; distinct from `menu.saved` = `Saved`)
- `Like` / `Unlike`
- `Report` / `Block` / `Unblock` / `Report or block` / report reasons
- `Publish` / `Uploading` / `Choose video` / UGC publish ack
- Auth screen titles and field labels beyond generic sign-in/out
- `Delete account`
- Per-screen loading/empty (`Loading Watch…`, `No videos yet`, `Sign in to message`, …)
- Watch playback chrome (`Auto-next`, `Mute`, `Paused`)
- iOS usage-description strings

**Do not invent those keys in this prep task.** A later implementation must extend the Desktop/Central catalog first, then consume the same keys on iOS and Android.

---

## RTL_GAPS

Arabic is the only RTL locale in the approved set (`getLocaleDirection("ar") === "rtl"`). Mobile at `017be09` is not RTL-ready.

| Gap | Evidence |
| --- | --- |
| No RTL runtime | No `I18nManager`, `forceRTL`, `allowRTL`, `expo-localization` |
| No document / view direction | No `dir`, `writingDirection`, or locale-driven `flexDirection` |
| LTR back glyph | `GlobalBackButton` renders `‹` (start-side assumption is LTR) |
| Hardcoded row layout | Settings and many screens use `flexDirection: "row"` |
| Hardcoded alignment | `textAlign: "center"` / `"right"` in Watch, messenger, live, world |
| Language locked | Settings Language value is `"English"`; no locale switch |
| System permission copy | iOS usage strings are English-only in `app.config.ts` |
| Desktop residue | Prior PC2 Store notes: English sentences under RTL can keep leading punctuation — platform i18n, not fixed here |

---

## IOS_ONLY_STRINGS

From `app.config.ts` `ios.infoPlist` / plugins (iOS system dialogs):

- `NSPhotoLibraryUsageDescription` / expo-image-picker `photosPermission`: `UMTUBA needs photo library access so you can choose a video to publish.`
- `NSUserNotificationsUsageDescription`: `UMTUBA can notify you about likes, rewards, and account activity.`
- `NSLocationWhenInUseUsageDescription`: `UMTUBA includes a world map. The bundled map library references location services. UMTUBA does not use your location.`
- `CFBundleDisplayName`: `UMTUBA`

Live tab is **hidden on iOS** (`href: Platform.OS === "ios" ? null : "/(tabs)/live"`; Live screen redirects to Watch). Live lobby copy is therefore not an iOS user-facing string.

No iOS-only in-app translation catalog exists. Do not create one.

---

## ANDROID_ONLY_STRINGS

- Tab `Live` + lobby: `Loading Live…`, `Live`, `Sessions from trusted UMTUBA live sources appear here.`, `Live unavailable`, `Couldn’t load Live`, `No live sessions`, `Join`, `Live joining is not available yet.`
- Android notification channel name: `"UMTUBA"` (`src/lib/push/service.ts` `ensureAndroidChannel`)

No `strings.xml` in source. Android permission rationales are not separately authored beyond the shared expo-image-picker English string.

---

## SHARED_STRINGS

Everything in `app/` and `components/` except the Android-only Live surface and the iOS Info.plist usage strings. That includes auth, Watch, Discover, Create, Messages, Profile, Settings, notifications, rewards, blocked users, World, UGC report/block, and account-deletion row.

Follow / Following, Back, Messages, Profile, Open Watch, Save/Unsave, Report/Block, publish/upload, and auth copy are **shared source**.

---

## LOCALIZATION_IMPLEMENTATION_READY

```text
LOCALIZATION_IMPLEMENTATION_READY = NO
```

Reasons (all must be true before a parity implementation wave):

1. This task is inventory / prep only; implementation is forbidden here.
2. Mobile has no i18n layer, no locale files, no locale resolver.
3. Desktop catalog lacks keys for most shipping mobile strings.
4. FR/ES/DE/PT App Shell is still English-inherit for most keys; do not diverge by shipping mobile-only FR/ES/DE/PT.
5. RTL is unwired; Arabic cannot be flipped correctly with current layout.
6. Settings Language is hardcoded English.
7. A later pass must be **shared iOS+Android** consuming Desktop/Central keys — not an iOS-only translation tree.

---

## BLOCKERS

1. **NO_MOBILE_I18N_LAYER** — no translator, provider, or locale cookie/preference on mobile.
2. **NO_MOBILE_LOCALE_FILES** — `EXISTING_MOBILE_LOCALES = NONE`.
3. **DESKTOP_CATALOG_MISSING_MOBILE_KEYS** — Follow/Following, Open, Report/Block, Publish, auth, UGC, per-screen states.
4. **RTL_UNWIRED** — no `I18nManager` / direction; LTR back chevron.
5. **LANGUAGE_SETTING_HARDCODED_EN** — Settings shows `English` as info only.
6. **FR_ES_DE_PT_SHELL_INCOMPLETE** — Desktop still inherits English for most App Shell keys; mobile must not invent fuller catalogs alone.
7. **IMPLEMENTATION_NOT_AUTHORIZED** — Central GO required before any translation wiring. Do not implement from this prep.
8. **DIVERGED_PC2_MOBILE_CHECKOUT** — local `77e9e28` remains diverged; do not reset/merge. Implementation, if later authorized, must start from `017be09` (or a Central-named descendant), not `77e9e28`.

---

## What was not done (by design)

- No iOS-only translation implementation
- No broad translation implementation
- No guessed languages
- No Android `versionCode` change
- Store / Learning not reopened
- No Desktop/Central catalog divergence
- No iOS build
- No Production submit
- `docs/ai/CURSOR_REPORT.md` not overwritten

---

## Next (Central only)

If Central authorizes a shared localization wave:

1. Extend Desktop `FoundationMessages` with the missing mobile keys (same IDs for iOS and Android).
2. Fill `en` + `ar` first; keep FR/ES/DE/PT on the existing inherit/review rule until a shell pass is authorized.
3. Add one shared mobile i18n consumer of that catalog (not an iOS-only tree).
4. Wire RTL for `ar` (`I18nManager` + mirrored chrome, including Back).
5. Replace Settings Language `"English"` with the six-locale selector already defined on Desktop.
6. Keep native usage-description strings in the same six-locale set; do not invent extra languages.
)
