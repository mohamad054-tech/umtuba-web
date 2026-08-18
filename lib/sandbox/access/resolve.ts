import "server-only";

import { createClient, getServerUser } from "../../supabase/server";
import { requireStoreAdminDb } from "../../store/adminAuth";
import { evaluateSandboxAccess, type SandboxAccessResult } from "./gate";
import { readSandboxSessionCookie } from "./session";

export async function resolveBusinessSandboxAccess(
  token?: string | null
): Promise<SandboxAccessResult> {
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
  const cookieToken = await readSandboxSessionCookie();
  return evaluateSandboxAccess({
    token,
    cookieToken,
    isPlatformAdmin,
  });
}
