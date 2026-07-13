"use client";

import { useEffect, useRef, useState } from "react";

const EMOJI_SET = ["😀", "🔥", "✨", "💙", "🌍", "🙌", "😂", "❤️", "🚀", "👍"];

const MESSAGE_MAX_LENGTH = 4000;

type MessageComposerProps = {
  onSend: (text: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
};

export default function MessageComposer({
  onSend,
  onTyping,
  disabled = false,
}: MessageComposerProps) {
  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const hintTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hintTimeout.current) clearTimeout(hintTimeout.current);
    };
  }, []);

  function showCue(message: string) {
    setHint(message);
    if (hintTimeout.current) clearTimeout(hintTimeout.current);
    hintTimeout.current = setTimeout(() => setHint(null), 2200);
  }

  function handleSend() {
    const text = draft.trim();
    if (!text || disabled) return;
    onSend(text);
    setDraft("");
    setShowEmoji(false);
  }

  return (
    <div className="relative border-t border-white/10 p-3 md:p-4">
      {hint ? (
        <div className="absolute -top-10 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-[#0b0b18]/95 px-3 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur">
          {hint}
        </div>
      ) : null}

      {showEmoji ? (
        <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-2">
          {EMOJI_SET.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setDraft((prev) => `${prev}${emoji}`)}
              className="rounded-xl px-2 py-1 text-lg transition hover:bg-white/10"
              aria-label={`Insert ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => showCue("Attachments coming soon in Messenger V2")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Attach file"
          title="Attach"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.5 7.5 8.4 14.6a2.5 2.5 0 1 0 3.5 3.5l8.2-8.2a4 4 0 1 0-5.7-5.7l-8.5 8.5"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setShowEmoji((open) => !open)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 text-lg transition hover:bg-white/10 ${
            showEmoji ? "bg-white/15 text-white" : "bg-white/5 text-white/70"
          }`}
          aria-label="Emoji"
          aria-pressed={showEmoji}
          title="Emoji"
        >
          🙂
        </button>

        <div className="min-w-0 flex-1">
          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value.slice(0, MESSAGE_MAX_LENGTH));
              onTyping?.();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            maxLength={MESSAGE_MAX_LENGTH}
            placeholder="Write a message…"
            aria-label="Message"
            disabled={disabled}
            className="max-h-28 min-h-11 w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30 disabled:opacity-50"
          />
        </div>

        <button
          type="button"
          onClick={() => showCue("Voice messages coming soon in Messenger V2")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Voice message"
          title="Voice"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 11a7 7 0 0 0 14 0M12 18v3"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !draft.trim()}
          className="flex h-11 shrink-0 items-center justify-center rounded-2xl bg-white px-4 text-sm font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );
}
