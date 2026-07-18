import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import ProductLoadingState from "../components/product/ProductLoadingState";
import { settingsMetadata } from "../../lib/site/routeMetadata";
import { getServerUser } from "../../lib/supabase/server";
import { getProfileByIdFromDb } from "../../lib/supabase/profiles";
import { normalizeUsername } from "../../lib/supabase/validation";
import { APP_ROUTES } from "../lib/nav";
import SettingsExperience from "./SettingsExperience";

export const metadata = settingsMetadata;

function profileFromAuthUser(user: User) {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : user.email?.split("@")[0] || "UMTUBA User";

  const username =
    typeof user.user_metadata?.username === "string"
      ? normalizeUsername(user.user_metadata.username)
      : `user_${user.id.slice(0, 8)}`;

  return {
    id: user.id,
    username,
    displayName: fullName,
    bio: "",
    city: "",
    country: "",
    avatarUrl: null as string | null,
    avatarInitial: fullName.charAt(0).toUpperCase() || "U",
  };
}

export default async function SettingsPage() {
  let user: User | null = null;

  try {
    user = await getServerUser();
  } catch {
    user = null;
  }

  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.settings)}`
    );
  }

  const row = await getProfileByIdFromDb(user.id);

  const profile = row
    ? {
        id: row.id,
        username: row.username,
        displayName:
          (row.display_name && row.display_name.trim()) ||
          (row.full_name && row.full_name.trim()) ||
          row.username,
        bio: row.bio || "",
        city: row.city || "",
        country: row.country || "",
        avatarUrl: row.avatar_url,
        avatarInitial:
          row.avatar_initial ||
          (
            (row.display_name && row.display_name.trim()) ||
            (row.full_name && row.full_name.trim()) ||
            row.username
          )
            .charAt(0)
            .toUpperCase() ||
          "U",
      }
    : profileFromAuthUser(user);

  return (
    <Suspense
      fallback={<ProductLoadingState fullPage label="Opening Settings…" />}
    >
      <SettingsExperience profile={profile} />
    </Suspense>
  );
}
