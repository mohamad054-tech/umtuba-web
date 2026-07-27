"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  enqueueArticleTeaserJob,
  isTeaserBackgroundMode,
  markArticleTeaserUploaded,
  planArticleTeaserPublish,
  retryArticleTeaserJob,
  gradientTemplatePath,
  type TeaserBackgroundMode,
  type TeaserGradientTemplate,
  TEASER_GRADIENT_TEMPLATES,
} from "../../lib/articles/articleTeaserFoundation";
import { publishMyArticle } from "../../lib/articles/articlesFoundation";
import {
  buildArticleHref,
  APP_ROUTES,
} from "../lib/nav";
import { createClient, getServerUser } from "../../lib/supabase/server";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function resolveBackground(
  formData: FormData
): { mode: TeaserBackgroundMode; path: string | null } {
  const modeRaw = str(formData, "backgroundMode");
  const mode: TeaserBackgroundMode = isTeaserBackgroundMode(modeRaw)
    ? modeRaw
    : "gradient";
  const templateRaw = str(formData, "gradientTemplate");
  const template = (
    TEASER_GRADIENT_TEMPLATES as readonly string[]
  ).includes(templateRaw)
    ? (templateRaw as TeaserGradientTemplate)
    : "midnight";
  const uploadedPath = str(formData, "backgroundAssetPath");

  if (mode === "uploaded_image") {
    return {
      mode: uploadedPath ? "uploaded_image" : "gradient",
      path: uploadedPath || gradientTemplatePath(template),
    };
  }
  if (mode === "plain") {
    return { mode: "plain", path: null };
  }
  if (mode === "article_image") {
    // No article cover column in V1 — fall back to gradient.
    return { mode: "gradient", path: gradientTemplatePath(template) };
  }
  return { mode: "gradient", path: gradientTemplatePath(template) };
}

export async function publishArticleAction(formData: FormData): Promise<void> {
  const title = str(formData, "title");
  const body = str(formData, "body");
  const teaserRaw = str(formData, "teaserPostId");
  const teaserPostId = teaserRaw ? Number(teaserRaw) : null;
  const plan = planArticleTeaserPublish({
    teaserPostId:
      teaserPostId != null && Number.isInteger(teaserPostId) && teaserPostId > 0
        ? teaserPostId
        : null,
  });
  const background = resolveBackground(formData);

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
    teaserPostId: plan.mode === "uploaded" ? teaserPostId : null,
  });

  if (!result.ok) {
    redirect(
      `${APP_ROUTES.createArticle}?error=${encodeURIComponent(result.message)}`
    );
  }

  // Teaser job must never fail the article publish.
  try {
    if (plan.mode === "uploaded" && teaserPostId) {
      await markArticleTeaserUploaded(supabase, {
        articleId: result.data.articleId,
        teaserPostId,
      });
    } else {
      await enqueueArticleTeaserJob(supabase, {
        articleId: result.data.articleId,
        backgroundMode: background.mode,
        backgroundAssetPath: background.path,
      });
    }
  } catch (error) {
    console.error("article teaser job after publish", error);
  }

  revalidatePath(APP_ROUTES.home);
  revalidatePath(APP_ROUTES.profile);
  redirect(buildArticleHref(result.data.articleId));
}

export async function retryArticleTeaserAction(
  formData: FormData
): Promise<void> {
  const articleId = str(formData, "articleId");
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.home)}`);
  }
  const supabase = await createClient();
  const result = await retryArticleTeaserJob(supabase, articleId);
  const href = buildArticleHref(articleId);
  if (!result.ok) {
    redirect(`${href}?teaserError=${encodeURIComponent(result.message)}`);
  }
  revalidatePath(href);
  redirect(href);
}

export async function attachManualTeaserAction(
  formData: FormData
): Promise<void> {
  const articleId = str(formData, "articleId");
  const teaserRaw = str(formData, "teaserPostId");
  const teaserPostId = Number(teaserRaw);
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.home)}`);
  }
  const href = buildArticleHref(articleId);
  if (!Number.isInteger(teaserPostId) || teaserPostId <= 0) {
    redirect(`${href}?teaserError=${encodeURIComponent("Choose a ready video.")}`);
  }
  const supabase = await createClient();
  const result = await markArticleTeaserUploaded(supabase, {
    articleId,
    teaserPostId,
  });
  if (!result.ok) {
    redirect(`${href}?teaserError=${encodeURIComponent(result.message)}`);
  }
  revalidatePath(APP_ROUTES.home);
  revalidatePath(href);
  redirect(href);
}
