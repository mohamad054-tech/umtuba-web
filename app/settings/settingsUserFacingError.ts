import type { TranslationKey } from "../../lib/i18n";
import { USERNAME_HINT } from "../../lib/supabase/validation";

/**
 * Maps known English Settings / profile / avatar errors from the existing
 * data layer onto i18n keys. UGC is never passed through here.
 */
const EXACT_MESSAGE_KEYS: Record<string, TranslationKey> = {
  "Display name is required.": "settings.displayNameRequired",
  "Username is required.": "settings.usernameRequired",
  [USERNAME_HINT]: "settings.usernameHint",
  "That username is already taken.": "settings.usernameTaken",
  "Please fix the highlighted fields.": "settings.fixHighlighted",
  "Profile saved.": "settings.profileSaved",
  "Avatar updated.": "settings.avatarUpdated",
  "Unable to save your profile.": "settings.saveFailed",
  "Unable to update your profile.": "settings.saveFailed",
  "Unable to upload avatar.": "settings.avatarUploadFailed",
  "Unable to save avatar.": "settings.avatarUploadFailed",
  "The avatar URL could not be created.": "settings.avatarUploadFailed",
  "Please choose a JPEG, PNG, WebP, or GIF image.":
    "settings.avatarTypeInvalid",
  "The avatar must be smaller than 2 MB.": "settings.avatarTooLarge",
  "Please sign in to upload an avatar.": "settings.signInRequired",
  "Please sign in to edit your profile.": "settings.signInRequired",
  "Please sign in to update your avatar.": "settings.signInRequired",
  "Please sign in.": "settings.signInRequired",
  "Unable to sign out.": "settings.signOutFailed",
};

export function settingsUserFacingKey(
  message: string
): TranslationKey | null {
  return EXACT_MESSAGE_KEYS[message] ?? null;
}
