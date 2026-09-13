# DESKTOP-A2 — Jinn Operator / Server Execution Packet V1

| Field | Value |
| --- | --- |
| AGENT_ID | `DESKTOP-A2` |
| WAVE_ID | `DESKTOP_CLOSEOUT_WAVE_2_V1` |
| TASK_ID | `JINN_HOSTING_STORAGE_UUID_INGEST_GATE_CLOSEOUT_V1` |
| PACKET_ID | `DESKTOP_A2_JINN_OPERATOR_SERVER_EXECUTION_PACKET_V1` |
| Generated (local) | 2026-08-12 12:40:21 +03:00 |
| Parent report | `docs/ops/closeout/DESKTOP_A2_JINN_EXTERNAL_GATE_CLOSEOUT_V1.md` |
| Mode | **EXECUTION PACKET ONLY** — Desktop does **not** upload, ingest, provision storage, invent UUID/URL/object key, or authorize production |

## STOP condition

All of HOSTING, STORAGE, OBJECT_KEY, LESSON_UUID, UPLOAD_GO, INGEST_GO lack exact values/auth on Desktop and in Central Intake (`\\192.168.88.11\umtuba-multi-agent-desktop\Intake\Learning\JinnAI`).  
**Do not proceed past each gate until its REQUIRED_INPUT is filled and validated.**

Presence of Central COPY video bytes ≠ upload authorization.  
Recommendation of Rank #1 hosting ≠ hosting selection.  
Program UUID ≠ lesson UUID.

---

## Frozen Pilot #1 card (do not alter without new GO)

| Field | Value |
| --- | --- |
| Basename | `4. ChatBot with GPT API.mp4` |
| SHA256 | `f20b9a8e1350eb0b18bc873dbac99f7ec52ea615daa9712725a72f63ce3ef1a9` |
| Bytes | `122789361` |
| Desktop original (do not mutate) | `C:\Users\1\Desktop\UMTUBA_ASSETS\Generative AI Apps _ Building Intelligent Systems With Python\Generative AI Apps _ Building Intelligent Systems With Python\4. ChatBot with GPT API.mp4` |
| Central COPY (upload source) | `\\192.168.88.11\umtuba-multi-agent-desktop\Intake\Learning\JinnAI\JinnAI-Source-Videos\Generative AI Apps _ Building Intelligent Systems With Python\4. ChatBot with GPT API.mp4` |
| Lesson external_id | `JA-07:M02-L01` |
| Lesson title | Message Roles & Multi-turn Conversations |
| Course | JA-07 — LLM APIs Deep Dive (`slug: ja-07`) |
| Program UUID (receipt) | `27778f84-e7f0-4b0f-9578-5b68438e4a27` |
| Lesson UUID | **RESOLVE_LIVE — fill below; never invent** |
| Mapping | HIGH / EXACT_SOURCE_MATCH / not split |
| Media readiness | `PILOT_MEDIA_READY_AS_IS` (H.264/AAC MP4; no re-encode required) |
| Offline precheck (2026-08-12) | `NOT_READY` |

---

## Ordered operator / server checklist

### Step 0 — Safety freeze (always)

- [ ] No Desktop agent upload/ingest without this packet filled + Central GO  
- [ ] Do not reuse `post-videos` / `stories` / ads / world buckets  
- [ ] Do not use YouTube/Vimeo page URLs without Learning UI architecture change  
- [ ] Do not invent HTTPS URL, object key, or lesson UUID  
- [ ] Keep program draft/private; learner exposure OFF until production GOs  
- [ ] Prefer Central COPY for upload bytes; preserve Desktop originals  

### Step 1 — HOSTING (Central)

**Choose exactly one:**

| Choice | Meaning |
| --- | --- |
| **1A** | New Supabase Storage Learning-dedicated progressive-MP4 bucket |
| **1B** | Org object CDN (R2 / S3+CloudFront / Bunny or already-authorized equivalent) |

**Record:**

```
HOSTING_TARGET_SELECTED = YES/NO
HOSTING_CHOICE = 1A | 1B | OTHER:<name>
HOSTING_DECISION_ARTIFACT = <path or ticket id>
DECISION_ACTOR = <name>
DECISION_UTC = <timestamp>
```

