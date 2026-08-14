import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../components/AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../lib/nav";
import { createChooserMetadata } from "../../lib/site/routeMetadata";
import { getServerUser } from "../../lib/supabase/server";
import CreateChooser from "./CreateChooser";

export const metadata = createChooserMetadata;
export const dynamic = "force-dynamic";

export default async function CreateChooserPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.create)}`);
  }

  return (
    <main
      className={`relative min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <AppTopNav
        title="Create"
        subtitle="Choose what to publish"
        sticky
        actions={
          <Link
            href={APP_ROUTES.home}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold"
          >
            Back to Home
          </Link>
        }
      />
      <div className="mx-auto max-w-2xl px-5 py-8 md:px-8">
        <CreateChooser />
      </div>
    </main>
  );
}
