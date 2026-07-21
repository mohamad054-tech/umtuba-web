import AppTopNav from "../components/AppTopNav";
import { Suspense } from "react";
import { createClient } from "../../lib/supabase/server";
import { loadWorldDiscoveryBootstrap } from "../../lib/world/discovery";
import WorldDiscoveryClient from "./WorldDiscoveryClient";

export const metadata = {
  title: "World Discovery | UMTUBA",
  description:
    "Discover approved public places by destination or optional one-time location.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ city?: string; category?: string; radius?: string }>;
};

export default async function WorldDiscoveryPage({ searchParams }: Props) {
  const query = await searchParams;
  const supabase = await createClient();
  const bootstrap = await loadWorldDiscoveryBootstrap(supabase);

  return (
    <main className="min-h-screen bg-[#050510] text-white">
      <AppTopNav title="World Discovery" subtitle="Places & destinations" />
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <header className="mb-6 rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-[#0a1022] to-violet-500/10 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200/70">
            UMTUBA World
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
            Explore a destination, your way
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">
            Discover approved public stores, restaurants, hotels, cafes and
            local services. GPS is provided by your device and is always
            optional; UMTUBA does not store precise user location here.
          </p>
        </header>
        <Suspense
          fallback={
            <p className="text-sm text-white/50">Preparing World Discovery…</p>
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
