import Link from "next/link";
import { notFound } from "next/navigation";
import AppTopNav from "../../../components/AppTopNav";
import ExternalDirectionsLink from "../../../components/world/ExternalDirectionsLink";
import WorldLayerTabs, {
  type WorldLayerTab,
} from "../../../components/world/WorldLayerTabs";
import ProductEmptyState from "../../../components/product/ProductEmptyState";
import { APP_ROUTES, buildStoreShopIdHref } from "../../../lib/nav";
import { createClient } from "../../../../lib/supabase/server";
import { sanitizeWorldSlug } from "../../../../lib/world/domain";
import { loadWorldDiscoveryBootstrap } from "../../../../lib/world/discovery";
import { loadWorldPlaceProfile } from "../../../../lib/world/profiles";
import { sanitizeWorldOutboundUrl } from "../../../../lib/world/safeUrl";

type Props = {
  params: Promise<{ placeSlug: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { placeSlug } = await params;
  return {
    title: `${placeSlug.replace(/-/g, " ")} | UMTUBA World`,
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

export default async function WorldPlacePage({ params, searchParams }: Props) {
  const [{ placeSlug }, query] = await Promise.all([params, searchParams]);
  const slug = sanitizeWorldSlug(decodeURIComponent(placeSlug));
  if (!slug) notFound();

  const supabase = await createClient();
  const [result, bootstrap] = await Promise.all([
    loadWorldPlaceProfile(supabase, slug),
    loadWorldDiscoveryBootstrap(supabase),
  ]);
  if (!result.data) {
    if (!result.databaseReady || result.error) {
      return (
        <ProductEmptyState
          eyebrow="World Place"
          title="Place profile is not available yet"
          description={result.error ?? "This place is being prepared."}
          primaryHref={APP_ROUTES.worldDiscovery}
          primaryLabel="Back to World"
        />
      );
    }
    notFound();
  }
  const place = result.data;

  const tabs: WorldLayerTab[] = [
    {
      id: "overview",
      label: "Overview",
      enabled: place.layers.discovery,
      content: (
        <Panel title="About this place">
          <p>{place.description || "No public description has been added."}</p>
          {place.categories.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {place.categories.map((category) => (
                <span
                  key={category.id}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs"
                >
                  {category.name}
                </span>
              ))}
            </div>
          ) : null}
        </Panel>
      ),
    },
    {
      id: "media",
      label: "Media",
      enabled: place.layers.media,
      content: (
        <Panel title="Gallery & videos">
          <p>
            {place.gallery.length} approved gallery item(s) · {place.postIds.length}{" "}
            linked video post(s).
          </p>
          {place.postIds.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {place.postIds.map((postId) => (
                <Link
                  key={postId}
                  href={`${APP_ROUTES.watch}?post=${postId}`}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-cyan-100"
                >
                  Watch post #{postId}
                </Link>
              ))}
            </div>
          ) : null}
        </Panel>
      ),
    },
    {
      id: "live",
      label: "Live",
      enabled: place.layers.live,
      content: (
        <Panel title="Live now">
          {place.liveRoomIds.length ? (
            place.liveRoomIds.map((roomId) => (
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
      id: "business",
      label: "Business",
      enabled: place.layers.commerce,
      content: (
        <Panel title="Business links">
          <div className="flex flex-wrap gap-2">
            {place.storeId ? (
              <Link
                href={buildStoreShopIdHref(place.storeId)}
                className="rounded-full border border-violet-400/25 px-3 py-1 text-xs text-violet-100"
              >
                Open UMTUBA Store
              </Link>
            ) : null}
            {place.links.map((link) => {
              const safeHref = sanitizeWorldOutboundUrl(link.url);
              if (!safeHref) return null;
              return (
                <a
                  key={`${link.kind}:${link.url}`}
                  href={safeHref}
                  target="_blank"
                  rel="noopener noreferrer external"
                  className="rounded-full border border-white/10 px-3 py-1 text-xs"
                >
                  {link.label || link.kind}
                </a>
              );
            })}
          </div>
        </Panel>
      ),
    },
    {
      id: "reviews",
      label: "Reviews",
      enabled: place.reviews.enabled,
      content: (
        <Panel title="Reviews">
          <p>
            {place.reviews.count} approved review(s)
            {place.reviews.average != null
              ? ` · ${place.reviews.average.toFixed(1)}/5`
              : ""}
          </p>
        </Panel>
      ),
    },
    {
      id: "ai",
      label: "AI summary",
      enabled: place.layers.ai && Boolean(place.aiSummary),
      content: (
        <Panel title="Reviewed AI summary">
          <p>{place.aiSummary}</p>
        </Panel>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-[#050510] text-white">
      <AppTopNav title={place.name} subtitle="World Place" />
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <header className="overflow-hidden rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-[#0a1022] to-violet-500/10 p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200/70">
            {place.kind.replace(/_/g, " ")} · {place.verificationStatus}
          </p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">{place.name}</h1>
          {place.tagline ? (
            <p className="mt-3 max-w-2xl text-white/60">{place.tagline}</p>
          ) : null}
          <p className="mt-3 text-sm text-white/45">
            {place.city.name}, {place.city.countryName}
            {place.district ? ` · ${place.district.name}` : ""}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <ExternalDirectionsLink
              enabled={bootstrap.flags.externalDirectionsEnabled}
              destination={{
                latitude: place.latitude,
                longitude: place.longitude,
                label: place.name,
              }}
              openPlaceId={place.id}
              openCityId={place.city.id}
            />
            <Link
              href={`/world/city/${encodeURIComponent(place.city.slug)}`}
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold"
            >
              Open city
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
