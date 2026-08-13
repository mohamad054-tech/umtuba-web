"use server";

import { createAccountDeletionStore } from "../../lib/accountDeletion/accountDeletionStore";
import { submitAccountDeletionRequest } from "../../lib/accountDeletion/requestAccountDeletion";
import { createClient, getServerUser } from "../../lib/supabase/server";

export async function requestAccountDeletionAction(input: {
  confirmationPhrase: string;
  acknowledged: boolean;
}) {
  let user: Awaited<ReturnType<typeof getServerUser>> = null;
  try {
    user = await getServerUser();
  } catch {
    user = null;
  }

  const payload = {
    confirmationPhrase: input.confirmationPhrase ?? "",
    acknowledged: Boolean(input.acknowledged),
  };

  if (!user) {
    return submitAccountDeletionRequest(payload, {
      user: null,
      store: {
        findOpenRequest: async () => null,
        insertPending: async () => ({
          ok: false as const,
          uniqueViolation: false,
          message: "Sign in to request deletion of your UMTUBA account.",
        }),
      },
    });
  }

  const supabase = await createClient();
  return submitAccountDeletionRequest(payload, {
    user: { id: user.id, email: user.email ?? null },
    store: createAccountDeletionStore(supabase),
  });
}
