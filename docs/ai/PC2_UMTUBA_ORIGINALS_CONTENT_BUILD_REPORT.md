# PC2 UMTUBA Originals Content Build V1

DEVICE = PC2  
DATE = 2026-08-18  
TASK_ID = PC2_UMTUBA_ORIGINALS_CONTENT_BUILD_V1  
MODE = CONTENT_BUILD_ONLY  
AUTHORIZED_SANDBOX_SOURCE_SHA = 8f39277bbe902dd202023379bff2fc25161d3168  
WORKSPACE_HEAD = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2 (`office/platform-translation-trunk-port-v1`)  
CONTENT_RIGHTS = UMTUBA_OWNED  
AI_TUTOR_ALLOWED = YES  
DEPLOYED = NO  

## Paths searched

- `lib/sandbox/fixtures/originals.ts` — **missing on current HEAD**; present at SHA `8f39277` (origin/alpha-0.2). Restored as the content home.
- `lib/sandbox/fixtures/types.ts` — restored from `8f39277` and extended additively (optional structured lesson fields, certificate copy, final assessment).
- `lib/learning/**` — completion, assessments, AI Tutor, certificates (architecture only; no Learning redesign).
- `app/lib/nav/routes.ts` — product surfaces used for Platform Essentials accuracy.
- No parallel CMS.

`8f39277` is **not** an ancestor of current HEAD. Content was written into the existing sandbox fixture pattern on this branch so it can merge with the sandbox hub later.

## Classification legend

- **KEEP** — id, title, module slot, or claim reused as-is.
- **REFINE** — same lesson, product-accurate correction or stronger wording.
- **COMPLETE** — missing shape filled (objective, body, examples, takeaways, exercise, quiz, tutor context, time).
- **REWRITE_ONLY_IF_NECESSARY** — none. No title/structure rewrite.

Existing 8f39277 drafts were 1–2 sentence bodies and 1 question per module quiz. All 36 lesson **slots** were kept (4×12).

---

## Course 1 — UMTUBA Platform Essentials

Modules = 4. Lessons = 12. Orientation → participation → creation → responsible use.

| ID | Title | Action | Notes |
| --- | --- | --- | --- |
| pe-m1-l1 | Account, profile, and Settings | COMPLETE | Kept platform_admins + no secrets in chat. |
| pe-m1-l2 | The honest product map | COMPLETE + REFINE | Surfaces limited to pages that exist. `/discover` alias kept. |
| pe-m1-q | Check: account and product map | COMPLETE | 1 → 4 questions. |
| pe-m2-l1 | Home, Watch, Following, and Saved | COMPLETE + REFINE | Follow is an action, not a `/following` page. |
| pe-m2-l2 | Create publishing and Messages | COMPLETE + REFINE | Create = video + article only (no invented Write Post/Image pages). |
| pe-m2-q | Check: Watch, Create, and Messages | COMPLETE | 1 → 4. |
| pe-m3-l1 | Learning without inventing partners | COMPLETE | Draft + AI deny-by-default. Defers AI how-it-works to Course 3. |
| pe-m3-l2 | Store sandbox and World places | COMPLETE | DEMO / PURCHASABLE=NO. World = places. No Store ops lesson. |
| pe-m3-q | Check: Learning, Store, and World | COMPLETE | 1 → 4. |
| pe-m4-l1 | Privacy, Support, report, and block | COMPLETE + REFINE | `/privacy` + `/terms` real. No invented `/support` or Block page. Live Report named. General security deferred to Course 2. |
| pe-m4-r1 | First-session checklist | COMPLETE | Resource worksheet. No real payment. |
| pe-m4-q | Check: privacy and responsible use | COMPLETE | 1 → 4. |

Final assessment = `pe-final` (5 questions, pass 4/5 points, `max_attempts` null).

---

## Course 2 — Digital Safety & Privacy Fundamentals

Modules = 4. Lessons = 12. Practical beginner security. No absolute guarantees. No fabricated law or statistics.

| ID | Title | Action | Notes |
| --- | --- | --- | --- |
| ds-m1-l1 | One account, one secret | COMPLETE | Unique secrets; never collect a password. |
| ds-m1-l2 | MFA concepts and recovery | COMPLETE | Authenticator/hardware key when offered. SMS not called perfect. |
| ds-m1-q | Check: passwords and recovery | COMPLETE | 1 → 4. |
| ds-m2-l1 | Phishing, scams, and social engineering | COMPLETE | Urgency + codes. No incident stats. |
| ds-m2-l2 | Verify out of band | COMPLETE | Open official pages yourself. |
| ds-m2-q | Check: phishing | COMPLETE | 1 → 4. |
| ds-m3-l1 | Least privilege for apps and browsers | COMPLETE | AI over-share deferred to Course 3. |
| ds-m3-l2 | Public vs private info, safe sharing, and devices | COMPLETE | No invented legal definition of personal data. |
| ds-m3-q | Check: permissions and minimization | COMPLETE | 1 → 4. |
| ds-m4-l1 | Reporting abuse and a monthly pass | COMPLETE | Existing controls only; no promised outcome. |
| ds-m4-r1 | Privacy pass worksheet | COMPLETE | YES/NO/SKIP; no secrets. |
| ds-m4-q | Check: monthly pass | COMPLETE | 1 → 3 (enough; not forced to 5). |

