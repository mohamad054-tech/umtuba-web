# PC2_FIND_IOS_APP_STORE_SCREENSHOTS_V1

DEVICE = PC2  
MODE = READ_ONLY inventory  
DATE = 2026-08-19  
TARGET = iPhone 6.5-inch App Store Connect: **1242×2688** or **1284×2778** portrait (or Apple-accepted landscape swaps)

## Result

```text
TASK_ID = PC2_FIND_IOS_APP_STORE_SCREENSHOTS_V1
WATCH_SCREENSHOT_PATH = NONE
CREATE_SCREENSHOT_PATH = NONE
PROFILE_OR_DISCOVER_SCREENSHOT_PATH = NONE
DIMENSIONS = NONE
READY_FOR_ASC_UPLOAD = NO
OTHER_VALID_SCREENSHOTS = NONE
BLOCKER = No existing UMTUBA iOS/App Store screenshots at 1242x2688 or 1284x2778 (or any standard iPhone screenshot size) on PC2. Mobile repo has a screenshot plan only; Windows cannot capture TestFlight UI.
```

## Method (read-only)

- Python 3.12 stdlib PNG IHDR + JPEG SOF parse (PIL absent; magick/identify absent; nothing installed).
- Scanned **1240** images under `Desktop\umtuba` (web + all sibling `umtuba-mobile*` worktrees + `_central_intake` + `P:\FROM-PC2`) excluding `node_modules` / `.git`.
- Scanned **889** further images under Pictures, Downloads, and Documents.
- Also listed: `umtuba-mobile\docs\app-store`, `.app-store` (auth only, no assets), Apple MobileSync Backup (empty), `Pictures\Screenshots`, no `fastlane` / `store-assets` image trees.

Exact 6.5-inch hits: **0**. Any standard iPhone screenshot size (1170×2532, 1125×2436, 1290×2796, 1320×2868, 1242×2208, etc.): **0**.

## What exists (not ASC-ready)

| Location | What it is | Sample measured size | Use for ASC? |
| --- | --- | --- | --- |
| `umtuba-mobile\docs\app-store\SCREENSHOT_MATRIX.md` | Plan only. Quote: no screenshots stored for submission. | n/a | NO |
| `umtuba-mobile\docs\app-store\OPERATOR_PACKET.md` | States **Device screenshots (none captured)** | n/a | NO |
| `umtuba-mobile\assets\images\icon.png` (and splash/android icons; same in mobile worktrees) | App icons | **1024×1024** | NO |
| `docs/ai/pc2-learning-sandbox-qa/shots/*.png` (+ copies in handoff / `P:\FROM-PC2`) | Web Learning sandbox QA | e.g. `40_learning_en_390.png` **390×4498**; `16_rights_en_1440.png` **1440×4076** | NO — web, not Watch/Create/Profile iOS |
| `worktrees/_store_visual_qa`, `_pc2_a1_v2_qa`, `_pc2_a3_v4_qa` | Web Store visual QA | e.g. `390_store.png` **390×844** | NO |
| `Pictures\Screenshots\` | Windows desktop window captures (Arabic “لقطة شاشة” names) | recent samples **732×696**, **1887×1079** | NO |
| `_pc2_wp_qa_user_findings` | Mentioned as leftover; **0** png/jpg/heic found | n/a | NO |

Prior iOS reports agree: `SCREENSHOT_PLAN_READY = YES`, `SCREENSHOTS_FABRICATED = NO`, Windows `screenshotr` = InvalidService (`PC2_BUILD7_CONNECTED_IPHONE_MAX_QA_REPORT.md`, `PC2_IPHONE_USB_TOOLING_READINESS.md`). `PC2_IOS_APP_STORE_FINAL_CLOSURE.md` still lists screenshots as owner/Central remaining.

## Closest iPhone screenshots

**NONE.** No file on the searched PC2 paths has iPhone screenshot pixel dimensions. Do not treat web 360/390 Store or Learning PNGs as stand-ins.

`READY_FOR_ASC_UPLOAD = NO` until real device (or Simulator) captures of Watch / Create / Profile-or-Discover exist at an ASC-accepted iPhone size.

## Safety

No resize, regenerate, move, delete, commit, push, or upload. `CURSOR_REPORT.md` not edited. Product source not edited.
