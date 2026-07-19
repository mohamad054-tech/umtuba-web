import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { getPublicProductById } from "../../../../lib/store/catalogQueries";

type ProductIdRedirectPageProps = {
  params: Promise<{ productId: string }>;
};

/**
 * Id-based product link (shared from Watch, wishlist, etc.) — resolves to
 * the canonical slug PDP. Never renders content directly.
 */
export default async function ProductIdRedirectPage({
  params,
}: ProductIdRedirectPageProps) {
  const { productId } = await params;
  const supabase = await createClient();
  const resolved = await getPublicProductById(supabase, productId);

  if (!resolved) {
    notFound();
  }

  redirect(`/store/${resolved.storeSlug}/product/${resolved.productSlug}`);
}
