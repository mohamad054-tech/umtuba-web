import Link from "next/link";
import { notFound } from "next/navigation";
import AppTopNav from "../../../components/AppTopNav";
import ExternalDirectionsLink from "../../../components/world/ExternalDirectionsLink";
import WorldLayerTabs, {
  type WorldLayerTab,
} from "../../../components/world/WorldLayerTabs";
import ProductEmptyState from "../../../components/product/ProductEmptyState";
import { createTranslator } from "../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../lib/i18n/server";
import { APP_ROUTES } from "../../../lib/nav";
import { createClient } from "../../../../lib/supabase/server";
import { sanitizeWorldSlug } from "../../../../lib/world/domain";
import { loadWorldDiscoveryBootstrap } from "../../../../lib/world/discovery";
import { loadWorldCityProfile } from "../../../../lib/world/profiles";
import {
  bundledCityCopy,
  resolveCityDisplayName,
  resolveCityOverview,
} from "../../../../lib/world/cityCatalogCopy";

type Props = {
  params: Promise<{ citySlug: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { citySlug } = await params;
  return {
    title: `${citySlug.replace(/-/g, " ")} | UMTUBA World`,
    robots: { index: false, follow: false },
  };
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-3 text-sm leading-7 text-white/60">{children}</div>
    </section>
  );
}

