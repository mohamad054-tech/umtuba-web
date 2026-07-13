"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { LiveChatMessage as LiveChatMessageType } from "../data/mockStreams";
import LiveChatMessage from "./LiveChatMessage";

type LiveChatPanelProps = {
  messages: LiveChatMessageType[];
  onSend: (text: string) => void;
};

export default function LiveChatPanel({ messages, onSend }: LiveChatPanelProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <aside className="flex h-full min-h-[22rem] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#080816]/75 backdrop-blur-xl md:min-h-0 md:rounded-[32px]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-blue-300">
            Live chat
          </p>
          <p className="mt-0.5 text-sm font-black text-white">
            {messages.length} messages
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/25 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-red-200">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          Active
        </span>
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.map((message) => (
          <LiveChatMessage key={message.id} message={message} />
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-white/10 p-3"
      >
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Say something..."
            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
            maxLength={240}
          />
          <button
            type="submit"
            className="shrink-0 rounded-2xl bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-white/90 disabled:opacity-40"
            disabled={!draft.trim()}
          >
            Send
          </button>
        </div>
      </form>
    </aside>
  );
}
