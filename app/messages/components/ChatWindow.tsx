"use client";

import { useEffect, useRef, useState } from "react";
import type { Conversation, Message, MessageReactionEmoji, MuteOption } from "../types";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";
import TypingIndicator from "./TypingIndicator";

type ChatWindowProps = {
  conversation: Conversation | null;
  currentUserId: string;
  onSend: (text: string) => boolean | Promise<boolean>;
  onBack?: () => void;
  showBack?: boolean;
  loading?: boolean;
  error?: string | null;
  sendError?: string | null;
  onLoadOlder?: () => void;
  loadingOlder?: boolean;
  onComposerTyping?: () => void;
  composerDisabled?: boolean;
  activityLabel?: string;
  replyTo?: Message | null;
  onReply?: (message: Message) => void;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onEdit?: (message: Message) => void;
  onCancelEdit?: () => void;
  onSaveEdit?: (text: string) => boolean | Promise<boolean>;
  onDeleteForMe?: (message: Message) => void;
  onDeleteForEveryone?: (message: Message) => void;
  onToggleReaction?: (message: Message, emoji: MessageReactionEmoji) => void;
  onMute?: (option: MuteOption) => void;
  mutePending?: boolean;
  muteError?: string | null;
};

export default function ChatWindow({
  conversation,
  currentUserId,
  onSend,
  onBack,
  showBack = false,
  loading = false,
  error = null,
  sendError = null,
  onLoadOlder,
  loadingOlder = false,
  onComposerTyping,
  composerDisabled = false,
  activityLabel,
  replyTo = null,
  onReply,
  onCancelReply,
  editingMessage = null,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onToggleReaction,
  onMute,
  mutePending,
  muteError,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.id, conversation?.messages.length, conversation?.isTyping]);

  function scrollToMessage(messageId: string) {
    const el = document.getElementById(`message-${messageId}`);
    if (!el) {
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(messageId);
    window.setTimeout(() => {
      setHighlightId((current) => (current === messageId ? null : current));
    }, 1600);
  }

  if (!conversation) {
    return (
      <section className="flex h-full min-h-0 flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] px-6 text-center backdrop-blur-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-300">
          Messages
        </p>
        <h2 className="mt-3 text-xl font-black text-white">
          Select a conversation
        </h2>
        <p className="mt-2 max-w-sm text-sm text-white/45">
          Choose a chat from your inbox, or open someone&apos;s profile and tap
          Message to start a direct conversation.
        </p>
      </section>
    );
  }

  const threadError = error && error !== sendError ? error : null;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-3xl border border-white/10 bg-[#080816]/70 backdrop-blur-xl">
      <ChatHeader
        conversation={conversation}
        onBack={onBack}
        showBack={showBack}
        activityLabel={activityLabel}
        onMute={onMute}
        mutePending={mutePending}
        muteError={muteError}
      />

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-5">
        {onLoadOlder ? (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={onLoadOlder}
              disabled={loadingOlder}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/60 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 disabled:opacity-50"
            >
              {loadingOlder ? "Loading…" : "Load earlier messages"}
            </button>
          </div>
        ) : null}

        {loading ? (
          <p className="py-10 text-center text-sm text-white/45" role="status">
            Loading messages…
          </p>
        ) : conversation.messages.length === 0 ? (
          <div className="px-2 py-10 text-center">
            <p className="text-sm font-medium text-white/70">No messages yet</p>
            <p className="mt-1 text-sm text-white/45">
              Say hello — your first text message starts this conversation.
            </p>
          </div>
        ) : (
          conversation.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              currentUserId={currentUserId}
              highlighted={highlightId === message.id}
              onReply={onReply}
              onEdit={onEdit}
              onDeleteForMe={onDeleteForMe}
              onDeleteForEveryone={onDeleteForEveryone}
              onToggleReaction={onToggleReaction}
              onReplyPreviewClick={scrollToMessage}
            />
          ))
        )}

        {conversation.isTyping ? (
          <div className="flex justify-start" aria-live="polite">
            <TypingIndicator />
          </div>
        ) : null}

        {threadError ? (
          <p className="text-center text-xs font-bold text-red-300" role="alert">
            {threadError}
          </p>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <MessageComposer
        onSend={onSend}
        onTyping={onComposerTyping}
        disabled={composerDisabled || loading}
        statusMessage={sendError}
        replyTo={replyTo}
        onCancelReply={onCancelReply}
        editingMessage={editingMessage}
        onCancelEdit={onCancelEdit}
        onSaveEdit={onSaveEdit}
      />
    </section>
  );
}
