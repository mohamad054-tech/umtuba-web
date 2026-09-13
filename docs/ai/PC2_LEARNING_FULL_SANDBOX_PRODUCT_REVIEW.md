# PC2 Learning Full Sandbox Product Review V1

- **TASK_ID** = `PC2_LEARNING_FULL_SANDBOX_PRODUCT_REVIEW_V1`
- **DEVICE** = PC2 (Windows)
- **DATE** = 2026-08-18
- **REVIEWER** = PC2 Learning Sandbox Product Validator
- **MODE** = READ-ONLY product QA · SYNTHETIC DATA ONLY
- **AUTHORIZED_SANDBOX_SOURCE_SHA** = `8f39277bbe902dd202023379bff2fc25161d3168`
- **TARGET** = `/sandbox/business-preview`
- **INSPECTED_VIA** = detached worktree `C:/Users/Giga store/Desktop/umtuba/worktrees/PC2-LEARNING-SANDBOX-QA-8f39277` (HEAD `8f39277b`, no local edits)
- **WEB_CHECKOUT** = `office/platform-translation-trunk-port-v1` at `b3c05d8` — this checkout does **not** contain sandbox routes; SHA was fetched from `origin/alpha-0.2` / `origin/central/full-business-sandbox-on-a085f667-v1`
- **DEVICE/BROWSER** = **EXERCISED** against local SHA `8f39277` at `http://127.0.0.1:3456` (not umtuba.com). Cursor IDE browser MCP could not hold a tab (`No browser tab available`). Chromium via Playwright `channel=chrome` completed 127 page records + 7 control clicks. Evidence: `docs/ai/pc2-learning-sandbox-qa/`.
- **SOURCE_CHANGED** = NO (shared web product source not patched)
- **DEPLOYED** = NO
- **REAL_PARTNERSHIPS** = 0
- **REAL_PAYMENT** = 0

## Method

1. Read `docs/ai/PROJECT_STATE.md` and updated `docs/ai/CURRENT_TASK.md` Allowed = Learning sandbox QA/docs only.
2. Confirmed SHA `8f39277` was missing from the local trunk checkout, then `git fetch --prune origin` (object became available as tip of `origin/alpha-0.2`).
3. Added a **detached** worktree at the SHA. Did not reset `b3c05d8` or any mobile checkout.
4. Read `docs/sandbox/BUSINESS_PREVIEW.md`, routes, `SandboxView` / `SandboxShell` / `SandboxCheckout`, all Learning fixtures, access gate, i18n, CSS, and containment tests.
5. Started local `next dev` on the detached SHA worktree (token in process env only; no `.env.local` copy). Turbopack rejected a `node_modules` junction; `npm ci` was run **inside the worktree only**.
6. Browser-exercised every sandbox Learning section, clicked safe synthetic controls, probed 404 slices, checked public `/` nav and `/robots.txt`, set locale cookie/header for ar/en/fr/es/de/pt, swept widths 360/390/430/768/1024/1440.
7. Opened `/learning` only as a **containment/existence probe** (HTTP 200 “My Learning / Loading learning…”). That is **EXISTING_LEARNING_PRODUCT**, not this sandbox GO. It was not student-completed.
8. Did **not** implement recommendations.

---

## BROWSER CORRECTION

Prior return was source-only. This section is the executable review.

### How the browser was run

| Item | Result |
|---|---|
| Local server | `next dev` SHA `8f39277` `http://127.0.0.1:3456` Ready |
| Production umtuba.com | Not used |
| Cursor IDE browser | Failed: tab created then immediately gone (`Browser view not found` / empty tab list) |
| Playwright | Succeeded with system Chrome. `pages=127` `clicks=7` `errors=[]` |
| Access | Process env `SANDBOX_BUSINESS_PREVIEW_TOKEN` (never written into evidence). Query grant works. `/enter` cookie failed when redirect host flipped `127.0.0.1` → `localhost` (shot `01_hub_en_1440`). |
| Anonymous deny | Recaptured `00_denied_no_token.png`: h1 private-sandbox copy, `robots=noindex, nofollow`, Sign in. Chrome Accept-Language on this machine rendered AR deny chrome. |

Companion index: `docs/ai/PC2_LEARNING_SANDBOX_BROWSER_QA.md`. Raw log: `docs/ai/pc2-learning-sandbox-qa/evidence.json`.

### Coverage (mandatory distinction)

```
SANDBOX_PRODUCT_COVERAGE = FIXTURE_GALLERY
FIXTURE_ONLY_SURFACES = Learning Home grid; Student dashboard (1 row); Instructor name list; Learning admin labels; Learning partners rights cards; Originals/partner/external course readouts; Commercial percent cards; Rights matrix
OPERABLE_SURFACES = Sandbox nav pills; Learning/Store/Partners hub cards; course "Open course" links; Store mock SUCCESS/FAILURE/REFUND buttons; Back to hub; Sign in (deny)
NON_OPERABLE_SURFACES = Student progress card (not a link); Instructor cards (not links); Admin cards (labels only); External "Continue with provider" (non-button paragraph); quiz prompts (no choices); exercise count (no runner); AI Tutor flag (no tutor); certificate enum (no document)
MISSING_EXECUTABLE_PRODUCT_SLICES = /sandbox/.../enroll, /lesson, /quiz, /ai-tutor, /certificate → HTTP 404
EXISTING_LEARNING_PRODUCT = /learning HTTP 200 title "My Learning | UMTUBA" h1 Learning, language switcher, "Loading learning…"; public Home nav includes Learning (not /sandbox). Source also has /learning/instructor/* and lesson/ai-tutor app routes. NOT linked from sandbox. NOT reviewed as a student/instructor this GO.
EXISTING_LEARNING_PRODUCT_GAP = unknown without a synthetic login into /learning (forbidden: real users). Do not treat sandbox 404s as proof those app routes are missing.
SANDBOX_REVIEW_TARGET_GAP = sandbox does not expose or deep-link the existing Learning product; it is a private fixture gallery with a few working nav/mock-pay controls.
```

**Do not ask Central to rebuild existing `/learning` because the private sandbox is a gallery.**

### Per-surface browser matrix

