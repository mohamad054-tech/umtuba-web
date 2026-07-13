import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { listConversationsForUser } from "../../lib/supabase/messenger";
import { APP_ROUTES } from "../lib/nav";
import MessagesExperience from "./MessagesExperience";

function MessagesFallback() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
      </div>
      <p className="relative rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white/70 backdrop-blur">
        Opening UMTUBA Messages...
      </p>
    </main>
  );
}

export default async function MessagesPage() {
  let userId: string | null = null;

  try {
    const user = await getServerUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.messages)}`
    );
  }

  const supabase = await createClient();
  const inbox = await listConversationsForUser(supabase, userId);

  return (
    <Suspense fallback={<MessagesFallback />}>
      <MessagesExperience
        initialUserId={userId}
        initialConversations={inbox.ok ? inbox.conversations : []}
        initialError={inbox.ok ? null : inbox.message}
      />
    </Suspense>
  );
}
