import { sanitizeUserFacingMessage } from "../../app/lib/product/userFacingMessage";

export const ADS_ERRORS = {
  authRequired: "Please sign in to continue.",
  notAuthorized: "You don’t have permission to do that.",
  loadFailed: "Couldn't load advertising data. Please try again.",
  saveFailed: "Couldn't save changes. Please try again.",
  submitFailed: "Couldn't submit for review. Please try again.",
  accountNotFound: "Advertiser account not found.",
  campaignNotFound: "Campaign not found.",
  creativeNotFound: "Creative not found.",
  deliveryDisabled: "Ad delivery is not enabled in this foundation release.",
} as const;

export function adsUserMessage(
  message: string | null | undefined,
  fallback: string = ADS_ERRORS.loadFailed
): string {
  return sanitizeUserFacingMessage(message, fallback);
}