| Surface | IMPLEMENTED_IN_SOURCE | VISIBLE_IN_SANDBOX | BROWSER_EXERCISED | Verdict |
|---|---|---|---|---|
| Learning Home | YES | YES | YES | **PARTIAL** — 16 cards, no search (`hasSearch=false`), no rails. Shot `10_learning_home_en_1440`. |
| Student dashboard | YES | YES | YES | **PARTIAL** — “Demo Student 01 · dashboard”, `5% · 1/12 · certificate=NONE`. Card **not a link**. Shot `11_student_en_1440`. |
| Student E2E | NO in sandbox | NO | YES (stopped) | **MISSING_FROM_SANDBOX** — catalog click works; enroll/lesson/quiz/tutor/cert 404. |
| Course detail | YES | YES | YES | **PARTIAL** — Originals show 4 modules / 12 lessons / exercises 2, quiz **prompts only**. Shots `21`–`23`. |
| Lesson | App `/learning/lessons/[id]` exists | NO in sandbox | YES (probe) | **MISSING_FROM_SANDBOX** (404). Not classified as missing from UMTUBA Learning product. |
| Quiz | Fixture prompts | YES as text | YES | **PARTIAL** — no choices/submit. |
| Exercise | Fixture array | Count only | YES | **PARTIAL** — prompts not shown, no submit. |
| AI Tutor | App `/learning/lessons/[id]/ai-tutor` exists | Flag text only | YES (probe 404 in sandbox) | **MISSING_FROM_SANDBOX**. Flag: Originals “sandbox owned only”; external “DENIED”. |
| Certificate | Progress enum | YES enum | YES | **PARTIAL** — `certificate=NONE` on Student 01. No document. |
| Instructor profile | App instructor routes exist | NO | YES | **MISSING_FROM_SANDBOX**. |
| Instructor dashboard | YES list | YES | YES | **PARTIAL** — 8 non-clickable cards. Shot `12_instructor_en_1440`. |
| Course creation | App authoring exists | NO | YES | **MISSING_FROM_SANDBOX**. |
| Instructor analytics / revenue demo | Commercial percents only | Commercial page | YES | **MISSING_FROM_SANDBOX** as instructor wallet. `/commercial` is static labels. Shot `15_commercial_en_1440`. |
| Partner course model | YES synthetic | YES | YES | **PARTIAL** — hosted readout, not Coursera content. Shot `24`. |
| External course model | YES | YES | YES | **PARTIAL** — Continue paragraph, not a button. Shot `25_external_cloud_primer`. |
| Global partner preview | YES | YES | YES | **PRESENT** — Coursera…MasterClass each `PROSPECTIVE PARTNER` + `NOT AN UMTUBA PARTNER`; all rights `UNKNOWN → DENY`. Shot `14_partners_en_1440`. |
| Learning admin | YES labels | YES | YES | **PARTIAL** — no actions. Copy: cannot become ACTIVE. Shot `13_admin_en_1440`. |
| Paid Learning sandbox | NO | NO | YES (stopped) | **MISSING_FROM_SANDBOX**. |
| Mock payment | YES Store checkout | YES | YES | **WORKING** — clicked Simulate success / failure / refund; status “Mock result: {OUTCOME}. No financial transaction occurred.” No card fields. Shot `26_checkout_after_mock_clicks`. |
| Arabic / RTL | YES chrome catalog | YES | YES | **PARTIAL** / RTL chrome **WORKING** — `lang=ar` `dir=rtl` h1 `صندوق معاينة الأعمال`; nav Arabic; course titles + student body English. Shot `30_learning_ar_1440`, `31_student_ar_1440`. |
| English | YES | YES | YES | **PARTIAL** — chrome EN; raw `status=` enums. |
| FR / ES / DE / PT | Partial catalogs | YES chrome | YES | **PARTIAL** — h1 translated (fr/es/de/pt); bodies English. |
| Responsive | CSS 6 widths | YES | YES | **PARTIAL** — `overflowX=0` at 360/390/430/768/1024/1440 on hub, learning, student, instructor, admin, partners, essentials, checkout, commercial, rights. 14 pills wrap. Public Home/Live/Messages/Profile chrome appears at 360 (shot `40_hub_en_360`). |

### Clicks actually performed

| Control | Result | Evidence |
|---|---|---|
| Nav Learning | Landed `/sandbox/business-preview/learning` | `clicks[0]` + `20_click_nav_learning.png` |
| Card UMTUBA Platform Essentials | Landed course slug | `clicks[1]` + `21_original_platform_essentials.png` |
| Student progress card | Not a link | `isLink=false` |
| Instructor cards | Not links | `instructorLinkCount=0` |
| Simulate success | `Mock result: SUCCESS. No financial transaction occurred.` | `clicks[4]` |
| Simulate failure | `Mock result: FAILURE. No financial transaction occurred.` | `clicks[5]` |
| Simulate refund | `Mock result: REFUND. No financial transaction occurred.` | `clicks[6]` + `26_*.png` |

### Originals content quality (browser-read)

All three stay `UMTUBA ORIGINAL`, DRAFT, `publicCatalog=NO`, `owner=UMTUBA`, `certificate=UMTUBA`, `AI Tutor=sandbox owned only`, `enroll=HOSTED`, **4 modules · 12 lessons · exercises 2**. Copy is first-party safety/product education, not a partner catalog. Quizzes render as a single prompt string (e.g. “How is a platform administrator determined?”). No hero, author name, level, or certificate document on the page.

### Containment (browser)

| Check | Result | Evidence |
|---|---|---|
| meta robots | `noindex, nofollow` on sandbox pages | evidence.json |
| `/robots.txt` | `Disallow: /sandbox` | `containment.robots.disallowsSandbox=true` |
| Public Home nav | `sandboxHrefs=[]` `navHasSandbox=false` | `02_public_home_nav.png` — Home / World / **Learning** / Live / Messages (product Learning, not sandbox) |
| Prospective brands | Text-only, no logos, NOT AN UMTUBA PARTNER | `14_partners_en_1440.png` |

### Loc / responsive (browser)

- AR Learning Home: RTL, Arabic chrome, English course titles (`30_learning_ar_1440`).
- AR Student: h2 remains `Demo Student 01 · dashboard` (`31_student_ar_1440`) — ENGLISH_LEAKAGE confirmed.
- FR/ES/DE/PT Learning h1 translated; `hasSearch=false`; overflow 0.
- All recorded overflowX = 0. RAW_KEYS (`status=DRAFT`) visible at every width.

Classification key: **PRESENT** (surface exists as static/fixture UI) / **PARTIAL** (exists but incomplete vs GO) / **BROKEN** (exists but fails the intended control) / **MISSING** (not built) / **WORKING** (exercised live and functions — unused in this review).

---

## A. Learning Home

**Verdict: PARTIAL**

Route: `/sandbox/business-preview/learning` (`LearningHome` in `app/components/sandbox/SandboxView.tsx`).

