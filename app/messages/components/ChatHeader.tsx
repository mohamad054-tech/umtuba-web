import type { Conversation } from "../types";
import OnlineStatusDot from "./OnlineStatusDot";

type ChatHeaderProps = {
  conversation: Conversation;
  onBack?: () => void;
  showBack?: boolean;
  activityLabel?: string;
};

export default function ChatHeader({
  conversation,
  onBack,
  showBack = false,
  activityLabel,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white md:hidden"
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
        <OnlineStatusDot
          status={conversation.status}
          className="absolute bottom-0 right-0"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">
          {conversation.peerName}
        </p>
        <p className="truncate text-xs text-white/45">
          {conversation.isTyping
            ? "Typing…"
            : conversation.status === "online"
              ? "Online"
              : activityLabel || conversation.lastSeenLabel}
        </p>
      </div>
    </div>
  );
}
