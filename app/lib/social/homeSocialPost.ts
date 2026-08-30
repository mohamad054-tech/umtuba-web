import type { DatabasePost } from "../../data/types/post";
import { APP_ROUTES, buildCreatorProfileHref } from "../nav";

export const HOME_SOCIAL_POSTED_EVENT = "umtuba:home-social-posted";

export type HomeSocialPostedDetail = {
  post: DatabasePost;
};

export function buildHomeSocialProfileHref(username: string, hasImage: boolean): string {
  const profile = buildCreatorProfileHref({ username });
  return hasImage ? `${profile}?tab=photos` : `${profile}?tab=all`;
}

export function buildHomeSocialReturnPath(): string {
  return APP_ROUTES.home;
}

export function dispatchHomeSocialPosted(post: DatabasePost): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<HomeSocialPostedDetail>(HOME_SOCIAL_POSTED_EVENT, {
      detail: { post },
    })
  );
  window.dispatchEvent(new Event("umtuba:post-created"));
}
