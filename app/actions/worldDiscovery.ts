"use server";

import { createClient } from "../../lib/supabase/server";
import {
  sanitizeDiscoveryRequest,
  type DiscoveredPlace,
} from "../../lib/world/discovery";

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
  const validated = sanitizeDiscoveryRequest(input);
  if (!validated.ok) return validated;

  const supabase = await createClient();
  const { value } = validated;
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
      return { ok: false, message: "World Discovery is not available yet." };
    }
    if (raw.includes("destination")) {
      return { ok: false, message: "Choose a valid destination." };
    }
    return { ok: false, message: "Places could not be loaded." };
  }

  return { ok: true, places: (data ?? []) as DiscoveredPlace[] };
}
