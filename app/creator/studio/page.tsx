import { redirect } from "next/navigation";
import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES } from "../../lib/nav";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  creatorStudioStore,
  creatorStudioTemplateRegistry,
} from "../../../lib/ai/creatorStudio";
import CreatorStudioClient from "./CreatorStudioClient";
import {
  creatorStudioCreateDraftAction,
  creatorStudioRunAction,
  creatorStudioToggleFavoriteAction,
} from "./actions";

export const metadata = {
  title: "AI Creator Studio | UMTUBA",
};

export default async function CreatorStudioPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.creatorStudio)}`
    );
  }

  // Ensure authenticated Supabase client is available for the route gate.
  await createClient();

  const session = creatorStudioStore.getOrCreateSession({
    userId: user.id,
    tenantId: `user:${user.id}`,
    locale: "en",
  });
  const templates = creatorStudioTemplateRegistry.list();
  const drafts = creatorStudioStore.listDrafts(session.sessionId);
  const history = creatorStudioStore.listHistory(session.sessionId);

  return (
    <main className="min-h-screen bg-[#050510] text-white max-sm:pb-[var(--app-mobile-bottom-nav-offset,0px)]">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        <AppTopNav title="Creator Studio" subtitle="AI Foundation" />
        <CreatorStudioClient
          templates={templates}
          initialSession={session}
          initialDrafts={drafts}
          initialHistory={history}
          runAction={creatorStudioRunAction}
          toggleFavoriteAction={creatorStudioToggleFavoriteAction}
          createDraftAction={creatorStudioCreateDraftAction}
        />
      </div>
    </main>
  );
}
