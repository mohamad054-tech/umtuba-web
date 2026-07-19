import { sanitizeUserFacingMessage } from "../../app/lib/product/userFacingMessage";

export const SEARCH_ERRORS = {
  loadFailed: "Couldn't search right now. Please try again.",
  recentFailed: "Couldn't load recent searches.",
  clearFailed: "Couldn't clear recent searches.",
  authRequired: "Please sign in to save recent searches.",
  invalidQuery: "That search term is not valid. Try different words.",
  emptyQuery: "Enter a search term.",
} as const;

export function searchUserMessage(
  message: string | null | undefined,
  fallback: string = SEARCH_ERRORS.loadFailed
): string {
  return sanitizeUserFacingMessage(message, fallback);
}