| GO requirement | Classification | Evidence |
|---|---|---|
| Originals / Partner / External lanes | **MISSING** | Single flat `CourseList` of all 16 courses. No section headers, tabs, or visual hierarchy beyond a `KindBadge` on each card. |
| Categories | **MISSING** | No category chips, taxonomy, or filter state. |
| Search | **MISSING** | No search input, query param, or client filter. |
| Filters | **MISSING** | No kind / level / duration / price / rights filters. |
| Recommendations | **MISSING** | No recommend rail or ranking copy. |
| Continue Learning | **MISSING** | Continue lives only as a one-row student dashboard elsewhere; Home does not surface it. |
| Discovery / premium hierarchy | **PARTIAL** | Cards are readable (`sx-card`, 3-col at 1024+). Titles are demo-literal. No hero, no merchandising, no empty/loading/error (fixture is always full). |
| Differentiation Original vs Partner vs External | **PARTIAL** | Badge text `UMTUBA ORIGINAL` / `PARTNER COURSE` / `EXTERNAL COURSE` (underscores replaced). Partner/external titles also start with `Demo Partner Course` / `Demo External Course`. Easy to miss in a 16-card dump. |
| Exercise controls | **PARTIAL** | Card is a real `Link` to `learning/courses/{slug}` (`openCourse`). That is the only Home control. No other interactive control exists to exercise. |
| Mobile | **PRESENT (CSS only)** | `.sx-grid` is 1-col below 768. **Not viewport-tested.** |

Counts from fixtures (not invented): 3 UMTUBA Originals + 7 `PARTNER_COURSE` + 6 `EXTERNAL_COURSE` = **16** courses. All `publicCatalog: false`. Originals `DRAFT`. Partner `REVIEW` / `SANDBOX_ONLY`. External `DRAFT` / `NOT_PUBLIC`.

Hub Overview (`/sandbox/business-preview`) is a 3-tile jump (Learning / Store / Partners→`rights`), not a Learning Home.

---

## B. Student complete journey

**Verdict: STUDENT_DASHBOARD = PARTIAL · STUDENT_E2E = MISSING**

Synthetic people: 24 `Demo Student NN` (`lib/sandbox/fixtures/people.ts`). Dashboard hard-codes **Demo Student 01** (`FOCUS_STUDENT_ID`). Each student has **exactly one** generated progress row (`progress.ts`): percent = `((index * 17) % 91) + 5`. Student 01 → **5%** on UMTUBA Platform Essentials, `certificate=NONE`.

| Step | Classification | Evidence |
|---|---|---|
| Dashboard | **PARTIAL** | `/learning/student` title `Demo Student 01 · dashboard`. Shows percent, lessons completed/total, certificate enum. No enrolled list, bookmarks, completed lane, notes, history, quiz results, or exercises. Progress cards are **not links**. |
| Catalog → detail | **PARTIAL** | Catalog = Home list. Detail route exists (`learning/courses/{slug}`). |
| Enroll | **MISSING** | `enrollmentMode` printed as text (`HOSTED` / `SANDBOX_ENROLL` / `EXTERNAL_CONTINUE`). No enroll button, no enrollment record, no state change. |
| Lesson | **MISSING** | No sandbox lesson route. Lessons are `<ol>` of title + body + optional first quiz prompt. No player, no mark-complete. |
| Progress update | **MISSING** | Progress is a static fixture. Completing nothing changes it. |
| Quiz | **PARTIAL** | First `lesson.quiz[0].prompt` rendered as text. No choices, no submit, no score. |
| Exercise | **PARTIAL** | Fixture has exercise titles/prompts. Detail page prints **count only** (`exercises N`). Prompts are not shown. No submit. |
| AI Tutor | **MISSING** | Flag only: `AI Tutor= sandbox owned only | DENIED`. No tutor panel, no chat, no `/learning/lessons/.../ai-tutor` wiring inside the sandbox hub. |
| Completion | **MISSING** | No complete-course action. |
| Certificate | **PARTIAL** | Enum `NONE` / `SANDBOX_PREVIEW` on the progress row. No certificate document, share, or download. `SANDBOX_PREVIEW` only when `percent >= 90` **and** `kind === UMTUBA_ORIGINAL`. Student 01 never reaches it. |
| Bookmarks / notes / history / quiz results | **MISSING** | No UI. |

Public `/learning` at this SHA is login-gated (`app/learning/page.tsx` redirects guests). It was **not** exercised (would require a real user). It is **not** the sandbox student journey.

Broken / confusing UX (static review):

- Progress cards do not open the course.
- External “Continue with provider (sandbox)” is a **paragraph**, not a button (`CourseDetail`).
- No loading / error / empty student states (always one synthetic row).
- No feedback after any student action because almost no actions exist.

---

## C. UMTUBA Originals (do not publish)

Fixtures in `lib/sandbox/fixtures/originals.ts`. All three titles match the GO **exactly**. Tests in `catalog.test.ts` assert DRAFT, `publicCatalog=false`, 4 modules × 12 lessons.

| Course | Slug | Status | Modules / lessons | Exercises | AI | Cert owner |
|---|---|---|---|---|---|---|
| UMTUBA Platform Essentials | `umtuba-platform-essentials` | DRAFT | 4 / 12 | 2 | allowed (owned sandbox) | UMTUBA |
| Digital Safety & Privacy Fundamentals | `digital-safety-privacy-fundamentals` | DRAFT | 4 / 12 | 2 | allowed | UMTUBA |
| AI Fundamentals for Everyone | `ai-fundamentals-for-everyone` | DRAFT | 4 / 12 | 2 | allowed | UMTUBA |

| Product field | Classification | Evidence |
|---|---|---|
| Hero | **MISSING** | Title + shortDescription only. No artwork, no duration hero. |
| Author | **MISSING** | `instructorId` is set (`demo-instructor-07/04/01`). `getSandboxPerson` is unused in the view. No author name on the page. |
| Level | **MISSING** | No level field on `SandboxCourse`. |
| Duration | **PARTIAL** | Per-lesson `estimatedMinutes` shown next to each lesson. No course-level duration rollup. |
| Objectives | **MISSING** | Module `summary` only. No learning-objectives list. |
| Modules / lessons / resources | **PRESENT** | Modules and lessons render. Resource-kind lessons exist (e.g. `pe-m4-r1` First-session checklist) as another list item, not a downloadable resource. |
| Progress | **MISSING** on detail | No progress bar on the course page. |
| Quiz | **PARTIAL** | Prompt text only. |
| Exercise | **PARTIAL** | Count only; prompts live in fixture unused by the page. |
| Final assessment | **MISSING** | Last module is another quiz lesson, not a distinct final-assessment surface. |
| Completion / certificate | **MISSING** as product UI | See B. |
| “UMTUBA Original” visually obvious | **PARTIAL** | `KindBadge` + `kind: UMTUBA_ORIGINAL`. No dedicated lockup, ribbon, or separated Originals rail. Easy to lose in the 16-card grid. |
| Publish risk | **SAFE (fixture)** | `status=DRAFT`, `publishState=DRAFT`, `publicCatalog=false`. Containment tests assert sandbox fixtures are not imported into `app/learning/page.tsx`. **This review did not publish anything.** |

