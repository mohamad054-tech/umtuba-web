# DESKTOP_A2_PLAY_STORE_LISTING_ASSET_CHECK_V1

**DEVICE:** DESKTOP-A2  
**MODE:** INSPECT_ONLY  
**DATE:** 2026-08-15  
**TASK_ID:** DESKTOP_A2_PLAY_STORE_LISTING_ASSET_CHECK_V1  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web`  
**MOBILE (read-only):** `C:\Users\1\Desktop\umtuba\umtuba-mobile`

No assets created. No screenshots captured or fabricated. No Play upload. No product source modified. No commit/push. Nothing written to the Windows Desktop. `_port_extract` not touched. `PROJECT_STATE.md` / `CURRENT_TASK.md` / `CURSOR_REPORT.md` / `SESSION_HANDOFF.md` not overwritten.

Play Console Main Store Listing required visible assets: 512×512 icon, 1024×500 feature graphic, ≥2 phone screenshots.

---

## RETURN BLOCK

```
APP_ICON_512 = CURRENT / LOCAL_PACKAGE_APPROVED / NOT_UPLOADED
FEATURE_GRAPHIC_1024x500 = STALE / UNAPPROVED (construction-grid flatten; Play dimensions PASS)
PHONE_SCREENSHOTS = MISSING (no listing-ready files; QA PNGs exist but UNAPPROVED / Play-spec FAIL)
MISSING = phone screenshots (≥2) + approved non-grid feature graphic
PRODUCE_NEXT = (1) new 1024×500 24-bit PNG feature graphic from clean chevron, no construction grid; (2) ≥2 real phone screenshots, recommended 4 portrait ≥1080×1920, JPEG or 24-bit PNG no alpha, longest ≤ 2× shortest; do not reuse Fold6 QA 968×2376
PATHS = C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\play-assets\icon-512x512.png ; C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\play-assets\feature-graphic-1024x500.png ; phone listing files = NONE
```

---

## 1 — App icon 512×512

| Field | Value |
|-------|--------|
| Status | **CURRENT / LOCAL_PACKAGE_APPROVED** — not construction-grid; not Play-uploaded |
| Path | `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\play-assets\icon-512x512.png` |
| Measured pixels | **512 × 512** (System.Drawing; not filename-trusted) |
| Pixel format | `Format32bppArgb` (PNG + alpha) |
| File size | **78796** bytes (≤ 1024 KB) |
| SHA256 | `9e3d0315a33c6799de601dd34cd8bf8cc3a8d16f3bf75592baec2ceb7240b391` |
| Matches `checksums.sha256` | YES |
| Play hi-res spec | PASS (512×512, 32-bit PNG + alpha, ≤1024 KB) |
| Visual | Clean glowing blue chevron on solid black. **No construction grid.** |
| Provenance | Byte-identical to `C:\Users\1\Desktop\umtuba\umtuba-mobile\assets\images\android-icon-foreground.png` (same 512×512, 78796 B, same SHA256) |
| Uploaded to Play | NO (all prior packets) |

**Approval evidence (local package only):**

- `docs/ops/closeout/play-assets/ASSET_MANIFEST.md` — ICON_512 PASS; “byte-identical approved `android-icon-foreground.png` (chevron; **not** construction-grid `icon.png`)”
- `docs/ops/closeout/play-assets/MANIFEST.md` — re-measured; not uploaded
- `docs/ops/closeout/DESKTOP_A2_PLAY_ASSETS_FINAL_PRODUCTION_PACKAGE_V2.md` — “That is the approved clean mark”
- `docs/ops/closeout/DESKTOP_A2_GOOGLE_PLAY_REAL_ASSET_OUTPUT_V1.md` — same SHA / bytes
- `docs/ops/closeout/play-assets/OPERATOR_UPLOAD_CHECKLIST.txt` — upload this file; do **not** upload `icon.png`

**Do not use as Play hi-res icon:**

| Path | Measured | SHA256 | Why rejected |
|------|----------|--------|--------------|
| `C:\Users\1\Desktop\umtuba\umtuba-mobile\assets\images\icon.png` | 1024 × 1024, 393493 B, `Format24bppRgb` | `119462bb78eb240a65c869fc067ee599639b3cb5a41953f25c07b17d2a8c7e0f` | Construction-grid master. **STALE / UNAPPROVED** for Play. |
| `C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\store-listing\icon-source.png` | 1024 × 1024, 393493 B | same as `icon.png` | Same construction-grid bytes. |
| `C:\Users\1\Desktop\umtuba\umtuba-mobile-v5-build\assets\images\icon.png` | 393493 B | same as `icon.png` | Sibling copy of construction-grid master. |
| Mobile `release-artifacts/store-listing/icon-512x512.png` | — | — | **MISSING** |

Laptop (RETIRED) was not used.

---

## 2 — Feature graphic 1024×500

| Field | Value |
|-------|--------|
| Status | **STALE / UNAPPROVED** — construction-grid flatten visible. Dimensions/format PASS. Do **not** upload. |
| Path (web package) | `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\play-assets\feature-graphic-1024x500.png` |
| Measured pixels | **1024 × 500** |
| Pixel format | `Format24bppRgb` (24-bit PNG, no alpha) |
| File size | **86710** bytes |
| SHA256 | `bc380a16ca86a883530db0a0fc3efa669866a2f89866146f0ba988ac5ac6c1da` |
| Matches `checksums.sha256` | YES |
| Play dimension/format spec | PASS (1024×500, JPEG or 24-bit PNG no alpha) |
| Visual (this session) | Dark `#050510` canvas with a **light-blue square** containing the chevron **plus construction-grid** (concentric circles, dashed triangle, centerline, base line). Matches prior “construction-grid flatten.” |
| Uploaded to Play | NO |

