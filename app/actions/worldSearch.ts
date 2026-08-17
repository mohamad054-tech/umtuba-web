"use server";

import { createTranslator } from "../../lib/i18n";
import { resolveRequestLocale } from "../../lib/i18n/server";
import { createClient } from "../../lib/supabase/server";
import {
  sanitizeWorldSearchRequest,
  type WorldSearchEntityType,
  type WorldSearchResult,
} from "../../lib/world/domain";
import { localizeWorldSearchError } from "../../lib/world/holdUi";

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
  const { locale } = await resolveRequestLocale();
  const validated = sanitizeWorldSearchRequest(input);
  if (!validated.ok) {
    return {
      ok: false,
      message: localizeWorldSearchError(locale, validated.message),
    };
  }

  const supabase = await createClient();
  const { value } = validated;
  const t = createTranslator(locale);
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
        ? t("world.error.unavailable")
        : t("world.error.searchFailed"),
    };
  }
  return { ok: true, results: (data ?? []) as WorldSearchResult[] };
}
