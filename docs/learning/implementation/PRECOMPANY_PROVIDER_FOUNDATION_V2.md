# Learning Provider Foundation V2 (pre-company)

Status: implemented in `umtuba-web` (local-only migration)
Migration: `supabase/migrations/20260929_store_learning_precompany_foundation_v2.sql`

## Goal

Prepare Learning for UMTUBA Originals and future partner/external catalogs
without importing unauthorized third-party courses.

## Provider types

`UMTUBA_ORIGINAL` | `PARTNER` | `EXTERNAL`

## Rights (unknown = DENY)

`METADATA_DISPLAY_ALLOWED`, `CONTENT_HOSTING_ALLOWED`, `VIDEO_HOSTING_ALLOWED`,
`ENROLLMENT_ALLOWED`, `PAYMENT_ALLOWED`, `AI_USAGE_ALLOWED` (default FALSE),
`CERTIFICATE_INTEGRATION_ALLOWED`

## Originals

`lib/learning/originals` — first-party draft/publish, lessons (video/text/resource/quiz),
versioning, UMTUBA author attribution, AI Tutor only for UMTUBA-owned published
content, UMTUBA-owned certificate flow.

No fabricated external instructors or certifications.
