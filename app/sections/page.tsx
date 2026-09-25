import { getServerUser } from "../../lib/supabase/server";
import SectionsExperience from "./SectionsExperience";

export default async function SectionsPage() {
  const user = await getServerUser().catch(() => null);
  return <SectionsExperience viewerId={user?.id ?? null} />;
}
