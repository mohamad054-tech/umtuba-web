import { redirect } from "next/navigation";
import { APP_ROUTES } from "../lib/nav";

export const dynamic = "force-dynamic";

type DiscoverPageProps = {
  searchParams?:
    | Promise<{ post?: string; city?: string; comment?: string; country?: string }>
    | { post?: string; city?: string; comment?: string; country?: string };
};

/**
 * Compatible alias: `/discover` → Video-First Home (`/`) with query preserved.
 */
export default async function DiscoverAliasPage({
  searchParams,
}: DiscoverPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const qs = new URLSearchParams();
  if (params.post?.trim()) qs.set("post", params.post.trim());
  if (params.city?.trim()) qs.set("city", params.city.trim());
  if (params.comment?.trim()) qs.set("comment", params.comment.trim());
  if (params.country?.trim()) qs.set("country", params.country.trim());
  const suffix = qs.toString();
  redirect(suffix ? `${APP_ROUTES.home}?${suffix}` : APP_ROUTES.home);
}
