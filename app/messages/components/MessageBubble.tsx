"use client";

import { useRef, useState } from "react";
import { useTranslation } from "../../components/i18n";
import { useDialogA11y } from "../../lib/product/useDialogA11y";
import {
  formatBubbleTime,
  MESSAGE_REACTION_EMOJIS,
  type Message,
  type MessageReactionEmoji,
} from "../types";
import {
  canDeleteForEveryone,
  canDeleteForMe,
  canEditMessage,
  canReactToMessage,
} from "../lib/messagePermissions";

type MessageBubbleProps = {
  message: Message;
  currentUserId: string;
  highlighted?: boolean;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDeleteForMe?: (message: Message) => void;
  onDeleteForEveryone?: (message: Message) => void;
  onToggleReaction?: (message: Message, emoji: MessageReactionEmoji) => void;
  onReplyPreviewClick?: (messageId: string) => void;
  onOpenVisual?: (message: Message) => void;
};

function receiptLabel(message: Message): string | null {
  if (!message.isMine || message.status === "sending" || message.status === "failed") {
    return null;
  }
  if (message.receiptStatus === "seen") return "Seen";
  if (message.receiptStatus === "delivered") return "Delivered";
  return "Sent";
}

export default function MessageBubble({
  message,
  currentUserId,
  highlighted = false,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onToggleReaction,
  onReplyPreviewClick,
  onOpenVisual,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactOpen, setReactOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuFirstRef = useRef<HTMLButtonElement | null>(null);
  const reactRef = useRef<HTMLDivElement | null>(null);
  const reactFirstRef = useRef<HTMLButtonElement | null>(null);

  useDialogA11y({
    open: menuOpen,
    onClose: () => setMenuOpen(false),
    containerRef: menuRef,
    initialFocusRef: menuFirstRef,
  });

  useDialogA11y({
    open: reactOpen,
    onClose: () => setReactOpen(false),
    containerRef: reactRef,
    initialFocusRef: reactFirstRef,
  });

  const timeLabel =
    message.status === "sending"
      ? "Sending…"
      : message.status === "failed"
        ? "Failed"
        : formatBubbleTime(message.sentAt);

  const receipt = receiptLabel(message);
  const showActions = !message.isDeleted && message.status !== "sending";

  return (
    <div
      id={`message-${message.id}`}
      className={`group flex scroll-mt-24 ${
        message.isMine ? "justify-end" : "justify-start"
      }`}
    >
      <div className="max-w-[85%] md:max-w-[70%]">
        <div
          className={`rounded-3xl px-4 py-3 transition ${
            message.isMine
              ? "rounded-br-lg bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-[0_8px_24px_rgba(37,99,235,0.25)]"
              : "rounded-bl-lg border border-white/10 bg-white/[0.06] text-white backdrop-blur"
          } ${message.status === "sending" ? "opacity-80" : ""} ${
            message.status === "failed" ? "ring-1 ring-red-400/50" : ""
          } ${highlighted ? "ring-2 ring-cyan-300/70" : ""} ${
            message.isDeleted ? "opacity-70 italic" : ""
          }`}
        >
          {message.replyPreview ? (
            <button
              type="button"
              onClick={() =>
                onReplyPreviewClick?.(message.replyPreview!.messageId)
              }
              className={`mb-2 w-full rounded-xl border-l-2 px-2.5 py-1.5 text-left transition ${
                message.isMine
                  ? "border-white/50 bg-black/15 hover:bg-black/25"
                  : "border-blue-300/60 bg-black/25 hover:bg-black/35"
              }`}
              aria-label={
                message.replyPreview.unavailable
                  ? "Original message unavailable"
                  : "Jump to replied message"
              }
            >
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                Reply
              </p>
              <p className="truncate text-xs opacity-90">
                {message.replyPreview.text}
              </p>
            </button>
          ) : null}

          {message.visual && !message.isDeleted ? (
            <div className="mb-2 space-y-2">
              {message.visual.previewUrl ? (
                message.visual.mediaType === "video" ? (
                  <video
                    src={message.visual.previewUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-72 w-full rounded-2xl bg-black"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- signed or local preview
                  <img
                    src={message.visual.previewUrl}
                    alt=""
                    className="max-h-72 w-full rounded-2xl object-cover"
                  />
                )
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenVisual?.(message)}
                  className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-amber-300/30 bg-black/30 px-3 py-6 text-sm font-bold text-amber-100"
                  aria-label={
                    message.visual.viewed && !message.isMine
                      ? t("umStreak.opened")
                      : t("umStreak.viewOnce")
                  }
                >
                  {message.visual.viewed && !message.isMine
                    ? t("umStreak.opened")
                    : t("umStreak.viewOnce")}
                </button>
              )}
              {message.visual.caption ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                  {message.visual.caption}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
              {message.text}
            </p>
          )}

          <div
            className={`mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-medium ${
              message.status === "failed"
                ? "text-red-200"
                : message.isMine
                  ? "text-white/70"
                  : "text-white/40"
            }`}
            aria-live={
              message.status === "sending" || message.status === "failed"
                ? "polite"
                : undefined
            }
          >
            <span>{timeLabel}</span>
            {message.editedAt && !message.isDeleted ? (
              <span aria-label="Edited">Edited</span>
            ) : null}
            {receipt ? <span>{receipt}</span> : null}
          </div>
        </div>

        {message.reactions && message.reactions.length > 0 ? (
          <div
            className={`mt-1 flex flex-wrap gap-1 ${
              message.isMine ? "justify-end" : "justify-start"
            }`}
            role="group"
            aria-label="Reactions"
          >
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                disabled={!canReactToMessage(message) || !onToggleReaction}
                onClick={() => onToggleReaction?.(message, reaction.emoji)}
                className={`rounded-full border px-2 py-0.5 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 ${
                  reaction.reactedByMe
                    ? "border-blue-300/50 bg-blue-500/30 text-white"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                }`}
                aria-pressed={reaction.reactedByMe}
                aria-label={`${reaction.emoji} ${reaction.count}${
                  reaction.reactedByMe ? ", you reacted" : ""
                }`}
              >
                {reaction.emoji} {reaction.count}
              </button>
            ))}
          </div>
        ) : null}

        {showActions ? (
          <div
            className={`mt-1 flex items-center gap-1 ${
              message.isMine ? "justify-end" : "justify-start"
            }`}
          >
            {canReactToMessage(message) && onToggleReaction ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setReactOpen((open) => !open);
                    setMenuOpen(false);
                  }}
                  className="rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-white/45 transition hover:bg-white/10 hover:text-white/80"
                  aria-expanded={reactOpen}
                  aria-haspopup="true"
                  aria-label="Add reaction"
                >
                  ☺
                </button>
                {reactOpen ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10 cursor-default bg-transparent"
                      aria-label="Close reaction picker"
                      onClick={() => setReactOpen(false)}
                    />
                    <div
                      ref={reactRef}
                      className={`absolute z-20 mt-1 flex gap-1 rounded-xl border border-white/10 bg-[#0c0c1a] p-1 shadow-xl ${
                        message.isMine ? "right-0" : "left-0"
                      }`}
                      role="group"
                      aria-label="Choose reaction"
                    >
                      {MESSAGE_REACTION_EMOJIS.map((emoji, index) => (
                        <button
                          key={emoji}
                          ref={index === 0 ? reactFirstRef : undefined}
                          type="button"
                          onClick={() => {
                            onToggleReaction(message, emoji);
                            setReactOpen(false);
                          }}
                          className="rounded-lg px-1.5 py-1 text-sm hover:bg-white/10"
                          aria-label={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            {onReply ? (
              <button
                type="button"
                onClick={() => onReply(message)}
                className="rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-white/45 transition hover:bg-white/10 hover:text-white/80"
              >
                Reply
              </button>
            ) : null}

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen((open) => !open);
                  setReactOpen(false);
                }}
                className="rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-white/45 transition hover:bg-white/10 hover:text-white/80"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Message actions"
              >
                ···
              </button>
              {menuOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default bg-transparent"
                    aria-label="Close message actions"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    ref={menuRef}
                    className={`absolute z-20 mt-1 min-w-[10rem] rounded-xl border border-white/10 bg-[#0c0c1a] py-1 shadow-xl ${
                      message.isMine ? "right-0" : "left-0"
                    }`}
                    role="menu"
                  >
                    {canEditMessage(message, currentUserId) && onEdit ? (
                      <button
                        ref={menuFirstRef}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onEdit(message);
                          setMenuOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-xs font-medium text-white/80 hover:bg-white/10"
                      >
                        Edit
                      </button>
                    ) : null}
                    {canDeleteForMe(message) && onDeleteForMe ? (
                      <button
                        ref={
                          !(canEditMessage(message, currentUserId) && onEdit)
                            ? menuFirstRef
                            : undefined
                        }
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onDeleteForMe(message);
                          setMenuOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-xs font-medium text-white/80 hover:bg-white/10"
                      >
                        Delete for me
                      </button>
                    ) : null}
                    {canDeleteForEveryone(message, currentUserId) &&
                    onDeleteForEveryone ? (
                      <button
                        ref={
                          !(
                            (canEditMessage(message, currentUserId) && onEdit) ||
                            (canDeleteForMe(message) && onDeleteForMe)
                          )
                            ? menuFirstRef
                            : undefined
                        }
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onDeleteForEveryone(message);
                          setMenuOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-xs font-medium text-red-300 hover:bg-white/10"
                      >
                        Delete for everyone
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
