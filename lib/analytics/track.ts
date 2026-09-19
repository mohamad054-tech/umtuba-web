/**
 * Typed product-analytics events. Call `track()` from client code only.
 * Event names are the catalog below — never pass a free string.
 *
 * Properties are ids / slugs / booleans / numbers only.
 * Never send email, name, phone, query text, captions, comments, or messages.
 */
import { isAdminPath } from "./config";
import { captureAnalyticsEvent, identifyAnalyticsUser, resetAnalyticsUser } from "./client";

export const ANALYTICS_EVENTS = {
  signUpStarted: "sign_up_started",
  signUpCompleted: "sign_up_completed",
  login: "login",
  videoView: "video_view",
  videoLike: "video_like",
  videoShare: "video_share",
  commentPosted: "comment_posted",
  postPublished: "post_published",
  gameStarted: "game_started",
  gameFinished: "game_finished",
  storeProductViewed: "store_product_viewed",
  learningCourseOpened: "learning_course_opened",
  searchPerformed: "search_performed",
  reportSubmitted: "report_submitted",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsEventMap = {
  sign_up_started: Record<string, never>;
  sign_up_completed: Record<string, never>;
  login: Record<string, never>;
  video_view: { post_id: number; surface: "discover" | "watch" | "feed" | "profile" | "life" };
  video_like: { post_id: number };
  video_share: { post_id: number; surface?: "discover" | "watch" | "feed" | "profile" | "life" };
  comment_posted: { post_id: number };
  post_published: { kind: "text" | "video" };
  game_started: { slug: string };
  game_finished: { slug: string; score: number };
  store_product_viewed: { product_id: string };
  learning_course_opened: { course_id: string };
  search_performed: { empty: boolean };
  report_submitted: { kind: "content" | "user" };
};

export function track<E extends AnalyticsEventName>(
  event: E,
  properties?: AnalyticsEventMap[E]
): void {
  if (typeof window !== "undefined" && isAdminPath(window.location.pathname)) {
    return;
  }
  captureAnalyticsEvent(event, properties ?? {});
}

export function identifyUser(userId: string): void {
  if (!userId || typeof userId !== "string") return;
  identifyAnalyticsUser(userId);
}

export function resetUser(): void {
  resetAnalyticsUser();
}
