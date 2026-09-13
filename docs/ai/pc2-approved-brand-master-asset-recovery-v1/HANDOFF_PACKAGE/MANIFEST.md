# PC2 Approved Brand Master Asset Recovery V1 — MANIFEST

```text
TASK_ID = PC2_UMTUBA_APPROVED_BRAND_MASTER_ASSET_RECOVERY_V1
MODE = SEARCH_VERIFY_PRESERVE_ONLY
FILES_COPIED_ONLY = YES
ORIGINALS_UNCHANGED = YES
PRODUCTION_TOUCHED = NO
DEPLOYED = NO
MASTER_VECTOR_FOUND = NO
APPROVED_BRAND_SOURCE_FILES_FOUND = NO
BRAND_BOARD_COMPOSITES_FOUND = YES
BRAND_BOARD_COPIED_INTO_PACKAGE = NO
REASON_NOT_COPIED = COMPOSITE_IS_NOT_A_PRODUCTION_MASTER_ASSET
```

This package contains **search records only**. No production files were modified. No logo was redrawn. No crop/extract was taken from the Brand Board. Binary composites were **not** copied into this folder so they cannot be mistaken for Production Master Assets.

## 1. Brand Board composites found (REFERENCE ONLY — NOT MASTER)

These three Desktop PNGs (2026-08-28) are composed Brand Boards. They are visual approval evidence, not source files.

| Original path | Size | Dimensions | Pixel format | SHA256 | Verdict |
|---|---|---|---|---|---|
| `C:\Users\Giga store\Desktop\بصمة ام طوبا.png` | 1,321,177 | 1402×1122 | 24bpp RGB (no alpha) | `CA91170182818DE7FE26B5343E270145D0A7D3A6FAC6C6DF961676A8BE76DCF1` | COMPOSITE / Brand Board 1. Motion storyboard + stacked lockup + swatches. **Not master.** |
| `C:\Users\Giga store\Desktop\بصمة ام طوبا 2.png` | 2,084,760 | 1536×1024 | 32bpp ARGB | `5D76258FE90E5E2A175CF081B20D327B496301DE00BFA9274877532B2778430C` | COMPOSITE / Brand Board 2. Lockup variants, motion frames, “New Logo Approved”. **Not master.** |
| `C:\Users\Giga store\Desktop\بصمة ام طوبا 3.png` | 2,540,006 | 1536×1024 | 32bpp ARGB | `FEE2E3CAD9E06F057743F816B13F7E5575F45D83A6506A83C742DA979CAB612F` | COMPOSITE / Brand Board 3. Labels filenames as if they exist on disk. **Those files were not found.** **Not master.** |

Tagline printed on the boards: **LEARN . CREATE . EARN** (not SHARE). Fonts labeled Poppins / Montserrat. Colors labeled Gold `#D4AF37`, Dark `#0A0B0D` / `#0A0A0A`, White `#FFFFFF`, Silver/Gray `#A7A7A7` / `#C0C0C0`.

### Filenames labeled on Brand Board 3 (NOT present on this PC)

| Labeled name | Labeled spec | Found on disk |
|---|---|---|
| `logo_main_vertical.png` | 4000×4000 transparent PNG stacked lockup | NO |
| `icon_only.png` | 2000×2000 transparent PNG U+orbit+star | NO |
| `app_icon_1024.png` | 1024×1024 gold U in rounded black tile | NO |
| `logo_horizontal.png` | 4000×1500 transparent PNG | NO |
| `end_tag_frame.png` | 1920×1080 | NO |
| `logo_dark.png` / `logo_light.png` | background variants | NO |
| `logo_mono_white.png` / `logo_mono_black.png` | mono variants | NO |
| `watermark.png` | 800×300 transparent PNG | NO |
| `logo_hero.jpg` | 3840×2160 | NO |
| `app_store_icon.png` | 1024×1024 | NO |
| `sidebar_icon.png` | 512×512 | NO |
| `UMTUBA_EndTag.mp4` | ~2s, 1920×1080, ~4.2 MB | NO |
| `UMTUBA_Signature.mp3` | ~3s, ~312 KB | NO |
| `umtuba_logo.svg` / any AI / EPS vector | vector master | NO |
| `color_palette.json` / `brand_guidelines.pdf` | tokens / PDF | NO |