---

## D. Instructor

**Verdict: INSTRUCTOR_PROFILE / DASHBOARD / COURSE_CREATION / ANALYTICS / REVENUE_DEMO = MISSING or PARTIAL-as-list-only**

Route: `/sandbox/business-preview/learning/instructor`.

What exists: 8 `Demo Instructor — {specialty}` cards. `onboarding` is `ACTIVE` for the first five, `DRAFT` for the last three. Copy: “Onboarding DRAFT → ACTIVE is a label only. No fake legal verification.” Cards have **no `href`**. No profile page, no create/edit form, no metadata editor, no module/lesson/resource/quiz/exercise authoring, no pricing, no draft/preview/submit-review, no students list, no analytics, no revenue demo, no certificate issuance, no AI Tutor permission toggle.

Public `/learning/instructor/*` exists at the SHA as a **separate** authoring product (DB-backed). It was **not** exercised (would not be synthetic-sandbox-only and can imply real instructors).

### CAN_A_REAL_FUTURE_INSTRUCTOR_OPERATE_WITHOUT_UMTUBA_STAFF_MANUALLY_DOING_EVERYTHING?

**NO**

Exact blockers (sandbox product as shipped at `8f39277`):

1. No self-service course create/edit.
2. No module / lesson / quiz / exercise authoring UI.
3. No pricing or draft → preview → submit-review flow.
4. No review/publish UX (Originals stay DRAFT in fixtures; nothing an instructor can submit).
5. No student roster or analytics.
6. No instructor revenue demo surface (commercial percents are a separate static page, not an instructor wallet).
7. No AI Tutor permission control for the instructor.
8. Instructor “dashboard” is a non-clickable name list.

A future instructor cannot operate this sandbox as a product. Staff would have to author fixtures by hand.

---

## E. Global partner model

**Verdict: GLOBAL_PARTNER_PREVIEW = PRESENT (truthful) · PARTNER_COURSE_MODEL = PARTIAL · EXTERNAL_COURSE_MODEL = PARTIAL**

Planning targets (text-only, every one **PROSPECTIVE / NOT AN UMTUBA PARTNER**):

Coursera, Udemy, edX, DataCamp, FutureLearn, Skillshare, MasterClass.

Implementation: `PROSPECTIVE_LEARNING_PARTNERS` in `partners.ts`. `status: "PROSPECTIVE"`, `partnerClaim: "NOT AN UMTUBA PARTNER"`, `label: "PROSPECTIVE PARTNER"`, `logo: null`, `catalogImported: false`. Notes: “Not a contract, not ACTIVE, no logo, no imported catalog.” All rights `UNKNOWN` → effective **DENY**. Integrations all `PENDING CONTRACT` or `UNKNOWN`.

**Do not present these companies as existing partners.** This review does not.

| GO integration UX | Sandbox key | Classification |
|---|---|---|
| AFFILIATE | `AFFILIATE=PENDING CONTRACT` | **PRESENT** (label). No affiliate click-out UX except external-course paragraph. |
| EXTERNAL_ENROLLMENT | `EXTERNAL_ENROLLMENT=PENDING CONTRACT` | **PRESENT** (label). |
| CATALOG_API | `CATALOG_FEED=UNKNOWN` | **PARTIAL** — different name; no API/feed demo. |
| RESELLER | `RESELLER=UNKNOWN` | **PRESENT** (label). |
| LICENSED_HOSTED | `CONTENT_LICENSE=PENDING CONTRACT` | **PARTIAL** — different name. Hosted partner **courses** are synthetic Demo Provider Atlas/Helix, not licensed Coursera/etc. content. |
| PARTNER_CERTIFICATE | `CERTIFICATE_OWNER=UNKNOWN` | **PARTIAL** — flag name differs. |
| REVENUE_SHARE | not an integration key | **PARTIAL** — shown on `/commercial` as `PARTNER_COURSE` 20/80 example, marked “Not a contract.” |

| GO ownership | In sandbox? |
|---|---|
| CONTENT_OWNER | Course field `contentOwner` (UMTUBA / `demo-provider-*`). **PRESENT** on course detail. Not on prospective-brand cards. |
| PAYMENT_OWNER | **MISSING** as a named flag. |
| ENROLLMENT_OWNER | Approximated by `enrollmentMode` only. **PARTIAL**. |
| PROGRESS_OWNER | **MISSING**. |
| CERTIFICATE_OWNER | Course field + partner `CERTIFICATE_RIGHTS=UNKNOWN→DENY`. **PRESENT** / deny-by-default. |
| AI_USAGE_ALLOWED | Rights matrix + `course.aiTutorAllowed`. Partner/external courses **false**. Prospective brands **UNKNOWN→DENY**. **PRESENT**. |

False-partnership scan:

- No logo import.
- No copied third-party lesson titles (test forbids “Complete Python Bootcamp” / “Machine Learning by Andrew”).
- Partner courses titled `Demo Partner Course — …` with `Demo Provider Atlas/Helix`.
- Prospective brand names appear **only** on Partners / Rights pages with PROSPECTIVE badges.
- **No finding** of “UMTUBA owns Coursera content” or “UMTUBA issues Coursera certificates.”
- **No finding** of AI rights granted without a contract (`UNKNOWN=DENY`).

---

## F. Learning Admin

**Verdict: PARTIAL**

Route: `/sandbox/business-preview/learning/admin`.

Shows 5 `SYNTHETIC_LEARNING_PROVIDERS` (Atlas REVIEW, Helix REVIEW, Nimbus DRAFT, Harbor DRAFT, UMTUBA Originals DRAFT) and all 16 courses with `kind · status` plus “takedown/suspension are preview labels only.”

No students table, no instructor admin, no enrollment admin, no certificate admin, no rights editor, no AI permission editor, no revenue-share editor, no review queue actions, no takedown/suspend controls.

| GO lifecycle | In `LIFECYCLE_STATUSES` | Used on fixtures |
|---|---|---|
| DRAFT | yes | Originals, externals, some providers |
| LEGAL_REVIEW | **MISSING** | — |
| APPROVED | **MISSING** | — |
| INTEGRATION | **MISSING** | — |
| QA | **MISSING** | — |
| ACTIVE | yes in type union | **Not used** on prospective partners or courses. Instructors use a separate `onboarding: ACTIVE` label (people, not companies). |
| SUSPENDED | yes | unused in Learning fixtures |
| TERMINATED | yes | unused |
| REVIEW (extra) | yes | Partner courses + Atlas/Helix |

Copy: “Prospective partner records stay PROSPECTIVE. They cannot become ACTIVE here.” Types lock `ProspectivePartner.status` to `"PROSPECTIVE"`. `assertProspectiveNeverActive` exists.

**ACTIVE protection: HOLD.** Prospective companies cannot accidentally appear ACTIVE in this sandbox.

