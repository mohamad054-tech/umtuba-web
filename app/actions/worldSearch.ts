"use server";

import { createClient } from "../../lib/supabase/server";
import {
  sanitizeWorldSearchRequest,
  type WorldSearchEntityType,
  type WorldSearchResult,
} from "../../lib/world/domain";

export async function searchWorldAction(input: {
  query?: string;
  entityTypes?: WorldSearchEntityType[];
  cityId?: string;
  categoryId?: string;
  offset?: number;
}): Promise<
  | { ok: true; results: WorldSearchResult[] }
  | { ok: false; message: string }
> {
  const validated = sanitizeWorldSearchRequest(input);
  if (!validated.ok) return validated;

  const supabase = await createClient();
  const { value } = validated;
  const { data, error } = await supabase.rpc("search_world_entities", {
    p_query: value.query,
    p_entity_types: value.entityTypes,
    p_city_id: value.cityId,
    p_category_id: value.categoryId,
    p_limit: 20,
    p_offset: value.offset,
  });

  if (error) {
    return {
      ok: false,
      message: (error.message || "").toLowerCase().includes("disabled")
        ? "World Discovery is not available yet."
        : "World search could not be completed.",
    };
  }
  return { ok: true, results: (data ?? []) as WorldSearchResult[] };
}