## 2. Existing production assets inspected (WRONG IDENTITY — NOT COPIED)

These exist in the mobile/web trees. They are **not** the approved gold U + orbit + star identity. They were not copied into this package.

| Original path | Size | Dimensions | Verdict |
|---|---|---|---|
| `c:\Users\Giga store\Desktop\umtuba\umtuba-mobile\assets\images\icon.png` | 393,493 | 1024×1024 RGB (no alpha) | Old **blue chevron / inverted-V construction mark** with drafting lines. Not gold U. Not approved lockup. SHA256 `119462BB78EB240A65C869FC067EE599639B3CB5A41953F25C07B17D2A8C7E0F` |
| `...\assets\images\splash-icon.png` | 17,547 | 1024×1024 ARGB | Geometric grid / construction template on black. Not approved brand. |
| `...\assets\images\favicon.png` | 1,129 | 48×48 | Tiny old-mark favicon. Not approved brand. |
| `...\assets\images\android-icon-*.png` | 4–79 KB | 432–512 | Same old identity family. |
| `c:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1\app\favicon.ico` | 25,931 | ICO, 4 sizes, 16×16 first | Standard ICO header `00 00 01 00 04 00`. Not a gold-U master. Same default-style favicon in SOT / worktrees. |
| `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | tiny | vector | Next.js starter SVGs (e.g. file icon `#666`). **Not** UMTUBA logo. |

`lib/site/brand.ts` still uses tagline **Ideas Without Borders** and accent `#2563eb`. It is not the approved Black+Gold / LEARN · CREATE · EARN identity. **Not modified.**

## 3. Nearby files that are NOT the approved brand package

| Path | Why rejected |
|---|---|
| `C:\Users\Giga store\Downloads\AT_logo_3D-removebg-preview.png` | ABU TAIR gold globe/eagle logo. Different company. |
| `C:\Users\Giga store\Downloads\Logo-only-removebg-preview.png` | ABU TAIR symbol only. |
| `C:\Users\Giga store\Downloads\newLogoMarenaPNG-01.png` and Desktop `كلشس لمارينا\*` | Marena news branding. |
| Desktop `UMTUBA_15s.mp4`, `UMTUBA_15s_VOICE_V1.mp4`, `UMTUBA_OPENING_VIDEO\UMTUBA_OPENING_5s_V8_FEMALE.mp4` | Opening / launch video (~15s / 5s). Not `UMTUBA_EndTag.mp4` (~2s 1920×1080). |
| Desktop `UMTUBA_V7_Transition_Fix*.mp3`, `UMTUBA_V8_Clean_Single_Source_End.mp3`, `نَبض UMTUBA.mp3` | Music / transition / voice. Sizes 1.1–1.5 MB, not the labeled 312 KB signature sting. |
| Desktop `UMTUBA_AppStore_iPhone_6.5_Screenshots.zip` | App Store screenshots, not brand masters. |
| Adobe Premiere 23.0 profile + generic `.mogrt` logo templates | No UMTUBA Illustrator/After Effects source. |

## 4. Search coverage

Searched (read-only except this new docs package):

- Current repo `docs/`, `public/`, `app/`, `assets/`, `lib/site/brand.ts`
- Sibling folders under `c:\Users\Giga store\Desktop\umtuba\` (mobile trees, SOT, `_central_intake`, `D:\umtuba-central\FROM-PC2`)
- Desktop loose files; `UMTUBA_OPENING_VIDEO`; Arabic Desktop folders
- Downloads, Documents (including Adobe/Premiere), Pictures, Videos, OneDrive, `D:\DCIM`
- Exact Brand Board filenames via `-Filter`
- Git `ls-files` / add-history for svg/logo/favicon: only Next.js defaults + `app/favicon.ico`
- Repo grep: no `Brand Board`, `logo_main_vertical`, `UMTUBA_EndTag`, `#D4AF37`, `LEARN · CREATE · SHARE`

## 5. Files in this package

| Package path | Kind |
|---|---|
| `MANIFEST.md` | This file |
| *(no binaries)* | Composites and old production icons were intentionally not copied |

Originals were never moved or overwritten.
