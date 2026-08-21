import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES, translate } from "./index";
import { MESSAGE_CATALOGS } from "./messages/catalogs";
import type { TranslationKey } from "./messages/types";
import { NOTIFICATION_PREFERENCE_FIELDS } from "../../app/notifications/lib/preferences";
import { settingsUserFacingKey } from "../../app/settings/settingsUserFacingError";
import { USERNAME_HINT } from "../supabase/validation";

const SETTINGS_FORM_KEYS: TranslationKey[] = [
  "settings.avatar",
  "settings.uploadImage",
  "settings.displayName",
  "settings.username",
  "settings.usernameHint",
  "settings.bio",
  "settings.bioPlaceholder",
  "settings.city",
  "settings.country",
  "settings.saveProfile",
  "settings.profileSaved",
  "settings.notificationsAlertPrefs",
  "settings.pref.social",
  "settings.pref.nearbyLive",
  "settings.publicProfile",
  "settings.deleteAccount",
];

const AR_NATURAL: Partial<Record<TranslationKey, string>> = {
  "settings.avatar": "الصورة الشخصية",
  "settings.uploadImage": "رفع صورة",
  "settings.displayName": "الاسم الظاهر",
  "settings.username": "اسم المستخدم",
  "settings.bio": "نبذة شخصية",
  "settings.country": "الدولة",
  "settings.city": "المدينة",
};

describe("Settings profile / chrome translation", () => {
  it("lands Arabic labels that match the product copy", () => {
    for (const [key, expected] of Object.entries(AR_NATURAL)) {
      expect(translate("ar", key as TranslationKey)).toBe(expected);
    }
    expect(translate("ar", "settings.usernameHint")).toMatch(/3/);
    expect(translate("ar", "settings.bioPlaceholder")).toBe("نبذة قصيرة");
  });

  it("keeps complete English Settings copy", () => {
    expect(translate("en", "settings.avatar")).toBe("Avatar");
    expect(translate("en", "settings.uploadImage")).toBe("Upload image");
    expect(translate("en", "settings.displayName")).toBe("Display name");
    expect(translate("en", "settings.username")).toBe("Username");
    expect(translate("en", "settings.bio")).toBe("Bio");
    expect(translate("en", "settings.country")).toBe("Country");
    expect(translate("en", "settings.city")).toBe("City");
    expect(translate("en", "settings.usernameHint")).toMatch(/3–24/);
    expect(translate("en", "settings.bioPlaceholder")).toBe("A short intro");
  });

  it("provides every Settings form key in all 13 catalogs", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const catalog = MESSAGE_CATALOGS[locale];
      for (const key of SETTINGS_FORM_KEYS) {
        expect(catalog[key].length).toBeGreaterThan(0);
        expect(translate(locale, key)).toBe(catalog[key]);
      }
    }
  });

  it("does not leave Arabic Settings form keys as English", () => {
    for (const key of SETTINGS_FORM_KEYS) {
      expect(translate("ar", key)).not.toBe(translate("en", key));
    }
  });

  it("does not leave other locales on English for distinctive Settings keys", () => {
    const distinctive: TranslationKey[] = [
      "settings.displayName",
      "settings.usernameHint",
      "settings.saveProfile",
      "settings.profileSaved",
      "settings.deleteAccount",
      "settings.pref.nearbyLive",
    ];
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en") continue;
      for (const key of distinctive) {
        expect(translate(locale, key)).not.toBe(translate("en", key));
      }
    }
  });

  it("wires notification preference fields to i18n keys", () => {
    expect(NOTIFICATION_PREFERENCE_FIELDS.map((field) => field.key)).toEqual([
      "socialEnabled",
      "journeyEnabled",
      "rewardsEnabled",
      "nearbyLiveEnabled",
      "aiInsightsEnabled",
    ]);
    for (const field of NOTIFICATION_PREFERENCE_FIELDS) {
      expect(translate("ar", field.labelKey)).not.toBe(
        translate("en", field.labelKey)
      );
      expect(translate("en", field.descriptionKey).length).toBeGreaterThan(0);
    }
  });

  it("maps known English data-layer errors to Settings keys", () => {
    expect(settingsUserFacingKey("Display name is required.")).toBe(
      "settings.displayNameRequired"
    );
    expect(settingsUserFacingKey(USERNAME_HINT)).toBe("settings.usernameHint");
    expect(settingsUserFacingKey("Please sign in.")).toBe(
      "settings.signInRequired"
    );
    expect(settingsUserFacingKey("some unknown server error")).toBeNull();
  });

  it("removes hardcoded English Settings chrome from the route", () => {
    const settingsRoot = join(process.cwd(), "app", "settings");
    const experience = readFileSync(
      join(settingsRoot, "SettingsExperience.tsx"),
      "utf8"
    );
    const notifications = readFileSync(
      join(settingsRoot, "NotificationPreferencesPanel.tsx"),
      "utf8"
    );
    const leaked = [
      "Upload image",
      "DISPLAY NAME",
      "Display name",
      "A short intro",
      "JPEG, PNG, WebP",
      "lowercase letters, numbers, dots",
      "Alert preferences",
      "Your bookmarks",
      "UM Points & invites",
      "See how others view you",
      "Publish to Discover",
      "Delete account",
    ];
    for (const phrase of leaked) {
      expect(experience).not.toContain(phrase);
      expect(notifications).not.toContain(phrase);
    }
    expect(experience).toContain('t("settings.displayName")');
    expect(experience).toContain('t("settings.username")');
    expect(experience).toContain('t("settings.bio")');
    expect(notifications).toContain("field.labelKey");
  });
});
