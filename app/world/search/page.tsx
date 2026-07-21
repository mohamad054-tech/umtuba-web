import { Suspense } from "react";
import AppTopNav from "../../components/AppTopNav";
import { createClient } from "../../../lib/supabase/server";
import { loadWorldDiscoveryBootstrap } from "../../../lib/world/discovery";
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
  const [query, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ]);
  const bootstrap = await loadWorldDiscoveryBootstrap(supabase);
  const initialQuery =
    typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";

  return (
    <main className="min-h-screen bg-[#050510] text-white">
      <AppTopNav title="World Search" subtitle="Cities, places & categories" />
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <header className="mb-6">
          <h1 className="text-3xl font-black">Search the World domain</h1>
          <p className="mt-2 text-sm text-white/50">
            Database-backed search across approved public cities, places,
            businesses, attractions, hotels, restaurants and categories.
          </p>
        </header>
        <Suspense fallback={<p className="text-sm text-white/45">Loading search…</p>}>
          <WorldSearchClient
            cities={bootstrap.cities}
            categories={bootstrap.categories}
            enabled={
              bootstrap.databaseReady && bootstrap.flags.worldDiscoveryEnabled
            }
            initialQuery={initialQuery}
          />
        </Suspense>
      </div>
    </main>
  );
}
