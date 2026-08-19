"use client";

import { useEffect, useState } from "react";
import {
  canSendComposerText,
  clampComposerDraft,
  MESSAGE_MAX_LENGTH,
  normalizeComposerDraft,
  shouldClearDraftAfterSend,
} from "../lib/composerPolicy";
import { useTranslation } from "../../components/i18n";
import type { Message } from "../types";

const EMOJI_SET = ["😀", "🔥", "✨", "💙", "🌍", "🙌", "😂", "❤️", "🚀", "👍"];

type MessageComposerProps = {
  /** Return true when the server accepted the send (clears draft). */
  onSend: (text: string) => boolean | Promise<boolean>;
  onTyping?: () => void;
  disabled?: boolean;
  /** Sanitized send/status error from the parent (aria-live). */
  statusMessage?: string | null;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (text: string) => boolean | Promise<boolean>;
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
  replyTo = null,
  onCancelReply,
  editingMessage = null,
  onCancelEdit,
  onSaveEdit,
}: MessageComposerProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [pending, setPending] = useState(false);

  const isEditing = Boolean(editingMessage);
  const sendEnabled = canSendComposerText(draft, { disabled, pending });

  useEffect(() => {
    if (editingMessage) {
      setDraft(editingMessage.text);
    }
  }, [editingMessage?.id]);

  async function handleSubmit() {
    if (!canSendComposerText(draft, { disabled, pending })) return;

    const text = normalizeComposerDraft(draft);
    setPending(true);
    setShowEmoji(false);

    try {
      const ok = isEditing
        ? await Promise.resolve(onSaveEdit?.(text) ?? false)
        : await Promise.resolve(onSend(text));
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

      {isEditing && editingMessage ? (
        <div className="mb-2 flex items-start gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/80">
              Editing message
            </p>
            <p className="truncate text-xs text-white/70">{editingMessage.text}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onCancelEdit?.();
              setDraft("");
            }}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Cancel edit"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {!isEditing && replyTo ? (
        <div className="mb-2 flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-blue-400/70 pl-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">
              Replying
            </p>
            <p className="truncate text-xs text-white/70">
              {replyTo.isDeleted ? "Message deleted" : replyTo.text}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Cancel reply"
          >
            Cancel
          </button>
        </div>
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
              if (!isEditing) {
                onTyping?.();
              }
            }}
            onKeyDown={(event) => {
              // Enter sends; Shift+Enter keeps the default newline.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            rows={1}
            maxLength={MESSAGE_MAX_LENGTH}
            placeholder={isEditing ? "Edit message…" : "Write a message…"}
            aria-label={isEditing ? "Edit message" : "Message"}
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
          onClick={() => void handleSubmit()}
          disabled={!sendEnabled}
          aria-busy={pending}
          className="flex h-11 shrink-0 items-center justify-center rounded-2xl bg-white px-4 text-sm font-black text-black transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={
            pending
              ? isEditing
                ? t("status.saving")
                : t("messages.sending")
              : isEditing
                ? t("actions.save")
                : t("messages.send")
          }
        >
          {pending
            ? isEditing
              ? t("status.saving")
              : t("messages.sending")
            : isEditing
              ? t("actions.save")
              : t("messages.send")}
        </button>
      </div>
      <p className="sr-only">Enter sends. Shift+Enter inserts a new line.</p>
    </div>
  );
}
