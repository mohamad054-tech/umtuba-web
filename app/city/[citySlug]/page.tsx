import { redirect } from "next/navigation";
import { buildWorldCityHref } from "../../lib/nav";

export const dynamic = "force-dynamic";

type CityPageProps = {
  params: Promise<{ citySlug: string }>;
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

/**
 * U3 World/Map consolidation — legacy city prototype alias.
 * Canonical city experience: `/world/city/[citySlug]`.
 * Preserves query string for handoff (`from`, `city`, `vid`, …).
 * Route file kept (not deleted) for backward compatibility.
 */
export default async function CityLegacyAliasPage({
  params,
  searchParams,
}: CityPageProps) {
  const { citySlug } = await params;
  const slug = decodeURIComponent(citySlug || "").trim();
  const targetBase = buildWorldCityHref(slug);
  // Invalid slug → World hub (safe fallback; do not 404 prototype callers).
  if (!targetBase || targetBase.endsWith("/city/")) {
    redirect("/world");
  }

  const raw = await Promise.resolve(searchParams ?? {});
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value.trim()) {
      qs.set(key, value.trim());
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim()) qs.append(key, item.trim());
      }
    }
  }
  const suffix = qs.toString();
  redirect(suffix ? `${targetBase}?${suffix}` : targetBase);
}
