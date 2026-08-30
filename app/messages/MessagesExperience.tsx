"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  deleteMessageForEveryoneAction,
  deleteMessageForMeAction,
  editMessageAction,
  getConversationPeerStateAction,
  listConversationsAction,
  listMessagesAction,
  markConversationReadAction,
  openDirectConversationAction,
  sendMessageAction,
  setConversationMuteAction,
  setTypingAction,
  toggleReactionAction,
} from "../actions/messenger";
import { buildConversationHref, isUuid } from "../lib/nav";
import { sanitizeUserFacingMessage } from "../lib/product/userFacingMessage";
import ConversationList from "./components/ConversationList";
import ChatWindow from "./components/ChatWindow";
import MessagesShell from "./components/MessagesShell";
import StartConversationPanel from "./components/StartConversationPanel";
import { useTranslation } from "../components/i18n";
import { useMessengerRealtime } from "./hooks/useMessengerRealtime";
import { applyReactionToggle } from "./lib/reactionState";
import {
  applyInboxParticipantPatch,
  applyPeerState,
  nextUnreadOnPeerMessage,
  rollbackOptimisticSend,
} from "./lib/threadState";
import { isConversationCurrentlyMuted } from "./types";
import {
  formatMessageTime,
  peerGradientFromId,
  initialsFromName,
  type Conversation,
  type Message,
  type MessageReactionEmoji,
  type MuteOption,
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
  ownUsername?: string | null;
};

