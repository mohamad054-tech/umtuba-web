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
  startConversationLabel?: string;
  onStartConversation?: () => void;
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
  startConversationLabel,
  onStartConversation,
}: ConversationListProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
      <div className="border-b border-white/10 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">
            Inbox
          </p>
          {onStartConversation && startConversationLabel ? (
            <button
              type="button"
              onClick={onStartConversation}
              className="watch-focus-ring rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-black"
            >
              {startConversationLabel}
            </button>
          ) : null}
        </div>
        <ConversationSearch value={searchQuery} onChange={onSearchChange} />
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
                Text text messaging only — no attachments or voice yet.
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
