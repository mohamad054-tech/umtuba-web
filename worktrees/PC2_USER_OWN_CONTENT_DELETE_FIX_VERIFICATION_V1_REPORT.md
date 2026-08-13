# PC2_USER_OWN_CONTENT_DELETE_FIX_VERIFICATION_V1

```text
DEVICE = PC2
DEVICE_ROLE = PLATFORM_SOCIAL_CONTENT_OWNER
TASK_ID = PC2_USER_OWN_CONTENT_DELETE_FIX_VERIFICATION_V1
PARENT_FINDING = UAF-12
CENTRAL_COORDINATOR = SERVER
PRIORITY = HIGH
TIMESTAMP_LOCAL = 2026-08-13 ~21:35 +03
AUTHORITATIVE_BASE_SHA = 5dbd77910b3e5f75f0f57e908af3599474ea8a41
BRANCH = office/platform-translation-trunk-port-v1
PUSHED = NO
REMOTE_MIGRATION_APPLIED = NO
SECRET_VALUES_PRINTED = NO
```

## Verdict

**UAF12_STATUS = FIXED_IMPLEMENTED_RUNTIME_PARTIAL**

Do **not** treat this as FIXED_VERIFIED. Owner live delete + refresh/session persistence was not executed (no seeded ordinary-user login). Backend/UI/auth tests are in place.

## Phase 1 — Reproduce

**VIDEO_DELETE_ISSUE_REPRODUCED = YES**
**POST_DELETE_ISSUE_REPRODUCED = YES**

Pre-fix contract:

- Authoritative table: `public.posts` (`user_id` owner).
- Videos are `post_type = 'video'` rows (same table as text/image posts).
- RLS already had `"Users can delete their own posts"`.
- There was **no** `deletePostAction` / owner delete UI on Discover, Watch, Profile videos/photos, Feed, or Saved.
- Stories/comments already had owner delete. Posts/videos did not.
- Content registry `unpublish` only deactivates the index; it does not delete the post row.

Anonymous runtime after the fix (Playwright, local `:3000`, 390 and 1280): Home / Watch / Feed show Like/Comment/Share/Save (Watch) and **no** More/Delete. Correct for signed-out.

## Phase 2 — Ownership contract

| Item | Contract |
| --- | --- |
| Table | `public.posts` |
| Owner field | `user_id` |
| Delete API | `deletePostAction` → `deletePostForOwner` |
| RLS | `"Users can delete their own posts"` using `(select auth.uid()) = user_id` |
| Dependents | likes/comments/saves/views/commerce/search FKs are ON DELETE CASCADE or SET NULL |
| Registry | `deactivate_content_registry_item` best-effort after successful video row delete |
| Media | `post-videos` `{uid}/…` and `post-images` `{uid}/…` only if owned |
| Feed/cache | `revalidatePath` for `/`, `/discover`, `/watch`, `/feed`, `/search`, `/saved`, `/profile` layout |

**USER MAY DELETE OWN CONTENT ONLY.** Ordinary users cannot delete others' content (app check + RLS). Unauthenticated cannot delete.

## Phases 3–5 — What was fixed

1. Server action `app/actions/deletePost.ts` (auth required, integer post id, no service-role).
2. `deletePostForOwner`: load → deny if `user_id !== caller` → `DELETE … eq(id).eq(user_id).select(id)` → refuse if zero rows → then owned video/thumb/image storage cleanup → video registry deactivate.
3. Owner UI `OwnerContentDeleteControl`: overflow More, confirmation dialog/sheet, destructive confirm, 44px targets, `Deleting…`, pending double-submit guard, error stays on the item, success callback only on `ok`.
4. Wired to Discover rail, Watch rail, Feed/Saved cards, Profile video grid, Profile photos grid.
5. Local lists remove the item only after success. Failed delete keeps the item.

## Phase 6 — Authorization tests

| Gate | Result |
| --- | --- |
| OWNER_DELETE | **PASS** |
| NON_OWNER_DELETE_BLOCKED | **PASS** (backend `not_owner`, delete/storage not called) |
| UNAUTHENTICATED_DELETE_BLOCKED | **PASS** (`auth_required`, `deletePostForOwner` not called) |

## Phase 7 — Persistence

| Gate | Result |
| --- | --- |
| DELETE_SURVIVES_REFRESH | **NOT_EXECUTED** (no owner session) |
| DELETE_SURVIVES_SESSION_RELOAD | **NOT_EXECUTED** (no owner session) |

Expected after a successful owner delete: row gone from `posts`, so Discover/Watch/Profile/search/saved cannot return it. Video remint already maps missing posts to playback `deleted`. Confirm with a seeded owner on Central ingest.

## Phase 8 — UAF-11

**Not the same root cause.** UAF-11 is username/cache. Not mixed into this commit.

## Phase 9 — Responsive UX

Control uses 44px targets, overflow menu, mobile bottom sheet + desktop dialog, destructive red confirm, loading label. Anonymous 390/1280 Watch/Home/Feed: no Delete shown.

| Gate | Result |
| --- | --- |
| MOBILE_QA | **PARTIAL** (anonymous chrome only; owner dialog not live-tested) |
| DESKTOP_QA | **PARTIAL** (same) |

## Phase 10 — Tests / quality

- Targeted delete tests PASS
- Stories/content regression PASS
- `npx tsc --noEmit` PASS
- `npm run build` PASS
- `git diff --check` on UAF-12 sources PASS
- **REGRESSION = PASS** for the suites run

| Gate | Result |
| --- | --- |
| VIDEO_DELETE_UI | **PASS** (code + Watch rail wiring; owner live click NOT_EXECUTED) |
| VIDEO_DELETE_BACKEND | **PASS** |
| POST_DELETE_UI | **PASS** (Feed/Saved/Photos wiring; owner live click NOT_EXECUTED) |
| POST_DELETE_BACKEND | **PASS** (same `posts` delete path) |

## Migrations

**None prepared. None pushed.** Do not run `supabase db push`.

## Git

- Base: `5dbd77910b3e5f75f0f57e908af3599474ea8a41`
- Branch: `office/platform-translation-trunk-port-v1`
- Default: local commit + OUTBOX. **Do not push** until Central GO.
- Unrelated Store WIP / visual QA / vitest logs **not** in this commit.

## Blockers

1. No seeded ordinary-user credentials in this PC2 session → cannot runtime-verify owner delete persistence.
2. cursor-ide-browser tab create failed; used Playwright against existing `next dev :3000` instead.
3. P: share may be down — OUTBOX local copy still written.

## STOP

No further Social wave. Wait for Central GO for push/integration/deploy.