Final assessment = `ds-final` (5 questions, pass 4/5 points, `max_attempts` null).

---

## Course 3 — AI Fundamentals for Everyone

Modules = 4. Lessons = 12. Accurate, no hype.

Hard rules in copy: AI must not always know the truth; must not understand like a human; must not replace professional judgment; must not receive confidential information by default.

| ID | Title | Action | Notes |
| --- | --- | --- | --- |
| ai-m1-l1 | What AI is, and a machine-learning picture | COMPLETE | Pattern tools / examples. |
| ai-m1-l2 | Hallucinations are normal failure, not rare theater | COMPLETE | No fabricated error rates. |
| ai-m1-q | Check: what AI is | COMPLETE | 1 → 4. |
| ai-m2-l1 | A prompt is a context packet | COMPLETE | No jailbreak coaching. |
| ai-m2-l2 | Nothing secret goes in the packet | COMPLETE | Confidential info not for default AI. |
| ai-m2-q | Check: prompts | COMPLETE | 1 → 4. |
| ai-m3-l1 | AI_USAGE_ALLOWED is deny by default | COMPLETE | Rights-only overlap with Course 1. |
| ai-m3-l2 | What the tutor may use from this pilot | COMPLETE | Owned Originals when allowed; sandbox ≠ production ingest. |
| ai-m3-q | Check: tutor rights | COMPLETE | 1 → 4. |
| ai-m4-l1 | Everyday use, work, learning, and safe tools | COMPLETE | Not grade authority. |
| ai-m4-r1 | Prompt worksheet | COMPLETE | Secrets line must be NO. |
| ai-m4-q | Check: verification habit | COMPLETE | 1 → 3. |

Final assessment = `ai-final` (5 questions, pass 4/5 points, `max_attempts` null).

---

## Completion rules (existing Learning architecture)

Verified against `supabase/migrations/20260855_learning_completion_foundation_v1.sql` and activity settings:

1. `learning_completion_try_finalize_course` requires `learning_course_progress.status = 'completed'`.
2. It also requires `learning_completion_assessment_gate_ok`: every **published** activity with `completion_mode = 'score'` has a `learning_attempt_progress_applications` row.
3. `passing_score` is **points** compared to `score_earned`, and must be `<= max_score`.
4. `max_attempts` null = a **new** attempt may start (submitted attempts do not reopen). Retry is supported this way.
5. Certificate insert is a finalize side effect (`learning_certificates`: `certificate_code`, `issued_at`, `issued_by` uuid). No PDF.

**Intended mapping (content only, no backend invent):** one published score-mode activity per Original with `max_score=5`, `passing_score=4`, `max_attempts=null`.

**Gap:** sandbox fixtures are not `learning_activities` rows. Until publish/seed wiring exists, the final assessment is content-ready only. Lesson quizzes are formative content, not automatic completion gates unless authored as score-mode activities.

**Gap:** product does not have a first-class “final exam” entity. Any score-mode activity gates. One activity is the compatible rule.

## Certificate copy

Fixture fields on each Original: `COURSE_NAME`, `{{LEARNER_NAME}}`, completion sentence, `ISSUER=UMTUBA`, `{{COMPLETION_DATE}}`, `{{CERTIFICATE_ID}}`, disclaimer (not a degree/license/accreditation/third-party cert).

**Gap:** `learning_certificates` has no learner display-name column (name would come from `profiles` at render). No certificate PDF/template in product. Notification copy is generic (“You completed a course and earned a certificate.”). `issued_by` is an actor uuid, not the string `UMTUBA`. Fixture copy is for a future template; it does not change SQL.

## Cross-course duplication check

| Topic | Course 1 Platform | Course 2 Digital Safety | Course 3 AI |
| --- | --- | --- | --- |
| Passwords / MFA | Only “do not paste secrets in Messages/Learning” | Full unique-secret + MFA + recovery | Prompt must not contain secrets |
| Phishing | UMTUBA Messages / fake feed example, one rule | General social engineering + out-of-band | Not a phishing course |
| Privacy / minimization | Privacy/Terms pages, Live Report | Public vs private, permissions, devices | Confidential info not for default AI |
| AI rights | Product default: unknown = deny | Not covered | Full tutor rights + owned-only |
| Store DEMO | Full DEMO / no real payment | Reporting ≠ Store takedown (one line) | Not covered |

