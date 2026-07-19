import { sanitizeUserFacingMessage } from "../../app/lib/product/userFacingMessage";

export const STORY_ERRORS = {
  authRequired: "Please sign in to continue.",
  createFailed: "Unable to publish your story. Please try again.",
  deleteFailed: "Unable to delete this story. Please try again.",
  loadFailed: "Couldn't load stories right now. Please try again.",
  viewFailed: "Unable to record this view.",
  viewersFailed: "Couldn't load viewers right now. Please try again.",
  notOwner: "Only the story owner can do that.",
  notFound: "This story is no longer available.",
  expired: "This story has expired.",
  uploadFailed: "Unable to upload story media. Please try again.",
  invalidMedia: "Please select a supported image or video.",
} as const;

export function storyUserMessage(
  message: string | null | undefined,
  fallback: string
): string {
  return sanitizeUserFacingMessage(message, fallback);
}
