# ASSET_MANIFEST — DESKTOP_A2_GOOGLE_PLAY_REAL_ASSET_OUTPUT_V1

**TASK_ID:** DESKTOP_A2_GOOGLE_PLAY_REAL_ASSET_OUTPUT_V1  
**WAVE_ID:** DESKTOP_RESULT_ONLY_ANDROID_V1  
**VERIFIED_AT:** 2026-08-14T20:56+03:00  
**PACKAGE_DIR:** `docs/ops/closeout/play-assets/`  
**UPLOADED_TO_PLAY:** NO  
**AAB_UPLOAD:** NO (forbidden)  
**SCREENSHOTS_FABRICATED:** NO  

Official refs: [Add preview assets](https://support.google.com/googleplay/android-developer/answer/9866151), [Play icon design specifications](https://developer.android.com/distribute/google-play/resources/icon-design-specifications).

---

## Ready for Play upload (local files)

| Key | File | Spec check | Result |
|-----|------|------------|--------|
| ICON_512 | `icon-512x512.png` | 512×512, 32-bit PNG + alpha, ≤1024 KB | **PASS** — 512×512, color_type 6, 78796 bytes, SHA256 `9e3d0315a33c6799de601dd34cd8bf8cc3a8d16f3bf75592baec2ceb7240b391` |
| FEATURE_GRAPHIC | `feature-graphic-1024x500.png` | 1024×500, JPEG or 24-bit PNG (no alpha) | **PASS** — 1024×500, color_type 2 (RGB), 86710 bytes, SHA256 `bc380a16ca86a883530db0a0fc3efa669866a2f89866146f0ba988ac5ac6c1da`, corner `#050510` |
| SHORT_DESCRIPTION | `PASTE_SHORT_DESCRIPTION.txt` | ≤80 characters | **PASS** — 66/80 |
| FULL_DESCRIPTION | `PASTE_FULL_DESCRIPTION.txt` | ≤4000 characters | **PASS** — 785/4000 |

Exact paths (web repo):

- `docs/ops/closeout/play-assets/icon-512x512.png`
- `docs/ops/closeout/play-assets/feature-graphic-1024x500.png`
- `docs/ops/closeout/play-assets/PASTE_SHORT_DESCRIPTION.txt`
- `docs/ops/closeout/play-assets/PASTE_FULL_DESCRIPTION.txt`

Provenance: V2 package (`DESKTOP_A2_PLAY_ASSETS_FINAL_PRODUCTION_PACKAGE_V2`). Icon = byte-identical approved `android-icon-foreground.png` (chevron; **not** construction-grid `icon.png`). Feature = approved chevron on `#050510`, flattened to 24-bit. Re-measured this session; bytes unchanged.

---

## Not ready (do not fabricate)

| Item | Status |
|------|--------|
| Phone screenshots (≥2) | **MISSING** — see `PHONE_SCREENSHOT_CAPTURE_PLAN.txt` |
| Tablet screenshots | **MISSING** — only if Console marks required |
| Promo video | **NONE** |

---

## FILES_READY_FOR_PLAY_UPLOAD

```
YES — icon-512x512.png
YES — feature-graphic-1024x500.png
YES — PASTE_SHORT_DESCRIPTION.txt
YES — PASTE_FULL_DESCRIPTION.txt
NO  — phone/tablet screenshots (not fabricated)
```

Operator may upload the four YES items above. Do **not** Apply for production. Do **not** upload AAB.
