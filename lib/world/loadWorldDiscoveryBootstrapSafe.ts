import { isSupabasePublicConfigured } from "../env/supabasePublic";
import { createClient } from "../supabase/server";
import { loadWorldDiscoveryBootstrap } from "./discovery";
import {
  catalogDiscoveryBootstrap,
  catalogWorldCities,
  type WorldDiscoveryBootstrap,
} from "./mapCatalogFallback";

export async function loadWorldDiscoveryBootstrapSafe(): Promise<WorldDiscoveryBootstrap> {
  if (!isSupabasePublicConfigured()) {
    return catalogDiscoveryBootstrap();
  }
  try {
    const supabase = await createClient();
    const bootstrap = await loadWorldDiscoveryBootstrap(supabase);
    if (!bootstrap.databaseReady && !bootstrap.cities.length) {
      return { ...bootstrap, cities: catalogWorldCities() };
    }
    return bootstrap;
  } catch {
    return catalogDiscoveryBootstrap();
  }
}
