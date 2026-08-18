import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES } from "../../lib/nav";
import { createVideoMetadata } from "../../../lib/site/routeMetadata";
import { getServerUser } from "../../../lib/supabase/server";
import CreateVideoForm from "./CreateVideoForm";

export const metadata = createVideoMetadata;
export const dynamic = "force-dynamic";

export default async function CreateVideoPage() {
  const user = await getServerUser();

  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.createVideo)}`
    );
  }

  return (
    <main className="relative min-h-screen bg-[#050510] text-white max-sm:pb-[var(--app-mobile-bottom-nav-offset,0px)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[12%] h-[26rem] w-[26rem] rounded-full bg-sky-500/12 blur-3xl" />
      </div>

      <AppTopNav
        title="Create"
        subtitle="Upload to Discover"
        actions={
          <Link
            href={APP_ROUTES.create}
            className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Back to Create
          </Link>
        }
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 py-8 md:px-6">
        <CreateVideoForm />
      </div>
    </main>
  );
}
