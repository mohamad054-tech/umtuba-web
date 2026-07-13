"use client";

import { useEffect, useRef } from "react";
import type { Conversation } from "../types";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";
import TypingIndicator from "./TypingIndicator";

type ChatWindowProps = {
  conversation: Conversation | null;
  onSend: (text: string) => void;
  onBack?: () => void;
  showBack?: boolean;
  loading?: boolean;
  error?: string | null;
  onLoadOlder?: () => void;
  loadingOlder?: boolean;
  onComposerTyping?: () => void;
  composerDisabled?: boolean;
  activityLabel?: string;
};

export default function ChatWindow({
  conversation,
  onSend,
  onBack,
  showBack = false,
  loading = false,
  error = null,
  onLoadOlder,
  loadingOlder = false,
  onComposerTyping,
  composerDisabled = false,
  activityLabel,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.id, conversation?.messages.length, conversation?.isTyping]);

  if (!conversation) {
    return (
      <section className="flex h-full min-h-0 flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] px-6 text-center backdrop-blur-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-300">
          Conversation
        </p>
        <h2 className="mt-3 text-xl font-black text-white">
          Select a chat to begin
        </h2>
        <p className="mt-2 max-w-sm text-sm text-white/45">
          Your UMTUBA inbox is ready. Pick a conversation from the list, or
          message a creator from their profile.
        </p>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-3xl border border-white/10 bg-[#080816]/70 backdrop-blur-xl">
      <ChatHeader
        conversation={conversation}
        onBack={onBack}
        showBack={showBack}
        activityLabel={activityLabel}
      />

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-5">
        {onLoadOlder ? (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={onLoadOlder}
              disabled={loadingOlder}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/60 transition hover:bg-white/10 disabled:opacity-50"
            >
              {loadingOlder ? "Loading…" : "Load earlier messages"}
            </button>
          </div>
        ) : null}

        {loading ? (
          <p className="py-10 text-center text-sm text-white/45">
            Loading messages…
          </p>
        ) : conversation.messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/45">
            No messages yet. Say hello.
          </p>
        ) : (
          conversation.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}

        {conversation.isTyping ? (
          <div className="flex justify-start">
            <TypingIndicator />
          </div>
        ) : null}

        {error ? (
          <p className="text-center text-xs font-bold text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <MessageComposer
        onSend={onSend}
        onTyping={onComposerTyping}
        disabled={composerDisabled || loading}
      />
    </section>
  );
}