export default function MessagesExperience({
  initialUserId,
  initialConversations,
  initialError = null,
  ownUsername = null,
}: MessagesExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const conversationParam = searchParams.get("conversation");
  const messageParam = searchParams.get("message");
  const creatorId = searchParams.get("creatorId");
  const creatorName = searchParams.get("creatorName");

  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    conversationParam && isUuid(conversationParam) ? conversationParam : null
  );
  const [mobileShowChat, setMobileShowChat] = useState(() =>
    Boolean(conversationParam && isUuid(conversationParam))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId] = useState(initialUserId);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(initialError);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [mutePending, setMutePending] = useState(false);
  const [muteError, setMuteError] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(
    () => searchParams.get("start") === "1"
  );
  const typingTimerRef = useRef<number | null>(null);
  const typingActiveRef = useRef(false);
  const openedPeerRef = useRef<string | null>(null);
  const openedConversationRef = useRef<string | null>(null);
  const threadRequestRef = useRef(0);
  const sendingRef = useRef(false);
  const selectedIdRef = useRef<string | null>(null);

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

  function syncConversationUrl(conversationId: string) {
    const href = buildConversationHref(conversationId);
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== href) {
      router.replace(href, { scroll: false });
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
      setListError(sanitizeUserFacingMessage(listResult.message));
      setConversations([]);
      setListLoading(false);
      return [] as Conversation[];
    }

    setConversations((prev) => {
      // Preserve in-memory thread messages while refreshing inbox metadata.
      const prevById = new Map(prev.map((c) => [c.id, c]));
      return listResult.conversations.map((conversation) => {
        const existing = prevById.get(conversation.id);
        if (!existing || existing.messages.length === 0) {
          return conversation;
        }
        return {
          ...conversation,
          messages: existing.messages,
          hasMoreMessages: existing.hasMoreMessages,
          nextMessagesCursor: existing.nextMessagesCursor,
          // Keep live peer typing / receipts until the next peer poll.
          isTyping: existing.isTyping,
          peerLastReadAt: existing.peerLastReadAt ?? conversation.peerLastReadAt,
        };
      });
    });
    setListLoading(false);
    return listResult.conversations;
  }

  async function loadThread(
    conversationId: string,
    peerHint?: string
  ): Promise<boolean> {
    const requestId = ++threadRequestRef.current;
    setThreadLoading(true);
    setThreadError(null);

    const inboxConversation = conversations.find((c) => c.id === conversationId);
    const result = await listMessagesAction(
      conversationId,
      null,
      inboxConversation?.peerLastReadAt ?? null
    );

    if (requestId !== threadRequestRef.current) {
      return false;
    }

    if (!result.ok) {
      setThreadError(sanitizeUserFacingMessage(result.message));
      setThreadLoading(false);
      return false;
    }

    setConversations((prev) => {
      const existing = prev.find((c) => c.id === conversationId);
      const peerName = peerHint?.trim() || existing?.peerName || "Conversation";

      if (!existing) {
        const stub: Conversation = {
          id: conversationId,
          peerId: "",
          peerName,
          peerInitials: initialsFromName(peerName),
          peerAvatarGradient: peerGradientFromId(conversationId),
          peerAvatarUrl: null,
          status: "offline",
          lastSeenLabel: "Just opened",
          unreadCount: 0,
          isTyping: false,
          lastMessagePreview: result.messages.at(-1)?.text ?? "",
          lastMessageAt: result.messages.at(-1)?.sentAt ?? null,
          messages: result.messages,
          hasMoreMessages: result.hasMore,
          nextMessagesCursor: result.nextCursor,
        };
        return [stub, ...prev];
      }

      return prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: result.messages,
              hasMoreMessages: result.hasMore,
              nextMessagesCursor: result.nextCursor,
              unreadCount: 0,
            }
          : conversation
      );
    });

    const latest = result.messages[result.messages.length - 1];
    void markConversationReadAction(conversationId, latest?.id ?? null);
    setThreadLoading(false);
    return true;
  }

  const openConversationFromQuery = useEffectEvent(
    async (conversationId: string): Promise<boolean> => {
      if (!isUuid(conversationId)) {
        setListError("Invalid conversation link.");
        return false;
      }

      setListError(null);
      setSendError(null);
      setThreadError(null);
      setReplyTo(null);
      setEditingMessage(null);
      setSelectedId(conversationId);
      setMobileShowChat(true);

      let inbox = conversations;
      if (!inbox.some((c) => c.id === conversationId)) {
        inbox = await loadInbox();
      }

      if (!inbox.some((c) => c.id === conversationId)) {
        console.warn(
          "[Messages] conversation not in inbox yet; opening thread directly",
          conversationId
        );
      }

      return loadThread(conversationId, creatorName ?? undefined);
    }
  );

  const openPeerFromQuery = useEffectEvent(async (peerId: string) => {
    if (!isUuid(peerId)) {
      setListError("Invalid user link.");
      return;
    }

    setListError(null);
    setThreadError(null);

    const openResult = await openDirectConversationAction(peerId);

    if (!openResult.ok) {
      console.error("[Messages] openDirectConversationAction failed:", openResult);
      setListError(sanitizeUserFacingMessage(openResult.message));
      return;
    }

    console.info(
      "[Messages] created/reused conversation",
      openResult.conversationId
    );

    openedConversationRef.current = openResult.conversationId;
    await loadInbox();
    setSelectedId(openResult.conversationId);
    setMobileShowChat(true);
    syncConversationUrl(openResult.conversationId);
    await loadThread(openResult.conversationId, creatorName ?? undefined);
  });

  useEffect(() => {
    if (!conversationParam) {
      return;
    }

    if (openedConversationRef.current === conversationParam) {
      return;
    }

    void openConversationFromQuery(conversationParam).then((ok) => {
      if (ok) {
        openedConversationRef.current = conversationParam;
      }
    });
  }, [conversationParam]);

  useEffect(() => {
    if (conversationParam || !creatorId) {
      return;
    }

    if (openedPeerRef.current === creatorId) {
      return;
    }

    openedPeerRef.current = creatorId;
    void openPeerFromQuery(creatorId);
  }, [conversationParam, creatorId]);

  const resyncMessenger = useEffectEvent(() => {
    void loadInbox();
    const conversationId = selectedIdRef.current;
    if (conversationId) {
      void loadThread(conversationId);
    }
  });

  useMessengerRealtime({
    conversationId: selectedId,
    currentUserId,
    enabled: Boolean(selectedId),
    onResync: resyncMessenger,
    onInboxParticipantChange: (row) => {
      const conversationId = row.conversation_id;
      if (!conversationId) {
        return;
      }
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }
          return applyInboxParticipantPatch(
            conversation,
            {
              unreadCount: row.unread_count,
              isMuted: row.is_muted,
              mutedUntil: row.muted_until,
            },
            {
              forceUnreadZero: selectedIdRef.current === conversationId,
            }
          );
        })
      );
    },
    onMessageInsert: (message) => {
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== message.conversationId) {
            return conversation;
          }
          if (conversation.messages.some((m) => m.id === message.id)) {
            return conversation;
          }
          if (
            message.clientId &&
            conversation.messages.some((m) => m.clientId === message.clientId)
          ) {
            return {
              ...conversation,
              messages: conversation.messages.map((m) =>
                m.clientId === message.clientId ? message : m
              ),
              lastMessagePreview: message.text,
              lastMessageAt: message.sentAt,
            };
          }
          const isSelected =
            selectedIdRef.current === message.conversationId;
          return {
            ...conversation,
            messages: [...conversation.messages, message],
            lastMessagePreview: message.text,
            lastMessageAt: message.sentAt,
            unreadCount: nextUnreadOnPeerMessage(
              conversation,
              message,
              isSelected
            ),
          };
        })
      );
      if (!message.isMine && selectedIdRef.current === message.conversationId) {
        void markConversationReadAction(message.conversationId, message.id);
      }
    },
    onMessageUpdate: (message) => {
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== message.conversationId) {
            return conversation;
          }
          return {
            ...conversation,
            messages: conversation.messages.map((m) =>
              m.id === message.id
                ? {
                    ...m,
                    ...message,
                    reactions: message.reactions ?? m.reactions,
                    replyPreview: message.replyPreview ?? m.replyPreview,
                  }
                : m
            ),
          };
        })
      );
    },
    onReactionsChange: (messageId, updater) => {
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== selectedIdRef.current) {
            return conversation;
          }
          return {
            ...conversation,
            messages: conversation.messages.map((m) =>
              m.id === messageId
                ? { ...m, reactions: updater(m.reactions) }
                : m
            ),
          };
        })
      );
    },
  });

  // Peer typing + last_read via RPC poll (peer participant rows blocked by RLS).
  useEffect(() => {
    if (!selectedId) {
      return;
    }

    let cancelled = false;

    async function pollPeers() {
      const conversationId = selectedId;
      if (!conversationId) {
        return;
      }
      const result = await getConversationPeerStateAction(conversationId);
      if (cancelled || !result.ok) {
        return;
      }
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? applyPeerState(conversation, {
                isTyping: result.isTyping,
                peerLastReadAt: result.peerLastReadAt,
              })
            : conversation
        )
      );
    }

    void pollPeers();
    const timer = window.setInterval(() => {
      void pollPeers();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedId]);

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
      setReplyTo(null);
      setEditingMessage(null);
      setMuteError(null);
    }
    setSelectedId(id);
    setMobileShowChat(true);
    setSendError(null);
    openedConversationRef.current = id;
    syncConversationUrl(id);
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
      selected.nextMessagesCursor,
      selected.peerLastReadAt ?? null
    );

    if (requestId !== threadRequestRef.current) {
      setLoadingOlder(false);
      return;
    }

    if (!result.ok) {
      setThreadError(sanitizeUserFacingMessage(result.message));
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

  async function handleSend(text: string): Promise<boolean> {
    if (!selectedId || !currentUserId || sendingRef.current) {
      return false;
    }

    const conversationId = selectedId;
    const clientId = createClientId();
    const body = text.trim();
    if (!body) {
      return false;
    }

    const replyTarget = replyTo;
    const optimistic: Message = {
      id: `local-${clientId}`,
      conversationId,
      senderId: currentUserId,
      text: body,
      sentAt: new Date().toISOString(),
      isMine: true,
      status: "sending",
      clientId,
      messageType: "text",
      replyToMessageId: replyTarget?.id ?? null,
      replyPreview: replyTarget
        ? {
            messageId: replyTarget.id,
            text: replyTarget.isDeleted
              ? "Message deleted"
              : replyTarget.text.slice(0, 120),
            senderId: replyTarget.senderId,
            unavailable: Boolean(replyTarget.isDeleted),
          }
        : null,
      receiptStatus: "sent",
    };

    sendingRef.current = true;
    setSending(true);
    setSendError(null);

    const existingConversation = conversations.find(
      (conversation) => conversation.id === conversationId
    );
    const previousPreview = existingConversation?.lastMessagePreview ?? "";
    const previousAt = existingConversation?.lastMessageAt ?? null;

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
      body,
      clientId,
      replyToMessageId: replyTarget?.id ?? null,
    });

    if (!result.ok) {
      // Preserve composer draft (composer keeps text when we return false).
      setSendError(sanitizeUserFacingMessage(result.message));
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          return rollbackOptimisticSend(
            conversation,
            clientId,
            previousPreview,
            previousAt
          );
        })
      );
      sendingRef.current = false;
      setSending(false);
      return false;
    }

    setReplyTo(null);
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
    return true;
  }

  async function handleSaveEdit(text: string): Promise<boolean> {
    if (!editingMessage) {
      return false;
    }

    const messageId = editingMessage.id;
    const conversationId = editingMessage.conversationId;
    setSendError(null);

    const result = await editMessageAction({ messageId, body: text });
    if (!result.ok) {
      setSendError(sanitizeUserFacingMessage(result.message));
      return false;
    }

    setEditingMessage(null);
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }
        return {
          ...conversation,
          messages: conversation.messages.map((m) =>
            m.id === messageId ? { ...m, ...result.message, reactions: m.reactions } : m
          ),
          lastMessagePreview:
            conversation.messages.at(-1)?.id === messageId
              ? result.message.text
              : conversation.lastMessagePreview,
        };
      })
    );
    return true;
  }

  async function handleDeleteForMe(message: Message) {
    const result = await deleteMessageForMeAction(message.id);
    if (!result.ok) {
      setSendError(sanitizeUserFacingMessage(result.message));
      return;
    }
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== message.conversationId) {
          return conversation;
        }
        return {
          ...conversation,
          messages: conversation.messages.filter((m) => m.id !== message.id),
        };
      })
    );
    if (replyTo?.id === message.id) {
      setReplyTo(null);
    }
    if (editingMessage?.id === message.id) {
      setEditingMessage(null);
    }
  }

  async function handleDeleteForEveryone(message: Message) {
    const result = await deleteMessageForEveryoneAction(message.id);
    if (!result.ok) {
      setSendError(sanitizeUserFacingMessage(result.message));
      return;
    }
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== message.conversationId) {
          return conversation;
        }
        return {
          ...conversation,
          messages: conversation.messages.map((m) =>
            m.id === message.id
              ? { ...m, ...result.message, reactions: undefined }
              : m
          ),
          lastMessagePreview:
            conversation.messages.at(-1)?.id === message.id
              ? result.message.text
              : conversation.lastMessagePreview,
        };
      })
    );
  }

  async function handleToggleReaction(
    message: Message,
    emoji: MessageReactionEmoji
  ) {
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== message.conversationId) {
          return conversation;
        }
        return {
          ...conversation,
          messages: conversation.messages.map((m) => {
            if (m.id !== message.id) return m;
            const existing = m.reactions?.find((r) => r.emoji === emoji);
            const removed = Boolean(existing?.reactedByMe);
            return {
              ...m,
              reactions: applyReactionToggle({
                reactions: m.reactions,
                emoji,
                removed,
              }),
            };
          }),
        };
      })
    );

    const result = await toggleReactionAction({
      messageId: message.id,
      emoji,
    });

    if (!result.ok) {
      setSendError(sanitizeUserFacingMessage(result.message));
      // Reload thread reactions on failure
      if (selectedId) {
        void loadThread(selectedId);
      }
    }
  }

  async function handleMute(option: MuteOption) {
    if (!selectedId) return;
    setMutePending(true);
    setMuteError(null);
    const result = await setConversationMuteAction({
      conversationId: selectedId,
      option,
    });
    setMutePending(false);

    if (!result.ok) {
      setMuteError(sanitizeUserFacingMessage(result.message));
      return;
    }

    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== selectedId) {
          return conversation;
        }
        if (option === "off") {
          return { ...conversation, isMuted: false, mutedUntil: null };
        }
        const mutedUntil =
          option === "forever"
            ? null
            : option === "1h"
              ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
              : option === "8h"
                ? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        return {
          ...conversation,
          isMuted: isConversationCurrentlyMuted({
            isMuted: true,
            mutedUntil,
          }),
          mutedUntil,
        };
      })
    );
  }

  function handleComposerTyping() {
    if (!selectedId || sending || editingMessage) {
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
            startConversationLabel={t("comms.startConversation")}
            onStartConversation={() => setStartOpen(true)}
            emptyHint={
              creatorName
                ? `Start chatting with ${creatorName}`
                : "Message a creator from their profile or Discover to begin."
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
            currentUserId={currentUserId}
            onSend={handleSend}
            onBack={handleBack}
            showBack={mobileShowChat}
            loading={threadLoading}
            error={threadError}
            sendError={sendError}
            onRetryThread={
              selectedId
                ? () => {
                    void loadThread(selectedId).then((ok) => {
                      if (ok && conversationParam === selectedId) {
                        openedConversationRef.current = selectedId;
                      }
                    });
                  }
                : undefined
            }
            focusMessageId={
              messageParam && isUuid(messageParam) ? messageParam : null
            }
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
            replyTo={replyTo}
            onReply={(message) => {
              setEditingMessage(null);
              setReplyTo(message);
            }}
            onCancelReply={() => setReplyTo(null)}
            editingMessage={editingMessage}
            onEdit={(message) => {
              setReplyTo(null);
              setEditingMessage(message);
            }}
            onCancelEdit={() => setEditingMessage(null)}
            onSaveEdit={handleSaveEdit}
            onDeleteForMe={(message) => void handleDeleteForMe(message)}
            onDeleteForEveryone={(message) =>
              void handleDeleteForEveryone(message)
            }
            onToggleReaction={(message, emoji) =>
              void handleToggleReaction(message, emoji)
            }
            onMute={(option) => void handleMute(option)}
            mutePending={mutePending}
            muteError={muteError}
          />
        </div>
      </div>
      {startOpen ? (
        <StartConversationPanel
          currentUserId={currentUserId}
          ownUsername={ownUsername}
          onClose={() => setStartOpen(false)}
        />
      ) : null}
    </MessagesShell>
  );
}
