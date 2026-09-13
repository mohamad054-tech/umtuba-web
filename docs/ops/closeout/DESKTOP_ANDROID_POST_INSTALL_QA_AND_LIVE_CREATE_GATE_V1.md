# DESKTOP_ANDROID_POST_INSTALL_QA_AND_LIVE_CREATE_GATE_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_RELEASE_OPERATOR  
**PRIORITY:** RELEASE_CRITICAL  
**MODE:** VERIFY_FIRST / FIX_ONLY_IF_REQUIRED  
**DATE:** 2026-08-13  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**VERSION_CODE:** `3`  
**MOBILE:** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `fe14a34`  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1`

Operator physical-device evidence (given, not re-run here): Internal Testing install/update PASS; Watch / Discover / Messages / Create UI PASS; Live UI loads with "Live unavailable".

No Android rebuild. No AAB upload. No Google Play mutation. Live was not enabled. No production content mutation. No automatic file upload.

---

## Verdict

| Gate | Result |
|------|--------|
| LIVE_EXPECTED_STATE | **INTENTIONALLY_UNAVAILABLE** |
| LIVE_RELEASE_BLOCKING | **NO** |
| CREATE_CONTRACT_AUDIT | **PASS** |
| CREATE_PHYSICAL_UPLOAD_TEST_READY | **YES** |
| CREATE_REAL_UPLOAD | **NOT_TESTED** (operator phone step remaining) |
| SERVICE_ROLE_EXPOSED | **NO** |
| ENV_HYGIENE | **PASS** |
| FILES_CHANGED (product/code/config this task) | **[]** |
| NEW_AAB_REQUIRED | **NO** |
| ANDROID_INTERNAL_TEST_CORE_READY | **YES** |
| ANDROID_INTERNAL_TEST_FULL_FEATURE_READY | **NO** |
| ANDROID_PRODUCTION_RELEASE_READY | **NO** |
| VERDICT | Live is the governed fail-closed mobile contract, not a v3 misconfig. Create is contract-ready for a signed-in operator physical upload. Do not rebuild. |

---

## Phase 1 — Live audit

### Observed device copy (matches source)

- Title: `Live unavailable`
- Body: `Live lobby is not available yet. Session listing and joining will appear when a trusted mobile live contract is enabled.`

### Gate code (fail-closed, not a runtime outage)

`umtuba-mobile/src/lib/live/api.ts`:

- `isLiveLobbySourceConfigured()` **hard-returns `false`**.
- Comment: *“Today: none — LiveKit URL alone is not a session list or join contract.”*
- `loadLiveLobby()` returns `ok: false`, `unavailable: true`, and the exact device message **without calling any RPC/table**.

`umtuba-mobile/src/lib/live/parse.ts`:

- `isLiveJoinContractConfigured()` **hard-returns `false`**.
- Comment: *“LiveKit URL env alone is not sufficient.”*
- `resolveLiveJoin()` always `canJoin: false` while that flag is false.

`umtuba-mobile/app/(tabs)/live.tsx`:

- Maps `result.unavailable` → phase `"unavailable"` → `LiveStatePanel` title `"Live unavailable"`.
- Fallback body if message missing: *“Live lobby listing and joining are not available on this app yet.”*

`umtuba-mobile/src/lib/live/mapDestination.ts`:

- Room deep-links resolve to the Live **lobby only** (no join).
- Absolute URLs fail-closed except `umtuba.com` / `www.umtuba.com`, and those still map to `/(tabs)/live`.

`umtuba-mobile/src/lib/env.ts`:

- Optional `EXPO_PUBLIC_LIVEKIT_URL` is parsed for shape only.
- `livekitUrl` is **never consumed** by the Live lobby/join path. Setting it would not enable listing or joining.

Unit contract: `umtuba-mobile/src/lib/live/live.test.ts` asserts lobby source is unconfigured and join is blocked.

### Shared/web comparison (not a mobile bug)

Web Live honesty contract (`app/live/hooks/liveTrustHonesty.contract.test.ts` + `app/live/LiveExperience.tsx`) expects *“Live is temporarily unavailable”* when beta readiness is false. Web also fail-closes Live rather than inventing rooms.

Mobile README Phase 2 still lists “Live lobby + LiveKit” as a later surface — not a claim that v3 ships a join contract.

Prior Android closeouts (`DESKTOP_ANDROID_RELEASE_BUILD_V1.md`, runtime-config rebuild V1) treat `EXPO_PUBLIC_LIVEKIT_URL` as **optional** and do not provision a mobile live backend.

### Classification

- **LIVE_EXPECTED_STATE = INTENTIONALLY_UNAVAILABLE**
- **Not BROKEN:** the screen is the designed fail-closed state. No missing env, no failed RPC, no production LiveKit miswire.
- **NON_BLOCKING** for Internal Testing **core** readiness.
- Do **not** flip `isLiveLobbySourceConfigured` / `isLiveJoinContractConfigured` to true. That would invent a listing/join contract that does not exist.
- No new AAB required for Live.

---

## Phase 2 — Create / media upload audit

End-to-end mobile path (code, not executed against production):

1. **Choose video** — `app/(tabs)/create.tsx` → `pickVideoFromLibrary()` (`src/lib/video/pickVideo.ts`)
2. **Permission** — `requestMediaLibraryPermission()`; Android may still open the system photo picker if the broad grant is denied (`pickVideo.ts` + `permissions/foundation.ts`)
3. **Picker** — `expo-image-picker` `launchImageLibraryAsync({ mediaTypes: ["videos"] })`
4. **Android `content://`** — MIME inferred (default `video/mp4` when gallery-only + empty MIME); size probed via ImagePicker → `FileSystem.getInfoAsync` → `fetch(blob)`; covered by `pickVideo.test.ts`
5. **Validation** — `src/contracts/video.ts`: MIME `video/mp4` | `video/webm` | `video/quicktime`; **50 MB** (`MAX_VIDEO_BYTES`); caption ≤ 1000 chars; duration optional
6. **Auth** — unsigned users see “Sign in to create”; publish uses `auth.getSession()` JWT (not service-role)
7. **Upload** — `uploadPostVideo()` XHR `POST` `{supabaseUrl}/storage/v1/object/post-videos/{userId}/{uuid}.{ext}` with `apikey` = publishable key + `Authorization: Bearer {access_token}`; `x-upsert: false`; timeout 10 min; progress + AbortSignal cancel
8. **Storage contract** — local migration `supabase/migrations/20260713_video_posts_v1.sql`: private bucket `post-videos`, 50 MB, same MIME allowlist, owner-folder RLS insert/update/delete, signed-URL select
9. **Publish** — `publishVideoPost()` verifies object via signed URL, inserts `posts` (`post_type=video`, `media_status=queued` → `processing` → `ready`). Matches web `lib/supabase/videoPosts.ts` V1 client lifecycle (not server transcoding). Mock `thumbnail_path` is documented as architecture until a generator ships.
10. **Watch** — `fetchWatchFeedPage()` selects `post_type=video` AND `media_status=ready` AND `video_path` not null, newest first, signed playback URL
11. **Errors / retry / duplicate** — busy flags block second upload; cancel deletes owned object; auth-loss queues orphan path; other failures delete owned object; Retry re-runs the local asset

