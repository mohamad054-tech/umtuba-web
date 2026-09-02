"use client";

import { useMemo, useState } from "react";
import UmtubaStackedLogo from "../components/brand/UmtubaStackedLogo";
import { LanguageSelector, useTranslation } from "../components/i18n";
import { buildUmStreakPreviewStates, UM_STREAK_DEMO_LABEL } from "../../lib/umStreak/fixtures";
import type { Conversation, Message } from "../messages/types";
import ChatHeader from "../messages/components/ChatHeader";
import ChatWindow from "../messages/components/ChatWindow";
import ConversationList from "../messages/components/ConversationList";
import MessageBubble from "../messages/components/MessageBubble";
import QuickSocialCamera, {
  type CapturedVisual,
} from "../messages/components/QuickSocialCamera";
import UmStreakBadges from "../messages/components/UmStreakBadges";
import UmStreakStatus from "../messages/components/UmStreakStatus";

export default function UmStreakPreviewClient() {
  const { t, locale, direction } = useTranslation();
  const states = useMemo(() => buildUmStreakPreviewStates(), []);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [inbox, setInbox] = useState<Conversation[]>(states.inbox);
  const [selectedId, setSelectedId] = useState(states.conversationActive.id);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);
  const [receivedUnopened, setReceivedUnopened] = useState(states.receivedUnopened);

  const activeConversation =
    inbox.find((conversation) => conversation.id === selectedId) ?? inbox[0];

  function appendDemoVisual(captured: CapturedVisual) {
    const now = new Date().toISOString();
    setInbox((prev) =>
      prev.map((conversation) => {
        if (!captured.conversationIds.includes(conversation.id)) {
          return conversation;
        }
        const sent: Message = {
          id: `demo-sent-${conversation.id}-${now}`,
          conversationId: conversation.id,
          senderId: states.currentUserId,
          text: captured.caption || UM_STREAK_DEMO_LABEL,
          sentAt: now,
          isMine: true,
          messageType: captured.mediaType,
          visual: {
            mediaType: captured.mediaType,
            caption: captured.caption || null,
            viewed: false,
            openedAt: null,
            expirationPolicy: "view_once",
            previewUrl: captured.previewUrl,
            demoOnly: true,
          },
        };
        return {
          ...conversation,
          lastMessagePreview: captured.caption || UM_STREAK_DEMO_LABEL,
          lastMessageAt: now,
          messages: [...conversation.messages, sent],
        };
      })
    );
    setDemoNotice(`${UM_STREAK_DEMO_LABEL} — ${t("umStreak.send")}`);
    setCameraOpen(false);
  }

  function handleOpenVisual(message: Message) {
    if (!message.visual?.demoOnly || (message.visual.viewed && !message.isMine)) {
      return;
    }
    if (message.id === receivedUnopened.id) {
      const now = new Date().toISOString();
      setReceivedUnopened({
        ...receivedUnopened,
        visual: receivedUnopened.visual
          ? {
              ...receivedUnopened.visual,
              viewed: true,
              openedAt: now,
            }
          : receivedUnopened.visual,
      });
    }
    const now = new Date().toISOString();
    setInbox((prev) =>
      prev.map((conversation) =>
        conversation.id === message.conversationId
          ? {
              ...conversation,
              messages: conversation.messages.map((item) =>
                item.id === message.id && item.visual
                  ? {
                      ...item,
                      visual: {
                        ...item.visual,
                        viewed: true,
                        openedAt: now,
                        previewUrl: item.visual.previewUrl,
                      },
                    }
                  : item
              ),
            }
          : conversation
      )
    );
    window.setTimeout(() => {
      setInbox((prev) =>
        prev.map((conversation) =>
          conversation.id === message.conversationId
            ? {
                ...conversation,
                messages: conversation.messages.map((item) =>
                  item.id === message.id && item.visual && !item.isMine
                    ? {
                        ...item,
                        visual: {
                          ...item.visual,
                          previewUrl: null,
                        },
                      }
                    : item
                ),
              }
            : conversation
        )
      );
    }, 2500);
  }

  return (
    <main
      className="min-h-screen bg-[#050510] px-3 py-4 text-white md:px-6"
      data-um-streak-preview="true"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col items-start gap-3 border-b border-amber-300/20 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-start gap-3 md:flex-row md:items-center">
            <UmtubaStackedLogo size="nav" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">
                LEARN · CREATE · SHARE
              </p>
              <h1 className="text-2xl font-black">{t("umStreak.previewTitle")}</h1>
              <p className="text-sm text-amber-100/80">{t("umStreak.demoOnly")}</p>
              <p className="text-sm text-white/60">{t("umStreak.notPublic")}</p>
            </div>
          </div>
          <LanguageSelector
            id="um-streak-preview-locale"
            tone="dark"
            variant="compact"
          />
        </header>

        {demoNotice ? (
          <p className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100" role="status">
            {demoNotice}
          </p>
        ) : null}

        <section aria-label={t("messages.title")} className="space-y-3">
          <h2 className="text-sm font-black text-amber-200">1–3. Conversation + camera</h2>
          <div className="grid min-h-[28rem] gap-3 md:grid-cols-[300px_1fr]">
            <ConversationList
              conversations={inbox}
              selectedId={selectedId}
              searchQuery=""
              onSearchChange={() => undefined}
              onSelect={setSelectedId}
              onOpenCamera={() => setCameraOpen(true)}
              cameraLabel={t("umStreak.camera")}
            />
            <ChatWindow
              conversation={activeConversation}
              currentUserId={states.currentUserId}
              onSend={() => false}
              onOpenCamera={() => setCameraOpen(true)}
              onOpenVisual={handleOpenVisual}
              sendError={null}
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <h2 className="mb-2 text-sm font-black text-amber-200">
              4. Received visual
            </h2>
            <MessageBubble
              message={receivedUnopened}
              currentUserId={states.currentUserId}
              onOpenVisual={handleOpenVisual}
            />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-black text-amber-200">
              4b. Opened / view once
            </h2>
            <MessageBubble
              message={states.receivedOpened}
              currentUserId={states.currentUserId}
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 p-4">
            <h2 className="mb-2 text-sm font-black text-amber-200">5. Started</h2>
            <ChatHeader conversation={states.conversationStarted} />
            <UmStreakStatus streak={states.started} />
          </div>
          <div className="rounded-3xl border border-white/10 p-4">
            <h2 className="mb-2 text-sm font-black text-amber-200">6. Active</h2>
            <ChatHeader conversation={states.conversationActive} />
            <UmStreakStatus streak={states.active} />
          </div>
          <div className="rounded-3xl border border-white/10 p-4">
            <h2 className="mb-2 text-sm font-black text-amber-200">
              7. Waiting for friend
            </h2>
            <ChatHeader conversation={states.conversationWaiting} />
            <UmStreakStatus streak={states.waiting} />
          </div>
          <div className="rounded-3xl border border-white/10 p-4">
            <h2 className="mb-2 text-sm font-black text-amber-200">
              8. Your turn today
            </h2>
            <ChatHeader conversation={states.conversationReply} />
            <UmStreakStatus streak={states.youNeedToReply} />
          </div>
          <div className="rounded-3xl border border-white/10 p-4">
            <h2 className="mb-2 text-sm font-black text-amber-200">
              9. Keep it going today
            </h2>
            <ChatHeader conversation={states.conversationAtRisk} />
            <UmStreakStatus streak={states.atRisk} />
          </div>
          <div className="rounded-3xl border border-white/10 p-4">
            <h2 className="mb-2 text-sm font-black text-amber-200">
              10. Milestone badges
            </h2>
            <UmStreakStatus streak={states.milestone} />
            <div className="mt-3">
              <UmStreakBadges streak={states.milestone} />
            </div>
          </div>
        </section>

        <section
          className="rounded-3xl border border-amber-300/20 p-4"
          data-um-streak-rtl={direction}
        >
          <h2 className="mb-2 text-sm font-black text-amber-200">
            11. Arabic RTL
          </h2>
          <p className="text-sm text-white/70">
            Locale: {locale}. Direction: {direction}. Use the language control to
            switch to العربية.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-300/20 p-4">
          <h2 className="mb-2 text-sm font-black text-amber-200">
            12. Mobile one-hand width
          </h2>
          <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-[2rem] border border-white/10">
            <ChatWindow
              conversation={activeConversation}
              currentUserId={states.currentUserId}
              onSend={() => false}
              onOpenCamera={() => setCameraOpen(true)}
              onOpenVisual={handleOpenVisual}
              sendError={null}
              showBack
            />
          </div>
        </section>
      </div>

      <QuickSocialCamera
        open={cameraOpen}
        conversations={inbox}
        defaultConversationId={selectedId}
        onClose={() => setCameraOpen(false)}
        onCapture={appendDemoVisual}
      />
    </main>
  );
}