### Step 2 — STORAGE (Central / infra)

Provision selected host with:

- HTTPS endpoint  
- Max object size ≥ 256 MiB (prefer 512)  
- Allow `video/mp4`  
- HTTP Range support  
- CORS for Learning app origin if cross-origin  
- Stable URL strategy (not 15-minute signed URL as the stored Learning `content.url`)

**Validate:**

```powershell
# After object exists (post-upload): confirm Range + MIME (operator host tooling)
# Expect Content-Type: video/mp4 and HTTP 206 on Range request
```

**Record:**

```
STORAGE_TARGET_CONFIGURED = YES/NO
STORAGE_PROVIDER = <...>
STORAGE_BUCKET_OR_CONTAINER = <...>
STORAGE_PROJECT_OR_ACCOUNT = <...>
RANGE_OK = YES/NO
MIME_OK = YES/NO
CORS_OK = YES/NO|N/A
```

### Step 3 — UPLOAD_GO (Central) — before any bytes leave COPY

**Required GO text fields:**

```
UPLOAD_AUTHORIZED = YES
PILOT = 4. ChatBot with GPT API.mp4
SHA256 = f20b9a8e1350eb0b18bc873dbac99f7ec52ea615daa9712725a72f63ce3ef1a9
SOURCE = <Central COPY path>
DESTINATION = <host from Step 1–2>
ACTOR = <...>
UTC = <...>
```

Without this artifact: **STOP — do not upload.**

### Step 4 — OBJECT_KEY + upload execute (only after Steps 1–3)

**Key contract:**

- Unguessable: random UUID + SHA256 short prefix (e.g. first 12 hex of pilot SHA)  
- Forbidden: human lesson titles / `ChatBot` / `JA-07` in public path  
- New key per version; do not overwrite bytes at same URL blindly  

**Upload source:** Central COPY only.  
**Integrity:** hosted object SHA256 must equal `f20b9a8e1350eb0b18bc873dbac99f7ec52ea615daa9712725a72f63ce3ef1a9`.

**Record:**

```
OBJECT_KEY = <exact key>
HTTPS_PROGRESSIVE_URL = <exact url ≤2048 chars>
HOSTED_SHA256 = <must match>
BROWSER_VIDEO_SEEK_SMOKE = PASS/FAIL
```

**Rollback:** delete orphan object under separate infra GO if smoke fails; Learning DB unchanged.

### Step 5 — LESSON_UUID (Server — read-only; parallel-safe with Steps 1–4)

```sql
SELECT l.id AS lesson_id, l.slug, l.status, l.external_id,
       c.slug AS course_slug, c.id AS course_id
FROM public.learning_lessons l
JOIN public.learning_sections s ON s.id = l.section_id
JOIN public.learning_courses c ON c.id = s.course_id
WHERE c.program_id = '27778f84-e7f0-4b0f-9578-5b68438e4a27'
  AND (
    l.external_id = 'JA-07:M02-L01'
    OR (c.slug = 'ja-07' AND l.slug = 'm02-l01')
  );
```

**Pass:** exactly **one** row. Prefer exporting a full 336-lesson UUID ledger for future pilots.

**Record:**

```
LESSON_UUID = <uuid>
LESSON_UUID_QUERY_ROW_COUNT = 1
LESSON_UUID_RESOLVED_UTC = <...>
RESOLVER = <server actor>
```

If 0 or >1 rows: **STOP — do not invent; server investigates.**

### Step 6 — INGEST_GO (Central) — separate from upload

**Required GO text fields:**

```
INGEST_AUTHORIZED = YES
LESSON_EXTERNAL_ID = JA-07:M02-L01
LESSON_UUID = <from Step 5>
MEDIA_URL = <from Step 4>
PROVIDER = file
STATUS_ON_CREATE = draft
ACTOR = <...>
UTC = <...>
```

### Step 7 — Draft ingest execute (only after Steps 4–6)

Create payload template (fill placeholders; do not invent):