---

## G. Commercial sandbox

**Verdict: PAID_LEARNING_SANDBOX = MISSING · MOCK_PAYMENT = PRESENT (Store-only, not Learning enroll)**

GO SKUs vs `/commercial` (`SANDBOX_COMMERCIAL_MODEL.learning`):

| GO SKU | Sandbox row | Classification |
|---|---|---|
| FREE_COURSE | `UMTUBA_ORIGINAL` `listPriceMinor: 0` | **PARTIAL** — free implied, no enroll CTA. |
| PAID_UMTUBA_COURSE | none | **MISSING** |
| PAID_INSTRUCTOR_COURSE | none | **MISSING** |
| PARTNER_RESELL_COURSE | `PARTNER_COURSE` $49.00 / 20–80 | **PARTIAL** — economics label only. |
| EXTERNAL_AFFILIATE_COURSE | `EXTERNAL_COURSE` null / n/a | **PARTIAL** — “No hosted checkout in this preview.” |

There is **no** Learning path: enroll → checkout → mock pay success → enrollment, or mock decline → recovery.

Mock adapter **does** exist on **Store** `/store/checkout` (`SandboxCheckout.tsx`): buttons Simulate success / failure / refund; `PAYMENT_MODE=SANDBOX · REAL_PAYMENT=OFF`; “No card number is requested or stored”; result “Mock result: {OUTCOME}. No financial transaction occurred.” Client `useState` only. **Not browser-clicked in this review**, so not WORKING.

Orders fixture includes SUCCESS / FAILURE / REFUND / PENDING. `realPayment: false` on every order. Payouts `enabled: false`.

Demo does **not** look like a live card transaction in source (no card fields). It also does **not** complete a Learning enrollment.

---

## H. AI Tutor rights

**Verdict: AI_TUTOR = MISSING (as a product) · rights model PARTIAL**

| Case | Fixture | UI |
|---|---|---|
| UMTUBA Original allowed | `aiTutorAllowed: true`; originals rights page forces `AI_USAGE_ALLOWED: ALLOW` | Text “sandbox owned only”. **No tutor.** |
| Partner AI=false blocked | All 7 partner + 6 external `aiTutorAllowed: false`; prospective `AI_USAGE=UNKNOWN→DENY` | Text “DENIED”. **No blocked-tutor interstitial.** |
| Partner AI=true after contract | **MISSING** | No fixture with partner `AI_USAGE_ALLOWED=ALLOW`. Architecture *can* permit (`emptyRights` override + `denyUnknown`), but the third case is not demonstrated. |

`CATALOG_VISIBILITY != AI_PERMISSION`:

- Prospective brands: both catalog-display and AI are UNKNOWN/DENY. Their **names** still appear on the Partners/Rights **planning** pages (intentional preview, not a public catalog).
- Sandbox Learning Home lists synthetic partner **courses** (demo providers) while those courses keep AI denied. That is a useful split, but it is **not** the Coursera-visible / AI-blocked case.
- Public catalog is not merchandised (`publicCatalog=false`).

Public `app/learning/lessons/[lessonId]/ai-tutor/page.tsx` exists at the SHA and was **not** exercised (not the sandbox hub; would require a real lesson id).

---

## I. Certificates

**Verdict: CERTIFICATE = PARTIAL (truthful labels, no product)**

| Issuer case | What exists | Truthfulness |
|---|---|---|
| Original | `certificateOwner: "UMTUBA"`; progress may show `SANDBOX_PREVIEW` if percent≥90 | Truthful **if** shown as sandbox preview. No document UI. |
| Instructor | **MISSING** | No instructor-issued certificate surface. |
| Partner | `certificateOwner: demo-provider-*`; partner `CERTIFICATE_RIGHTS` DENY | Does **not** claim UMTUBA issues a partner cert. |
| External | same as partner + no modules | Continue-with-provider only. |
| Coursera / Udemy / edX / … | names only on prospective list; `CERTIFICATE_RIGHTS=UNKNOWN→DENY` | **Does not imply UMTUBA issues those certificates.** |

---

## J. Loc / responsive

**Verdict: ARABIC = PARTIAL · RTL = PRESENT (code) · ENGLISH = PARTIAL · FR/ES/DE/PT = PARTIAL · RESPONSIVE = PRESENT (CSS only)**

`SandboxShell` sets `dir={sandboxDirection(locale)}` and `lang={locale}`. Arabic catalog in `lib/sandbox/i18n.ts` translates chrome (title, banner, nav, badges, openCourse, continueProvider, simulate buttons).

**DEVICE/BROWSER not exercised.** Viewport overflow, text overlap, icon mirroring, and touch-target size are **not** visually confirmed. CSS declares 360 / 390 / 430 / 768 / 1024 / 1440 (`sandbox.css`). Containment test only asserts those numbers appear in the CSS file.

| Locale | Chrome | Body (Home, student, instructor, admin, course, commercial, rights, cart, orders) | Leakage |
|---|---|---|---|
| EN | translated | Mostly hardcoded English | Footer `Sections: N. Public nav must not link here.` English. Raw `status=` / rights enums. |
| AR | translated | **Hardcoded English** in almost every section body (`StudentDash`, `InstructorDash`, `LearningAdmin`, `CourseDetail` metadata, commercial notes, course titles/lesson bodies) | **ENGLISH_LEAKAGE** high. RTL chrome likely OK (`dir=rtl`, `ps-5` logical). **Not screenshot-verified.** |
| FR / ES / DE / PT | 8–10 keys overridden; remainder `...en` | Same English bodies + English leftover chrome keys (`learningStudent`, `storeCart`, `simulateSuccess`, …) | **ENGLISH_LEAKAGE** + incomplete catalogs. |
| RAW_KEYS | Kind badges, `status=`, `publish=`, rights flag names, integration `MODE=value` | — | Present by design for PO review; not end-user ready. |
| Locale switcher in sandbox | **MISSING** | Locale comes from cookie / Accept-Language / header. No in-hub language control. | — |

Surfaces listed in GO (hub, learning, student, instructor, admin, partners, course detail, commercial, rights, plus store siblings): chrome wraps via `flex-wrap`. 14 nav pills at 360 will stack; **OVERFLOW / TOUCH_TARGETS unverified**. No directional back-arrow icon (text “Back to hub”).

---

## Findings

Severity: **P0** safety / false partnership / real payment / rights grant without contract. **P1** core journey missing or unusable. **P2** incomplete model vs GO. **P3** polish / loc / responsive.

### P0 — none opened

Safety holds in source: no card fields, `REAL_PAYMENT=OFF`, prospective brands cannot be ACTIVE, AI UNKNOWN=DENY, no partner logos/imports, Originals unpublished, certificates do not claim Coursera/etc.

