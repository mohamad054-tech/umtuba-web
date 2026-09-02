import type { Conversation } from "../types";
import ConversationListItem from "./ConversationListItem";
import ConversationSearch from "./ConversationSearch";

type ConversationListProps = {
  conversations: Conversation[];
  selectedId: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyHint?: string;
  onOpenCamera?: () => void;
  cameraLabel?: string;
};

export default function ConversationList({
  conversations,
  selectedId,
  searchQuery,
  onSearchChange,
  onSelect,
  loading = false,
  error = null,
  onRetry,
  emptyHint = "Message a creator from their profile or Discover to begin.",
  onOpenCamera,
  cameraLabel = "Camera",
}: ConversationListProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
      <div className="border-b border-white/10 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">
          Inbox
        </p>
        <ConversationSearch value={searchQuery} onChange={onSearchChange} />
        {onOpenCamera ? (
          <button
            type="button"
            onClick={onOpenCamera}
            className="mt-3 flex min-h-11 w-full items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-sm font-black text-amber-100"
          >
            {cameraLabel}
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {loading ? (
          <p className="px-3 py-8 text-center text-sm text-white/40" role="status">
            Loading conversations…
          </p>
        ) : error ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
              >
                Try again
              </button>
            ) : null}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-white/50">
              {searchQuery.trim()
                ? "No conversations match your search."
                : emptyHint}
            </p>
            {!searchQuery.trim() ? (
              <p className="mt-2 text-xs text-white/35">
                Send a private visual from the camera. It stays in Messages, not UM Life.
              </p>
            ) : null}
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              selected={conversation.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </aside>
  );
}
