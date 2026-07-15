"use client";

import { memo } from "react";
import type { LiveChatMessage as LiveChatMessageType } from "../types";

type LiveChatMessageProps = {
  message: LiveChatMessageType;
};

function LiveChatMessageComponent({ message }: LiveChatMessageProps) {
  return (
    <div className="flex gap-2.5">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-black text-white ${message.avatarGradient}`}
      >
        {message.userInitials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={`text-xs font-black ${
              message.isCreator ? "text-red-300" : "text-white/80"
            }`}
          >
            {message.userName}
          </span>
          {message.isCreator ? (
            <span className="rounded-full border border-red-400/30 bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-red-200">
              Host
            </span>
          ) : null}
          <span className="text-[10px] text-white/30">{message.sentAt}</span>
        </div>
        <p
          className={`mt-0.5 text-sm leading-5 ${
            message.deleted ? "italic text-white/40" : "text-white/70"
          }`}
        >
          {message.text}
        </p>
      </div>
    </div>
  );
}

const LiveChatMessage = memo(LiveChatMessageComponent);
export default LiveChatMessage;
