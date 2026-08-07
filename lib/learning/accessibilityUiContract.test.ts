import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const HUB = read("app/components/learning/LearningHub.tsx");
const OUTLINE = read("app/components/learning/CourseOutline.tsx");
const VIEWER = read("app/components/learning/LessonViewer.tsx");
const PLAYER = read("app/components/learning/AttemptPlayer.tsx");
const QUESTION = read("app/components/learning/AttemptQuestion.tsx");
const SHELL = read("app/components/learning/LearningShell.tsx");
const RENDERER = read("app/components/learning/ContentBlockRenderer.tsx");
const CATALOG = read("app/learning/catalog/page.tsx");
const DETAIL = read("app/learning/catalog/[courseSlug]/page.tsx");
const INSTR_DASH = read("app/learning/instructor/page.tsx");
const INSTR_COURSE = read("app/learning/instructor/courses/[courseId]/page.tsx");
const INSTR_LESSON = read(
  "app/learning/instructor/courses/[courseId]/lessons/[lessonId]/page.tsx"
);
const INSTR_BLOCK_CREATE = read(
  "app/components/learning/instructor/InstructorContentBlockCreateForm.tsx"
);
const ACTION_FORM = read(
  "app/components/learning/instructor/InstructorActionForm.tsx"
);
const BOOTSTRAP_FIELD = read(
  "app/components/learning/instructor/BootstrapField.tsx"
);
const SUBMIT = read("app/components/learning/AssessmentSubmitForm.tsx");
const LAYOUT = read("app/layout.tsx");

const SURFACES = [
  HUB,
  OUTLINE,
  VIEWER,
  PLAYER,
  CATALOG,
  DETAIL,
  INSTR_DASH,
  INSTR_COURSE,
  INSTR_LESSON,
];

describe("Learning accessibility contract — names and controls", () => {
  it("LearningHub primary CTAs expose accessible names and focus rings", () => {
    expect(HUB).toMatch(/aria-label="Continue learning"/);
    expect(HUB).toMatch(/>\s*Resume\s*</);
    expect(HUB).toMatch(/>\s*Course outline\s*</);
    expect(HUB).toMatch(/watch-focus-ring/);
    expect(HUB).toMatch(/data-testid="learning-hub"/);
    expect(HUB).toMatch(/data-testid="learning-hub-resume"/);
  });

  it("CourseOutline lesson links use text labels and focus rings", () => {
    expect(OUTLINE).toMatch(/watch-focus-ring/);
    expect(OUTLINE).toMatch(/\{lesson\.name\}/);
    expect(OUTLINE).toMatch(/data-testid=\{`learning-outline-lesson-\$\{lesson\.id\}`\}/);
    expect(OUTLINE).not.toMatch(/<svg/);
  });

  it("LessonViewer nav and actions have labels, status roles, and focus rings", () => {
    expect(VIEWER).toMatch(/aria-label="Lesson navigation"/);
    expect(VIEWER).toMatch(/data-testid="learning-lesson-nav-prev"/);
    expect(VIEWER).toMatch(/data-testid="learning-lesson-nav-next"/);
    expect(VIEWER).toMatch(/role="status"/);
    expect(VIEWER).toMatch(/role="alert"/);
    expect(VIEWER).toMatch(/watch-focus-ring/);
    expect(VIEWER).toMatch(/← Previous/);
    expect(VIEWER).toMatch(/Next →/);
  });

  it("Lesson notes panel exposes accessible names, status, and focus rings", () => {
    const notes = read("app/components/learning/LessonNotesPanel.tsx");
    expect(notes).toMatch(/aria-label="Personal lesson notes"/);
    expect(notes).toMatch(/aria-label="New note text"/);
    expect(notes).toMatch(/aria-label="Edit note text"/);
    expect(notes).toMatch(/aria-label="Optional lesson position in seconds"/);
    expect(notes).toMatch(/role="alert"/);
    expect(notes).toMatch(/role="status"/);
    expect(notes).toMatch(/watch-focus-ring/);
    expect(notes).toMatch(/data-testid="learning-lesson-notes"/);
    expect(VIEWER).toMatch(/LessonNotesPanel/);
  });

  it("AttemptPlayer buttons are text-labeled and disabled state is semantic", () => {
    expect(PLAYER).toMatch(/type="button"/);
    expect(PLAYER).toMatch(/>\s*Submit attempt\s*</);
    expect(PLAYER).toMatch(/>\s*Cancel attempt\s*</);
    expect(PLAYER).toMatch(/disabled=\{locked \|\| busy\}/);
    expect(PLAYER).toMatch(/aria-live="polite"/);
    expect(PLAYER).toMatch(/role="alert"/);
    expect(PLAYER).toMatch(/watch-focus-ring/);
    expect(PLAYER).not.toMatch(/<svg/);
  });

  it("AttemptQuestion form controls use fieldset disabled + aria labels", () => {
    expect(QUESTION).toMatch(/<fieldset\s*\n\s*disabled=\{disabled\}/);
    expect(QUESTION).toMatch(/role="radiogroup"/);
    expect(QUESTION).toMatch(/aria-label=\{prompt\}/);
    expect(QUESTION).toMatch(/aria-label=\{prompt \|\| "Short answer"\}/);
    expect(QUESTION).toMatch(/aria-label=\{prompt \|\| "Numeric answer"\}/);
  });

  it("AssessmentSubmitForm confirm control is labeled and submit is disabled until confirmed", () => {
    expect(SUBMIT).toMatch(/aria-describedby="submit-confirm-help"/);
    expect(SUBMIT).toMatch(/id="submit-confirm-help"/);
    expect(SUBMIT).toMatch(/disabled=\{!confirmed\}/);
    expect(SUBMIT).toMatch(/>\s*Submit final answers\s*</);
  });
});