### Production-evidence that the backend contract exists

Physical Watch playback on versionCode 3 already proves:

- public Supabase client config works
- `posts` video rows + `media_status=ready` query work
- `post-videos` signed URLs work

Create uses the same public client, bucket, and RLS owner path. Missing-env would have blocked the whole app (closed on v3).

### Permissions / Expo plugins

`app.config.ts`:

- Android package `com.umtuba.app`, `versionCode: 3`
- Permissions: `READ_MEDIA_VIDEO`, `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE`, plus camera/mic/notifications
- Plugins: `expo-image-picker`, `expo-media-library`, `expo-video`

### Cleanup (honest)

- Failed/cancelled uploads: storage object deleted (owner RLS).
- **Published** items: **no Android UI** to delete a Watch post. Web Create only deletes **unfinished** uploads (`deleteUploadedPostVideo`). Owner DELETE RLS exists (`Users can delete their own posts`) but is not exposed in the Android app.
- Operator should use a distinctive caption so the test item is identifiable. Do not SQL-delete from this audit.

### CREATE_PHYSICAL_UPLOAD_TEST_READY = YES

Preconditions: operator is **signed in** (Create UI already rendered Choose video, so this was true on the evidence device).

Shortest phone test:

1. Create → Choose video. Pick a **short MP4** (preferred), or WebM/MOV, **under 50 MB**.
2. Caption: `[ANDROID INTERNAL TEST] Create upload V1`
3. Publish. Expect: progress → “Video published.” → **Open Watch**.
4. Verify: Watch shows the new clip near the top with that caption; playback works (same signed-URL path as existing Watch items).
5. Cleanup: **not supported in the Android app.** Leave the tagged item; do not invent a production delete. Failed attempts should self-clean storage.

