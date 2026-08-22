import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  MESSAGE_CATALOGS,
  PROFILE_CERT_KEYS,
  SUPPORTED_LOCALES,
  createTranslator,
  formatLocalizedJoinedLine,
  getLocaleDirection,
  translate,
  type AppLocale,
} from "./index";
import type { TranslationKey } from "./messages/types";

const ROOT = join(process.cwd());

function readRepo(relativePath: string) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const BRAND_ALLOWLIST = new Set<TranslationKey>([
  "profile.umLife",
  "life.title",
  "life.opening",
  "life.feedAria",
  "life.focusedAria",
  "life.unavailableTitle",
  "life.backToFeed",
]);

const PROFILE_UI_FILES = [
  "app/profile/components/ProfileShell.tsx",
  "app/profile/components/ProfileHeader.tsx",
  "app/profile/components/ProfileActions.tsx",
  "app/profile/components/ProfileTabs.tsx",
  "app/profile/components/ProfileAbout.tsx",
  "app/profile/components/ProfileLoadingSkeleton.tsx",
  "app/profile/components/ProfileLinkedArticlePrompt.tsx",
  "app/profile/components/ProfileAllPanel.tsx",
  "app/profile/components/ProfileVideoGrid.tsx",
  "app/profile/components/ProfilePostsPanel.tsx",
  "app/profile/components/ProfileArticlesPanel.tsx",
  "app/profile/components/ProfileCoursesPanel.tsx",
  "app/profile/components/ProfileProductsPanel.tsx",
  "app/profile/components/ProfileLivePanel.tsx",
  "app/profile/components/ProfileLiveBadge.tsx",
  "app/profile/components/ProfilePinnedRail.tsx",
  "app/profile/components/ProfilePhotosLightbox.tsx",
  "app/profile/components/ProfileIdentityStrip.tsx",
  "app/profile/components/ProfileIdentityAchievements.tsx",
  "app/profile/components/ProfilePanelError.tsx",
  "app/profile/ProfileExperience.tsx",
  "app/components/activity-tiers/ActivityTierProgressBar.tsx",
  "app/components/activity-tiers/ActivityTierBadge.tsx",
];

const LEAK_PHRASES = [
  "Creator Space",
  "Creator hub",
  "Activity tier",
  "activity score",
  "Progress to ",
  " to go ",
  "Ranked by authentic contributions",
  ">Share<",
  ">About<",
  ">Photos<",
  ">Videos<",
  ">Posts<",
  ">All<",
  "Linked article",
  "Read article now",
  "No published content",
  "Try again",
  "Join live",
  "View lobby",
  "Open session",
  "Pinned content",
  "Close photo lightbox",
  "Creator roles",
  "Creator achievements",
];

describe("13-locale key parity", () => {
  it("keeps every English key present, non-empty, and non-English except brand", () => {
    const en = MESSAGE_CATALOGS.en;
    const enKeys = Object.keys(en) as TranslationKey[];
    expect(enKeys.length).toBeGreaterThan(0);

    for (const locale of SUPPORTED_LOCALES) {
      const catalog = MESSAGE_CATALOGS[locale];
      for (const key of enKeys) {
        const value = catalog[key];
        expect(value, `${locale} missing ${key}`).toEqual(expect.any(String));
        expect(value.trim().length, `${locale} empty ${key}`).toBeGreaterThan(0);
        if (locale === DEFAULT_LOCALE) continue;
        if (!key.startsWith("profile.")) continue;
        if (BRAND_ALLOWLIST.has(key)) continue;
        if (value === "UM Life") continue;
        expect(value, `${locale} English fallback ${key}`).not.toBe(en[key]);
      }
    }
  });
});

describe("Profile cert keys render without English fallback", () => {
  it("returns distinct Arabic product chrome for the observed leak set", () => {
    expect(translate("ar", "profile.creatorSpace")).toBe("مساحة المنشئ");
    expect(translate("ar", "profile.creatorHub")).toBe("مركز المنشئ");
    expect(translate("ar", "profile.activityTier")).toBe("مستوى النشاط");
    expect(translate("ar", "profile.tierTitle.rising")).toBe("منشئ صاعد");
    expect(translate("ar", "profile.activityScore", { values: { score: "517" } })).toBe(
      "517 نقطة نشاط"
    );
    expect(translate("ar", "profile.progressTo", { values: { tier: "منشئ" } })).toBe(
      "التقدم نحو منشئ"
    );
    expect(translate("ar", "profile.progressExplanation")).toContain("الإسهامات الحقيقية");
    expect(translate("ar", "profile.joinedDate", { values: { date: "أغسطس 2026" } })).toBe(
      "انضم في أغسطس 2026"
    );
    expect(translate("ar", "profile.share")).toBe("مشاركة");
    expect(translate("ar", "profile.about")).toBe("حول");
    expect(translate("ar", "profile.photos")).toBe("صور");
    expect(translate("ar", "profile.videos")).toBe("فيديوهات");
    expect(translate("ar", "profile.posts")).toBe("منشورات");
    expect(translate("ar", "profile.all")).toBe("الكل");
    expect(translate("ar", "profile.umLife")).toBe("UM Life");
  });

  it("formats joined dates and progress with interpolation, not English concat", () => {
    const t = createTranslator("ar");
    const joined = formatLocalizedJoinedLine("ar", t, {
      joinedAt: "2026-08-10T00:00:00.000Z",
    });
    expect(joined).toMatch(/انضم/);
    expect(joined).not.toMatch(/Joined/);
    expect(joined).not.toMatch(/August/);

    expect(
      translate("de", "profile.pointsToGo", {
        values: { count: "483", percent: "36" },
      })
    ).not.toMatch(/to go/);
    expect(
      translate("fr", "profile.progressTo", { values: { tier: "Créateur" } })
    ).not.toMatch(/^Progress to /);
  });

  it("keeps cert keys filled in every locale and not equal to English", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of PROFILE_CERT_KEYS) {
        const value = MESSAGE_CATALOGS[locale][key].trim();
        expect(value.length).toBeGreaterThan(0);
        if (locale !== "en") {
          expect(value).not.toBe(MESSAGE_CATALOGS.en[key]);
        }
      }
    }
  });
});

