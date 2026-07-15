import { createClient, getServerUser } from "../../lib/supabase/server";
import { claimVerifiedWelcomeBonus } from "../../lib/supabase/rewards";
import NotificationsExperience from "./NotificationsExperience";
import NotificationsShell from "./components/NotificationsShell";

export default async function NotificationsPage() {
  try {
    const user = await getServerUser();
    if (user) {
      const supabase = await createClient();
      await claimVerifiedWelcomeBonus(supabase);
    }
  } catch {
    // Non-blocking — inbox still loads if welcome claim fails.
  }

  return (
    <NotificationsShell>
      <NotificationsExperience />
    </NotificationsShell>
  );
}
