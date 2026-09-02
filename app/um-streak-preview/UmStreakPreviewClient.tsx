"use client";

import { useMemo, useState } from "react";
import UmtubaStackedLogo from "../components/brand/UmtubaStackedLogo";
import { useTranslation } from "../components/i18n";
import { buildUmStreakPreviewStates } from "../../lib/umStreak/fixtures";
import ChatHeader from "../messages/components/ChatHeader";
import ChatWindow from "../messages/components/ChatWindow";
import ConversationList from "../messages/components/ConversationList";
import MessageBubble from "../messages/components/MessageBubble";
import QuickSocialCamera from "../messages/components/QuickSocialCamera";
import UmStreakBadges from "../messages/components/UmStreakBadges";
import UmStreakStatus from "../messages/components/UmStreakStatus";

export default function UmStreakPreviewClient() {
  const { t, locale } = useTranslation();
  const states = useMemo(() => buildUmStreakPreviewStates(), []);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState(
    states.conversationActive
  );

  return (
    <main className="min-h-screen bg-[#050510] px-3 py-4 text-white md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col items-start gap-3 border-b border-amber-300/20 pb-4 md:flex-row md:items-center">
          <UmtubaStackedLogo size="nav" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">
              LEARN · CREATE · SHARE
            </p>
            <h1 className="text-2xl font-black">{t("umStreak.previewTitle")}</h1>
            <p className="text-sm text-amber-100/80">{t("umStreak.demoOnly")}</p>
            <p className="text-sm text-white/60">{t("umStreak.notPublic")}</p>
          </div>
        </header>

        <section aria-label={t("messages.title")} className="space-y-3">
          <h2 className="text-sm font-black text-amber-200">1–3. Conversation + camera</h2>
          <div className="grid min-h-[28rem] gap-3 md:grid-cols-[300px_1fr]">
            <ConversationList
              conversations={[
                states.conversationActive,
                states.conversationWaiting,
                states.conversationAtRisk,
              ]}
              selectedId={activeConversation.id}
              searchQuery=""
              onSearchChange={() => undefined}
              onSelect={() => setActiveConversation(states.conversationActive)}
              onOpenCamera={() => setCameraOpen(true)}
              cameraLabel={t("umStreak.camera")}
            />
            <ChatWindow
              conversation={activeConversation}
              currentUserId={states.currentUserId}
              onSend={() => false}
              onOpenCamera={() => setCameraOpen(true)}
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
              message={states.receivedUnopened}
              currentUserId={states.currentUserId}
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
            <h2 className="mb-2 text-sm font-black text-amber-200">5. Active</h2>
            <ChatHeader conversation={states.conversationActive} />
            <UmStreakStatus streak={states.active} />
          </div>
          <div className="rounded-3xl border border-white/10 p-4">
            <h2 className="mb-2 text-sm font-black text-amber-200">
              6. Waiting for friend
            </h2>
            <ChatHeader conversation={states.conversationWaiting} />
            <UmStreakStatus streak={states.waiting} />
          </div>
          <div className="rounded-3xl border border-white/10 p-4">
            <h2 className="mb-2 text-sm font-black text-amber-200">
              7. Keep it going today
            </h2>
            <ChatHeader conversation={states.conversationAtRisk} />
            <UmStreakStatus streak={states.atRisk} />
          </div>
          <div className="rounded-3xl border border-white/10 p-4">
            <h2 className="mb-2 text-sm font-black text-amber-200">
              8. Milestone badges
            </h2>
            <UmStreakStatus streak={states.milestone} />
            <div className="mt-3">
              <UmStreakBadges streak={states.milestone} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-300/20 p-4">
          <h2 className="mb-2 text-sm font-black text-amber-200">
            9–10. Arabic RTL + mobile width
          </h2>
          <p className="text-sm text-white/70">
            Locale: {locale}. Document direction follows the selected UMTUBA
            language. Resize to 390px for one-hand camera controls.
          </p>
        </section>
      </div>

      <QuickSocialCamera
        open={cameraOpen}
        conversations={[states.conversationActive]}
        defaultConversationId={states.conversationActive.id}
        onClose={() => setCameraOpen(false)}
        onCapture={() => {
          setCameraOpen(false);
        }}
      />
    </main>
  );
}