**Sibling source (also STALE / UNAPPROVED):**

| Path | Measured | SHA256 | Notes |
|------|----------|--------|-------|
| `C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\store-listing\feature-graphic-1024x500.png` | 1024 × 500, 100586 B, `Format32bppArgb` | `9ff18e7c1dbf97bdafa45fe85153dbed8f2596630b26ce2a6698d35a7ca0e4d4` | Construction-grid source on `#050510`. Unused alpha. V2 flattened this into the web 24-bit copy. |

**Why not APPROVED despite prior “Play-spec PASS” packets:**

- V2 (`DESKTOP_A2_PLAY_ASSETS_FINAL_PRODUCTION_PACKAGE_V2.md`) records the mobile file as “Chevron (**construction-grid source**) on product `#050510`.”
- `DESKTOP_GOOGLE_PLAY_FINAL_PREP_V2.md` records the web file as “Flatten of existing chevron / **construction-grid** graphic onto `#050510`.”
- This session’s visual read confirms the grid is still visible on the web 24-bit file.
- Operator rule for this check: do not upload stale branding; construction-grid / placeholder = **STALE / UNAPPROVED**, not approved.

Prior packets that called the feature graphic “approved” meant **local Play-spec dimensions/format**, not final brand approval. Those packets are superseded for branding status by this inspect.

`umtuba-mobile-v5-build` has **no** `release-artifacts/store-listing/feature-graphic-1024x500.png`. Web worktree `DESKTOP-A2` has **no** play-assets PNGs. No other `feature-graphic-1024x500.png` found under `C:\Users\1\Desktop\umtuba` except the two paths above.

---

## 3 — Phone screenshots (Play listing)

| Field | Value |
|-------|--------|
| Status | **MISSING** as Google Play listing assets |
| Dedicated listing files | **NONE** — no `phone-01-*.png` / `phone-02-*.png` anywhere under `C:\Users\1\Desktop\umtuba` (name hunt). None in `play-assets/`. None in `umtuba-mobile/release-artifacts/store-listing/`. |
| `PHONE_SCREENSHOTS_READY` | **NO** (re-confirmed; matches V2 / Finish V1 / ASSET_MANIFEST / `PHONE_SCREENSHOT_CAPTURE_PLAN.txt` / `_inspect.json`) |
| Fabricated this session | NO |

### QA PNGs that exist but are NOT listing-ready

These are device-QA evidence only. They are **UNAPPROVED** for Play Main Store Listing.

