import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEARNING_ASSESSMENT_ATTEMPT_ROUTES } from "./assessmentAttemptFoundation";
import {
  attemptStatusMessage,
  isAttemptInputLocked,
  LEARNING_LEARNER_ROUTES,
} from "./learnerDelivery";

const ROOT = join(__dirname, "../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const PLAYER = read("app/components/learning/AttemptPlayer.tsx");
const QUESTION = read("app/components/learning/AttemptQuestion.tsx");
const BANNER = read("app/components/learning/AttemptStatusBanner.tsx");
const SUBMIT = read("app/components/learning/AssessmentSubmitForm.tsx");
const ANSWER_SAVE = read("app/components/learning/AssessmentAnswerSaveForm.tsx");
const GRADE = read("app/components/learning/AssessmentGradePanel.tsx");
const RESULT = read("app/components/learning/LearnerResultSummary.tsx");

const SAVE_FAIL_MESSAGE =
  "Could not save your latest answers. Please try again.";

describe("Assessment runtime UI contract — AttemptPlayer", () => {
  it("locks inputs via isAttemptInputLocked and disabled question props", () => {
    expect(PLAYER).toMatch(
      /const locked = isAttemptInputLocked\(view\.status, remaining\);/
    );
    expect(PLAYER).toMatch(/disabled=\{locked \|\| busy\}/);
    expect(PLAYER).toMatch(
      /async function onSubmit\(\) \{\s*if \(locked \|\| busy \|\| terminalRef\.current\) return;/
    );
    expect(PLAYER).toMatch(
      /async function onCancel\(\) \{\s*if \(locked \|\| busy \|\| terminalRef\.current\) return;/
    );
  });

  it("treats non-active / zero-remaining as locked (helper contract)", () => {
    expect(isAttemptInputLocked("active", null)).toBe(false);
    expect(isAttemptInputLocked("active", 12)).toBe(false);
    expect(isAttemptInputLocked("active", 0)).toBe(true);
    expect(isAttemptInputLocked("submitted", 99)).toBe(true);
    expect(isAttemptInputLocked("expired", null)).toBe(true);
    expect(isAttemptInputLocked("cancelled", 5)).toBe(true);
  });

  it("terminal ref blocks persist/queue/submit after successful submit", () => {
    expect(PLAYER).toMatch(/const terminalRef = useRef\(false\);/);
    expect(PLAYER).toMatch(
      /async function persistAnswer\([\s\S]*?if \(terminalRef\.current\) return false;/
    );
    expect(PLAYER).toMatch(
      /function queueSave\([\s\S]*?if \(locked \|\| busy \|\| terminalRef\.current\) return;/
    );
    const onSubmit = PLAYER.slice(
      PLAYER.indexOf("async function onSubmit()"),
      PLAYER.indexOf("async function onCancel()")
    );
    expect(onSubmit).toMatch(/terminalRef\.current = true;/);
    expect(onSubmit.indexOf("submitLearningAttempt(")).toBeLessThan(
      onSubmit.indexOf("terminalRef.current = true;")
    );
  });

  it("submit flushes pending autosaves before RPC and fails closed on flush error", () => {
    const onSubmit = PLAYER.slice(
      PLAYER.indexOf("async function onSubmit()"),
      PLAYER.indexOf("async function onCancel()")
    );
    expect(onSubmit.indexOf("flushPendingAnswers()")).toBeLessThan(
      onSubmit.indexOf("submitLearningAttempt(")
    );
    expect(onSubmit).toMatch(
      /const flushed = await flushPendingAnswers\(\);\s*if \(!flushed\)/
    );
    const failStart = onSubmit.indexOf("if (!flushed)");
    const afterFail = onSubmit.indexOf("const supabase", failStart);
    const failBlock = onSubmit.slice(failStart, afterFail);
    expect(failBlock).toContain("return;");
    expect(failBlock).toContain("SAVE_FAIL_MESSAGE");
    expect(failBlock).not.toContain("submitLearningAttempt");
    expect(PLAYER).toContain(
      `const SAVE_FAIL_MESSAGE =\n  "${SAVE_FAIL_MESSAGE}";`
    );
  });

  it("presents save failure state from persistAnswer errors", () => {
    expect(PLAYER).toMatch(
      /if \(!result\.ok\) \{\s*setSaveState\("error"\);\s*setSaveError\(SAVE_FAIL_MESSAGE\);/
    );
    expect(PLAYER).toMatch(/aria-live="polite"/);
    expect(PLAYER).toMatch(/Save error: \$\{saveError/);
  });

  it("exposes submit/cancel only while status is active", () => {
    expect(PLAYER).toMatch(/\{view\.status === "active" \? \(/);
    expect(PLAYER).toMatch(/>\s*Submit attempt\s*</);
    expect(PLAYER).toMatch(/>\s*Cancel attempt\s*</);
    expect(PLAYER).toMatch(
      /href=\{LEARNING_LEARNER_ROUTES\.activity\(view\.activity_id\)\}/
    );
  });

  it("is learner-only runtime (no instructor authoring actions)", () => {
    expect(PLAYER).not.toMatch(/LEARNING_INSTRUCTOR/);
    expect(PLAYER).not.toMatch(/publishQuestion|setAnswerKey|InstructorActionForm/);
    expect(PLAYER).not.toMatch(/dangerouslySetInnerHTML/);
    expect(PLAYER).toMatch(/saveLearningAttemptAnswer/);
    expect(PLAYER).toMatch(/submitLearningAttempt/);
    expect(PLAYER).toMatch(/cancelLearningAttempt/);
  });
});

describe("Assessment runtime UI contract — AttemptQuestion", () => {
  it("respects disabled fieldset and uses plain-string prompts", () => {
    expect(QUESTION).toMatch(/<fieldset\s*\n\s*disabled=\{disabled\}/);
    expect(QUESTION).toMatch(/asPlainString\(question\.content\.prompt\)/);
    expect(QUESTION).not.toMatch(/dangerouslySetInnerHTML/);
    expect(QUESTION).not.toMatch(/innerHTML/);
  });

  it("covers supported attempt question types without answer keys", () => {
    expect(QUESTION).toMatch(/multiple_choice_single/);
    expect(QUESTION).toMatch(/multiple_choice_multiple/);
    expect(QUESTION).toMatch(/true_false/);
    expect(QUESTION).toMatch(/short_answer/);
    expect(QUESTION).toMatch(/numeric/);
    expect(QUESTION).toMatch(/fill_blank/);
    expect(QUESTION).not.toMatch(/answer_key/);
    expect(QUESTION).not.toMatch(/LEARNING_INSTRUCTOR/);
  });
});

describe("Assessment runtime UI contract — AttemptStatusBanner", () => {
  it("uses attemptStatusMessage and switches to learner result messaging when submitted", () => {
    expect(BANNER).toMatch(/attemptStatusMessage\(status\)/);
    expect(BANNER).toMatch(/learnerResultStatusMessage\(/);
    expect(BANNER).toMatch(/status === "submitted" && resultView/);
    expect(BANNER).toMatch(/role="status"/);
    expect(attemptStatusMessage("active")).toBe("Attempt in progress.");
    expect(attemptStatusMessage("submitted")).toMatch(/submitted/i);
  });

  it("shows timer only for active attempts and embeds LearnerResultSummary when submitted", () => {
    expect(BANNER).toMatch(
      /status === "active" && remainingSeconds != null/
    );
    expect(BANNER).toMatch(/Time remaining:/);
    expect(BANNER).toMatch(/<LearnerResultSummary view=\{resultView\} \/>/);
  });
});

describe("Assessment runtime UI contract — AssessmentSubmitForm", () => {
  it("requires explicit confirmation before submit is enabled", () => {
    expect(SUBMIT).toMatch(/const \[confirmed, setConfirmed\] = useState\(false\);/);
    expect(SUBMIT).toMatch(/disabled=\{!confirmed\}/);
    expect(SUBMIT).toMatch(/confirmSubmit/);
    expect(SUBMIT).toMatch(/value=\{confirmed \? "1" : "0"\}/);
    expect(SUBMIT).toMatch(/submitAssessmentAttemptAction/);
  });

  it("states permanent lock after submit and carries activity/attempt ids", () => {
    expect(SUBMIT).toMatch(/Submitting locks this\s*attempt permanently/);
    expect(SUBMIT).toMatch(/name="activityId" value=\{activityId\}/);
    expect(SUBMIT).toMatch(/name="attemptId" value=\{attemptId\}/);
    expect(SUBMIT).not.toMatch(/LEARNING_INSTRUCTOR/);
    expect(SUBMIT).not.toMatch(/cancelLearningAttempt/);
  });
});

describe("Assessment runtime UI contract — AssessmentAnswerSaveForm", () => {
  it("disables save when attempt is disabled or pending and requires a value", () => {
    expect(ANSWER_SAVE).toMatch(/disabled=\{disabled \|\| pending\}/);
    expect(ANSWER_SAVE).toMatch(/disabled=\{pending \|\| !value\}/);
    expect(ANSWER_SAVE).toMatch(/\{!disabled \? \(/);
    expect(ANSWER_SAVE).toMatch(/saveAssessmentAnswerAction/);
  });

  it("surfaces save failure via result.message without HTML injection", () => {
    expect(ANSWER_SAVE).toMatch(/setIsError\(true\);/);
    expect(ANSWER_SAVE).toMatch(/setMessage\(result\.message\);/);
    expect(ANSWER_SAVE).toMatch(/role="status"/);
    expect(ANSWER_SAVE).not.toMatch(/dangerouslySetInnerHTML/);
    expect(ANSWER_SAVE).not.toMatch(/LEARNING_INSTRUCTOR/);
  });
});

describe("Assessment runtime UI contract — AssessmentGradePanel", () => {
  it("never exposes answer keys and gates grade/progress actions", () => {
    expect(GRADE).toMatch(/Answer keys are never shown/);
    expect(GRADE).not.toMatch(/answer_key/);
    expect(GRADE).toMatch(/\{canGrade \? \(/);
    expect(GRADE).toMatch(/\{progress\?\.can_apply \? \(/);
    expect(GRADE).toMatch(/gradeAssessmentAttemptAction/);
    expect(GRADE).toMatch(/applyAssessmentProgressAction/);
  });

  it("renders grading status messaging and objective/manual breakdown", () => {
    expect(GRADE).toMatch(/assessmentGradeStatusMessage\(status\)/);
    expect(GRADE).toMatch(/Objective score/);
    expect(GRADE).toMatch(/Manual review/);
    expect(GRADE).toMatch(/aria-label="Assessment grading"/);
    expect(GRADE).not.toMatch(/dangerouslySetInnerHTML/);
  });
});

describe("Assessment runtime UI contract — LearnerResultSummary", () => {
  it("renders only when visibility is available and keeps stable testid", () => {
    expect(RESULT).toMatch(
      /if \(view\.visibility !== "available" \|\| !view\.result\) \{\s*return null;/
    );
    expect(RESULT).toMatch(/data-testid="learner-result-summary"/);
    expect(RESULT).toMatch(/Never shows per-question correctness or keys/);
  });

  it("shows aggregate score/pass only — no per-question keys", () => {
    expect(RESULT).toMatch(/score_earned/);
    expect(RESULT).toMatch(/score_max/);
    expect(RESULT).toMatch(/percentage/);
    expect(RESULT).toMatch(/passed === true/);
    expect(RESULT).toMatch(/passed === false/);
    expect(RESULT).not.toMatch(/answer_key/);
    expect(RESULT).not.toMatch(/question_results/);
    expect(RESULT).not.toMatch(/dangerouslySetInnerHTML/);
  });
});

describe("Assessment runtime UI contract — shared learner routes", () => {
  it("canonical activity/assessment/attempt routes stay learner-scoped", () => {
    expect(LEARNING_LEARNER_ROUTES.activity("a1")).toBe(
      "/learning/activities/a1"
    );
    expect(LEARNING_LEARNER_ROUTES.assessment("a1")).toBe(
      "/learning/activities/a1/assessment"
    );
    expect(LEARNING_ASSESSMENT_ATTEMPT_ROUTES.attempt("a1", "t1")).toBe(
      "/learning/activities/a1/assessment-attempts/t1"
    );
    expect(LEARNING_ASSESSMENT_ATTEMPT_ROUTES.assessment("a1")).toBe(
      LEARNING_LEARNER_ROUTES.assessment("a1")
    );
  });

  it("runtime surfaces do not hardcode instructor path templates", () => {
    for (const src of [PLAYER, QUESTION, BANNER, SUBMIT, ANSWER_SAVE, RESULT]) {
      expect(src).not.toMatch(/\/learning\/instructor/);
      expect(src).not.toMatch(/href=\{`\/learning\/activities\//);
    }
  });
});
