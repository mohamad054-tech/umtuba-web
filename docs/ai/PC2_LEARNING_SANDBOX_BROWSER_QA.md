# PC2 Learning Sandbox Browser QA

Local SHA `8f39277` only. Base `http://127.0.0.1:3456`. Not umtuba.com. Tokens redacted.

- Evidence JSON: `docs/ai/pc2-learning-sandbox-qa/evidence.json`
- Shots: `docs/ai/pc2-learning-sandbox-qa/shots/`
- Runner (QA-only): `docs/ai/pc2-learning-sandbox-qa/run-browser-qa.mjs`
- Full product write-up: `docs/ai/PC2_LEARNING_FULL_SANDBOX_PRODUCT_REVIEW.md`

## Run

- `next dev` on detached worktree `PC2-LEARNING-SANDBOX-QA-8f39277`
- Playwright Chrome, 127 pages, 7 clicks, 0 pageerrors
- Cursor IDE browser MCP did not keep a tab

## Shot index (Learning-critical)

| Shot | What it proves |
|---|---|
| `00_denied_no_token.png` | Anonymous deny + noindex (AR chrome on this machine) |
| `01_hub_en_1440.png` | `/enter` cookie missed after 127.0.0.1→localhost redirect |
| `02_public_home_nav.png` | Public Home has Learning product nav, **no** `/sandbox` href |
| `10_learning_home_en_1440.png` | 16-course fixture grid, no search |
| `11_student_en_1440.png` | Demo Student 01 · 5% · 1/12 · certificate=NONE |
| `12_instructor_en_1440.png` | 8 non-clickable instructor cards |
| `13_admin_en_1440.png` | Prospective cannot become ACTIVE; label-only admin |
| `14_partners_en_1440.png` | Coursera…MasterClass PROSPECTIVE / NOT AN UMTUBA PARTNER / UNKNOWN→DENY |
| `15_commercial_en_1440.png` | Synthetic shares; no Learning checkout |
| `21_original_platform_essentials.png` | Original readout, quiz prompts, 4×12×2 |
| `22_original_digital_safety.png` | Same structure, safety copy |
| `23_original_ai_fundamentals.png` | AI Tutor = sandbox owned only; no tutor UI |
| `24_partner_structured_thinking.png` | Synthetic partner hosted readout |
| `25_external_cloud_primer.png` | Continue with provider is a paragraph |
| `26_checkout_after_mock_clicks.png` | Mock result REFUND; REAL_PAYMENT=OFF |
| `20_click_nav_learning.png` | Nav Learning click |
| `30_learning_ar_1440.png` | RTL chrome, English course titles |
| `31_student_ar_1440.png` | English student body leak |
| `40_learning_en_360.png` / `40_hub_en_360.png` | Phone wrap + public bottom nav |
| `40_*_en_{360,390,430,768,1024,1440}.png` | Width sweep, overflowX=0 |
| `50_*_ar_{390,1440}.png` | AR phone + desktop |

## Probes

| Path | Status | Meaning |
|---|---|---|
| `/sandbox/business-preview/learning/enroll` | 404 | SANDBOX_REVIEW_TARGET_GAP |
| `.../lesson` `.../quiz` `.../ai-tutor` `.../certificate` | 404 | SANDBOX_REVIEW_TARGET_GAP |
| `/learning` | 200 | EXISTING_LEARNING_PRODUCT (`My Learning`, Loading learning…) — not reviewed this GO |
| `/robots.txt` | 200 | `Disallow: /sandbox` |
