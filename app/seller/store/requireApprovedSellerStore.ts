import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { getLatestSellerApplication } from "../../../lib/store/sellerApplications";
import {
  resolveSellerStoreAccess,
  sellerStoreAccessRedirectPath,
} from "../../../lib/store/sellerStoreAccess";
import { getOwnedOrMemberStore } from "../../../lib/store/sellerStore";
import { APP_ROUTES } from "../../lib/nav";

/**
 * Authoritative Seller Center gate. Cookie presence is not enough:
 * pending / unverified sellers are sent to setup or the pending hub.
 */
export async function requireApprovedSellerStoreSession() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerStore)}`
    );
  }

  const supabase = await createClient();
  const [membership, application] = await Promise.all([
    getOwnedOrMemberStore(supabase, user.id),
    getLatestSellerApplication(supabase, user.id),
  ]);

  const access = resolveSellerStoreAccess({ membership, application });
  if (access !== "approved" || !membership) {
    redirect(sellerStoreAccessRedirectPath(access));
  }

  return { user, supabase, membership };
}
