import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES } from "../../lib/nav/routes";
import SoundPageClient from "./SoundPageClient";

export default function SoundPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="min-h-screen bg-[#050510] text-white">
      <AppTopNav title="UMTUBA" />
      <SoundPageClient
        soundId={params.id}
        createHref={`${APP_ROUTES.createVideo}?sound=${encodeURIComponent(params.id)}`}
      />
    </main>
  );
}
