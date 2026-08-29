# Current Task

## Task title

DESKTOP_UMTUBA_POST_PUBLISH_EDITING_V1

## Status

**COMPLETE_CANDIDATE.** Isolated worktree only. No deploy. No remote migration apply. No push. Owner Edit occupies the old Watch/Home delete slot. Delete is inside `/edit/post/[id]`.

```
TASK_ID = DESKTOP_UMTUBA_POST_PUBLISH_EDITING_V1
STATUS = COMPLETE_CANDIDATE
DATE = 2026-08-29
MACHINE = DESKTOP
OPERATOR = DESKTOP / WEB POST + VIDEO EDITING
AUTHORITATIVE_REPO = C:\Users\1\Desktop\umtuba\umtuba-web
PARENT_PRESERVED = YES
PARENT_BRANCH = office/profile-hero-completeness-v1
PARENT_HEAD = 380a36646d4de8a37c39a56ac3ccd449f6d8b20d
BASE_REF = origin/alpha-0.2
BASE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
WORKTREE = C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-UMTUBA-POST-PUBLISH-EDITING-V1
BRANCH = desktop/umtuba-post-publish-editing-v1
DEPLOYED = NO
MIGRATION_APPLIED = NO
READY_FOR_OWNER_QA = YES
```

## Allowed scope

Owner edit of existing posts/videos (draft + published) on this isolated branch: caption/title/article/hashtags, single-slot media add/remove/replace, video IN/OUT trim + cover, ownership/RLS-preserving save, Edited indicator, tests, local preview.

## Forbidden scope

- Do not reset/clean/stash/alter the dirty parent `office/profile-hero-completeness-v1` @ `380a366`.
- Do not push, deploy, or apply remote/production Supabase migrations.
- Do not touch Android Watch V3, playback/cache worktrees, Globe, feed/recommendation ordering, Learning, Store, payments/Stripe, unrelated auth, branding, `_port_extract`, Windows Desktop artifacts.
- Do not bypass RLS or weaken ownership.
- Do not invent multi-item media reorder or spatial crop (not in this schema/pipeline).
- Do not invent server transcoding; reuse `media_pipeline` + atomic media-path switch.

## Owner / Central ask

Creator edits own post/video before and after publish. Same Post ID, public URL, comments, likes, views, saves. Failed media edit leaves the live post unchanged. Cancel leaves the live post unchanged.

## Mandatory scenarios

- **A** Draft edit — same row, no duplicate post. Implemented (`media_status = draft` updates the same `posts.id`).
- **B** Published text — caption/hashtags/article add-remove-edit. Implemented. Posts have no `title` column; article title is the title surface.
- **C** Media — add/remove/replace single image or video; cover/thumbnail. Reorder is **not** implemented (schema is one image + one video).
- **D** Published video trim — editor-style IN/OUT, preview, cancel (no live change), save.
- **E** Failed media revision — live `video_path` / `image_url` unchanged.
- **F** Owner auth + engagement stays on the same Post ID.

## Residual

Packet: `docs/ai/CURSOR_REPORT.md`. Owner QA: sign in as the post owner → More → Edit → change caption/trim → Preview → Cancel (live unchanged) → Save → same `/watch?post={id}`.
