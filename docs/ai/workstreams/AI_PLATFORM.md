# AI Platform Workstream (Desktop-owned)

## SAVE POINT — 2026-07-29 (Desktop)

**Machine:** Desktop
**Active work:** Video Personalization Signals Wiring V1

| Item | Value |
| --- | --- |
| Active branch | `office/ai-core-provider-foundation-v1` |
| Base HEAD | `da1a8b8` — video personalization integration |
| Remote | Synced; **no commit/push until verification GO** |
| Do not merge / no PR unless asked | Yes |

**Done this session (Desktop):**
1. Mapped existing watch-signal + social events → personalization ingest
2. Best-effort wiring in server actions (flag-gated, never breaks primary flows)
3. In-memory dedupe (no DB migration)
4. Documented unwired events: hide / not_interested / report
5. Tests + docs

**NOT done:**
- No UI / feed ranking / production order change
- No hide/not_interested/report flows invented
- Ranking remains disabled

---

## Event mapping (existing → personalization)

| Source | Personalization event |
| --- | --- |
| `record_watch_signal` meaningful watch | `view_start`, `watch_progress` |
| `completed=true` | `completion` |
| `rewatch_count > 0` | `replay` |
| `skipped_early` | `skip` |
| watch engagement flags | `like` / `save` / `share` / `comment` / `follow_creator` |
| `recordViewAction` (auth) | `impression` |
| `toggleLikeAction` when liked | `like` |
| `toggleSaveAction` when saved | `save` |
| `recordShareAction` (auth) | `share` |
| `createCommentAction` | `comment` |

**Unwired (no organic video source):** `hide`, `not_interested`, `report`

Flag: `UMTUBA_AI_VIDEO_PERSONALIZATION` default OFF → no ingest.

## Migration status

No new migration.
