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
