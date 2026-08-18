import "server-only";

import { createClient, getServerUser } from "../supabase/server";
import { requireStoreAdminDb } from "./adminAuth";
import {
  evaluateStoreDemoPreviewAccess,
  type DemoPreviewAccessInput,
} from "./demoPreviewGate";

export async function resolveDemoPreviewAccess(
  token?: string | null
): Promise<ReturnType<typeof evaluateStoreDemoPreviewAccess>> {
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
  const input: DemoPreviewAccessInput = { token, isPlatformAdmin };
  return evaluateStoreDemoPreviewAccess(input);
}
