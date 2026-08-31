export const EMAIL_FIND_VALUES = ["nobody", "everyone"] as const;
export const PHONE_FIND_VALUES = ["nobody", "contacts", "everyone"] as const;
export const PREPARED_VISIBILITY_VALUES = [
  "nobody",
  "contacts",
  "everyone",
] as const;

export type EmailFindValue = (typeof EMAIL_FIND_VALUES)[number];
export type PhoneFindValue = (typeof PHONE_FIND_VALUES)[number];
export type PreparedVisibility = (typeof PREPARED_VISIBILITY_VALUES)[number];

export const DEFAULT_EMAIL_FIND: EmailFindValue = "nobody";
export const DEFAULT_PHONE_FIND: PhoneFindValue = "nobody";

export type CommunicationPrivacy = {
  findByPhone: PhoneFindValue;
  findByEmail: EmailFindValue;
  whoCanMessage: PreparedVisibility;
  whoCanCall: PreparedVisibility;
  readReceiptsEnabled: boolean;
  lastSeenVisible: PreparedVisibility;
};

export const DEFAULT_COMMUNICATION_PRIVACY: CommunicationPrivacy = {
  findByPhone: DEFAULT_PHONE_FIND,
  findByEmail: DEFAULT_EMAIL_FIND,
  whoCanMessage: "everyone",
  whoCanCall: "nobody",
  readReceiptsEnabled: true,
  lastSeenVisible: "nobody",
};

export function isEmailFindValue(value: string): value is EmailFindValue {
  return (EMAIL_FIND_VALUES as readonly string[]).includes(value);
}

export function isPhoneFindValue(value: string): value is PhoneFindValue {
  return (PHONE_FIND_VALUES as readonly string[]).includes(value);
}

export function isPreparedVisibility(
  value: string
): value is PreparedVisibility {
  return (PREPARED_VISIBILITY_VALUES as readonly string[]).includes(value);
}

/** contacts is stored but not functional until verified contact-sync exists. */
export function effectivePhoneFind(value: PhoneFindValue): "nobody" | "everyone" {
  return value === "everyone" ? "everyone" : "nobody";
}

export type DiscoveredIdentity = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export const DISCOVERY_NOT_FOUND_CODE = "not_found";
