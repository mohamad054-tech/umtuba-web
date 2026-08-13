import type { User } from "@supabase/supabase-js";
import { accountDeletionMetadata } from "../../lib/site/routeMetadata";
import { createAccountDeletionStore } from "../../lib/accountDeletion/accountDeletionStore";
import type { AccountDeletionRequestRecord } from "../../lib/accountDeletion/requestAccountDeletion";
import { createClient, getServerUser } from "../../lib/supabase/server";
import AccountDeletionExperience from "./AccountDeletionExperience";

export const metadata = accountDeletionMetadata;

export default async function AccountDeletionPage() {
  let user: User | null = null;

  try {
    user = await getServerUser();
  } catch {
    user = null;
  }

  let existingRequest: AccountDeletionRequestRecord | null = null;

  if (user) {
    try {
      const supabase = await createClient();
      existingRequest = await createAccountDeletionStore(supabase).findOpenRequest(
        user.id
      );
    } catch {
      existingRequest = null;
    }
  }

  return (
    <AccountDeletionExperience
      signedIn={Boolean(user)}
      email={user?.email ?? null}
      existingRequest={existingRequest}
    />
  );
}
