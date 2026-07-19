import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { getPublicStoreById } from "../../../../lib/store/catalogQueries";

type ShopIdRedirectPageProps = {
  params: Promise<{ shopId: string }>;
};

/**
 * Id-based store link — resolves to the canonical slug store profile page.
 * Never renders content directly.
 */
export default async function ShopIdRedirectPage({
  params,
}: ShopIdRedirectPageProps) {
  const { shopId } = await params;
  const supabase = await createClient();
  const resolved = await getPublicStoreById(supabase, shopId);

  if (!resolved) {
    notFound();
  }

  redirect(`/store/${resolved.storeSlug}`);
}