export default async function WorldCityPage({ params, searchParams }: Props) {
  const [{ citySlug }, query] = await Promise.all([params, searchParams]);
  const slug = sanitizeWorldSlug(decodeURIComponent(citySlug));
  if (!slug) notFound();

  const supabase = await createClient();
  const [{ locale }, result, bootstrap] = await Promise.all([
    resolveRequestLocale(),
    loadWorldCityProfile(supabase, slug),
    loadWorldDiscoveryBootstrap(supabase),
  ]);
  const t = createTranslator(locale);
  if (!result.data) {
    if (!result.databaseReady || result.error) {
      return (
        <ProductEmptyState
          eyebrow={t("world.navTitle")}
          title={t("world.city.unavailableTitle")}
          description={result.error ?? t("world.city.unavailableBody")}
          primaryHref={APP_ROUTES.worldDiscovery}
          primaryLabel={t("world.backToWorld")}
        />
      );
    }
    notFound();
  }
  const city = result.data;
  const cityCopy = bundledCityCopy();
  const displayName = resolveCityDisplayName(
    cityCopy,
    city.slug,
    locale,
    city.name
  );
  const overview = resolveCityOverview(
    cityCopy,
    city.slug,
    locale,
    city.overview
  );

  const placesByKind = Object.entries(
    city.featuredPlaces.reduce<
      Record<string, typeof city.featuredPlaces>
    >((groups, place) => {
      (groups[place.kind] ??= []).push(place);
      return groups;
    }, {})
  );
  const tabs: WorldLayerTab[] = [
    {
      id: "overview",
      label: "Overview",
      enabled: city.layers.discovery,
      content: (
        <Panel title={`About ${displayName}`}>
          <p>{overview || t("world.city.overviewPending")}</p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(city.placeCounts).map(([kind, count]) => (
              <div key={kind} className="rounded-xl border border-white/10 p-3">
                <dt className="text-xs uppercase text-white/35">
                  {kind.replace(/_/g, " ")}
                </dt>
                <dd className="text-xl font-black text-white">{count}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      ),
    },
    {
      id: "places",
      label: "Places",
      enabled: city.layers.discovery,
      content: (
        <div className="space-y-4">
          {placesByKind.length ? (
            placesByKind.map(([kind, places]) => (
              <Panel key={kind} title={kind.replace(/_/g, " ")}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(places ?? []).map((place) => (
                    <Link
                      key={place.id}
                      href={`/world/place/${encodeURIComponent(place.slug)}`}
                      className="rounded-xl border border-white/10 p-3 font-bold text-white hover:bg-white/5"
                    >
                      {place.name}
                    </Link>
                  ))}
                </div>
              </Panel>
            ))
          ) : (
            <Panel title="Places">{t("world.city.placesEmpty")}</Panel>
          )}
        </div>
      ),
    },
    {
      id: "media",
      label: "Videos",
      enabled: city.layers.media,
      content: (
        <Panel title="City videos">
          {city.postIds.length ? (
            city.postIds.map((postId) => (
              <Link
                key={postId}
                href={`${APP_ROUTES.watch}?post=${postId}`}
                className="mr-2 inline-flex rounded-full border border-white/10 px-3 py-1 text-xs text-cyan-100"
              >
                Watch post #{postId}
              </Link>
            ))
          ) : (
            <p>No approved linked videos yet.</p>
          )}
        </Panel>
      ),
    },
    {
      id: "live",
      label: "Live",
      enabled: city.layers.live,
      content: (
        <Panel title="Live in this city">
          {city.liveRoomIds.length ? (
            city.liveRoomIds.map((roomId) => (
              <Link
                key={roomId}
                href={`${APP_ROUTES.live}/${roomId}`}
                className="mr-2 inline-flex rounded-full border border-red-400/25 px-3 py-1 text-xs text-red-100"
              >
                Open live room
              </Link>
            ))
          ) : (
            <p>No linked public live rooms right now.</p>
          )}
        </Panel>
      ),
    },
    {
      id: "community",
      label: "Community",
      enabled: city.layers.community,
      content: (
        <Panel title={city.community?.name ?? "City Community"}>
          <p>{city.community?.description ?? "Community is being prepared."}</p>
          <p className="mt-2 text-xs text-white/40">
            Hello City:{" "}
            {city.community?.helloCityEnabled ? "available" : "disabled"}
          </p>
        </Panel>
      ),
    },
    {
      id: "journey",
      label: "Journeys",
      enabled: city.layers.journey,
      content: (
        <Panel title="Journeys & Post Journey">
          <p>{city.journeyIds.length} approved World journey link(s).</p>
          <Link
            href={APP_ROUTES.postJourney}
            className="mt-3 inline-flex rounded-full border border-white/10 px-3 py-1 text-xs text-cyan-100"
          >
            Open Post Journey
          </Link>
        </Panel>
      ),
    },
    {
      id: "events",
      label: "Events",
      enabled: city.layers.events,
      content: (
        <Panel title="Local events">
          {city.localEvents.length ? (
            <ul className="space-y-2">
              {city.localEvents.map((event) => (
                <li key={event.id} className="rounded-xl border border-white/10 p-3">
                  <p className="font-bold text-white">{event.title}</p>
                  <time className="text-xs text-white/40">{event.startsAt}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p>No approved upcoming events.</p>
          )}
        </Panel>
      ),
    },
    {
      id: "ai",
      label: "AI assistant",
      enabled: city.layers.ai,
      content: (
        <Panel title="AI travel assistant">
          <p>
            Architecture is ready for reviewed AI integration. AI search and
            automatic recommendations are not enabled in Phase 2.
          </p>
        </Panel>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-[#050510] text-white">
      <AppTopNav title={displayName} subtitle="World City" />
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <header className="rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-[#0a1022] to-violet-500/10 p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200/70">
            {city.countryName} · {city.verificationStatus}
          </p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">{displayName}</h1>
          <p className="mt-3 text-sm text-white/45">
            {city.region ? `${city.region} · ` : ""}
            {city.countryCode}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <ExternalDirectionsLink
              enabled={bootstrap.flags.externalDirectionsEnabled}
              destination={{
                latitude: city.centerLatitude,
                longitude: city.centerLongitude,
                label: city.name,
              }}
              openCityId={city.id}
            />
            <Link
              href={`${APP_ROUTES.worldDiscovery}?city=${encodeURIComponent(city.slug)}`}
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold"
            >
              Discover nearby
            </Link>
          </div>
        </header>
        <div className="mt-6">
          <WorldLayerTabs tabs={tabs} initialTab={query.tab} />
        </div>
      </div>
    </main>
  );
}
