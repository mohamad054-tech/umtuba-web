# UM Learning — Instructor Content-Block Authoring Expansion V1

Status: **implemented locally** (no migration; no remote DB change)

Branch: `office/learning-instructor-content-block-authoring-expansion-v1`

Capability: `learning.instructor.content_block_authoring_expansion_v1`

## Purpose

Expand the instructor lesson content-block editor so instructors can author the
media/structure types already supported by the DB allowlist and learner
`ContentBlockRenderer`, without uploads or new migrations.

## Supported instructor types

| Type | Persisted content |
| --- | --- |
| `rich_text` | `{ text, format? }` |
| `heading` | `{ text, level: 2 }` |
| `callout` | `{ text, variant }` — **variant required** (default `info`) |
| `image` | `{ url, alt?, caption? }` |
| `video` | `{ url, provider?, caption? }` |
| `audio` | `{ url, caption? }` |
| `quote` | `{ text, attribution? }` |
| `divider` | `{}` or `{ style }` (`solid` omitted as default) |
| `external_link` | `{ url, label?, description? }` |
| `code_block` | `{ code, language? }` |

## URL policy

Opaque external **http(s)** references only (`isSafeHttpUrl` + SQL
`learning_lesson_content_block_assert_safe_url`). No uploads, storage buckets,
or signed URLs. Provider on video is a hint only; renderer still uses `url`.

## Reserved / deferred / deferred-to-later

Rejected in instructor shaping:

- Reserved: `ai_block`, `interactive_block`
- Deferred: `gallery`, `table`, `embed`, `html`
- Creatable but **not** in this UI slice: `transcript`, `pdf`, `downloadable_file`

## Renderer

Learner `ContentBlockRenderer` / `contentBlockRender` reused **unchanged**.

## Validation

Pure helper: `lib/learning/instructorContentBlockAuthoring.ts`  
Actions: `createContentBlockAction` / `updateContentBlockAction` shape via helper;
no arbitrary JSON from the browser.

## Migration

**None.** Remote DB change **not required**.
