import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isAttemptInputLocked } from "./learnerDelivery";

const ROOT = join(__dirname, "../..");
const PLAYER = readFileSync(
  join(ROOT, "app/components/learning/AttemptPlayer.tsx"),
  "utf8"
).replace(/\r\n/g, "\n");

const SAVE_FAIL_MESSAGE =
  "Could not save your latest answers. Please try again.";

describe("AttemptPlayer autosave flush coverage V1 — source contracts", () => {
  it("defines SAVE_FAIL_MESSAGE for flush/save failures", () => {
    expect(PLAYER).toContain(
      `const SAVE_FAIL_MESSAGE =\n  "${SAVE_FAIL_MESSAGE}";`
    );
  });

  it("submit flushes all pending autosaves before final submission", () => {
    const submitIdx = PLAYER.indexOf("async function onSubmit()");
    const flushIdx = PLAYER.indexOf("flushPendingAnswers()", submitIdx);
    const submitRpcIdx = PLAYER.indexOf("submitLearningAttempt(", submitIdx);
    expect(submitIdx).toBeGreaterThan(-1);
    expect(flushIdx).toBeGreaterThan(submitIdx);
    expect(submitRpcIdx).toBeGreaterThan(flushIdx);
    expect(PLAYER).toMatch(
      /const flushed = await flushPendingAnswers\(\);\s*if \(!flushed\)/
    );
  });

  it("submit does not continue when flushPendingAnswers fails", () => {
    const onSubmit = PLAYER.slice(
      PLAYER.indexOf("async function onSubmit()"),
      PLAYER.indexOf("async function onCancel()")
    );
    const failStart = onSubmit.indexOf("if (!flushed)");
    const afterFail = onSubmit.indexOf("const supabase", failStart);
    expect(failStart).toBeGreaterThan(-1);
    expect(afterFail).toBeGreaterThan(failStart);
    const failBlock = onSubmit.slice(failStart, afterFail);
    expect(failBlock).toContain("return;");
    expect(failBlock).toContain("SAVE_FAIL_MESSAGE");
    expect(failBlock).not.toContain("submitLearningAttempt");
  });

  it("flush failure presents SAVE_FAIL_MESSAGE on action and save errors", () => {
    const onSubmit = PLAYER.slice(
      PLAYER.indexOf("async function onSubmit()"),
      PLAYER.indexOf("async function onCancel()")
    );
    expect(onSubmit).toMatch(/setActionError\(SAVE_FAIL_MESSAGE\)/);
    expect(onSubmit).toMatch(/setSaveError\(SAVE_FAIL_MESSAGE\)/);
    expect(onSubmit).toMatch(/setSaveState\("error"\)/);
    expect(PLAYER).toMatch(
      /if \(!result\.ok\) \{\s*setSaveState\("error"\);\s*setSaveError\(SAVE_FAIL_MESSAGE\);/
    );
  });

  it("cancel discards pending autosave before terminal cancel RPC", () => {
    const onCancel = PLAYER.slice(PLAYER.indexOf("async function onCancel()"));
    const discardIdx = onCancel.indexOf("discardPendingAutosave()");
    const terminalIdx = onCancel.indexOf("terminalRef.current = true");
    const cancelRpcIdx = onCancel.indexOf("cancelLearningAttempt(");
    expect(discardIdx).toBeGreaterThan(-1);
    expect(terminalIdx).toBeGreaterThan(discardIdx);
    expect(cancelRpcIdx).toBeGreaterThan(terminalIdx);
    expect(PLAYER).toMatch(
      /function discardPendingAutosave\(\) \{\s*clearPendingTimers\(\);\s*pendingPayloads\.current\.clear\(\);/
    );
  });

  it("terminal state prevents further save or submit activity", () => {
    expect(PLAYER).toMatch(
      /async function persistAnswer\([\s\S]*?if \(terminalRef\.current\) return false;/
    );
    expect(PLAYER).toMatch(
      /function queueSave\([\s\S]*?if \(locked \|\| busy \|\| terminalRef\.current\) return;/
    );
    expect(PLAYER).toMatch(
      /async function onSubmit\(\) \{\s*if \(locked \|\| busy \|\| terminalRef\.current\) return;/
    );
    expect(PLAYER).toMatch(
      /async function onCancel\(\) \{\s*if \(locked \|\| busy \|\| terminalRef\.current\) return;/
    );
    expect(PLAYER).toMatch(/if \(!latest \|\| terminalRef\.current\) return;/);
  });

  it("locked state prevents answer persistence and submit activity", () => {
    expect(PLAYER).toMatch(
      /const locked = isAttemptInputLocked\(view\.status, remaining\);/
    );
    expect(PLAYER).toMatch(
      /function queueSave\([\s\S]*?if \(locked \|\| busy \|\| terminalRef\.current\) return;/
    );
    expect(PLAYER).toMatch(/disabled=\{locked \|\| busy\}/);
    expect(PLAYER).toMatch(
      /onClick=\{\(\) => void onSubmit\(\)\}[\s\S]*?disabled=\{locked \|\| busy\}/
    );
  });

  it("repeated submit cannot create duplicate terminal actions while busy/terminal", () => {
    const onSubmit = PLAYER.slice(
      PLAYER.indexOf("async function onSubmit()"),
      PLAYER.indexOf("async function onCancel()")
    );
    expect(onSubmit).toMatch(
      /^async function onSubmit\(\) \{\s*if \(locked \|\| busy \|\| terminalRef\.current\) return;/m
    );
    expect(onSubmit).toMatch(/setBusy\(true\);/);
    expect(onSubmit).toMatch(/terminalRef\.current = true;/);
    expect(onSubmit).toMatch(
      /terminalRef\.current = true;\s*discardPendingAutosave\(\);/
    );
  });

  it("flush clears timers and requires empty pending queue after success", () => {
    const flush = PLAYER.slice(
      PLAYER.indexOf("async function flushPendingAnswers()"),
      PLAYER.indexOf("function queueSave(")
    );
    expect(flush).toMatch(/clearPendingTimers\(\);/);
    expect(flush).toMatch(/inFlightSaves\.current\.values\(\)/);
    expect(flush).toMatch(/pendingPayloads\.current\.entries\(\)/);
    expect(flush).toMatch(/return pendingPayloads\.current\.size === 0;/);
    expect(flush).toMatch(/if \(!ok\) return false;/);
  });

  it("does not introduce an answer-loss submit path (flush before RPC)", () => {
    const onSubmit = PLAYER.slice(
      PLAYER.indexOf("async function onSubmit()"),
      PLAYER.indexOf("async function onCancel()")
    );
    expect(onSubmit.indexOf("flushPendingAnswers()")).toBeLessThan(
      onSubmit.indexOf("submitLearningAttempt(")
    );
    expect(PLAYER).toMatch(/pendingPayloads\.current\.delete\(questionId\);/);
  });
});

describe("AttemptPlayer locked helper — isAttemptInputLocked", () => {
  it("locks non-active and zero-remaining attempts", () => {
    expect(isAttemptInputLocked("active", null)).toBe(false);
    expect(isAttemptInputLocked("active", 30)).toBe(false);
    expect(isAttemptInputLocked("active", 0)).toBe(true);
    expect(isAttemptInputLocked("submitted", 30)).toBe(true);
    expect(isAttemptInputLocked("expired", null)).toBe(true);
    expect(isAttemptInputLocked("cancelled", 10)).toBe(true);
  });
});
