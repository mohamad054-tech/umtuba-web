# Surah Ash-Shams (91) — Uthmani text provenance

This folder holds **downloaded** Uthmani ayah text only. Agents and contributors
must never type, recall, or invent Quran text.

## Primary download

- **Source:** Quran.com API v4
- **URL:** https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=91
- **Script:** Uthmani (`text_uthmani`)
- **Stored as:** `ash-shams-91.uthmani.json`

## Secondary cross-check

- **Source:** Tanzil.net Uthmani (txt-2)
- **URL:** https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true
- **Method:** Extract lines `91|<n>|<text>` and compare whitespace-tokenized words
  to Quran.com for all 15 ayat.
- **Ayah 1 note:** Tanzil prefixes the basmala (4 tokens) before the first-ayah
  body on most surahs. After removing that prefix by suffix-match to Quran.com,
  the ayah body matched 100%. Ayat 2–15 matched exactly.

## Result

- Ayah count: **15** (both sources)
- Word-by-word cross-check: **100% match** (ayah bodies)
- `crossCheckWordByWord100Percent: true` in the JSON

## Reciter audio (stream only — not stored in repo)

- **Reciter:** Sheikh Mahmoud Khalil Al-Husary, murattal (مرتّل)
- **Also available:** Al-Mushaf Al-Muallim (`recitation_id` 12 on Quran.com) — not used in the UI; murattal is the default.
- **Discovery API:** `https://api.quran.com/api/v4/recitations/6/by_chapter/91`
- **Stream CDN pattern (Quranicaudio EveryAyah mirror):**
  `https://mirrors.quranicaudio.com/everyayah/Husary_128kbps/091{AAA}.mp3`
  Basmala: `…/bismillah.mp3` (same bytes as `001001.mp3`; distinct from `091001.mp3`)
- **Word timings:** `https://api.quran.com/api/v4/chapter_recitations/6/91?segments=true`
  Stored as metadata only in `ash-shams-91.husary-timings.json` (no audio binaries).
- **Terms:** Quran Foundation Developer Terms —
  `https://api-docs.quran.com/legal/developer-terms/`
  Allows displaying QF Content (including audio) inside an Application’s end-user experience; do not sell/sublicense/redistribute raw content as a dataset. Prefer streaming; do not commit audio files.