describe("Learning accessibility contract — catalog and instructor", () => {
  it("catalog/detail CTAs use meaningful link text and decorative images use empty alt", () => {
    expect(CATALOG).toMatch(/>\s*View Course\s*</);
    expect(CATALOG).toMatch(/alt=""/);
    expect(CATALOG).toMatch(/sr-only">Price</);
    expect(DETAIL).toMatch(/role="alert"/);
    expect(DETAIL).toMatch(/alt=""/);
    expect(DETAIL).toMatch(/>\s*Create Account\s*</);
    expect(DETAIL).toMatch(/>\s*Continue Course\s*</);
    expect(DETAIL).toMatch(/>\s*Start Course\s*</);
    expect(DETAIL).toMatch(/watch-focus-ring/);
  });

  it("instructor dashboard empty/error states and create CTA are named", () => {
    expect(INSTR_DASH).toMatch(/role="alert"/);
    expect(INSTR_DASH).toMatch(/>\s*Create Space\s*</);
    expect(INSTR_DASH).toMatch(/watch-focus-ring/);
    expect(INSTR_DASH).toMatch(/Create catalog/);
    expect(INSTR_DASH).toMatch(/Review queue/);
  });

  it("instructor course/lesson authoring controls expose accessible names", () => {
    expect(INSTR_COURSE).toMatch(/aria-label="Section name"/);
    expect(INSTR_COURSE).toMatch(/aria-label="Lesson name"/);
    expect(INSTR_COURSE).toMatch(/aria-label="Activity name"/);
    expect(INSTR_COURSE).toMatch(/aria-label="Activity type"/);
    expect(INSTR_COURSE).toMatch(/aria-label="Ordered section ids"/);
    expect(INSTR_BLOCK_CREATE).toMatch(/aria-label="Content block type"/);
    expect(INSTR_BLOCK_CREATE).toMatch(/"Block text"/);
    expect(INSTR_LESSON).toMatch(/aria-label="Ordered content block ids"/);
    expect(INSTR_LESSON).toMatch(/Unlock cost \(UM Points\)/);
  });

  it("InstructorActionForm and BootstrapField keep labeled submit/status patterns", () => {
    expect(ACTION_FORM).toMatch(/disabled=\{pending \|\| disabled\}/);
    expect(ACTION_FORM).toMatch(/role="status"/);
    expect(ACTION_FORM).toMatch(/\{pending \? "Working…" : submitLabel\}/);
    expect(BOOTSTRAP_FIELD).toMatch(/<label className="block space-y-1\.5">/);
    expect(BOOTSTRAP_FIELD).toMatch(/\{label\}/);
  });
});

describe("Learning accessibility contract — structure, media, safety", () => {
  it("audited surfaces use heading hierarchy and LearningShell main landmark", () => {
    expect(SHELL).toMatch(/<main/);
    expect(HUB).toMatch(/<h1[\s>]/);
    expect(OUTLINE).toMatch(/<h1[\s>]/);
    expect(PLAYER).toMatch(/<h1[\s>]/);
    expect(DETAIL).toMatch(/<h1[\s>]/);
    expect(INSTR_DASH).toMatch(/LearningShell/);
  });

  it("content-block media has safe alt/fallback contracts", () => {
    expect(RENDERER).toMatch(
      /const alt = asPlainString\(content\.alt, 500\) \|\| "Lesson image"/
    );
    expect(RENDERER).toMatch(/alt=\{alt\}/);
    expect(RENDERER).toMatch(/Your browser does not support video playback\./);
    expect(RENDERER).toMatch(/sr-only/);
  });

  it("keyboard actions are not pointer-only on audited interactive surfaces", () => {
    // Hub/Outline/Catalog use Links; AttemptPlayer uses type=button with onClick.
    expect(HUB).not.toMatch(/onClick=/);
    expect(OUTLINE).not.toMatch(/onClick=/);
    expect(CATALOG).not.toMatch(/onClick=/);
    expect(INSTR_COURSE).not.toMatch(/onClick=/);
    expect(PLAYER).toMatch(/type="button"/);
    expect(PLAYER).toMatch(/onClick=\{\(\) => void onSubmit\(\)\}/);
    expect(PLAYER).not.toMatch(/onMouseDown=/);
  });

  it("no raw HTML injection and learner/instructor separation remain intact", () => {
    for (const src of SURFACES) {
      expect(src).not.toMatch(/dangerouslySetInnerHTML/);
    }
    expect(HUB).not.toMatch(/LEARNING_INSTRUCTOR/);
    expect(OUTLINE).not.toMatch(/LEARNING_INSTRUCTOR/);
    expect(VIEWER).not.toMatch(/LEARNING_INSTRUCTOR/);
    expect(PLAYER).not.toMatch(/LEARNING_INSTRUCTOR/);
    expect(CATALOG).not.toMatch(/LEARNING_INSTRUCTOR/);
    expect(INSTR_COURSE).toMatch(/LEARNING_INSTRUCTOR_ROUTES/);
    expect(INSTR_COURSE).not.toMatch(/LEARNING_LEARNER_ROUTES/);
  });

  it("RTL/LTR inheritance remains intact (no forced dir lock on Learning surfaces)", () => {
    expect(LAYOUT).toMatch(/lang="en"/);
    for (const src of [SHELL, HUB, OUTLINE, VIEWER, PLAYER, CATALOG, DETAIL]) {
      expect(src).not.toMatch(/dir="ltr"/);
      expect(src).not.toMatch(/dir="rtl"/);
      expect(src).not.toMatch(/unicode-bidi/);
    }
  });

  it("existing Browser E2E testids remain stable", () => {
    expect(HUB).toMatch(/data-testid="learning-hub"/);
    expect(HUB).toMatch(/data-testid="learning-hub-continue"/);
    expect(HUB).toMatch(/data-testid="learning-hub-resume"/);
    expect(OUTLINE).toMatch(/data-testid="learning-course-outline"/);
    expect(VIEWER).toMatch(/data-testid="learning-lesson-viewer"/);
    expect(VIEWER).toMatch(/data-testid="learning-lesson-content"/);
    expect(VIEWER).toMatch(/data-testid="learning-lesson-locked"/);
  });
});
