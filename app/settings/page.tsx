import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerUser } from "../../lib/supabase/server";
import { getProfileByIdFromDb } from "../../lib/supabase/profiles";
import { APP_ROUTES } from "../lib/nav";
import SettingsExperience from "./SettingsExperience";

export default async function SettingsPage() {
  let userId: string | null = null;

  try {
    const user = await getServerUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.settings)}`);
  }

  const row = await getProfileByIdFromDb(userId);

  if (!row) {
    redirect(APP_ROUTES.signup);
  }

  const displayName =
    (row.display_name && row.display_name.trim()) ||
    (row.full_name && row.full_name.trim()) ||
    row.username;

  return (
    <Suspense fallback={null}>
      <SettingsExperience
        profile={{
          id: row.id,
          username: row.username,
          displayName,
          bio: row.bio || "",
          city: row.city || "",
          country: row.country || "",
          avatarUrl: row.avatar_url,
          avatarInitial:
            row.avatar_initial || displayName.charAt(0).toUpperCase() || "U",
        }}
      />
    </Suspense>
  );
}
