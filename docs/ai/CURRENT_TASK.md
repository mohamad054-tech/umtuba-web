# Current Task

## Task title

Page Assembly V1 — Video-First Home + Rich Profiles

## Goal

Assemble Video-First Home Feed as `/`, move marketing landing to `/welcome`, keep `/discover` as compatible alias/redirect, deliver Rich Profile tabs (All / Posts / Videos / Articles / About), and Article Teaser Video (short clip linked to a full article) in Home Feed and profile Articles.

Reuse existing Discover feed machinery. Honest empty states. No fake content.

## Branch

`alpha-0.2`

## Decisions

1. `/` = Video-First Home Feed
2. Marketing landing → `/welcome`
3. `/discover` = alias/redirect to Home
4. Games section circle → `/games`
5. Execute phases A + B + C in this task
6. New migrations: Git only — no remote apply without separate GO

## Priority order

1. Home shell + section circles + route assembly
2. Rich Profile tabs + empty states
3. Article Teaser schema + feed + profile Articles + full article view
4. Nav/redirect compatibility + loading/empty/error
5. Tests

## Forbidden

- Changing Learning / Store / Games internal logic
- Payment systems / UM Points ledger changes
- Fake routes or fake content
- Course Authoring Studio
- Remote migration apply without GO
- Commit/push without explicit GO after review report

## Status

`completed` — implementation done; awaiting commit/push GO and separate migrate GO for `20260865`
