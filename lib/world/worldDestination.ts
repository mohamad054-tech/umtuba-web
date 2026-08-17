export type WorldDestinationCity = {
  id: string;
  slug: string;
};

export type WorldDestinationResolution = {
  cityId: string;
  requestedSlug: string | null;
  matched: boolean;
  unknownRequested: boolean;
};

/**
 * Explore This City must open the requested catalog city.
 * Unknown slugs stay empty — never fall back to Home or the first city.
 */
export function resolveWorldDestination(
  cities: readonly WorldDestinationCity[],
  requestedSlug?: string | null
): WorldDestinationResolution {
  const slug = requestedSlug?.trim().toLowerCase() || null;
  if (!slug) {
    return {
      cityId: cities[0]?.id ?? "",
      requestedSlug: null,
      matched: false,
      unknownRequested: false,
    };
  }
  const match = cities.find((city) => city.slug === slug);
  if (match) {
    return {
      cityId: match.id,
      requestedSlug: slug,
      matched: true,
      unknownRequested: false,
    };
  }
  return {
    cityId: "",
    requestedSlug: slug,
    matched: false,
    unknownRequested: true,
  };
}