This audit did **not** upload a file and did **not** mutate production.

---

## Phase 3 — Release gate (versionCode 3)

| Classification | Result |
|----------------|--------|
| ANDROID_INSTALL | PASS (operator) |
| ANDROID_STARTUP | PASS (operator) |
| ANDROID_SUPABASE_CONFIG | PASS (operator + prior closeout) |
| WATCH | PASS (operator) |
| DISCOVER | PASS (operator) |
| MESSAGES | PASS (operator) |
| CREATE_UI | PASS (operator) |
| CREATE_REAL_UPLOAD | NOT_TESTED |
| LIVE | INTENTIONALLY_UNAVAILABLE (non-blocking for core) |

**ANDROID_INTERNAL_TEST_CORE_READY = YES** — install, config, Watch, Discover, Messages, Create UI. Live unavailability is the product contract.

**ANDROID_INTERNAL_TEST_FULL_FEATURE_READY = NO** — Live join/listing not provisioned; Create real upload not yet executed on device.

**ANDROID_PRODUCTION_RELEASE_READY = NO** — Internal Testing only; Live unfinished; Create upload unverified; not a store production rollout.

---

## Phase 4 — Code hygiene

| Check | Result |
|-------|--------|
| Mobile branch | `master` = `origin/master` @ `fe14a34` |
| Uncommitted (keep; prior task) | `eas.json`, `app.config.ts`, untracked `release-artifacts/` |
| `eas.json` | `build.production.environment = "production"`; submit track `internal`; **no secrets** |
| `app.config.ts` | `versionCode` 3; package `com.umtuba.app` |
| `.env` | gitignored (`.gitignore:44:.env`); **not tracked**; only `.env.example` in git (empty placeholders) |
| EXPO_PUBLIC values in git | names + fake test values only; no production keys |
| Service-role in mobile client | rejected by `getEnv()`; client uses publishable key only |
| EAS env names on last AAB | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (names in `release-artifacts/eas-build-26a60f53.json`) |
| New build this task | NO |
| Google Play this task | NO |

---

## Phase 5 — Fix

No release-blocking defect. Live is intentional. Create contract is complete enough for an operator physical test.

**FILES_CHANGED (product/code/config) = []**  
**NEW_AAB_REQUIRED = NO**

Docs updated (web): `docs/ai/*` + this packet.

---

## Next operator action

1. On the physical device (signed in), run the Create upload test above.
2. Do not rebuild. Do not upload another AAB. Do not change Google Play. Do not enable Live.
3. Keep mobile uncommitted `eas.json` / `app.config.ts` / `release-artifacts/` (do not discard). Do not commit `.env` or the AAB.
