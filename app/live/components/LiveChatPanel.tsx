"use client";

import { memo, useEffect, useRef, useState, type FormEvent } from "react";
import {
  LIVE_CHAT_MAX_LENGTH,
  type LiveChatMessage as LiveChatMessageType,
  type LiveRealtimeState,
} from "../types";
import LiveChatMessage from "./LiveChatMessage";

type LiveChatPanelProps = {
  messages: LiveChatMessageType[];
  onSend: (text: string) => void;
  canSend?: boolean;
  authHint?: string | null;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  sending?: boolean;
  loading?: boolean;
  realtimeState?: LiveRealtimeState;
};

function LiveChatPanelComponent({
  messages,
  onSend,
  canSend = true,
  authHint = null,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  sending = false,
  loading = false,
  realtimeState = "connected",
}: LiveChatPanelProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;

    if (el.scrollTop < 48 && hasMore && onLoadMore && !loadingMore) {
      onLoadMore();
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !canSend || sending) return;
    onSend(text);
    setDraft("");
    stickToBottomRef.current = true;
  }

  const liveLabel =
    realtimeState === "connected"
      ? "Live"
      : realtimeState === "reconnecting"
        ? "Reconnecting"
        : realtimeState === "error"
          ? "Offline"
          : "Connecting";

  return (
    <aside className="flex h-full min-h-[20rem] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#080816]/75 backdrop-blur-xl sm:min-h-[22rem] md:min-h-0 md:rounded-[32px]">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-blue-300">
            Live chat
          </p>
          <p className="mt-0.5 truncate text-sm font-black text-white">
            {loading ? "Loading…" : `${messages.length} messages`}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
            realtimeState === "connected"
              ? "border-red-400/25 bg-red-500/10 text-red-200"
              : "border-amber-400/25 bg-amber-500/10 text-amber-100"
          }`}
          aria-live="polite"
          aria-label={`Chat connection: ${liveLabel}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              realtimeState === "connected"
                ? "animate-pulse bg-red-500"
                : "bg-amber-400"
            }`}
          />
          {liveLabel}
        </span>
      </div>

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex gap-2.5">
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
                  <div className="h-4 w-full max-w-[85%] animate-pulse rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {hasMore ? (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="mx-auto block rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/55 transition hover:bg-white/10 disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load earlier messages"}
              </button>
            ) : null}

            {messages.length === 0 ? (
              <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 px-4 text-center">
                <p className="text-sm font-black text-white/80">
                  No messages yet
                </p>
                <p className="max-w-[16rem] text-xs leading-5 text-white/40">
                  Be the first to say something — chat updates live for everyone
                  in the room.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <LiveChatMessage key={message.id} message={message} />
              ))
            )}
          </>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        {authHint ? (
          <p className="mb-2 text-xs text-amber-200/80">{authHint}</p>
        ) : null}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={canSend ? "Say something..." : "Sign in to chat"}
            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25 disabled:opacity-50"
            maxLength={LIVE_CHAT_MAX_LENGTH}
            disabled={!canSend || sending}
            autoComplete="off"
          />
          <button
            type="submit"
            className="shrink-0 rounded-2xl bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-white/90 disabled:opacity-40"
            disabled={!canSend || sending || !draft.trim()}
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
      </form>
    </aside>
  );
}

const LiveChatPanel = memo(LiveChatPanelComponent);
export default LiveChatPanel;