### P1

#### LPR-P1-001

| Field | Value |
|---|---|
| ID | LPR-P1-001 |
| SEVERITY | P1 |
| SURFACE | Learning Home + Student E2E |
| ROLE | Student (synthetic) |
| STEPS | Open `/sandbox/business-preview/learning`. Attempt Catalog → detail → enroll → lesson → quiz → exercise → AI Tutor → completion → certificate. |
| EXPECTED | Operable student journey with feedback at each step. |
| ACTUAL | Home is a static 16-card list. Detail is read-only. Enroll / lesson player / quiz submit / exercise submit / tutor / completion are not built. Certificate is an enum on a static progress row. |
| EVIDENCE | `SandboxView.tsx` `LearningHome`, `CourseDetail`, `StudentDash`; `paths.ts` has no lesson/quiz/tutor/certificate sections. DEVICE/BROWSER not run; absence is structural. |
| RECOMMENDED_CENTRAL_ACTION | Authorize a Learning sandbox **product** slice (not more fixture cards): enroll state, lesson player, quiz/exercise submit, completion, sandbox certificate preview. Do not publish Originals. |

#### LPR-P1-002

| Field | Value |
|---|---|
| ID | LPR-P1-002 |
| SEVERITY | P1 |
| SURFACE | Instructor sandbox |
| ROLE | Instructor (synthetic) |
| STEPS | Open `/learning/instructor`. Attempt create/edit, modules, quiz, pricing, preview, submit review, students, analytics, revenue DEMO. |
| EXPECTED | Self-service instructor loop. |
| ACTUAL | Non-clickable list of 8 demo names + onboarding labels. |
| EVIDENCE | `InstructorDash` in `SandboxView.tsx`. Cards have no `href`. |
| RECOMMENDED_CENTRAL_ACTION | Decide whether the private hub is a **PO fixture gallery** or an **instructor product**. If the latter, add authoring + review + analytics + labeled revenue DEMO. If the former, do not ask “can an instructor operate.” |

#### LPR-P1-003

| Field | Value |
|---|---|
| ID | LPR-P1-003 |
| SEVERITY | P1 |
| SURFACE | Paid Learning sandbox |
| ROLE | Student / commercial |
| STEPS | Enroll FREE / PAID_UMTUBA / PAID_INSTRUCTOR / PARTNER_RESELL / EXTERNAL_AFFILIATE → checkout → mock success and mock decline. |
| EXPECTED | Five Learning SKUs and a Learning checkout that is obviously fake. |
| ACTUAL | `/commercial` has 3 Learning kinds (Original / Partner / External). Mock pay lives on **Store** checkout only. No Learning enrollment after mock success. |
| EVIDENCE | `commercial.ts`; `SandboxCheckout.tsx` used only under `store/checkout`. |
| RECOMMENDED_CENTRAL_ACTION | Add Learning-only mock checkout **or** explicitly scope mock pay to Store so future GOs do not treat Store buttons as Learning commercial readiness. |

### P2

#### LPR-P2-001

| Field | Value |
|---|---|
| ID | LPR-P2-001 |
| SEVERITY | P2 |
| SURFACE | Learning Home |
| ROLE | Student / visitor (sandbox) |
| STEPS | Look for Originals / Partner / External rails, search, filters, recommendations, Continue Learning. |
| EXPECTED | Discoverable, hierarchical, premium Home. |
| ACTUAL | Flat grid. No search/filters/recs/continue. |
| EVIDENCE | `LearningHome` renders only `<CourseList courses={SANDBOX_COURSES} />`. |
| RECOMMENDED_CENTRAL_ACTION | Add lanes + search/filter on fixture data only. Keep prospective brand names off Home. |

#### LPR-P2-002

| Field | Value |
|---|---|
| ID | LPR-P2-002 |
| SEVERITY | P2 |
| SURFACE | Course detail (Originals) |
| ROLE | Student |
| STEPS | Open each of the three Original slugs. |
| EXPECTED | Hero, author, level, duration, objectives, resources, progress, interactive quiz/exercise, final assessment, certificate, obvious Original lockup. |
| ACTUAL | Title, blurb, kind badge, owner/cert/AI/enroll text, module list. Author/level/objectives/hero/progress/certificate UI missing. Exercises count-only. Quiz prompt-only. |
| EVIDENCE | `CourseDetail`; `originals.ts` has unused `instructorId` and `exercises[]`. |
| RECOMMENDED_CENTRAL_ACTION | Render fixture fields that already exist (author via `getSandboxPerson`, exercise prompts, duration sum) before inventing new content. Still do not publish. |

#### LPR-P2-003

| Field | Value |
|---|---|
| ID | LPR-P2-003 |
| SEVERITY | P2 |
| SURFACE | Learning Admin + types |
| ROLE | Admin |
| STEPS | Walk DRAFT → LEGAL_REVIEW → APPROVED → INTEGRATION → QA → ACTIVE → SUSPENDED → TERMINATED. |
| EXPECTED | Full lifecycle with actions; ACTIVE protected. |
| ACTUAL | ACTIVE protection holds. Lifecycle enum is DRAFT/REVIEW/ACTIVE/SUSPENDED/TERMINATED. No LEGAL_REVIEW / APPROVED / INTEGRATION / QA. No admin actions. |
| EVIDENCE | `types.ts` `LIFECYCLE_STATUSES`; `LearningAdmin`. |
| RECOMMENDED_CENTRAL_ACTION | Extend the label model to the GO chain **as labels only**, plus disabled action buttons that cannot flip a prospective brand to ACTIVE. |

#### LPR-P2-004

| Field | Value |
|---|---|
| ID | LPR-P2-004 |
| SEVERITY | P2 |
| SURFACE | Rights / partners |
| ROLE | Admin / PO |
| STEPS | Confirm CONTENT/PAYMENT/ENROLLMENT/PROGRESS/CERTIFICATE_OWNER + AI; confirm CATALOG_API, LICENSED_HOSTED, REVENUE_SHARE UX; confirm partner AI=true architecture case. |
| EXPECTED | Explicit owners; all integration modes; three AI cases. |
| ACTUAL | CONTENT + CERTIFICATE + AI present. PAYMENT_OWNER and PROGRESS_OWNER missing. Integration names differ. Partner AI=true case not fixtured. |
| EVIDENCE | `types.ts` `RIGHTS_FLAGS` / `IntegrationMode`; `partners.ts`; no partner with `AI_USAGE_ALLOWED: ALLOW`. |
| RECOMMENDED_CENTRAL_ACTION | Add a **synthetic** provider (not Coursera) with `AI_USAGE_ALLOWED=ALLOW` after a fake contract, and a paired provider with AI=false, both still `NOT AN UMTUBA PARTNER` if they use real brand names — or keep brand names only on the prospective list. |

