import {
  formatMessageTime,
  type Conversation,
} from "../types";
import OnlineStatusDot from "./OnlineStatusDot";
import UnreadBadge from "./UnreadBadge";

type ConversationListItemProps = {
  conversation: Conversation;
  selected: boolean;
  onSelect: (id: string) => void;
};

export default function ConversationListItem({
  conversation,
  selected,
  onSelect,
}: ConversationListItemProps) {
  const preview = conversation.isTyping
    ? "Typing…"
    : conversation.lastMessagePreview || "No messages yet";

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
        selected
          ? "border-white/20 bg-white/[0.08]"
          : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.04]"
      }`}
    >
      <div className="relative shrink-0">
        {conversation.peerAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote avatar URLs from Supabase storage
          <img
            src={conversation.peerAvatarUrl}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-black text-white ${conversation.peerAvatarGradient}`}
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
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-bold text-white">
            {conversation.peerName}
          </p>
          {conversation.lastMessageAt ? (
            <span className="shrink-0 text-[11px] font-medium text-white/40">
              {formatMessageTime(conversation.lastMessageAt)}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p
            className={`truncate text-xs ${
              conversation.isTyping
                ? "font-medium text-cyan-300"
                : conversation.unreadCount > 0
                  ? "font-medium text-white/80"
                  : "text-white/45"
            }`}
          >
            {preview}
          </p>
          <UnreadBadge count={conversation.unreadCount} />
        </div>
      </div>
    </button>
  );
}
