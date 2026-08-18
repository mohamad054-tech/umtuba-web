import "server-only";

import { createClient, getServerUser } from "../supabase/server";
import { requireStoreAdminDb } from "./adminAuth";
import {
  evaluateStoreDemoPreviewAccess,
  type DemoPreviewAccessResult,
} from "./demoPreviewGate";
import { readDemoPreviewSessionCookie } from "./demoPreviewSession";

export async function resolveDemoPreviewAccess(
  token?: string | null
): Promise<DemoPreviewAccessResult> {
  let isPlatformAdmin = false;
  try {
    const user = await getServerUser();
    if (user) {
      const supabase = await createClient();
      isPlatformAdmin = await requireStoreAdminDb(supabase);
    }
  } catch {
    isPlatformAdmin = false;
  }
  const cookieToken = await readDemoPreviewSessionCookie();
  return evaluateStoreDemoPreviewAccess({
    token,
    cookieToken,
    isPlatformAdmin,
  });
}