| Location | Count | Typical measured size |
|----------|-------|------------------------|
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\a1-v5-device-qa\` | 41 PNG | **968 × 2376**, ratio **2.455**, `Format32bppArgb` |
| `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\a3-v6-device-qa\` | 38 PNG | **968 × 2376**, ratio **2.455**, `Format32bppArgb` |

Sample measurements (all aspect-fail):

| File | Pixels | Bytes | Why not Play-suitable |
|------|--------|-------|------------------------|
| `a1-v5-device-qa\03-watch-ui.png` | 968 × 2376 | 1170387 | Longest > 2× shortest; PNG + alpha; unedited status bar (WhatsApp); **Report** + **Delete** (v5, not Play v3) |
| `a1-v5-device-qa\30-native-discover.png` | 968 × 2376 | 93475 | Aspect fail; alpha; **Loading Discover…** + World/People/Hashtags **Soon** |
| `a1-v5-device-qa\32-native-create.png` | 968 × 2376 | 162054 | Aspect fail; alpha; **Terms checkbox** (v4/v5 list — capture plan forbids) |
| `a1-v5-device-qa\31-native-messages.png` | 968 × 2376 | 115245 | Aspect fail; alpha; unedited status bar; QA capture, not listing package |
| `a1-v5-device-qa\21-discover.png` / `22-messages.png` / `23-create.png` | 968 × 2376 | various | Chrome **web** (`umtuba.com`), not native Play APK UI |
| `a3-v6-device-qa\02-watch-loaded.png` etc. | 968 × 2376 | various | Same Fold6 aspect fail; v6 QA; versionCode 6 not Central-authorized |

Play official preview-asset rules (support.google.com/googleplay/android-developer/answer/9866151): JPEG or 24-bit PNG **no alpha**; each side 320–3840; **longest ≤ 2× shortest**. Fold6 QA 968×2376 fails the aspect rule and is 32-bit with alpha.

`GRAPHICS_STATUS.txt` (mobile store-listing) still says phone screenshots missing and lists a **v4** capture set (Watch with Report visible / Create Terms checkbox). Do not use that list.

---

## 4 — Hunt coverage (authoritative locations only)

Searched / opened (no Laptop RETIRED; no invented files):

- `docs/ops/closeout/play-assets/` — icon + feature present; screenshot PNGs absent; manifests + checksums + capture plan present
- `umtuba-mobile/release-artifacts/store-listing/` — feature + construction-grid `icon-source.png` + text packets; no phone screenshots
- `umtuba-mobile/assets/images/` — `android-icon-foreground.png` (clean 512), `icon.png` (grid 1024)
- `umtuba-mobile-v5-build/assets/images/icon.png` — same grid master; no store-listing feature graphic
- `C:\Users\1\Desktop\umtuba\**` name hits for `icon-512x512.png` / `feature-graphic-1024x500.png` / `phone-0*`
- Prior closeouts: V1 package, V2 package, Finish V1, Real Asset Output V1, Console closeout, A3 Play gate

No listing-ready phone screenshot files were found.

---

## 5 — MISSING + PRODUCE_NEXT

### MISSING (mandatory for Main Store Listing)

1. **Phone screenshots** — genuinely **MISSING** as Play listing assets (count 0 listing-ready files).
2. **Approved feature graphic** — a 1024×500 file **exists** but is **STALE / UNAPPROVED** (construction-grid). Treat as not uploadable. A replacement must be produced before upload.

Icon 512×512 does **not** need to be reproduced. Use the existing clean chevron file.

### PRODUCE_NEXT (do not do in this inspect)

**A. Feature graphic (1 file)**

- Count: 1
- Size: **1024 × 500**
- Format: JPEG or **24-bit PNG, no alpha**
- Content: clean UMTUBA chevron from `icon-512x512.png` / `android-icon-foreground.png` on product `#050510`
- Constraint: **no construction grid**, no drop-shadow grid plate, no placeholder template
- Do **not** upload `play-assets/feature-graphic-1024x500.png` or the mobile store-listing sibling as-is

**B. Phone screenshots (minimum 2; recommended 4)**

- Device class: **phone** (not Fold cover/inner 968×2376; that aspect fails Play)
- Size: each side 320–3840 px; **longest ≤ 2× shortest**; recommended portrait **≥1080 × 1920**
- Format: JPEG or 24-bit PNG **no alpha**
- Count: **minimum 2** to publish a listing; recommended 4 (Watch / Discover / Create / Messages)
- Capture from a **real device** running the binary that will be listed
  - Play binary last-known = **versionCode 3**
  - Current v5 Closed Testing rollout = **HOLD**; v5 is obsolete for final release
  - Do not present v5/v6 QA as the store listing
- Content constraints:
  - No youthful cartoon characters
  - No Play ranking badges
  - Edit notification bar (no carrier name; no WhatsApp / USB debug chrome)
  - No loading spinners / “Soon” placeholders as the only content
  - No Chrome web (`umtuba.com`) shots
  - Do **not** show Report / Block / Terms checkbox / in-app Delete unless those controls exist in the **listed** binary
  - Do not mock Safety UI
- Suggested drop names (after capture, later task): `phone-01-watch.png` … `phone-04-messages.png` under `docs/ops/closeout/play-assets/`
- Tablet 7-inch / 10-inch: produce **only** if Console marks those slots required

**C. Do not**

- Do not upload the construction-grid feature graphic
- Do not upload `icon.png` / `icon-source.png` as the 512 icon
- Do not crop/repack Fold6 QA 968×2376 as a silent “fix” in this inspect
- Do not Apply for production
- Do not upload AAB as part of listing-asset work

---

## 6 — Explicit non-actions

- Assets created: **NO**
- Screenshots captured: **NO**
- Play Console upload: **NO**
- Product source modified: **NO**
- Git commit / push: **NO**
- Windows Desktop writes: **NO**
- `_port_extract`: not touched
- AI handoff files overwritten: **NO**
