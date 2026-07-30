import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { getPublicProductById } from "../../../../lib/store/catalogQueries";
import {
  STORE_PRODUCT_LISTING_QUERY_PARAM,
  parseSellerListingIdFromSearchParam,
} from "../../../../lib/store/listingProvenance";

type ProductIdRedirectPageProps = {
  params: Promise<{ productId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Id-based product link (shared from Watch, wishlist, etc.) — resolves to
 * the canonical slug PDP. Never renders content directly.
 *
 * When `?listing=` is present, resolve the seller storefront for that listing
 * (fail closed — no silent owned-store fallback).
 */
export default async function ProductIdRedirectPage({
  params,
  searchParams,
}: ProductIdRedirectPageProps) {
  const { productId } = await params;
  const query = await searchParams;
  const listingParse = parseSellerListingIdFromSearchParam(
    query[STORE_PRODUCT_LISTING_QUERY_PARAM]
  );
  if (!listingParse.ok) {
    notFound();
  }

  const supabase = await createClient();
  const resolved = await getPublicProductById(supabase, productId, {
    sellerListingId: listingParse.sellerListingId,
  });

  if (!resolved) {
    notFound();
  }

  redirect(`/store/${resolved.storeSlug}/product/${resolved.productSlug}`);
}
