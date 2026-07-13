"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  listConversationsAction,
  listMessagesAction,
  markConversationReadAction,
  openDirectConversationAction,
  sendMessageAction,
  setTypingAction,
} from "../actions/messenger";
import ConversationList from "./components/ConversationList";
import ChatWindow from "./components/ChatWindow";
import MessagesShell from "./components/MessagesShell";
import {
  formatMessageTime,
  type Conversation,
  type Message,
} from "./types";

function createClientId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type MessagesExperienceProps = {
  initialUserId: string;
  initialConversations: Conversation[];
  initialError?: string | null;
};

export default function MessagesExperience({
  initialUserId,
  initialConversations,
  initialError = null,
}: MessagesExperienceProps) {
  const searchParams = useSearchParams();
  const creatorId = searchParams.get("creatorId");
  const creatorName = searchParams.get("creatorName");
  const intent = searchParams.get("intent");

  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId] = useState(initialUserId);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(initialError);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const typingTimerRef = useRef<number | null>(null);
  const typingActiveRef = useRef(false);
  const openedPeerRef = useRef<string | null>(null);
  const threadRequestRef = useRef(0);
  const sendingRef = useRef(false);
  const selectedIdRef = useRef<string | null>(null);

  const profileHint =
    intent === "profile" && (creatorName || creatorId)
      ? `Creator profile · ${creatorName?.trim() || "Creator"}`
      : null;

  function clearTypingTimer() {
    if (typingTimerRef.current != null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }

  function clearTypingState(conversationId: string | null) {
    clearTypingTimer();
    if (typingActiveRef.current && conversationId) {
      typingActiveRef.current = false;
      void setTypingAction(conversationId, false);
    } else {
      typingActiveRef.current = false;
    }
  }

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    return () => {
      const conversationId = selectedIdRef.current;
      if (typingTimerRef.current != null) {
        window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      if (typingActiveRef.current && conversationId) {
        typingActiveRef.current = false;
        void setTypingAction(conversationId, false);
      }
    };
  }, []);

  async function loadInbox() {
    setListLoading(true);
    setListError(null);

    const listResult = await listConversationsAction();

    if (!listResult.ok) {
      setListError(listResult.message);
      setConversations([]);
      setListLoading(false);
      return;
    }

    setConversations(listResult.conversations);
    setListLoading(false);
  }

  async function loadThread(conversationId: string) {
    const requestId = ++threadRequestRef.current;
    setThreadLoading(true);
    setThreadError(null);

    const result = await listMessagesAction(conversationId);

    if (requestId !== threadRequestRef.current) {
      return;
    }

    if (!result.ok) {
      setThreadError(result.message);
      setThreadLoading(false);
      return;
    }

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: result.messages,
              hasMoreMessages: result.hasMore,
              nextMessagesCursor: result.nextCursor,
              unreadCount: 0,
            }
          : conversation
      )
    );

    const latest = result.messages[result.messages.length - 1];
    void markConversationReadAction(conversationId, latest?.id ?? null);
    setThreadLoading(false);
  }

  const openPeerFromQuery = useEffectEvent(async (peerId: string) => {
    const openResult = await openDirectConversationAction(peerId);

    if (!openResult.ok) {
      setListError(openResult.message);
      return;
    }

    await loadInbox();
    setSelectedId(openResult.conversationId);
    setMobileShowChat(true);
    await loadThread(openResult.conversationId);
  });

  // Deep-link: open/create DM with verified creatorId only (name is display hint).
  useEffect(() => {
    if (!creatorId || openedPeerRef.current === creatorId) {
      return;
    }

    openedPeerRef.current = creatorId;
    void openPeerFromQuery(creatorId);
  }, [creatorId]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((conversation) => {
      return (
        conversation.peerName.toLowerCase().includes(query) ||
        conversation.lastMessagePreview.toLowerCase().includes(query)
      );
    });
  }, [conversations, searchQuery]);

  const selected =
    conversations.find((conversation) => conversation.id === selectedId) ??
    null;

  async function handleSelect(id: string) {
    if (id !== selectedId) {
      clearTypingState(selectedId);
    }
    setSelectedId(id);
    setMobileShowChat(true);
    setSendError(null);
    await loadThread(id);
  }

  function handleBack() {
    setMobileShowChat(false);
  }

  async function handleLoadOlder() {
    if (!selectedId || !selected?.nextMessagesCursor || loadingOlder) {
      return;
    }

    const conversationId = selectedId;
    const requestId = threadRequestRef.current;
    setLoadingOlder(true);
    const result = await listMessagesAction(
      conversationId,
      selected.nextMessagesCursor
    );

    if (requestId !== threadRequestRef.current) {
      setLoadingOlder(false);
      return;
    }

    if (!result.ok) {
      setThreadError(result.message);
      setLoadingOlder(false);
      return;
    }

    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        const existingIds = new Set(conversation.messages.map((m) => m.id));
        const older = result.messages.filter((m) => !existingIds.has(m.id));

        return {
          ...conversation,
          messages: [...older, ...conversation.messages],
          hasMoreMessages: result.hasMore,
          nextMessagesCursor: result.nextCursor,
        };
      })
    );
    setLoadingOlder(false);
  }

  async function handleSend(text: string) {
    if (!selectedId || !currentUserId || sendingRef.current) {
      return;
    }

    const conversationId = selectedId;
    const clientId = createClientId();
    const optimistic: Message = {
      id: `local-${clientId}`,
      conversationId,
      senderId: currentUserId,
      text: text.trim(),
      sentAt: new Date().toISOString(),
      isMine: true,
      status: "sending",
      clientId,
    };

    sendingRef.current = true;
    setSending(true);
    setSendError(null);
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        return {
          ...conversation,
          isTyping: false,
          lastMessagePreview: optimistic.text,
          lastMessageAt: optimistic.sentAt,
          messages: [...conversation.messages, optimistic],
        };
      })
    );

    if (typingActiveRef.current) {
      typingActiveRef.current = false;
      clearTypingTimer();
      void setTypingAction(conversationId, false);
    }

    const result = await sendMessageAction({
      conversationId,
      body: text,
      clientId,
    });

    if (!result.ok) {
      setSendError(result.message);
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          return {
            ...conversation,
            messages: conversation.messages.map((message) =>
              message.clientId === clientId
                ? { ...message, status: "failed" as const }
                : message
            ),
          };
        })
      );
      sendingRef.current = false;
      setSending(false);
      return;
    }

    setConversations((prev) =>
      prev
        .map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          const withoutOptimistic = conversation.messages.filter(
            (message) => message.clientId !== clientId
          );

          return {
            ...conversation,
            lastMessagePreview: result.message.text,
            lastMessageAt: result.message.sentAt,
            messages: [...withoutOptimistic, result.message],
          };
        })
        .sort((a, b) => {
          const aTime = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
          const bTime = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
          return bTime - aTime;
        })
    );
    sendingRef.current = false;
    setSending(false);
  }

  function handleComposerTyping() {
    if (!selectedId || sending) {
      return;
    }

    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      void setTypingAction(selectedId, true);
    }

    clearTypingTimer();

    typingTimerRef.current = window.setTimeout(() => {
      typingActiveRef.current = false;
      void setTypingAction(selectedId, false);
    }, 1800);
  }

  return (
    <MessagesShell>
      {profileHint ? (
        <div className="mb-3 flex justify-center">
          <p className="rounded-full border border-blue-400/30 bg-blue-500/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100">
            {profileHint}
          </p>
        </div>
      ) : null}

      <div className="grid min-h-[calc(100vh-7.5rem)] flex-1 gap-3 md:grid-cols-[340px_1fr] md:gap-4">
        <div
          className={`min-h-0 ${
            mobileShowChat ? "hidden md:block" : "block"
          }`}
        >
          <ConversationList
            conversations={filtered}
            selectedId={selectedId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelect={(id) => void handleSelect(id)}
            loading={listLoading}
            error={listError}
            onRetry={() => void loadInbox()}
            emptyHint={
              creatorName
                ? `Start chatting with ${creatorName}`
                : "Message a creator from their profile to begin."
            }
          />
        </div>

        <div
          className={`min-h-0 ${
            mobileShowChat ? "block" : "hidden md:block"
          }`}
        >
          <ChatWindow
            conversation={selected}
            onSend={(text) => void handleSend(text)}
            onBack={handleBack}
            showBack={mobileShowChat}
            loading={threadLoading}
            error={threadError || sendError}
            onLoadOlder={
              selected?.hasMoreMessages
                ? () => void handleLoadOlder()
                : undefined
            }
            loadingOlder={loadingOlder}
            onComposerTyping={handleComposerTyping}
            composerDisabled={sending}
            activityLabel={
              selected?.lastMessageAt
                ? `Updated ${formatMessageTime(selected.lastMessageAt)}`
                : undefined
            }
          />
        </div>
      </div>
    </MessagesShell>
  );
}