#### LPR-P2-005

| Field | Value |
|---|---|
| ID | LPR-P2-005 |
| SEVERITY | P2 |
| SURFACE | Student dashboard |
| ROLE | Student |
| STEPS | Open `/learning/student`. Look for enrolled, continue, bookmarks, completed, certificates, quiz results, exercises, notes, history. |
| EXPECTED | Full student library. |
| ACTUAL | One 5% row for Demo Student 01. Cards not linked. Other students unused in UI. |
| EVIDENCE | `StudentDash` + `progressForStudent(FOCUS_STUDENT_ID)`. |
| RECOMMENDED_CENTRAL_ACTION | Render the existing 24-row fixture as a library; link cards to course slugs; add empty/completed/certificate preview sections from the same fixture. |

#### LPR-P2-006

| Field | Value |
|---|---|
| ID | LPR-P2-006 |
| SEVERITY | P2 |
| SURFACE | External course detail |
| ROLE | Student |
| STEPS | Open any `demo-external-*` course. Activate “Continue with provider”. |
| EXPECTED | Sandbox control that does not leave into a real partner catalog. |
| ACTUAL | Non-interactive paragraph. `modules: []`. |
| EVIDENCE | `CourseDetail` `EXTERNAL_COURSE` branch; `SANDBOX_EXTERNAL_COURSES`. |
| RECOMMENDED_CENTRAL_ACTION | Make a disabled or in-sandbox button that sets a local “referred (sandbox)” state. Do not deep-link real provider sites. |

### P3

#### LPR-P3-001

| Field | Value |
|---|---|
| ID | LPR-P3-001 |
| SEVERITY | P3 |
| SURFACE | All sandbox bodies |
| ROLE | All |
| STEPS | Set locale AR (and spot-check fr/es/de/pt). Walk A–I surfaces. |
| EXPECTED | AR RTL full; EN full; fr/es/de/pt spot-check clean. |
| ACTUAL | Chrome AR is translated; section bodies are English. fr/es/de/pt catalogs inherit most EN keys. No in-hub locale switcher. |
| EVIDENCE | Browser: `30_learning_ar_1440.png` (RTL chrome, English titles); `31_student_ar_1440.png` h2 still `Demo Student 01 · dashboard`. fr/es/de/pt h1 translated in evidence.loc. |
| RECOMMENDED_CENTRAL_ACTION | Move section bodies onto `sandboxT` keys; complete fr/es/de/pt; add a sandbox-only locale control. |

#### LPR-P3-002

| Field | Value |
|---|---|
| ID | LPR-P3-002 |
| SEVERITY | P3 |
| SURFACE | Responsive chrome |
| ROLE | All |
| STEPS | 360 / 390 / 430 / 768 / 1024 / 1440 on listed surfaces. |
| EXPECTED | No overflow, overlap, broken controls; adequate touch targets. |
| ACTUAL | `overflowX=0` at 360/390/430/768/1024/1440. 14 pills wrap. Public Home/Live/Messages/Profile chrome overlays the 360 hub. |
| EVIDENCE | Shots `40_*_en_{width}.png`, `50_*_ar_390.png`; evidence.overflows all 0. |
| RECOMMENDED_CENTRAL_ACTION | Sandbox-only chrome at phone widths (hide public bottom nav on `/sandbox`). |

#### LPR-P3-003

| Field | Value |
|---|---|
| ID | LPR-P3-003 |
| SEVERITY | P3 |
| SURFACE | Hub |
| ROLE | PO |
| STEPS | From Overview, open the Partners tile. |
| EXPECTED | Learning partners preview. |
| ACTUAL | Tile href is `rights` (learning + commerce). Learning-only page exists at `learning/partners` via nav. |
| EVIDENCE | `Hub` card `href={sandboxHref("rights")}`. |
| RECOMMENDED_CENTRAL_ACTION | Point the Learning-adjacent tile to `learning/partners` or label it “All rights”. |

---

## UX improvements (not implemented)

1. Separate Originals / Partner (synthetic providers) / External rails on Home.
2. Link student progress cards to course slugs; show Continue on Home from Student 01’s 5% row.
3. Render author, duration sum, exercise prompts, and a sandbox certificate preview card from data already in fixtures.
4. Replace raw `status=` strings with badges; keep DEMO / SANDBOX / NOT LIVE chrome.
5. Instructor: even a read-only “course I teach” list would be more honest than a name dump.
6. Admin: disabled lifecycle buttons that cannot activate prospective brands.
7. Complete AR body strings; do not ship fr/es/de/pt as English clones.
8. Learning mock checkout if commercial Learning is in scope; otherwise rename Store checkout so it cannot be mistaken for course payment.

---

## Missing product surfaces

**SANDBOX_REVIEW_TARGET_GAP** (404 or non-operable inside `/sandbox/business-preview`):

- Learning search, filters, categories, recommendations, Continue rail
- Student enroll / lesson player / quiz runner / exercise runner / AI Tutor / completion / certificate document
- Instructor profile / create / analytics / revenue DEMO
- Admin actions + GO lifecycle states
- Paid Learning SKUs + Learning mock checkout
- Partner AI=true demonstration case

**EXISTING_LEARNING_PRODUCT** (do not rebuild merely because sandbox hid them): `/learning` (200, loading shell), `/learning/instructor/*`, `/learning/lessons/[lessonId]`, `/learning/lessons/[lessonId]/ai-tutor` exist at this SHA and are **not linked** from the sandbox hub.

---

## Safety hold (what is already correct)

- Access: anonymous denied; `STORE_DEMO_PREVIEW=1` is not a grant; `NODE_ENV !== production` is not a grant; admin or 16+ char token + httpOnly cookie; enter route strips token from `next`.
- `robots: { index: false, follow: false }`; `/sandbox` in `ROBOTS_DISALLOW_PATHS`; not in primary/mobile/user-menu nav or sitemap.
- REAL_PAYMENT off; no card storage.
- Prospective brands: PROSPECTIVE, no logos, no imports, rights UNKNOWN=DENY.
- Originals DRAFT / not public catalog.
- Partner/external AI denied; UMTUBA does not claim to issue Coursera/etc certificates.

---

## 8 FINAL PRODUCT VERDICT questions

1. **Is Learning Home a premium, discoverable product (Originals / Partner / External, search, filters, Continue)?**  
   **NO.** Flat fixture grid. Discovery controls missing.

2. **Can a synthetic student complete Catalog → detail → enroll → lesson → quiz → exercise → AI Tutor → completion → certificate in this sandbox?**  
   **NO.** Catalog card click works. Enroll/lesson/quiz/tutor/cert are **MISSING_FROM_SANDBOX** (404). Existing `/learning` was not used as a substitute.

