import { Suspense } from "react";
import { searchMetadata } from "../../lib/site/routeMetadata";
import { getServerUser } from "../../lib/supabase/server";
import ProductLoadingState from "../components/product/ProductLoadingState";
import { parseSearchTab } from "../../lib/search";
import SearchExperience from "./SearchExperience";

export const metadata = searchMetadata;
export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams?:
 Promise<{ q?: string; tab?: string }>;
};

function SearchFallback() {
  return <ProductLoadingState fullPage label="Opening UMTUBA Search…" />;
}

async function SearchLoader({ searchParams }: SearchPageProps) {
  const params = (await searchParams) ?? {};
  const initialQuery =
    typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const initialTab = parseSearchTab(params.tab);
  const user = await getServerUser().catch(() => null);

  return (
    <SearchExperience
      initialQuery={initialQuery}
      initialTab={initialTab}
      initialViewerId={user?.id ?? null}
    />
  );
}

export default function SearchPage(props: SearchPageProps) {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchLoader searchParams={props.searchParams} />
    </Suspense>
  );
}
