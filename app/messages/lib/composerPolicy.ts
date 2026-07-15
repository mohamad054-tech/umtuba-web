/** Shared Messenger composer rules (text DMs only). */

export const MESSAGE_MAX_LENGTH = 4000;

/**
 * Keyboard contract:
 * - Enter → send (when the draft is non-empty and send is enabled)
 * - Shift+Enter → insert a newline
 */
export const COMPOSER_KEYBOARD_CONTRACT = {
  enterSends: true,
  shiftEnterNewline: true,
} as const;

/** Reject empty / whitespace-only drafts. */
export function normalizeComposerDraft(raw: string): string {
  return raw.trim();
}

export function canSendComposerText(
  raw: string,
  options: { disabled?: boolean; pending?: boolean } = {}
): boolean {
  if (options.disabled || options.pending) return false;
  const text = normalizeComposerDraft(raw);
  if (!text) return false;
  if (text.length > MESSAGE_MAX_LENGTH) return false;
  return true;
}

export function clampComposerDraft(raw: string): string {
  return raw.slice(0, MESSAGE_MAX_LENGTH);
}

/**
 * After a send attempt: clear draft only on authoritative success.
 * Failed / aborted sends keep the draft for retry.
 */
export function shouldClearDraftAfterSend(sendSucceeded: boolean): boolean {
  return sendSucceeded === true;
}