Terminology aligned: `AI_USAGE_ALLOWED`, UNKNOWN=DENY, SOURCE_TYPE=DEMO, PURCHASABLE=NO, issuer UMTUBA.

Progression: Platform (product map) → Digital Safety (general habits) → AI (pattern tools + tutor). Each course points sideways instead of cloning.

Times: text 11–13m, quiz 6–7m, resource 8m, final 12m. Credible for beginner modules.

## Quality

CONTENT_QUALITY = COMPLETE_FOR_DRAFT_ORIGINALS  
- 36/36 lessons have objective, body, tutor context, time.  
- Non-quiz lessons have examples + takeaways + a safe exercise.  
- Module quizzes 3–5 scenario questions with explanation.  
- No third-party course copy. No fake instructors created (`people.ts` not added).  
- No fabricated citations/statistics/legal claims.  
- Exercises never require real passwords, sensitive PII, unsafe behavior, or real payment.

## Remaining gaps

- Sandbox `CourseDetail` at `8f39277` still prints `body` + first quiz prompt only; new fields need a later UI pass (out of this GO).
- Final assessments not persisted as Learning activities.
- Certificate template not rendered by product.
- Instructor IDs reused (`demo-instructor-01/04/07`); `people.ts` is not on this branch.
- Originals remain DRAFT / not public catalog / not Production published.

## Tests

- `npx vitest run lib/sandbox/fixtures/originals.content.test.ts` — 8 passed.
- `npx tsc --noEmit` — pass.
- `git diff --check` — pass.
- No deploy. No Store/mobile source edits (vitest include line only).

## FINAL RETURN

```text
TASK_ID = PC2_UMTUBA_ORIGINALS_CONTENT_BUILD_V1
COURSE_1_CONTENT_COMPLETE = YES
COURSE_2_CONTENT_COMPLETE = YES
COURSE_3_CONTENT_COMPLETE = YES
COURSE_1_MODULES = 4
COURSE_1_LESSONS = 12
COURSE_2_MODULES = 4
COURSE_2_LESSONS = 12
COURSE_3_MODULES = 4
COURSE_3_LESSONS = 12
LESSONS_COMPLETE = 36
QUIZZES_COMPLETE = 12_MODULE + 3_FINAL
EXERCISES_COMPLETE = 24_LESSON + 6_COURSE
FINAL_ASSESSMENTS_COMPLETE = 3
AI_TUTOR_CONTEXT_COMPLETE = YES
CERTIFICATE_COPY_COMPLETE = YES
COURSE_1_FINAL_ASSESSMENT = pe-final (4/5 points, max_attempts null, score-mode)
COURSE_2_FINAL_ASSESSMENT = ds-final (4/5 points, max_attempts null, score-mode)
COURSE_3_FINAL_ASSESSMENT = ai-final (4/5 points, max_attempts null, score-mode)
COMPLETION_RULES_VERIFIED = YES_WITH_GAPS
CROSS_COURSE_DUPLICATION_CHECK = PASS
CONTENT_RIGHTS = UMTUBA_OWNED
AI_TUTOR_ALLOWED = YES
CONTENT_QUALITY = COMPLETE_FOR_DRAFT_ORIGINALS
REMAINING_CONTENT_GAPS = sandbox UI fields unused; finals not DB-wired; cert template not rendered
EXISTING_CONTENT_REUSED = YES (ids, titles, 4x12, core claims, instructor ids, quiz stems)
CONTENT_REFINED = YES (Create/Follow/Support accuracy; expanded quizzes)
CONTENT_NEWLY_COMPLETED = YES (full lesson shape, finals, cert copy)
TESTS = PASS (originals.content.test.ts 8/8)
TYPECHECK = PASS
SOURCE_CHANGED = YES
FILES_CHANGED = lib/sandbox/fixtures/*; vitest.config.ts; docs/ai/CURRENT_TASK.md; docs/ai/PC2_UMTUBA_ORIGINALS_CONTENT_BUILD_REPORT.md; docs/ai/CURSOR_REPORT.md
SOURCE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
DEPLOYED = NO
NO_DEPLOY = YES
STORE_TOUCHED = NO
MOBILE_TOUCHED = NO
THIRD_PARTY_CONTENT_COPIED = NO
FAKE_INSTRUCTORS_CREATED = NO
CENTRAL_ACTION_REQUIRED = When publishing, seed one score-mode activity per course (pass 4/5, unlimited attempts). Restore sandbox CourseDetail if preview should show new fields. Do not Production-publish from this GO.
```