3. **Are the three named UMTUBA Originals complete product surfaces, visually obvious, and safely unpublished?**  
   **PARTIAL.** Titles, 4×12 modules, quizzes, exercises exist as fixtures and stay DRAFT / not public. Product chrome (hero, author, level, objectives, interactive assessment, certificate, Originals rail) is incomplete.

4. **CAN_A_REAL_FUTURE_INSTRUCTOR_OPERATE_WITHOUT_UMTUBA_STAFF_MANUALLY_DOING_EVERYTHING?**  
   **NO.** See section D blockers.

5. **Is the global partner model truthful and complete (ownership + integration modes, no false partners)?**  
   **TRUTHFUL, NOT COMPLETE.** All seven brands are PROSPECTIVE / NOT AN UMTUBA PARTNER. Ownership and integration UX are partial. REAL_PARTNERSHIPS = 0.

6. **Can Learning Admin run DRAFT → TERMINATED without prospective companies becoming ACTIVE?**  
   **ACTIVE protection YES; admin product NO.** Lifecycle incomplete; no actions.

7. **Is paid Learning sandbox complete (five SKUs, enroll → mock pay → enrollment, decline recovery) and obviously not a real transaction?**  
   **NO / Store-only mock.** Learning paid path missing. Store mock copy is honest in source. REAL_PAYMENT = 0.

8. **Are AI Tutor rights and certificates truthful (CATALOG ≠ AI; UMTUBA does not issue Coursera/etc certs)?**  
   **RIGHTS DEFAULTS YES; PRODUCT NO.** AI flag + deny-unknown hold. Partner AI=true case not shown. No tutor UI. Certificates do not falsely claim partner issuers; certificate UI is an enum only.

---

## FINAL RETURN

```
TASK_ID = PC2_LEARNING_FULL_SANDBOX_PRODUCT_REVIEW_V1
STATUS = COMPLETE
LEARNING_HOME = PARTIAL
STUDENT_DASHBOARD = PARTIAL
STUDENT_E2E = MISSING_FROM_SANDBOX
COURSE_DETAIL = PARTIAL
LESSON = MISSING_FROM_SANDBOX
QUIZ = PARTIAL
EXERCISE = PARTIAL
AI_TUTOR = MISSING_FROM_SANDBOX
CERTIFICATE = PARTIAL
INSTRUCTOR_PROFILE = MISSING_FROM_SANDBOX
INSTRUCTOR_DASHBOARD = PARTIAL
COURSE_CREATION = MISSING_FROM_SANDBOX
INSTRUCTOR_SELF_SERVICE = NO
INSTRUCTOR_ANALYTICS = MISSING_FROM_SANDBOX
INSTRUCTOR_REVENUE_DEMO = MISSING_FROM_SANDBOX
PARTNER_COURSE_MODEL = PARTIAL
EXTERNAL_COURSE_MODEL = PARTIAL
GLOBAL_PARTNER_PREVIEW = PRESENT
LEARNING_ADMIN = PARTIAL
PAID_LEARNING_SANDBOX = MISSING_FROM_SANDBOX
MOCK_PAYMENT = WORKING
ARABIC = PARTIAL
RTL = WORKING
ENGLISH = PARTIAL
FR = PARTIAL
ES = PARTIAL
DE = PARTIAL
PT = PARTIAL
RESPONSIVE = PARTIAL
P0_FINDINGS = 0
P1_FINDINGS = 3 (LPR-P1-001 student E2E missing from sandbox; LPR-P1-002 instructor self-service missing from sandbox; LPR-P1-003 paid Learning path missing from sandbox)
P2_FINDINGS = 6 (LPR-P2-001 Home discovery; LPR-P2-002 Originals product chrome; LPR-P2-003 admin lifecycle; LPR-P2-004 ownership/AI-true case; LPR-P2-005 student library; LPR-P2-006 external continue control)
P3_FINDINGS = 3 (LPR-P3-001 loc leakage browser-confirmed; LPR-P3-002 phone pill wrap + public bottom nav; LPR-P3-003 hub Partners tile → rights)
MISSING_PRODUCT_SURFACES = SANDBOX_REVIEW_TARGET_GAP: discovery; enroll/lesson/quiz/exercise/tutor/cert document; instructor authoring; admin actions; paid Learning checkout. EXISTING_LEARNING_PRODUCT still has /learning and instructor/lesson/ai-tutor app routes — not linked from sandbox.
UX_IMPROVEMENTS = Originals/Partner/External rails; link progress cards; render existing author/exercise fields; sandbox cert preview; hide public phone nav on /sandbox; complete AR bodies; do not rebuild /learning solely because sandbox is a gallery
STUDENT_COMMERCIAL_READY = NO
INSTRUCTOR_COMMERCIAL_READY = NO
PARTNER_MODEL_READY = NO
LEARNING_COMMERCIAL_READINESS = NO
SANDBOX_PRODUCT_COVERAGE = FIXTURE_GALLERY
FIXTURE_ONLY_SURFACES = Home grid; student 1-row dash; instructor names; admin labels; partner rights; course readouts; commercial percents
OPERABLE_SURFACES = nav pills; hub cards; Open course; Store mock pay SUCCESS/FAILURE/REFUND; Back to hub; Sign in
NON_OPERABLE_SURFACES = student/instructor/admin cards; Continue with provider; quiz/exercise/tutor/certificate
MISSING_EXECUTABLE_PRODUCT_SLICES = sandbox enroll/lesson/quiz/ai-tutor/certificate (404)
EXISTING_LEARNING_PRODUCT_GAP = not measured ( /learning 200 loading shell only; no synthetic login )
SANDBOX_REVIEW_TARGET_GAP = sandbox does not expose existing Learning product journeys
SOURCE_CHANGED = NO
DEPLOYED = NO
REAL_PARTNERSHIPS = 0
REAL_PAYMENT = 0
CENTRAL_ACTION_REQUIRED = YES — keep 8f39277 as a truthful fixture gallery OR add sandbox-only executable slices. Do not rebuild /learning because the private hub failed to wrap it. Browser evidence is in docs/ai/pc2-learning-sandbox-qa/.
```

### Explicit 8-question answers (compact)

1. Learning Home premium/discoverable? **NO**
2. Synthetic student E2E to certificate? **NO**
3. Three Originals complete + obvious + unpublished? **PARTIAL** (unpublished YES; product chrome PARTIAL)
4. Instructor self-service without staff? **NO**
5. Partner model truthful + complete? **TRUTHFUL / NOT COMPLETE**
6. Admin full lifecycle + ACTIVE protected? **ACTIVE protected YES; lifecycle/admin product NO**
7. Paid Learning sandbox complete + obviously fake? **NO** (Store mock honest; Learning path missing)
8. AI + certificates truthful? **DEFAULTS YES; tutor/cert product NO**
