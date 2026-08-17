import { Suspense } from "react";
import AppTopNav from "../../components/AppTopNav";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import { createClient } from "../../../lib/supabase/server";
import { loadWorldDiscoveryBootstrap } from "../../../lib/world/discovery";
import {
  isWorldDiscoveryPubliclyLive,
  worldSearchHoldMessage,
} from "../../../lib/world/holdUi";
import WorldSearchClient from "./WorldSearchClient";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export const metadata = {
  title: "World Search | UMTUBA",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function WorldSearchPage({ searchParams }: Props) {
  const [query, localeInfo, supabase] = await Promise.all([
    searchParams,
    resolveRequestLocale(),
    createClient(),
  ]);
  const t = createTranslator(localeInfo.locale);
  const bootstrap = await loadWorldDiscoveryBootstrap(supabase);
  const publiclyLive = isWorldDiscoveryPubliclyLive(bootstrap);
  const initialQuery =
    typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";

  return (
    <main className="min-h-screen bg-[#050510] text-white">
      <AppTopNav
        title={t("world.search.navTitle")}
        subtitle={
          publiclyLive
            ? t("world.search.navSubtitleLive")
            : t("world.search.navSubtitleHold")
        }
      />
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <header className="mb-6">
          <h1 className="text-3xl font-black">
            {publiclyLive
              ? t("world.search.titleLive")
              : t("world.search.titleHold")}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {publiclyLive
              ? t("world.search.introLive")
              : worldSearchHoldMessage(
                  bootstrap.databaseReady,
                  localeInfo.locale
                )}
          </p>
        </header>
        <Suspense
          fallback={
            <p className="text-sm text-white/45">{t("world.search.loading")}</p>
          }
        >
          <WorldSearchClient
            cities={bootstrap.cities}
            categories={bootstrap.categories}
            databaseReady={bootstrap.databaseReady}
            enabled={publiclyLive}
            initialQuery={initialQuery}
          />
        </Suspense>
      </div>
    </main>
  );
}
