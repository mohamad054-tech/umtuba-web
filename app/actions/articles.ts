"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildArticleHref,
  APP_ROUTES,
} from "../lib/nav";
import { publishMyArticle } from "../../lib/articles/articlesFoundation";
import { createClient, getServerUser } from "../../lib/supabase/server";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function publishArticleAction(formData: FormData): Promise<void> {
  const title = str(formData, "title");
  const body = str(formData, "body");
  const teaserRaw = str(formData, "teaserPostId");
  const teaserPostId = teaserRaw ? Number(teaserRaw) : null;

  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.createArticle)}`
    );
  }

  const supabase = await createClient();
  const result = await publishMyArticle(supabase, {
    title,
    body,
    teaserPostId:
      teaserPostId != null && Number.isInteger(teaserPostId) && teaserPostId > 0
        ? teaserPostId
        : null,
  });

  if (!result.ok) {
    redirect(
      `${APP_ROUTES.createArticle}?error=${encodeURIComponent(result.message)}`
    );
  }

  revalidatePath(APP_ROUTES.home);
  revalidatePath(APP_ROUTES.profile);
  redirect(buildArticleHref(result.data.articleId));
}
