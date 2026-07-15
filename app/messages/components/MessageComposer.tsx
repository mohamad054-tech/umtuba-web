"use client";

import { useState } from "react";
import {
  canSendComposerText,
  clampComposerDraft,
  MESSAGE_MAX_LENGTH,
  normalizeComposerDraft,
  shouldClearDraftAfterSend,
} from "../lib/composerPolicy";

const EMOJI_SET = ["😀", "🔥", "✨", "💙", "🌍", "🙌", "😂", "❤️", "🚀", "👍"];

type MessageComposerProps = {
  /** Return true when the server accepted the send (clears draft). */
  onSend: (text: string) => boolean | Promise<boolean>;
  onTyping?: () => void;
  disabled?: boolean;
  /** Sanitized send/status error from the parent (aria-live). */
  statusMessage?: string | null;
};

/**
 * Production composer: text field + emoji helper + Send only.
 * Attachment / voice controls are not rendered (no unfinished affordances).
 *
 * Keyboard: Enter sends; Shift+Enter inserts a newline.
 */
export default function MessageComposer({
  onSend,
  onTyping,
  disabled = false,
  statusMessage = null,
}: MessageComposerProps) {
  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [pending, setPending] = useState(false);

  const sendEnabled = canSendComposerText(draft, { disabled, pending });

  async function handleSend() {
    if (!canSendComposerText(draft, { disabled, pending })) return;

    const text = normalizeComposerDraft(draft);
    setPending(true);
    setShowEmoji(false);

    try {
      const ok = await Promise.resolve(onSend(text));
      if (shouldClearDraftAfterSend(Boolean(ok))) {
        setDraft("");
      }
    } catch {
      // Keep draft on unexpected throw; parent owns sanitized status.
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-4 md:pb-4">
      {statusMessage ? (
        <p
          className="mb-2 text-center text-xs font-bold text-red-300"
          role="alert"
          aria-live="assertive"
        >
          {statusMessage}
        </p>
      ) : null}

      {showEmoji ? (
        <div
          className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-2"
          role="group"
          aria-label="Insert emoji"
        >
          {EMOJI_SET.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() =>
                setDraft((prev) => clampComposerDraft(`${prev}${emoji}`))
              }
              className="rounded-xl px-2 py-1 text-lg transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              aria-label={`Insert ${emoji}`}
              disabled={disabled || pending}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setShowEmoji((open) => !open)}
          disabled={disabled || pending}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 text-lg transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 disabled:opacity-50 ${
            showEmoji ? "bg-white/15 text-white" : "bg-white/5 text-white/70"
          }`}
          aria-label={showEmoji ? "Hide emoji picker" : "Show emoji picker"}
          aria-pressed={showEmoji}
          title="Emoji"
        >
          🙂
        </button>

        <div className="min-w-0 flex-1">
          <label htmlFor="messenger-composer-input" className="sr-only">
            Message
          </label>
          <textarea
            id="messenger-composer-input"
            value={draft}
            onChange={(event) => {
              setDraft(clampComposerDraft(event.target.value));
              onTyping?.();
            }}
            onKeyDown={(event) => {
              // Enter sends; Shift+Enter keeps the default newline.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
            maxLength={MESSAGE_MAX_LENGTH}
            placeholder="Write a message…"
            aria-label="Message"
            aria-describedby={
              statusMessage ? "messenger-composer-status" : undefined
            }
            disabled={disabled || pending}
            className="max-h-28 min-h-11 w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30 focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-50"
          />
          {statusMessage ? (
            <span id="messenger-composer-status" className="sr-only">
              {statusMessage}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!sendEnabled}
          aria-busy={pending}
          className="flex h-11 shrink-0 items-center justify-center rounded-2xl bg-white px-4 text-sm font-black text-black transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={pending ? "Sending message" : "Send message"}
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
