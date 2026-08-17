"use server";

import { createTranslator } from "../../lib/i18n";
import { resolveRequestLocale } from "../../lib/i18n/server";
import { createClient } from "../../lib/supabase/server";
import {
  sanitizeDiscoveryRequest,
  type DiscoveredPlace,
} from "../../lib/world/discovery";
import { localizeWorldDiscoveryError } from "../../lib/world/holdUi";

export async function discoverWorldPlacesAction(input: {
  latitude?: number;
  longitude?: number;
  destinationCityId?: string;
  radiusKm?: number;
  category?: string;
  categoryId?: string;
  offset?: number;
}): Promise<
  | { ok: true; places: DiscoveredPlace[] }
  | { ok: false; message: string }
> {
  const { locale } = await resolveRequestLocale();
  const validated = sanitizeDiscoveryRequest(input);
  if (!validated.ok) {
    return {
      ok: false,
      message: localizeWorldDiscoveryError(locale, validated.message),
    };
  }

  const supabase = await createClient();
  const { value } = validated;
  const t = createTranslator(locale);
  const { data, error } = await supabase.rpc("discover_world_places_v2", {
    p_latitude: value.latitude,
    p_longitude: value.longitude,
    p_destination_city_id: value.destinationCityId,
    p_radius_km: value.radiusKm,
    p_legacy_category: value.category,
    p_category_id: value.categoryId,
    p_limit: 20,
    p_offset: value.offset,
  });

  if (error) {
    const raw = (error.message || "").toLowerCase();
    if (raw.includes("disabled")) {
      return { ok: false, message: t("world.error.unavailable") };
    }
    if (raw.includes("destination")) {
      return { ok: false, message: t("world.error.invalidDestination") };
    }
    return { ok: false, message: t("world.error.loadPlaces") };
  }

  return { ok: true, places: (data ?? []) as DiscoveredPlace[] };
}