```json
{
  "p_lesson_id": "<LESSON_UUID>",
  "p_block_type": "video",
  "p_content": {
    "url": "<HTTPS_PROGRESSIVE_URL>",
    "provider": "file",
    "caption": "Source: 4. ChatBot with GPT API.mp4 · SHA256 f20b9a8e1350eb0b18bc873dbac99f7ec52ea615daa9712725a72f63ce3ef1a9 · monolith L06 → JA-07:M02-L01"
  }
}
```

RPC: `create_learning_lesson_content_block`  
Initial status: **draft** (do not publish block unless separate GO).  
Record returned `block_id` immediately (create is not idempotent).

**Precheck gate (must be READY):** re-run offline evaluator with **live** evidence flags (not the frozen all-false hosting/auth fields):

```
VIDEO_FILE_PRESENT=true
SHA256_MATCH=true
VIDEO_BROWSER_COMPATIBLE=true
HOSTING_TARGET_SELECTED=true
STORAGE_TARGET_CONFIGURED=true
LESSON_MAPPING_CONFIRMED=true
LESSON_UUID_AVAILABLE=true
UPLOAD_AUTHORIZED=true
INGEST_AUTHORIZED=true
→ verdict READY
```

Module (A1 worktree): `lib/jinnMedia/videoPilotIngestPrecheck.ts`  
Vitest: `npx vitest run lib/jinnMedia/videoPilotIngestPrecheck.test.ts`

**Rollback:** `unpublish_learning_lesson_content_block` / `archive_learning_lesson_content_block` (idempotent). No ad-hoc DELETE SQL.

### Step 8 — FINAL_PRE_PUBLISH + SERVER_QA + TRANSLATION (production release path)

These block **academy production publish**, not necessarily draft pilot media bind:

| Gate | Server / owner action |
| --- | --- |
| FINAL_PRE_PUBLISH | Return allow-continuation verdict for `FINAL_PRE_PUBLISH_READINESS_GATE_V1` |
| SERVER_QA | Copy Post-Import QA JSON to Intake with checksum |
| TRANSLATION_PLATFORM | Computer 2 executes; clear `SOURCE_ONLY_WAITING_TRANSLATION_PLATFORM` |

Desktop publish pack must **not** self-authorize publish.

**Containment:** `AI-Applications-Bootcamp\_artifacts\JinnAI\jinn-ai-academy-publish-readiness-evidence-pack-20260808\containment_rollback_plan.md`

---

## Return artifact schema (Central → Desktop)

Place under Central Intake (suggested):

`Intake\Learning\JinnAI\Gates\PILOT1_GATE_CLEARANCE_V1.json`

```json
{
  "pilot": "JA-07:M02-L01",
  "video_basename": "4. ChatBot with GPT API.mp4",
  "sha256": "f20b9a8e1350eb0b18bc873dbac99f7ec52ea615daa9712725a72f63ce3ef1a9",
  "hosting_choice": null,
  "storage_configured": false,
  "object_key": null,
  "https_progressive_url": null,
  "lesson_uuid": null,
  "upload_authorized": false,
  "ingest_authorized": false,
  "final_pre_publish_ready": false,
  "server_qa_artifact": null,
  "translation_state": "SOURCE_ONLY_WAITING_TRANSLATION_PLATFORM",
  "notes": "Fill only with real values; null means gate still open."
}
```

---

## Fallbacks (same gates apply)

| Rank | Source | Target |
| --- | --- | --- |
| #2 | `3. Getting Started with GPT API.mp4` | `JA-07:M01-L03` |
| #3 | `2.1 Development Environment Setup.mp4` | `JA-01:M03-L01` |

Do not switch pilots without Central mapping GO.

---

## Explicit non-actions (Desktop agents)

- No upload / ingest / storage create  
- No Learning / Commerce product code changes for this packet  
- No `_port_extract` touch  
- No force-push / reset / discard  
- No invented UUID / URL / object key  
- No production publish  

---

## Packet status

```
PACKET_READY = YES
GATES_CLEARED = NONE
SAFE_FOR_FIRST_UPLOAD = NO
SAFE_FOR_INGEST = NO
AWAITING = [HOSTING, STORAGE, OBJECT_KEY, LESSON_UUID, UPLOAD_GO, INGEST_GO, FINAL_PRE_PUBLISH, SERVER_QA, TRANSLATION_PLATFORM]
```
