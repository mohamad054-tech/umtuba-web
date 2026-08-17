import AppTopNav from "../components/AppTopNav";
import { Suspense } from "react";
import { createTranslator } from "../../lib/i18n";
import { resolveRequestLocale } from "../../lib/i18n/server";
import { createClient } from "../../lib/supabase/server";
import { loadWorldDiscoveryBootstrap } from "../../lib/world/discovery";
import {
  isWorldDiscoveryPubliclyLive,
  worldDiscoveryHoldMessage,
} from "../../lib/world/holdUi";
import WorldDiscoveryClient from "./WorldDiscoveryClient";

import { worldDiscoveryMetadata } from "../../lib/site/routeMetadata";

export const metadata = worldDiscoveryMetadata;

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ city?: string; category?: string; radius?: string }>;
};

export default async function WorldDiscoveryPage({ searchParams }: Props) {
  const query = await searchParams;
  const [{ locale }, supabase] = await Promise.all([
    resolveRequestLocale(),
    createClient(),
  ]);
  const t = createTranslator(locale);
  const bootstrap = await loadWorldDiscoveryBootstrap(supabase);
  const publiclyLive = isWorldDiscoveryPubliclyLive(bootstrap);

  return (
    <main className="min-h-screen bg-[#050510] text-white">
      <AppTopNav
        title={t("world.navTitle")}
        subtitle={
          publiclyLive ? t("world.navSubtitleLive") : t("world.navSubtitleHold")
        }
      />
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <header className="mb-6 rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-[#0a1022] to-violet-500/10 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200/70">
            {t("world.eyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
            {publiclyLive ? t("world.titleLive") : t("world.titleHold")}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">
            {publiclyLive
              ? t("world.introLive")
              : worldDiscoveryHoldMessage(bootstrap.databaseReady, locale)}
          </p>
        </header>
        <Suspense
          fallback={
            <p className="text-sm text-white/50">{t("world.preparing")}</p>
          }
        >
          <WorldDiscoveryClient
            {...bootstrap}
            initialCitySlug={
              typeof query.city === "string"
                ? query.city.trim().toLowerCase()
                : null
            }
            initialCategoryId={
              typeof query.category === "string" ? query.category : null
            }
            initialRadius={
              typeof query.radius === "string" &&
              Number.isFinite(Number(query.radius))
                ? Number(query.radius)
                : null
            }
          />
        </Suspense>
      </div>
    </main>
  );
}
