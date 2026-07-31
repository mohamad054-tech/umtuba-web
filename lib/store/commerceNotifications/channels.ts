import type { CommerceNotificationChannel } from "./types";

export const COMMERCE_EXTERNAL_CHANNELS: CommerceNotificationChannel[] = [
  "email",
  "sms",
  "push",
];

export function isExternalCommerceChannel(
  channel: CommerceNotificationChannel
): boolean {
  return COMMERCE_EXTERNAL_CHANNELS.includes(channel);
}

export function assertExternalChannelsDisabled(
  channel: CommerceNotificationChannel
): void {
  if (isExternalCommerceChannel(channel)) {
    throw new Error(
      `External commerce notification channel disabled in V1: ${channel}`
    );
  }
}

export const EXTERNAL_CHANNEL_CONTRACT = {
  email: { enabled: false, reason: "disabled_v1_no_provider" },
  sms: { enabled: false, reason: "disabled_v1_no_provider" },
  push: { enabled: false, reason: "disabled_v1_no_provider" },
  in_app: { enabled: true, reason: "platform_notifications_foundation" },
} as const;