describe("Hardcoded profile English detector", () => {
  it("wires Profile chrome to i18n and rejects leaked product English literals", () => {
    const shell = readRepo("app/profile/components/ProfileShell.tsx");
    const header = readRepo("app/profile/components/ProfileHeader.tsx");
    const actions = readRepo("app/profile/components/ProfileActions.tsx");
    const tabs = readRepo("app/profile/components/ProfileTabs.tsx");
    const progress = readRepo(
      "app/components/activity-tiers/ActivityTierProgressBar.tsx"
    );

    expect(shell).toMatch(/t\("profile.creatorSpace"\)/);
    expect(shell).toMatch(/t\("profile.creatorHub"\)/);
    expect(header).toMatch(/t\("profile.activityTier"\)/);
    expect(header).toMatch(/t\("profile.activityScore"/);
    expect(header).toMatch(/t\("profile.progressExplanation"\)/);
    expect(header).toMatch(/formatLocalizedJoinedLine/);
    expect(actions).toMatch(/t\("profile.share"\)/);
    expect(tabs).toMatch(/PROFILE_TAB_I18N_KEYS/);
    expect(progress).toMatch(/t\("profile.progressTo"/);
    expect(progress).toMatch(/t\("profile.pointsToGo"/);
    const skeleton = readRepo("app/profile/components/ProfileLoadingSkeleton.tsx");
    expect(skeleton).toMatch(/t\("profile.loadingAria"\)/);
    expect(skeleton).toMatch(/t\("profile.openingStatus"\)/);

    for (const file of PROFILE_UI_FILES) {
      const source = readRepo(file)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      for (const phrase of LEAK_PHRASES) {
        expect(source, `${file} still contains ${phrase}`).not.toContain(phrase);
      }
    }
  });
});

describe("Runtime locale matrix — rendered profile chrome", () => {
  it("renders cert strings for every locale without English fallback", () => {
    const matrix: Array<{
      locale: AppLocale;
      dir: "rtl" | "ltr";
      leaks: string[];
    }> = [];

    for (const locale of SUPPORTED_LOCALES) {
      const t = createTranslator(locale);
      const rendered = [
        t("profile.creatorSpace"),
        t("profile.creatorHub"),
        t("profile.activityTier"),
        t("profile.tierTitle.rising"),
        t("profile.activityScore", { values: { score: "517" } }),
        t("profile.progressTo", {
          values: { tier: t("profile.tierTitle.creator") },
        }),
        t("profile.pointsToGo", { values: { count: "483", percent: "36" } }),
        t("profile.progressExplanation"),
        formatLocalizedJoinedLine(locale, t, { joinedAt: "2026-08-10T00:00:00.000Z" }) ??
          "",
        t("profile.share"),
        t("profile.about"),
        t("profile.photos"),
        t("profile.videos"),
        t("profile.posts"),
        t("profile.all"),
        t("nav.home"),
        t("nav.discover"),
        t("nav.learning"),
        t("nav.profile"),
        t("profile.umLife"),
      ].join(" | ");

      const leaks: string[] = [];
      if (locale !== "en") {
        for (const phrase of [
          "Creator Space",
          "Creator hub",
          "Activity tier",
          "Rising Creator",
          "activity score",
          "to go",
          "Progress to Creator",
          "Ranked by authentic contributions",
          "Joined August",
        ]) {
          if (rendered.includes(phrase)) leaks.push(phrase);
        }
      }

      matrix.push({
        locale,
        dir: getLocaleDirection(locale),
        leaks,
      });
      expect(leaks, `${locale} unintended English`).toEqual([]);
    }

    expect(matrix).toHaveLength(13);
    expect(matrix.find((row) => row.locale === "ar")?.dir).toBe("rtl");
    expect(matrix.filter((row) => row.locale !== "ar").every((row) => row.dir === "ltr")).toBe(
      true
    );
  });
});
