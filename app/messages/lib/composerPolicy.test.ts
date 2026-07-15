import { describe, expect, it } from "vitest";
import {
  canSendComposerText,
  clampComposerDraft,
  COMPOSER_KEYBOARD_CONTRACT,
  MESSAGE_MAX_LENGTH,
  normalizeComposerDraft,
  shouldClearDraftAfterSend,
} from "./composerPolicy";

describe("composerPolicy", () => {
  it("rejects empty and whitespace-only messages", () => {
    expect(canSendComposerText("")).toBe(false);
    expect(canSendComposerText("   \n\t  ")).toBe(false);
    expect(normalizeComposerDraft("  hello  ")).toBe("hello");
  });

  it("allows non-empty text when not pending/disabled", () => {
    expect(canSendComposerText("Hello")).toBe(true);
    expect(canSendComposerText("Hello", { disabled: true })).toBe(false);
    expect(canSendComposerText("Hello", { pending: true })).toBe(false);
  });

  it("pending state prevents duplicate sends", () => {
    expect(canSendComposerText("Hi", { pending: true })).toBe(false);
  });

  it("clears draft only after successful send", () => {
    expect(shouldClearDraftAfterSend(true)).toBe(true);
    expect(shouldClearDraftAfterSend(false)).toBe(false);
  });

  it("clamps draft to max length", () => {
    const long = "a".repeat(MESSAGE_MAX_LENGTH + 50);
    expect(clampComposerDraft(long).length).toBe(MESSAGE_MAX_LENGTH);
  });

  it("documents Enter/Shift+Enter keyboard contract", () => {
    expect(COMPOSER_KEYBOARD_CONTRACT.enterSends).toBe(true);
    expect(COMPOSER_KEYBOARD_CONTRACT.shiftEnterNewline).toBe(true);
  });
});
