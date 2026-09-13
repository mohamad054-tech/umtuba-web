"use server";

import { createDataExportStore } from "../../lib/dataExport/dataExportStore";
import { submitDataExportRequest } from "../../lib/dataExport/requestDataExport";
import { createClient, getServerUser } from "../../lib/supabase/server";

export async function requestDataExportAction(input: {
  acknowledged: boolean;
}) {
  let user: Awaited<ReturnType<typeof getServerUser>> = null;
  try {
    user = await getServerUser();
  } catch {
    user = null;
  }

  const payload = {
    acknowledged: Boolean(input.acknowledged),
  };

  if (!user) {
    return submitDataExportRequest(payload, {
      user: null,
      store: {
        findOpenRequest: async () => null,
        insertPending: async () => ({
          ok: false as const,
          uniqueViolation: false,
          message: "Sign in to request a copy of your UMTUBA data.",
        }),
      },
    });
  }

  const supabase = await createClient();
  return submitDataExportRequest(payload, {
    user: { id: user.id, email: user.email ?? null },
    store: createDataExportStore(supabase),
  });
}
