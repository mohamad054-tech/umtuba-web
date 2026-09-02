"use client";

import { useRef, useState } from "react";
import { allowMessengerPreviewChrome } from "../../lib/product/surfaceGates";
import { useDialogA11y } from "../../lib/product/useDialogA11y";
import type { Conversation, MuteOption } from "../types";
import { MUTE_OPTION_LABELS, MUTE_OPTIONS } from "../lib/muteOptions";
import OnlineStatusDot from "./OnlineStatusDot";
import UmStreakStatus from "./UmStreakStatus";

type ChatHeaderProps = {
  conversation: Conversation;
  onBack?: () => void;
  showBack?: boolean;
  activityLabel?: string;
  onMute?: (option: MuteOption) => void;
  mutePending?: boolean;
  muteError?: string | null;
};

export default function ChatHeader({
  conversation,
  onBack,
  showBack = false,
  activityLabel,
  onMute,
  mutePending = false,
  muteError = null,
}: ChatHeaderProps) {
  const showPresenceChrome = allowMessengerPreviewChrome();
  const [muteOpen, setMuteOpen] = useState(false);
  const muteMenuRef = useRef<HTMLDivElement | null>(null);
  const muteFirstRef = useRef<HTMLButtonElement | null>(null);

  useDialogA11y({
    open: muteOpen,
    onClose: () => setMuteOpen(false),
    containerRef: muteMenuRef,
    initialFocusRef: muteFirstRef,
  });

  let subtitle: string | null = null;
  if (conversation.isTyping) {
    subtitle = "Typing…";
  } else if (showPresenceChrome) {
    subtitle =
      conversation.status === "online"
        ? "Online"
        : activityLabel || conversation.lastSeenLabel;
  } else if (activityLabel) {
    // Honest activity from last message time — not presence.
    subtitle = activityLabel;
  }

  if (conversation.isMuted) {
    subtitle = subtitle ? `${subtitle} · Muted` : "Muted";
  }

  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 md:hidden"
          aria-label="Back to conversations"
        >
          ← Back
        </button>
      ) : null}

      <div className="relative shrink-0">
        {conversation.peerAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote avatar URLs from Supabase storage
          <img
            src={conversation.peerAvatarUrl}
            alt=""
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-sm font-black text-white ${conversation.peerAvatarGradient}`}
          >
            {conversation.peerInitials}
          </div>
        )}
        {showPresenceChrome ? (
          <OnlineStatusDot
            status={conversation.status}
            className="absolute bottom-0 right-0"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-black text-white">
            {conversation.peerName}
          </p>
          {conversation.umStreak ? (
            <UmStreakStatus streak={conversation.umStreak} compact />
          ) : null}
        </div>
        {subtitle ? (
          <p className="truncate text-xs text-white/45" aria-live="polite">
            {subtitle}
          </p>
        ) : null}
        {muteError ? (
          <p className="truncate text-xs text-red-300" role="alert">
            {muteError}
          </p>
        ) : null}
      </div>

      {onMute ? (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMuteOpen((open) => !open)}
            disabled={mutePending}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 disabled:opacity-50"
            aria-expanded={muteOpen}
            aria-haspopup="menu"
            aria-label={conversation.isMuted ? "Mute options" : "Mute conversation"}
          >
            {conversation.isMuted ? "Muted" : "Mute"}
          </button>
          {muteOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-20 cursor-default bg-transparent"
                aria-label="Close mute menu"
                onClick={() => setMuteOpen(false)}
              />
              <div
                ref={muteMenuRef}
                className="absolute right-0 z-30 mt-2 min-w-[13rem] rounded-xl border border-white/10 bg-[#0c0c1a] py-1 shadow-xl"
                role="menu"
              >
                {MUTE_OPTIONS.filter((option) =>
                  conversation.isMuted ? true : option !== "off"
                ).map((option, index) => (
                  <button
                    key={option}
                    ref={index === 0 ? muteFirstRef : undefined}
                    type="button"
                    role="menuitem"
                    disabled={mutePending}
                    onClick={() => {
                      onMute(option);
                      setMuteOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-xs font-medium text-white/80 hover:bg-white/10 disabled:opacity-50"
                  >
                    {MUTE_OPTION_LABELS[option]}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
