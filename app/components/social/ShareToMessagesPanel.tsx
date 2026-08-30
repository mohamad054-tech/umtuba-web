"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslation } from "../i18n";
import {
  listConversationsAction,
  openDirectConversationAction,
  sendMessageAction,
} from "../../actions/messenger";
import { recordShareAction } from "../../actions/socialInteractions";
import { globalSearchAction } from "../../actions/search";
import { APP_ROUTES } from "../../lib/nav";
import {
  buildPostShareUrl,
  getOrCreateViewerKey,
} from "../../lib/social/shareAndViews";
import { useDialogA11y } from "../../lib/product/useDialogA11y";
import { sanitizeUserFacingMessage } from "../../lib/product/userFacingMessage";
import type { Conversation } from "../../messages/types";
import type { SearchResultItem } from "../../../lib/search/types";

type ShareToMessagesPanelProps = {
  open: boolean;
  postId: number;
  caption?: string;
  returnPath?: string;
  onClose: () => void;
  onSent?: (shares?: number) => void;
};

export default function ShareToMessagesPanel({
  open,
  postId,
  caption = "",
  returnPath = APP_ROUTES.home,
  onClose,
  onSent,
}: ShareToMessagesPanelProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [people, setPeople] = useState<SearchResultItem[]>([]);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);

  useDialogA11y({
    open,
    onClose,
    containerRef: panelRef,
    initialFocusRef: closeRef,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setLoadError(null);
    setRequiresAuth(false);
    setSentId(null);

    void (async () => {
      const result = await listConversationsAction();
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setRequiresAuth(Boolean(result.requiresAuth));
        setLoadError(
          sanitizeUserFacingMessage(
            result.message,
            t("social.messages.signIn")
          )
        );
        setConversations([]);
        return;
      }
      setConversations(result.conversations);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, t]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const term = query.trim();
    if (term.length < 2) {
      setPeople([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void globalSearchAction({
        query: term,
        tab: "people",
        limit: 8,
        remember: false,
      }).then((result) => {
        if (result.ok) {
          setPeople(result.result.items.filter((item) => item.entityType === "person"));
        }
      });
    }, 280);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  if (!open) {
    return null;
  }

  function redirectToLogin() {
    router.push(
      `${APP_ROUTES.login}?next=${encodeURIComponent(returnPath)}`
    );
  }

  async function deliverToConversation(conversationId: string) {
    setLoadError(null);

    const url = buildPostShareUrl(postId, "discover");
    const body = [note.trim(), caption.trim(), url].filter(Boolean).join("\n");
    const result = await sendMessageAction({ conversationId, body });

    if (!result.ok) {
      if (result.requiresAuth) {
        redirectToLogin();
      } else {
        setLoadError(sanitizeUserFacingMessage(result.message, t("status.error")));
      }
      setSendingId(null);
      return;
    }

    const share = await recordShareAction(postId, getOrCreateViewerKey());
    if (share.ok) {
      onSent?.(share.shares);
    } else {
      onSent?.();
    }

    setSentId(conversationId);
    setSendingId(null);
    window.setTimeout(() => {
      onClose();
    }, 700);
  }

  async function sendToConversation(conversationId: string) {
    if (sendingId) {
      return;
    }

    setSendingId(conversationId);
    await deliverToConversation(conversationId);
  }

  async function sendToPerson(userId: string) {
    if (sendingId) {
      return;
    }

    setSendingId(userId);
    const opened = await openDirectConversationAction(userId);
    if (!opened.ok) {
      if (opened.requiresAuth) {
        redirectToLogin();
      } else {
        setLoadError(sanitizeUserFacingMessage(opened.message, t("status.error")));
      }
      setSendingId(null);
      return;
    }

    await deliverToConversation(opened.conversationId);
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 p-3 sm:items-center">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-to-messages-title"
        className="flex max-h-[min(36rem,88dvh)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-amber-400/20 bg-[#0b0b18] text-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p
              id="share-to-messages-title"
              className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200/80"
            >
              {t("social.messages.sendTitle")}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="watch-focus-ring rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/10"
          >
            {t("social.messages.close")}
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          {requiresAuth ? (
            <button
              type="button"
              onClick={redirectToLogin}
              className="w-full rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-50"
            >
              {t("social.messages.signIn")}
            </button>
          ) : null}

          {loadError && !requiresAuth ? (
            <p className="text-sm text-red-300" role="alert">
              {loadError}
            </p>
          ) : null}

          <label className="sr-only" htmlFor="share-to-messages-search">
            {t("social.messages.search")}
          </label>
          <input
            id="share-to-messages-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("social.messages.search")}
            className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm outline-none placeholder:text-white/35 focus:border-amber-300/40"
            dir="auto"
          />
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("social.messages.notePlaceholder")}
            rows={2}
            maxLength={280}
            dir="auto"
            className="w-full resize-none rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm outline-none placeholder:text-white/35 focus:border-amber-300/40"
          />
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-5">
          {people.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                {t("social.mention.people")}
              </p>
              {people.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  disabled={sendingId != null}
                  onClick={() => void sendToPerson(person.id)}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-start hover:bg-white/[0.07] disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">
                      {person.title}
                    </span>
                    <span className="block truncate text-[11px] text-white/45">
                      {person.subtitle}
                    </span>
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-200">
                    {sendingId === person.id
                      ? t("social.messages.sending")
                      : sentId === person.id
                        ? t("social.shareSent")
                        : t("social.messages.send")}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {conversations.length === 0 && people.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/45">
              {t("social.messages.emptyInbox")}
            </p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                disabled={sendingId != null}
                onClick={() => void sendToConversation(conversation.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-start hover:bg-white/[0.07] disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    {conversation.peerName}
                  </span>
                  <span className="block truncate text-[11px] text-white/45" dir="auto">
                    {conversation.lastMessagePreview}
                  </span>
                </span>
                <span className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-200">
                  {sendingId === conversation.id
                    ? t("social.messages.sending")
                    : sentId === conversation.id
                      ? t("social.shareSent")
                      : t("social.messages.send")}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
